/**
 * Experiment 04, Parts 1–3: the architecture, the learning loop, and the terms introduced where they are needed.
 * The architecture diagram is drawn from the engine's own model builder (`buildModel`), so what is drawn is the
 * model that will be trained. The loss example and the learning-rate comparison run on the engine.
 */
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useState } from 'react';
import type { ComparedRun } from '../../../core/engine/protocol';
import type { TrainConfig } from '../../../core/engine/session';
import { buildModel, type Model } from '../../../core/layers/model';
import { EXP04_LIMITS } from '../../../experiments/level1';
import { DemoBadge, EngineBadge, ErrorNote, Segmented, Term, ValueSlider } from '../../components/ui';
import { probe } from '../../engine/probe';
import { fmt } from '../../format';
import { signal } from '../../signals';
import { createEngine } from './engine';
import { DATASET } from './store';

export interface Architecture {
  hidden: number[];
  activation: 'tanh' | 'relu' | 'sigmoid';
}

export interface Training {
  lr: number;
  batchSize: number;
  epochs: number;
}

/** The real training configuration for an architecture and training settings (seed and loss fixed, ADR-084). */
export function toConfig(base: TrainConfig, a: Architecture, t: Training): TrainConfig {
  return {
    ...base,
    batchSize: t.batchSize,
    epochs: t.epochs,
    optimizer: { type: 'sgd', lr: t.lr },
    model: {
      inputShape: [2],
      layers: [
        ...a.hidden.map((units) => ({ type: 'dense' as const, units, activation: a.activation })),
        { type: 'dense' as const, units: 1, activation: 'sigmoid' as const },
      ],
    },
  };
}

export function paramCount(m: Model): number {
  return m.params.reduce((s, p) => s + p.shape.reduce((a, b) => a * b, 1), 0);
}

export function NetworkDiagram({ model }: { model: Model }) {
  const cols = [model.config.inputShape[0], ...model.layers.map((l) => l.outShape[0])];
  const W = 620;
  const H = 260;
  const xs = cols.map((_, i) => 60 + (i * (W - 120)) / (cols.length - 1));
  const ys = (n: number): number[] =>
    Array.from({ length: n }, (_, k) => (n === 1 ? H / 2 : 40 + (k * (H - 80)) / (n - 1)));
  const names = [
    'Input',
    ...model.layers.map((_, i) => (i === model.layers.length - 1 ? 'Output' : `Hidden ${i + 1}`)),
  ];
  const desc = `${cols.length} layers: ${cols.map((n, i) => `${names[i]} with ${n} neuron${n === 1 ? '' : 's'}`).join(', ')}. Every neuron is connected to every neuron of the next layer. ${paramCount(model)} parameters in total.`;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H + 40}`} role="img" aria-label={`The network. ${desc}`}>
        {cols
          .slice(0, -1)
          .map((n, c) =>
            ys(n).flatMap((y1, i) =>
              ys(cols[c + 1]).map((y2, j) => (
                <line
                  key={`${c}-${i}-${j}`}
                  x1={xs[c]}
                  y1={y1}
                  x2={xs[c + 1]}
                  y2={y2}
                  className="lv-edge"
                  strokeWidth={1}
                  opacity={0.45}
                />
              )),
            ),
          )}
        {cols.map((n, c) =>
          ys(n).map((y, i) => (
            <circle
              key={`${c}-${i}`}
              cx={xs[c]}
              cy={y}
              r={n > 6 ? 9 : 13}
              className={`lv-node ${c === 0 ? 'lv-node-input' : c === cols.length - 1 ? 'lv-node-out' : 'lv-node-hidden'}`}
            />
          )),
        )}
        {names.map((name, c) => (
          <g key={name}>
            <text x={xs[c]} y={H + 8} textAnchor="middle" className="lv-svg-text" style={{ fontWeight: 600 }}>
              {name}
            </text>
            <text x={xs[c]} y={H + 26} textAnchor="middle" className="lv-svg-muted">
              {cols[c]} neuron{cols[c] === 1 ? '' : 's'}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

export function ArchitectureBuilder({
  arch,
  setArch,
}: {
  arch: Architecture;
  setArch: (a: Architecture) => void;
}) {
  let model: Model | null = null;
  let error: string | null = null;
  try {
    model = buildModel(
      toConfig(
        {
          seed: 0,
          epochs: 1,
          batchSize: 1,
          shuffle: false,
          loss: 'bce',
          optimizer: { type: 'sgd', lr: 1 },
          model: { inputShape: [2], layers: [] },
        },
        arch,
        { lr: 1, batchSize: 1, epochs: 1 },
      ).model,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const change = (a: Architecture): void => {
    setArch(a);
    signal('arch-changed');
  };
  return (
    <div className="lv-grid-main" data-tour="architecture">
      <div className="lv-viz">
        {model && <NetworkDiagram model={model} />}
        {error && <ErrorNote title="This network cannot be built.">{error}</ErrorNote>}
      </div>
      <div className="lv-panel lv-stack">
        <Segmented
          legend="Hidden layers"
          options={EXP04_LIMITS.hiddenLayers.map((n) => ({ value: n, label: String(n) }))}
          value={arch.hidden.length}
          onChange={(n) =>
            change({ ...arch, hidden: Array.from({ length: n }, (_, k) => arch.hidden[k] ?? arch.hidden[0]) })
          }
          control="arch:layers"
        />
        {arch.hidden.map((u, k) => (
          <Segmented
            key={k}
            legend={`Neurons in hidden layer ${k + 1}`}
            options={EXP04_LIMITS.units.map((n) => ({ value: n, label: String(n) }))}
            value={u}
            onChange={(n) => change({ ...arch, hidden: arch.hidden.map((q, j) => (j === k ? n : q)) })}
            control={`arch:units:${k}`}
          />
        ))}
        <Segmented
          legend="Activation in the hidden layers"
          options={EXP04_LIMITS.activations.map((a) => ({
            value: a as Architecture['activation'],
            label: a === 'relu' ? 'ReLU' : a[0].toUpperCase() + a.slice(1),
          }))}
          value={arch.activation}
          onChange={(a) => change({ ...arch, activation: a })}
          control="arch:activation"
        />
        {model && (
          <div className="lv-table-wrap">
            <table className="lv-table lv-small">
              <caption>
                <Term meaning="All the weights and biases: the numbers training adjusts.">Parameters</Term>{' '}
                per layer
              </caption>
              <thead>
                <tr>
                  <th scope="col">Layer</th>
                  <th scope="col">Weights</th>
                  <th scope="col">Biases</th>
                </tr>
              </thead>
              <tbody>
                {model.layers.map((l, i) => (
                  <tr key={l.name}>
                    <td>{i === model!.layers.length - 1 ? 'Output' : `Hidden ${i + 1}`}</td>
                    <td className="num">
                      {l.inShape[0]} × {l.outShape[0]} = {l.inShape[0] * l.outShape[0]}
                    </td>
                    <td className="num">{l.outShape[0]}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Total</th>
                  <td className="num" colSpan={2}>
                    {paramCount(model)} parameters
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="lv-small lv-muted" style={{ marginBottom: 0 }}>
          The output layer is one sigmoid neuron. Its output, between 0 and 1, is the network’s answer, read
          as 1 when it is at least 0.5.
        </p>
      </div>
    </div>
  );
}

const LOOP = [
  { title: 'An example arrives', text: 'Two inputs, for example (0, 1), with the answer it should give: 1.' },
  {
    title: 'The network predicts',
    text: 'The inputs flow through the layers, as in Experiments 01–03, to an output such as 0.38.',
  },
  {
    title: 'Compare with the answer',
    text: 'How far is 0.38 from 1? That distance is measured as the loss.',
  },
  {
    title: 'Adjust the parameters',
    text: 'Every weight and bias is nudged a little, in the direction that makes the prediction closer.',
  },
];

export function LearningLoop() {
  const [k, setK] = useState(0);
  return (
    <div className="lv-viz">
      <div className="lv-viz-title">
        <h4 style={{ margin: 0 }}>The learning loop</h4>
        <DemoBadge text="Idea only: the numbers are examples" />
      </div>
      <ol className="lv-loop">
        {LOOP.map((s, i) => (
          <li key={s.title} aria-current={i === k ? 'step' : undefined}>
            <strong>{s.title}</strong>
            <p className="lv-small lv-muted" style={{ margin: '4px 0 0' }}>
              {s.text}
            </p>
          </li>
        ))}
      </ol>
      <div className="lv-row" style={{ marginTop: 'var(--lv-s3)' }}>
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => setK((k + 1) % LOOP.length)}
          data-control="loop:next"
        >
          {k === LOOP.length - 1 ? '↻ Repeat with the next example' : 'Next step →'}
        </button>
        <span className="lv-small lv-muted" aria-live="polite">
          Step {k + 1} of 4: {LOOP[k].title}
        </span>
      </div>
      <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s3)', marginBottom: 0 }}>
        Repeat this loop over many examples, many times, and the predictions improve. That is{' '}
        <Term meaning="Adjusting the parameters using examples so that the predictions improve.">
          training
        </Term>
        . In Part 4 you will watch the real loop, with real numbers, in a recorded run.
      </p>
    </div>
  );
}

/** The loss of one prediction against one target, computed by the engine's squared-error loss. */
export function lossOf(prediction: number, target: number): number {
  const r = probe({
    model: { inputShape: [1], layers: [{ type: 'dense', units: 1, activation: 'linear' }] },
    params: { 'L1.W': [0], 'L1.b': [prediction] },
    xs: [[0]],
    ys: [[target]],
    loss: 'mse',
  });
  return r.examples[0].loss!;
}

export function LossDemo() {
  const [p, setP] = useState(0.3);
  const [t, setT] = useState(1);
  const loss = lossOf(p, t);
  const W = 320;
  const sx = scaleLinear()
    .domain([0, 1])
    .range([20, W - 20]);
  return (
    <div className="lv-viz" data-tour="loss-demo">
      <div className="lv-viz-title">
        <h4 style={{ margin: 0 }}>How far off is a prediction?</h4>
        <EngineBadge text="Loss computed by the engine" />
      </div>
      <div className="lv-grid-2">
        <div>
          <ValueSlider
            label="Prediction"
            role="input"
            value={p}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => {
              setP(v);
              signal('loss-moved');
            }}
            control="loss:prediction"
          />
          <Segmented
            legend="Target"
            options={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
            ]}
            value={t}
            onChange={(v) => {
              setT(v);
              signal('loss-moved');
            }}
            control="loss:target"
          />
        </div>
        <div aria-live="polite">
          <svg
            viewBox={`0 0 ${W} 70`}
            role="img"
            aria-label={`Prediction ${fmt(p)} and target ${t} on a line from 0 to 1; the gap between them is ${fmt(Math.abs(p - t))}.`}
          >
            <line x1={sx(0)} x2={sx(1)} y1={35} y2={35} stroke="var(--lv-border)" strokeWidth={2} />
            <line
              x1={sx(Math.min(p, t))}
              x2={sx(Math.max(p, t))}
              y1={35}
              y2={35}
              stroke="var(--lv-incorrect)"
              strokeWidth={5}
            />
            <circle cx={sx(p)} cy={35} r={8} fill="var(--lv-input)" stroke="var(--lv-text)" />
            <rect
              x={sx(t) - 7}
              y={28}
              width={14}
              height={14}
              fill="var(--lv-surface)"
              stroke="var(--lv-text)"
              strokeWidth={2}
            />
            <text x={sx(p)} y={16} textAnchor="middle" className="lv-svg-muted">
              prediction
            </text>
            <text x={sx(t)} y={64} textAnchor="middle" className="lv-svg-muted">
              target
            </text>
          </svg>
          <p className="lv-bigvalue" style={{ marginBottom: 0 }}>
            loss = {fmt(loss, 3)}
          </p>
        </div>
      </div>
      <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s3)', marginBottom: 0 }}>
        The <Term meaning="The target is the correct answer an example should give.">target</Term> is the
        right answer. The{' '}
        <Term meaning="One number that says how far the prediction is from the target. 0 means exactly right.">
          loss
        </Term>{' '}
        is 0 when the prediction is exactly right and grows as it moves away. This example uses squared error,
        (prediction − target)². The training run in Part 4 uses cross-entropy, another way of measuring the
        same gap.
      </p>
    </div>
  );
}

function Sparkline({ run, max }: { run: ComparedRun; max: number }) {
  const W = 220;
  const H = 90;
  const sx = scaleLinear()
    .domain([0, Math.max(1, run.losses.length - 1)])
    .range([6, W - 6]);
  const sy = scaleLinear()
    .domain([0, max])
    .range([H - 6, 6])
    .clamp(true);
  const d = line<number>()
    .x((_, i) => sx(i))
    .y((v) => sy(Number.isFinite(v) ? v : max))(run.losses);
  const ups = run.losses.slice(1).filter((v, i) => v > run.losses[i]).length;
  return (
    <figure style={{ margin: 0 }} className="lv-panel">
      <figcaption style={{ fontWeight: 600 }}>Learning rate {run.lr}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Loss per epoch with learning rate ${run.lr}: starts at ${fmt(run.losses[0], 3)}, ends at ${fmt(run.losses.at(-1), 3)}; it went up in ${ups} of ${run.losses.length - 1} epochs.`}
      >
        <rect x={0} y={0} width={W} height={H} fill="var(--lv-surface-2)" rx={6} />
        <path d={d ?? ''} className="lv-curve" />
      </svg>
      <p className="lv-small" style={{ margin: '6px 0 0' }}>
        ends at <span className="lv-mono">{fmt(run.losses.at(-1), 3)}</span> · went up in{' '}
        <span className="lv-mono">{ups}</span> of {run.losses.length - 1} epochs
        {run.diverged ? ' · stopped: the values blew up' : ''}
      </p>
    </figure>
  );
}

export function LearningRateCompare({
  base,
  arch,
  training,
}: {
  base: TrainConfig;
  arch: Architecture;
  training: Training;
}) {
  const [runs, setRuns] = useState<ComparedRun[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const compare = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const eng = createEngine();
    try {
      const configs = EXP04_LIMITS.learningRates.map((lr) =>
        toConfig(base, arch, { ...training, lr, epochs: 100 }),
      );
      const r = await eng.request<'compareRuns'>({ op: 'compareRuns', configs, dataset: DATASET });
      setRuns(r.runs);
      signal('lr-compared');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      eng.dispose();
      setBusy(false);
    }
  };
  const max = runs ? Math.max(...runs.flatMap((r) => r.losses.filter(Number.isFinite))) * 1.05 || 1 : 1;
  return (
    <div className="lv-viz">
      <div className="lv-viz-title">
        <h4 style={{ margin: 0 }}>Small, moderate and large steps</h4>
        {runs && <EngineBadge text="Three real training runs" />}
      </div>
      <p className="lv-muted">
        The <Term meaning="How large each adjustment of the parameters is.">learning rate</Term> sets the size
        of each adjustment. Train your network three times, for 100 epochs each, with learning rates 0.1, 1
        and 10, and compare how the loss changes.
      </p>
      <button
        type="button"
        className="lv-btn"
        onClick={() => void compare()}
        disabled={busy}
        data-control="lr:compare"
      >
        {busy
          ? 'Training three networks…'
          : runs
            ? 'Compare again with the current network'
            : 'Compare three learning rates'}
      </button>
      {error && <ErrorNote title="The comparison failed.">{error}</ErrorNote>}
      {runs && (
        <>
          <div
            className="lv-grid-2"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 'var(--lv-s4)' }}
          >
            {runs.map((r) => (
              <Sparkline key={r.lr} run={r} max={max} />
            ))}
          </div>
          <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s3)' }}>
            Each curve is the loss after every epoch, on the same vertical scale. Tiny steps make slow
            progress. Huge steps overshoot: the loss jumps around or gets stuck high instead of settling.
          </p>
        </>
      )}
    </div>
  );
}

export function EpochsAndBatches({
  batchSize,
  order,
}: {
  batchSize: number;
  order: { epoch: number[]; batches: number[][] } | null;
}) {
  const examples = [
    [0, 0, 0],
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0],
  ];
  const groups: number[][] =
    order?.batches ??
    Array.from({ length: Math.ceil(4 / batchSize) }, (_, b) =>
      [0, 1, 2, 3].slice(b * batchSize, b * batchSize + batchSize),
    );
  return (
    <div className="lv-viz">
      <div className="lv-viz-title">
        <h4 style={{ margin: 0 }}>Epochs and batches</h4>
        {order ? (
          <EngineBadge text="Order read from the recorded run" />
        ) : (
          <DemoBadge text="Before training: the grouping only" />
        )}
      </div>
      <p className="lv-muted">
        The training data are the four XOR examples. An{' '}
        <Term meaning="One complete pass through all the training examples.">epoch</Term> uses each of them
        once. Within an epoch they are split into{' '}
        <Term meaning="A group of examples processed together. The parameters are adjusted once per batch.">
          batches
        </Term>
        . The network processes one batch, adjusts its parameters once, then moves to the next batch.
      </p>
      <div
        className="lv-row"
        style={{ alignItems: 'stretch' }}
        aria-label={`One epoch: ${groups.length} batch${groups.length === 1 ? '' : 'es'} of up to ${batchSize}`}
      >
        <span className="lv-small lv-muted" style={{ alignSelf: 'center' }}>
          one epoch →
        </span>
        {groups.map((g, b) => (
          <div key={b} className="lv-batch-group">
            <span className="lv-small">Batch {b + 1} → 1 update</span>
            {g.map((i) => (
              <span key={i} className="lv-card-ex">
                #{i + 1} ({examples[i][0]}, {examples[i][1]}) → {examples[i][2]}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s3)', marginBottom: 0 }}>
        {order
          ? `In the first epoch of your run the engine shuffled the examples into this order. Each epoch has ${groups.length} batch${groups.length === 1 ? '' : 'es'}, so ${groups.length} update${groups.length === 1 ? '' : 's'}.`
          : `With batch size ${batchSize}, one epoch has ${groups.length} batch${groups.length === 1 ? '' : 'es'}. The engine also shuffles the order every epoch. After training, this shows the order it actually used.`}
      </p>
    </div>
  );
}
