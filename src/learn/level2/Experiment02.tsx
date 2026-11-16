/**
 * Level 2, Experiment 02 — Loss Functions: Measuring Prediction Error.
 *
 * Every number comes from the engine's own operations, evaluated on a real autodiff tape (ADR-088): `sub` for the
 * error, `square`, `sum` and `mean`, `mseLoss`, `sigmoid` and `bceLoss`. These are the operations a training run
 * uses. They are not training runs, so the screens say "computed by the engine's … operation" and never call
 * them a recorded run.
 */
import { scaleLinear } from 'd3-scale';
import { useMemo, useState } from 'react';
import { L2_EXP02_DEFAULTS, level2ById } from '../../experiments/level2';
import { LEVEL_2 } from '../curriculum';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { MathNote } from '../components/MathNote';
import { EngineBadge, ErrorNote, Segmented, Term, ValueSlider } from '../components/ui';
import { bce, logitChain, mseBreakdown, squaredError } from '../engine/expr';
import { fmt } from '../format';
import { signal } from '../signals';
import { FunctionChart } from './viz/FunctionChart';

const EXP = level2ById('02')!;

/** Probabilities at which the curves are evaluated: 0.01 … 0.99. */
const PS = Array.from({ length: 99 }, (_, i) => (i + 1) / 100);

function PartA() {
  const d = L2_EXP02_DEFAULTS.single;
  const [p, setP] = useState(d.prediction);
  const [y, setY] = useState(d.target);
  const r = mseBreakdown([p], [y]);
  const err = r.error[0];
  const W = 420;
  const sx = scaleLinear()
    .domain([0, 1])
    .range([24, W - 24]);
  return (
    <section className="lv-part" aria-labelledby="l2-p2a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l2-p2a">Prediction against target</h3>
      <p className="lv-muted">
        The <Term meaning="The difference between target and prediction for one example: y − ŷ.">error</Term>{' '}
        of one prediction is the target minus the prediction, y − ŷ. Its sign says which side the prediction
        is on. Its size says how far off it is.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz" data-tour="single-error">
          <div className="lv-viz-title">
            <span />
            <EngineBadge text="Computed by the engine’s operations" />
          </div>
          <svg
            viewBox={`0 0 ${W} 90`}
            role="img"
            aria-label={`Prediction ${fmt(p)} and target ${fmt(y)} on a line from 0 to 1. The error y − ŷ is ${fmt(err, 3)}.`}
          >
            <line x1={sx(0)} x2={sx(1)} y1={45} y2={45} stroke="var(--lv-border)" strokeWidth={2} />
            {[0, 0.5, 1].map((t) => (
              <text key={t} x={sx(t)} y={84} textAnchor="middle" className="lv-svg-muted">
                {fmt(t, 1)}
              </text>
            ))}
            <line
              x1={sx(Math.min(p, y))}
              x2={sx(Math.max(p, y))}
              y1={45}
              y2={45}
              stroke="var(--lv-incorrect)"
              strokeWidth={6}
            />
            <circle cx={sx(p)} cy={45} r={9} fill="var(--lv-input)" stroke="var(--lv-text)" />
            <rect
              x={sx(y) - 8}
              y={37}
              width={16}
              height={16}
              fill="var(--lv-surface)"
              stroke="var(--lv-text)"
              strokeWidth={2}
            />
            <text x={sx(p)} y={22} textAnchor="middle" className="lv-svg-muted">
              ŷ
            </text>
            <text x={sx(y)} y={22} textAnchor="middle" className="lv-svg-muted">
              y
            </text>
          </svg>
          <dl className="lv-kv" aria-live="polite">
            <dt>Error y − ŷ</dt>
            <dd>{fmt(err, 3)}</dd>
            <dt>Squared error (y − ŷ)²</dt>
            <dd>{fmt(r.squared[0], 4)}</dd>
          </dl>
        </div>
        <div className="lv-panel">
          <ValueSlider
            label="Prediction ŷ"
            role="input"
            value={p}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => {
              setP(v);
              signal('prediction-moved');
            }}
            control="a:prediction"
          />
          <ValueSlider
            label="Target y"
            role="correct"
            value={y}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => {
              setY(v);
              signal('prediction-moved');
            }}
            control="a:target"
          />
          <p className="lv-small lv-muted">
            Two predictions can both be wrong by different amounts: 0.9 against a target of 1 is close; 0.1 is
            far.
          </p>
        </div>
      </div>
    </section>
  );
}

export function mseQuestions(predictions: number[], targets: number[]): LiveQuestion[] {
  const r = mseBreakdown(predictions, targets);
  const mse = r.mse[0];
  const options = [
    { v: mse, correct: true, why: 'the average of the squared errors' },
    {
      v: r.sum[0],
      correct: false,
      why: 'the sum of the squared errors: it was not divided by the number of examples',
    },
    {
      v: r.meanError[0],
      correct: false,
      why: 'the average of the errors without squaring: positive and negative errors cancel',
    },
  ];
  const seen = new Set<string>();
  const unique = options.filter((o) => (seen.has(fmt(o.v, 3)) ? false : (seen.add(fmt(o.v, 3)), true)));
  return [
    {
      id: 'l-live-mse',
      live: true,
      kind: 'predict',
      prompt: `For the four predictions in Part B (as they are set now), what is the mean squared error?`,
      options: unique.map((o) => ({
        text: fmt(o.v, 3),
        correct: o.correct,
        feedback: o.correct
          ? `Right: ${fmt(mse, 3)} is ${o.why}, as the engine’s mseLoss computes it.`
          : `Not this one: ${fmt(o.v, 3)} is ${o.why}. The engine’s mseLoss gives ${fmt(mse, 3)}.`,
      })),
    },
  ];
}

function PartB({
  predictions,
  setPredictions,
}: {
  predictions: number[];
  setPredictions: (p: number[]) => void;
}) {
  const targets = L2_EXP02_DEFAULTS.batch.targets;
  const result = useMemo(() => {
    try {
      return { r: mseBreakdown(predictions, targets), error: null };
    } catch (e) {
      return { r: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [predictions, targets]);
  const r = result.r;
  return (
    <section className="lv-part" aria-labelledby="l2-p2b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l2-p2b">Mean squared error</h3>
      <p className="lv-muted">
        Four examples, four predictions. Square each error, then take the average. That gives one number for
        all of them: the <Term meaning="Square each error, then take the average.">mean squared error</Term>.
      </p>
      {result.error && <ErrorNote title="The engine could not compute this.">{result.error}</ErrorNote>}
      {r && (
        <div className="lv-viz" data-tour="mse-table">
          <div className="lv-viz-title">
            <span />
            <EngineBadge text="Computed by the engine’s mseLoss operation" />
          </div>
          <div className="lv-table-wrap">
            <table className="lv-table">
              <caption>Each row is one example</caption>
              <thead>
                <tr>
                  <th scope="col">Example</th>
                  <th scope="col">Prediction ŷ</th>
                  <th scope="col">Target y</th>
                  <th scope="col">Error y − ŷ</th>
                  <th scope="col">Squared</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p, i) => (
                  <tr key={i}>
                    <td>#{i + 1}</td>
                    <td style={{ minWidth: 180 }}>
                      <ValueSlider
                        label={`ŷ of example ${i + 1}`}
                        role="input"
                        value={p}
                        min={0}
                        max={1}
                        step={0.05}
                        onChange={(v) => {
                          const next = predictions.map((q, k) => (k === i ? v : q));
                          setPredictions(next);
                          signal('mse-changed');
                          if (mseBreakdown(next, targets).mse[0] === 0) signal('mse-zero');
                        }}
                        control={`b:p${i + 1}`}
                      />
                    </td>
                    <td className="num">{targets[i]}</td>
                    <td className="num">{fmt(r.error[i], 3)}</td>
                    <td className="num">
                      <span
                        style={{
                          display: 'inline-block',
                          width: `${Math.round(60 * r.squared[i])}px`,
                          height: 10,
                          background: 'var(--lv-incorrect)',
                          marginRight: 6,
                          verticalAlign: 'middle',
                        }}
                        aria-hidden="true"
                      />
                      {fmt(r.squared[i], 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            aria-live="polite"
            className="lv-bigvalue"
            style={{ fontSize: '1.3rem', marginTop: 'var(--lv-s3)' }}
          >
            MSE = {fmt(r.mse[0], 4)}
          </p>
          <p className="lv-small lv-muted" style={{ margin: 0 }}>
            Sum of the squared errors {fmt(r.sum[0], 4)}, divided by {predictions.length} examples.
          </p>
          <MathNote
            tex={'\\text{MSE} = \\frac{1}{n}\\sum_{i=1}^{n} \\left(y_i - \\hat y_i\\right)^2'}
            label="MSE equals one over n times the sum over i of y i minus y hat i, squared"
          />
        </div>
      )}
    </section>
  );
}

function PartC() {
  const d = L2_EXP02_DEFAULTS.bce;
  const [p, setP] = useState(d.p);
  const [y, setY] = useState(d.y);
  const loss = bce(p, y);
  const curve = useMemo(() => PS.map((q) => ({ x: q, y: bce(q, y) })), [y]);
  return (
    <section className="lv-part" aria-labelledby="l2-p2c">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l2-p2c">Binary cross-entropy</h3>
      <p className="lv-muted">
        When the output is a{' '}
        <Term meaning="A number from 0 to 1 that says how likely the network thinks class 1 is.">
          probability
        </Term>{' '}
        p for class 1, binary cross-entropy looks at the probability given to the <em>right</em> answer: p if
        the target is 1, 1 − p if it is 0. The less likely the network thought the right answer was, the
        larger the loss.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz">
          <div className="lv-viz-title">
            <span />
            <EngineBadge text="Computed by the engine’s bceLoss operation" />
          </div>
          <FunctionChart
            series={[{ label: `BCE when the target is ${y}`, points: curve, stroke: 'var(--lv-weight)' }]}
            marker={p}
            xLabel="probability p"
            yLabel="loss"
            yMax={5}
            capNote="The vertical axis stops at 5 for readability only: cross-entropy itself has no upper limit."
            title={`Binary cross-entropy for target ${y}, against the predicted probability`}
          />
        </div>
        <div className="lv-panel" data-tour="bce-controls">
          <ValueSlider
            label="Probability p of class 1"
            role="input"
            value={p}
            min={0.01}
            max={0.99}
            step={0.01}
            onChange={(v) => {
              setP(v);
              signal('bce-moved');
            }}
            control="c:p"
          />
          <Segmented
            legend="Target y"
            options={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
            ]}
            value={y}
            onChange={(v) => {
              setY(v);
              signal('bce-target');
            }}
            control="c:y"
          />
          <dl className="lv-kv" style={{ marginTop: 'var(--lv-s3)' }} aria-live="polite">
            <dt>Probability of the right answer</dt>
            <dd>{fmt(y === 1 ? p : 1 - p, 2)}</dd>
            <dt>BCE</dt>
            <dd>{fmt(loss, 4)}</dd>
          </dl>
          <p className="lv-small lv-muted">
            {y === 1
              ? 'Target 1: the loss falls towards 0 as p rises towards 1.'
              : 'Target 0: the loss falls towards 0 as p falls towards 0.'}{' '}
            Confident and right costs almost nothing. Confident and wrong costs a lot.
          </p>
        </div>
      </div>
      <MathNote
        tex={'\\text{BCE} = -\\left[\\,y\\log p + (1-y)\\log(1-p)\\,\\right]'}
        label="BCE equals minus the quantity y log p plus 1 minus y times log of 1 minus p"
      >
        <p className="lv-small lv-muted">
          Only one of the two terms is active for each target: y log p when y = 1, and (1 − y) log(1 − p) when
          y = 0. The logarithm turns “very unlikely” into “very large loss”.
        </p>
      </MathNote>
    </section>
  );
}

function PartD() {
  const [y, setY] = useState(1);
  const [p, setP] = useState(0.2);
  const series = useMemo(
    () => [
      {
        label: 'Binary cross-entropy',
        points: PS.map((q) => ({ x: q, y: bce(q, y) })),
        stroke: 'var(--lv-weight)',
      },
      {
        label: 'Squared error',
        points: PS.map((q) => ({ x: q, y: squaredError(q, y) })),
        stroke: 'var(--lv-bias)',
        dash: '7 4',
      },
    ],
    [y],
  );
  const b = bce(p, y);
  const m = squaredError(p, y);
  return (
    <section className="lv-part" aria-labelledby="l2-p2d">
      <p className="lv-part-kicker">Part D</p>
      <h3 id="l2-p2d">Comparing the two</h3>
      <p className="lv-muted">
        The same prediction, two ways of scoring it. Move p towards the wrong end and compare.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz">
          <div className="lv-viz-title">
            <span />
            <EngineBadge text="Computed by the engine’s loss operations" />
          </div>
          <FunctionChart
            series={series}
            marker={p}
            xLabel="probability p"
            yLabel="loss"
            yMax={5}
            capNote="The vertical axis stops at 5 for readability only: cross-entropy itself has no upper limit."
            title={`Both losses for target ${y}`}
          />
        </div>
        <div className="lv-panel">
          <ValueSlider
            label="Probability p"
            role="input"
            value={p}
            min={0.01}
            max={0.99}
            step={0.01}
            onChange={(v) => {
              setP(v);
              signal('compare-moved');
            }}
            control="d:p"
          />
          <Segmented
            legend="Target y"
            options={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
            ]}
            value={y}
            onChange={setY}
            control="d:y"
          />
          <table className="lv-table" style={{ marginTop: 'var(--lv-s3)' }} aria-live="polite">
            <tbody>
              <tr>
                <th scope="row">Squared error</th>
                <td className="num">{fmt(m, 4)}</td>
              </tr>
              <tr>
                <th scope="row">Binary cross-entropy</th>
                <td className="num">{fmt(b, 4)}</td>
              </tr>
            </tbody>
          </table>
          <p className="lv-small lv-muted">
            Squared error can never exceed 1 here, however wrong the probability. Cross-entropy keeps growing
            as the right answer becomes less likely. That is why it is the usual choice for probabilities: a
            confident mistake stands out.
          </p>
          <p className="lv-small lv-muted">
            The chart’s axis stops at 5 to keep the squared-error curve readable. That is not a limit of the
            loss: cross-entropy keeps growing as the probability of the right answer approaches 0. The engine
            stops it near 16.1 by clipping (Part E). The exact values are in the table above.
          </p>
        </div>
      </div>
    </section>
  );
}

function PartE() {
  const [z, setZ] = useState(L2_EXP02_DEFAULTS.logit);
  const [y, setY] = useState(1);
  const c = logitChain(z, y);
  const clipped = c.p > 1 - 1e-7 || c.p < 1e-7;
  const box = (title: string, value: string, role: string) => (
    <div
      className="lv-panel"
      style={{
        padding: 'var(--lv-s3) var(--lv-s4)',
        borderTop: `3px solid var(--lv-${role})`,
        minWidth: 120,
        textAlign: 'center',
      }}
    >
      <div className="lv-small lv-muted">{title}</div>
      <div className="lv-mono" style={{ fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
  return (
    <section className="lv-part" aria-labelledby="l2-p2e">
      <p className="lv-part-kicker">Part E</p>
      <h3 id="l2-p2e">From logit to probability to loss</h3>
      <p className="lv-muted">
        A network’s last neuron first computes a raw number, a{' '}
        <Term meaning="The raw output before the sigmoid; any real number.">logit</Term> z, which can be any
        value. The sigmoid squeezes it into a probability between 0 and 1, and the loss compares that with the
        target. A logit of 0 means “50:50”.
      </p>
      <div className="lv-viz" data-tour="logit-chain">
        <div className="lv-viz-title">
          <span />
          <EngineBadge text="Each step is an engine operation" />
        </div>
        <div className="lv-row" style={{ alignItems: 'stretch' }} aria-live="polite">
          {box('logit z', fmt(c.logit, 2), 'bias')}
          <span aria-hidden="true" style={{ alignSelf: 'center' }}>
            → sigmoid →
          </span>
          {box('probability p', fmt(c.p, 4), 'input')}
          <span aria-hidden="true" style={{ alignSelf: 'center' }}>
            → BCE with y = {y} →
          </span>
          {box('loss', fmt(c.loss, 4), 'incorrect')}
        </div>
        <div className="lv-grid-2" style={{ marginTop: 'var(--lv-s4)' }}>
          <ValueSlider
            label="Logit z"
            role="bias"
            value={z}
            min={-20}
            max={20}
            step={0.1}
            onChange={(v) => {
              setZ(v);
              signal('logit-moved');
            }}
            control="e:z"
          />
          <Segmented
            legend="Target y"
            options={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
            ]}
            value={y}
            onChange={setY}
            control="e:y"
          />
        </div>
        {clipped && (
          <p className="lv-callout lv-small" role="status">
            The probability is within 10⁻⁷ of {c.p > 0.5 ? 1 : 0}. The engine clips probabilities to [10⁻⁷, 1
            − 10⁻⁷] before taking the logarithm, as TensorFlow does, so the loss stops growing near −ln 10⁻⁷ ≈
            16.1 instead of becoming infinite.
          </p>
        )}
      </div>
    </section>
  );
}

export function L2Experiment02() {
  const [predictions, setPredictions] = useState([...L2_EXP02_DEFAULTS.batch.predictions]);
  const live = useMemo(() => mseQuestions(predictions, L2_EXP02_DEFAULTS.batch.targets), [predictions]);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_2} liveQuestions={live}>
      <PartA />
      <PartB predictions={predictions} setPredictions={setPredictions} />
      <PartC />
      <PartD />
      <PartE />
    </ExperimentLayout>
  );
}
