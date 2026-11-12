/**
 * Experiment 04 — Multilayer Perceptron: From Architecture to Training Trace.
 *
 * Part 1 builds a real model configuration. Part 2 shows the learning loop as an idea. Part 3 introduces the terms
 * when they are needed, with engine-computed examples. Part 4 trains through the existing engine in the worker,
 * producing a real NPM trace, and opens it in the trace explorer (ADR-085).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EXP04_DEFAULTS, EXP04_LIMITS, level1ById } from '../../../experiments/level1';
import { ExperimentLayout } from '../../components/ExperimentLayout';
import type { LiveQuestion } from '../../components/KnowledgeCheck';
import { ErrorNote, Segmented, Term } from '../../components/ui';
import { fmt, pct } from '../../format';
import {
  ArchitectureBuilder,
  EpochsAndBatches,
  LearningLoop,
  LearningRateCompare,
  LossDemo,
  toConfig,
  type Architecture,
  type Training,
} from './parts';
import { useRun } from './store';
import { TraceExplorer } from './TraceExplorer';
import { TrainingOverview } from './TrainingOverview';

const EXP = level1ById('04')!;

const defaultArch = (): Architecture => {
  const hidden = EXP04_DEFAULTS.model.layers.slice(0, -1);
  return {
    hidden: hidden.map((l) => (l.type === 'dense' ? l.units : 4)),
    activation: (hidden[0]?.type === 'dense' ? hidden[0].activation : 'tanh') as Architecture['activation'],
  };
};
const defaultTraining = (): Training => ({
  lr: EXP04_DEFAULTS.optimizer.lr,
  batchSize: EXP04_DEFAULTS.batchSize,
  epochs: EXP04_DEFAULTS.epochs,
});

export const describeArch = (a: Architecture): string => `2 → ${a.hidden.join(' → ')} → 1, ${a.activation}`;

function RunsSoFar() {
  const runs = useRun((s) => s.runs);
  if (runs.length < 1) return null;
  return (
    <div className="lv-table-wrap">
      <table className="lv-table">
        <caption>Runs so far: compare their outcomes</caption>
        <thead>
          <tr>
            <th scope="col">Run</th>
            <th scope="col">Network</th>
            <th scope="col">Learning rate</th>
            <th scope="col">Batch size</th>
            <th scope="col">Epochs</th>
            <th scope="col">Final loss</th>
            <th scope="col">Correct at the end</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.run}>
              <td className="num">{r.run}</td>
              <td>{r.label}</td>
              <td className="num">{r.config.optimizer.lr}</td>
              <td className="num">{r.config.batchSize}</td>
              <td className="num">{r.config.epochs}</td>
              <td className="num">{fmt(r.finalLoss, 4)}</td>
              <td className="num">
                {r.finalAccuracy === null
                  ? '—'
                  : `${pct(r.finalAccuracy)} (${Math.round(r.finalAccuracy * 4)} of 4)`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Experiment04() {
  const [arch, setArch] = useState<Architecture>(defaultArch);
  const [training, setTraining] = useState<Training>(defaultTraining);
  const config = useMemo(() => toConfig(EXP04_DEFAULTS, arch, training), [arch, training]);
  const status = useRun((s) => s.status);
  const error = useRun((s) => s.error);
  const trained = useRun((s) => s.config);
  const run = useRun((s) => s.run);
  const epochs = useRun((s) => s.epochs);
  const epochView = useRun((s) => s.epochView);
  const train = useRun((s) => s.train);
  const dispose = useRun((s) => s.dispose);
  useEffect(() => () => dispose(), [dispose]);
  const stale = !!trained && JSON.stringify(trained) !== JSON.stringify(config);

  // The first epoch's real order, kept per run once the explorer has read epoch 1.
  const order = useRef<{ run: number; epoch: number[]; batches: number[][] } | null>(null);
  if (epochView?.epoch === 0 && order.current?.run !== run) {
    const begin = epochView.instructions.find((i) => i.kind === 'EPOCH_BEGIN');
    const batches = epochView.instructions
      .filter((i) => i.kind === 'BATCH_BEGIN')
      .map((i) => Array.from(i.results.indices.data));
    if (begin) order.current = { run, epoch: Array.from(begin.results.order.data), batches };
  }
  const shownOrder =
    order.current && order.current.run === run && trained && trained.batchSize === training.batchSize
      ? order.current
      : null;

  const live = useMemo<LiveQuestion[]>(() => {
    const B = training.batchSize;
    const n = Math.ceil(4 / B);
    const recorded = shownOrder ? shownOrder.batches.length : null;
    const qs: LiveQuestion[] = [
      {
        id: 'm-live-batches',
        live: true,
        kind: 'predict',
        prompt: `With your batch size of ${B} and the 4 XOR examples, how many batches, and so how many parameter updates, does one epoch contain?`,
        options: [...new Set([1, 2, 4, n])]
          .sort((a, b) => a - b)
          .map((k) => ({
            text: String(k),
            correct: k === n,
            feedback:
              `4 examples in groups of ${B} make ${n} batch${n === 1 ? '' : 'es'}, and each batch ends with one update.` +
              (recorded !== null
                ? ` Your recorded run ${run} confirms it: its first epoch has ${recorded} batches.`
                : ''),
          })),
      },
    ];
    if (epochs.length && trained) {
      const first = epochs[0].evalLoss;
      const last = epochs[epochs.length - 1].evalLoss;
      const verdict = !Number.isFinite(last)
        ? 'higher'
        : Math.abs(last - first) <= 0.01 * Math.abs(first)
          ? 'same'
          : last < first
            ? 'lower'
            : 'higher';
      qs.push({
        id: 'm-live-run',
        live: true,
        kind: 'scenario',
        prompt: `Look at the loss chart of run ${run}. Compared with after epoch 1, the loss at the end of the run is…`,
        options: [
          ['lower', 'lower'],
          ['about the same (within 1 %)', 'same'],
          ['higher', 'higher'],
        ].map(([text, v]) => ({
          text,
          correct: v === verdict,
          feedback: `In run ${run} the loss after epoch 1 was ${fmt(first, 4)} and at the end ${fmt(last, 4)}. ${verdict === 'lower' ? 'Training made the predictions better.' : 'This run did not improve its predictions. Try the default settings and compare.'}`,
        })),
      });
    } else {
      qs.push({
        id: 'm-live-run',
        live: true,
        kind: 'scenario',
        prompt: 'Compared with after epoch 1, is the loss at the end of your run lower, the same or higher?',
        options: [
          { text: 'lower', feedback: '' },
          { text: 'about the same', feedback: '' },
          { text: 'higher', feedback: '' },
        ],
        unavailable: 'Train the network in Part 4 first. This question is about your own run.',
      });
    }
    return qs;
  }, [training.batchSize, epochs, trained, run, shownOrder]);

  return (
    <ExperimentLayout exp={EXP} liveQuestions={live}>
      <section className="lv-part" aria-labelledby="lv-m1">
        <p className="lv-part-kicker">Part 1</p>
        <h3 id="lv-m1">Build a network</h3>
        <p className="lv-muted">
          Neurons are arranged in{' '}
          <Term meaning="A group of neurons that all receive the same inputs.">layers</Term>. Every neuron in
          one layer feeds every neuron in the next. The two inputs come from an XOR example. The{' '}
          <Term meaning="A layer between input and output; its values are internal to the network.">
            hidden layers
          </Term>{' '}
          do the work, and one output neuron gives the answer.
        </p>
        <ArchitectureBuilder arch={arch} setArch={setArch} />
      </section>

      <section className="lv-part" aria-labelledby="lv-m2">
        <p className="lv-part-kicker">Part 2</p>
        <h3 id="lv-m2">How a network learns</h3>
        <p className="lv-muted">
          A new network starts with random weights, so its answers are poor. It improves by repeating a simple
          loop over examples whose right answers are known.
        </p>
        <LearningLoop />
      </section>

      <section className="lv-part" aria-labelledby="lv-m3">
        <p className="lv-part-kicker">Part 3</p>
        <h3 id="lv-m3">The words you need for training</h3>
        <p className="lv-muted">
          The network’s output is its{' '}
          <Term meaning="What the network outputs for an example.">prediction</Term>. Each example also has a{' '}
          <Term meaning="The correct answer for an example.">target</Term>, the answer it should give.
        </p>
        <div className="lv-stack">
          <LossDemo />
          <LearningRateCompare base={EXP04_DEFAULTS} arch={arch} training={training} />
          <EpochsAndBatches batchSize={training.batchSize} order={shownOrder} />
          <section className="lv-panel" aria-label="Your training settings">
            <h4>Your training settings</h4>
            <div
              className="lv-grid-2"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
            >
              <Segmented
                legend="Learning rate"
                options={EXP04_LIMITS.learningRates.map((v) => ({ value: v, label: String(v) }))}
                value={training.lr}
                onChange={(lr) => setTraining({ ...training, lr })}
                control="train:lr"
              />
              <Segmented
                legend="Batch size"
                options={EXP04_LIMITS.batchSizes.map((v) => ({ value: v, label: String(v) }))}
                value={training.batchSize}
                onChange={(batchSize) => setTraining({ ...training, batchSize })}
                control="train:batch"
              />
              <Segmented
                legend="Epochs"
                options={EXP04_LIMITS.epochs.map((v) => ({ value: v, label: String(v) }))}
                value={training.epochs}
                onChange={(e) => setTraining({ ...training, epochs: e })}
                control="train:epochs"
              />
            </div>
            <p className="lv-small lv-muted" style={{ marginBottom: 0 }}>
              The starting values come from a fixed seed ({EXP04_DEFAULTS.seed}), so the same settings always
              give exactly the same run.
            </p>
          </section>
        </div>
      </section>

      <section className="lv-part" aria-labelledby="lv-m4">
        <p className="lv-part-kicker">Part 4</p>
        <h3 id="lv-m4">Train it, then inspect what happened</h3>
        <p className="lv-muted">
          Training runs the real engine on your network: forward through every example, compare, backward,
          update, over and over. As it runs, the engine records every operation it performs, with its values:
          the{' '}
          <Term meaning="The training trace: an ordered record of every operation of the run, which you can step through in both directions.">
            training trace
          </Term>
          .
        </p>
        <div className="lv-row" style={{ margin: 'var(--lv-s4) 0' }}>
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            onClick={() => void train(config, describeArch(arch))}
            disabled={status === 'training'}
            data-tour="train-button"
            data-control="train"
          >
            {status === 'training'
              ? 'Training…'
              : run
                ? 'Train again with these settings'
                : 'Train the network'}
          </button>
          <span className="lv-small lv-muted" aria-live="polite">
            {status === 'training'
              ? `Training ${describeArch(arch)} for ${training.epochs} epochs…`
              : status === 'ready'
                ? `Run ${run} recorded.`
                : ''}
          </span>
        </div>
        {status === 'error' && (
          <ErrorNote title="Training did not complete.">
            <p>{error}</p>
            <button
              type="button"
              className="lv-btn lv-btn-small"
              onClick={() => void train(config, describeArch(arch))}
            >
              Try again
            </button>
          </ErrorNote>
        )}
        {status !== 'error' && trained && (
          <div className="lv-stack">
            <TrainingOverview />
            <TraceExplorer stale={stale} />
            <RunsSoFar />
          </div>
        )}
      </section>
    </ExperimentLayout>
  );
}
