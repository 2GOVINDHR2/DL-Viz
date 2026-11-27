/**
 * Level 4, Experiment 03 — Recurrent Neural Networks: Learning from Sequences (ADR-103).
 * A recurrent layer (4 hidden units) learns whether five numbers add up to more than zero (l4RnnConfig), trained and
 * recorded by the engine. One sequence at a chosen epoch is read from the record (readExample, rnnSteps):
 *  - Part A: the layer unrolled, one column per time step (xₜ, hₜ);
 *  - Part B: one time step taken apart: xₜ·W, hₜ₋₁·U, their sum, + b, tanh;
 *  - Part C: which recorded W and U every time step uses (the same instruction at every step);
 *  - Part D: the final hidden state through the dense layer to the prediction and the loss.
 * Every number is recorded; "checked here" marks recompute a relation from recorded values.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { L4_RNN, l4RnnConfig, level4ById } from '../../experiments/level4';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { Disclosure, EngineBadge, ErrorNote, Term } from '../components/ui';
import { LEVEL_4 } from '../curriculum';
import { fmt, fmtSigned, pct } from '../format';
import { signal } from '../signals';
import { TraceExplorer } from '../trace/TraceExplorer';
import { TraceWordingProvider } from '../trace/wording';
import { sameConfig, useOwnRun } from '../level3/common/ownRun';
import { RunsChart } from '../level3/common/RunsChart';
import { level3Wording } from '../level3/common/wording';
import { readExample, type CnnExample } from './common/cnnRecord';
import { MatrixGrid } from './common/MatrixGrid';
import { rnnSteps, values, type RnnStep } from './common/rnnRecord';
import { level4Wording, RNN_KINDS } from './common/wording';

const EXP = level4ById('03')!;
const CONFIG = l4RnnConfig();
const N = 32;
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));
const vec = (v: number[], d = 3): string => `(${v.map((x) => fmt(x, d)).join(', ')})`;
type Run = ReturnType<typeof useOwnRun>;

/** hₜ's first unit at step 2: the recorded value against the value without the previous hidden state. */
export function memoryQuestion(steps: RnnStep[] | null): LiveQuestion {
  const s = steps?.[1];
  if (!s || !s.sum)
    return {
      id: 'l4-live-memory',
      live: true,
      kind: 'predict',
      prompt: 'In Part B, what is the first value of the hidden state h₂?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train the network in Part A first.',
    };
  const h = values(s.h)[0];
  const b = values(s.z)[0] - values(s.sum)[0];
  const noMemory = Math.tanh(values(s.xw)[0] + b);
  const opts = [
    { t: fmtSigned(h, 4), ok: true },
    { t: fmtSigned(noMemory, 4), ok: false },
    { t: fmtSigned(s.x[0], 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'l4-live-memory',
    live: true,
    kind: 'predict',
    prompt: `In Part B, step 2 of the sequence shown: x₂ = ${fmtSigned(s.x[0], 3)}, and h₁ = ${vec(s.hPrev ?? [])}. What is the first value of h₂?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `h₂ = tanh(x₂·W + h₁·U + b); its first value is ${fmtSigned(h, 4)}, as recorded. Without h₁·U it would be ${fmtSigned(noMemory, 4)}: the previous hidden state changes the result.`,
    })),
  };
}

function Selection({
  run,
  index,
  setIndex,
  epoch,
  setEpoch,
}: {
  run: Run;
  index: number;
  setIndex: (v: number) => void;
  epoch: number;
  setEpoch: (v: number) => void;
}) {
  const last = (run.header?.epochStarts.length ?? 2) - 2;
  return (
    <div className="lv-row" style={{ gap: 'var(--lv-s4)', flexWrap: 'wrap' }}>
      <label className="lv-row lv-small">
        <span className="lv-control-label">Sequence</span>
        <select
          className="lv-select"
          value={index}
          onChange={(e) => {
            setIndex(Number(e.target.value));
            signal('rn-example-picked');
          }}
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
}

function PartA({
  run,
  ex,
  steps,
  sel,
}: {
  run: Run;
  ex: CnnExample | null;
  steps: RnnStep[] | null;
  sel: React.ReactNode;
}) {
  return (
    <section className="lv-part" aria-labelledby="l4-3a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l4-3a">Unroll the network</h3>
      <p className="lv-muted">
        32 sequences of five numbers between −1 and 1; the label says whether they add up to more than zero. A{' '}
        <Term meaning="A layer whose output at one time step is an input of the next.">recurrent</Term> layer
        of 4 hidden units reads one number per <Term meaning="One position in the sequence.">time step</Term>{' '}
        and updates its <Term meaning="The layer’s summary of the sequence so far.">hidden state</Term>; a
        dense layer turns the last hidden state into a probability. Adam, η = {L4_RNN.lr}.
      </p>
      <div className="lv-row" data-tour="rn-train" style={{ gap: 'var(--lv-s4)' }}>
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          disabled={run.training}
          onClick={() => void run.train(CONFIG, 'RNN', L4_RNN.dataset)}
          data-control="a:train"
        >
          {run.training ? 'Training…' : run.ready ? 'Train and record again' : 'Train and record'}
        </button>
        <span className="lv-small lv-muted">
          {L4_RNN.epochs} epochs · batches of {L4_RNN.batchSize}
        </span>
      </div>
      {run.error && <ErrorNote title="The run did not complete.">{run.error}</ErrorNote>}
      {run.ready && (
        <div className="lv-viz" data-tour="rn-unroll" style={{ marginTop: 'var(--lv-s4)' }}>
          {sel}
          {!ex || !steps ? (
            <p className="lv-small lv-muted">Reading the record…</p>
          ) : (
            <div
              className="lv-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="The layer unrolled over time"
            >
              <table className="lv-table lv-small" data-unrolled={ex.index}>
                <caption>
                  Sequence {ex.index + 1}, epoch {ex.epoch + 1}: h₀ = 0 → h₁ → … → h₅
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
                    <th scope="row">Hidden state hₜ (4 values)</th>
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
          )}
        </div>
      )}
    </section>
  );
}

function PartB({ steps, jump }: { steps: RnnStep[] | null; jump: (n: number) => Promise<void> }) {
  const [t, setT] = useState(1);
  const seen = useRef(new Set<number>());
  const s = steps?.[Math.min(t, steps.length) - 1];
  useEffect(() => {
    if (!s) return;
    seen.current.add(s.t);
    if (steps && seen.current.size === steps.length) signal('rn-all-steps');
  }, [s, steps]);
  useEffect(() => {
    seen.current = new Set();
  }, [steps]);
  if (!steps || !s)
    return (
      <section className="lv-part" aria-labelledby="l4-3b">
        <p className="lv-part-kicker">Part B</p>
        <h3 id="l4-3b">One time step</h3>
        <p className="lv-small lv-muted">Train the network in Part A first.</p>
      </section>
    );
  const z = values(s.z);
  const h = values(s.h);
  const sum = s.sum ? values(s.sum) : values(s.xw);
  const b = z.map((v, j) => v - sum[j]);
  const tanhOk = h.every((v, j) => close(Math.tanh(z[j]), v));
  const sumOk = !s.sum || values(s.sum).every((v, j) => close(values(s.xw)[j] + values(s.hu)[j], v));
  return (
    <section className="lv-part" aria-labelledby="l4-3b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l4-3b">One time step</h3>
      <p className="lv-muted">
        hₜ = tanh(xₜ·W + hₜ₋₁·U + b): the current input and the previous hidden state, each through its own
        weights.
      </p>
      <div className="lv-viz" data-tour="rn-step" data-step={s.t}>
        <div className="lv-row" style={{ gap: 'var(--lv-s2)' }}>
          <button
            type="button"
            className="lv-btn"
            disabled={s.t === 1}
            onClick={() => {
              setT(s.t - 1);
              signal('rn-step-moved');
            }}
            data-control="b:prev"
          >
            ◀ Previous time step
          </button>
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            disabled={s.t === steps.length}
            onClick={() => {
              setT(s.t + 1);
              signal('rn-step-moved');
            }}
            data-control="b:next"
          >
            Next time step ▶
          </button>
          <span className="lv-mono" data-value="step">
            t = {s.t} of {steps.length}
          </span>
        </div>
        <dl className="lv-kv" style={{ marginTop: 'var(--lv-s3)' }}>
          <dt>Input xₜ</dt>
          <dd className="lv-mono" data-value="x">
            {fmtSigned(s.x[0], 4)}
          </dd>
          <dt>Previous hidden state hₜ₋₁</dt>
          <dd className="lv-mono" data-value="hprev">
            {s.hPrev ? vec(s.hPrev, 4) : 'h₀ = 0: nothing to carry yet, so the h·U term is left out'}
          </dd>
          <dt>xₜ·W</dt>
          <dd className="lv-mono" data-value="xw">
            {vec(values(s.xw), 4)}
          </dd>
          {s.hu && (
            <>
              <dt>hₜ₋₁·U</dt>
              <dd className="lv-mono" data-value="hu">
                {vec(values(s.hu), 4)}
              </dd>
              <dt>Sum (recorded)</dt>
              <dd className="lv-mono" data-value="sum">
                {vec(sum, 4)} <span className="lv-small">{sumOk ? '✓ checked here' : '✕ differs'}</span>
              </dd>
            </>
          )}
          <dt>+ b → zₜ (recorded)</dt>
          <dd className="lv-mono" data-value="z">
            {vec(z, 4)} <span className="lv-small">(b = {vec(b, 3)})</span>
          </dd>
          <dt>hₜ = tanh(zₜ) (recorded)</dt>
          <dd className="lv-mono" data-value="h">
            {vec(h, 4)} <span className="lv-small">{tanhOk ? '✓ checked here' : '✕ differs'}</span>
          </dd>
        </dl>
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => {
            void jump(s.h.id);
            document.querySelector('[aria-label="Trace explorer"]')?.scrollIntoView({ block: 'start' });
          }}
          data-control="b:show"
          aria-label={`Show this step in the record, instruction #${s.h.id}`}
        >
          Show in the record (#{s.h.id})
        </button>
      </div>
    </section>
  );
}

function PartC({ steps, read }: { steps: RnnStep[] | null; read: Run['read'] }) {
  const [u, setU] = useState<number[] | null>(null);
  const uRef = steps?.find((s) => s.hu)?.hu?.operands.find((o) => o.role === 'weight');
  useEffect(() => {
    if (!uRef) return;
    let live = true;
    read(uRef.ref, uRef.ref + 1).then(([i]) => live && setU(Array.from(i.results[uRef.slot].data)));
    return () => {
      live = false;
    };
  }, [uRef?.ref, uRef?.slot, read]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!steps)
    return (
      <section className="lv-part" aria-labelledby="l4-3c">
        <p className="lv-part-kicker">Part C</p>
        <h3 id="l4-3c">The same weights at every time step</h3>
        <p className="lv-small lv-muted">Train the network in Part A first.</p>
      </section>
    );
  const wRefs = steps.map((s) => s.xw.operands.find((o) => o.role === 'weight')!.ref);
  const uRefs = steps.filter((s) => s.hu).map((s) => s.hu!.operands.find((o) => o.role === 'weight')!.ref);
  const oneW = new Set(wRefs).size === 1;
  const oneU = new Set(uRefs).size === 1;
  return (
    <section className="lv-part" aria-labelledby="l4-3c" data-tour="rn-shared">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l4-3c">The same weights at every time step</h3>
      <p className="lv-muted">
        Unrolling draws the layer five times, but there is only one W, one U and one b. Each time step’s
        multiplication refers to the recorded value it used.
      </p>
      <p data-value="shared">
        {oneW && oneU
          ? `All ${steps.length} time steps use W from instruction #${wRefs[0]}; steps 2–${steps.length} use U from instruction #${uRefs[0]}.`
          : 'The time steps refer to different recorded weights.'}
      </p>
      {u && <MatrixGrid values={u} rows={4} cols={4} digits={3} caption="U, the recurrent weights (4×4)" />}
      <Disclosure summary="Which recorded value each time step uses" onOpen={() => signal('rn-shared-seen')}>
        <div className="lv-table-wrap">
          <table className="lv-table lv-small">
            <thead>
              <tr>
                <th scope="col">Time step</th>
                <th scope="col">xₜ·W uses W from</th>
                <th scope="col">hₜ₋₁·U uses U from</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, k) => (
                <tr key={s.t}>
                  <th scope="row">{s.t}</th>
                  <td className="num">#{wRefs[k]}</td>
                  <td className="num">
                    {s.hu ? `#${s.hu.operands.find((o) => o.role === 'weight')!.ref}` : '— (h₀ = 0)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </section>
  );
}

function PartD({ run, ex }: { run: Run; ex: CnnExample | null }) {
  const p = ex?.probs[0];
  const target = ex?.target[0];
  const pred = p === undefined ? null : p >= 0.5 ? 1 : 0;
  const sum = ex ? ex.x.reduce((a, b) => a + b, 0) : 0;
  useEffect(() => {
    if (ex && ex.epoch === 0 && pred !== target) signal('rn-wrong-found');
  }, [ex, pred, target]);
  const loss = ex?.loss;
  const bce =
    p !== undefined && target !== undefined ? -(target * Math.log(p) + (1 - target) * Math.log(1 - p)) : NaN;
  return (
    <section className="lv-part" aria-labelledby="l4-3d">
      <p className="lv-part-kicker">Part D</p>
      <h3 id="l4-3d">From the last hidden state to a prediction</h3>
      <p className="lv-muted">
        Only the last hidden state h₅ is passed on: the dense layer computes p = σ(h₅·V + c), the probability
        that the five numbers add up to more than zero.
      </p>
      {!run.ready || !ex ? (
        <p className="lv-small lv-muted">Train the network in Part A first.</p>
      ) : (
        <div className="lv-grid-main">
          <div className="lv-viz">
            <dl className="lv-kv" data-prediction={ex.index}>
              <dt>The five numbers add up to (worked out here)</dt>
              <dd className="lv-mono" data-value="seqsum">
                {fmtSigned(sum, 2)} → label {target}
              </dd>
              <dt>p, the network’s probability of label 1 (recorded)</dt>
              <dd className="lv-mono" data-value="p">
                {fmt(p, 4)}
              </dd>
              <dt>Prediction</dt>
              <dd data-value="prediction">
                {pred} {pred === target ? '✓ correct' : '✕ wrong'}
              </dd>
              <dt>Loss (recorded)</dt>
              <dd className="lv-mono" data-value="loss">
                {fmt(loss, 4)}{' '}
                <span className="lv-small">
                  {loss !== undefined && Math.abs(bce - loss) < 1e-9 ? '✓ checked here' : '✕ differs'}
                </span>
              </dd>
            </dl>
          </div>
          <div className="lv-viz">
            <RunsChart
              title="Loss on the 32 sequences after each epoch"
              series={[{ label: 'loss', values: run.epochs.map((e) => e.evalLoss) }]}
              log
            />
            <p className="lv-small" data-value="accuracy">
              After epoch {run.epochs.length}: {pct(run.epochs.at(-1)?.evalAccuracy)} of the sequences
              correct.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export function L4Experiment03() {
  const run = useOwnRun((c) => sameConfig(c, CONFIG));
  const [index, setIndex] = useState(0);
  const [epoch, setEpoch] = useState(L4_RNN.epochs - 1);
  const [ex, setEx] = useState<CnnExample | null>(null);
  const { ready, header, read } = run;
  useEffect(() => {
    if (!ready || !header) {
      setEx(null);
      return;
    }
    let live = true;
    const last = header.epochStarts.length - 2;
    readExample(read, header, Math.min(epoch, last), index).then((e) => live && setEx(e));
    return () => {
      live = false;
    };
  }, [ready, header, read, index, epoch]);
  const steps = useMemo(() => (ex ? rnnSteps(ex) : null), [ex]);
  const live = useMemo(() => [memoryQuestion(steps)], [steps]);
  const wording = useMemo(
    () => level4Wording(RNN_KINDS, level3Wording({ optimizer: 'adam', decay: false })),
    [],
  );
  const sel = <Selection run={run} index={index} setIndex={setIndex} epoch={epoch} setEpoch={setEpoch} />;
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_4} liveQuestions={live}>
      <PartA run={run} ex={ex} steps={steps} sel={sel} />
      <PartB steps={steps} jump={run.jump} />
      <PartC steps={steps} read={read} />
      <PartD run={run} ex={ex} />
      {run.ready && (
        <TraceWordingProvider value={wording}>
          <TraceExplorer stale={false} />
        </TraceWordingProvider>
      )}
    </ExperimentLayout>
  );
}
