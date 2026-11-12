/**
 * Experiment 01 — Inside a Neuron.
 *
 * One neuron with two inputs. Every value comes from an engine probe (ADR-082). The probe runs three examples:
 * the learner's inputs (x₁, x₂), and (x₁, 0) and (0, x₂), whose weighted sums are each input's contribution, so even
 * the breakdown's per-input products are engine results.
 */
import { useMemo, useState } from 'react';
import { EXP01_DEFAULTS, level1ById } from '../../experiments/level1';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { MathNote } from '../components/MathNote';
import {
  Disclosure,
  EngineBadge,
  ErrorNote,
  RecordList,
  Segmented,
  Term,
  ValueSlider,
} from '../components/ui';
import { probe, stepRule, tryProbe, type ProbeResult } from '../engine/probe';
import { fmt } from '../format';
import { signal } from '../signals';
import { ACTIVATION_NAMES, ActivationGraph, type NeuronActivation } from '../viz/ActivationGraph';
import { NeuronDiagram } from '../viz/NeuronDiagram';

const EXP = level1ById('01')!;
const ACTS: NeuronActivation[] = ['step', 'sigmoid', 'relu', 'tanh'];

interface Settings {
  x: number[];
  w: number[];
  b: number;
  activation: NeuronActivation;
}

const defaults = (): Settings => ({
  x: [...EXP01_DEFAULTS.x],
  w: [...EXP01_DEFAULTS.w],
  b: EXP01_DEFAULTS.b,
  activation: EXP01_DEFAULTS.activation as NeuronActivation,
});

/** The engine run behind the screen for a given setting. */
export function neuronProbe(s: Settings): ProbeResult {
  return probe({
    model: {
      inputShape: [2],
      layers: [{ type: 'dense', units: 1, activation: s.activation === 'step' ? 'linear' : s.activation }],
    },
    params: { 'L1.W': s.w, 'L1.b': [s.b] },
    xs: [s.x, [s.x[0], 0], [0, s.x[1]]],
  });
}

/** What the screen shows, read from the probe. Step applies the step rule to the engine's z (ADR-081). */
export function neuronValues(s: Settings, r: ProbeResult) {
  const main = r.examples[0].layers.L1;
  const z = main.z![0];
  return {
    x: s.x,
    w: s.w,
    b: s.b,
    contributions: [r.examples[1].layers.L1.u![0], r.examples[2].layers.L1.u![0]],
    u: main.u![0],
    z,
    a: s.activation === 'step' ? stepRule(z) : main.a![0],
    activation: ACTIVATION_NAMES[s.activation],
  };
}

/** The live "predict" questions, built from engine results at the current settings. */
export function neuronQuestions(s: Settings): LiveQuestion[] {
  const r = neuronProbe(s);
  const z = r.examples[0].layers.L1.z![0];
  const relu = neuronProbe({ ...s, activation: 'relu' }).examples[0].layers.L1.a![0];
  const cand = [fmt(relu), fmt(z), fmt(-z), '0', '1'];
  const opts = [...new Set(cand)].slice(0, 3);
  const step = stepRule(z);
  return [
    {
      id: 'n-live-relu',
      live: true,
      kind: 'predict',
      prompt: `With the settings on screen, the weighted sum is z = ${fmt(z)}. What would the neuron output if you chose ReLU?`,
      options: opts.map((t) => ({
        text: t,
        correct: t === fmt(relu),
        feedback:
          t === fmt(relu)
            ? `Right. ReLU keeps z when it is positive and gives 0 otherwise. Here z = ${fmt(z)}, so the engine’s ReLU gives ${fmt(relu)}.`
            : `Not this one. ReLU keeps z when it is positive and gives 0 otherwise. With z = ${fmt(z)}, the engine’s ReLU gives ${fmt(relu)}.`,
      })),
    },
    {
      id: 'n-live-step',
      live: true,
      kind: 'predict',
      prompt: `Keep these settings (z = ${fmt(z)}) and choose Step. What does the neuron output?`,
      options: ['0', '1'].map((t) => ({
        text: t,
        correct: Number(t) === step,
        feedback: `Step outputs 1 when z is at least 0. Here z = ${fmt(z)} is ${z >= 0 ? 'at least 0, so the output is 1' : 'below 0, so the output is 0'}.`,
      })),
    },
  ];
}

function PrimerDemo() {
  const [x, setX] = useState(2);
  const [w, setW] = useState(0.5);
  const r = tryProbe({
    model: { inputShape: [1], layers: [{ type: 'dense', units: 1, activation: 'linear' }] },
    params: { 'L1.W': [w], 'L1.b': [0] },
    xs: [[x]],
  });
  const u = r.result?.examples[0].layers.L1.u?.[0];
  return (
    <div className="lv-panel" style={{ marginTop: 'var(--lv-s3)' }}>
      <div className="lv-viz-title">
        <h3>Try it: one input, one weight</h3>
        <EngineBadge />
      </div>
      <div className="lv-grid-2">
        <div>
          <ValueSlider
            label="Input x"
            role="input"
            value={x}
            min={-3}
            max={3}
            step={0.5}
            onChange={setX}
            control="primer:x"
          />
          <ValueSlider
            label="Weight w"
            role="weight"
            value={w}
            min={-2}
            max={2}
            step={0.25}
            onChange={setW}
            control="primer:w"
          />
        </div>
        <div aria-live="polite">
          <p className="lv-muted lv-small">The neuron multiplies the input by its weight:</p>
          <p className="lv-bigvalue">
            {fmt(x)} × {fmt(w)} = {fmt(u)}
          </p>
          <p className="lv-small lv-muted">
            A larger weight makes the input count for more. A negative weight makes it count against.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Experiment01() {
  const [s, setS] = useState<Settings>(defaults);
  const r = useMemo(() => {
    try {
      return { result: neuronProbe(s), error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [s]);
  const v = r.result ? neuronValues(s, r.result) : null;
  const live = useMemo(() => (r.result ? neuronQuestions(s) : []), [s, r.result]);

  const setInput = (i: number, val: number): void => {
    setS((p) => ({ ...p, x: p.x.map((q, k) => (k === i ? val : q)) }));
    signal('input-changed');
  };
  const setWeight = (i: number, val: number): void => {
    const before = s.w[i];
    setS((p) => ({ ...p, w: p.w.map((q, k) => (k === i ? val : q)) }));
    if (val === 0) signal('weight-zero');
    if (before > 0 && val < 0) signal('weight-flipped');
    signal('weight-changed');
  };
  const setBias = (val: number): void => {
    const next = { ...s, b: val };
    setS(next);
    signal('bias-changed');
    // Probes are synchronous and cached, so the new output can be compared with the current one directly.
    if (s.activation === 'step' && v) {
      try {
        if (neuronValues(next, neuronProbe(next)).a !== v.a) signal('step-flipped');
      } catch {
        // An invalid setting is reported by the main render.
      }
    }
  };
  const setAct = (a: NeuronActivation): void => {
    const was = s.activation;
    setS((p) => ({ ...p, activation: a }));
    signal(`activation:${a}`);
    if (v && v.z < 0 && ((was === 'sigmoid' && a === 'relu') || (was === 'relu' && a === 'sigmoid')))
      signal('activation:compare');
  };

  return (
    <ExperimentLayout exp={EXP} primerDemo={<PrimerDemo />} liveQuestions={live}>
      <div className="lv-viz-title">
        <h3>Your neuron</h3>
        <div className="lv-row">
          {r.result && <EngineBadge instructions={r.result.length} />}
          <button
            type="button"
            className="lv-btn lv-btn-small"
            onClick={() => setS(defaults())}
            data-control="reset"
          >
            Reset to starting values
          </button>
        </div>
      </div>
      <p className="lv-muted">
        Stage 1 <strong>combines</strong>: each input is multiplied by its weight, the results are added up,
        and the bias is added. That number is the{' '}
        <Term meaning="z = w₁x₁ + w₂x₂ + b: each input times its weight, added up, plus the bias.">
          weighted sum z
        </Term>
        . Stage 2 <strong>activates</strong>: the activation function turns z into the neuron’s{' '}
        <Term meaning="The single number the neuron gives out: a = f(z).">output a</Term>.
      </p>
      {r.error && <ErrorNote title="The engine could not run this setting.">{r.error}</ErrorNote>}
      {v && (
        <div className="lv-grid-main">
          <div className="lv-stack">
            <div className="lv-viz" data-tour="neuron-diagram">
              <NeuronDiagram v={v} />
            </div>
            <div className="lv-viz">
              <ActivationGraph act={s.activation} z={v.z} a={v.a} />
            </div>
          </div>
          <div className="lv-stack">
            <section className="lv-panel" aria-label="Neuron controls">
              <h3>Inputs</h3>
              <ValueSlider
                label="Input x₁"
                role="input"
                value={s.x[0]}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => setInput(0, q)}
                tour="control-x1"
                control="x1"
              />
              <ValueSlider
                label="Input x₂"
                role="input"
                value={s.x[1]}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => setInput(1, q)}
                control="x2"
              />
              <h3 style={{ marginTop: 'var(--lv-s4)' }}>Weights and bias</h3>
              <ValueSlider
                label="Weight w₁"
                role="weight"
                value={s.w[0]}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => setWeight(0, q)}
                tour="control-w1"
                control="w1"
              />
              <ValueSlider
                label="Weight w₂"
                role="weight"
                value={s.w[1]}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => setWeight(1, q)}
                control="w2"
              />
              <ValueSlider
                label="Bias b"
                role="bias"
                value={s.b}
                min={-2}
                max={2}
                step={0.1}
                onChange={setBias}
                tour="control-b"
                control="b"
              />
              <div style={{ marginTop: 'var(--lv-s4)' }}>
                <Segmented
                  legend="Activation function"
                  options={ACTS.map((a) => ({ value: a, label: ACTIVATION_NAMES[a] }))}
                  value={s.activation}
                  onChange={setAct}
                  tour="activation-picker"
                  control="activation"
                />
                <p className="lv-small lv-muted" style={{ marginTop: 6 }}>
                  Step and Sigmoid are the classic pair. ReLU and Tanh are common in modern networks.
                </p>
              </div>
            </section>
            <section className="lv-panel" aria-label="Result" aria-live="polite">
              <dl className="lv-kv">
                <dt>Weighted sum z</dt>
                <dd>{fmt(v.z, 3)}</dd>
                <dt>Output a</dt>
                <dd>{fmt(v.a, 3)}</dd>
              </dl>
            </section>
          </div>
        </div>
      )}
      {v && r.result && (
        <div style={{ marginTop: 'var(--lv-s5)' }}>
          <Disclosure summary="Show the calculation" tour="breakdown" onOpen={() => signal('breakdown-open')}>
            <div className="lv-table-wrap">
              <table className="lv-table">
                <caption>Step by step, as the engine computed it</caption>
                <thead>
                  <tr>
                    <th scope="col">Step</th>
                    <th scope="col">Calculation</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Input 1 × weight 1</td>
                    <td className="num">
                      {fmt(s.x[0])} × {fmt(s.w[0])}
                    </td>
                    <td className="num">{fmt(v.contributions[0], 3)}</td>
                  </tr>
                  <tr>
                    <td>Input 2 × weight 2</td>
                    <td className="num">
                      {fmt(s.x[1])} × {fmt(s.w[1])}
                    </td>
                    <td className="num">{fmt(v.contributions[1], 3)}</td>
                  </tr>
                  <tr>
                    <td>Add them up</td>
                    <td className="num">Σ wᵢxᵢ</td>
                    <td className="num">{fmt(v.u, 3)}</td>
                  </tr>
                  <tr>
                    <td>Add the bias</td>
                    <td className="num">
                      {fmt(v.u, 3)} + {fmt(s.b)}
                    </td>
                    <td className="num">z = {fmt(v.z, 3)}</td>
                  </tr>
                  <tr>
                    <td>Activate</td>
                    <td className="num">
                      {v.activation}({fmt(v.z, 3)})
                    </td>
                    <td className="num">a = {fmt(v.a, 3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {s.activation === 'step' && (
              <p className="lv-small lv-muted">
                The engine has no Step activation, because Step cannot be trained with the methods real
                networks use. The engine computes z, and the step rule (1 when z ≥ 0, else 0) is applied to
                that value.
              </p>
            )}
            <MathNote
              tex={'z = \\sum_i w_i x_i + b \\qquad a = f(z)'}
              label="z equals the sum over i of w i times x i, plus b; a equals f of z"
            />
            <div style={{ marginTop: 'var(--lv-s3)' }}>
              <Disclosure summary="See the engine’s record of this calculation">
                <p className="lv-small lv-muted">
                  These are the steps the engine recorded while computing your neuron’s output. The whole
                  record ({r.result.length} steps) also covers the two single-input runs used for the
                  per-input rows above, and the engine’s own bookkeeping.
                </p>
                <RecordList instructions={r.result.examples[0].instructions} />
              </Disclosure>
            </div>
          </Disclosure>
        </div>
      )}
    </ExperimentLayout>
  );
}
