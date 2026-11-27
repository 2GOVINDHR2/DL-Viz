/**
 * Level 4, Experiment 05 — LSTM and GRU: Gated Recurrent Architectures (ADR-103).
 * Recorded LSTM and GRU runs on the first-value task (6 steps; l4GatedConfig). Only one record is kept at a time (the
 * shared trace store), so Parts A–B read the LSTM run and Part C the GRU run; each part offers to train its own.
 *  - Part A: one LSTM time step from the record: f, i, g, cₜ = f ⊙ cₜ₋₁ + i ⊙ g, o, hₜ = o ⊙ tanh(cₜ) (checked here);
 *  - Part B: the gates value by value: what is kept, written and shown; the gradient carried back along the cell state
 *    (GRAD_MULTIPLY of f ⊙ cₜ₋₁, from the record);
 *  - Part C: one GRU time step: z, r, n, hₜ = (1 − z) ⊙ n + z ⊙ hₜ₋₁ (checked here); no separate cell state;
 *  - Part D: plain, LSTM and GRU layers trained by the engine on a 10-step version (compareRuns), for three seeds; the
 *    parameter counts come from the models; summaries of the two recorded runs.
 */
import { useEffect, useMemo, useState } from 'react';
import { buildModel } from '../../core/layers/model';
import type { Instruction } from '../../core/npm/ir';
import { L4_GATED, l4GatedCompareConfig, l4GatedConfig, level4ById } from '../../experiments/level4';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { EngineBadge, ErrorNote, Segmented, Term } from '../components/ui';
import { LEVEL_4 } from '../curriculum';
import { fmt, fmtSigned, pct } from '../format';
import { signal } from '../signals';
import { TraceExplorer } from '../trace/TraceExplorer';
import { TraceWordingProvider } from '../trace/wording';
import { useCompare } from '../level3/common/compare';
import { sameConfig, useOwnRun } from '../level3/common/ownRun';
import { RunsChart } from '../level3/common/RunsChart';
import { level3Wording } from '../level3/common/wording';
import { readExample, type CnnExample } from './common/cnnRecord';
import { gruSteps, lstmSteps, parameterCount, type GruStep, type LstmStep } from './common/gatedRecord';
import { norm, readBackward } from './common/rnnRecord';
import { level4Wording, RNN_KINDS } from './common/wording';

const EXP = level4ById('05')!;
const LSTM = l4GatedConfig('lstm');
const GRU = l4GatedConfig('gru');
const N = 16;
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));
const vec = (v: readonly number[] | null, d = 3): string =>
  v ? `(${v.map((x) => fmt(x, d)).join(', ')})` : '—';
type Run = ReturnType<typeof useOwnRun>;

export const GATED_KINDS: Record<string, string> = {
  ...RNN_KINDS,
  ADD: 'add two parts (the input’s and the previous hidden state’s, or the kept memory and the written candidate)',
  MULTIPLY: 'multiply element by element: a gate times the value it controls',
  GRAD_MULTIPLY: 'gradient of a product: each factor receives the upstream gradient times the other factor',
  ONE_MINUS: 'one minus the update gate: the share of the new candidate',
  GRAD_ONE_MINUS: 'gradient through one minus the gate',
  GRAD_SUM:
    'add up the gradient contributions of a value used in several places (several gates, several time steps)',
};

export function cellQuestion(s: LstmStep | null): LiveQuestion {
  if (!s || !s.cPrev)
    return {
      id: 'l4-live-cell',
      live: true,
      kind: 'predict',
      prompt: 'In Part A, what is the first value of the cell state cₜ?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train and record the LSTM in Part A, and choose a time step after the first.',
    };
  const c = s.c[0];
  const noForget = s.i[0] * s.g[0];
  const noWrite = s.f[0] * s.cPrev[0];
  const opts = [
    { t: fmtSigned(c, 4), ok: true },
    { t: fmtSigned(noForget, 4), ok: false },
    { t: fmtSigned(noWrite, 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'l4-live-cell',
    live: true,
    kind: 'predict',
    prompt: `In Part A, time step ${s.t}, first unit: f = ${fmt(s.f[0], 4)}, cₜ₋₁ = ${fmtSigned(s.cPrev[0], 4)}, i = ${fmt(s.i[0], 4)}, g = ${fmtSigned(s.g[0], 4)}. What is cₜ?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `cₜ = f·cₜ₋₁ + i·g = ${fmtSigned(noWrite, 4)} + ${fmtSigned(noForget, 4)} = ${fmtSigned(c, 4)}, as recorded.`,
    })),
  };
}

function useExample(run: Run, index: number, epoch: number) {
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
      if (live) {
        setEx(e);
        setBack(b);
      }
    });
    return () => {
      live = false;
    };
  }, [ready, header, read, index, epoch]);
  return { ex, back };
}

function Controls({
  index,
  setIndex,
  t,
  setT,
  steps,
  prefix,
}: {
  index: number;
  setIndex: (v: number) => void;
  t: number;
  setT: (v: number) => void;
  steps: number;
  prefix: string;
}) {
  return (
    <div className="lv-row" style={{ gap: 'var(--lv-s4)', flexWrap: 'wrap' }}>
      <label className="lv-row lv-small">
        <span className="lv-control-label">Sequence</span>
        <select
          className="lv-select"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          data-control={`${prefix}:example`}
        >
          {Array.from({ length: N }, (_, i) => (
            <option key={i} value={i}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
      <label className="lv-row lv-small" style={{ flex: '1 1 200px' }}>
        <span className="lv-control-label">Time step</span>
        <input
          type="range"
          min={1}
          max={steps}
          value={t}
          onChange={(e) => {
            setT(Number(e.target.value));
            signal('gt-step-moved');
          }}
          aria-label="Time step"
          data-control={`${prefix}:step`}
        />
        <span className="lv-mono" data-value={`${prefix}-step`}>
          t = {t}
        </span>
      </label>
      <EngineBadge text="Recorded training run (last epoch)" />
    </div>
  );
}

function PartA({ run, steps, sel }: { run: Run; steps: LstmStep[] | null; sel: React.ReactNode }) {
  const isLstm = run.ready && run.config && sameConfig(run.config, LSTM);
  return (
    <section className="lv-part" aria-labelledby="l4-5a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l4-5a">The LSTM cell</h3>
      <p className="lv-muted">
        16 sequences of six numbers; the label says whether the first is positive. An{' '}
        <Term meaning="Long short-term memory: a recurrent cell with gates and a separate cell state.">
          LSTM
        </Term>{' '}
        layer of {L4_GATED.hidden} units, Adam, η = {L4_GATED.lr}, {L4_GATED.epochs} epochs. Every value below
        is from the last epoch’s record.
      </p>
      <div className="lv-row" data-tour="gt-lstm" style={{ gap: 'var(--lv-s4)' }}>
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          disabled={run.training}
          onClick={() => void run.train(LSTM, 'LSTM', L4_GATED.dataset)}
          data-control="a:train"
        >
          {run.training
            ? 'Training…'
            : isLstm
              ? 'Train and record the LSTM again'
              : 'Train and record the LSTM'}
        </button>
      </div>
      {run.error && <ErrorNote title="The run did not complete.">{run.error}</ErrorNote>}
      {isLstm && (
        <div className="lv-viz" style={{ marginTop: 'var(--lv-s4)' }}>
          {sel}
          {steps ? <LstmTable steps={steps} /> : <p className="lv-small lv-muted">Reading the record…</p>}
        </div>
      )}
    </section>
  );
}

const mean = (v: readonly number[]): number => v.reduce((a, b) => a + b, 0) / v.length;

/** The LSTM over all time steps: each gate's mean activation, the cell state and the hidden state (recorded). */
function LstmTable({ steps }: { steps: LstmStep[] }) {
  return (
    <div className="lv-table-wrap" tabIndex={0} role="region" aria-label="The LSTM over time">
      <table className="lv-table lv-small" data-lstm-overview>
        <caption>
          All six time steps of the sequence (gate values are averages over the {L4_GATED.hidden} units)
        </caption>
        <thead>
          <tr>
            <th scope="col">t</th>
            <th scope="col">xₜ</th>
            <th scope="col">forget f</th>
            <th scope="col">input i</th>
            <th scope="col">output o</th>
            <th scope="col">cell state cₜ</th>
            <th scope="col">hidden state hₜ</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((q) => (
            <tr key={q.t} data-t={q.t}>
              <th scope="row">{q.t}</th>
              <td className="num">{fmtSigned(q.x, 2)}</td>
              <td className="num">{fmt(mean(q.f), 2)}</td>
              <td className="num">{fmt(mean(q.i), 2)}</td>
              <td className="num">{fmt(mean(q.o), 2)}</td>
              <td className="num lv-mono">{vec(q.c, 2)}</td>
              <td className="num lv-mono">{vec(q.h, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LstmStepView({ s }: { s: LstmStep }) {
  const cOk = s.c.every((v, j) =>
    close(s.cPrev ? s.f[j] * s.cPrev[j] + s.i[j] * s.g[j] : s.i[j] * s.g[j], v),
  );
  const hOk = s.h.every((v, j) => close(s.o[j] * Math.tanh(s.c[j]), v));
  return (
    <dl className="lv-kv" data-lstm-step={s.t}>
      <dt>Input xₜ, previous hₜ₋₁ and cₜ₋₁</dt>
      <dd className="lv-mono" data-value="inputs">
        {fmtSigned(s.x, 3)}, {s.hPrev ? vec(s.hPrev) : 'h₀ = 0'}, {s.cPrev ? vec(s.cPrev) : 'c₀ = 0'}
      </dd>
      <dt>Forget gate f = σ(…)</dt>
      <dd className="lv-mono" data-value="f">
        {vec(s.f)}
      </dd>
      <dt>Input gate i = σ(…)</dt>
      <dd className="lv-mono" data-value="i">
        {vec(s.i)}
      </dd>
      <dt>Candidate g = tanh(…)</dt>
      <dd className="lv-mono" data-value="g">
        {vec(s.g)}
      </dd>
      <dt>Cell state cₜ = f ⊙ cₜ₋₁ + i ⊙ g</dt>
      <dd className="lv-mono" data-value="c">
        {vec(s.c)} <span className="lv-small">{cOk ? '✓ checked here' : '✕ differs'}</span>
        {!s.cPrev && <span className="lv-small"> (c₀ = 0: f has nothing to keep yet)</span>}
      </dd>
      <dt>Output gate o = σ(…)</dt>
      <dd className="lv-mono" data-value="o">
        {vec(s.o)}
      </dd>
      <dt>Hidden state hₜ = o ⊙ tanh(cₜ)</dt>
      <dd className="lv-mono" data-value="h">
        {vec(s.h)} <span className="lv-small">{hOk ? '✓ checked here' : '✕ differs'}</span>
      </dd>
    </dl>
  );
}

function PartB({ steps, t, back }: { steps: LstmStep[] | null; t: number; back: Instruction[] | null }) {
  const s = steps?.[t - 1];
  useEffect(() => {
    if (steps?.some((q) => q.f.some((v) => v > 0.9) && q.cPrev)) {
      if (s && s.cPrev && s.f.some((v) => v > 0.9)) signal('gt-keep-found');
    }
  }, [s, steps]);
  // The gradient passed back along the cell state: GRAD_MULTIPLY of f ⊙ cₜ₋₁, slot b (∂ℓ/∂cₜ₋₁ through this product).
  const cellPath = (back ?? [])
    .filter((i) => i.kind === 'GRAD_MULTIPLY' && i.meta.gate === 'cell' && i.results.b)
    .filter((i) => {
      const t0 = Number(i.meta.step);
      const st = steps?.[t0 - 1];
      // f ⊙ cₜ₋₁ is the product whose first factor is the forget gate's activation.
      return st && i.operands.some((o) => o.role === 'a' && o.ref === st.ids.f);
    })
    .map((i) => ({
      t: Number(i.meta.step),
      size: norm(Array.from(i.results.b.data)),
      f: steps![Number(i.meta.step) - 1].f,
    }))
    .sort((a, b) => b.t - a.t);
  return (
    <section className="lv-part" aria-labelledby="l4-5b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l4-5b">What the gates do</h3>
      <p className="lv-muted">
        Value by value: a{' '}
        <Term meaning="A sigmoid output between 0 and 1 that multiplies another value.">gate</Term> near 1
        lets its value through, near 0 blocks it. The{' '}
        <Term meaning="The LSTM’s memory, changed only by gated addition.">cell state</Term> keeps f ⊙ cₜ₋₁ of
        its old memory and adds i ⊙ g of the candidate; the hidden state shows o ⊙ tanh(cₜ).
      </p>
      {!s ? (
        <p className="lv-small lv-muted">Train and record the LSTM in Part A first.</p>
      ) : (
        <div className="lv-viz" data-tour="gt-gates">
          <LstmStepView s={s} />
          <div className="lv-table-wrap" tabIndex={0} role="region" aria-label="Gates value by value">
            <table className="lv-table lv-small" data-gate-table={s.t}>
              <caption>
                Time step {s.t}, each unit (worked out here from the recorded gates and states)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Unit</th>
                  <th scope="col">kept: f · cₜ₋₁</th>
                  <th scope="col">written: i · g</th>
                  <th scope="col">cₜ</th>
                  <th scope="col">shown: o · tanh(cₜ)</th>
                </tr>
              </thead>
              <tbody>
                {s.c.map((c, j) => (
                  <tr key={j}>
                    <th scope="row">{j + 1}</th>
                    <td className="num">{s.cPrev ? fmtSigned(s.f[j] * s.cPrev[j], 3) : '0 (c₀ = 0)'}</td>
                    <td className="num">{fmtSigned(s.i[j] * s.g[j], 3)}</td>
                    <td className="num">{fmtSigned(c, 3)}</td>
                    <td className="num">{fmtSigned(s.h[j], 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cellPath.length > 0 && (
            <div
              className="lv-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Gradient along the cell state"
            >
              <table className="lv-table lv-small" data-cell-path>
                <caption>
                  Gradient passed back along the cell state, ∂ℓ/∂cₜ₋₁ through f ⊙ cₜ₋₁ (recorded): on this
                  path it is multiplied only by f, with no tanh slope and no weight matrix
                </caption>
                <thead>
                  <tr>
                    <th scope="col">From step</th>
                    <th scope="col">Forget gate f</th>
                    <th scope="col">Size of the gradient passed back</th>
                  </tr>
                </thead>
                <tbody>
                  {cellPath.map((r) => (
                    <tr key={r.t}>
                      <th scope="row">{r.t}</th>
                      <td className="num lv-mono">{vec(r.f, 2)}</td>
                      <td className="num">{fmt(r.size, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PartC({ run, steps, sel }: { run: Run; steps: GruStep[] | null; sel: React.ReactNode }) {
  const isGru = run.ready && run.config && sameConfig(run.config, GRU);
  const [t, setT] = useState(2);
  const s = steps?.[Math.min(t, steps.length) - 1];
  const hOk = s
    ? s.h.every((v, j) =>
        close(s.hPrev ? s.oneMinusZ[j] * s.n[j] + s.z[j] * s.hPrev[j] : s.oneMinusZ[j] * s.n[j], v),
      )
    : false;
  return (
    <section className="lv-part" aria-labelledby="l4-5c">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l4-5c">The GRU cell</h3>
      <p className="lv-muted">
        A <Term meaning="Gated recurrent unit: two gates and no separate cell state.">GRU</Term> has no
        separate cell state: its hidden state is the memory. The{' '}
        <Term meaning="How much of the old hidden state to keep.">update gate</Term> z mixes the old hidden
        state with a candidate n; the{' '}
        <Term meaning="How much of the old hidden state the candidate may use.">reset gate</Term> r decides
        how much of hₜ₋₁ the candidate uses. Same task and settings as the LSTM.
      </p>
      <div className="lv-row" data-tour="gt-gru" style={{ gap: 'var(--lv-s4)' }}>
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          disabled={run.training}
          onClick={() => void run.train(GRU, 'GRU', L4_GATED.dataset).then(() => signal('gt-gru-trained'))}
          data-control="c:train"
        >
          {run.training ? 'Training…' : isGru ? 'Train and record the GRU again' : 'Train and record the GRU'}
        </button>
        <span className="lv-small lv-muted">
          This replaces the LSTM record (one record is kept at a time).
        </span>
      </div>
      {isGru && (
        <div className="lv-viz" style={{ marginTop: 'var(--lv-s4)' }}>
          {sel}
          {s ? (
            <>
              <label className="lv-row lv-small">
                <span className="lv-control-label">Time step</span>
                <input
                  type="range"
                  min={1}
                  max={steps!.length}
                  value={s.t}
                  onChange={(e) => setT(Number(e.target.value))}
                  aria-label="GRU time step"
                  data-control="c:step"
                />
                <span className="lv-mono">t = {s.t}</span>
              </label>
              <dl className="lv-kv" data-gru-step={s.t}>
                <dt>Input xₜ and previous hₜ₋₁</dt>
                <dd className="lv-mono">
                  {fmtSigned(s.x, 3)}, {s.hPrev ? vec(s.hPrev) : 'h₀ = 0'}
                </dd>
                <dt>Update gate z = σ(…)</dt>
                <dd className="lv-mono" data-value="z">
                  {vec(s.z)}
                </dd>
                <dt>Reset gate r = σ(…)</dt>
                <dd className="lv-mono" data-value="r">
                  {s.r ? vec(s.r) : '— (h₀ = 0: nothing to reset at step 1)'}
                </dd>
                <dt>Candidate n = tanh(xₜ·Wn + (r ⊙ hₜ₋₁)·Un + bn)</dt>
                <dd className="lv-mono" data-value="n">
                  {vec(s.n)}
                </dd>
                <dt>hₜ = (1 − z) ⊙ n + z ⊙ hₜ₋₁</dt>
                <dd className="lv-mono" data-value="gh">
                  {vec(s.h)} <span className="lv-small">{hOk ? '✓ checked here' : '✕ differs'}</span>
                </dd>
                <dt>Cell state</dt>
                <dd data-value="no-cell">none: a GRU carries everything in hₜ</dd>
              </dl>
            </>
          ) : (
            <p className="lv-small lv-muted">Reading the record…</p>
          )}
        </div>
      )}
    </section>
  );
}

function PartD() {
  const { runs, busy, error, compare } = useCompare();
  const [seed, setSeed] = useState(1);
  const [ranSeed, setRanSeed] = useState<number | null>(null);
  const kinds = ['rnn', 'lstm', 'gru'] as const;
  const names = { rnn: 'plain recurrent', lstm: 'LSTM', gru: 'GRU' };
  const counts = kinds.map((k) => parameterCount(buildModel(l4GatedCompareConfig(k, 1).model).params));
  return (
    <section className="lv-part" aria-labelledby="l4-5d">
      <p className="lv-part-kicker">Part D</p>
      <h3 id="l4-5d">Plain, LSTM and GRU compared</h3>
      <p className="lv-muted">
        The first-value task with ten time steps, {L4_GATED.compare.hidden} units each,{' '}
        {L4_GATED.compare.epochs} epochs, Adam. Change the seed (the starting weights): one run proves little,
        and no architecture wins every time.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz" data-tour="gt-compare">
          <div className="lv-viz-title">
            <span>Loss after each epoch{ranSeed !== null ? ` (seed ${ranSeed})` : ''}</span>
            <EngineBadge text="Trained by the engine · no record kept" />
          </div>
          {error && <ErrorNote title="The runs did not complete.">{error}</ErrorNote>}
          {runs ? (
            <RunsChart
              title="Loss after each epoch, three recurrent layers"
              series={runs.map((r) => ({ label: r.label, values: r.run.losses }))}
              log
            />
          ) : (
            <p className="lv-small lv-muted">Train the comparison to see the curves.</p>
          )}
          <div className="lv-table-wrap" tabIndex={0} role="region" aria-label="Recurrent layers compared">
            <table className="lv-table lv-small">
              <thead>
                <tr>
                  <th scope="col">Layer</th>
                  <th scope="col">Parameters (whole network)</th>
                  <th scope="col">Loss after epoch {L4_GATED.compare.epochs}</th>
                </tr>
              </thead>
              <tbody>
                {kinds.map((k, i) => (
                  <tr key={k} data-kind={k}>
                    <th scope="row">{names[k]}</th>
                    <td className="num">{counts[i]}</td>
                    <td className="num">{runs ? fmt(runs[i].run.losses.at(-1), 4) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <section className="lv-panel" aria-label="Compare recurrent layers">
          <Segmented
            legend="Seed"
            options={L4_GATED.compare.seeds.map((v) => ({ value: v, label: String(v) }))}
            value={seed}
            onChange={setSeed}
            control="d:seed"
          />
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            disabled={busy}
            style={{ marginTop: 'var(--lv-s3)' }}
            onClick={async () => {
              const r = await compare(
                kinds.map((k) => ({ label: names[k], config: l4GatedCompareConfig(k, seed) })),
                L4_GATED.compare.dataset,
              );
              if (r) {
                if (ranSeed !== null && ranSeed !== seed) signal('gt-seed-changed');
                setRanSeed(seed);
                signal('gt-compared');
              }
            }}
            data-control="d:compare"
          >
            {busy ? 'Training…' : 'Train the comparison'}
          </button>
          <p className="lv-small lv-muted">
            Three runs of {L4_GATED.compare.epochs} epochs; this takes several seconds.
          </p>
        </section>
      </div>
    </section>
  );
}

export function L4Experiment05() {
  const run = useOwnRun((c) => sameConfig(c, LSTM) || sameConfig(c, GRU));
  const [index, setIndex] = useState(0);
  const [t, setT] = useState(2);
  const last = (run.header?.epochStarts.length ?? 2) - 2;
  const { ex, back } = useExample(run, index, last);
  const isLstm = !!run.config && sameConfig(run.config, LSTM);
  const lstm = useMemo(() => (ex && isLstm ? lstmSteps(ex) : null), [ex, isLstm]);
  const gru = useMemo(() => (ex && !isLstm ? gruSteps(ex) : null), [ex, isLstm]);
  const step = lstm?.[Math.min(t, lstm.length) - 1] ?? null;
  const live = useMemo(() => [cellQuestion(step)], [step]);
  const wording = useMemo(
    () => level4Wording(GATED_KINDS, level3Wording({ optimizer: 'adam', decay: false })),
    [],
  );
  const sel = (prefix: string) => (
    <Controls index={index} setIndex={setIndex} t={t} setT={setT} steps={L4_GATED.steps} prefix={prefix} />
  );
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_4} liveQuestions={live}>
      <PartA run={run} steps={lstm} sel={sel('a')} />
      <PartB steps={lstm} t={Math.min(t, L4_GATED.steps)} back={isLstm ? back : null} />
      <PartC
        run={run}
        steps={gru}
        sel={
          <Controls index={index} setIndex={setIndex} t={t} setT={setT} steps={L4_GATED.steps} prefix="cx" />
        }
      />
      <PartD />
      {run.ready && run.epochs.length > 0 && (
        <p className="lv-small lv-muted" data-value="recorded-summary">
          The recorded {isLstm ? 'LSTM' : 'GRU'} run: {parameterCount(run.header!.model.params)} parameters,
          loss {fmt(run.epochs[0].evalLoss, 3)} after epoch 1 and {fmt(run.epochs.at(-1)!.evalLoss, 4)} after
          epoch {run.epochs.length} ({pct(run.epochs.at(-1)!.evalAccuracy)} correct).
        </p>
      )}
      {run.ready && (
        <TraceWordingProvider value={wording}>
          <TraceExplorer stale={false} />
        </TraceWordingProvider>
      )}
    </ExperimentLayout>
  );
}
