/**
 * Level 2, Experiment 01 — Forward Propagation: From Input to Prediction.
 *
 * Every value comes from engine probes (ADR-082): real runs recorded as NPM traces with learning rate 0.
 *  - Part A: one neuron with three inputs; each input's contribution is the weighted sum of a probe example that
 *    keeps only that input, so even the per-input products are engine results.
 *  - Part B: a layer of two neurons on the same inputs.
 *  - Part C: a 2-2-1 network, stepped through its recorded forward instructions (LOAD_INPUT, then MATMUL,
 *    ADD_BIAS, ACTIVATE per layer), by layer or by operation. Values not yet computed at the step are not shown.
 *  - Part D: the matrix form z = W a + b, with W shown one row per neuron (the engine stores it transposed; ADR-089).
 */
import { useMemo, useState } from 'react';
import type { Activation, ModelConfig } from '../../core/layers/model';
import type { Instruction } from '../../core/npm/ir';
import { L2_EXP01_DEFAULTS, level2ById } from '../../experiments/level2';
import { LEVEL_2 } from '../curriculum';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { Formula } from '../components/MathNote';
import {
  Disclosure,
  EngineBadge,
  ErrorNote,
  kindWords,
  RecordList,
  Segmented,
  Term,
  ValueSlider,
} from '../components/ui';
import { probe } from '../engine/probe';
import { fmt } from '../format';
import { signal } from '../signals';
import { NeuronDiagram } from '../viz/NeuronDiagram';
import { ForwardDiagram, type DiagramLayer } from './viz/ForwardDiagram';

const EXP = level2ById('01')!;
type Act = Extract<Activation, 'sigmoid' | 'tanh' | 'relu' | 'linear'>;
const ACTS: Act[] = ['sigmoid', 'tanh', 'relu', 'linear'];
const ACT_NAME: Record<Act, string> = { sigmoid: 'Sigmoid', tanh: 'Tanh', relu: 'ReLU', linear: 'Linear' };
const SUB = ['₁', '₂', '₃'];

const dense = (inputs: number, units: number, act: Act): ModelConfig => ({
  inputShape: [inputs],
  layers: [{ type: 'dense', units, activation: act }],
});

/** Rows that keep one input each: their weighted sums are that input's contribution. */
const oneHotRows = (x: number[]): number[][] => x.map((v, i) => x.map((_, k) => (k === i ? v : 0)));

// ---------------------------------------------------------------- Part A

export function neuronRun(x: number[], w: number[], b: number, act: Act) {
  const r = probe({
    model: dense(x.length, 1, act),
    params: { 'L1.W': w, 'L1.b': [b] },
    xs: [x, ...oneHotRows(x)],
  });
  const L = r.examples[0].layers.L1;
  return {
    r,
    u: L.u![0],
    z: L.z![0],
    a: L.a![0],
    contributions: r.examples.slice(1).map((e) => e.layers.L1.u![0]),
  };
}

function PartA() {
  const d = L2_EXP01_DEFAULTS.neuron;
  const [x, setX] = useState([...d.x]);
  const [w, setW] = useState([...d.w]);
  const [b, setB] = useState(d.b);
  const [act, setAct] = useState<Act>('sigmoid');
  const result = useMemo(() => {
    try {
      return { v: neuronRun(x, w, b, act), error: null };
    } catch (e) {
      return { v: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [x, w, b, act]);
  const v = result.v;
  return (
    <section className="lv-part" aria-labelledby="l2-p1a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l2-p1a">A single neuron with several inputs</h3>
      <p className="lv-muted">
        With n inputs the neuron computes <span className="lv-mono">z = w₁x₁ + w₂x₂ + … + wₙxₙ + b</span>,
        then <span className="lv-mono">a = f(z)</span>. Here n = 3.
      </p>
      {result.error && <ErrorNote title="The engine could not run this setting.">{result.error}</ErrorNote>}
      {v && (
        <div className="lv-grid-main">
          <div className="lv-viz">
            <div className="lv-viz-title">
              <span />
              <EngineBadge instructions={v.r.length} />
            </div>
            <NeuronDiagram
              v={{
                x,
                w,
                b,
                contributions: v.contributions,
                u: v.u,
                z: v.z,
                a: v.a,
                activation: ACT_NAME[act],
              }}
            />
          </div>
          <section className="lv-panel" aria-label="Neuron controls" data-tour="neuron-controls">
            {x.map((xi, i) => (
              <ValueSlider
                key={`x${i}`}
                label={`Input x${SUB[i]}`}
                role="input"
                value={xi}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => {
                  setX(x.map((p, k) => (k === i ? q : p)));
                  signal('input-changed');
                }}
                control={`a:x${i + 1}`}
              />
            ))}
            {w.map((wi, i) => (
              <ValueSlider
                key={`w${i}`}
                label={`Weight w${SUB[i]}`}
                role="weight"
                value={wi}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => {
                  setW(w.map((p, k) => (k === i ? q : p)));
                  signal('weight-changed');
                }}
                control={`a:w${i + 1}`}
              />
            ))}
            <ValueSlider
              label="Bias b"
              role="bias"
              value={b}
              min={-2}
              max={2}
              step={0.1}
              onChange={setB}
              control="a:b"
            />
            <Segmented
              legend="Activation function"
              options={ACTS.map((a) => ({ value: a, label: ACT_NAME[a] }))}
              value={act}
              onChange={setAct}
              control="a:act"
            />
            <dl className="lv-kv" style={{ marginTop: 'var(--lv-s4)' }} aria-live="polite">
              <dt>z</dt>
              <dd>{fmt(v.z, 3)}</dd>
              <dt>a = f(z)</dt>
              <dd>{fmt(v.a, 3)}</dd>
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Part B

function PartB() {
  const d = L2_EXP01_DEFAULTS.layer;
  const [W, setW] = useState([...d.W]);
  const [b, setB] = useState([...d.b]);
  const x = d.x;
  const result = useMemo(() => {
    try {
      const r = probe({ model: dense(2, 2, 'sigmoid'), params: { 'L1.W': W, 'L1.b': b }, xs: [x] });
      return { r, L: r.examples[0].layers.L1, error: null };
    } catch (e) {
      return { r: null, L: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [W, b, x]);
  // Engine layout: W[i][j] joins input i to neuron j, so neuron j's weights are W[j] and W[2 + j].
  const setWeight = (i: number, j: number, v: number): void => {
    setW(W.map((q, k) => (k === i * 2 + j ? v : q)));
    signal('layer-weight-changed');
  };
  return (
    <section className="lv-part" aria-labelledby="l2-p1b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l2-p1b">From neuron to layer</h3>
      <p className="lv-muted">
        A <Term meaning="A group of neurons that all receive the same inputs.">layer</Term> is several neurons
        side by side. They all see the same inputs, but each has its own weights and bias, so each produces
        its own{' '}
        <Term meaning="A neuron’s output a = f(z); the activations of one layer are the inputs of the next.">
          activation
        </Term>
        .
      </p>
      {result.error && <ErrorNote title="The engine could not run this setting.">{result.error}</ErrorNote>}
      {result.L && result.r && (
        <div className="lv-grid-main">
          <div className="lv-viz" data-tour="layer-view">
            <div className="lv-viz-title">
              <span />
              <EngineBadge instructions={result.r.length} />
            </div>
            <ForwardDiagram
              inputs={x}
              layers={[{ W, b, z: result.L.z, a: result.L.a, label: 'Layer (sigmoid)' }]}
              title="Two neurons, the same two inputs"
            />
          </div>
          <section className="lv-panel" aria-label="Layer controls">
            {[0, 1].map((j) => (
              <div key={j}>
                <h4 style={{ marginTop: j ? 'var(--lv-s4)' : 0 }}>Neuron {j + 1}</h4>
                {[0, 1].map((i) => (
                  <ValueSlider
                    key={i}
                    label={`Weight from x${SUB[i]}`}
                    role="weight"
                    value={W[i * 2 + j]}
                    min={-2}
                    max={2}
                    step={0.1}
                    onChange={(v) => setWeight(i, j, v)}
                    control={`b:w${i + 1}${j + 1}`}
                  />
                ))}
                <ValueSlider
                  label="Bias"
                  role="bias"
                  value={b[j]}
                  min={-2}
                  max={2}
                  step={0.1}
                  onChange={(v) => {
                    setB(b.map((q, k) => (k === j ? v : q)));
                    signal('layer-weight-changed');
                  }}
                  control={`b:b${j + 1}`}
                />
                <p className="lv-small" aria-live="polite" style={{ margin: 0 }}>
                  z = <span className="lv-mono">{fmt(result.L!.z![j], 3)}</span> · a ={' '}
                  <span className="lv-mono">{fmt(result.L!.a![j], 3)}</span>
                </p>
              </div>
            ))}
          </section>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Parts C and D

export interface NetSetting {
  x: number[];
  hidden: { W: number[]; b: number[] };
  output: { W: number[]; b: number[] };
  act: Act;
}

const NET_MODEL = (act: Act): ModelConfig => ({
  inputShape: [2],
  layers: [
    { type: 'dense', units: 2, activation: act },
    { type: 'dense', units: 1, activation: 'sigmoid' },
  ],
});

/** The 2-2-1 network's forward pass, and each hidden neuron's contribution to the output's weighted sum, from the engine. */
export function networkRun(s: NetSetting) {
  const params = { 'L1.W': s.hidden.W, 'L1.b': s.hidden.b, 'L2.W': s.output.W, 'L2.b': s.output.b };
  const r = probe({ model: NET_MODEL(s.act), params, xs: [s.x] });
  const ex = r.examples[0];
  const hiddenA = ex.layers.L1.a!;
  // The output layer alone, on rows that keep one hidden activation each: each weighted sum is that neuron's part.
  const parts = probe({
    model: dense(2, 1, 'sigmoid'),
    params: { 'L1.W': s.output.W, 'L1.b': s.output.b },
    xs: oneHotRows(hiddenA),
  });
  return { r, steps: ex.instructions, ex, contributions: parts.examples.map((e) => e.layers.L1.u![0]) };
}

export function networkQuestions(s: NetSetting): LiveQuestion[] {
  const { contributions: c } = networkRun(s);
  const bigger = Math.abs(c[0]) >= Math.abs(c[1]) ? 1 : 2;
  return [
    {
      id: 'f-live',
      live: true,
      kind: 'predict',
      prompt: `With the network’s current settings, which hidden neuron contributes more (in size) to the output neuron’s weighted sum?`,
      options: [1, 2].map((k) => ({
        text: `Hidden neuron ${k}`,
        correct: k === bigger,
        feedback: `Each contribution is the hidden activation times its output weight. The engine’s values are ${fmt(c[0], 3)} for neuron 1 and ${fmt(c[1], 3)} for neuron 2, so neuron ${bigger} contributes more.`,
      })),
    },
  ];
}

type Detail = 'layer' | 'operation';

/** Step boundaries over the recorded forward instructions: per layer, or per instruction. */
function stepEnds(steps: Instruction[], detail: Detail): number[] {
  if (detail === 'operation') return steps.map((_, k) => k);
  const ends: number[] = [];
  steps.forEach((ins, k) => {
    if (steps[k + 1]?.path.layer !== ins.path.layer) ends.push(k);
  });
  return ends;
}

function diagramAt(
  s: NetSetting,
  steps: Instruction[],
  upto: number,
): { inputs: (number | undefined)[]; layers: DiagramLayer[]; current: number } {
  const seen = steps.slice(0, upto + 1);
  const val = (layer: string, kind: string): number[] | undefined => {
    const i = seen.find((q) => q.path.layer === layer && q.kind === kind);
    return i ? Array.from(i.results.out.data) : undefined;
  };
  const load = seen.find((q) => q.kind === 'LOAD_INPUT');
  const cur = seen.at(-1);
  return {
    inputs: load ? Array.from(load.results.x.data) : s.x.map(() => undefined),
    layers: [
      {
        W: s.hidden.W,
        b: s.hidden.b,
        z: val('L1', 'ADD_BIAS') ?? [undefined, undefined],
        a: val('L1', 'ACTIVATE') ?? [undefined, undefined],
        label: 'Hidden layer',
      },
      {
        W: s.output.W,
        b: s.output.b,
        z: val('L2', 'ADD_BIAS') ?? [undefined],
        a: val('L2', 'ACTIVATE') ?? [undefined],
        label: 'Output',
      },
    ],
    current: cur?.path.layer === 'L1' ? 0 : cur?.path.layer === 'L2' ? 1 : -1,
  };
}

const STEP_WORDS: Record<string, string> = {
  LOAD_INPUT: 'The example’s inputs enter the network.',
  MATMUL: 'Each neuron multiplies every input by its weight and adds the products up.',
  ADD_BIAS: 'Each neuron adds its bias: this is z.',
  ACTIVATE: 'Each neuron applies its activation function: a = f(z).',
};

/**
 * The engine's weights (W[i][j] joins input i to neuron j, row-major) in the textbook layout: one row per neuron
 * (ADR-089). A change of layout only; no value is computed.
 */
export const textbookRows = (Wengine: number[], nIn: number, nOut: number): number[][] =>
  Array.from({ length: nOut }, (_, j) => Array.from({ length: nIn }, (_, i) => Wengine[i * nOut + j]));

function MatrixView({ s, steps }: { s: NetSetting; steps: Instruction[] }) {
  const layer = (name: string) => steps.filter((i) => i.path.layer === name);
  const get = (name: string, kind: string): number[] =>
    Array.from(layer(name).find((i) => i.kind === kind)!.results.out.data);
  const x = Array.from(steps.find((i) => i.kind === 'LOAD_INPUT')!.results.x.data);
  const blocks = [
    {
      l: 1,
      name: 'L1',
      W: textbookRows(s.hidden.W, 2, 2),
      a: x,
      b: s.hidden.b,
      z: get('L1', 'ADD_BIAS'),
      out: get('L1', 'ACTIVATE'),
      aName: 'a⁽⁰⁾ = x',
    },
    {
      l: 2,
      name: 'L2',
      W: textbookRows(s.output.W, 2, 1),
      a: get('L1', 'ACTIVATE'),
      b: s.output.b,
      z: get('L2', 'ADD_BIAS'),
      out: get('L2', 'ACTIVATE'),
      aName: 'a⁽¹⁾',
    },
  ];
  const vec = (v: number[]) => (
    <table className="lv-matrix">
      <tbody>
        {v.map((q, i) => (
          <tr key={i}>
            <td>{fmt(q, 3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <div className="lv-stack">
      <Formula
        tex={'z^{(l)} = W^{(l)}\\,a^{(l-1)} + b^{(l)} \\qquad a^{(l)} = f\\!\\left(z^{(l)}\\right)'}
        label="z of layer l equals W of layer l times a of layer l minus 1, plus b of layer l; a of layer l equals f of z of layer l"
      />
      {blocks.map((k) => (
        <div key={k.l} className="lv-panel">
          <h4>
            Layer {k.l} ({k.l === 1 ? 'hidden' : 'output'})
          </h4>
          <div className="lv-row" style={{ alignItems: 'center' }}>
            <div>
              <p className="lv-small lv-muted" style={{ margin: 0 }}>
                W⁽{k.l}⁾ (row = neuron)
              </p>
              <table className="lv-matrix">
                <tbody>
                  {k.W.map((r, j) => (
                    <tr key={j}>
                      {r.map((q, i) => (
                        <td key={i}>{fmt(q, 2)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span aria-hidden="true">·</span>
            <div>
              <p className="lv-small lv-muted" style={{ margin: 0 }}>
                {k.aName}
              </p>
              {vec(k.a)}
            </div>
            <span aria-hidden="true">+</span>
            <div>
              <p className="lv-small lv-muted" style={{ margin: 0 }}>
                b⁽{k.l}⁾
              </p>
              {vec(k.b)}
            </div>
            <span aria-hidden="true">=</span>
            <div>
              <p className="lv-small lv-muted" style={{ margin: 0 }}>
                z⁽{k.l}⁾
              </p>
              {vec(k.z)}
            </div>
            <span aria-hidden="true">→ f →</span>
            <div>
              <p className="lv-small lv-muted" style={{ margin: 0 }}>
                a⁽{k.l}⁾
              </p>
              {vec(k.out)}
            </div>
          </div>
          <ul className="lv-small" style={{ marginBottom: 0 }}>
            {k.W.map((r, j) => (
              <li key={j}>
                Row {j + 1} is neuron {j + 1}:{' '}
                <span className="lv-mono">
                  {r.map((q, i) => `${fmt(q, 2)}·${fmt(k.a[i], 3)}`).join(' + ')} + {fmt(k.b[j], 2)} ={' '}
                  {fmt(k.z[j], 3)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="lv-small lv-muted">
        Each row of W times a is exactly one neuron’s weighted sum from Parts A and B. The engine stores W the
        other way round (one row per input) and computes a·W, which gives the same numbers. Here it is shown
        in the textbook layout. z and a are the values the engine recorded.
      </p>
    </div>
  );
}

function PartsCD({ s, setS }: { s: NetSetting; setS: (s: NetSetting) => void }) {
  const [detail, setDetail] = useState<Detail>('layer');
  const [at, setAt] = useState(0);
  const result = useMemo(() => {
    try {
      return { v: networkRun(s), error: null };
    } catch (e) {
      return { v: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [s]);
  if (result.error || !result.v)
    return <ErrorNote title="The engine could not run this setting.">{result.error}</ErrorNote>;
  const { r, steps, contributions } = result.v;
  const ends = stepEnds(steps, detail);
  const k = Math.min(at, ends.length - 1);
  const upto = ends[k];
  const view = diagramAt(s, steps, upto);
  const cur = steps[upto];
  const done = upto === steps.length - 1;
  const move = (d: number): void => {
    setAt(Math.max(0, Math.min(ends.length - 1, k + d)));
    signal('forward-step');
  };
  const change = (next: NetSetting, sig: string): void => {
    setS(next);
    signal(sig);
  };
  const setVec = (v: number[], i: number, q: number): number[] => v.map((p, j) => (j === i ? q : p));
  return (
    <>
      <section className="lv-part" aria-labelledby="l2-p1c">
        <p className="lv-part-kicker">Part C</p>
        <h3 id="l2-p1c">A small network, step by step</h3>
        <p className="lv-muted">
          Two inputs, a hidden layer of two neurons, one output neuron. The hidden activations become the
          output neuron’s inputs. This is <strong>forward propagation</strong>.
        </p>
        <div className="lv-grid-main">
          <div className="lv-viz">
            <div className="lv-viz-title">
              <span className="lv-small lv-muted" aria-live="polite">
                Step {k + 1} of {ends.length}
              </span>
              <EngineBadge instructions={r.length} />
            </div>
            <ForwardDiagram
              inputs={view.inputs}
              layers={view.layers}
              current={view.current}
              title="The 2-2-1 network at this step"
            />
            <div className="lv-stack" style={{ marginTop: 'var(--lv-s3)' }}>
              <div className="lv-row" data-tour="network-stepper">
                <button
                  type="button"
                  className="lv-btn lv-btn-small"
                  onClick={() => move(-k)}
                  disabled={k === 0}
                  data-control="c:start"
                >
                  ⏮ Start
                </button>
                <button
                  type="button"
                  className="lv-btn lv-btn-small"
                  onClick={() => move(-1)}
                  disabled={k === 0}
                  data-control="c:back"
                >
                  ◀ Previous step
                </button>
                <button
                  type="button"
                  className="lv-btn lv-btn-small lv-btn-primary"
                  onClick={() => move(1)}
                  disabled={done}
                  data-control="c:next"
                >
                  Next step ▶
                </button>
                <button
                  type="button"
                  className="lv-btn lv-btn-small"
                  onClick={() => move(ends.length)}
                  disabled={done}
                  data-control="c:end"
                >
                  Prediction ⏭
                </button>
              </div>
              <Segmented
                legend="Step by"
                options={[
                  { value: 'layer', label: 'Layer' },
                  { value: 'operation', label: 'Operation' },
                ]}
                value={detail}
                onChange={(d) => {
                  // Keep the position: land on the step that contains the current instruction.
                  const nextEnds = stepEnds(steps, d);
                  setAt(
                    Math.max(
                      0,
                      nextEnds.findIndex((e) => e >= upto),
                    ),
                  );
                  setDetail(d);
                  signal(`forward-detail:${d}`);
                }}
                tour="network-detail"
                control="c:detail"
              />
            </div>
          </div>
          <div className="lv-stack">
            <section className="lv-panel" aria-label="This step" aria-live="polite">
              <p className="lv-where" style={{ margin: 0 }}>
                {cur.kind === 'LOAD_INPUT'
                  ? 'Inputs'
                  : cur.path.layer === 'L1'
                    ? 'Hidden layer'
                    : 'Output layer'}{' '}
                · {kindWords(cur.kind)}
              </p>
              <p style={{ margin: '4px 0' }}>{STEP_WORDS[cur.kind] ?? ''}</p>
              <dl className="lv-kv">
                <dt>Recorded step</dt>
                <dd>
                  #{cur.id} {cur.kind}
                </dd>
                <dt>Result</dt>
                <dd>
                  {Object.entries(cur.results)
                    .map(
                      ([n, t]) =>
                        `${n} = ${Array.from(t.data)
                          .map((v) => fmt(v, 3))
                          .join(', ')}`,
                    )
                    .join('; ')}
                </dd>
              </dl>
              {done && (
                <p className="lv-bigvalue" style={{ fontSize: '1.2rem', margin: 'var(--lv-s3) 0 0' }}>
                  Prediction: {fmt(view.layers[1].a![0], 3)}
                </p>
              )}
            </section>
            <section className="lv-panel" aria-label="Contributions to the prediction">
              <h4>What feeds the output neuron</h4>
              <table className="lv-table lv-small">
                <thead>
                  <tr>
                    <th scope="col">From</th>
                    <th scope="col">activation × weight</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c, j) => (
                    <tr key={j}>
                      <td>Hidden neuron {j + 1}</td>
                      <td className="num">{done || view.layers[0].a![j] !== undefined ? fmt(c, 3) : '·'}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Bias</td>
                    <td className="num">{fmt(s.output.b[0], 3)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="lv-small lv-muted" style={{ marginBottom: 0 }}>
                Their sum is the output’s z. Each contribution is computed by the engine from that neuron
                alone.
              </p>
            </section>
          </div>
        </div>
        <Disclosure summary="Change the network’s inputs and weights">
          <div className="lv-grid-2">
            <div>
              {s.x.map((v, i) => (
                <ValueSlider
                  key={i}
                  label={`Input x${SUB[i]}`}
                  role="input"
                  value={v}
                  min={-2}
                  max={2}
                  step={0.1}
                  onChange={(q) => change({ ...s, x: setVec(s.x, i, q) }, 'network-input-changed')}
                  control={`c:x${i + 1}`}
                />
              ))}
              <Segmented
                legend="Hidden activation"
                options={(['sigmoid', 'tanh', 'relu'] as Act[]).map((a) => ({
                  value: a,
                  label: ACT_NAME[a],
                }))}
                value={s.act}
                onChange={(a) => change({ ...s, act: a }, 'network-act')}
                control="c:act"
              />
            </div>
            <div>
              {s.output.W.map((v, j) => (
                <ValueSlider
                  key={j}
                  label={`Output weight from hidden ${j + 1}`}
                  role="weight"
                  value={v}
                  min={-2}
                  max={2}
                  step={0.1}
                  onChange={(q) =>
                    change(
                      { ...s, output: { ...s.output, W: setVec(s.output.W, j, q) } },
                      'output-weight-changed',
                    )
                  }
                  control={`c:v${j + 1}`}
                />
              ))}
              <ValueSlider
                label="Output bias"
                role="bias"
                value={s.output.b[0]}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => change({ ...s, output: { ...s.output, b: [q] } }, 'output-weight-changed')}
                control="c:vb"
              />
            </div>
          </div>
        </Disclosure>
        <div style={{ marginTop: 'var(--lv-s3)' }}>
          <Disclosure summary="See the engine’s record of this forward pass">
            <RecordList instructions={steps} />
          </Disclosure>
        </div>
      </section>
      <section className="lv-part" aria-labelledby="l2-p1d">
        <p className="lv-part-kicker">Part D · optional</p>
        <h3 id="l2-p1d">The same computation as matrices</h3>
        <p className="lv-muted">
          A <Term meaning="A list of numbers treated as one thing.">vector</Term> holds a layer’s values; a{' '}
          <Term meaning="A table of numbers; a layer’s weights, one row per neuron.">matrix</Term> holds its
          weights. One matrix product computes every neuron of the layer at once.
        </p>
        <div data-tour="matrix-view">
          <Disclosure summary="Show the matrix form" onOpen={() => signal('matrix-open')}>
            <MatrixView s={s} steps={steps} />
          </Disclosure>
        </div>
      </section>
    </>
  );
}

const netDefaults = (): NetSetting => {
  const d = L2_EXP01_DEFAULTS.network;
  return {
    x: [...d.x],
    hidden: { W: [...d.hidden.W], b: [...d.hidden.b] },
    output: { W: [...d.output.W], b: [...d.output.b] },
    act: 'sigmoid',
  };
};

export function L2Experiment01() {
  const [net, setNet] = useState<NetSetting>(netDefaults);
  const live = useMemo(() => {
    try {
      return networkQuestions(net);
    } catch {
      return [];
    }
  }, [net]);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_2} liveQuestions={live}>
      <PartA />
      <PartB />
      <PartsCD s={net} setS={setNet} />
    </ExperimentLayout>
  );
}
