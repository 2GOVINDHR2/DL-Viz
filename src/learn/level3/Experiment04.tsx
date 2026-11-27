/**
 * Level 3, Experiment 04 — Overfitting and Regularization (ADR-099).
 *  - Part A: a recorded run on 24 noisy training points with 200 held-out points (ADR-098's held-out split). The
 *    training and held-out loss after every epoch are the engine's own checks (EVAL_END `loss`, `testLoss`, via the
 *    epoch summaries); the decision map at a chosen epoch is the check's recorded grid. The lowest held-out loss is
 *    read from the curve.
 *  - Part B: the same network with λ ∈ {0, 0.003, 0.01, 0.03}, trained by the engine (`compareRuns`, held-out losses
 *    included).
 *  - Part C: with λ > 0, one weight's updates read from the same record: ḡ, λ·w and ḡ + λ·w (GRAD_ACCUMULATE), and the
 *    Adam step. "Checked here" recomputes ḡ + λ·w and λ·w from the recorded values.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Instruction } from '../../core/npm/ir';
import { L3_OVERFIT, l3OverfitConfig, level3ById } from '../../experiments/level3';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { EngineBadge, ErrorNote, Segmented, Term } from '../components/ui';
import { LEVEL_3 } from '../curriculum';
import { fmt, fmtSigned, pct } from '../format';
import { signal } from '../signals';
import { TraceExplorer } from '../trace/TraceExplorer';
import { TraceWordingProvider } from '../trace/wording';
import { BoundaryLegend, DecisionBoundary } from '../viz/DecisionBoundary';
import { useCompare } from './common/compare';
import { sameConfig, useOwnRun } from './common/ownRun';
import { RunsChart } from './common/RunsChart';
import { readUpdateSeries, type UpdateRecord } from './common/updates';
import { level3Wording } from './common/wording';

const EXP = level3ById('04')!;
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));

/** The epoch (0-based) with the lowest value, read from a curve. */
export const lowest = (values: number[]): number => values.reduce((b, v, i) => (v < values[b] ? i : b), 0);

export function decayQuestion(u: UpdateRecord | null, lambda: number): LiveQuestion {
  if (!u || u.regularized === undefined)
    return {
      id: 'l3-live-decay',
      live: true,
      kind: 'predict',
      prompt: 'In Part C, what gradient does the optimiser receive with weight decay?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train a run with λ > 0 in Part A first.',
    };
  const opts = [
    { t: fmtSigned(u.regularized, 5), ok: true },
    { t: fmtSigned(u.grad, 5), ok: false },
    { t: fmtSigned(u.grad - lambda * u.before, 5), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'l3-live-decay',
    live: true,
    kind: 'predict',
    prompt: `In Part C, update ${u.n}: the weight is w = ${fmtSigned(u.before, 5)}, its mean gradient ḡ = ${fmtSigned(u.grad, 5)}, and λ = ${lambda}. What gradient does the optimiser receive?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `ḡ + λ·w = ${fmtSigned(u.grad, 5)} + ${lambda} × ${fmtSigned(u.before, 5)} = ${fmtSigned(u.regularized!, 5)}, as recorded.`,
    })),
  };
}

function PartA({
  lambda,
  setLambda,
  run,
}: {
  lambda: number;
  setLambda: (v: number) => void;
  run: ReturnType<typeof useOwnRun>;
}) {
  const [epoch, setEpoch] = useState<number | null>(null);
  const [grid, setGrid] = useState<{
    resolution: number;
    bounds: [number, number, number, number];
    values: number[];
  } | null>(null);
  const { ready, header, epochs, read } = run;
  const train = epochs.map((e) => e.evalLoss);
  const held = epochs.map((e) => e.testLoss ?? NaN);
  const best = held.length ? lowest(held) : 0;
  const k = epoch ?? best;
  useEffect(() => {
    if (!ready || !header) return;
    let live = true;
    read(header.epochStarts[k], header.epochStarts[k + 1])
      .then((ins: Instruction[]) => {
        const ev = ins.find((i) => i.kind === 'EVAL_END');
        const b = ev?.meta.bounds as number[] | undefined;
        if (live && ev?.results.boundary && b)
          setGrid({
            resolution: ev.results.boundary.shape[0],
            bounds: [b[0], b[1], b[2], b[3]],
            values: Array.from(ev.results.boundary.data),
          });
      })
      .catch(() => live && setGrid(null));
    return () => {
      live = false;
    };
  }, [ready, header, read, k]);
  useEffect(() => {
    if (epoch !== null && ready && epoch === best) signal('of-best-found');
  }, [epoch, best, ready]);
  const points = useMemo(() => {
    const d = header?.dataset;
    if (!d?.xs || !d.ys) return [];
    return Array.from({ length: d.n }, (_, i) => ({
      x: [d.xs!.data[2 * i], d.xs!.data[2 * i + 1]],
      target: d.ys!.data[i],
    }));
  }, [header]);
  const e = epochs[k];
  return (
    <section className="lv-part" aria-labelledby="l3-4a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l3-4a">Training loss is not the goal</h3>
      <p className="lv-muted">
        A network with 32 hidden neurons is trained on only 24 noisy points. After every epoch the engine also
        checks 200{' '}
        <Term meaning="Examples kept aside and never used for updates; their loss shows how the network does on new data.">
          held-out
        </Term>{' '}
        points from the same source, which it never trains on. A falling training loss with a rising held-out
        loss is{' '}
        <Term meaning="Fitting the training examples, noise included, so closely that new examples are predicted worse.">
          overfitting
        </Term>
        .
      </p>
      <div className="lv-row" style={{ alignItems: 'flex-end', gap: 'var(--lv-s4)' }} data-tour="of-train">
        <Segmented
          legend="Weight decay λ for the recorded run"
          options={L3_OVERFIT.decays.map((v) => ({ value: v, label: String(v) }))}
          value={lambda}
          onChange={setLambda}
          control="a:lambda"
        />
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          disabled={run.training}
          onClick={() => {
            setEpoch(null);
            setGrid(null);
            void run.train(l3OverfitConfig(lambda), `λ = ${lambda}`, L3_OVERFIT.dataset).then(() => {
              if (lambda > 0) signal('of-decay-run');
            });
          }}
          data-control="a:train"
        >
          {run.training ? 'Training…' : 'Train and record'}
        </button>
        <span className="lv-small lv-muted">
          2-32-1 tanh · Adam, η = {L3_OVERFIT.lr} · {L3_OVERFIT.epochs} epochs · 24 training points, 200
          held-out
        </span>
      </div>
      {run.error && <ErrorNote title="The run did not complete.">{run.error}</ErrorNote>}
      {ready && header && e && (
        <div className="lv-grid-main" style={{ marginTop: 'var(--lv-s4)' }}>
          <div className="lv-viz" data-tour="of-curves">
            <div className="lv-viz-title">
              <span>Loss after each epoch (λ = {run.config?.optimizer.weightDecay ?? 0})</span>
              <EngineBadge text="Recorded training run" instructions={header.length} />
            </div>
            <RunsChart
              title="Training and held-out loss after each epoch"
              series={[
                { label: 'training loss (24 points)', values: train },
                { label: 'held-out loss (200 points)', values: held },
              ]}
              log
              marker={k}
            />
            <label className="lv-row lv-small">
              <span className="lv-control-label">Epoch</span>
              <input
                type="range"
                min={1}
                max={epochs.length}
                value={k + 1}
                onChange={(ev) => {
                  setEpoch(Number(ev.target.value) - 1);
                  signal('of-epoch-moved');
                }}
                aria-label="Epoch to inspect"
                data-control="a:epoch"
                style={{ flex: '1 1 200px' }}
              />
              <span className="lv-mono" data-value="epoch">
                {k + 1}
              </span>
            </label>
            <dl className="lv-kv" data-epoch={k + 1}>
              <dt>Training loss / correct</dt>
              <dd className="lv-mono" data-value="train">
                {fmt(e.evalLoss, 4)} · {e.evalAccuracy === null ? '—' : pct(e.evalAccuracy)}
              </dd>
              <dt>Held-out loss / correct</dt>
              <dd className="lv-mono" data-value="held">
                {fmt(e.testLoss, 4)} · {e.testAccuracy === null ? '—' : pct(e.testAccuracy)}
              </dd>
              <dt>Lowest held-out loss (read from the curve)</dt>
              <dd className="lv-mono" data-value="best">
                {fmt(held[best], 4)} after epoch {best + 1}
              </dd>
            </dl>
          </div>
          <div className="lv-viz">
            <h4 style={{ marginTop: 0 }}>The network’s decision after epoch {k + 1}</h4>
            {grid ? (
              <>
                <DecisionBoundary
                  grid={grid}
                  level={0.5}
                  points={points}
                  size={280}
                  title={`After epoch ${k + 1}: shaded where the network answers 1. The marks are the 24 training points.`}
                />
                <BoundaryLegend marks={false} />
              </>
            ) : (
              <p className="lv-small lv-muted">Reading the check of epoch {k + 1}…</p>
            )}
            <p className="lv-small lv-muted">
              Late in training without weight decay, the boundary bends around single noisy training points:
              that detail does not carry over to new points.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function PartB() {
  const { runs, busy, error, compare } = useCompare();
  return (
    <section className="lv-part" aria-labelledby="l3-4b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l3-4b">Different amounts of weight decay</h3>
      <p className="lv-muted">
        <Term meaning="Adding (λ/2)·‖W‖² to the loss; its gradient adds λ·w to every weight’s gradient.">
          Weight decay
        </Term>{' '}
        is the simplest form of{' '}
        <Term meaning="Changing training to prefer simpler networks, so that they generalize better.">
          regularization
        </Term>
        : the loss gains a penalty (λ/2)·‖W‖² on the size of the weights. The same network, the same data,
        four values of λ.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz">
          <div className="lv-viz-title">
            <span>Held-out loss after each epoch</span>
            <EngineBadge text="Trained by the engine · no record kept" />
          </div>
          {error && <ErrorNote title="The runs did not complete.">{error}</ErrorNote>}
          {runs ? (
            <>
              <RunsChart
                title="Held-out loss after each epoch, for each λ"
                series={runs.map((r) => ({ label: r.label, values: r.run.testLosses ?? [] }))}
                log
              />
              <div className="lv-table-wrap" tabIndex={0} role="region" aria-label="Weight decay compared">
                <table className="lv-table lv-small">
                  <thead>
                    <tr>
                      <th scope="col">λ</th>
                      <th scope="col">Training loss at the end</th>
                      <th scope="col">Held-out loss at the end</th>
                      <th scope="col">Lowest held-out loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r, i) => {
                      const t = r.run.testLosses ?? [];
                      const b = lowest(t);
                      return (
                        <tr key={r.label} data-lambda={L3_OVERFIT.decays[i]}>
                          <th scope="row">{L3_OVERFIT.decays[i]}</th>
                          <td className="num">{fmt(r.run.losses.at(-1), 4)}</td>
                          <td className="num">{fmt(t.at(-1), 4)}</td>
                          <td className="num">
                            {fmt(t[b], 4)} (epoch {b + 1})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="lv-small lv-muted">Train the comparison to see the curves.</p>
          )}
        </div>
        <section className="lv-panel" aria-label="Compare weight decay" data-tour="of-compare">
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            disabled={busy}
            onClick={async () => {
              const r = await compare(
                L3_OVERFIT.decays.map((wd) => ({ label: `λ = ${wd}`, config: l3OverfitConfig(wd) })),
                L3_OVERFIT.dataset,
              );
              if (r) signal('of-compared');
            }}
            data-control="b:compare"
          >
            {busy ? 'Training…' : 'Train the comparison'}
          </button>
          <p className="lv-small lv-muted">
            Four runs of {L3_OVERFIT.epochs} epochs each; this takes a few seconds.
          </p>
        </section>
      </div>
    </section>
  );
}

function PartC({ lambda, run }: { lambda: number; run: ReturnType<typeof useOwnRun> }) {
  const [n, setN] = useState(0);
  const [series, setSeries] = useState<UpdateRecord[] | null>(null);
  const { ready, header, read } = run;
  const decayed = ready && lambda > 0;
  useEffect(() => {
    if (!decayed || !header) return;
    let live = true;
    // The output weight from hidden neuron 1, over the first 100 updates.
    readUpdateSeries(read, header, 'L2.W', 0, 100).then((s) => live && setSeries(s));
    return () => {
      live = false;
    };
  }, [decayed, header, read]);
  const u = series?.[n];
  return (
    <section className="lv-part" aria-labelledby="l3-4c" data-tour="of-update">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l3-4c">Weight decay inside an update</h3>
      <p className="lv-muted">
        The penalty (λ/2)·w² has the gradient λ·w, so every weight’s gradient gains λ·w before the optimiser
        uses it: a pull towards 0 at every update, stronger the larger the weight. Biases are not decayed.
      </p>
      {!decayed ? (
        <p className="lv-small lv-muted">Choose λ greater than 0 in Part A and train, then come back here.</p>
      ) : !u ? (
        <p className="lv-small lv-muted">Reading the updates from the record…</p>
      ) : (
        <div className="lv-panel" data-update={u.n}>
          <label className="lv-row lv-small">
            <span className="lv-control-label">Update</span>
            <input
              type="range"
              min={1}
              max={series!.length}
              value={n + 1}
              onChange={(ev) => setN(Number(ev.target.value) - 1)}
              aria-label="Update number for weight decay"
              data-control="c:update"
            />
            <span className="lv-mono">{n + 1}</span>
          </label>
          <p className="lv-small" style={{ marginTop: 0 }}>
            The output weight from hidden neuron 1, λ = {lambda}:
          </p>
          <dl className="lv-kv">
            <dt>Weight w before</dt>
            <dd className="lv-mono" data-value="w">
              {fmtSigned(u.before, 6)}
            </dd>
            <dt>Mean gradient ḡ of the data loss</dt>
            <dd className="lv-mono" data-value="grad">
              {fmtSigned(u.grad, 6)}
            </dd>
            <dt>Penalty gradient λ·w (recorded)</dt>
            <dd className="lv-mono" data-value="decay">
              {fmtSigned(u.decay!, 6)}{' '}
              <span className="lv-small">
                {close(lambda * u.before, u.decay!) ? '✓ checked here' : '✕ differs'}
              </span>
            </dd>
            <dt>What the optimiser receives, ḡ + λ·w (recorded)</dt>
            <dd className="lv-mono" data-value="regularized">
              {fmtSigned(u.regularized!, 6)}{' '}
              <span className="lv-small">
                {close(u.grad + u.decay!, u.regularized!) ? '✓ checked here' : '✕ differs'}
              </span>
            </dd>
            <dt>Adam’s step Δ (recorded)</dt>
            <dd className="lv-mono" data-value="delta">
              {fmtSigned(u.delta, 6)}
            </dd>
            <dt>Weight after</dt>
            <dd className="lv-mono">{fmtSigned(u.after, 6)}</dd>
          </dl>
          <EngineBadge text="Recorded training run" />
        </div>
      )}
    </section>
  );
}

export function L3Experiment04() {
  const [lambda, setLambda] = useState(0);
  const run = useOwnRun((c) => L3_OVERFIT.decays.some((wd) => sameConfig(c, l3OverfitConfig(wd))));
  const trainedLambda = run.config?.optimizer.weightDecay ?? lambda;
  const [u, setU] = useState<UpdateRecord | null>(null);
  useEffect(() => {
    if (!run.ready || !run.header || !(trainedLambda > 0)) {
      setU(null);
      return;
    }
    let live = true;
    readUpdateSeries(run.read, run.header, 'L2.W', 0, 3).then((s) => live && setU(s[2] ?? null));
    return () => {
      live = false;
    };
  }, [run.ready, run.header, run.read, trainedLambda]);
  const live = useMemo(() => [decayQuestion(u, trainedLambda)], [u, trainedLambda]);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_3} liveQuestions={live}>
      <PartA lambda={lambda} setLambda={setLambda} run={run} />
      <PartB />
      <PartC lambda={trainedLambda} run={run} />
      {run.ready && (
        <TraceWordingProvider value={level3Wording({ optimizer: 'adam', decay: trainedLambda > 0 })}>
          <TraceExplorer stale={false} />
        </TraceWordingProvider>
      )}
    </ExperimentLayout>
  );
}
