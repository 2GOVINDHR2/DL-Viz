/**
 * Level 4, Experiment 06 — Autoencoders: Learning Latent Representations (ADR-103).
 * A recorded autoencoder run (l4AeConfig: 25 → 8 → 2 → 8 → 25, MSE against the input itself):
 *  - Part A: the encoder, one image: 25 pixels → 8 hidden values → the 2-number latent code (readExample);
 *  - Part B: the latent codes of all 24 images at a chosen epoch (readLatents), plotted; the classes are coloured for
 *    the learner only, and the page reports measured distances rather than claiming a meaning;
 *  - Part C: the decoder: latent code → 8 hidden values → 25-pixel reconstruction;
 *  - Part D: the reconstruction loss, checked here as the mean squared difference of the recorded values;
 *  - Part E: training: the loss curve, the chosen image's reconstruction at three epochs, and codes of 1–4 numbers
 *    compared (compareRuns).
 */
import { useEffect, useMemo, useState } from 'react';
import { L4_AE, l4AeConfig, level4ById } from '../../experiments/level4';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { EngineBadge, ErrorNote, Term } from '../components/ui';
import { LEVEL_4 } from '../curriculum';
import { fmt } from '../format';
import { signal } from '../signals';
import { TraceExplorer } from '../trace/TraceExplorer';
import { TraceWordingProvider } from '../trace/wording';
import { useCompare } from '../level3/common/compare';
import { sameConfig, useOwnRun } from '../level3/common/ownRun';
import { RunsChart } from '../level3/common/RunsChart';
import { level3Wording } from '../level3/common/wording';
import { readLatents, type LatentPoint } from './common/aeRecord';
import { readExample, type CnnExample } from './common/cnnRecord';
import { LatentPlot } from './common/LatentPlot';
import { MatrixGrid } from './common/MatrixGrid';
import { values } from './common/rnnRecord';
import { level4Wording } from './common/wording';

const EXP = level4ById('06')!;
const CONFIG = l4AeConfig();
const N = 24;
const S = L4_AE.size;
const classOf = (i: number): number => i % 3;
const vec = (v: readonly number[], d = 3): string => `(${v.map((x) => fmt(x, d)).join(', ')})`;
type Run = ReturnType<typeof useOwnRun>;

const act = (ex: CnnExample, layer: string): number[] =>
  values(ex.layers[layer]?.find((i) => i.kind === 'ACTIVATE'));
/** Mean squared difference of the recorded input and reconstruction (worked out here). */
export const mse = (x: readonly number[], y: readonly number[]): number =>
  x.reduce((s, v, j) => s + (v - y[j]) ** 2, 0) / x.length;

/** Mean distance between codes of the same class and of different classes (worked out here from the recorded codes). */
export function distances(points: LatentPoint[]): { within: number; between: number } {
  let w = 0;
  let wn = 0;
  let b = 0;
  let bn = 0;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(...points[i].code.map((v, k) => v - points[j].code[k]));
      if (classOf(points[i].index) === classOf(points[j].index)) {
        w += d;
        wn++;
      } else {
        b += d;
        bn++;
      }
    }
  return { within: w / wn, between: b / bn };
}

export function lossQuestion(ex: CnnExample | null): LiveQuestion {
  if (!ex)
    return {
      id: 'l4-live-recon',
      live: true,
      kind: 'predict',
      prompt: 'In Part D, what is the reconstruction loss of the image shown?',
      options: [{ text: '—', feedback: '' }],
      unavailable: 'Train the autoencoder in Part A first.',
    };
  const x = ex.x;
  const y = act(ex, 'L4');
  const sq = mse(x, y);
  const abs = x.reduce((s, v, j) => s + Math.abs(v - y[j]), 0) / x.length;
  const sum = sq * x.length;
  const opts = [
    { t: fmt(ex.loss, 4), ok: true },
    { t: fmt(abs, 4), ok: false },
    { t: fmt(sum, 4), ok: false },
  ].filter((o, k, a) => a.findIndex((q) => q.t === o.t) === k);
  return {
    id: 'l4-live-recon',
    live: true,
    kind: 'predict',
    prompt: `In Part D, image ${ex.index + 1} at epoch ${ex.epoch + 1}: which number is its reconstruction loss (mean squared difference over the 25 pixels)?`,
    options: opts.map((o) => ({
      text: o.t,
      correct: o.ok,
      feedback: `The mean of the 25 squared differences is ${fmt(ex.loss, 4)}, as recorded; ${fmt(abs, 4)} is the mean absolute difference and ${fmt(sum, 4)} the sum of squares.`,
    })),
  };
}

function Image({ v, caption }: { v: readonly number[]; caption: string }) {
  return <MatrixGrid values={v} rows={S} cols={S} digits={1} scale={1} caption={caption} />;
}

function PartA({ run, ex, sel }: { run: Run; ex: CnnExample | null; sel: React.ReactNode }) {
  return (
    <section className="lv-part" aria-labelledby="l4-6a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l4-6a">The encoder</h3>
      <p className="lv-muted">
        24 noisy 5×5 bar images, each laid out as 25 values. The{' '}
        <Term meaning="The first half: from the input to the short code.">encoder</Term> maps 25 values → 8
        (tanh) → 2: the{' '}
        <Term meaning="The short vector in the middle that everything must pass through.">latent</Term> code.
        The target of every image is the image itself. Adam, η = {L4_AE.lr}, {L4_AE.epochs} epochs.
      </p>
      <div className="lv-row" data-tour="ae-train" style={{ gap: 'var(--lv-s4)' }}>
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          disabled={run.training}
          onClick={() => void run.train(CONFIG, 'Autoencoder', L4_AE.dataset)}
          data-control="a:train"
        >
          {run.training ? 'Training…' : run.ready ? 'Train and record again' : 'Train and record'}
        </button>
        <span className="lv-small lv-muted">
          Every value on this page is read from the engine’s recorded run.
        </span>
      </div>
      {run.error && <ErrorNote title="The run did not complete.">{run.error}</ErrorNote>}
      {run.ready && (
        <div className="lv-viz" data-tour="ae-encoder" style={{ marginTop: 'var(--lv-s4)' }}>
          {sel}
          {ex ? (
            <div className="lv-matrix-scroll">
              <div className="lv-matrix-row" data-encoder={ex.index}>
                <Image v={ex.x} caption={`Input image ${ex.index + 1} (25 values)`} />
                <dl className="lv-kv">
                  <dt>Encoder hidden layer (8 values, tanh)</dt>
                  <dd className="lv-mono" data-value="enc">
                    {vec(act(ex, 'L1'), 2)}
                  </dd>
                  <dt>Latent code (2 values)</dt>
                  <dd className="lv-mono" data-value="code">
                    {vec(act(ex, 'L2'), 4)}
                  </dd>
                </dl>
              </div>
            </div>
          ) : (
            <p className="lv-small lv-muted">Reading the record…</p>
          )}
        </div>
      )}
    </section>
  );
}

function PartB({ run, picked }: { run: Run; picked: number }) {
  const { ready, header, read } = run;
  const last = (header?.epochStarts.length ?? 2) - 2;
  const [epoch, setEpoch] = useState<number | null>(null);
  const [points, setPoints] = useState<LatentPoint[] | null>(null);
  const e = epoch ?? last;
  useEffect(() => {
    if (!ready || !header) {
      setPoints(null);
      return;
    }
    let live = true;
    readLatents(read, header, Math.min(e, last)).then((p) => live && setPoints(p));
    return () => {
      live = false;
    };
  }, [ready, header, read, e, last]);
  const d = points ? distances(points) : null;
  return (
    <section className="lv-part" aria-labelledby="l4-6b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l4-6b">The latent space</h3>
      <p className="lv-muted">
        Every image becomes a point with two coordinates. The input had 25 numbers; the code has 2: a{' '}
        <Term meaning="Describing data with fewer numbers than it has.">dimensionality reduction</Term>. The
        colours show the image’s class for you; the autoencoder was never told the classes, and its two
        numbers have no meaning given in advance.
      </p>
      {!ready || !points ? (
        <p className="lv-small lv-muted">Train the autoencoder in Part A first.</p>
      ) : (
        <div className="lv-viz" data-tour="ae-latent">
          <label className="lv-row lv-small">
            <span className="lv-control-label">Epoch</span>
            <input
              type="range"
              min={1}
              max={last + 1}
              value={Math.min(e, last) + 1}
              onChange={(ev) => {
                setEpoch(Number(ev.target.value) - 1);
                signal('ae-latent-epoch');
              }}
              aria-label="Epoch for the latent space"
              data-control="b:epoch"
            />
            <span className="lv-mono">{Math.min(e, last) + 1}</span>
          </label>
          <LatentPlot
            points={points}
            classes={L4_AE.classes}
            classOf={classOf}
            picked={picked}
            title={`Latent codes of the 24 images during epoch ${Math.min(e, last) + 1}`}
          />
          {d && (
            <p className="lv-small" data-value="distances">
              Measured here from the recorded codes: images of the same class are on average{' '}
              {fmt(d.within, 3)} apart, images of different classes {fmt(d.between, 3)} apart.{' '}
              {d.between > 1.5 * d.within
                ? 'At this epoch, images of the same class lie closer together than images of different classes.'
                : 'At this epoch, the classes are not clearly grouped.'}
            </p>
          )}
          <EngineBadge text="Recorded training run" />
        </div>
      )}
    </section>
  );
}

function PartC({ ex }: { ex: CnnExample | null }) {
  return (
    <section className="lv-part" aria-labelledby="l4-6c">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l4-6c">The decoder</h3>
      <p className="lv-muted">
        The{' '}
        <Term meaning="The second half: from the code back to an output of the input’s size.">decoder</Term>{' '}
        has only the 2 latent numbers to work with: 2 → 8 (tanh) → 25 (sigmoid, values between 0 and 1).
      </p>
      {!ex ? (
        <p className="lv-small lv-muted">Train the autoencoder in Part A first.</p>
      ) : (
        <div className="lv-viz" data-tour="ae-decoder">
          <div className="lv-matrix-scroll">
            <div className="lv-matrix-row" data-decoder={ex.index}>
              <dl className="lv-kv">
                <dt>Latent code</dt>
                <dd className="lv-mono">{vec(act(ex, 'L2'), 4)}</dd>
                <dt>Decoder hidden layer (8 values, tanh)</dt>
                <dd className="lv-mono" data-value="dec">
                  {vec(act(ex, 'L3'), 2)}
                </dd>
              </dl>
              <Image v={act(ex, 'L4')} caption="Reconstruction (25 values)" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PartD({ ex, run }: { ex: CnnExample | null; run: Run }) {
  const { ready, header, read } = run;
  const [all, setAll] = useState<LatentPoint[] | null>(null);
  const last = (header?.epochStarts.length ?? 2) - 2;
  useEffect(() => {
    if (!ready || !header) return;
    let live = true;
    readLatents(read, header, last).then((p) => live && setAll(p));
    return () => {
      live = false;
    };
  }, [ready, header, read, last]);
  useEffect(() => {
    if (!ex || !all || ex.epoch !== last) return;
    const worst = all.reduce((b, p) => (p.loss > b.loss ? p : b), all[0]);
    if (worst.index === ex.index) signal('ae-worst-found');
  }, [ex, all, last]);
  if (!ex)
    return (
      <section className="lv-part" aria-labelledby="l4-6d">
        <p className="lv-part-kicker">Part D</p>
        <h3 id="l4-6d">Reconstruction loss</h3>
        <p className="lv-small lv-muted">Train the autoencoder in Part A first.</p>
      </section>
    );
  const y = act(ex, 'L4');
  const diff = ex.x.map((v, j) => y[j] - v);
  const byHand = mse(ex.x, y);
  return (
    <section className="lv-part" aria-labelledby="l4-6d">
      <p className="lv-part-kicker">Part D</p>
      <h3 id="l4-6d">Reconstruction loss</h3>
      <p className="lv-muted">
        The <Term meaning="How far the output is from the input.">reconstruction loss</Term> is the mean of
        the squared differences between reconstruction and input, over the 25 pixels.
      </p>
      <div className="lv-viz">
        <div className="lv-matrix-scroll">
          <div className="lv-matrix-row">
            <Image v={ex.x} caption="Input" />
            <Image v={y} caption="Reconstruction" />
            <MatrixGrid
              values={diff}
              rows={S}
              cols={S}
              digits={2}
              scale={1}
              caption="Reconstruction − input (worked out here)"
            />
          </div>
        </div>
        <dl className="lv-kv">
          <dt>Reconstruction loss (recorded)</dt>
          <dd className="lv-mono" data-value="loss">
            {fmt(ex.loss, 5)}{' '}
            <span className="lv-small">
              {Math.abs(byHand - ex.loss) <= 1e-12
                ? '✓ the mean of the squared differences, checked here'
                : '✕ differs'}
            </span>
          </dd>
          {all && ex.epoch === last && (
            <>
              <dt>Largest loss of the 24 images (last epoch)</dt>
              <dd className="lv-mono" data-value="worst">
                {fmt(Math.max(...all.map((p) => p.loss)), 5)} (image{' '}
                {all.reduce((b, p) => (p.loss > b.loss ? p : b), all[0]).index + 1})
              </dd>
            </>
          )}
        </dl>
        <EngineBadge text="Recorded training run" />
      </div>
    </section>
  );
}

function PartE({ run, index }: { run: Run; index: number }) {
  const { ready, header, read, epochs } = run;
  const [snaps, setSnaps] = useState<CnnExample[] | null>(null);
  const { runs, busy, error, compare } = useCompare();
  useEffect(() => {
    if (!ready || !header) {
      setSnaps(null);
      return;
    }
    let live = true;
    const last = header.epochStarts.length - 2;
    Promise.all([0, Math.floor(last / 3), last].map((e) => readExample(read, header, e, index))).then(
      (s) => live && setSnaps(s),
    );
    return () => {
      live = false;
    };
  }, [ready, header, read, index]);
  return (
    <section className="lv-part" aria-labelledby="l4-6e">
      <p className="lv-part-kicker">Part E</p>
      <h3 id="l4-6e">Training</h3>
      {!ready ? (
        <p className="lv-small lv-muted">Train the autoencoder in Part A first.</p>
      ) : (
        <div className="lv-grid-main">
          <div className="lv-viz">
            <RunsChart
              title="Reconstruction loss after each epoch"
              series={[{ label: 'loss', values: epochs.map((e) => e.evalLoss) }]}
              log
            />
            {snaps && (
              <details
                className="lv-details"
                onToggle={(e) => (e.target as HTMLDetailsElement).open && signal('ae-epochs-seen')}
              >
                <summary>Image {index + 1} reconstructed at three epochs</summary>
                <div className="lv-details-body lv-matrix-scroll">
                  <div className="lv-matrix-row" data-snapshots>
                    <Image v={snaps[0].x} caption="Input" />
                    {snaps.map((s) => (
                      <Image
                        key={s.epoch}
                        v={act(s, 'L4')}
                        caption={`Epoch ${s.epoch + 1}: loss ${fmt(s.loss, 4)}`}
                      />
                    ))}
                  </div>
                </div>
              </details>
            )}
          </div>
          <section className="lv-panel" aria-label="Compare code sizes">
            <p className="lv-small" style={{ marginTop: 0 }}>
              The same autoencoder with a latent code of 1, 2, 3 or 4 numbers.
            </p>
            <button
              type="button"
              className="lv-btn lv-btn-primary"
              disabled={busy}
              onClick={async () => {
                const r = await compare(
                  L4_AE.latents.map((k) => ({ label: `code of ${k}`, config: l4AeConfig(k) })),
                  L4_AE.dataset,
                );
                if (r) signal('ae-compared');
              }}
              data-control="e:compare"
            >
              {busy ? 'Training…' : 'Train the comparison'}
            </button>
            {error && <ErrorNote title="The runs did not complete.">{error}</ErrorNote>}
            {runs && (
              <table className="lv-table lv-small">
                <thead>
                  <tr>
                    <th scope="col">Code size</th>
                    <th scope="col">Loss after epoch {L4_AE.epochs}</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r, i) => (
                    <tr key={r.label} data-latent={L4_AE.latents[i]}>
                      <th scope="row">{L4_AE.latents[i]}</th>
                      <td className="num">{fmt(r.run.losses.at(-1), 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <EngineBadge text="Trained by the engine · no record kept" />
          </section>
        </div>
      )}
    </section>
  );
}

export function L4Experiment06() {
  const run = useOwnRun((c) => sameConfig(c, CONFIG));
  const [index, setIndex] = useState(0);
  const [epoch, setEpoch] = useState(L4_AE.epochs - 1);
  const [ex, setEx] = useState<CnnExample | null>(null);
  const { ready, header, read } = run;
  const last = (header?.epochStarts.length ?? 2) - 2;
  useEffect(() => {
    if (!ready || !header) {
      setEx(null);
      return;
    }
    let live = true;
    readExample(read, header, Math.min(epoch, header.epochStarts.length - 2), index).then(
      (e) => live && setEx(e),
    );
    return () => {
      live = false;
    };
  }, [ready, header, read, index, epoch]);
  const live = useMemo(() => [lossQuestion(ex)], [ex]);
  const wording = useMemo(() => level4Wording({}, level3Wording({ optimizer: 'adam', decay: false })), []);
  const sel = (
    <div className="lv-row" style={{ gap: 'var(--lv-s4)', flexWrap: 'wrap' }}>
      <label className="lv-row lv-small">
        <span className="lv-control-label">Image</span>
        <select
          className="lv-select"
          value={index}
          onChange={(e) => {
            setIndex(Number(e.target.value));
            signal('ae-example-picked');
          }}
          data-control="a:example"
        >
          {Array.from({ length: N }, (_, i) => (
            <option key={i} value={i}>
              {i + 1} ({L4_AE.classes[classOf(i)]})
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
      <PartB run={run} picked={index} />
      <PartC ex={ex} />
      <PartD ex={ex} run={run} />
      <PartE run={run} index={index} />
      {run.ready && (
        <TraceWordingProvider value={wording}>
          <TraceExplorer stale={false} />
        </TraceWordingProvider>
      )}
    </ExperimentLayout>
  );
}
