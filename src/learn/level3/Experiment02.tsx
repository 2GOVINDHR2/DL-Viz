/**
 * Level 3, Experiment 02 — Momentum: Smoothing the Update (ADR-099).
 *  - Part A: plain gradient descent against momentum (μ = 0.5, 0.9) at the same η on the shared task (`compareRuns`).
 *  - Part B: a recorded momentum run; one parameter value's updates read from the record: ḡ, the previous velocity,
 *    the new velocity (OPTIMIZER_STATE), the step (COMPUTE_UPDATE), and the plain gradient-descent step −η·ḡ for the
 *    same gradient, which is worked out here and labelled so. "Checked here" recomputes μ·v + ḡ and −η·v.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { L3_TASK, l3TaskConfig, level3ById } from '../../experiments/level3';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { EngineBadge, ErrorNote, Segmented, Term } from '../components/ui';
import { LEVEL_3 } from '../curriculum';
import { fmt, fmtSigned } from '../format';
import { signal } from '../signals';
import { useCompare } from './common/compare';
import { RecordedRun } from './common/RecordedRun';
import { RunsChart } from './common/RunsChart';
import type { UpdateRecord } from './common/updates';
import { level3Wording } from './common/wording';

const EXP = level3ById('02')!;
export const MO_LR = 0.5;
export const MU_CHOICES = [0, 0.5, 0.9];
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));

export function velocityQuestion(u: UpdateRecord | null, prev: number, mu: number): LiveQuestion {
  if (!u || u.velocity === undefined)
    return {
      id: 'l3-live-velocity',
      live: true,
      kind: 'predict',
      prompt: 'In Part B, what is the new velocity of an update?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train and record the momentum run in Part B first.',
    };
  const opts = [
    { t: fmtSigned(u.velocity, 4), ok: true },
    { t: fmtSigned(prev + u.grad, 4), ok: false },
    { t: fmtSigned(u.grad, 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'l3-live-velocity',
    live: true,
    kind: 'predict',
    prompt: `In Part B, update ${u.n} (μ = ${mu}): the previous velocity is ${fmtSigned(prev, 4)} and the mean gradient is ḡ = ${fmtSigned(u.grad, 4)}. What is the new velocity?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `v ← μ·v + ḡ = ${mu} × ${fmtSigned(prev, 4)} + ${fmtSigned(u.grad, 4)} = ${fmtSigned(u.velocity!, 4)}, as recorded.`,
    })),
  };
}

function PartA() {
  const { runs, busy, error, compare } = useCompare();
  return (
    <section className="lv-part" aria-labelledby="l3-2a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l3-2a">Plain steps against momentum</h3>
      <p className="lv-muted">
        The task of Experiment 01, with η = {MO_LR} for every run. Plain gradient descent steps by −η·ḡ.{' '}
        <Term meaning="An update that adds a fading memory of earlier gradients to the current one.">
          Momentum
        </Term>{' '}
        steps by −η·v, where the velocity v adds the new gradient to μ times the old velocity.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz">
          <div className="lv-viz-title">
            <span>Loss after each epoch (one update per epoch)</span>
            <EngineBadge text="Trained by the engine · no record kept" />
          </div>
          {error && <ErrorNote title="The runs did not complete.">{error}</ErrorNote>}
          {runs ? (
            <>
              <RunsChart
                title="Loss after each epoch, with and without momentum"
                series={runs.map((r) => ({ label: r.label, values: r.run.losses }))}
                log
              />
              <div
                className="lv-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Final losses with and without momentum"
              >
                <table className="lv-table lv-small">
                  <thead>
                    <tr>
                      <th scope="col">Update rule</th>
                      <th scope="col">Loss after epoch 1</th>
                      <th scope="col">After epoch {runs[0].run.losses.length}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.label} data-run={r.label}>
                        <th scope="row">{r.label}</th>
                        <td className="num">{fmt(r.run.losses[0], 4)}</td>
                        <td className="num">{fmt(r.run.losses.at(-1), 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="lv-small lv-muted">Train the comparison to see the curves.</p>
          )}
        </div>
        <section className="lv-panel" aria-label="Compare update rules" data-tour="mo-compare">
          <p className="lv-small" style={{ marginTop: 0 }}>
            Three runs from the same weights: plain gradient descent, and momentum with μ = 0.5 and μ = 0.9.
          </p>
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            disabled={busy}
            onClick={async () => {
              const r = await compare(
                [
                  { label: 'plain gradient descent', config: l3TaskConfig({ type: 'sgd', lr: MO_LR }) },
                  {
                    label: 'momentum μ = 0.5',
                    config: l3TaskConfig({ type: 'momentum', lr: MO_LR, momentum: 0.5 }),
                  },
                  {
                    label: 'momentum μ = 0.9',
                    config: l3TaskConfig({ type: 'momentum', lr: MO_LR, momentum: 0.9 }),
                  },
                ],
                L3_TASK.dataset,
              );
              if (r) signal('mo-compared');
            }}
            data-control="a:compare"
          >
            {busy ? 'Training…' : 'Train the comparison'}
          </button>
        </section>
      </div>
    </section>
  );
}

function MomentumUpdate({
  series,
  n,
  mu,
  jump,
}: {
  series: UpdateRecord[];
  n: number;
  mu: number;
  jump: (id: number) => Promise<void>;
}) {
  const u = series[n];
  const prev = n > 0 ? series[n - 1].velocity! : 0;
  const plain = -u.lr * u.grad;
  const v = u.velocity!;
  const ratio = plain !== 0 ? u.delta / plain : NaN;
  useEffect(() => {
    if (mu === 0) signal('mo-zero-seen');
    if (Math.abs(ratio) > 2) signal('mo-build-seen');
  }, [mu, ratio]);
  return (
    <div className="lv-stack" data-update={u.n}>
      <dl className="lv-kv">
        <dt>Mean gradient ḡ</dt>
        <dd className="lv-mono" data-value="grad">
          {fmtSigned(u.grad, 6)}
        </dd>
        <dt>Previous velocity v</dt>
        <dd className="lv-mono" data-value="prev">
          {fmtSigned(prev, 6)}
          {n === 0 && <span className="lv-small"> (starts at 0)</span>}
        </dd>
        <dt>New velocity μ·v + ḡ (recorded)</dt>
        <dd className="lv-mono" data-value="velocity">
          {fmtSigned(v, 6)}{' '}
          <span className="lv-small">{close(mu * prev + u.grad, v) ? '✓ checked here' : '✕ differs'}</span>
        </dd>
        <dt>Step Δ = −η·v (recorded)</dt>
        <dd className="lv-mono" data-value="delta">
          {fmtSigned(u.delta, 6)}{' '}
          <span className="lv-small">{close(-u.lr * v, u.delta) ? '✓ checked here' : '✕ differs'}</span>
        </dd>
        <dt>Plain gradient descent would step −η·ḡ</dt>
        <dd className="lv-mono" data-value="plain">
          {fmtSigned(plain, 6)} <span className="lv-small">(worked out here, for comparison)</span>
        </dd>
        <dt>Momentum step ÷ plain step</dt>
        <dd className="lv-mono" data-value="ratio">
          {Number.isFinite(ratio) ? `${fmt(ratio, 2)}×` : '—'}
        </dd>
        <dt>Value before → after</dt>
        <dd className="lv-mono">
          {fmt(u.before, 4)} → {fmt(u.after, 4)}
        </dd>
      </dl>
      <RunsChart
        title="Mean gradient ḡ and velocity v at each update"
        series={[
          { label: 'ḡ', values: series.map((q) => q.grad) },
          { label: 'v', values: series.map((q) => q.velocity!) },
        ]}
        xLabel="update"
        marker={n}
        height={190}
      />
      <div className="lv-row">
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => void jump(u.ids.state ?? u.ids.compute)}
          data-control="b:show"
        >
          Show step #{u.ids.state ?? u.ids.compute} in the record
        </button>
      </div>
    </div>
  );
}

function PartB({ onUpdate }: { onUpdate: (u: UpdateRecord | null, prev: number, mu: number) => void }) {
  const [mu, setMu] = useState(0.9);
  const config = useMemo(() => l3TaskConfig({ type: 'momentum', lr: MO_LR, momentum: mu }), [mu]);
  const onSeries = useCallback(
    (s: UpdateRecord[] | null) => onUpdate(s?.[1] ?? null, s?.[0]?.velocity ?? 0, mu),
    [onUpdate, mu],
  );
  return (
    <section className="lv-part" aria-labelledby="l3-2b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l3-2b">The velocity, update by update</h3>
      <p className="lv-muted">
        The engine records the{' '}
        <Term meaning="The optimiser’s memory for one parameter: v ← μ·v + ḡ.">velocity</Term> of every weight
        and bias at every update, as the optimiser’s state. Follow one of them: when the gradient keeps its
        sign, the velocity grows past it; when the gradient changes sign, the velocity lags and smooths it.
      </p>
      <Segmented
        legend="Momentum coefficient μ"
        options={MU_CHOICES.map((v) => ({ value: v, label: String(v) }))}
        value={mu}
        onChange={(v) => {
          setMu(v);
          signal('mo-mu-changed');
        }}
        control="b:mu"
      />
      <RecordedRun
        prefix="b"
        signals="mo"
        config={config}
        label={`momentum μ = ${mu}, η = ${MO_LR} · ${L3_TASK.epochs} updates`}
        dataset={L3_TASK.dataset}
        wording={level3Wording({ optimizer: 'momentum', decay: false })}
        trainText="Train and record the momentum run"
        tour={{ run: 'mo-run', chart: 'mo-chart', update: 'mo-table' }}
        defaultChoice={18}
        onSeries={onSeries}
      >
        {({ series, n, jump }) => <MomentumUpdate series={series} n={n} mu={mu} jump={jump} />}
      </RecordedRun>
    </section>
  );
}

export function L3Experiment02() {
  const [q, setQ] = useState<{ u: UpdateRecord | null; prev: number; mu: number }>({
    u: null,
    prev: 0,
    mu: 0.9,
  });
  const onUpdate = useCallback(
    (u: UpdateRecord | null, prev: number, mu: number) => setQ({ u, prev, mu }),
    [],
  );
  const live = useMemo(() => [velocityQuestion(q.u, q.prev, q.mu)], [q]);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_3} liveQuestions={live}>
      <PartA />
      <PartB onUpdate={onUpdate} />
    </ExperimentLayout>
  );
}
