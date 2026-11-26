/**
 * Level 2, Experiment 05 — Automatic Differentiation: Inside the Computational Graph (ADR-094).
 *
 * Built after the Stage 5 gate (tests/unit/level2-graph-gate.test.ts) showed that the graph readers report what the
 * engine computes.
 *  - Parts A–C: an expression run on the engine's tape; its graph, its forward pass and `backward`'s reverse pass,
 *    step by step, and a finite-difference check (two engine evaluations per input, divided here).
 *  - Part D: a value used twice; both contributions as `backward` reports them, and the gradient it returns.
 *  - Part E: forward and reverse mode. The forward-mode side is an illustration (decision D2); the counts are the
 *    engine's (a built model's parameters, one recorded backward pass).
 *  - Part F: one example of a recorded training run, drawn from the record's own operand references.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Instruction } from '../../../core/npm/ir';
import { L2_EXP05_DEFAULTS, level2ById } from '../../../experiments/level2';
import { LEVEL_2 } from '../../curriculum';
import { ExperimentLayout } from '../../components/ExperimentLayout';
import type { LiveQuestion } from '../../components/KnowledgeCheck';
import { DemoBadge, EngineBadge, ErrorNote, Segmented, Term, ValueSlider } from '../../components/ui';
import { exampleGraph, expressionGraph, finiteDifference, type ExprGraph } from '../../engine/graph';
import { fmt, fmtSigned } from '../../format';
import { signal } from '../../signals';
import { LEVEL2_PER_EXAMPLE_WORDING } from '../../trace/wording';
import { sigmoidLocal } from '../exp04/math';
import { ExprGraphView } from '../viz/ExprGraphView';
import { RecordGraphView } from '../viz/RecordGraphView';
import {
  EXPRESSIONS,
  MODE_NETWORKS,
  SHARED,
  modeCounts,
  nodeName,
  positions,
  recordedRun,
  stageAt,
  type X3,
} from './math';

const EXP = level2ById('05')!;
const D = L2_EXP05_DEFAULTS;
const INPUTS: X3[] = ['x₁', 'x₂', 'x₃'];
type ExprId = keyof typeof EXPRESSIONS;

function tryGraph(build: () => ExprGraph): { g: ExprGraph | null; error: string | null } {
  try {
    return { g: build(), error: null };
  } catch (e) {
    return { g: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** The local derivative of one argument of an op, in words, from engine values. */
function localWords(g: ExprGraph, node: number, arg: number): string {
  const n = g.nodes[node];
  const other = n.inputs[1 - arg];
  switch (n.op) {
    case 'add':
      return '1 (adding passes a change straight through)';
    case 'sub':
      return arg === 0 ? '1' : '−1';
    case 'mul':
      return `its other input (${g.nodes[other].kind === 'input' ? g.nodes[other].label : `the ${g.nodes[other].label} node’s value`}, ${fmt(g.nodes[other].value, 4)})`;
    case 'sigmoid':
      return `σ′ = ${fmt(sigmoidLocal([g.nodes[n.inputs[0]].value])[0], 4)}, from the sigmoid’s own rule`;
    default:
      return `the ${n.op} rule’s local derivative`;
  }
}

const nameOf = (g: ExprGraph, id: number): string =>
  g.nodes[id].kind === 'input' ? g.nodes[id].label : `the ${g.nodes[id].label} node`;

// ---------------------------------------------------------------- Parts A–C

export function gradQuestion(x: Record<X3, number>, expr: ExprId): LiveQuestion {
  const { g } = tryGraph(() => expressionGraph(x, EXPRESSIONS[expr].build));
  if (!g)
    return {
      id: 'ad-live-grad',
      live: true,
      kind: 'predict',
      prompt: 'What is ∂f/∂x₃?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Set the inputs in Part A to numbers first.',
    };
  const opts = [
    { t: fmt(g.grads[2], 4), ok: true },
    { t: fmt(g.nodes[g.output].value, 4), ok: false },
    { t: fmt(x['x₃'], 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'ad-live-grad',
    live: true,
    kind: 'predict',
    prompt: `In Parts A to C, f = ${EXPRESSIONS[expr].label} at x₁ = ${fmt(x['x₁'], 2)}, x₂ = ${fmt(x['x₂'], 2)}, x₃ = ${fmt(x['x₃'], 2)}. What is ∂f/∂x₃?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `The reverse pass gives ∂f/∂x₃ = ${fmt(g.grads[2], 4)}: what the multiply sends back to x₃${expr === 'sigmoid' ? ', after the sigmoid’s local derivative' : ''}. f itself is ${fmt(g.nodes[g.output].value, 4)}.`,
    })),
  };
}

function PartsAC({
  x,
  setX,
  expr,
  setExpr,
}: {
  x: Record<X3, number>;
  setX: (v: Record<X3, number>) => void;
  expr: ExprId;
  setExpr: (e: ExprId) => void;
}) {
  const [pos, setPos] = useState(0);
  const [h, setH] = useState(D.h);
  const { g, error } = useMemo(() => tryGraph(() => expressionGraph(x, EXPRESSIONS[expr].build)), [x, expr]);
  const change = (next: Record<X3, number>): void => {
    setX(next);
    signal('graph-changed');
    const ng = tryGraph(() => expressionGraph(next, EXPRESSIONS[expr].build)).g;
    if (ng && ng.grads[0] === 0 && next['x₁'] === x['x₁']) signal('grad-x1-zero');
  };
  const n = g ? positions(g) : 1;
  const stage = g ? stageAt(g, pos) : null;
  const move = (p: number): void => {
    const q = Math.max(0, Math.min(n - 1, p));
    setPos(q);
    if (q === n - 1) signal('reverse-done');
  };
  const fds = useMemo(
    () => (g ? INPUTS.map((k) => finiteDifference(x, EXPRESSIONS[expr].build, k, h)) : []),
    [g, x, expr, h],
  );
  const worstGap = g ? Math.max(...fds.map((fd, i) => Math.abs(fd - g.grads[i]))) : 0;
  useEffect(() => {
    if (g && expr === 'sigmoid' && worstGap > 0.01) signal('fd-off');
  }, [g, expr, worstGap]);

  let narration = '';
  if (g && stage) {
    if (stage.phase === 'forward') {
      const ops = g.nodes.filter((q) => q.kind === 'op');
      narration =
        stage.forward === 0
          ? 'Nothing has been computed yet: only the inputs have values.'
          : (() => {
              const node = ops[stage.forward - 1];
              return `Forward step ${stage.forward} of ${ops.length}: the ${node.label} node takes ${node.inputs.map((i) => `${nameOf(g, i)} = ${fmt(g.nodes[i].value, 4)}`).join(' and ')} and computes ${fmt(node.value, 4)}.`;
            })();
    } else if (stage.phase === 'seed') {
      narration =
        'The reverse pass starts at the output with ∂f/∂f = 1: a change in f changes f by exactly as much.';
    } else {
      const r = g.reverse[stage.reverse - 1];
      narration = `Reverse step ${stage.reverse} of ${g.reverse.length}: the ${g.nodes[r.node].label} node receives ∂f/∂(its output) = ${fmtSigned(r.incoming, 4)}. To each input it sends that times its local derivative: ${r.contributions
        .map(
          (c) =>
            `to ${nameOf(g, c.to)}, ${fmtSigned(r.incoming, 4)} × ${localWords(g, r.node, c.arg)} = ${fmtSigned(c.value, 4)}`,
        )
        .join('; ')}.`;
    }
  }

  return (
    <>
      <section className="lv-part" aria-labelledby="l2-p5a">
        <p className="lv-part-kicker">Part A</p>
        <h3 id="l2-p5a">A calculation as a graph</h3>
        <p className="lv-muted">
          Any calculation is a chain of single operations. Drawn as connected nodes, it is a{' '}
          <Term meaning="The operations of a calculation as connected nodes: each node takes the values on its incoming edges and produces one value.">
            computational graph
          </Term>
          . The engine builds one while it computes: every operation it performs is recorded with the values
          it used.
        </p>
        <div className="lv-grid-main">
          <div className="lv-viz">
            <div className="lv-viz-title">
              <span className="lv-mono">f = {EXPRESSIONS[expr].label}</span>
              <EngineBadge text="Computed by the engine’s automatic differentiation · not a training run" />
            </div>
            {error && <ErrorNote title="The engine could not compute this.">{error}</ErrorNote>}
            {g && (
              <ExprGraphView
                g={g}
                stage={{
                  forward: g.nodes.filter((q) => q.kind === 'op').length,
                  reverse: -1,
                  phase: 'forward',
                }}
                title={EXPRESSIONS[expr].label}
              />
            )}
          </div>
          <section className="lv-panel" aria-label="Graph inputs" data-tour="graph-inputs">
            <Segmented
              legend="Expression"
              options={[
                { value: 'product' as ExprId, label: EXPRESSIONS.product.label },
                { value: 'sigmoid' as ExprId, label: EXPRESSIONS.sigmoid.label },
              ]}
              value={expr}
              onChange={(v) => {
                setExpr(v);
                setPos(0);
                signal('graph-changed');
              }}
              control="a:expr"
            />
            {INPUTS.map((k) => (
              <ValueSlider
                key={k}
                label={k}
                role={k === 'x₃' ? 'weight' : 'input'}
                value={x[k]}
                min={-4}
                max={4}
                step={0.1}
                onChange={(v) => change({ ...x, [k]: v })}
                control={`a:${k === 'x₁' ? 'x1' : k === 'x₂' ? 'x2' : 'x3'}`}
              />
            ))}
          </section>
        </div>
      </section>

      <section className="lv-part" aria-labelledby="l2-p5b">
        <p className="lv-part-kicker">Part B</p>
        <h3 id="l2-p5b">Forwards, then in reverse</h3>
        <p className="lv-muted">
          The forward pass computes each node’s value from its inputs. Then the reverse pass starts at the
          output and works back: each node takes the gradient arriving at its output and sends it to each of
          its inputs, multiplied by its local derivative. That is{' '}
          <Term meaning="Computing exact derivatives by applying each operation’s own local derivative along the graph.">
            automatic differentiation
          </Term>{' '}
          in{' '}
          <Term meaning="Starting at the output and working backwards: one pass gives the derivative with respect to every input.">
            reverse mode
          </Term>
          : the chain rule of Experiment 04, applied node by node.
        </p>
        {g && stage && (
          <div className="lv-viz">
            <div className="lv-viz-title">
              <span className="lv-small">
                Position {pos} of {n - 1} ·{' '}
                {stage.phase === 'forward'
                  ? 'forward pass'
                  : stage.phase === 'seed'
                    ? 'start of the reverse pass'
                    : 'reverse pass'}
              </span>
              <EngineBadge text="Values from the engine’s tape · reverse steps as the engine ran them" />
            </div>
            <ExprGraphView g={g} stage={stage} title={EXPRESSIONS[expr].label} />
            <p className="lv-callout" aria-live="polite" data-narration="">
              {narration}
            </p>
            <div className="lv-stepper" data-tour="graph-stepper">
              <button
                type="button"
                className="lv-btn lv-btn-small"
                onClick={() => move(0)}
                disabled={pos === 0}
                data-control="b:start"
              >
                ⏮ Start
              </button>
              <button
                type="button"
                className="lv-btn lv-btn-small"
                onClick={() => move(pos - 1)}
                disabled={pos === 0}
                data-control="b:back"
              >
                ◀ Step back
              </button>
              <button
                type="button"
                className="lv-btn lv-btn-small lv-btn-primary"
                onClick={() => move(pos + 1)}
                disabled={pos >= n - 1}
                data-control="b:step"
              >
                Step ▶
              </button>
              <button
                type="button"
                className="lv-btn lv-btn-small"
                onClick={() => move(n - 1)}
                disabled={pos >= n - 1}
                data-control="b:end"
              >
                To the end of the reverse pass
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="lv-part" aria-labelledby="l2-p5c">
        <p className="lv-part-kicker">Part C</p>
        <h3 id="l2-p5c">Checking the gradients from outside</h3>
        <p className="lv-muted">
          A{' '}
          <Term meaning="An estimate of a derivative from two nearby values: (f(x + h) − f(x − h)) / 2h.">
            finite difference
          </Term>{' '}
          estimates a derivative without the graph: nudge one input by h each way, compute f twice, and divide
          the change by 2h. It is a good check, but only an estimate, and it needs two extra evaluations for
          every input.
        </p>
        {g && (
          <div className="lv-grid-main">
            <div className="lv-viz">
              <div className="lv-viz-title">
                <span />
                <EngineBadge text="f evaluated by the engine · the estimate divided here" />
              </div>
              <div
                className="lv-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Gradients and their estimates"
              >
                <table className="lv-table">
                  <caption>Every gradient of f = {EXPRESSIONS[expr].label}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Input</th>
                      <th scope="col">Automatic differentiation (exact)</th>
                      <th scope="col">Finite difference, h = {h}</th>
                      <th scope="col">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INPUTS.map((k, i) => (
                      <tr key={k} data-input={k}>
                        <th scope="row">∂f/∂{k}</th>
                        <td className="num">{fmtSigned(g.grads[i], 6)}</td>
                        <td className="num">{fmtSigned(fds[i], 6)}</td>
                        <td className="num">
                          {Math.abs(fds[i] - g.grads[i])
                            .toExponential(1)
                            .replace('-', '−')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="lv-small lv-muted" style={{ marginBottom: 0 }}>
                {expr === 'product'
                  ? 'For (x₁ + x₂)·x₃ the estimate is exact for any h: f changes along a straight line in each input. Choose the sigmoid expression to see it drift.'
                  : 'With the sigmoid, f curves, so the estimate depends on h: the larger h, the larger the gap. Automatic differentiation has no step size.'}
              </p>
            </div>
            <section className="lv-panel" aria-label="Finite-difference step">
              <Segmented
                legend="Step h"
                options={[1, 0.1, 0.01, 0.001].map((v) => ({ value: v, label: String(v) }))}
                value={h}
                onChange={setH}
                control="c:h"
              />
            </section>
          </div>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------- Part D

export function sharedQuestion(v: { x: number; y: number }): LiveQuestion {
  const g = expressionGraph(v, SHARED.build);
  const opts = [
    { t: fmt(g.grads[0], 4), ok: true },
    { t: fmt(v.y, 4), ok: false },
    { t: fmt(1, 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'ad-live-shared',
    live: true,
    kind: 'predict',
    prompt: `In Part D, f = x · y + x with x = ${fmt(v.x, 2)} and y = ${fmt(v.y, 2)}. What is ∂f/∂x?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `x is used twice. The add sends back 1, the multiply sends back y = ${fmt(v.y, 4)}, and the engine adds them: ∂f/∂x = ${fmt(g.grads[0], 4)}.`,
    })),
  };
}

function PartD({ v, setV }: { v: { x: number; y: number }; setV: (n: { x: number; y: number }) => void }) {
  const g = useMemo(() => expressionGraph(v, SHARED.build), [v]);
  const arrivals = g.reverse.flatMap((r, k) =>
    r.contributions
      .filter((c) => c.to === 0)
      .map((c) => ({ step: k + 1, from: g.nodes[r.node].label, value: c.value })),
  );
  const change = (n: { x: number; y: number }): void => {
    setV(n);
    signal('shared-changed');
    const ng = expressionGraph(n, SHARED.build);
    const parts = ng.reverse.flatMap((r) => r.contributions.filter((c) => c.to === 0).map((c) => c.value));
    if (ng.grads[0] === 0 && parts.every((p) => p !== 0)) signal('shared-zero');
  };
  const end = { forward: 2, reverse: g.reverse.length, phase: 'reverse' as const };
  return (
    <section className="lv-part" aria-labelledby="l2-p5d">
      <p className="lv-part-kicker">Part D</p>
      <h3 id="l2-p5d">A value used twice</h3>
      <p className="lv-muted">
        In f = x · y + x, the input x feeds two operations. A change in x changes f along both paths, so in
        the reverse pass two contributions arrive at x, and the engine adds them as they arrive. In a network
        the same happens to an input that feeds several neurons.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz">
          <div className="lv-viz-title">
            <span className="lv-mono">f = {SHARED.label}</span>
            <EngineBadge text="Computed by the engine’s automatic differentiation · not a training run" />
          </div>
          <ExprGraphView g={g} stage={end} title={SHARED.label} />
          <div className="lv-table-wrap" tabIndex={0} role="region" aria-label="Contributions arriving at x">
            <table className="lv-table">
              <caption>What arrives at x in the reverse pass</caption>
              <thead>
                <tr>
                  <th scope="col">Reverse step</th>
                  <th scope="col">From</th>
                  <th scope="col">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {arrivals.map((a) => (
                  <tr key={a.step}>
                    <td className="num">{a.step}</td>
                    <td>the {a.from} node</td>
                    <td className="num">{fmtSigned(a.value, 4)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" colSpan={2}>
                    ∂f/∂x, as the engine returns it
                  </th>
                  <td className="num">
                    <strong>{fmtSigned(g.grads[0], 4)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <section className="lv-panel" aria-label="Shared-value inputs" data-tour="graph-shared">
          <ValueSlider
            label="x"
            role="input"
            value={v.x}
            min={-4}
            max={4}
            step={0.1}
            onChange={(n) => change({ ...v, x: n })}
            control="d:x"
          />
          <ValueSlider
            label="y"
            role="weight"
            value={v.y}
            min={-4}
            max={4}
            step={0.1}
            onChange={(n) => change({ ...v, y: n })}
            control="d:y"
          />
          <p className="lv-small lv-muted">
            The add sends back 1 and the multiply sends back y, so ∂f/∂x = y + 1. Neither contribution alone
            is the gradient.
          </p>
        </section>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Part E

function PartE() {
  const [net, setNet] = useState(MODE_NETWORKS[0].id);
  const chosen = MODE_NETWORKS.find((m) => m.id === net)!;
  const counts = useMemo(() => modeCounts(chosen.model), [chosen]);
  return (
    <section className="lv-part" aria-labelledby="l2-p5e">
      <p className="lv-part-kicker">Part E</p>
      <h3 id="l2-p5e">Forward mode and reverse mode</h3>
      <p className="lv-muted">
        Derivatives can also be carried forwards, alongside the values: that is{' '}
        <Term meaning="Automatic differentiation that carries the derivative with respect to one chosen input forwards, alongside the values.">
          forward mode
        </Term>
        . Each forward-mode pass follows one input, so it gives the derivatives with respect to that one
        input. A reverse-mode pass starts from one output, so it gives that output’s derivatives with respect
        to every input. Training has one output, the loss, and many parameters: reverse mode needs one pass.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz" data-tour="graph-modes">
          <div className="lv-viz-title">
            <span>f(x₁, x₂, x₃): all three derivatives</span>
            <DemoBadge text="Illustration · the engine has no forward mode" />
          </div>
          <div className="lv-row" style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div className="lv-panel" style={{ flex: '1 1 220px' }}>
              <p style={{ marginTop: 0 }}>
                <strong>Forward mode: 3 passes</strong>
              </p>
              <ol className="lv-small" style={{ margin: 0 }}>
                <li>follow x₁ forwards → ∂f/∂x₁</li>
                <li>follow x₂ forwards → ∂f/∂x₂</li>
                <li>follow x₃ forwards → ∂f/∂x₃</li>
              </ol>
            </div>
            <div className="lv-panel" style={{ flex: '1 1 220px' }}>
              <p style={{ marginTop: 0 }}>
                <strong>Reverse mode: 1 pass</strong>
              </p>
              <ol className="lv-small" style={{ margin: 0 }}>
                <li>start at f and work back → ∂f/∂x₁, ∂f/∂x₂ and ∂f/∂x₃ together</li>
              </ol>
            </div>
          </div>
          <div className="lv-viz-title" style={{ marginTop: 'var(--lv-s4)' }}>
            <span>For a network’s loss</span>
            <EngineBadge text="Counted by the engine: the built network and one recorded backward pass" />
          </div>
          <div
            className="lv-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Passes needed for every gradient"
          >
            <table className="lv-table">
              <caption>Every gradient of one example’s loss, {chosen.label}</caption>
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">Forward mode (illustration)</th>
                  <th scope="col">Reverse mode (the engine)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Passes per example</th>
                  <td className="num" data-count="forward-passes">
                    {counts.parameters}
                  </td>
                  <td className="num" data-count="backward-passes">
                    {counts.backwardPasses}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Gradients from each pass</th>
                  <td className="num">1</td>
                  <td className="num" data-count="gradient-values">
                    {counts.gradientValues}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="lv-small lv-muted" style={{ marginBottom: 0 }}>
            The network has {counts.parameters} weights and biases. The engine’s record of one example holds{' '}
            {counts.backwardPasses} backward pass, which produced {counts.gradientValues} gradient values: one
            for every weight and bias.
          </p>
        </div>
        <section className="lv-panel" aria-label="Network for the count">
          <Segmented
            legend="Network"
            options={MODE_NETWORKS.map((m) => ({ value: m.id, label: m.label }))}
            value={net}
            onChange={(v) => {
              setNet(v);
              signal('modes-network');
            }}
            control="e:net"
          />
        </section>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Part F

const vals = (i: Instruction): string =>
  Object.entries(i.results)
    .map(([k, t]) => {
      const d = Array.from(t.data);
      return `${k}: ${d
        .slice(0, 4)
        .map((q) => fmt(q, 4))
        .join(', ')}${d.length > 4 ? ' …' : ''}`;
    })
    .join(' · ');

function PartF() {
  const [example, setExample] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const all = useMemo(() => recordedRun(), []);
  const graph = useMemo(() => exampleGraph(all, 0, example), [all, example]);
  const byId = useMemo(() => new Map(all.map((i) => [i.id, i])), [all]);
  const sel = selected !== null ? byId.get(selected) : undefined;
  const inSel = sel ? graph.edges.filter((e) => e.to === sel.id) : [];
  const outSel = sel ? graph.edges.filter((e) => e.from === sel.id) : [];
  const isSource = sel ? graph.sources.some((s) => s.id === sel.id) : false;
  const words = LEVEL2_PER_EXAMPLE_WORDING.kind;
  const pick = (id: number): void => {
    setSelected(id);
    signal('real-node-picked');
    const i = byId.get(id)!;
    if (example > 0 && i.kind === 'APPLY_UPDATE' && i.meta.param === 'L1.W') signal('source-update');
  };
  const madeBy = (i: Instruction): string =>
    i.kind === 'INIT_PARAM'
      ? 'the starting value'
      : `the update after example ${(i.path.batch ?? 0) + 1} (step #${i.id})`;
  return (
    <section className="lv-part" aria-labelledby="l2-p5f">
      <p className="lv-part-kicker">Part F</p>
      <h3 id="l2-p5f">The engine’s own graph</h3>
      <p className="lv-muted">
        For a real network the engine does exactly the same. Here is Experiment 04’s 2-2-1 network learning
        one XOR example, from the engine’s record. Each box is a recorded step; each line is a value the step
        used, traced to the step that produced it. The reverse pass reuses values from the forward pass, which
        is why the engine keeps them.
      </p>
      <div className="lv-row" style={{ marginBottom: 'var(--lv-s3)' }}>
        <Segmented
          legend="Example"
          options={[0, 1, 2, 3].map((b) => ({ value: b, label: `Example ${b + 1}` }))}
          value={example}
          onChange={(b) => {
            setExample(b);
            setSelected(null);
          }}
          control="f:example"
        />
      </div>
      <div className="lv-stack">
        <div className="lv-viz" data-tour="real-graph">
          <div className="lv-viz-title">
            <span>
              Epoch 1 · example {example + 1} of 4 · {graph.steps.length} steps, {graph.edges.length} recorded
              links
            </span>
            <EngineBadge text="Read from a recorded training run" />
          </div>
          <RecordGraphView
            graph={graph}
            selected={selected}
            onPick={pick}
            label={`The recorded graph of example ${example + 1}: ${graph.sources.length} parameter values, ${graph.steps.filter((i) => i.path.phase !== 'backward').length} forward and loss steps, ${graph.steps.filter((i) => i.path.phase === 'backward').length} backward steps. Choose a step to see its links.`}
          />
        </div>
        <section className="lv-panel" aria-label="The chosen step" aria-live="polite">
          {sel ? (
            <>
              <h4 style={{ marginTop: 0 }}>
                Step #{sel.id}: {nodeName(sel)}
              </h4>
              <p className="lv-small" style={{ marginTop: 0 }}>
                {words(sel.kind)} · <span className="lv-mono">{sel.symbolic}</span>
              </p>
              {isSource && (
                <p className="lv-small">
                  Made before this example: {madeBy(sel)}. Example {example + 1} reads it from there.
                </p>
              )}
              <p className="lv-small lv-mono" style={{ overflowWrap: 'anywhere' }}>
                {vals(sel)}
              </p>
              <div className="lv-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px' }}>
                  <p className="lv-small" style={{ margin: 0, fontWeight: 600 }}>
                    Uses ({inSel.length})
                  </p>
                  <ul className="lv-small" data-list="uses">
                    {inSel.map((e) => (
                      <li key={`${e.from}-${e.slot}`}>
                        <button type="button" className="lv-link" onClick={() => pick(e.from)}>
                          #{e.from} {nodeName(byId.get(e.from)!)}
                        </button>{' '}
                        as its {e.role}
                      </li>
                    ))}
                    {!inSel.length && <li>nothing: it was made before this example</li>}
                  </ul>
                </div>
                <div style={{ flex: '1 1 260px' }}>
                  <p className="lv-small" style={{ margin: 0, fontWeight: 600 }}>
                    Used by ({outSel.length})
                  </p>
                  <ul className="lv-small" data-list="used-by">
                    {outSel.map((e) => (
                      <li key={`${e.to}-${e.slot}-${e.role}`}>
                        <button type="button" className="lv-link" onClick={() => pick(e.to)}>
                          #{e.to} {nodeName(byId.get(e.to)!)}
                        </button>{' '}
                        as its {e.role}
                      </li>
                    ))}
                    {!outSel.length && <li>no later step of this example</li>}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <p className="lv-small lv-muted" style={{ margin: 0 }}>
              Choose a step in the graph (or Tab to it and press Enter) to see the values it used and where
              they came from.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

export function L2Experiment05() {
  const [x, setX] = useState<Record<X3, number>>(D.product);
  const [expr, setExpr] = useState<ExprId>('product');
  const [v, setV] = useState(D.shared);
  const live = useMemo(() => [gradQuestion(x, expr), sharedQuestion(v)], [x, expr, v]);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_2} liveQuestions={live}>
      <PartsAC x={x} setX={setX} expr={expr} setExpr={setExpr} />
      <PartD v={v} setV={setV} />
      <PartE />
      <PartF />
    </ExperimentLayout>
  );
}
