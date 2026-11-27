/**
 * Level 3, Experiment 03 — Adam: Adaptive Optimization (ADR-099).
 *  - Part A: plain gradient descent, momentum and Adam at the same η on the shared task (`compareRuns`).
 *  - Part B: a recorded Adam run; one parameter value's updates read from the record: ḡ, m, v, the step number t,
 *    m̂, v̂ (OPTIMIZER_STATE) and Δ (COMPUTE_UPDATE). "Checked here" recomputes each from the previous values with
 *    Adam's rule, beside the recorded value.
 *  - Part C: every parameter value at one update: its recorded ḡ and Δ, to see the step adapt to each gradient's
 *    scale.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Instruction, TraceHeader } from '../../core/npm/ir';
import { ADAM_DEFAULTS, L3_TASK, l3TaskConfig, level3ById } from '../../experiments/level3';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { EngineBadge, ErrorNote, Term } from '../components/ui';
import { LEVEL_3 } from '../curriculum';
import { fmt, fmtSigned } from '../format';
import { signal } from '../signals';
import { useRun } from '../trace/store';
import { useCompare } from './common/compare';
import { RecordedRun } from './common/RecordedRun';
import { RunsChart } from './common/RunsChart';
import { parameterChoices, type UpdateRecord } from './common/updates';
import { level3Wording } from './common/wording';

const EXP = level3ById('03')!;
export const AD_LR = 0.05;
export const adamConfig = () => l3TaskConfig({ type: 'adam', lr: AD_LR, ...ADAM_DEFAULTS });
const { beta1: B1, beta2: B2, epsilon: EPS } = ADAM_DEFAULTS;
const close = (a: number, b: number, rel = 1e-12): boolean =>
  Math.abs(a - b) <= rel * Math.max(1e-300, Math.abs(b), Math.abs(a));

export function correctionQuestion(u: UpdateRecord | null): LiveQuestion {
  const m = u?.m;
  const t = u?.t;
  if (!u || m === undefined || t === undefined)
    return {
      id: 'l3-live-mhat',
      live: true,
      kind: 'predict',
      prompt: 'In Part B, what is the corrected first moment m̂?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train and record the Adam run in Part B first.',
    };
  const opts = [
    { t: fmtSigned(u.mHat!, 5), ok: true },
    { t: fmtSigned(m, 5), ok: false },
    { t: fmtSigned(m * (1 - B1 ** t), 5), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'l3-live-mhat',
    live: true,
    kind: 'predict',
    prompt: `In Part B, update t = ${t}: m = ${fmtSigned(m, 5)} and β₁ = ${B1}. What is m̂ = m / (1 − β₁ᵗ)?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `m̂ = ${fmtSigned(m, 5)} / (1 − ${B1}^${t}) = ${fmtSigned(u.mHat!, 5)}, as recorded.`,
    })),
  };
}

function PartA() {
  const { runs, busy, error, compare } = useCompare();
  return (
    <section className="lv-part" aria-labelledby="l3-3a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l3-3a">Three optimisers, one task</h3>
      <p className="lv-muted">
        The task of Experiments 01 and 02, with the same small learning rate η = {AD_LR} for all three: plain
        gradient descent, momentum (μ = 0.9) and{' '}
        <Term meaning="An optimiser with two running averages per parameter and a step sized for each parameter separately.">
          Adam
        </Term>
        .
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
                title="Loss after each epoch, for three optimisers"
                series={runs.map((r) => ({ label: r.label, values: r.run.losses }))}
                log
              />
              <div
                className="lv-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Final losses of the three optimisers"
              >
                <table className="lv-table lv-small">
                  <thead>
                    <tr>
                      <th scope="col">Optimiser (η = {AD_LR})</th>
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
        <section className="lv-panel" aria-label="Compare optimisers" data-tour="ad-compare">
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            disabled={busy}
            onClick={async () => {
              const r = await compare(
                [
                  { label: 'plain gradient descent', config: l3TaskConfig({ type: 'sgd', lr: AD_LR }) },
                  {
                    label: 'momentum μ = 0.9',
                    config: l3TaskConfig({ type: 'momentum', lr: AD_LR, momentum: 0.9 }),
                  },
                  { label: 'Adam', config: adamConfig() },
                ],
                L3_TASK.dataset,
              );
              if (r) signal('ad-compared');
            }}
            data-control="a:compare"
          >
            {busy ? 'Training…' : 'Train the comparison'}
          </button>
          <p className="lv-small lv-muted">
            Adam uses β₁ = {B1}, β₂ = {B2} and ε = {EPS}, the usual defaults.
          </p>
        </section>
      </div>
    </section>
  );
}

function AdamUpdate({
  series,
  n,
  jump,
}: {
  series: UpdateRecord[];
  n: number;
  jump: (id: number) => Promise<void>;
}) {
  const u = series[n];
  const p = n > 0 ? series[n - 1] : null;
  const pm = p?.m ?? 0;
  const pv = p?.v ?? 0;
  const t = u.t!;
  const checks = {
    m: close(B1 * pm + (1 - B1) * u.grad, u.m!),
    v: close(B2 * pv + (1 - B2) * u.grad * u.grad, u.v!),
    mHat: close(u.m! / (1 - B1 ** t), u.mHat!),
    vHat: close(u.v! / (1 - B2 ** t), u.vHat!),
    delta: close((-u.lr * u.mHat!) / (Math.sqrt(u.vHat!) + EPS), u.delta),
  };
  useEffect(() => {
    if (n === 0) signal('ad-first-seen');
  }, [n]);
  const ok = (b: boolean) => <span className="lv-small">{b ? ' ✓ checked here' : ' ✕ differs'}</span>;
  return (
    <div className="lv-stack" data-update={u.n}>
      <dl className="lv-kv">
        <dt>Mean gradient ḡ</dt>
        <dd className="lv-mono" data-value="grad">
          {fmtSigned(u.grad, 6)}
        </dd>
        <dt>Step number t</dt>
        <dd className="lv-mono" data-value="t">
          {t}
        </dd>
        <dt>First moment m = β₁·m + (1−β₁)·ḡ</dt>
        <dd className="lv-mono" data-value="m">
          {fmtSigned(u.m!, 6)}
          {ok(checks.m)}
        </dd>
        <dt>Second moment v = β₂·v + (1−β₂)·ḡ²</dt>
        <dd className="lv-mono" data-value="v">
          {u.v!.toExponential(4).replace('-', '−')}
          {ok(checks.v)}
        </dd>
        <dt>Bias-corrected m̂ = m / (1−β₁ᵗ)</dt>
        <dd className="lv-mono" data-value="mhat">
          {fmtSigned(u.mHat!, 6)}
          {ok(checks.mHat)}
        </dd>
        <dt>Bias-corrected v̂ = v / (1−β₂ᵗ)</dt>
        <dd className="lv-mono" data-value="vhat">
          {u.vHat!.toExponential(4).replace('-', '−')}
          {ok(checks.vHat)}
        </dd>
        <dt>Step Δ = −η·m̂ / (√v̂ + ε)</dt>
        <dd className="lv-mono" data-value="delta">
          {fmtSigned(u.delta, 6)}
          {ok(checks.delta)}
        </dd>
        <dt>Step size compared with η</dt>
        <dd className="lv-mono" data-value="step-over-lr">
          |Δ| = {fmt(Math.abs(u.delta) / u.lr, 3)} × η
        </dd>
        <dt>Value before → after</dt>
        <dd className="lv-mono">
          {fmt(u.before, 4)} → {fmt(u.after, 4)}
        </dd>
      </dl>
      {n === 0 && (
        <p className="lv-callout lv-small" style={{ margin: 0 }}>
          Update 1: m is only (1−β₁)·ḡ = 0.1·ḡ because it started at 0; dividing by 1−β₁¹ = 0.1 gives m̂ = ḡ
          exactly. Likewise v̂ = ḡ², so the first step is −η·ḡ/|ḡ| = ±η (up to ε).
        </p>
      )}
      <RunsChart
        title="Mean gradient ḡ and corrected first moment m̂ at each update"
        series={[
          { label: 'ḡ', values: series.map((q) => q.grad) },
          { label: 'm̂', values: series.map((q) => q.mHat!) },
        ]}
        xLabel="update"
        marker={n}
        height={180}
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

export interface StepRow {
  label: string;
  grad: number;
  delta: number;
}

/** Every parameter value's recorded ḡ and Δ at one update (one epoch of the full-batch run). */
export function stepsAt(header: TraceHeader, epochIns: Instruction[]): StepRow[] {
  const choices = parameterChoices(header);
  const acc = new Map(
    epochIns.filter((i) => i.kind === 'GRAD_ACCUMULATE').map((i) => [String(i.meta.param), i]),
  );
  const cmp = new Map(
    epochIns.filter((i) => i.kind === 'COMPUTE_UPDATE').map((i) => [String(i.meta.param), i]),
  );
  return choices.map((c) => ({
    label: c.label,
    grad: acc.get(c.param)!.results.grad.data[c.k],
    delta: cmp.get(c.param)!.results.delta.data[c.k],
  }));
}

function PartC({
  header,
  read,
}: {
  header: TraceHeader | null;
  read: (a: number, b: number) => Promise<Instruction[]>;
}) {
  const [n, setN] = useState(10);
  // The rows are kept with the update they were read for, so the text never names one update while showing another's
  // values (the slider moves before the new update has been read).
  const [at, setAt] = useState<{ n: number; rows: StepRow[] } | null>(null);
  const rows = at?.rows ?? null;
  useEffect(() => {
    if (!header) return;
    let live = true;
    read(header.epochStarts[n - 1], header.epochStarts[n])
      .then((ins) => live && setAt({ n, rows: stepsAt(header, ins) }))
      .catch(() => live && setAt(null));
    return () => {
      live = false;
    };
  }, [header, read, n]);
  const sorted = rows ? [...rows].sort((a, b) => Math.abs(b.grad) - Math.abs(a.grad)) : [];
  const g = sorted.map((r) => Math.abs(r.grad)).filter((x) => x > 0);
  const d = sorted.map((r) => Math.abs(r.delta)).filter((x) => x > 0);
  const gRatio = g.length ? Math.max(...g) / Math.min(...g) : NaN;
  const maxStep = d.length ? Math.max(...d) / AD_LR : NaN;
  // Pairs whose gradients differ by more than 10× but whose steps differ by less than 3×: plain gradient descent
  // could never produce one, since its steps are proportional to the gradients.
  const pairs = rows
    ? rows.reduce(
        (t, a) =>
          t +
          rows.filter(
            (q) =>
              Math.abs(q.grad) > 0 &&
              Math.abs(a.grad) > 10 * Math.abs(q.grad) &&
              Math.max(Math.abs(a.delta), Math.abs(q.delta)) <
                3 * Math.min(Math.abs(a.delta), Math.abs(q.delta)),
          ).length,
        0,
      )
    : 0;
  useEffect(() => {
    if (pairs > 0) signal('ad-scale-seen');
  }, [pairs]);
  return (
    <section className="lv-part" aria-labelledby="l3-3c" data-tour="ad-adaptive">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l3-3c">A step sized for each parameter</h3>
      <p className="lv-muted">
        At one update of the recorded Adam run, every weight and bias: its gradient and its step. With plain
        gradient descent every step would be η·ḡ, proportional to the gradient. Adam divides each average
        gradient by its own typical size √v̂, so a step is at most about η whatever the size of the gradient,
        and smaller where the gradient has been changing sign (then m̂ is small compared with √v̂).
      </p>
      {!header ? (
        <p className="lv-small lv-muted">Train and record the Adam run in Part B first.</p>
      ) : (
        <div className="lv-viz">
          <div className="lv-viz-title">
            <label className="lv-row lv-small">
              <span className="lv-control-label">Update</span>
              <input
                type="range"
                min={1}
                max={header.epochStarts.length - 1}
                value={n}
                onChange={(e) => {
                  setN(Number(e.target.value));
                  signal('ad-update-picked');
                }}
                aria-label="Update number for the step sizes"
                data-control="c:update"
              />
              <span className="lv-mono">{n}</span>
            </label>
            <EngineBadge text="Recorded training run" />
          </div>
          {rows && (
            <>
              <p className="lv-small" data-value="ratios">
                At update {at!.n}: the largest gradient is {fmt(gRatio, 1)}× the smallest, and no step is
                larger than {fmt(maxStep, 2)}·η. {pairs} pairs of parameters have gradients more than 10×
                apart but steps less than 3× apart; with plain gradient descent their steps would also be more
                than 10× apart.
              </p>
              <div
                className="lv-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Gradient and step of every parameter"
              >
                <table className="lv-table lv-small">
                  <thead>
                    <tr>
                      <th scope="col">Parameter (largest gradient first)</th>
                      <th scope="col">ḡ</th>
                      <th scope="col">Δ</th>
                      <th scope="col">|Δ| ÷ η</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td className="num">{fmtSigned(r.grad, 5)}</td>
                        <td className="num">{fmtSigned(r.delta, 5)}</td>
                        <td className="num">{fmt(Math.abs(r.delta) / AD_LR, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function PartsBC({ onUpdate }: { onUpdate: (u: UpdateRecord | null) => void }) {
  const config = useMemo(() => adamConfig(), []);
  const [ctx, setCtx] = useState<{
    header: TraceHeader;
    read: (a: number, b: number) => Promise<Instruction[]>;
  } | null>(null);
  const onSeries = useCallback((s: UpdateRecord[] | null) => onUpdate(s?.[2] ?? null), [onUpdate]);
  return (
    <>
      <section className="lv-part" aria-labelledby="l3-3b">
        <p className="lv-part-kicker">Part B</p>
        <h3 id="l3-3b">The moments, update by update</h3>
        <p className="lv-muted">
          For every weight and bias, Adam keeps a{' '}
          <Term meaning="A running average of the gradient: m ← β₁·m + (1−β₁)·ḡ.">first moment</Term> m and a{' '}
          <Term meaning="A running average of the squared gradient: v ← β₂·v + (1−β₂)·ḡ².">
            second moment
          </Term>{' '}
          v. Both start at 0, so they are corrected by dividing by 1−βᵗ (
          <Term meaning="Dividing m and v by 1−β₁ᵗ and 1−β₂ᵗ to undo their start at zero.">
            bias correction
          </Term>
          ). The step divides the corrected average gradient by the square root of the corrected average
          squared gradient.
        </p>
        <RecordedRun
          prefix="b"
          signals="ad"
          config={config}
          label={`Adam, η = ${AD_LR} · ${L3_TASK.epochs} updates`}
          dataset={L3_TASK.dataset}
          wording={level3Wording({ optimizer: 'adam', decay: false })}
          trainText="Train and record the Adam run"
          tour={{ run: 'ad-run', chart: 'ad-chart', update: 'ad-table' }}
          defaultChoice={18}
          onSeries={onSeries}
        >
          {({ series, n, jump, header }) => (
            <>
              <CaptureHeader header={header} onHeader={setCtx} />
              <AdamUpdate series={series} n={n} jump={jump} />
            </>
          )}
        </RecordedRun>
      </section>
      <PartC header={ctx?.header ?? null} read={ctx?.read ?? (async () => [])} />
    </>
  );
}

/** Hands the recorded run's header and reader to Part C, which reads whole updates rather than one value. */
function CaptureHeader({
  header,
  onHeader,
}: {
  header: TraceHeader;
  onHeader: (c: { header: TraceHeader; read: (a: number, b: number) => Promise<Instruction[]> }) => void;
}) {
  const read = useRunRead();
  useEffect(() => {
    onHeader({ header, read });
  }, [header, read, onHeader]);
  return null;
}

const useRunRead = () => useRun((s) => s.read);

export function L3Experiment03() {
  const [u, setU] = useState<UpdateRecord | null>(null);
  const live = useMemo(() => [correctionQuestion(u)], [u]);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_3} liveQuestions={live}>
      <PartA />
      <PartsBC onUpdate={setU} />
    </ExperimentLayout>
  );
}
