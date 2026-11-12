/**
 * Experiment 03 — Linear vs Nonlinear Transformations.
 *
 * Every coordinate drawn is an engine output (ADR-082):
 *  - Part 1: one dense layer with linear activation moves the points and the grid lines;
 *  - Part 2: two such layers in a row; the single layer that does the same is read off the network's outputs for
 *    (0,0), (1,0) and (0,1), then run by the engine on the same points;
 *  - Part 3: a linear classifier on XOR (the perceptron of Experiment 02);
 *  - Part 4: a 2-2-1 network with fixed weights whose hidden activation is switched between linear and ReLU.
 */
import { useMemo, useState } from 'react';
import { EXP03_XOR_NET, GATES, level1ById } from '../../experiments/level1';
import type { Activation, ModelConfig } from '../../core/layers/model';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { MathNote } from '../components/MathNote';
import { Disclosure, EngineBadge, ErrorNote, Segmented, Term, ValueSlider } from '../components/ui';
import { probe, probeGrid, stepRule } from '../engine/probe';
import { fmt } from '../format';
import { signal } from '../signals';
import { BoundaryLegend, DecisionBoundary } from '../viz/DecisionBoundary';
import { TransformPlot, type PlotPoint } from '../viz/TransformPlot';
import { perceptronRows } from './Experiment02';

const EXP = level1ById('03')!;

/** Eight points in two groups, and a square grid of lines sampled at five points each. */
const POINTS: PlotPoint[] = [
  { x: -1.4, y: -0.8, cls: 0 },
  { x: -0.9, y: -1.3, cls: 0 },
  { x: -1.6, y: -1.5, cls: 0 },
  { x: -0.6, y: -0.6, cls: 0 },
  { x: 0.7, y: 0.9, cls: 1 },
  { x: 1.3, y: 0.5, cls: 1 },
  { x: 0.9, y: 1.5, cls: 1 },
  { x: 1.6, y: 1.2, cls: 1 },
];
const TICKS = [-2, -1, 0, 1, 2];
const LINES: [number, number][][] = [
  ...TICKS.map((c) => TICKS.map((t) => [c, t] as [number, number])),
  ...TICKS.map((c) => TICKS.map((t) => [t, c] as [number, number])),
];

/**
 * Presets in the engine's weight layout: W[i][j] connects input i to output j, row-major, so
 * x′ = x₁·W[0] + x₂·W[2] + b[0] and y′ = x₁·W[1] + x₂·W[3] + b[1].
 */
const PRESETS: Record<string, { label: string; W: number[]; b: number[] }> = {
  identity: { label: 'Leave as is', W: [1, 0, 0, 1], b: [0, 0] },
  stretch: { label: 'Stretch', W: [1.6, 0, 0, 0.6], b: [0, 0] },
  rotate: { label: 'Turn', W: [0.866, 0.5, -0.5, 0.866], b: [0, 0] },
  shear: { label: 'Shear', W: [1, 0, 0.8, 1], b: [0, 0] },
  flip: { label: 'Mirror', W: [-1, 0, 0, 1], b: [0, 0] },
  shift: { label: 'Shift', W: [1, 0, 0, 1], b: [0.8, -0.6] },
};
type PresetId = keyof typeof PRESETS;

const linear2 = (layers = 1): ModelConfig => ({
  inputShape: [2],
  layers: Array.from({ length: layers }, () => ({
    type: 'dense' as const,
    units: 2,
    activation: 'linear' as const,
  })),
});

/** Points and grid lines after `layers` linear layers, from one engine probe. */
function transformed(params: Record<string, number[]>, layers: 1 | 2) {
  const xs = [...POINTS.map((p) => [p.x, p.y]), ...LINES.flat()];
  const r = probe({ model: linear2(layers), params, xs });
  const at = (layer: string) => {
    const out = r.examples.map((e) => e.layers[layer].a!);
    const pts = POINTS.map((p, i) => ({ ...p, x: out[i][0], y: out[i][1] }));
    const lines = LINES.map((l, k) =>
      l.map((_, j) => {
        const v = out[POINTS.length + k * TICKS.length + j];
        return { x: v[0], y: v[1] };
      }),
    );
    return { pts, lines };
  };
  return { r, at };
}

const ORIGINAL = { pts: POINTS, lines: LINES.map((l) => l.map(([x, y]) => ({ x, y }))) };

function PresetPicker({
  legend,
  value,
  onChange,
  tour,
  control,
}: {
  legend: string;
  value: PresetId;
  onChange: (p: PresetId) => void;
  tour?: string;
  control: string;
}) {
  return (
    <Segmented
      legend={legend}
      options={(Object.keys(PRESETS) as PresetId[]).map((k) => ({ value: k, label: PRESETS[k].label }))}
      value={value}
      onChange={onChange}
      tour={tour}
      control={control}
    />
  );
}

function Part1() {
  const [preset, setPreset] = useState<PresetId>('shear');
  const [W, setW] = useState(PRESETS.shear.W);
  const [b, setB] = useState(PRESETS.shear.b);
  const result = useMemo(() => {
    try {
      return { t: transformed({ 'L1.W': W, 'L1.b': b }, 1), error: null };
    } catch (e) {
      return { t: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [W, b]);
  const choose = (p: PresetId): void => {
    setPreset(p);
    setW(PRESETS[p].W);
    setB(PRESETS[p].b);
    signal('transform-preset');
  };
  const LABELS = ['x′ from x₁', 'y′ from x₁', 'x′ from x₂', 'y′ from x₂'];
  return (
    <section className="lv-part" aria-labelledby="lv-p1">
      <p className="lv-part-kicker">Part 1</p>
      <h3 id="lv-p1">What one linear layer does</h3>
      <p className="lv-muted">
        A layer of two neurons, with no activation, takes each point (x₁, x₂) to a new point (x′, y′). Each
        new coordinate is a weighted sum plus a bias, exactly like the neuron in Experiment 01. This is a{' '}
        <Term meaning="Multiply by weights and add a bias. Strictly this is an affine transformation; ‘linear’ is the everyday name.">
          linear transformation
        </Term>
        .
      </p>
      <PresetPicker
        legend="Choose a transformation"
        value={preset}
        onChange={choose}
        tour="transform-presets"
        control="preset"
      />
      {result.error && <ErrorNote title="The engine could not run this setting.">{result.error}</ErrorNote>}
      {result.t && (
        <div className="lv-grid-2" style={{ marginTop: 'var(--lv-s4)' }}>
          <div className="lv-viz">
            <TransformPlot points={ORIGINAL.pts} lines={ORIGINAL.lines} title="Before: the original points" />
          </div>
          <div className="lv-viz">
            <div className="lv-viz-title">
              <span />
              <EngineBadge instructions={result.t.r.length} />
            </div>
            <TransformPlot
              {...(() => {
                const a = result.t!.at('L1');
                return { points: a.pts, lines: a.lines };
              })()}
              title="After the layer"
              axes={['x′', 'y′']}
            />
          </div>
        </div>
      )}
      <p className="lv-small lv-muted">
        Notice that the grid lines are still straight, and lines that were parallel are still parallel.
      </p>
      <Disclosure summary="Set the weights and bias yourself">
        <div className="lv-grid-2">
          <div>
            {W.map((w, i) => (
              <ValueSlider
                key={i}
                label={`Weight: ${LABELS[i]}`}
                role="weight"
                value={w}
                min={-2}
                max={2}
                step={0.1}
                onChange={(v) => {
                  setW(W.map((q, k) => (k === i ? v : q)));
                  signal('transform-custom');
                }}
                control={`p1:w${i}`}
              />
            ))}
          </div>
          <div>
            {b.map((v, i) => (
              <ValueSlider
                key={i}
                label={`Bias: shift ${i === 0 ? 'x′' : 'y′'}`}
                role="bias"
                value={v}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => {
                  setB(b.map((p, k) => (k === i ? q : p)));
                  signal('transform-custom');
                }}
                control={`p1:b${i}`}
              />
            ))}
          </div>
        </div>
      </Disclosure>
    </section>
  );
}

function Part2() {
  const [p1, setP1] = useState<PresetId>('rotate');
  const [p2, setP2] = useState<PresetId>('stretch');
  const [combined, setCombined] = useState(false);
  const params = {
    'L1.W': PRESETS[p1].W,
    'L1.b': PRESETS[p1].b,
    'L2.W': PRESETS[p2].W,
    'L2.b': PRESETS[p2].b,
  };
  const result = useMemo(() => {
    try {
      const t = transformed(params, 2);
      // The single equivalent layer, read off the two-layer network's outputs for (0,0), (1,0) and (0,1).
      const basis = probe({
        model: linear2(2),
        params,
        xs: [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
      }).examples.map((e) => e.layers.L2.a!);
      const [o, e1, e2] = basis;
      const single = {
        'L1.W': [e1[0] - o[0], e1[1] - o[1], e2[0] - o[0], e2[1] - o[1]],
        'L1.b': [o[0], o[1]],
      };
      const one = transformed(single, 1);
      const a = t.at('L2');
      const s = one.at('L1');
      let maxDiff = 0;
      a.pts.forEach(
        (p, i) => (maxDiff = Math.max(maxDiff, Math.abs(p.x - s.pts[i].x), Math.abs(p.y - s.pts[i].y))),
      );
      return { t, one, single, maxDiff, error: null };
    } catch (e) {
      return {
        t: null,
        one: null,
        single: null,
        maxDiff: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p1, p2]);
  return (
    <section className="lv-part" aria-labelledby="lv-p2" data-tour="two-layers">
      <p className="lv-part-kicker">Part 2</p>
      <h3 id="lv-p2">Two linear layers in a row</h3>
      <p className="lv-muted">
        Layer 2 transforms whatever layer 1 produced. Does the second layer add anything new?
      </p>
      <div className="lv-grid-2">
        <PresetPicker
          legend="Layer 1"
          value={p1}
          onChange={(p) => {
            setP1(p);
            setCombined(false);
          }}
          control="layer1"
        />
        <PresetPicker
          legend="Layer 2"
          value={p2}
          onChange={(p) => {
            setP2(p);
            setCombined(false);
          }}
          control="layer2"
        />
      </div>
      {result.error && <ErrorNote title="The engine could not run this setting.">{result.error}</ErrorNote>}
      {result.t && (
        <div
          className="lv-grid-2"
          style={{ marginTop: 'var(--lv-s4)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          <div className="lv-viz">
            <TransformPlot points={ORIGINAL.pts} lines={ORIGINAL.lines} title="Original" size={240} />
          </div>
          <div className="lv-viz">
            <TransformPlot
              points={result.t.at('L1').pts}
              lines={result.t.at('L1').lines}
              title="After layer 1"
              size={240}
            />
          </div>
          <div className="lv-viz">
            <TransformPlot
              points={result.t.at('L2').pts}
              lines={result.t.at('L2').lines}
              title="After layer 2"
              size={240}
            />
          </div>
          {combined && result.one && (
            <div className="lv-viz">
              <TransformPlot
                points={result.one.at('L1').pts}
                lines={result.one.at('L1').lines}
                title="One single layer instead"
                size={240}
              />
            </div>
          )}
        </div>
      )}
      <div className="lv-row" style={{ marginTop: 'var(--lv-s3)' }}>
        <button
          type="button"
          className="lv-btn"
          onClick={() => {
            setCombined(true);
            signal('layers-combined');
          }}
          data-control="combine"
        >
          Find the single layer that does the same
        </button>
      </div>
      {combined && result.single && (
        <div className="lv-callout" style={{ marginTop: 'var(--lv-s3)' }} aria-live="polite">
          <p>
            <strong>One layer is enough.</strong> A single linear layer, with weights{' '}
            <span className="lv-mono">[{result.single['L1.W'].map((v) => fmt(v)).join(', ')}]</span> and bias{' '}
            <span className="lv-mono">[{result.single['L1.b'].map((v) => fmt(v)).join(', ')}]</span>, produces
            the same picture. The engine ran both. The largest difference between them is{' '}
            <span className="lv-mono">{fmt(result.maxDiff, 2)}</span>, which is rounding in the last digits.
          </p>
          <p className="lv-small lv-muted">
            How the single layer was found: the two-layer network was run on (0,0), (1,0) and (0,1). Its
            output for (0,0) is the bias, and the change from (0,0) to each of the other two inputs gives the
            weights.
          </p>
        </div>
      )}
      <MathNote
        summary="Why: the formula"
        tex={'f(x) = W_2(W_1x + b_1) + b_2 = (W_2W_1)\\,x + (W_2b_1 + b_2)'}
        label="f of x equals W 2 times W 1 x plus b 1, plus b 2, which equals W 2 W 1 times x, plus W 2 b 1 plus b 2"
      >
        <p className="lv-small lv-muted">
          The right-hand side has the same form as one layer: some weights times x, plus a bias.
        </p>
      </MathNote>
    </section>
  );
}

function Part3() {
  const [w, setW] = useState([1, 1]);
  const [b, setB] = useState(-0.5);
  const [best, setBest] = useState(0);
  const result = useMemo(() => {
    try {
      const { rows, run } = perceptronRows({ gate: 'XOR', w, b });
      const grid = probeGrid(
        { inputShape: [2], layers: [{ type: 'dense', units: 1, activation: 'linear' }] },
        { 'L1.W': w, 'L1.b': [b] },
        [-0.5, 1.5, -0.5, 1.5],
        40,
      );
      return { rows, run, grid, error: null };
    } catch (e) {
      return { rows: [], run: null, grid: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [w, b]);
  const correct = result.rows.filter((r) => r.output === r.target).length;
  if (correct > best) setBest(correct);
  return (
    <section className="lv-part" aria-labelledby="lv-p3" data-tour="xor-linear">
      <p className="lv-part-kicker">Part 3</p>
      <h3 id="lv-p3">XOR, with one straight line</h3>
      <p className="lv-muted">
        This is XOR from Experiment 02. A linear classifier draws one straight line, so its two groups must be{' '}
        <Term meaning="Two groups that one straight line can split.">linearly separable</Term>. Try once more.
      </p>
      {result.error && <ErrorNote title="The engine could not run this setting.">{result.error}</ErrorNote>}
      {result.grid && (
        <div className="lv-grid-main">
          <div className="lv-viz">
            <DecisionBoundary
              grid={result.grid}
              level={0}
              points={result.rows.map((r) => ({ x: r.x, target: r.target, predicted: r.output }))}
              title="XOR with a linear classifier"
            />
            <BoundaryLegend />
          </div>
          <div className="lv-panel">
            {w.map((v, i) => (
              <ValueSlider
                key={i}
                label={`Weight w${'₁₂'[i]}`}
                role="weight"
                value={v}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => {
                  setW(w.map((p, k) => (k === i ? q : p)));
                  signal('xor-linear-changed');
                }}
                control={`p3:w${i}`}
              />
            ))}
            <ValueSlider
              label="Bias b"
              role="bias"
              value={b}
              min={-2}
              max={2}
              step={0.1}
              onChange={(q) => {
                setB(q);
                signal('xor-linear-changed');
              }}
              control="p3:b"
            />
            <p aria-live="polite" style={{ marginTop: 'var(--lv-s3)' }}>
              <strong className="lv-mono">{correct} of 4</strong> correct now · best{' '}
              <strong className="lv-mono">{best} of 4</strong>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export interface XorNetSetting {
  activation: 'linear' | 'relu';
  hiddenBias: number[];
}

const xorNet = (act: Activation): ModelConfig => ({
  inputShape: [2],
  layers: [
    { type: 'dense', units: 2, activation: act },
    { type: 'dense', units: 1, activation: 'linear' },
  ],
});

/** The XOR network's outputs and decision regions, from the engine. */
export function xorNetRun(s: XorNetSetting) {
  const params = {
    'L1.W': EXP03_XOR_NET.hidden.W,
    'L1.b': s.hiddenBias,
    'L2.W': EXP03_XOR_NET.output.W,
    'L2.b': EXP03_XOR_NET.output.b,
  };
  const g = GATES.XOR;
  const r = probe({ model: xorNet(s.activation), params, xs: g.xs, ys: g.ys.map((y) => [y]) });
  const rows = r.examples.map((e, i) => {
    const z = e.layers.L2.z![0];
    return { x: e.x, hidden: e.layers.L1.a!, z, output: stepRule(z), target: g.ys[i] };
  });
  const grid = probeGrid(xorNet(s.activation), params, [-0.5, 1.5, -0.5, 1.5], 48);
  const hiddenGrid = probeGrid(
    { inputShape: [2], layers: [{ type: 'dense', units: 1, activation: 'linear' }] },
    { 'L1.W': EXP03_XOR_NET.output.W, 'L1.b': EXP03_XOR_NET.output.b },
    [-0.6, 2.4, -0.6, 2.4],
    40,
  );
  return { r, rows, grid, hiddenGrid };
}

export function xorQuestions(s: XorNetSetting): LiveQuestion[] {
  const { rows } = xorNetRun(s);
  const n = rows.filter((r) => r.output === r.target).length;
  const opts = [...new Set([2, 3, 4, n])].sort();
  return [
    {
      id: 'l-live',
      live: true,
      kind: 'predict',
      prompt: `With the hidden activation set to ${s.activation === 'relu' ? 'ReLU' : 'none (linear)'} and the hidden biases on screen, how many of the four XOR examples does the network get right?`,
      options: opts.map((k) => ({
        text: String(k),
        correct: k === n,
        feedback: `The engine’s run gets ${n} of 4 right with these settings. ${s.activation === 'relu' ? 'With ReLU the hidden layer can fold the inputs, so the output layer’s straight line can split them.' : 'Without a nonlinear step the whole network is one linear classifier, so at most 3 of 4 can be right.'}`,
      })),
    },
  ];
}

function Part4({ s, setS }: { s: XorNetSetting; setS: (s: XorNetSetting) => void }) {
  const result = useMemo(() => {
    try {
      return { ...xorNetRun(s), error: null };
    } catch (e) {
      return {
        r: null,
        rows: [],
        grid: null,
        hiddenGrid: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [s]);
  const correct = result.rows.filter((r) => r.output === r.target).length;
  return (
    <section className="lv-part" aria-labelledby="lv-p4">
      <p className="lv-part-kicker">Part 4</p>
      <h3 id="lv-p4">Add a nonlinear step</h3>
      <p className="lv-muted">
        A network with a hidden layer of two neurons and one output neuron. Its weights are fixed. Only the
        hidden layer’s activation changes: none (linear), or the{' '}
        <Term meaning="A nonlinear activation: it keeps positive values and sets negative values to 0.">
          nonlinear activation
        </Term>{' '}
        ReLU.
      </p>
      <Segmented
        legend="Hidden-layer activation"
        options={[
          { value: 'linear', label: 'None (linear)' },
          { value: 'relu', label: 'ReLU (nonlinear)' },
        ]}
        value={s.activation}
        onChange={(a) => {
          setS({ ...s, activation: a });
          signal(a === 'relu' ? 'nonlinear:on' : 'nonlinear:off');
        }}
        tour="nonlinear-toggle"
        control="nonlinear"
      />
      {result.error && <ErrorNote title="The engine could not run this setting.">{result.error}</ErrorNote>}
      {result.grid && result.hiddenGrid && (
        <>
          <div className="lv-grid-2" style={{ marginTop: 'var(--lv-s4)' }}>
            <div className="lv-viz">
              <div className="lv-viz-title">
                <h4 style={{ margin: 0 }}>The network’s decision</h4>
                {result.r && <EngineBadge instructions={result.r.length} />}
              </div>
              <DecisionBoundary
                grid={result.grid}
                level={0}
                points={result.rows.map((r) => ({ x: r.x, target: r.target, predicted: r.output }))}
                title={
                  s.activation === 'relu'
                    ? 'With ReLU: the boundary bends, and all four can be right.'
                    : 'Linear only: one straight boundary.'
                }
              />
              <p className="lv-bigvalue" aria-live="polite" style={{ fontSize: '1.2rem' }}>
                {correct} of 4 correct
              </p>
            </div>
            <div className="lv-viz">
              <h4>Inside: where the hidden layer puts the four points</h4>
              <DecisionBoundary
                grid={result.hiddenGrid}
                level={0}
                points={result.rows.map((r) => ({ x: r.hidden, target: r.target, predicted: r.output }))}
                title="The output neuron draws one straight line in this hidden space."
                axes={['hidden 1', 'hidden 2']}
                size={320}
              />
              <p className="lv-small lv-muted">
                {s.activation === 'relu'
                  ? `ReLU folds the plane: (0,1) and (1,0) land on the same spot. ${correct === 4 ? 'Now the output neuron’s straight line separates the classes.' : 'With these biases the output neuron’s line does not separate them yet. Try the default biases (0 and −1).'}`
                  : 'Without the fold, the hidden layer only moves the points along one straight line, with the two 1s between the two 0s, so no straight line can split them.'}
              </p>
            </div>
          </div>
          <BoundaryLegend />
          <Disclosure summary="Change the hidden biases">
            <p className="lv-small lv-muted">
              The hidden weights are all 1. The output neuron computes hidden 1 − 2 × hidden 2 − 0.5.
            </p>
            {s.hiddenBias.map((v, i) => (
              <ValueSlider
                key={i}
                label={`Hidden bias ${i + 1}`}
                role="bias"
                value={v}
                min={-2}
                max={2}
                step={0.1}
                onChange={(q) => {
                  setS({ ...s, hiddenBias: s.hiddenBias.map((p, k) => (k === i ? q : p)) });
                  signal('hidden-changed');
                }}
                control={`p4:b${i}`}
              />
            ))}
          </Disclosure>
        </>
      )}
      <div className="lv-callout" style={{ marginTop: 'var(--lv-s5)' }}>
        <p>
          <strong>Takeaway.</strong> More linear layers alone add no power: they always act as one. A
          nonlinear activation between layers is what lets a network draw a boundary that is not a straight
          line.
        </p>
      </div>
    </section>
  );
}

export function Experiment03() {
  const [xor, setXor] = useState<XorNetSetting>({
    activation: 'linear',
    hiddenBias: [...EXP03_XOR_NET.hidden.b],
  });
  const live = useMemo(() => xorQuestions(xor), [xor]);
  return (
    <ExperimentLayout exp={EXP} liveQuestions={live}>
      <Part1 />
      <Part2 />
      <Part3 />
      <Part4 s={xor} setS={setXor} />
    </ExperimentLayout>
  );
}
