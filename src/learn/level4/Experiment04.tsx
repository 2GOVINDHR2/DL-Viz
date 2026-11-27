/**
 * Level 4, Experiment 04 — Backpropagation Through Time (ADR-103).
 * A recurrent layer (4 hidden units) learns whether the FIRST of five numbers is positive (l4BpttConfig), trained and
 * recorded by the engine. For one sequence at a chosen epoch:
 *  - Part A: the forward pass, unrolled (rnnSteps);
 *  - Part B: the backward pass, one time step at a time, from the record (readBackward, rnnBackSteps): ∂ℓ/∂hₜ,
 *    ∂ℓ/∂zₜ, U's and W's contributions, and the gradient sent back to hₜ₋₁;
 *  - Part C: U's contributions per time step and their recorded sum (GRAD_SUM);
 *  - Part D: full against truncated BPTT (compareRuns), and which steps a window reaches (engine probes);
 *  - Part E: gradient sizes per time step in engine probes with U = s·I, and in the recorded run.
 * "Checked here" marks recompute a relation from recorded values; nothing shown is computed in place of the engine.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Instruction } from '../../core/npm/ir';
import { L4_BPTT, l4BpttConfig, level4ById } from '../../experiments/level4';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { EngineBadge, ErrorNote, Segmented, Term } from '../components/ui';
import { LEVEL_4 } from '../curriculum';
import { fmt, fmtSigned } from '../format';
import { signal } from '../signals';
import { TraceExplorer } from '../trace/TraceExplorer';
import { TraceWordingProvider } from '../trace/wording';
import { useCompare } from '../level3/common/compare';
import { sameConfig, useOwnRun } from '../level3/common/ownRun';
import { RunsChart } from '../level3/common/RunsChart';
import { level3Wording } from '../level3/common/wording';
import { gradientSizes, truncationProbe } from './common/bpttProbes';
import { readExample, type CnnExample } from './common/cnnRecord';
import { MatrixGrid } from './common/MatrixGrid';
import { norm, readBackward, rnnBackSteps, rnnSteps, values, type RnnBackStep } from './common/rnnRecord';
import { level4Wording, RNN_KINDS } from './common/wording';

const EXP = level4ById('04')!;
const CONFIG = l4BpttConfig();
const H = L4_BPTT.hidden;
const N = 32;
const close = (a: number, b: number, tol = 1e-12): boolean =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const vec = (v: readonly number[], d = 4): string => `(${v.map((x) => fmt(x, d)).join(', ')})`;
const sci = (v: number): string =>
  v === 0
    ? '0'
    : Math.abs(v) >= 0.01 && Math.abs(v) < 1000
      ? fmt(v, 4)
      : v.toExponential(2).replace('-', '−');
const windowLabel = (w: number): string => (w === 0 ? 'full BPTT' : `last ${w} step${w > 1 ? 's' : ''}`);
type Run = ReturnType<typeof useOwnRun>;

export function sumQuestion(back: RnnBackStep[] | null, sum: Instruction | null): LiveQuestion {
  if (!back || !sum)
    return {
      id: 'l4-live-usum',
      live: true,
      kind: 'predict',
      prompt: 'In Part C, what is U’s gradient (first entry) for the example shown?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train the network in Part A first.',
    };
  const parts = back.filter((b) => b.dU).map((b) => b.dU!.results.grad.data[0]);
  const total = sum.results.grad.data[0];
  const last = parts[0];
  const opts = [
    { t: fmtSigned(total, 5), ok: true },
    { t: fmtSigned(last, 5), ok: false },
    { t: fmtSigned(total / parts.length, 5), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'l4-live-usum',
    live: true,
    kind: 'predict',
    prompt: `In Part C, U’s first entry received the contributions ${parts.map((p) => fmtSigned(p, 5)).join(', ')} at time steps ${back
      .filter((b) => b.dU)
      .map((b) => b.t)
      .join(', ')}. What is its gradient for this example?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `The contributions are added: ${fmtSigned(total, 5)}, as the record’s sum shows.`,
    })),
  };
}

function PartA({ run, ex, sel }: { run: Run; ex: CnnExample | null; sel: React.ReactNode }) {
  const steps = ex ? rnnSteps(ex) : null;
  return (
    <section className="lv-part" aria-labelledby="l4-4a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l4-4a">Forward, unrolled</h3>
      <p className="lv-muted">
        32 sequences of five numbers; the label says whether the <em>first</em> number is positive. The
        network reads all five and predicts after the last, so to learn, the gradient must travel from the end
        back to the first time step:{' '}
        <Term meaning="Backpropagation applied to the unrolled network, from the last time step back to the first.">
          backpropagation through time
        </Term>
        . A recurrent layer of {H} hidden units, Adam, η = {L4_BPTT.lr}.
      </p>
      <div className="lv-row" data-tour="bp-forward" style={{ gap: 'var(--lv-s4)' }}>
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          disabled={run.training}
          onClick={() => void run.train(CONFIG, 'BPTT', L4_BPTT.dataset)}
          data-control="a:train"
        >
          {run.training ? 'Training…' : run.ready ? 'Train and record again' : 'Train and record'}
        </button>
        <span className="lv-small lv-muted">{L4_BPTT.epochs} epochs · full BPTT</span>
      </div>
      {run.error && <ErrorNote title="The run did not complete.">{run.error}</ErrorNote>}
      {run.ready && (
        <div className="lv-viz" style={{ marginTop: 'var(--lv-s4)' }}>
          {sel}
          {steps && ex ? (
            <div className="lv-table-wrap" tabIndex={0} role="region" aria-label="Forward pass unrolled">
              <table className="lv-table lv-small" data-unrolled={ex.index}>
                <caption>
                  Sequence {ex.index + 1}, epoch {ex.epoch + 1}: label {ex.target[0]}, prediction p ={' '}
                  {fmt(ex.probs[0], 3)}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Time step</th>
                    {steps.map((s) => (
                      <th key={s.t} scope="col">
                        t = {s.t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr data-row="x">
                    <th scope="row">Input xₜ</th>
                    {steps.map((s) => (
                      <td key={s.t} className="num">
                        {fmtSigned(s.x[0], 2)}
                      </td>
                    ))}
                  </tr>
                  <tr data-row="h">
                    <th scope="row">Hidden state hₜ</th>
                    {steps.map((s) => (
                      <td key={s.t} className="num lv-mono" style={{ whiteSpace: 'pre-line' }}>
                        {values(s.h)
                          .map((v) => fmt(v, 2))
                          .join('\n')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="lv-small lv-muted">Reading the record…</p>
          )}
        </div>
      )}
    </section>
  );
}

function PartB({
  back,
  grad,
  hs,
}: {
  back: RnnBackStep[] | null;
  grad: Instruction | null;
  /** The recorded hₜ per time step. */
  hs: Record<number, number[]>;
}) {
  const [k, setK] = useState(0);
  const b = back?.[Math.min(k, back.length - 1)];
  useEffect(() => {
    if (b?.t === 1) signal('bp-first-reached');
  }, [b]);
  return (
    <section className="lv-part" aria-labelledby="l4-4b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l4-4b">Backward, one time step at a time</h3>
      <p className="lv-muted">
        The backward pass starts at the loss and visits the time steps in reverse: 5, 4, …, 1. At each step
        the gradient arriving at hₜ is turned into the gradient of zₜ (through tanh’s slope), which gives this
        step’s contributions to U and W and the gradient sent back to hₜ₋₁.
      </p>
      {!back || !b ? (
        <p className="lv-small lv-muted">Train the network in Part A first.</p>
      ) : (
        <div className="lv-viz" data-tour="bp-backward" data-back-step={b.t}>
          <div className="lv-row" style={{ gap: 'var(--lv-s2)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="lv-btn"
              disabled={k === 0}
              onClick={() => {
                setK(k - 1);
                signal('bp-step-moved');
              }}
              data-control="b:later"
            >
              ◀ Later time step
            </button>
            <button
              type="button"
              className="lv-btn lv-btn-primary"
              disabled={k === back.length - 1}
              onClick={() => {
                setK(k + 1);
                signal('bp-step-moved');
              }}
              data-control="b:earlier"
            >
              Earlier time step ▶
            </button>
            <span className="lv-mono" data-value="back-step">
              t = {b.t} (step {k + 1} of the backward pass)
            </span>
          </div>
          {grad && (
            <p className="lv-small" style={{ marginTop: 'var(--lv-s2)' }}>
              The backward pass began at the loss: ∂ℓ/∂p = {vec(Array.from(grad.results.grad.data))}.
            </p>
          )}
          <dl className="lv-kv">
            <dt>Gradient arriving at hₜ, ∂ℓ/∂hₜ (recorded)</dt>
            <dd className="lv-mono" data-value="dh">
              {vec(b.dh)}
            </dd>
            <dt>Gradient of zₜ, ∂ℓ/∂zₜ = ∂ℓ/∂hₜ ⊙ (1 − hₜ²) (recorded)</dt>
            <dd className="lv-mono" data-value="dz">
              {vec(values(b.dz))}{' '}
              <span className="lv-small">
                {hs[b.t] && values(b.dz).every((v, j) => close(b.dh[j] * (1 - hs[b.t][j] ** 2), v, 1e-12))
                  ? '✓ checked here'
                  : '✕ differs'}
              </span>
            </dd>
            <dt>Size of ∂ℓ/∂zₜ</dt>
            <dd className="lv-mono" data-value="dz-size">
              {sci(norm(values(b.dz)))}
            </dd>
            <dt>This step’s contribution to U (hₜ₋₁ᵀ · ∂ℓ/∂zₜ)</dt>
            <dd data-value="du">
              {b.dU ? (
                <div className="lv-matrix-scroll">
                  <MatrixGrid
                    values={values(b.dU)}
                    rows={H}
                    cols={H}
                    digits={4}
                    caption={`U contribution at t = ${b.t}`}
                    hideCaption
                  />
                </div>
              ) : (
                <span className="lv-small lv-muted">
                  none: at t = 1 there is no hₜ₋₁ (h₀ = 0), so U was not used
                </span>
              )}
            </dd>
            <dt>Gradient sent back to hₜ₋₁ (∂ℓ/∂zₜ · Uᵀ)</dt>
            <dd className="lv-mono" data-value="dhprev">
              {b.dhPrev ? vec(values(b.dhPrev)) : '— (first time step)'}
            </dd>
          </dl>
          <EngineBadge text="Recorded training run" />
        </div>
      )}
    </section>
  );
}

function PartC({
  back,
  sum,
  use,
}: {
  back: RnnBackStep[] | null;
  sum: Instruction | null;
  use: Instruction | null;
}) {
  const [entry, setEntry] = useState(0);
  if (!back || !sum)
    return (
      <section className="lv-part" aria-labelledby="l4-4c">
        <p className="lv-part-kicker">Part C</p>
        <h3 id="l4-4c">One weight, several contributions</h3>
        <p className="lv-small lv-muted">Train the network in Part A first.</p>
      </section>
    );
  const parts = back.filter((b) => b.dU).sort((a, b) => a.t - b.t);
  const total = sum.results.grad.data[entry];
  let running = 0;
  const rows = parts.map((b) => {
    const v = b.dU!.results.grad.data[entry];
    running += v;
    return { t: b.t, v, running, id: b.dU!.id };
  });
  const byHand = rows.reduce((s, r) => s + r.v, 0);
  const wRef = use?.operands.find((o) => o.role === 'weight');
  return (
    <section className="lv-part" aria-labelledby="l4-4c" data-tour="bp-accumulate">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l4-4c">One weight, several contributions</h3>
      <p className="lv-muted">
        There is <strong>one</strong> recurrent weight matrix U (recorded value #{wRef?.ref}). It was{' '}
        <strong>used</strong> {parts.length} times in this example, once at each of the time steps{' '}
        {parts.map((p) => p.t).join(', ')}, and every use gives its own contribution to the gradient. The
        record adds them up into U’s gradient for this example (instruction #{sum.id}).
      </p>
      <div className="lv-viz">
        <label className="lv-row lv-small">
          <span className="lv-control-label">Entry of U</span>
          <select
            className="lv-select"
            value={entry}
            onChange={(e) => {
              setEntry(Number(e.target.value));
              signal('bp-entry-picked');
            }}
            data-control="c:entry"
          >
            {Array.from({ length: H * H }, (_, i) => (
              <option key={i} value={i}>
                row {Math.floor(i / H) + 1}, column {(i % H) + 1}
              </option>
            ))}
          </select>
        </label>
        <div className="lv-table-wrap" tabIndex={0} role="region" aria-label="Contributions to U">
          <table className="lv-table lv-small">
            <thead>
              <tr>
                <th scope="col">Use at time step</th>
                <th scope="col">Contribution (recorded)</th>
                <th scope="col">Running sum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.t} data-use={r.t}>
                  <th scope="row">
                    t = {r.t} <span className="lv-muted">(#{r.id})</span>
                  </th>
                  <td className="num">{fmtSigned(r.v, 6)}</td>
                  <td className="num">{fmtSigned(r.running, 6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="lv-kv">
          <dt>U’s gradient for this example (recorded sum)</dt>
          <dd className="lv-mono" data-value="usum">
            {fmtSigned(total, 6)}{' '}
            <span className="lv-small">
              {close(byHand, total, 1e-12) ? '✓ the sum of the contributions, checked here' : '✕ differs'}
            </span>
          </dd>
        </dl>
        <EngineBadge text="Recorded training run" />
      </div>
    </section>
  );
}

function PartD() {
  const { runs, busy, error, compare } = useCompare();
  const [w, setW] = useState(2);
  const probe = truncationProbe(w);
  return (
    <section className="lv-part" aria-labelledby="l4-4d">
      <p className="lv-part-kicker">Part D</p>
      <h3 id="l4-4d">Full against truncated</h3>
      <p className="lv-muted">
        <Term meaning="Sending the gradient back through only the last k time steps.">Truncated</Term> BPTT
        stops the backward pass after the last k time steps. The forward pass is unchanged; only the gradient
        is cut. Here the label depends on x₁, so a short window never sends a gradient to the time step that
        matters.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz" data-tour="bp-truncate">
          <div className="lv-viz-title">
            <span>Loss after each epoch</span>
            <EngineBadge text="Trained by the engine · no record kept" />
          </div>
          {error && <ErrorNote title="The runs did not complete.">{error}</ErrorNote>}
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            disabled={busy}
            onClick={async () => {
              const r = await compare(
                L4_BPTT.windows.map((k) => ({ label: windowLabel(k), config: l4BpttConfig(k) })),
                L4_BPTT.dataset,
              );
              if (r) signal('bp-compared');
            }}
            data-control="d:compare"
          >
            {busy ? 'Training…' : 'Train the comparison'}
          </button>
          {runs && (
            <>
              <RunsChart
                title="Loss after each epoch: full and truncated BPTT"
                series={runs.map((r) => ({ label: r.label, values: r.run.losses }))}
                log
              />
              <div
                className="lv-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Full and truncated compared"
              >
                <table className="lv-table lv-small">
                  <thead>
                    <tr>
                      <th scope="col">Backward pass</th>
                      <th scope="col">Loss after epoch {L4_BPTT.epochs}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r, i) => (
                      <tr key={r.label} data-window={L4_BPTT.windows[i]}>
                        <th scope="row">{r.label}</th>
                        <td className="num">{fmt(r.run.losses.at(-1), 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <section className="lv-panel" aria-label="Which time steps a window reaches">
          <Segmented
            legend="Window"
            options={[1, 2, 3, 0].map((k) => ({ value: k, label: k === 0 ? 'full' : String(k) }))}
            value={w}
            onChange={setW}
            control="d:window"
          />
          {'error' in probe ? (
            <ErrorNote title="The probe did not run.">{probe.error}</ErrorNote>
          ) : (
            <p className="lv-small" data-value="reach">
              On an 8-step sequence (an engine probe), U received a contribution at time steps{' '}
              <strong>{probe.uSteps.join(', ')}</strong>.{' '}
              {probe.cutSteps.length
                ? `The backward pass was cut where hₜ₋₁ enters steps ${probe.cutSteps.join(', ')}; earlier dependencies are not learned through this gradient.`
                : 'Nothing was cut.'}
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

function PartE({ back }: { back: RnnBackStep[] | null }) {
  const [s, setS] = useState(0.5);
  const [x0, setX0] = useState(0.5);
  const r = gradientSizes(s, x0);
  const sizes = 'error' in r ? null : r.sizes;
  const first = sizes?.find((q) => q.t === 1)?.size ?? 0;
  const lastSize = sizes?.find((q) => q.t === 8)?.size ?? 0;
  const ratio = lastSize > 0 ? first / lastSize : 0;
  useEffect(() => {
    if (!sizes) return;
    if (ratio > 1) signal('bp-explode-found');
    if (ratio < 0.01) signal('bp-vanish-found');
  }, [sizes, ratio]);
  return (
    <section className="lv-part" aria-labelledby="l4-4e">
      <p className="lv-part-kicker">Part E</p>
      <h3 id="l4-4e">Gradients that shrink or grow</h3>
      <p className="lv-muted">
        Each step back multiplies the gradient by Uᵀ and by tanh’s slope (at most 1). If those factors are
        mostly below 1 the gradient{' '}
        <Term meaning="Shrinks towards 0 on its way back, so early time steps barely learn.">vanishes</Term>;
        if above 1 it <Term meaning="Grows on its way back, so updates become huge.">explodes</Term>. Below,
        an engine probe of a 2-unit layer with U = s·I and one input x₁ at the start of an 8-step sequence.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz">
          <div className="lv-viz-title">
            <span>Size of ∂ℓ/∂zₜ at each time step</span>
            <EngineBadge text="Computed by the engine (probe)" />
          </div>
          {sizes ? (
            <>
              <div
                className="lv-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Gradient size per time step"
              >
                <table className="lv-table lv-small" data-sizes={`${s},${x0}`}>
                  <thead>
                    <tr>
                      <th scope="col">Time step</th>
                      {sizes.map((q) => (
                        <th key={q.t} scope="col">
                          {q.t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">‖∂ℓ/∂zₜ‖</th>
                      {sizes.map((q) => (
                        <td key={q.t} className="num">
                          {sci(q.size)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="lv-small" data-value="ratio">
                At time step 1 the gradient is {sci(ratio)} × its size at time step 8:{' '}
                {ratio < 0.01
                  ? 'it has vanished'
                  : ratio < 0.5
                    ? 'it shrank'
                    : ratio <= 2
                      ? 'roughly kept its size'
                      : 'it exploded'}
                .
              </p>
            </>
          ) : (
            <ErrorNote title="The probe did not run.">{'error' in r ? r.error : ''}</ErrorNote>
          )}
        </div>
        <section className="lv-panel" aria-label="Probe settings">
          <Segmented
            legend="Recurrent weight scale s"
            options={[0.5, 1, 1.5, 2].map((v) => ({ value: v, label: String(v) }))}
            value={s}
            onChange={setS}
            control="e:scale"
          />
          <div style={{ height: 'var(--lv-s3)' }} />
          <Segmented
            legend="First input x₁"
            options={[
              { value: 0.5, label: '0.5 (tanh bends)' },
              { value: 0.01, label: '0.01 (tanh nearly straight)' },
            ]}
            value={x0}
            onChange={setX0}
            control="e:input"
          />
          <p className="lv-small lv-muted">
            Large values push tanh into its flat ends, where its slope is near 0: then even a large U can make
            the gradient vanish. What happens depends on the weights and the inputs; not every sequence
            vanishes or explodes.
          </p>
          <p className="lv-small lv-muted">
            A common remedy for exploding gradients, gradient clipping (capping a gradient’s size before the
            update), is not part of this engine, so it is not shown here.
          </p>
        </section>
      </div>
      {back && (
        <p className="lv-small" data-value="recorded-sizes">
          In the recorded run, for the sequence shown in Part A: ‖∂ℓ/∂zₜ‖ ={' '}
          {[...back]
            .sort((a, b) => a.t - b.t)
            .map((b) => `${sci(norm(values(b.dz)))} (t = ${b.t})`)
            .join(', ')}
          .
        </p>
      )}
    </section>
  );
}

export function L4Experiment04() {
  const run = useOwnRun((c) => sameConfig(c, CONFIG));
  const [index, setIndex] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [ex, setEx] = useState<CnnExample | null>(null);
  const [back, setBack] = useState<Instruction[] | null>(null);
  const { ready, header, read } = run;
  useEffect(() => {
    if (!ready || !header) {
      setEx(null);
      setBack(null);
      return;
    }
    let live = true;
    const last = header.epochStarts.length - 2;
    readExample(read, header, Math.min(epoch, last), index).then(async (e) => {
      const b = await readBackward(read, e);
      if (!live) return;
      setEx(e);
      setBack(b);
    });
    return () => {
      live = false;
    };
  }, [ready, header, read, index, epoch]);
  const backSteps = useMemo(() => (back ? rnnBackSteps(back, H) : null), [back]);
  const hs = useMemo(
    () =>
      Object.fromEntries((ex ? rnnSteps(ex) : []).map((s) => [s.t, values(s.h)])) as Record<number, number[]>,
    [ex],
  );
  const sum = back?.find((i) => i.kind === 'GRAD_SUM' && i.meta.param === 'L1.U') ?? null;
  const grad = back?.find((i) => i.kind === 'GRAD_INIT') ?? null;
  const use = ex?.layers.L1?.filter((i) => i.kind === 'MATMUL')[1] ?? null;
  const live = useMemo(() => [sumQuestion(backSteps, sum)], [backSteps, sum]);
  const wording = useMemo(
    () => level4Wording(RNN_KINDS, level3Wording({ optimizer: 'adam', decay: false })),
    [],
  );
  const last = (header?.epochStarts.length ?? 2) - 2;
  const sel = (
    <div className="lv-row" style={{ gap: 'var(--lv-s4)', flexWrap: 'wrap' }}>
      <label className="lv-row lv-small">
        <span className="lv-control-label">Sequence</span>
        <select
          className="lv-select"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          data-control="a:example"
        >
          {Array.from({ length: N }, (_, i) => (
            <option key={i} value={i}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
      <label className="lv-row lv-small" style={{ flex: '1 1 220px' }}>
        <span className="lv-control-label">Epoch</span>
        <input
          type="range"
          min={1}
          max={last + 1}
          value={Math.min(epoch, last) + 1}
          onChange={(e) => setEpoch(Number(e.target.value) - 1)}
          aria-label="Epoch of the recorded pass"
          data-control="a:epoch"
        />
        <span className="lv-mono">{Math.min(epoch, last) + 1}</span>
      </label>
      <EngineBadge text="Recorded training run" />
    </div>
  );
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_4} liveQuestions={live}>
      <PartA run={run} ex={ex} sel={sel} />
      <PartB back={backSteps} grad={grad} hs={hs} />
      <PartC back={backSteps} sum={sum} use={use} />
      <PartD />
      <PartE back={backSteps} />
      {run.ready && (
        <TraceWordingProvider value={wording}>
          <TraceExplorer stale={false} />
        </TraceWordingProvider>
      )}
    </ExperimentLayout>
  );
}
