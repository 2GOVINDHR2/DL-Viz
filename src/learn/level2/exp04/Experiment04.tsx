/**
 * Level 2, Experiment 04 — Backpropagation: How Errors Travel Through a Network (ADR-092).
 *
 * Built only after the Stage 4 capability gate (tests/unit/level2-backprop-gate.test.ts) showed the engine exposes
 * every gradient used here.
 *  - Part A: the chain rule on y = σ(x²), every rate from the engine's backward pass.
 *  - Part B: one neuron's recorded backward pass.
 *  - Part C: the 2-2-1 network trained by the engine with one update per example. One example's forward and
 *    backward pass can be stepped and replayed before its update is applied. Every value is from the reconstructed
 *    state at the cursor (navigator + state.ts, through the shared trace store).
 */
import { useEffect, useMemo, useState } from 'react';
import type { TrainConfig } from '../../../core/engine/session';
import type { Instruction } from '../../../core/npm/ir';
import { L2_EXP04_DEFAULTS, level2ById } from '../../../experiments/level2';
import { LEVEL_2 } from '../../curriculum';
import { ExperimentLayout } from '../../components/ExperimentLayout';
import type { LiveQuestion } from '../../components/KnowledgeCheck';
import { MathNote } from '../../components/MathNote';
import { EngineBadge, ErrorNote, Segmented, Term, ValueSlider } from '../../components/ui';
import { fmt, fmtSigned } from '../../format';
import { signal } from '../../signals';
import { useRun } from '../../trace/store';
import { TraceExplorer } from '../../trace/TraceExplorer';
import { LEVEL2_WORDING, TraceWordingProvider } from '../../trace/wording';
import { BackpropDiagram } from '../viz/BackpropDiagram';
import { chain, decompose, neuronBackward, paramLabel, type Decomposition, type ParamRef } from './math';

const EXP = level2ById('04')!;
const D = L2_EXP04_DEFAULTS;

/** The real configuration: 2-2-1 sigmoid, BCE, one update per example, fixed order and starting weights. */
export function networkConfig(): TrainConfig {
  return {
    seed: 0,
    epochs: D.epochs,
    batchSize: 1,
    shuffle: false,
    loss: 'bce',
    optimizer: { type: 'sgd', lr: D.lr },
    model: {
      inputShape: [2],
      layers: [
        { type: 'dense', units: 2, activation: 'sigmoid' },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
    },
    initialParams: D.initialParams,
  };
}

export const PARAMS: ParamRef[] = [
  { layer: 'L1', kind: 'W', i: 0, j: 0 },
  { layer: 'L1', kind: 'W', i: 1, j: 0 },
  { layer: 'L1', kind: 'W', i: 0, j: 1 },
  { layer: 'L1', kind: 'W', i: 1, j: 1 },
  { layer: 'L1', kind: 'b', j: 0 },
  { layer: 'L1', kind: 'b', j: 1 },
  { layer: 'L2', kind: 'W', i: 0, j: 0 },
  { layer: 'L2', kind: 'W', i: 1, j: 0 },
  { layer: 'L2', kind: 'b', j: 0 },
];

const PHASE_WORDS: Record<string, string> = {
  forward: '→ Forward pass: computing the prediction',
  loss: '→ Loss: comparing the prediction with the target',
  backward: '← Backward pass: computing the gradients, from the loss towards the inputs',
  update: '⇄ Update: changing the parameters',
  control: 'Between examples',
  eval: 'Checking every example',
  init: 'Starting values',
};

// ---------------------------------------------------------------- Part A

export function chainQuestion(x: number): LiveQuestion {
  const c = chain(x);
  const opts = [
    { t: fmt(c.dydx, 4), ok: true },
    { t: fmt(c.dydg + c.dgdx, 4), ok: false },
    { t: fmt(c.dgdx, 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'b-live-chain',
    live: true,
    kind: 'predict',
    prompt: `In Part A, at x = ${fmt(x, 2)}: dg/dx = ${fmt(c.dgdx, 4)} and dy/dg = ${fmt(c.dydg, 4)}. What is dy/dx?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `The chain rule multiplies the two rates: ${fmt(c.dydg, 4)} × ${fmt(c.dgdx, 4)} = ${fmt(c.product, 4)}, and the engine’s own dy/dx is ${fmt(c.dydx, 4)}.`,
    })),
  };
}

function PartA({ x, setX }: { x: number; setX: (v: number) => void }) {
  const c = chain(x);
  return (
    <section className="lv-part" aria-labelledby="l2-p4a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l2-p4a">The chain rule</h3>
      <p className="lv-muted">
        Take g = x² and then y = σ(g), the sigmoid of g. y depends on x only <em>through</em> g. Here g
        changes {fmt(c.dgdx, 2)} times as fast as x, and y changes {fmt(c.dydg, 2)} times as fast as g, so y
        changes {fmt(c.dgdx, 2)} × {fmt(c.dydg, 2)} times as fast as x. That is the{' '}
        <Term meaning="For y = f(g(x)): dy/dx = (dy/dg) × (dg/dx).">chain rule</Term>: multiply the rates
        along the chain.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz" aria-live="polite">
          <div className="lv-viz-title">
            <span />
            <EngineBadge text="Demonstration computed by the engine · not a training run" />
          </div>
          <div className="lv-row" style={{ alignItems: 'stretch', flexWrap: 'wrap' }}>
            {[
              ['x', fmt(x, 2), 'input'],
              ['g = x²', fmt(c.g, 4), 'bias'],
              ['y = σ(g)', fmt(c.y, 4), 'weight'],
            ].map(([t, val, role], k) => (
              <div key={t} className="lv-row" style={{ gap: 6 }}>
                {k > 0 && <span aria-hidden="true">→</span>}
                <div
                  className="lv-panel"
                  style={{
                    padding: '8px 14px',
                    borderTop: `3px solid var(--lv-${role})`,
                    textAlign: 'center',
                  }}
                >
                  <div className="lv-small lv-muted">{t}</div>
                  <div className="lv-mono" style={{ fontWeight: 700 }}>
                    {val}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <table className="lv-table" style={{ marginTop: 'var(--lv-s4)' }}>
            <tbody>
              <tr>
                <th scope="row">Local rate dg/dx (= 2x)</th>
                <td className="num">{fmt(c.dgdx, 4)}</td>
              </tr>
              <tr>
                <th scope="row">Local rate dy/dg (= σ′(g))</th>
                <td className="num">{fmt(c.dydg, 4)}</td>
              </tr>
              <tr>
                <th scope="row">Their product, multiplied here</th>
                <td className="num">{fmt(c.product, 4)}</td>
              </tr>
              <tr>
                <th scope="row">dy/dx, computed by the engine for the whole chain</th>
                <td className="num">
                  <strong>{fmt(c.dydx, 4)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <section className="lv-panel" aria-label="Chain controls" data-tour="chain-controls">
          <ValueSlider
            label="x"
            role="input"
            value={x}
            min={-3}
            max={3}
            step={0.1}
            onChange={(v) => {
              setX(v);
              signal('chain-moved');
              if (chain(v).dydx === 0) signal('chain-zero');
            }}
            control="a:x"
          />
          <p className="lv-small lv-muted">
            The two numbers in the middle rows are each one link’s own rate. Neither knows about the other,
            yet their product is the rate of the whole chain.
          </p>
          <MathNote
            tex={
              '\\frac{dy}{dx} = \\frac{dy}{dg}\\cdot\\frac{dg}{dx} = \\sigma\\!\\left(g\\right)\\bigl(1-\\sigma(g)\\bigr)\\cdot 2x'
            }
            label="d y d x equals d y d g times d g d x, which equals sigma of g times 1 minus sigma of g, times 2 x"
          />
        </section>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Part B

function PartB() {
  const [w, setW] = useState(-1.5);
  const [b, setB] = useState(1);
  const [x, setX] = useState(-2);
  const [y, setY] = useState(0);
  const result = useMemo(() => {
    try {
      return { r: neuronBackward(x, y, w, b), error: null };
    } catch (e) {
      return { r: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [x, y, w, b]);
  const r = result.r;
  const change = (f: () => void): void => {
    f();
    signal('neuron-changed');
  };
  useEffect(() => {
    if (r && Math.abs(r.a - y) < 0.02) signal('neuron-near-target');
  }, [r, y]);
  const box = (title: string, value: string, sub?: string) => (
    <div className="lv-panel" style={{ padding: '8px 12px', minWidth: 128 }}>
      <div className="lv-small lv-muted">{title}</div>
      <div className="lv-mono" style={{ fontWeight: 700 }}>
        {value}
      </div>
      {sub && <div className="lv-small lv-muted">{sub}</div>}
    </div>
  );
  return (
    <section className="lv-part" aria-labelledby="l2-p4b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l2-p4b">Backpropagation through one neuron</h3>
      <p className="lv-muted">
        One neuron, one example: z = w·x + b, a = σ(z), and the loss L compares a with the target. Going
        backwards, each step multiplies the{' '}
        <Term meaning="∂L/∂(this operation’s output), arriving from the step after it.">
          incoming gradient
        </Term>{' '}
        by that step’s{' '}
        <Term meaning="The derivative of one operation with respect to its own input.">local derivative</Term>
        .
      </p>
      {result.error && <ErrorNote title="The engine could not run this setting.">{result.error}</ErrorNote>}
      {r && (
        <div className="lv-grid-main">
          <div className="lv-viz" data-tour="neuron-backward" aria-live="polite">
            <div className="lv-viz-title">
              <span />
              <EngineBadge text="Read from a recorded run" />
            </div>
            <p className="lv-small" style={{ marginTop: 0 }}>
              <strong>Forward:</strong> z = {fmt(w, 2)}·{fmt(x, 2)} + {fmt(b, 2)} = {fmt(r.z, 4)} → a = σ(z) ={' '}
              {fmt(r.a, 4)} → loss {fmt(r.loss, 4)}
            </p>
            <p className="lv-small" style={{ marginBottom: 6 }}>
              <strong>Backward</strong>, right to left (recorded steps #{r.ids.init}, #{r.ids.activate}, #
              {r.ids.bias}, #{r.ids.weight}):
            </p>
            <div
              className="lv-row"
              style={{ alignItems: 'stretch', flexDirection: 'row-reverse', justifyContent: 'flex-end' }}
            >
              {box('∂L/∂a (from the loss)', fmtSigned(r.dLda, 4))}
              <span aria-hidden="true" style={{ alignSelf: 'center' }}>
                ←
              </span>
              {box('∂L/∂z = ∂L/∂a × σ′(z)', fmtSigned(r.dLdz, 4), `σ′(z) = ${fmt(r.local, 4)}`)}
              <span aria-hidden="true" style={{ alignSelf: 'center' }}>
                ←
              </span>
              {box('∂L/∂w = ∂L/∂z × x', fmtSigned(r.dLdw, 4), `local derivative x = ${fmt(x, 2)}`)}
              {box('∂L/∂b = ∂L/∂z × 1', fmtSigned(r.dLdb, 4))}
            </div>
            <p className="lv-small lv-muted" style={{ marginBottom: 0 }}>
              Each value is the engine’s recorded result. σ′(z) is taken from the engine’s own rule for the
              sigmoid. The products on the labels describe how each value arises; the engine computed them.
            </p>
          </div>
          <section className="lv-panel" aria-label="Neuron controls">
            <ValueSlider
              label="Weight w"
              role="weight"
              value={w}
              min={-3}
              max={3}
              step={0.1}
              onChange={(v) => change(() => setW(v))}
              control="b:w"
            />
            <ValueSlider
              label="Bias b"
              role="bias"
              value={b}
              min={-3}
              max={3}
              step={0.1}
              onChange={(v) => change(() => setB(v))}
              control="b:b"
            />
            <ValueSlider
              label="Input x"
              role="input"
              value={x}
              min={-3}
              max={3}
              step={0.1}
              onChange={(v) => change(() => setX(v))}
              control="b:x"
            />
            <Segmented
              legend="Target"
              options={[
                { value: 0, label: '0' },
                { value: 1, label: '1' },
              ]}
              value={y}
              onChange={(v) => change(() => setY(v))}
              control="b:y"
            />
          </section>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Part C

export function weightQuestion(d: Decomposition | null, p: ParamRef): LiveQuestion {
  if (!d)
    return {
      id: 'b-live-weight',
      live: true,
      kind: 'predict',
      prompt: 'Pick a parameter in Part C and step through an example’s backward pass. What is its gradient?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Run the network in Part C and step to the end of an example’s backward pass first.',
    };
  const opts = [
    { t: fmt(d.recorded, 4), ok: true },
    { t: fmt(d.incoming, 4), ok: false },
    { t: fmt(d.incoming + d.local, 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'b-live-weight',
    live: true,
    kind: 'predict',
    prompt: `In Part C, for the ${paramLabel(p)}: the incoming gradient is ∂L/∂z = ${fmt(d.incoming, 4)} and the local derivative is ${fmt(d.local, 4)}. What is the parameter’s gradient?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `Incoming gradient × local derivative: ${fmt(d.incoming, 4)} × ${fmt(d.local, 4)} = ${fmt(d.product, 4)}, which is the engine’s recorded gradient ${fmt(d.recorded, 4)}.`,
    })),
  };
}

function useEpochSegments(): { batchIns: Instruction[] } {
  const view = useRun((s) => s.epochView);
  const exec = useRun((s) => s.exec);
  const batch = exec?.path?.batch ?? null;
  const batchIns = useMemo(
    () => (view && batch !== null ? view.instructions.filter((i) => i.path.batch === batch) : []),
    [view, batch],
  );
  return { batchIns };
}

function Inspector({ sel, setSel }: { sel: ParamRef; setSel: (p: ParamRef) => void }) {
  const exec = useRun((s) => s.exec);
  const d = exec ? decompose(exec, sel) : null;
  const matches = d ? Math.abs(d.product - d.recorded) <= 1e-12 * Math.max(1, Math.abs(d.recorded)) : false;
  return (
    <section
      className="lv-panel"
      aria-label="Where a parameter’s gradient comes from"
      data-tour="param-inspector"
    >
      <h4>Where a parameter’s gradient comes from</h4>
      <label className="lv-row">
        <span className="lv-control-label">Parameter</span>
        <select
          className="lv-select"
          value={PARAMS.indexOf(PARAMS.find((p) => JSON.stringify(p) === JSON.stringify(sel))!)}
          onChange={(e) => {
            const p = PARAMS[Number(e.target.value)];
            setSel(p);
            signal(`param-picked:${p.layer}`);
            const nd = exec ? decompose(exec, p) : null;
            if (nd && p.layer === 'L1' && p.kind === 'W' && nd.local === 0) signal('param-zero-input');
          }}
          data-control="c:param"
        >
          {PARAMS.map((p, k) => (
            <option key={k} value={k}>
              {paramLabel(p)}
            </option>
          ))}
        </select>
      </label>
      {d ? (
        <div aria-live="polite">
          <dl className="lv-kv" style={{ marginTop: 'var(--lv-s3)' }}>
            <dt>Incoming gradient ∂L/∂z</dt>
            <dd>{fmtSigned(d.incoming, 4)}</dd>
            <dt>Local derivative ({d.localName})</dt>
            <dd>{fmt(d.local, 4)}</dd>
            <dt>Incoming × local</dt>
            <dd>{fmtSigned(d.product, 4)}</dd>
            <dt>Recorded gradient</dt>
            <dd>
              {fmtSigned(d.recorded, 4)} {matches ? '✓ the same' : '✕ differs'}
            </dd>
          </dl>
          {d.local === 0 && (
            <p className="lv-small">Its input is 0, so this example did not affect it: its gradient is 0.</p>
          )}
          {d.hidden && (
            <MathNote
              summary="Where the hidden neuron’s incoming gradient came from"
              tex={
                "\\frac{\\partial L}{\\partial z^{1}_j} = \\frac{\\partial L}{\\partial a^{1}_j}\\,\\sigma'\\!\\left(z^{1}_j\\right), \\qquad \\frac{\\partial L}{\\partial a^{1}_j} = w^{2}_j\\,\\frac{\\partial L}{\\partial z^{2}}"
              }
              label="d L d z 1 j equals d L d a 1 j times sigma prime of z 1 j; d L d a 1 j equals w 2 j times d L d z 2"
            >
              <p className="lv-small">
                From the output neuron: w²<sub>j</sub> = {fmt(d.hidden.fromOutput.weight, 4)} × ∂L/∂z² ={' '}
                {fmtSigned(d.hidden.fromOutput.dLdz2, 4)} gives ∂L/∂a¹<sub>j</sub> ={' '}
                {fmtSigned(d.hidden.dLda, 4)} (recorded). Then × σ′(z¹<sub>j</sub>) ={' '}
                {fmt(d.hidden.sigmaPrime, 4)} gives ∂L/∂z¹<sub>j</sub> = {fmtSigned(d.incoming, 4)}.
              </p>
            </MathNote>
          )}
        </div>
      ) : (
        <p className="lv-small lv-muted">
          Not computed yet at this step. Step into the backward pass to see it.
        </p>
      )}
    </section>
  );
}

function UpdateTable() {
  const exec = useRun((s) => s.exec);
  const ups = exec ? Object.entries(exec.updates).filter(([, u]) => u.after) : [];
  if (!ups.length) return null;
  const v = (t: { data: ArrayLike<number> } | undefined): string =>
    t
      ? Array.from(t.data)
          .map((q) => fmt(q, 4))
          .join(', ')
      : '—';
  return (
    <div className="lv-table-wrap" tabIndex={0} role="region" aria-label="The update of this example">
      <table className="lv-table lv-small">
        <caption>This example’s update: one per example</caption>
        <thead>
          <tr>
            <th scope="col">Parameter</th>
            <th scope="col">Gradient g</th>
            <th scope="col">−η·g</th>
            <th scope="col">Before</th>
            <th scope="col">After</th>
          </tr>
        </thead>
        <tbody>
          {ups.map(([n, u]) => (
            <tr key={n}>
              <td>{n}</td>
              <td className="num">{v(u.grad)}</td>
              <td className="num">{v(u.delta)}</td>
              <td className="num">{v(u.before)}</td>
              <td className="num">{v(u.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PartC({ sel, setSel }: { sel: ParamRef; setSel: (p: ParamRef) => void }) {
  const status = useRun((s) => s.status);
  const error = useRun((s) => s.error);
  const run = useRun((s) => s.run);
  const header = useRun((s) => s.header);
  const exec = useRun((s) => s.exec);
  const cursor = useRun((s) => s.cursor);
  const train = useRun((s) => s.train);
  const step = useRun((s) => s.step);
  const jump = useRun((s) => s.jump);
  const dispose = useRun((s) => s.dispose);
  useEffect(() => () => dispose(), [dispose]);
  const { batchIns } = useEpochSegments();

  // After training, start at the first example's beginning.
  useEffect(() => {
    if (status === 'ready' && header && cursor === -1) void jump(header.epochStarts[0] + 1);
  }, [status, header, cursor, jump]);

  const begin = batchIns.find((i) => i.kind === 'BATCH_BEGIN')?.id;
  const lastBackward = batchIns.filter((i) => i.path.phase === 'backward').at(-1)?.id;
  const end = batchIns.find((i) => i.kind === 'BATCH_END')?.id;
  const phase = exec?.current?.path.phase ?? 'control';
  const atBackwardEnd = lastBackward !== undefined && cursor >= lastBackward;
  useEffect(() => {
    if (lastBackward !== undefined && cursor === lastBackward) signal('backward-done');
  }, [cursor, lastBackward]);
  const s = exec?.sample;
  const where = exec?.path
    ? `Epoch ${(exec.path.epoch ?? 0) + 1} of ${D.epochs} · example ${(exec.path.batch ?? 0) + 1} of 4${s ? ` · x = (${Array.from(s.x.data).join(', ')}), target ${s.y.data[0]}` : ''}`
    : '';
  return (
    <section className="lv-part" aria-labelledby="l2-p4c">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l2-p4c">Backpropagation through a 2-2-1 network</h3>
      <p className="lv-muted">
        Two inputs, two hidden sigmoid neurons, one sigmoid output, on the four XOR examples. The engine
        updates the parameters after each example. Step through one example: forward to the loss, then
        backward to every weight and bias. The update is applied only when you move past the backward pass.
        Whether this small network ends up solving XOR does not matter here; the point is where every gradient
        comes from.
      </p>
      <div className="lv-row" style={{ marginBottom: 'var(--lv-s4)' }}>
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          onClick={() => void train(networkConfig(), '2-2-1 sigmoid', { kind: 'xor' })}
          disabled={status === 'training'}
          data-tour="net-train"
          data-control="c:train"
        >
          {status === 'training' ? 'Running…' : run ? 'Run again' : 'Run the network'}
        </button>
        <span className="lv-small lv-muted">
          {D.epochs} epochs · one update per example · learning rate {D.lr} · fixed starting weights
        </span>
      </div>
      {status === 'error' && (
        <ErrorNote title="The run did not complete.">
          <p>{error}</p>
        </ErrorNote>
      )}
      {status === 'ready' && exec && (
        <div className="lv-stack">
          <div className="lv-grid-main">
            <div className="lv-viz">
              <div className="lv-viz-title">
                <p className="lv-where" style={{ margin: 0 }} aria-live="polite">
                  {where}
                </p>
                <EngineBadge text="Recorded training run" />
              </div>
              <p className="lv-callout" style={{ margin: '0 0 var(--lv-s3)' }} aria-live="polite">
                <strong>{PHASE_WORDS[phase] ?? phase}</strong>
                {exec.current && (
                  <span className="lv-small">
                    {' '}
                    · step #{exec.current.id}: {LEVEL2_WORDING.kind(exec.current.kind)}
                  </span>
                )}
              </p>
              <BackpropDiagram st={exec} selected={sel} phase={phase} />
              <div className="lv-stack" style={{ marginTop: 'var(--lv-s3)' }} data-tour="net-stepper">
                <div className="lv-stepper">
                  <button
                    type="button"
                    className="lv-btn lv-btn-small"
                    onClick={() => begin !== undefined && void jump(begin)}
                    disabled={begin === undefined || cursor <= begin}
                    data-control="c:replay"
                  >
                    ⏮ Replay this example
                  </button>
                  <button
                    type="button"
                    className="lv-btn lv-btn-small"
                    onClick={() => void step(-1, 'operation')}
                    disabled={begin === undefined || cursor <= begin}
                    data-control="c:back"
                  >
                    ◀ Step back
                  </button>
                  <button
                    type="button"
                    className="lv-btn lv-btn-small lv-btn-primary"
                    onClick={() => void step(1, 'operation')}
                    disabled={end !== undefined && cursor >= end}
                    data-control="c:step"
                  >
                    Step ▶
                  </button>
                  <button
                    type="button"
                    className="lv-btn lv-btn-small"
                    onClick={() => lastBackward !== undefined && void jump(lastBackward)}
                    disabled={lastBackward === undefined || cursor >= lastBackward}
                    data-control="c:to-backward-end"
                  >
                    To the end of the backward pass
                  </button>
                </div>
                <div className="lv-stepper">
                  <button
                    type="button"
                    className="lv-btn lv-btn-small"
                    onClick={() => {
                      if (end === undefined) return;
                      void jump(end);
                      signal('update-applied');
                    }}
                    disabled={!atBackwardEnd || end === undefined || cursor >= end}
                    data-control="c:apply"
                  >
                    Apply this example’s update
                  </button>
                  <button
                    type="button"
                    className="lv-btn lv-btn-small"
                    onClick={() => end !== undefined && void jump(end + 1)}
                    disabled={end === undefined || cursor < end || !header || end + 1 >= header.length}
                    data-control="c:next-example"
                  >
                    Next example ▶▶
                  </button>
                </div>
                <p className="lv-small lv-muted" style={{ margin: 0 }}>
                  “Apply this example’s update” becomes available at the end of the backward pass. Replaying
                  an example re-reads its record; nothing is recomputed differently, and nothing is updated
                  twice.
                </p>
              </div>
            </div>
            <div className="lv-stack">
              <Inspector sel={sel} setSel={setSel} />
              <UpdateTable />
            </div>
          </div>
          <TraceWordingProvider value={LEVEL2_WORDING}>
            <TraceExplorer stale={false} />
          </TraceWordingProvider>
        </div>
      )}
    </section>
  );
}

export function L2Experiment04() {
  const [x, setX] = useState(0.8);
  const [sel, setSel] = useState<ParamRef>(PARAMS[0]);
  const exec = useRun((s) => s.exec);
  const live = useMemo(
    () => [chainQuestion(x), weightQuestion(exec ? decompose(exec, sel) : null, sel)],
    [x, exec, sel],
  );
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_2} liveQuestions={live}>
      <PartA x={x} setX={setX} />
      <PartB />
      <PartC sel={sel} setSel={setSel} />
    </ExperimentLayout>
  );
}
