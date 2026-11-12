/**
 * Experiment 02 — Perceptrons and Logic Gates.
 *
 * A perceptron is a linear output unit whose z the step rule turns into 0 or 1 (ADR-081). The weighted sums for the
 * truth-table rows come from an engine probe over the gate's inputs. These are the AND rows of experiment 1, through
 * the same `points` dataset and `initialParams` machinery. The decision regions come from the engine's evaluation
 * grid. No training happens here: the learner sets the weights and the bias.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EXP02_DEFAULTS, GATES, level1ById, type GateName } from '../../experiments/level1';
import type { ModelConfig } from '../../core/layers/model';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import {
  Disclosure,
  EngineBadge,
  ErrorNote,
  RecordList,
  Segmented,
  Term,
  ValueSlider,
} from '../components/ui';
import { probe, probeGrid, stepRule, type Grid, type ProbeResult } from '../engine/probe';
import { fmt } from '../format';
import { signal } from '../signals';
import { BoundaryLegend, DecisionBoundary } from '../viz/DecisionBoundary';

const EXP = level1ById('02')!;
const GATE_NAMES: GateName[] = ['AND', 'OR', 'NOT', 'XOR'];
const FRAME: [number, number, number, number] = [-0.5, 1.5, -0.5, 1.5];
const SOLUTIONS: Partial<Record<GateName, { w: number[]; b: number }>> = {
  AND: { w: [1, 1], b: -1.5 },
  OR: { w: [1, 1], b: -0.5 },
  NOT: { w: [-1], b: 0.5 },
};

export interface PerceptronSetting {
  gate: GateName;
  w: number[];
  b: number;
}

const model = (inputs: number): ModelConfig => ({
  inputShape: [inputs],
  layers: [{ type: 'dense', units: 1, activation: 'linear' }],
});

export interface Row {
  x: number[];
  z: number;
  output: 0 | 1;
  target: number;
}

/** The truth-table rows, read from an engine probe. */
export function perceptronRows(s: PerceptronSetting): { rows: Row[]; run: ProbeResult } {
  const g = GATES[s.gate];
  const run = probe({
    model: model(g.inputs),
    params: { 'L1.W': s.w, 'L1.b': [s.b] },
    xs: g.xs,
    ys: g.ys.map((y) => [y]),
  });
  const rows = run.examples.map((e, i) => {
    const z = e.layers.L1.z![0];
    return { x: e.x, z, output: stepRule(z), target: g.ys[i] };
  });
  return { rows, run };
}

export function perceptronQuestions(s: PerceptronSetting): LiveQuestion[] {
  const g = GATES[s.gate];
  const probeX = g.inputs === 1 ? [1] : [1, 0];
  const r = probe({ model: model(g.inputs), params: { 'L1.W': s.w, 'L1.b': [s.b] }, xs: [probeX] });
  const z = r.examples[0].layers.L1.z![0];
  const out = stepRule(z);
  const at = g.inputs === 1 ? 'x = 1' : 'x₁ = 1, x₂ = 0';
  return [
    {
      id: 'p-live',
      live: true,
      kind: 'predict',
      prompt: `With the weights and bias on screen (${s.w.map((w, i) => `w${g.inputs === 1 ? '' : '₁₂'[i]} = ${fmt(w)}`).join(', ')}, b = ${fmt(s.b)}), what does the perceptron output for ${at}?`,
      options: ['0', '1'].map((t) => ({
        text: t,
        correct: Number(t) === out,
        feedback: `For ${at} the engine computes z = ${fmt(z)}, which is ${z >= 0 ? 'at least 0, so the output is 1' : 'below 0, so the output is 0'}.`,
      })),
    },
  ];
}

function NumberLine({ s }: { s: PerceptronSetting }) {
  // z at 21 points along the input axis, from the engine; the threshold is located between two of them.
  const xs = Array.from({ length: 21 }, (_, i) => -0.5 + i * 0.1);
  const r = probe({ model: model(1), params: { 'L1.W': s.w, 'L1.b': [s.b] }, xs: xs.map((x) => [x]) });
  const zs = r.examples.map((e) => e.layers.L1.z![0]);
  const W = 420;
  const sx = (x: number): number => 30 + ((x + 0.5) / 2) * (W - 60);
  let cross: number | null = null;
  for (let i = 0; i + 1 < zs.length; i++)
    if (zs[i] >= 0 !== zs[i + 1] >= 0) cross = xs[i] + ((xs[i + 1] - xs[i]) * zs[i]) / (zs[i] - zs[i + 1]);
  const rows = perceptronRows(s).rows;
  const desc =
    `Output 1 where z ≥ 0: ${cross === null ? (zs[0] >= 0 ? 'everywhere on the line' : 'nowhere on the line') : `${zs[0] >= 0 ? 'left' : 'right'} of x = ${fmt(cross)}`}. ` +
    rows
      .map(
        (p) =>
          `Input ${p.x[0]}: target ${p.target}, output ${p.output}, ${p.output === p.target ? 'correct' : 'incorrect'}.`,
      )
      .join(' ');
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} 120`} role="img" aria-label={`NOT gate on a number line. ${desc}`}>
        {xs.slice(0, -1).map((x, i) => (
          <rect
            key={i}
            x={sx(x)}
            y={30}
            width={sx(xs[i + 1]) - sx(x) + 0.5}
            height={30}
            className={zs[i] >= 0 && zs[i + 1] >= 0 ? 'lv-region-pos' : 'lv-region-neg'}
          />
        ))}
        <line x1={30} x2={W - 30} y1={60} y2={60} stroke="var(--lv-text)" />
        {[-0.5, 0, 0.5, 1, 1.5].map((t) => (
          <text key={t} x={sx(t)} y={80} textAnchor="middle" className="lv-svg-muted">
            {fmt(t, 1)}
          </text>
        ))}
        {cross !== null && (
          <line x1={sx(cross)} x2={sx(cross)} y1={22} y2={68} className="lv-boundary-line" />
        )}
        {rows.map((p) => {
          const ok = p.output === p.target;
          const cx = sx(p.x[0]);
          return (
            <g key={p.x[0]}>
              <circle
                cx={cx}
                cy={45}
                r={14}
                fill="none"
                strokeWidth={3}
                className={ok ? 'lv-pt-ok' : 'lv-pt-bad'}
                strokeDasharray={ok ? undefined : '4 3'}
              />
              {p.target === 1 ? (
                <circle cx={cx} cy={45} r={7} fill="var(--lv-input)" stroke="var(--lv-text)" />
              ) : (
                <rect
                  x={cx - 6}
                  y={39}
                  width={12}
                  height={12}
                  fill="var(--lv-surface)"
                  stroke="var(--lv-text)"
                  strokeWidth={2}
                />
              )}
              <text x={cx} y={108} textAnchor="middle" className="lv-svg-mono">
                {ok ? '✓' : '✕'}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="lv-small lv-muted">
        With one input, the decision boundary is a single point on the line.
      </figcaption>
    </figure>
  );
}

function TruthTable({ rows, inputs }: { rows: Row[]; inputs: 1 | 2 }) {
  return (
    <div className="lv-table-wrap" data-tour="truth-table">
      <table className="lv-table">
        <caption>Truth table and the perceptron’s answers</caption>
        <thead>
          <tr>
            {inputs === 1 ? (
              <th scope="col">x</th>
            ) : (
              <>
                <th scope="col">x₁</th>
                <th scope="col">x₂</th>
              </>
            )}
            <th scope="col">z</th>
            <th scope="col">Output</th>
            <th scope="col">Target</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.x.map((x, k) => (
                <td key={k} className="num">
                  {x}
                </td>
              ))}
              <td className="num">{fmt(r.z)}</td>
              <td className="num">{r.output}</td>
              <td className="num">{r.target}</td>
              <td>
                {r.output === r.target ? (
                  <span className="lv-mark-ok">correct</span>
                ) : (
                  <span className="lv-mark-bad">wrong</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Experiment02() {
  const [gate, setGate] = useState<GateName>(EXP02_DEFAULTS.gate);
  const [two, setTwo] = useState({ w: [...EXP02_DEFAULTS.w], b: EXP02_DEFAULTS.b });
  const [one, setOne] = useState({ w: [0.5], b: 0 });
  const inputs = GATES[gate].inputs;
  const cur = inputs === 1 ? one : two;
  const setCur = inputs === 1 ? setOne : setTwo;
  const s: PerceptronSetting = { gate, w: cur.w, b: cur.b };

  const result = useMemo(() => {
    try {
      const { rows, run } = perceptronRows(s);
      const grid: Grid | null =
        inputs === 2 ? probeGrid(model(2), { 'L1.W': s.w, 'L1.b': [s.b] }, FRAME, 40) : null;
      return { rows, run, grid, error: null };
    } catch (e) {
      return { rows: [] as Row[], run: null, grid: null, error: e instanceof Error ? e.message : String(e) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, cur.w.join(','), cur.b]);
  const live = useMemo(() => perceptronQuestions(s), [gate, cur.w.join(','), cur.b]); // eslint-disable-line react-hooks/exhaustive-deps

  const correct = result.rows.filter((r) => r.output === r.target).length;
  const all = result.rows.length > 0 && correct === result.rows.length;

  // XOR attempts: distinct settings tried, and the best score among them.
  const tried = useRef(new Set<string>());
  const [xor, setXor] = useState({ attempts: 0, best: 0 });
  useEffect(() => {
    if (gate !== 'XOR' || !result.rows.length) return;
    const key = `${cur.w.join(',')}|${cur.b}`;
    if (tried.current.has(key)) return;
    tried.current.add(key);
    setXor((x) => ({ attempts: x.attempts + 1, best: Math.max(x.best, correct) }));
    if (tried.current.size === 5) signal('xor-attempts');
  }, [gate, cur.w, cur.b, correct, result.rows.length]);

  useEffect(() => {
    if (all) signal(`all-correct:${gate}`);
  }, [all, gate]);

  const setW = (i: number, v: number): void => {
    setCur((p) => ({ ...p, w: p.w.map((q, k) => (k === i ? v : q)) }));
    signal('weight-changed');
  };
  const setB = (v: number): void => {
    setCur((p) => ({ ...p, b: v }));
    signal('bias-changed');
  };
  const reset = (): void => {
    setTwo({ w: [...EXP02_DEFAULTS.w], b: EXP02_DEFAULTS.b });
    setOne({ w: [0.5], b: 0 });
  };
  const solution = SOLUTIONS[gate];

  return (
    <ExperimentLayout exp={EXP} liveQuestions={live}>
      <div className="lv-viz-title">
        <h3>Your perceptron</h3>
        <div className="lv-row">
          {result.run && <EngineBadge instructions={result.run.length} />}
          <button type="button" className="lv-btn lv-btn-small" onClick={reset} data-control="reset">
            Reset to starting values
          </button>
        </div>
      </div>
      <p className="lv-muted">
        The perceptron computes z exactly as the neuron in Experiment 01 did. Then it applies a{' '}
        <Term meaning="The point where the answer changes. Here the perceptron outputs 1 when z ≥ 0, and 0 otherwise.">
          threshold
        </Term>
        : 1 if z is at least 0, otherwise 0. The inputs where z is exactly 0 form the{' '}
        <Term meaning="The line (or, with one input, the point) that separates the inputs answered 1 from those answered 0.">
          decision boundary
        </Term>
        .
      </p>
      <div style={{ margin: 'var(--lv-s4) 0' }}>
        <Segmented
          legend="Target gate"
          options={GATE_NAMES.map((g) => ({ value: g, label: g }))}
          value={gate}
          onChange={(g) => {
            setGate(g);
            signal(`gate:${g}`);
          }}
          tour="gate-picker"
          control="gate"
        />
        <p className="lv-small lv-muted" style={{ marginTop: 6 }}>
          {gate} {GATES[gate].description}.
        </p>
      </div>
      {result.error && <ErrorNote title="The engine could not run this setting.">{result.error}</ErrorNote>}
      {!result.error && (
        <div className="lv-grid-main">
          <div className="lv-viz" data-tour="boundary">
            {result.grid ? (
              <DecisionBoundary
                grid={result.grid}
                level={0}
                points={result.rows.map((r) => ({ x: r.x, target: r.target, predicted: r.output }))}
                title={`${gate}: inputs in the shaded region give output 1.`}
              />
            ) : (
              <NumberLine s={s} />
            )}
            <BoundaryLegend />
          </div>
          <div className="lv-stack">
            <section className="lv-panel" aria-label="Perceptron controls" data-tour="perceptron-controls">
              <h3>Weights and bias</h3>
              {cur.w.map((w, i) => (
                <ValueSlider
                  key={`${gate}-${i}`}
                  label={inputs === 1 ? 'Weight w' : `Weight w${'₁₂'[i]}`}
                  role="weight"
                  value={w}
                  min={-2}
                  max={2}
                  step={0.1}
                  onChange={(v) => setW(i, v)}
                  control={`w${i + 1}`}
                />
              ))}
              <ValueSlider
                label="Bias b"
                role="bias"
                value={cur.b}
                min={-2}
                max={2}
                step={0.1}
                onChange={setB}
                control="b"
              />
              {solution && (
                <button
                  type="button"
                  className="lv-btn lv-btn-small lv-btn-quiet"
                  onClick={() => {
                    setCur({ w: [...solution.w], b: solution.b });
                    signal('weight-changed');
                  }}
                  data-control="solution"
                >
                  Show me one setting that works
                </button>
              )}
            </section>
            <section className="lv-panel" aria-label="Score" aria-live="polite">
              <p className="lv-bigvalue" style={{ marginBottom: 4 }}>
                {correct} of {result.rows.length}
              </p>
              <p className="lv-muted" style={{ marginBottom: 0 }}>
                {all ? `rows correct: this perceptron is an ${gate} gate.` : 'rows correct'}
              </p>
            </section>
          </div>
        </div>
      )}
      <div style={{ marginTop: 'var(--lv-s5)' }}>
        <TruthTable rows={result.rows} inputs={inputs} />
      </div>
      {gate === 'XOR' && (
        <div className="lv-callout" style={{ marginTop: 'var(--lv-s5)' }} aria-live="polite">
          <h3>XOR: a pattern one line cannot split</h3>
          <p>
            Settings tried: <strong className="lv-mono">{xor.attempts}</strong> · best so far:{' '}
            <strong className="lv-mono">{xor.best} of 4</strong> rows correct.
          </p>
          <p>
            {xor.attempts < 5
              ? 'Keep trying different weights and biases.'
              : 'Every straight line leaves at least one XOR row on the wrong side. (0,1) and (1,0) must be on one side, with (0,0) and (1,1) on the other, and no single straight line does that. The best any setting can manage is 3 of 4.'}
          </p>
          <p className="lv-small lv-muted" style={{ marginBottom: 0 }}>
            Experiment 03 shows what a network needs to solve it.
          </p>
        </div>
      )}
      {result.run && (
        <div style={{ marginTop: 'var(--lv-s5)' }}>
          <Disclosure summary="See the engine’s record of these rows">
            <p className="lv-small lv-muted">
              The engine ran the perceptron on every row of the truth table. Each row’s z above is the result
              of its
              <code> ADD_BIAS</code> step. The step rule then gives 0 or 1, because the engine itself has no
              step activation.
            </p>
            <RecordList instructions={result.run.examples.flatMap((e) => e.instructions)} max={24} />
          </Disclosure>
        </div>
      )}
    </ExperimentLayout>
  );
}
