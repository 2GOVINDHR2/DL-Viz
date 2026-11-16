/**
 * Experiment 03, Part E: real single-neuron training (decision D4, ADR-091).
 *
 * The neuron is trained by the engine in the worker (the shared trace store, src/learn/trace/store.ts), full batch:
 * four examples, then one update. The step-by-step view is read from the recorded trace (`oneUpdate`), and the
 * shared trace explorer opens the same record with Level 2's wording. A comparison run with batch size 1 shows the
 * same four examples producing four updates.
 */
import { useEffect, useMemo, useState } from 'react';
import type { TrainConfig } from '../../../core/engine/session';
import { L2_EXP03_DEFAULTS } from '../../../experiments/level2';
import type { LiveQuestion } from '../../components/KnowledgeCheck';
import { EngineBadge, ErrorNote, Segmented } from '../../components/ui';
import { fmt, fmtSigned } from '../../format';
import { signal } from '../../signals';
import { createEngine } from '../../trace/engine';
import { useRun } from '../../trace/store';
import { TraceExplorer } from '../../trace/TraceExplorer';
import { LEVEL2_WORDING, TraceWordingProvider } from '../../trace/wording';
import { FunctionChart } from '../viz/FunctionChart';
import { oneUpdate, type Recorded, type UpdateBreakdown } from './update';

const D = L2_EXP03_DEFAULTS;
export const NEURON_DATASET = {
  kind: 'points' as const,
  name: 'four examples',
  xs: D.xs.map((x) => [x]),
  ys: D.ys.map((y) => [y]),
};

/** The real training configuration: one input, one sigmoid neuron, BCE, plain gradient descent on the full batch. */
export function neuronConfig(lr: number, epochs = D.epochs, batchSize = D.xs.length): TrainConfig {
  return {
    seed: 0,
    epochs,
    batchSize,
    shuffle: false,
    loss: 'bce',
    optimizer: { type: 'sgd', lr },
    model: { inputShape: [1], layers: [{ type: 'dense', units: 1, activation: 'sigmoid' }] },
    initialParams: { 'L1.W': [D.w0], 'L1.b': [D.b0] },
  };
}

const STAGES = ['start', 'forward', 'loss', 'gradients', 'average', 'scale', 'update', 'after'] as const;
const STAGE_TITLE: Record<(typeof STAGES)[number], string> = {
  start: '1 · Starting weight and bias',
  forward: '2 · Forward: four predictions',
  loss: '3 · Four losses, and the batch loss',
  gradients: '4 · Four gradients, one per example',
  average: '5 · Average the gradients',
  scale: '6 · Multiply by the learning rate',
  update: '7 · Apply the update: one update for the whole batch',
  after: '8 · After the update',
};

const R = ({ r, d = 4 }: { r: Recorded; d?: number }) => (
  <span className="lv-mono" title={`recorded step #${r.id}`}>
    {fmt(r.value, d)}
  </span>
);

export function runQuestion(u: UpdateBreakdown | null, run: number): LiveQuestion {
  if (!u)
    return {
      id: 'g-live-run',
      live: true,
      kind: 'predict',
      prompt: 'In your training run’s first update, did the weight w go up or down?',
      options: [
        { text: 'Up', feedback: '' },
        { text: 'Down', feedback: '' },
      ],
      unavailable: 'Train the neuron in Part E first. This question is about your own run.',
    };
  const up = u.delta.w.value > 0;
  return {
    id: 'g-live-run',
    live: true,
    kind: 'predict',
    prompt: `In run ${run}, the first update averaged the gradient to ∂L/∂w = ${fmt(u.grad.w.value, 4)} with η = ${u.lr}. Did the weight w go up or down?`,
    options: ['Up', 'Down'].map((t) => ({
      text: t,
      correct: (t === 'Up') === up,
      feedback: `The update is −η·∂L/∂w = −${u.lr} × ${fmt(u.grad.w.value, 4)} = ${fmtSigned(u.delta.w.value, 4)}, so w went ${up ? 'up' : 'down'}: from ${fmt(u.initial.w.value, 4)} to ${fmt(u.after.w.value, 4)}. A negative gradient means the loss falls as w grows.`,
    })),
  };
}

function BatchOneComparison() {
  const [values, setValues] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const eng = createEngine();
    try {
      const g = await eng.request<'generate'>({
        op: 'generate',
        config: neuronConfig(D.lr, 1, 1),
        dataset: NEURON_DATASET,
      });
      const { instructions } = await eng.request<'range'>({ op: 'range', from: 0, to: g.length });
      setValues(
        instructions
          .filter((i) => (i.kind === 'INIT_PARAM' || i.kind === 'APPLY_UPDATE') && i.meta.param === 'L1.W')
          .map((i) => i.results.value.data[0]),
      );
      signal('batch1-compared');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      eng.dispose();
      setBusy(false);
    }
  };
  return (
    <div className="lv-panel">
      <h4>Compare: update after every example (batch size 1)</h4>
      <p className="lv-small lv-muted">
        A second real run on the same four examples, but updating after each one. It is recorded separately
        and does not replace your run.
      </p>
      <button
        type="button"
        className="lv-btn lv-btn-small"
        onClick={() => void run()}
        disabled={busy}
        data-control="e:batch1"
      >
        {busy ? 'Training…' : values ? 'Run it again' : 'Run one epoch with batch size 1'}
      </button>
      {error && <ErrorNote title="The comparison failed.">{error}</ErrorNote>}
      {values && (
        <p aria-live="polite" style={{ marginTop: 'var(--lv-s3)', marginBottom: 0 }}>
          One epoch, <strong>{values.length - 1} updates</strong>: w goes{' '}
          <span className="lv-mono">{values.map((v) => fmt(v, 4)).join(' → ')}</span>. Each update uses one
          example’s gradient. With the full batch there is one update, using the average of all four.
        </p>
      )}
    </div>
  );
}

function UpdateView({
  u,
  reveal,
  setReveal,
}: {
  u: UpdateBreakdown;
  reveal: number;
  setReveal: (k: number) => void;
}) {
  const shown = (s: (typeof STAGES)[number]): boolean => STAGES.indexOf(s) <= reveal;
  return (
    <div className="lv-viz" data-tour="one-update">
      <div className="lv-viz-title">
        <h4 style={{ margin: 0 }}>The first update, read from the record</h4>
        <EngineBadge text="Recorded training run" />
      </div>
      <p className="lv-callout lv-small" style={{ marginTop: 0 }}>
        The record shows <strong>{u.examplesInEpoch} examples processed</strong> and{' '}
        <strong>{u.updatesInEpoch} parameter update</strong> in epoch 1. Full-batch gradient descent processes
        every example first, then updates once.
      </p>
      <h5>{STAGE_TITLE.start}</h5>
      <p>
        w = <R r={u.initial.w} /> · b = <R r={u.initial.b} />
      </p>
      <div
        className="lv-table-wrap"
        tabIndex={0}
        role="region"
        aria-label="Values per example (scrolls sideways on narrow screens)"
      >
        <table className="lv-table lv-small">
          <caption>One row per example (hover a value for the recorded step it came from)</caption>
          <thead>
            <tr>
              <th scope="col">Example</th>
              <th scope="col">x</th>
              <th scope="col">Target y</th>
              {shown('forward') && <th scope="col">z = w·x + b</th>}
              {shown('forward') && <th scope="col">Prediction p</th>}
              {shown('loss') && <th scope="col">Loss</th>}
              {shown('gradients') && <th scope="col">∂Lᵢ/∂w</th>}
              {shown('gradients') && <th scope="col">∂Lᵢ/∂b</th>}
            </tr>
          </thead>
          <tbody>
            {u.examples.map((e) => (
              <tr key={e.index}>
                <td>#{e.index + 1}</td>
                <td className="num">
                  <R r={e.x} d={1} />
                </td>
                <td className="num">
                  <R r={e.y} d={0} />
                </td>
                {shown('forward') && (
                  <td className="num">
                    <R r={e.z} />
                  </td>
                )}
                {shown('forward') && (
                  <td className="num">
                    <R r={e.p} />
                  </td>
                )}
                {shown('loss') && (
                  <td className="num">
                    <R r={e.loss} />
                  </td>
                )}
                {shown('gradients') && (
                  <td className="num">
                    <R r={e.gw} />
                  </td>
                )}
                {shown('gradients') && (
                  <td className="num">
                    <R r={e.gb} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown('loss') && (
        <p>
          <strong>{STAGE_TITLE.loss}:</strong> the batch loss is the average of the four,{' '}
          <R r={u.batchLoss} />.
        </p>
      )}
      {shown('gradients') && (
        <p className="lv-small lv-muted">
          {STAGE_TITLE.gradients}: each example says, on its own, how its loss changes with w and b. Nothing
          has been updated yet.
        </p>
      )}
      {shown('average') && (
        <p>
          <strong>{STAGE_TITLE.average}:</strong> g<sub>w</sub> = <R r={u.grad.w} />, g<sub>b</sub> ={' '}
          <R r={u.grad.b} />: the averages of the four columns above.
        </p>
      )}
      {shown('scale') && (
        <p>
          <strong>{STAGE_TITLE.scale}:</strong> η = <span className="lv-mono">{u.lr}</span>. The update is −η
          × g: Δw = <R r={u.delta.w} />, Δb = <R r={u.delta.b} />. The gradient said which way is uphill; the
          update steps the other way.
        </p>
      )}
      {shown('update') && (
        <p>
          <strong>{STAGE_TITLE.update}:</strong> w = <R r={u.initial.w} /> + (<R r={u.delta.w} />) ={' '}
          <R r={u.after.w} /> · b = <R r={u.initial.b} /> + (<R r={u.delta.b} />) = <R r={u.after.b} />
        </p>
      )}
      {shown('after') &&
        (u.next ? (
          <div>
            <strong>{STAGE_TITLE.after}:</strong> with the new parameters, the next epoch’s forward pass
            gives:
            <div
              className="lv-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Values per example (scrolls sideways on narrow screens)"
            >
              <table className="lv-table lv-small">
                <thead>
                  <tr>
                    <th scope="col">Example</th>
                    <th scope="col">Prediction before</th>
                    <th scope="col">Prediction after</th>
                    <th scope="col">Loss before</th>
                    <th scope="col">Loss after</th>
                  </tr>
                </thead>
                <tbody>
                  {u.next.examples.map((e, k) => (
                    <tr key={e.index}>
                      <td>#{e.index + 1}</td>
                      <td className="num">
                        <R r={u.examples[k].p} />
                      </td>
                      <td className="num">
                        <R r={e.p} />
                      </td>
                      <td className="num">
                        <R r={u.examples[k].loss} />
                      </td>
                      <td className="num">
                        <R r={e.loss} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Batch loss: <R r={u.batchLoss} /> before, <R r={u.next.batchLoss} /> after.
            </p>
          </div>
        ) : (
          <p className="lv-muted">Train for at least two epochs to see the next forward pass.</p>
        ))}
      <div className="lv-row">
        <button
          type="button"
          className="lv-btn lv-btn-primary lv-btn-small"
          onClick={() => {
            setReveal(Math.min(STAGES.length - 1, reveal + 1));
            signal('update-reveal');
          }}
          disabled={reveal >= STAGES.length - 1}
          data-control="e:reveal"
        >
          Show the next stage
        </button>
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => {
            setReveal(STAGES.length - 1);
            signal('update-reveal');
          }}
          disabled={reveal >= STAGES.length - 1}
          data-control="e:reveal-all"
        >
          Show all
        </button>
        <span className="lv-small lv-muted" aria-live="polite">
          Stage {reveal + 1} of {STAGES.length}
        </span>
      </div>
    </div>
  );
}

export function PartE({ onUpdate }: { onUpdate: (u: UpdateBreakdown | null, run: number) => void }) {
  const [lr, setLr] = useState(D.lr);
  const [reveal, setReveal] = useState(0);
  const [u, setU] = useState<UpdateBreakdown | null>(null);
  const status = useRun((s) => s.status);
  const error = useRun((s) => s.error);
  const run = useRun((s) => s.run);
  const header = useRun((s) => s.header);
  const trained = useRun((s) => s.config);
  const epochs = useRun((s) => s.epochs);
  const train = useRun((s) => s.train);
  const read = useRun((s) => s.read);
  const dispose = useRun((s) => s.dispose);
  useEffect(() => () => dispose(), [dispose]);
  const config = useMemo(() => neuronConfig(lr), [lr]);
  const stale = !!trained && JSON.stringify(trained) !== JSON.stringify(config);

  useEffect(() => {
    if (status !== 'ready' || !header) return;
    let live = true;
    const e = header.epochStarts;
    void (async () => {
      try {
        const upTo2 = await read(0, e[1]);
        const second = e.length > 2 ? await read(e[1], e[2]) : null;
        const b = oneUpdate(upTo2, e[0], second);
        if (live) {
          setU(b);
          setReveal(0);
          onUpdate(b, run);
        }
      } catch {
        if (live) setU(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [status, header, read, run, onUpdate]);

  return (
    <section className="lv-part" aria-labelledby="l2-p3e">
      <p className="lv-part-kicker">Part E</p>
      <h3 id="l2-p3e">Real training: one neuron, four examples</h3>
      <p className="lv-muted">
        The neuron from the map: one input, a sigmoid output, binary cross-entropy, starting at w = {D.w0}, b
        = {D.b0}. Now the engine trains it for real and records every operation. Each epoch uses all four
        examples as one batch: four predictions, four losses, four gradients, then <strong>one</strong> update
        with their average.
      </p>
      <div className="lv-panel" style={{ marginBottom: 'var(--lv-s4)' }}>
        <Segmented
          legend="Learning rate η"
          options={D.learningRates.map((v) => ({ value: v, label: String(v) }))}
          value={lr}
          onChange={setLr}
          control="e:lr"
        />
        <div className="lv-row" style={{ marginTop: 'var(--lv-s3)' }}>
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            onClick={() => void train(config, `η ${lr}`, NEURON_DATASET)}
            disabled={status === 'training'}
            data-tour="train-neuron"
            data-control="e:train"
          >
            {status === 'training'
              ? 'Training…'
              : run
                ? 'Train again with these settings'
                : 'Train the neuron'}
          </button>
          <span className="lv-small lv-muted">
            {D.epochs} epochs · batch size {D.xs.length} (full batch) · fixed start, so every run with the
            same η is identical
          </span>
        </div>
      </div>
      {status === 'error' && (
        <ErrorNote title="Training did not complete.">
          <p>{error}</p>
        </ErrorNote>
      )}
      {stale && (
        <div className="lv-callout" role="status">
          You changed the learning rate since run {run}. Everything below is still run {run}. Train again to
          record the new setting.
        </div>
      )}
      {status === 'ready' && u && (
        <div className="lv-stack">
          <UpdateView u={u} reveal={reveal} setReveal={setReveal} />
          <BatchOneComparison />
          <div className="lv-viz">
            <FunctionChart
              series={[
                {
                  label: `Loss after each epoch (η = ${trained?.optimizer.lr})`,
                  points: epochs.map((e) => ({ x: e.epoch + 1, y: e.evalLoss })),
                  stroke: 'var(--lv-weight)',
                },
              ]}
              xLabel="epoch"
              yLabel="loss"
              yMax={Math.max(...epochs.map((e) => e.evalLoss).filter(Number.isFinite)) * 1.05 || 1}
              title={`Run ${run}: the loss on all four examples after each epoch, from the record`}
              width={760}
              height={220}
            />
            <p className="lv-small" style={{ margin: 0 }}>
              After {epochs.length} epochs: loss{' '}
              <span className="lv-mono">{fmt(epochs.at(-1)?.evalLoss, 4)}</span> (it started at{' '}
              <span className="lv-mono">{fmt(u.batchLoss.value, 4)}</span>).
            </p>
          </div>
          <TraceWordingProvider value={LEVEL2_WORDING}>
            <TraceExplorer stale={stale} />
          </TraceWordingProvider>
        </div>
      )}
    </section>
  );
}
