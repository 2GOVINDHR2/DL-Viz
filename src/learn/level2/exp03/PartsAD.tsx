/**
 * Experiment 03, Parts A–D: demonstrations computed by the engine (src/learn/level2/exp03/math.ts), not training
 * runs. Each section says so with its badge. Part E (Training.tsx) is the recorded run.
 */
import { useMemo, useState } from 'react';
import { L2_EXP03_DEFAULTS } from '../../../experiments/level2';
import type { LiveQuestion } from '../../components/KnowledgeCheck';
import { MathNote } from '../../components/MathNote';
import { DemoBadge, EngineBadge, Segmented, Term, ValueSlider } from '../../components/ui';
import { fmt, fmtSigned } from '../../format';
import { signal } from '../../signals';
import { LandscapeMap } from '../viz/LandscapeMap';
import { SlopePlot, slopeWord } from '../viz/SlopePlot';
import { engineStep, landscape, neuronLoss, parabola, parabolaDescent } from './math';

const D = L2_EXP03_DEFAULTS;
const CURVE_X = Array.from(
  { length: 81 },
  (_, i) => D.parabola.range[0] + (i * (D.parabola.range[1] - D.parabola.range[0])) / 80,
);
let curveCache: { x: number; y: number }[] | null = null;
const curve = (): { x: number; y: number }[] =>
  (curveCache ??= CURVE_X.map((x) => ({ x, y: parabola(x).value })));
let gridCache: ReturnType<typeof landscape> | null = null;
const grid = (): ReturnType<typeof landscape> => (gridCache ??= landscape());

const demoBadge = <EngineBadge text="Demonstration computed by the engine · not a training run" />;

export function slopeQuestion(x0: number): LiveQuestion {
  const { slope } = parabola(x0);
  const flat = Math.abs(slope) < 0.05;
  const right = flat ? 'flat' : slope < 0 ? 'right' : 'left';
  const opts: { text: string; v: string }[] = [
    { text: 'Move x to the right (increase x)', v: 'right' },
    { text: 'Move x to the left (decrease x)', v: 'left' },
    { text: 'Neither: the curve is flat here', v: 'flat' },
  ];
  return {
    id: 'g-live-slope',
    live: true,
    kind: 'predict',
    prompt: `In Part A the point is at x = ${fmt(x0, 2)}, where the engine’s derivative is f′(x) = ${fmt(slope, 3)}. To make f smaller, which way should x move?`,
    options: opts.map((o) => ({
      text: o.text,
      correct: o.v === right,
      feedback: flat
        ? `The slope is ${fmt(slope, 3)}, essentially zero: this is the bottom of the curve, and no direction goes down.`
        : `The slope is ${fmt(slope, 3)}: the curve goes ${slope > 0 ? 'up' : 'down'} to the right. Going downhill means moving against the slope: to the ${right}.`,
    })),
  };
}

export function PartA({ x0, setX0 }: { x0: number; setX0: (x: number) => void }) {
  const f = parabola(x0);
  return (
    <section className="lv-part" aria-labelledby="l2-p3a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l2-p3a">Slope: which way is downhill?</h3>
      <p className="lv-muted">
        Here is a simple function, <span className="lv-mono">f(x) = (x − 1)² + 0.5</span>. At any point, the
        straight line that just touches the curve is the{' '}
        <Term meaning="The straight line that touches a curve at one point and has the same steepness there.">
          tangent
        </Term>
        . How steep it is, is the <strong>slope</strong>: positive where the curve rises to the right,
        negative where it falls, zero at the bottom.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz">
          <div className="lv-viz-title">
            <span />
            {demoBadge}
          </div>
          <SlopePlot
            curve={curve()}
            x0={x0}
            value={f.value}
            slope={f.slope}
            title="f(x) = (x − 1)² + 0.5 with the tangent at the point (dashed)"
          />
        </div>
        <section className="lv-panel" aria-label="Point controls" data-tour="slope-controls">
          <ValueSlider
            label="Point x"
            role="bias"
            value={x0}
            min={D.parabola.range[0]}
            max={D.parabola.range[1]}
            step={0.05}
            onChange={(v) => {
              setX0(v);
              signal('point-moved');
              if (Math.abs(parabola(v).slope) < 0.05) signal('slope-zero');
            }}
            control="a:x"
          />
          <dl className="lv-kv" aria-live="polite" style={{ marginTop: 'var(--lv-s3)' }}>
            <dt>f(x)</dt>
            <dd>{fmt(f.value, 3)}</dd>
            <dt>Slope</dt>
            <dd>{fmt(f.slope, 3)}</dd>
            <dt>Here the curve is</dt>
            <dd>{slopeWord(f.slope)}</dd>
          </dl>
          <p className="lv-small lv-muted">
            The slope at a point is the <strong>derivative</strong> there, written f′(x). It says how fast f
            changes when x changes a little.
          </p>
        </section>
      </div>
    </section>
  );
}

function RiseOverRun({ x0 }: { x0: number }) {
  const f0 = parabola(x0);
  const hs = [1, 0.5, 0.1, 0.01];
  return (
    <div className="lv-viz">
      <div className="lv-viz-title">
        <h4 style={{ margin: 0 }}>Zooming in on the slope at x = {fmt(x0, 2)}</h4>
        <DemoBadge text="Rise over run: worked out here from engine values" />
      </div>
      <div className="lv-table-wrap">
        <table className="lv-table">
          <caption className="lv-small lv-muted" style={{ fontWeight: 400 }}>
            Step a little to the right (a run of h), see how much f rises, and divide. The smaller the step,
            the closer this comes to the derivative.
          </caption>
          <thead>
            <tr>
              <th scope="col">Run h</th>
              <th scope="col">f(x + h)</th>
              <th scope="col">Rise f(x + h) − f(x)</th>
              <th scope="col">Rise ÷ run</th>
            </tr>
          </thead>
          <tbody>
            {hs.map((h) => {
              const f1 = parabola(x0 + h).value;
              return (
                <tr key={h}>
                  <td className="num">{h}</td>
                  <td className="num">{fmt(f1, 4)}</td>
                  <td className="num">{fmt(f1 - f0.value, 4)}</td>
                  <td className="num">{fmt((f1 - f0.value) / h, 4)}</td>
                </tr>
              );
            })}
            <tr>
              <th scope="row">Derivative f′(x)</th>
              <td colSpan={2} className="lv-small lv-muted">
                computed exactly by the engine’s own derivative rules
              </td>
              <td className="num">
                <strong>{fmt(f0.slope, 4)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <MathNote
        tex={"f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h} \\qquad \\text{here: } f'(x) = 2(x-1)"}
        label="f prime of x is the limit as h goes to 0 of f of x plus h minus f of x, over h; here f prime of x equals 2 times x minus 1"
      >
        <p className="lv-small lv-muted">
          The engine does not divide small differences. It applies an exact rule to each operation (the
          derivative of a square, of a sum…). The table only shows what the derivative means.
        </p>
      </MathNote>
    </div>
  );
}

export interface Point {
  w: number;
  b: number;
}

export function PartsBC({ x0, lr, setLr }: { x0: number; lr: number; setLr: (v: number) => void }) {
  const start: Point = { w: D.w0, b: D.b0 };
  const [path, setPath] = useState<Point[]>([start]);
  const p = path[path.length - 1];
  const here = neuronLoss(p.w, p.b);
  const step = useMemo(
    () => engineStep([p.w, p.b], [here.dw, here.db], lr),
    [p.w, p.b, here.dw, here.db, lr],
  );
  const take = (): void => {
    setPath([...path, { w: step.next[0], b: step.next[1] }]);
    signal('gd-step');
    if (path.length >= 5) signal('gd-steps-5');
  };
  return (
    <>
      <section className="lv-part" aria-labelledby="l2-p3b">
        <p className="lv-part-kicker">Part B</p>
        <h3 id="l2-p3b">Derivatives, partial derivatives and the gradient</h3>
        <p className="lv-muted">
          A derivative is the <em>local</em> rate of change: how much the output moves per unit of input,
          right at this point. Move the point in Part A and the table follows.
        </p>
        <RiseOverRun x0={x0} />
        <p className="lv-muted" style={{ marginTop: 'var(--lv-s4)' }}>
          A neuron’s loss depends on two parameters, the weight w and the bias b. Holding b still and nudging
          w gives one derivative, the{' '}
          <Term meaning="The derivative with respect to one input while the others are held fixed, written ∂L/∂w.">
            partial derivative
          </Term>{' '}
          ∂L/∂w. Holding w still gives ∂L/∂b. Together they form the <strong>gradient</strong> (∂L/∂w, ∂L/∂b),
          which points uphill on the loss landscape below.
        </p>
      </section>
      <section className="lv-part" aria-labelledby="l2-p3c">
        <p className="lv-part-kicker">Part C</p>
        <h3 id="l2-p3c">Gradient descent: step against the gradient</h3>
        <p className="lv-muted">
          The map is the real loss of the neuron in Part E: one input, sigmoid output, the four examples x =
          (−2, −1, 0.5, 2) with targets (0, 1, 0, 1). Each point is a choice of w and b. Gradient descent
          moves the point against the gradient, by a step the learning rate scales:
        </p>
        <MathNote
          summary="The update rule"
          tex={
            'w_{\\text{new}} = w_{\\text{old}} - \\eta\\,\\frac{\\partial L}{\\partial w} \\qquad b_{\\text{new}} = b_{\\text{old}} - \\eta\\,\\frac{\\partial L}{\\partial b}'
          }
          label="w new equals w old minus eta times the partial derivative of L with respect to w; b new equals b old minus eta times the partial derivative of L with respect to b"
        />
        <div className="lv-grid-main" style={{ marginTop: 'var(--lv-s4)' }}>
          <div className="lv-viz" data-tour="landscape">
            <div className="lv-viz-title">
              <span />
              {demoBadge}
            </div>
            <LandscapeMap
              grid={grid()}
              point={{ ...p, loss: here.value }}
              gradient={here}
              path={path}
              title="The neuron’s loss L(w, b) over the four examples"
            />
          </div>
          <section className="lv-panel" aria-label="One gradient descent step" aria-live="polite">
            <h4>The next step, in order</h4>
            <ol className="lv-small" style={{ paddingLeft: '1.2em', margin: 0 }}>
              <li>
                Current parameters: w = <span className="lv-mono">{fmt(p.w, 4)}</span>, b ={' '}
                <span className="lv-mono">{fmt(p.b, 4)}</span> (loss {fmt(here.value, 4)})
              </li>
              <li>
                <strong>Gradient</strong> (computed from the loss): ∂L/∂w ={' '}
                <span className="lv-mono">{fmtSigned(here.dw, 4)}</span>, ∂L/∂b ={' '}
                <span className="lv-mono">{fmtSigned(here.db, 4)}</span>
              </li>
              <li>
                Learning rate η = <span className="lv-mono">{lr}</span>
              </li>
              <li>
                <strong>Update</strong> = −η × gradient: Δw ={' '}
                <span className="lv-mono">{fmtSigned(step.delta[0], 4)}</span>, Δb ={' '}
                <span className="lv-mono">{fmtSigned(step.delta[1], 4)}</span>
              </li>
              <li>
                New parameters: w = <span className="lv-mono">{fmt(step.next[0], 4)}</span>, b ={' '}
                <span className="lv-mono">{fmt(step.next[1], 4)}</span>
              </li>
            </ol>
            <p className="lv-small lv-muted">
              The gradient and the update are different quantities: the update points the other way and is η
              times as long.
            </p>
            <Segmented
              legend="Learning rate η"
              options={D.learningRates.map((v) => ({ value: v, label: String(v) }))}
              value={lr}
              onChange={setLr}
              control="c:lr"
            />
            <div className="lv-row" style={{ marginTop: 'var(--lv-s3)' }}>
              <button
                type="button"
                className="lv-btn lv-btn-primary lv-btn-small"
                onClick={take}
                data-control="c:step"
              >
                Take one step
              </button>
              <button
                type="button"
                className="lv-btn lv-btn-small"
                onClick={() => setPath([start])}
                disabled={path.length === 1}
                data-control="c:reset"
              >
                Back to the start
              </button>
            </div>
            <p className="lv-small" style={{ marginBottom: 0 }}>
              Steps taken: <span className="lv-mono">{path.length - 1}</span>
            </p>
          </section>
        </div>
      </section>
    </>
  );
}

export function PartD() {
  const [k, setK] = useState(1);
  const rate = D.demoRates[k];
  const steps = useMemo(() => parabolaDescent(D.parabola.x0, rate.lr, 8), [rate.lr]);
  const dist = steps.map((s) => Math.abs(s.x - D.parabola.min));
  const flips = steps
    .slice(1)
    .filter((s, i) => Math.sign(s.x - D.parabola.min) !== Math.sign(steps[i].x - D.parabola.min)).length;
  const verdict =
    dist.at(-1)! > dist[0]
      ? `Diverging: every step lands further from the minimum (distance ${fmt(dist[0], 2)} → ${fmt(dist.at(-1)!, 2)}).`
      : flips > 0
        ? `Overshooting: x jumps from one side of the minimum to the other ${flips} times, but each jump is shorter, so it still converges (distance ${fmt(dist[0], 2)} → ${fmt(dist.at(-1)!, 2)}).`
        : dist.at(-1)! < 0.01
          ? `Converging quickly: within ${fmt(dist.at(-1)!, 3)} of the minimum after ${steps.length - 1} steps.`
          : `Converging slowly: still ${fmt(dist.at(-1)!, 2)} away from the minimum after ${steps.length - 1} steps.`;
  return (
    <section className="lv-part" aria-labelledby="l2-p3d">
      <p className="lv-part-kicker">Part D</p>
      <h3 id="l2-p3d">Small, suitable and too-large learning rates</h3>
      <p className="lv-muted">
        Back to f(x) = (x − 1)² + 0.5, whose minimum is at x = 1. Eight gradient descent steps from x ={' '}
        {D.parabola.x0}, with different learning rates. A learning rate is not automatically safe: past a
        certain size, gradient descent stops converging.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz" data-tour="lr-demo">
          <div className="lv-viz-title">
            <span />
            {demoBadge}
          </div>
          <SlopePlot
            curve={curve()}
            x0={steps[0].x}
            value={steps[0].value}
            slope={steps[0].slope}
            path={steps.map((s) => ({ x: s.x, y: s.value }))}
            title={`Steps with η = ${rate.lr} (numbered; steps off the chart are listed in the table)`}
          />
        </div>
        <section className="lv-panel" aria-label="Learning rate">
          <Segmented
            legend="Learning rate"
            options={D.demoRates.map((r, i) => ({ value: i, label: r.label }))}
            value={k}
            onChange={(i) => {
              setK(i);
              signal('lr-demo');
              if (D.demoRates[i].kind === 'diverge') signal('lr-demo:diverge');
            }}
            control="d:lr"
          />
          <p aria-live="polite" style={{ marginTop: 'var(--lv-s3)' }}>
            <strong>{verdict}</strong>
          </p>
          <div className="lv-table-wrap">
            <table className="lv-table lv-small">
              <thead>
                <tr>
                  <th scope="col">Step</th>
                  <th scope="col">x</th>
                  <th scope="col">f(x)</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s, i) => (
                  <tr key={i}>
                    <td className="num">{i}</td>
                    <td className="num">{fmt(s.x, 3)}</td>
                    <td className="num">{fmt(s.value, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
