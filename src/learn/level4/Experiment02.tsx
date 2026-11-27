/**
 * Level 4, Experiment 02 — CNN Training: From Image to Prediction (ADR-101).
 *  - Part A: a recorded training run of a small CNN on 36 bar images (l4CnnConfig); loss and accuracy after each
 *    epoch from the record's checks.
 *  - Part B: one image's forward pass as recorded during a chosen epoch of training: every feature map, the pooled
 *    maps, the class scores (logits), the softmax probabilities and the loss (readExample).
 *  - Part C: the first layer's four kernels before training and after a chosen epoch (readParamAt).
 *  - Part D: the updates of one kernel weight: ḡ, Δ = −η·ḡ, before and after (readUpdateSeries, as Level 3).
 * Every number is read from the run's record; "checked here" marks recompute a relation from recorded values.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Instruction } from '../../core/npm/ir';
import { L4_CNN, l4CnnConfig, level4ById } from '../../experiments/level4';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { Disclosure, EngineBadge, ErrorNote, RecordList, Term } from '../components/ui';
import { LEVEL_4 } from '../curriculum';
import { fmt, fmtSigned, pct } from '../format';
import { signal } from '../signals';
import { TraceExplorer } from '../trace/TraceExplorer';
import { TraceWordingProvider } from '../trace/wording';
import { sameConfig, useOwnRun } from '../level3/common/ownRun';
import { RunsChart } from '../level3/common/RunsChart';
import { readUpdateSeries, type UpdateRecord } from '../level3/common/updates';
import { readExample, readParamAt, type CnnExample } from './common/cnnRecord';
import { MatrixGrid } from './common/MatrixGrid';
import { level4Wording } from './common/wording';

const EXP = level4ById('02')!;
const CONFIG = l4CnnConfig();
const N = 36;
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));
const argmax = (v: readonly number[]): number => v.reduce((b, x, i) => (x > v[b] ? i : b), 0);
type Run = ReturnType<typeof useOwnRun>;

/** Splits a [1, C, H, W] result into C row-major maps. */
const maps = (data: Float64Array | number[], c: number): number[][] => {
  const arr = Array.from(data);
  const n = arr.length / c;
  return Array.from({ length: c }, (_, q) => arr.slice(q * n, (q + 1) * n));
};

export function probabilityQuestion(ex: CnnExample | null): LiveQuestion {
  if (!ex)
    return {
      id: 'l4-live-prob',
      live: true,
      kind: 'predict',
      prompt: 'In Part B, which class does the network predict for the image shown?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train the network in Part A first.',
    };
  const p = argmax(ex.probs);
  return {
    id: 'l4-live-prob',
    live: true,
    kind: 'predict',
    prompt: `In Part B, image ${ex.index + 1} at epoch ${ex.epoch + 1} has class probabilities ${ex.probs.map((v) => fmt(v, 3)).join(', ')} (${L4_CNN.classes.join(', ')}). Which class does the network predict?`,
    options: L4_CNN.classes.map((c, i) => ({
      text: c,
      correct: i === p,
      feedback: `The prediction is the class with the largest probability: ${L4_CNN.classes[p]} (${fmt(ex.probs[p], 3)}).`,
    })),
  };
}

function PartA({ run }: { run: Run }) {
  const { epochs } = run;
  return (
    <section className="lv-part" aria-labelledby="l4-2a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l4-2a">Train the CNN</h3>
      <p className="lv-muted">
        36 noisy 8×8 images of horizontal, vertical and diagonal bars. The network: two{' '}
        <Term meaning="A layer of kernels; each gives one feature map, followed by an activation.">
          convolutional layers
        </Term>{' '}
        of four 3×3 kernels (ReLU), each followed by 2×2 max pooling, then{' '}
        <Term meaning="Laying the feature maps out as one vector.">flatten</Term> and a dense layer with
        softmax over the three classes. Plain gradient descent, η = {L4_CNN.lr}, batches of {L4_CNN.batchSize}
        .
      </p>
      <div className="lv-row" data-tour="cn-train" style={{ gap: 'var(--lv-s4)' }}>
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          disabled={run.training}
          onClick={() => void run.train(CONFIG, 'CNN', L4_CNN.dataset)}
          data-control="a:train"
        >
          {run.training ? 'Training…' : run.ready ? 'Train and record again' : 'Train and record'}
        </button>
        <span className="lv-small lv-muted">
          {L4_CNN.epochs} epochs · {(N / L4_CNN.batchSize) * L4_CNN.epochs} updates
        </span>
      </div>
      {run.error && <ErrorNote title="The run did not complete.">{run.error}</ErrorNote>}
      {run.ready && run.header && epochs.length > 0 && (
        <div className="lv-viz" style={{ marginTop: 'var(--lv-s4)' }}>
          <div className="lv-viz-title">
            <span>Loss after each epoch</span>
            <EngineBadge text="Recorded training run" instructions={run.header.length} />
          </div>
          <RunsChart
            title="Loss on the 36 images after each epoch"
            series={[{ label: 'loss', values: epochs.map((e) => e.evalLoss) }]}
            log
          />
          <p className="lv-small" data-value="final">
            After epoch 1: loss {fmt(epochs[0].evalLoss, 3)}, {pct(epochs[0].evalAccuracy)} correct. After
            epoch {epochs.length}: loss {fmt(epochs.at(-1)!.evalLoss, 3)}, {pct(epochs.at(-1)!.evalAccuracy)}{' '}
            correct.
          </p>
        </div>
      )}
    </section>
  );
}

function FeatureMaps({ ins, size, title }: { ins: Instruction; size: number; title: string }) {
  const ms = maps(ins.results.out.data, 4);
  const scale = Math.max(1e-9, ...ms.flat().map(Math.abs));
  return (
    <figure style={{ margin: 0 }}>
      <figcaption className="lv-small lv-muted">{title}</figcaption>
      <div className="lv-matrix-row" style={{ gap: 'var(--lv-s2)' }}>
        {ms.map((m, q) => (
          <MatrixGrid
            key={q}
            values={m}
            rows={size}
            cols={size}
            digits={1}
            scale={scale}
            caption={`Map ${q + 1}`}
          />
        ))}
      </div>
    </figure>
  );
}

function PartB({ run, onExample }: { run: Run; onExample: (e: CnnExample | null) => void }) {
  const [index, setIndex] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [ex, setEx] = useState<CnnExample | null>(null);
  const { ready, header, read } = run;
  const last = (header?.epochStarts.length ?? 1) - 2;
  useEffect(() => {
    if (!ready || !header) {
      setEx(null);
      onExample(null);
      return;
    }
    let live = true;
    readExample(read, header, Math.min(epoch, last), index).then((e) => {
      if (!live) return;
      setEx(e);
      onExample(e);
    });
    return () => {
      live = false;
    };
  }, [ready, header, read, index, epoch, last, onExample]);
  const pred = ex ? argmax(ex.probs) : -1;
  const truth = ex ? argmax(ex.target) : -1;
  useEffect(() => {
    if (!ex) return;
    if (ex.epoch === 0 && pred !== truth) signal('cn-wrong-found');
    if (ex.epoch === last) signal('cn-sure-seen');
  }, [ex, pred, truth, last]);
  const L = ex?.layers ?? {};
  return (
    <section className="lv-part" aria-labelledby="l4-2b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l4-2b">Follow one image through the network</h3>
      <p className="lv-muted">
        The values each layer produced for one image, as recorded while the network trained during the chosen
        epoch (before that batch’s update).
      </p>
      {!ready || !header ? (
        <p className="lv-small lv-muted">Train the network in Part A first.</p>
      ) : (
        <div className="lv-viz" data-tour="cn-forward">
          <div className="lv-row" style={{ gap: 'var(--lv-s4)', flexWrap: 'wrap' }}>
            <label className="lv-row lv-small">
              <span className="lv-control-label">Image</span>
              <select
                className="lv-select"
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  signal('cn-example-picked');
                }}
                data-control="b:example"
              >
                {Array.from({ length: N }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1} ({L4_CNN.classes[i % 3]})
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
                aria-label="Epoch for the forward pass"
                data-control="b:epoch"
              />
              <span className="lv-mono">{Math.min(epoch, last) + 1}</span>
            </label>
            <EngineBadge text="Recorded training run" />
          </div>
          {!ex ? (
            <p className="lv-small lv-muted">Reading the record…</p>
          ) : (
            <div className="lv-stack" data-example={ex.index} data-epoch={ex.epoch + 1}>
              <div className="lv-matrix-scroll">
                <div className="lv-matrix-row">
                  <MatrixGrid
                    values={ex.x}
                    rows={8}
                    cols={8}
                    digits={1}
                    scale={1}
                    caption={`Input image ${ex.index + 1}`}
                  />
                </div>
              </div>
              <div className="lv-matrix-scroll">
                <FeatureMaps
                  ins={L.L1.find((i) => i.kind === 'ACTIVATE')!}
                  size={8}
                  title="Layer 1: convolution, then ReLU (four 8×8 feature maps)"
                />
              </div>
              <div className="lv-matrix-scroll">
                <FeatureMaps ins={L.L2[0]} size={4} title="Layer 2: max pooling 2×2 (four 4×4 maps)" />
              </div>
              <div className="lv-matrix-scroll">
                <FeatureMaps
                  ins={L.L3.find((i) => i.kind === 'ACTIVATE')!}
                  size={4}
                  title="Layer 3: convolution over all four maps, then ReLU (four 4×4 maps)"
                />
              </div>
              <div className="lv-matrix-scroll">
                <FeatureMaps
                  ins={L.L4[0]}
                  size={2}
                  title="Layer 4: max pooling 2×2 (four 2×2 maps), flattened to 16 values"
                />
              </div>
              <div
                className="lv-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Class scores and probabilities"
              >
                <table className="lv-table lv-small">
                  <caption>Dense layer and softmax</caption>
                  <thead>
                    <tr>
                      <th scope="col">Class</th>
                      <th scope="col">Score (logit)</th>
                      <th scope="col">Probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {L4_CNN.classes.map((c, i) => (
                      <tr key={c} data-class={c}>
                        <th scope="row">
                          {c}
                          {i === truth ? ' (correct class)' : ''}
                        </th>
                        <td className="num">{fmt(ex.logits[i], 3)}</td>
                        <td className="num">{fmt(ex.probs[i], 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="lv-kv">
                <dt>Prediction (largest probability)</dt>
                <dd data-value="prediction">
                  {L4_CNN.classes[pred]} {pred === truth ? '✓ correct' : '✕ wrong'}
                </dd>
                <dt>Loss: −ln(probability of the correct class)</dt>
                <dd className="lv-mono" data-value="loss">
                  {fmt(ex.loss, 4)}{' '}
                  <span className="lv-small">
                    {Math.abs(-Math.log(ex.probs[truth]) - ex.loss) < 1e-9 ? '✓ checked here' : '✕ differs'}
                  </span>
                </dd>
              </dl>
              <Disclosure summary="This image’s steps in the record">
                <RecordList instructions={ex.instructions} max={20} />
              </Disclosure>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PartC({ run }: { run: Run }) {
  const { ready, header, read } = run;
  const last = (header?.epochStarts.length ?? 1) - 2;
  const [epoch, setEpoch] = useState<number | null>(null);
  const [kernels, setKernels] = useState<{ before: number[]; after: number[] } | null>(null);
  const e = epoch ?? last;
  useEffect(() => {
    if (!ready || !header) {
      setKernels(null);
      return;
    }
    let live = true;
    Promise.all([readParamAt(read, header, 'L1.W', -1), readParamAt(read, header, 'L1.W', e)]).then(
      ([before, after]) => live && setKernels({ before, after }),
    );
    return () => {
      live = false;
    };
  }, [ready, header, read, e]);
  return (
    <section className="lv-part" aria-labelledby="l4-2c">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l4-2c">The kernels learn</h3>
      <p className="lv-muted">
        The four 3×3 kernels of the first layer, as the run started (random values) and after the chosen
        epoch.
      </p>
      {!ready || !header ? (
        <p className="lv-small lv-muted">Train the network in Part A first.</p>
      ) : (
        <div className="lv-viz" data-tour="cn-kernels">
          <label className="lv-row lv-small">
            <span className="lv-control-label">After epoch</span>
            <input
              type="range"
              min={1}
              max={last + 1}
              value={e + 1}
              onChange={(ev) => {
                setEpoch(Number(ev.target.value) - 1);
                signal('cn-epoch-picked');
              }}
              aria-label="Epoch for the kernels"
              data-control="c:epoch"
            />
            <span className="lv-mono">{e + 1}</span>
          </label>
          {kernels && (
            <div className="lv-matrix-scroll">
              <div className="lv-stack" data-kernels-epoch={e + 1}>
                {[0, 1, 2, 3].map((q) => {
                  const b = kernels.before.slice(q * 9, q * 9 + 9);
                  const a = kernels.after.slice(q * 9, q * 9 + 9);
                  const s = Math.max(...b.map(Math.abs), ...a.map(Math.abs));
                  return (
                    <div key={q} className="lv-matrix-row" data-kernel={q + 1}>
                      <MatrixGrid
                        values={b}
                        rows={3}
                        cols={3}
                        scale={s}
                        caption={`Kernel ${q + 1} at the start`}
                      />
                      <MatrixGrid
                        values={a}
                        rows={3}
                        cols={3}
                        scale={s}
                        caption={`Kernel ${q + 1} after epoch ${e + 1}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <EngineBadge text="Recorded training run" />
        </div>
      )}
    </section>
  );
}

function PartD({ run }: { run: Run }) {
  const { ready, header, read } = run;
  const [k, setK] = useState(4);
  const [n, setN] = useState(0);
  const [series, setSeries] = useState<UpdateRecord[] | null>(null);
  useEffect(() => {
    if (!ready || !header) {
      setSeries(null);
      return;
    }
    let live = true;
    readUpdateSeries(read, header, 'L1.W', k).then((s) => live && setSeries(s));
    return () => {
      live = false;
    };
  }, [ready, header, read, k]);
  const u = series?.[Math.min(n, (series?.length ?? 1) - 1)];
  return (
    <section className="lv-part" aria-labelledby="l4-2d">
      <p className="lv-part-kicker">Part D</p>
      <h3 id="l4-2d">One update of a kernel weight</h3>
      <p className="lv-muted">
        A kernel weight is used at every position of the image, so its gradient adds up the effect of all
        those positions (and all images of the batch, averaged). Then it is updated like any weight: Δ = −η·ḡ.
      </p>
      {!ready || !header ? (
        <p className="lv-small lv-muted">Train the network in Part A first.</p>
      ) : (
        <div className="lv-viz" data-tour="cn-update">
          <div className="lv-row" style={{ gap: 'var(--lv-s4)', flexWrap: 'wrap' }}>
            <label className="lv-row lv-small">
              <span className="lv-control-label">Kernel weight</span>
              <select
                className="lv-select"
                value={k}
                onChange={(e) => setK(Number(e.target.value))}
                data-control="d:weight"
              >
                {Array.from({ length: 36 }, (_, i) => (
                  <option key={i} value={i}>
                    kernel {Math.floor(i / 9) + 1}, row {Math.floor((i % 9) / 3) + 1}, column {(i % 3) + 1}
                  </option>
                ))}
              </select>
            </label>
            {series && (
              <label className="lv-row lv-small" style={{ flex: '1 1 220px' }}>
                <span className="lv-control-label">Update</span>
                <input
                  type="range"
                  min={1}
                  max={series.length}
                  value={Math.min(n, series.length - 1) + 1}
                  onChange={(e) => {
                    setN(Number(e.target.value) - 1);
                    signal('cn-update-picked');
                  }}
                  aria-label="Update number"
                  data-control="d:update"
                />
                <span className="lv-mono" data-value="update-number">
                  {Math.min(n, series.length - 1) + 1} of {series.length}
                </span>
              </label>
            )}
          </div>
          {u ? (
            <dl className="lv-kv" data-update={u.n}>
              <dt>Mean gradient ḡ over the batch</dt>
              <dd className="lv-mono" data-value="grad">
                {fmtSigned(u.grad, 6)}
              </dd>
              <dt>Step Δ (recorded)</dt>
              <dd className="lv-mono" data-value="delta">
                {fmtSigned(u.delta, 6)}{' '}
                <span className="lv-small">
                  {close(-u.lr * u.grad, u.delta) ? '✓ −η·ḡ, checked here' : '✕ differs'}
                </span>
              </dd>
              <dt>Value before → after</dt>
              <dd className="lv-mono" data-value="before-after">
                {fmt(u.before, 4)} → {fmt(u.after, 4)}
              </dd>
            </dl>
          ) : (
            <p className="lv-small lv-muted">Reading the updates…</p>
          )}
          <EngineBadge text="Recorded training run" />
        </div>
      )}
    </section>
  );
}

export function L4Experiment02() {
  const run = useOwnRun((c) => sameConfig(c, CONFIG));
  const [ex, setEx] = useState<CnnExample | null>(null);
  const live = useMemo(() => [probabilityQuestion(ex)], [ex]);
  const wording = useMemo(() => level4Wording(), []);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_4} liveQuestions={live}>
      <PartA run={run} />
      <PartB run={run} onExample={setEx} />
      <PartC run={run} />
      <PartD run={run} />
      {run.ready && (
        <TraceWordingProvider value={wording}>
          <TraceExplorer stale={false} />
        </TraceWordingProvider>
      )}
    </ExperimentLayout>
  );
}
