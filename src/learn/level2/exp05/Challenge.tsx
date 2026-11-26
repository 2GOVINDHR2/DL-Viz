/**
 * Experiment 05, Part G — the final challenge (Stage 6, ADR-095).
 *
 * The learner configures a small MLP from a bounded set of choices (every one checked by the Stage 6 gate), the
 * engine trains it in the worker on the two Gaussian clusters, and one update is taken apart from the recorded trace:
 * prediction, loss, backward pass, gradients (each example's and the batch mean), and the update itself. Every number
 * is a recorded instruction result (`readBatch`); each stage links to its instruction in the shared explorer. The two
 * checks marked "checked here" (the mean of the examples' gradients, and before + Δ) are arithmetic on recorded
 * values, shown beside the recorded result they reproduce.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Instruction } from '../../../core/npm/ir';
import type { LiveQuestion } from '../../components/KnowledgeCheck';
import { EngineBadge, ErrorNote, Segmented } from '../../components/ui';
import { fmt, pct } from '../../format';
import { signal } from '../../signals';
import { useRun } from '../../trace/store';
import { TraceExplorer } from '../../trace/TraceExplorer';
import { LEVEL2_PER_EXAMPLE_WORDING, LEVEL2_WORDING, TraceWordingProvider } from '../../trace/wording';
import { BoundaryLegend, DecisionBoundary } from '../../viz/DecisionBoundary';
import {
  CHALLENGE_DATASET,
  CHALLENGE_DEFAULTS,
  CHALLENGE_EPOCHS,
  CHALLENGE_OPTIONS,
  challengeConfig,
  describeNetwork,
  epochCheck,
  readBatch,
  type Activation,
  type BatchView,
  type ChallengeSettings,
  type EpochCheck,
} from './challenge';

const N = 40;
const STAGES = ['prediction', 'loss', 'backward', 'gradients', 'update'] as const;
type StageName = (typeof STAGES)[number];

const show = (v: number[], d = 4, max = 4): string =>
  v
    .slice(0, max)
    .map((q) => fmt(q, d))
    .join(', ') + (v.length > max ? ' …' : '');

const sameValues = (a: number[], b: number[], tol: number): boolean =>
  a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= tol * Math.max(1, Math.abs(b[i])));

/** The live question: one parameter of the inspected update, from its recorded before, ḡ and η. */
export function updateQuestion(v: BatchView | null): LiveQuestion {
  const u = v?.updates.find((q) => q.param === 'L2.b');
  if (!v || !u)
    return {
      id: 'ad-live-update',
      live: true,
      kind: 'predict',
      prompt: 'In the final challenge, what is a parameter’s value after an update?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train a network in the final challenge and open an update first.',
    };
  const [b, g, after] = [u.before[0], u.mean[0], u.after[0]];
  const opts = [
    { t: fmt(after, 4), ok: true },
    { t: fmt(b + u.lr * g, 4), ok: false },
    { t: fmt(b - g, 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'ad-live-update',
    live: true,
    kind: 'predict',
    prompt: `In the final challenge’s update (epoch ${v.epoch + 1}, batch ${v.batch + 1}), the output bias was ${fmt(b, 4)}, its mean gradient ḡ is ${fmt(g, 4)} and η = ${u.lr}. What is it after the update?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `b ← b − η·ḡ = ${fmt(b, 4)} − ${u.lr} × ${fmt(g, 4)} = ${fmt(after, 4)}, the value the engine recorded.`,
    })),
  };
}

function LossCurve({ losses, accuracies }: { losses: number[]; accuracies: (number | null)[] }) {
  const W = 520;
  const H = 190;
  const m = { l: 46, r: 12, t: 12, b: 30 };
  const max = Math.max(...losses.filter(Number.isFinite), 0.01) * 1.05;
  const x = (i: number): number => m.l + (i * (W - m.l - m.r)) / Math.max(1, losses.length - 1);
  const y = (v: number): number => H - m.b - (Math.min(v, max) / max) * (H - m.t - m.b);
  const d = losses.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const last = losses.length - 1;
  return (
    <figure style={{ margin: 0, maxWidth: 640 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Loss after each of the ${losses.length} epochs, from ${fmt(losses[0], 4)} after epoch 1 to ${fmt(losses[last], 4)} after epoch ${last + 1}. Correct answers after the last epoch: ${accuracies[last] === null ? 'not recorded' : pct(accuracies[last]!)}.`}
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={m.l} x2={W - m.r} y1={y(f * max)} y2={y(f * max)} className="lv-svg-grid" />
            <text x={m.l - 6} y={y(f * max) + 4} textAnchor="end" className="lv-svg-muted">
              {fmt(f * max, 2)}
            </text>
          </g>
        ))}
        {[0, Math.floor(last / 2), last].map((i) => (
          <text key={i} x={x(i)} y={H - m.b + 16} textAnchor="middle" className="lv-svg-muted">
            {i + 1}
          </text>
        ))}
        <text x={W - m.r} y={H - 2} textAnchor="end" className="lv-svg-muted">
          epoch →
        </text>
        <path d={d} fill="none" stroke="var(--lv-input)" strokeWidth={2.5} />
        {losses.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill="var(--lv-input)" />
        ))}
      </svg>
    </figure>
  );
}

function StageCard({
  n,
  title,
  name,
  at,
  jump,
  visit,
  children,
}: {
  n: number;
  title: string;
  name: StageName;
  at: number;
  jump: (id: number) => void;
  visit: (s: StageName) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="lv-panel" aria-label={`${n}. ${title}`} data-stage={name}>
      <div className="lv-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h5 style={{ margin: 0 }}>
          {n}. {title}
        </h5>
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => {
            jump(at);
            visit(name);
          }}
          data-control={`g:show:${name}`}
        >
          Show step #{at} in the record
        </button>
      </div>
      <div style={{ marginTop: 'var(--lv-s2)' }}>{children}</div>
    </section>
  );
}

export function FinalChallenge({ onBatch }: { onBatch: (v: BatchView | null) => void }) {
  const status = useRun((s) => s.status);
  const error = useRun((s) => s.error);
  const header = useRun((s) => s.header);
  const config = useRun((s) => s.config);
  const epochs = useRun((s) => s.epochs);
  const train = useRun((s) => s.train);
  const jump = useRun((s) => s.jump);
  const read = useRun((s) => s.read);
  const dispose = useRun((s) => s.dispose);
  useEffect(() => () => dispose(), [dispose]);

  const [settings, setSettings] = useState<ChallengeSettings>(CHALLENGE_DEFAULTS);
  const [trained, setTrained] = useState<ChallengeSettings | null>(null);
  // The run shown is a run of the network trained here (the store is shared with other pages; see ADR-093, 6).
  const shownSettings = trained ?? CHALLENGE_DEFAULTS;
  const ours =
    header !== null &&
    config !== null &&
    JSON.stringify(config) === JSON.stringify(challengeConfig(shownSettings));
  const ready = status === 'ready' && ours && header !== null;
  const changed = trained !== null && JSON.stringify(trained) !== JSON.stringify(settings);

  const [epoch, setEpoch] = useState(0);
  const [batch, setBatch] = useState(0);
  const [example, setExample] = useState(0);
  const [compare, setCompare] = useState<number>(CHALLENGE_EPOCHS - 1);
  const [view, setView] = useState<BatchView | null>(null);
  const [checks, setChecks] = useState<Record<number, EpochCheck>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const visited = useRef(new Set<StageName>());
  const batches = Math.ceil(N / shownSettings.batchSize);

  // An epoch's instructions, read once per run (the cache is emptied when a new run starts).
  const cache = useRef(new Map<number, Instruction[]>());
  const loadEpoch = useCallback(
    async (e: number): Promise<Instruction[]> => {
      const h = useRun.getState().header;
      if (!h) throw new Error('there is no run to read');
      let ins = cache.current.get(e);
      if (!ins) {
        ins = await read(h.epochStarts[e], h.epochStarts[e + 1]);
        cache.current.set(e, ins);
      }
      return ins;
    },
    [read],
  );

  useEffect(() => {
    if (!ready) return;
    let live = true;
    setLoadError(null);
    (async () => {
      const ins = await loadEpoch(epoch);
      const v = await readBatch(ins, epoch, batch, 'L2', async (id) => (await read(id, id + 1))[0]);
      if (live) {
        setView(v);
        onBatch(v);
      }
    })().catch((e: unknown) => {
      if (live) setLoadError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      live = false;
    };
  }, [ready, header, epoch, batch, loadEpoch, read, onBatch]);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    (async () => {
      const out: Record<number, EpochCheck> = {};
      for (const e of [0, compare]) out[e] = epochCheck(await loadEpoch(e), e);
      if (live) setChecks(out);
    })().catch((e: unknown) => {
      if (live) setLoadError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      live = false;
    };
  }, [ready, header, compare, loadEpoch]);

  const visit = (s: StageName): void => {
    visited.current.add(s);
    signal(`ch-stage:${s}`);
    if (s === 'gradients' && shownSettings.batchSize > 1) signal('ch-mean');
    if (STAGES.every((q) => visited.current.has(q))) signal('ch-complete');
  };

  const runIt = async (): Promise<void> => {
    const s = settings;
    setTrained(s);
    setView(null);
    onBatch(null);
    setChecks({});
    setEpoch(0);
    setBatch(0);
    setExample(0);
    setCompare(CHALLENGE_EPOCHS - 1);
    visited.current.clear();
    cache.current.clear();
    await train(challengeConfig(s), describeNetwork(s), CHALLENGE_DATASET);
  };

  const points = useMemo(() => {
    const d = header?.dataset;
    if (!d?.xs || !d.ys) return [];
    return Array.from({ length: d.n }, (_, i) => ({
      x: [d.xs!.data[2 * i], d.xs!.data[2 * i + 1]],
      target: d.ys!.data[i],
    }));
  }, [header]);

  const ex = view?.examples[Math.min(example, (view?.examples.length ?? 1) - 1)];
  const option = <T extends string | number>(
    legend: string,
    key: keyof ChallengeSettings,
    values: T[],
    label: (v: T) => string,
  ) => (
    <Segmented
      legend={legend}
      options={values.map((v) => ({ value: v, label: label(v) }))}
      value={settings[key] as T}
      onChange={(v) => setSettings({ ...settings, [key]: v })}
      control={`g:${key}`}
    />
  );

  return (
    <section className="lv-part" aria-labelledby="l2-p5g">
      <p className="lv-part-kicker">Part G · Final challenge</p>
      <h3 id="l2-p5g">Train a network and take one update apart</h3>
      <p className="lv-muted">
        Everything in Level 2 together, on a real run. Choose a small network, let the engine train it on two
        clusters of points, then follow one update through the record: the prediction, the loss, the backward
        pass, the gradients and the change to every weight and bias. Whether the network ends up perfect does
        not matter; what matters is that you can account for every number.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz" data-tour="challenge-config">
          <div className="lv-viz-title">
            <span>
              Network {describeNetwork(settings)} · {N} examples · {CHALLENGE_EPOCHS} epochs ·{' '}
              {Math.ceil(N / settings.batchSize)}{' '}
              {Math.ceil(N / settings.batchSize) === 1 ? 'update' : 'updates'} per epoch
            </span>
          </div>
          <div className="lv-row" style={{ alignItems: 'flex-start', gap: 'var(--lv-s4)' }}>
            {option('Hidden neurons', 'units', CHALLENGE_OPTIONS.units, String)}
            {option('Hidden activation', 'activation', CHALLENGE_OPTIONS.activation as Activation[], String)}
            {option('Learning rate η', 'lr', CHALLENGE_OPTIONS.lr, String)}
            {option('Batch size', 'batchSize', CHALLENGE_OPTIONS.batchSize, (v) =>
              v === 1 ? '1 (one example)' : v === N ? `${N} (all)` : String(v),
            )}
          </div>
          <div className="lv-row" style={{ marginTop: 'var(--lv-s3)' }}>
            <button
              type="button"
              className="lv-btn lv-btn-primary"
              onClick={() => void runIt()}
              disabled={status === 'training'}
              data-control="g:train"
            >
              {status === 'training'
                ? 'Training…'
                : ready
                  ? 'Train again with these settings'
                  : 'Train the network'}
            </button>
            {changed && ready && (
              <span className="lv-small" role="status">
                The settings have changed since this run ({describeNetwork(shownSettings)}, η ={' '}
                {shownSettings.lr}, batch {shownSettings.batchSize}). Train again to use them.
              </span>
            )}
          </div>
        </div>
      </div>
      {status === 'error' && ours && (
        <ErrorNote title="The run did not complete.">
          <p>{error}</p>
        </ErrorNote>
      )}
      {loadError && <ErrorNote title="Part of the record could not be read.">{loadError}</ErrorNote>}
      {ready && header && (
        <div className="lv-stack" style={{ marginTop: 'var(--lv-s4)' }}>
          <section className="lv-stack" aria-label="Before and after training">
            <div className="lv-viz">
              <div className="lv-viz-title">
                <h4 style={{ margin: 0 }}>Loss after each epoch</h4>
                <EngineBadge text="Recorded training run" instructions={header.length} />
              </div>
              <LossCurve
                losses={epochs.map((e) => e.evalLoss)}
                accuracies={epochs.map((e) => e.evalAccuracy)}
              />
              <p className="lv-small lv-muted" style={{ marginBottom: 0 }}>
                {describeNetwork(shownSettings)}, η = {shownSettings.lr}, batch size {shownSettings.batchSize}
                : the engine’s check after epoch 1 gives loss {fmt(epochs[0]?.evalLoss, 4)} and after epoch{' '}
                {epochs.length} gives {fmt(epochs.at(-1)?.evalLoss, 4)}
                {epochs.at(-1)?.evalAccuracy !== null && epochs.at(-1)?.evalAccuracy !== undefined
                  ? `, with ${pct(epochs.at(-1)!.evalAccuracy!)} of the ${N} points classified correctly`
                  : ''}
                .
              </p>
            </div>
            <div className="lv-viz">
              <div className="lv-viz-title">
                <h4 style={{ margin: 0 }}>The decision, after epoch 1 and after a later epoch</h4>
              </div>
              <label className="lv-row lv-small">
                <span className="lv-control-label">Compare epoch 1 with epoch</span>
                <select
                  className="lv-select"
                  value={compare}
                  onChange={(e) => {
                    setCompare(Number(e.target.value));
                    signal('ch-compare');
                  }}
                  data-control="g:compare"
                >
                  {Array.from({ length: epochs.length }, (_, i) => (
                    <option key={i} value={i}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <div className="lv-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {[0, compare].map((e, k) => {
                  const c = checks[e];
                  return (
                    <div
                      key={`${k}-${e}`}
                      style={{ flex: '1 1 260px', maxWidth: 380 }}
                      data-check-epoch={e + 1}
                    >
                      {c?.boundary ? (
                        <>
                          <DecisionBoundary
                            grid={c.boundary}
                            level={0.5}
                            points={points}
                            size={300}
                            title={`After epoch ${e + 1}: shaded where the network answers 1 (output ≥ 0.5).`}
                          />
                          <p className="lv-small" style={{ margin: 0 }}>
                            After epoch {e + 1}: loss {fmt(c.loss, 4)} · {pct(c.accuracy)} correct
                          </p>
                        </>
                      ) : (
                        <p className="lv-small lv-muted">Reading epoch {e + 1}…</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <BoundaryLegend marks={false} />
            </div>
          </section>

          <section className="lv-viz" aria-label="One update, taken apart" data-tour="challenge-update">
            <div className="lv-viz-title">
              <h4 style={{ margin: 0 }}>One update, taken apart</h4>
              <EngineBadge text="Every value read from the recorded run" />
            </div>
            <div className="lv-row" style={{ gap: 'var(--lv-s4)', flexWrap: 'wrap' }}>
              <label className="lv-row lv-small">
                <span className="lv-control-label">Epoch</span>
                <select
                  className="lv-select"
                  value={epoch}
                  onChange={(e) => {
                    setEpoch(Number(e.target.value));
                    setExample(0);
                  }}
                  data-control="g:epoch"
                >
                  {Array.from({ length: epochs.length }, (_, i) => (
                    <option key={i} value={i}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lv-row lv-small">
                <span className="lv-control-label">Update (batch)</span>
                <select
                  className="lv-select"
                  value={batch}
                  onChange={(e) => {
                    setBatch(Number(e.target.value));
                    setExample(0);
                  }}
                  data-control="g:batch"
                >
                  {Array.from({ length: batches }, (_, i) => (
                    <option key={i} value={i}>
                      {i + 1} of {batches}
                    </option>
                  ))}
                </select>
              </label>
              {view && view.examples.length > 1 && (
                <label className="lv-row lv-small">
                  <span className="lv-control-label">Example in this batch</span>
                  <select
                    className="lv-select"
                    value={example}
                    onChange={(e) => setExample(Number(e.target.value))}
                    data-control="g:example"
                  >
                    {view.examples.map((q, i) => (
                      <option key={i} value={i}>
                        {i + 1} of {view.examples.length} (dataset #{q.datasetIndex + 1})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {view && ex && view.epoch === epoch && view.batch === batch ? (
              <div
                className="lv-stack"
                style={{ marginTop: 'var(--lv-s3)' }}
                data-update={`${epoch + 1}-${batch + 1}`}
              >
                <p className="lv-small" style={{ margin: 0 }}>
                  Epoch {epoch + 1}, update {batch + 1} of {batches}: {view.examples.length}{' '}
                  {view.examples.length === 1 ? 'example' : 'examples'}, then one update of every weight and
                  bias.
                  {view.examples.length > 1
                    ? ` Stages 1 to 4 show example ${example + 1}; the update uses all ${view.examples.length}.`
                    : ''}
                </p>
                <StageCard
                  n={1}
                  title="Forward pass and prediction"
                  name="prediction"
                  at={ex.ids.prediction}
                  jump={jump}
                  visit={visit}
                >
                  <ol className="lv-small" style={{ margin: '0 0 var(--lv-s2)' }} data-list="forward">
                    {ex.forward.map((i) => (
                      <li key={i.id}>
                        <span className="lv-mono">#{i.id}</span> <span className="lv-mono">{i.symbolic}</span>
                        {i.path.layer
                          ? ` (${i.path.layer === 'L1' ? 'hidden layer' : 'output layer'})`
                          : ''}: <span className="lv-mono">{show(Array.from(i.results.out.data))}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="lv-small lv-mono" style={{ margin: 0 }} data-value="prediction">
                    dataset #{ex.datasetIndex + 1}: x = ({show(ex.x, 3)}) → ŷ = {fmt(ex.prediction, 4)} →
                    answer {ex.prediction >= 0.5 ? 1 : 0} · target {ex.target}
                  </p>
                </StageCard>
                <StageCard n={2} title="Loss" name="loss" at={ex.ids.loss} jump={jump} visit={visit}>
                  <p className="lv-small" style={{ margin: 0 }}>
                    Binary cross-entropy of ŷ = {fmt(ex.prediction, 4)} for target {ex.target}:{' '}
                    <strong className="lv-mono" data-value="loss">
                      {fmt(ex.loss, 4)}
                    </strong>
                    {view.examples.length > 1 && <> · the batch’s mean loss {fmt(view.loss, 4)}</>}
                  </p>
                </StageCard>
                <StageCard
                  n={3}
                  title="Backpropagation"
                  name="backward"
                  at={ex.ids.backwardStart}
                  jump={jump}
                  visit={visit}
                >
                  <ol className="lv-small" style={{ margin: 0 }} data-list="backward">
                    {ex.backward.map((i) => (
                      <li key={i.id}>
                        <span className="lv-mono">#{i.id}</span>{' '}
                        {(shownSettings.batchSize === 1 ? LEVEL2_PER_EXAMPLE_WORDING : LEVEL2_WORDING).kind(
                          i.kind,
                        )}
                        {i.path.layer ? ` (${i.path.layer === 'L1' ? 'hidden layer' : 'output layer'})` : ''}:{' '}
                        <span className="lv-mono">{show(Array.from(i.results.grad.data))}</span>
                      </li>
                    ))}
                  </ol>
                </StageCard>
                <StageCard
                  n={4}
                  title="Gradients"
                  name="gradients"
                  at={view.updates[0].ids.accumulate}
                  jump={jump}
                  visit={visit}
                >
                  <div
                    className="lv-table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Gradients of this update"
                  >
                    <table className="lv-table lv-small">
                      <thead>
                        <tr>
                          <th scope="col">Parameter</th>
                          <th scope="col">This example’s gradient</th>
                          <th scope="col">
                            {view.examples.length > 1
                              ? `Mean over the ${view.examples.length} examples, ḡ`
                              : 'ḡ (one example: the same)'}
                          </th>
                          <th scope="col">Checked here</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.updates.map((u) => {
                          const n = view.examples.length;
                          const avg = u.mean.map(
                            (_, k) => view.examples.reduce((t, q) => t + q.grads[u.param].values[k], 0) / n,
                          );
                          const ok = sameValues(avg, u.mean, 1e-12);
                          return (
                            <tr key={u.param}>
                              <td>{u.param}</td>
                              <td className="num">{show(ex.grads[u.param].values)}</td>
                              <td className="num">{show(u.mean)}</td>
                              <td>{ok ? `✓ mean of the ${n} recorded` : '✕ differs'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </StageCard>
                <StageCard n={5} title="Update" name="update" at={view.ids.end} jump={jump} visit={visit}>
                  <div
                    className="lv-table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="The update of every parameter"
                  >
                    <table className="lv-table lv-small">
                      <thead>
                        <tr>
                          <th scope="col">Parameter</th>
                          <th scope="col">Before</th>
                          <th scope="col">Δ = −η·ḡ (η = {view.updates[0].lr})</th>
                          <th scope="col">After</th>
                          <th scope="col">Checked here</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.updates.map((u) => {
                          const ok = sameValues(
                            u.before.map((b, k) => b + u.delta[k]),
                            u.after,
                            1e-15,
                          );
                          return (
                            <tr key={u.param} data-param={u.param}>
                              <td>{u.param}</td>
                              <td className="num">{show(u.before)}</td>
                              <td className="num">{show(u.delta)}</td>
                              <td className="num">{show(u.after)}</td>
                              <td>{ok ? '✓ before + Δ' : '✕ differs'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="lv-small lv-muted" style={{ marginBottom: 0 }}>
                    The values before were made by step #{view.updates[0].ids.before}
                    {view.epoch === 0 && view.batch === 0
                      ? ' (the starting values)'
                      : ' (the previous update)'}
                    . Δ has the opposite sign to ḡ: each parameter moves downhill. Weights are listed in the
                    engine’s order, one input at a time: first input 1’s weight to each hidden neuron, then
                    input 2’s (Experiment 01 drew the same matrix the other way round).
                  </p>
                </StageCard>
              </div>
            ) : (
              <p className="lv-small lv-muted">Reading this update from the record…</p>
            )}
          </section>

          <TraceWordingProvider
            value={shownSettings.batchSize === 1 ? LEVEL2_PER_EXAMPLE_WORDING : LEVEL2_WORDING}
          >
            <TraceExplorer stale={false} />
          </TraceWordingProvider>
        </div>
      )}
    </section>
  );
}
