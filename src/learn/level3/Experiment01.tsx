/**
 * Level 3, Experiment 01 — Learning Rate and Training Dynamics (ADR-099).
 *  - Part A: the shared task trained by the engine with several learning rates, from the same starting weights
 *    (`compareRuns`; no record kept). The verdict per run is read from its loss curve.
 *  - Part B: one recorded run at a chosen learning rate; one parameter value's updates read from the record:
 *    the batch loss, ḡ, η, Δ and the value before and after. "Checked here" recomputes −η·ḡ beside the recorded Δ.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { L3_TASK, l3TaskConfig, level3ById } from '../../experiments/level3';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { EngineBadge, ErrorNote, Segmented, Term } from '../components/ui';
import { fmt, fmtSigned } from '../format';
import { signal } from '../signals';
import { LEVEL_3 } from '../curriculum';
import { rises, useCompare } from './common/compare';
import { RecordedRun } from './common/RecordedRun';
import { RunsChart } from './common/RunsChart';
import type { UpdateRecord } from './common/updates';
import { level3Wording } from './common/wording';

const EXP = level3ById('01')!;
export const LR_CHOICES = [0.05, 0.5, 2, 8, 30];

/** A verdict read from a loss curve: how it moved, not why. */
export function verdict(losses: number[]): string {
  const first = losses[0];
  const last = losses.at(-1)!;
  if (!losses.every(Number.isFinite)) return 'broke down (not a number)';
  if (rises(losses) >= 5) return last < first * 0.5 ? 'learned, but unstable on the way' : 'unstable';
  if (last > first * 0.9) return last > first ? 'got worse' : 'barely moved';
  if (last > first * 0.5) return 'learned slowly';
  return 'learned';
}

export function stepQuestion(u: UpdateRecord | null): LiveQuestion {
  if (!u)
    return {
      id: 'l3-live-step',
      live: true,
      kind: 'predict',
      prompt: 'In Part B, what is the step of an update?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train and record a run in Part B first.',
    };
  const opts = [
    { t: fmtSigned(u.delta, 4), ok: true },
    { t: fmtSigned(u.lr * u.grad, 4), ok: false },
    { t: fmtSigned(-u.grad, 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'l3-live-step',
    live: true,
    kind: 'predict',
    prompt: `In Part B, update ${u.n}: the mean gradient is ḡ = ${fmtSigned(u.grad, 4)} and η = ${u.lr}. What is the step Δ?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `Δ = −η·ḡ = −${u.lr} × ${fmtSigned(u.grad, 4)} = ${fmtSigned(u.delta, 4)}, as the engine recorded.`,
    })),
  };
}

function PartA() {
  const [picked, setPicked] = useState<number[]>(LR_CHOICES);
  const { runs, busy, error, compare } = useCompare();
  return (
    <section className="lv-part" aria-labelledby="l3-1a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l3-1a">Same network, different learning rates</h3>
      <p className="lv-muted">
        The task: {L3_TASK.description}. Every run starts from the same weights and sees the same data; only
        the <Term meaning="The number that scales every step: Δ = −η·ḡ.">learning rate η</Term> differs.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz" data-tour="lr-curves">
          <div className="lv-viz-title">
            <span>Loss after each epoch (one update per epoch)</span>
            <EngineBadge text="Trained by the engine · no record kept" />
          </div>
          {error && <ErrorNote title="The runs did not complete.">{error}</ErrorNote>}
          {runs ? (
            <>
              <RunsChart
                title="Loss after each epoch, for each learning rate"
                series={runs.map((r) => ({ label: r.label, values: r.run.losses }))}
                log
              />
              <div
                className="lv-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="What each learning rate did"
              >
                <table className="lv-table lv-small">
                  <thead>
                    <tr>
                      <th scope="col">η</th>
                      <th scope="col">Loss after epoch 1</th>
                      <th scope="col">After epoch {runs[0].run.losses.length}</th>
                      <th scope="col">Epochs where the loss rose</th>
                      <th scope="col">Read from the curve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.label} data-lr={r.run.lr}>
                        <th scope="row">{r.run.lr}</th>
                        <td className="num">{fmt(r.run.losses[0], 4)}</td>
                        <td className="num">{fmt(r.run.losses.at(-1), 4)}</td>
                        <td className="num">{rises(r.run.losses)}</td>
                        <td>{verdict(r.run.losses)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="lv-small lv-muted">Choose learning rates and train them.</p>
          )}
        </div>
        <section className="lv-panel" aria-label="Learning rates to compare" data-tour="lr-choose">
          <fieldset className="lv-fieldset">
            <legend className="lv-control-label">Learning rates</legend>
            {LR_CHOICES.map((lr) => (
              <label key={lr} className="lv-row lv-small">
                <input
                  type="checkbox"
                  checked={picked.includes(lr)}
                  onChange={(e) =>
                    setPicked(
                      e.target.checked
                        ? [...picked, lr].sort((a, b) => a - b)
                        : picked.filter((q) => q !== lr),
                    )
                  }
                  data-control={`a:lr:${lr}`}
                />
                η = {lr}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            disabled={busy || picked.length === 0}
            onClick={async () => {
              const r = await compare(
                picked.map((lr) => ({ label: `η = ${lr}`, config: l3TaskConfig({ type: 'sgd', lr }) })),
                L3_TASK.dataset,
              );
              if (r) signal('lr-compared');
            }}
            data-control="a:compare"
          >
            {busy ? 'Training…' : 'Train these learning rates'}
          </button>
          <p className="lv-small lv-muted">
            The loss axis is logarithmic: each grid line is ten times the one below, so both 0.01 and 8 fit.
          </p>
        </section>
      </div>
    </section>
  );
}

function UpdateView({
  series,
  n,
  lr,
  jump,
}: {
  series: UpdateRecord[];
  n: number;
  lr: number;
  jump: (id: number) => Promise<void>;
}) {
  const u = series[n];
  const next = series[n + 1];
  const rose = next !== undefined && next.loss > u.loss;
  useEffect(() => {
    if (rose && lr === 8) signal('lr-rise-found');
    if (lr === 0.05 && n === series.length - 1) signal('lr-small-seen');
  }, [rose, lr, n, series.length]);
  const check = -u.lr * u.grad;
  return (
    <div className="lv-stack" data-update={u.n}>
      <dl className="lv-kv">
        <dt>Batch loss before this update</dt>
        <dd className="lv-mono">{fmt(u.loss, 4)}</dd>
        <dt>Mean gradient ḡ</dt>
        <dd className="lv-mono" data-value="grad">
          {fmtSigned(u.grad, 6)}
        </dd>
        <dt>Learning rate η</dt>
        <dd className="lv-mono">{u.lr}</dd>
        <dt>Step Δ (recorded)</dt>
        <dd className="lv-mono" data-value="delta">
          {fmtSigned(u.delta, 6)}{' '}
          <span className="lv-small">
            {Math.abs(check - u.delta) <= 1e-12 * Math.max(1, Math.abs(check))
              ? '✓ −η·ḡ, checked here'
              : '✕ differs from −η·ḡ'}
          </span>
        </dd>
        <dt>Value before → after</dt>
        <dd className="lv-mono" data-value="before-after">
          {fmt(u.before, 4)} → {fmt(u.after, 4)}
        </dd>
        <dt>Batch loss after (the next update’s)</dt>
        <dd className="lv-mono" data-value="loss-after">
          {next ? fmt(next.loss, 4) : '— (last update)'}
          {next && (
            <span className="lv-small">
              {' '}
              {rose ? '↑ the loss rose: this step overshot' : '↓ the loss fell'}
            </span>
          )}
        </dd>
      </dl>
      <div className="lv-row">
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => void jump(u.ids.compute)}
          data-control="b:show"
        >
          Show step #{u.ids.compute} in the record
        </button>
      </div>
    </div>
  );
}

function PartB({ onUpdate }: { onUpdate: (u: UpdateRecord | null) => void }) {
  const [lr, setLr] = useState(2);
  const config = useMemo(() => l3TaskConfig({ type: 'sgd', lr }), [lr]);
  const onSeries = useCallback((s: UpdateRecord[] | null) => onUpdate(s?.[0] ?? null), [onUpdate]);
  return (
    <section className="lv-part" aria-labelledby="l3-1b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l3-1b">Inside one run</h3>
      <p className="lv-muted">
        Train one run and keep its record. Then follow one weight or bias through all 60 updates: each step is
        Δ = −η·ḡ, the learning rate times the batch’s mean gradient.
      </p>
      <Segmented
        legend="Learning rate η for the recorded run"
        options={LR_CHOICES.map((v) => ({ value: v, label: String(v) }))}
        value={lr}
        onChange={(v) => {
          setLr(v);
          signal('lr-run-changed');
        }}
        control="b:lr"
      />
      <RecordedRun
        prefix="b"
        config={config}
        label={`η = ${lr} · plain gradient descent · ${L3_TASK.epochs} updates`}
        dataset={L3_TASK.dataset}
        wording={level3Wording({ optimizer: 'sgd', decay: false })}
        trainText="Train and record this run"
        tour={{ run: 'lr-run', chart: 'lr-path', update: 'lr-update' }}
        defaultChoice={12}
        onSeries={onSeries}
      >
        {({ series, n, jump }) => <UpdateView series={series} n={n} lr={lr} jump={jump} />}
      </RecordedRun>
    </section>
  );
}

export function L3Experiment01() {
  const [u, setU] = useState<UpdateRecord | null>(null);
  const live = useMemo(() => [stepQuestion(u)], [u]);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_3} liveQuestions={live}>
      <PartA />
      <PartB onUpdate={setU} />
    </ExperimentLayout>
  );
}
