/**
 * Level 4, Experiment 01 — Convolutional Neural Networks: From Filters to Feature Maps (ADR-101).
 * Every feature map and pooled map is an engine probe (convProbe, poolProbe): the engine's own convolution and
 * pooling, read back from the recorded CONV2D or POOL instruction. The kernels are chosen by hand and labelled so.
 * What this page works out itself (the element-wise products and their sum, the output-size formula, which values a
 * pooling block contains) is labelled "worked out here" and checked against the engine's value.
 */
import { useEffect, useMemo, useState } from 'react';
import { level4ById } from '../../experiments/level4';
import { ExperimentLayout } from '../components/ExperimentLayout';
import type { LiveQuestion } from '../components/KnowledgeCheck';
import { Disclosure, EngineBadge, ErrorNote, RecordList, Segmented, Term } from '../components/ui';
import { LEVEL_4 } from '../curriculum';
import { fmt } from '../format';
import { signal } from '../signals';
import { MatrixGrid } from './common/MatrixGrid';
import { convProbe, patchIndices, poolProbe } from './common/probes';

const EXP = level4ById('01')!;
const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

/** A 5×5 image with a bright region whose left edge runs down the middle. */
export const A_IMAGE = [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0];
/** A vertical-edge kernel, chosen by hand: dark on the left, bright on the right gives a large value. */
export const VERTICAL = [-1, 0, 1, -1, 0, 1, -1, 0, 1];
export const HORIZONTAL = [-1, -1, -1, 0, 0, 0, 1, 1, 1];

/** A 6×6 image for Part B. */
export const B_IMAGE = [
  0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0,
];

/** A 4×4 feature map for Part C. */
export const C_MAP = [1, 3, 0, 2, 4, 2, 1, 0, 0, 1, 5, 2, 2, 0, 3, 1];

/** Part D's 6×6 patterns. */
const fill = (f: (r: number, c: number) => number): number[] =>
  Array.from({ length: 36 }, (_, k) => f(Math.floor(k / 6), k % 6));
export const PATTERNS = {
  vertical: { label: 'Vertical edge', image: fill((_, c) => (c >= 3 ? 1 : 0)) },
  horizontal: { label: 'Horizontal edge', image: fill((r) => (r >= 3 ? 1 : 0)) },
  corner: { label: 'Corner', image: fill((r, c) => (r >= 3 && c >= 3 ? 1 : 0)) },
  uniform: { label: 'Uniform', image: fill(() => 1) },
} as const;
export type PatternName = keyof typeof PATTERNS;

/** Output size along one side: ⌊(n + 2p − k)/s⌋ + 1. */
export const outSize = (n: number, k: number, s: number, p: number): number =>
  Math.floor((n + 2 * p - k) / s) + 1;

export function sizeQuestion(stride: number, padding: number, engineRows: number | null): LiveQuestion {
  const right = outSize(6, 3, stride, padding);
  const opts = [right, outSize(6, 3, 1, 0), outSize(6, 3, 1, 1), outSize(6, 3, 2, 0) + 1]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3);
  return {
    id: 'l4-live-size',
    live: true,
    kind: 'predict',
    prompt: `With your Part B settings (6×6 input, 3×3 kernel, stride ${stride}, padding ${padding}), how many rows does the feature map have?`,
    options: opts.map((v) => ({
      text: String(v),
      correct: v === right,
      feedback: `⌊(6 + 2·${padding} − 3)/${stride}⌋ + 1 = ${right}; the engine’s feature map has ${engineRows ?? right} rows.`,
    })),
  };
}

function PartA() {
  const r = convProbe(A_IMAGE, 5, [VERTICAL]);
  const [k, setK] = useState(0);
  const conv = r.result;
  useEffect(() => {
    if (!conv) return;
    // Any position (after a move) whose value is the map's largest: the maximum can occur more than once.
    if (k > 0 && conv.maps[0][k] === Math.max(...conv.maps[0])) signal('cv-max-found');
  }, [k, conv]);
  if (!conv) return <ErrorNote title="The engine could not run this convolution.">{r.error}</ErrorNote>;
  const { rows, cols } = conv;
  const row = Math.floor(k / cols);
  const col = k % cols;
  const patch = patchIndices(5, 3, row, col);
  const products = patch.map((p, i) => A_IMAGE[p] * VERTICAL[i]);
  const sum = products.reduce((a, b) => a + b, 0);
  const engine = conv.maps[0][k];
  const move = (d: number): void => {
    setK((v) => Math.min(rows * cols - 1, Math.max(0, v + d)));
    signal('cv-moved');
  };
  return (
    <section className="lv-part" aria-labelledby="l4-1a">
      <p className="lv-part-kicker">Part A</p>
      <h3 id="l4-1a">Inspect a convolution</h3>
      <p className="lv-muted">
        A 5×5 image and a 3×3 <Term meaning="A small grid of weights slid across the image.">kernel</Term>,
        chosen by hand to respond to a dark-to-bright step from left to right. The kernel visits 3×3 = 9
        positions; each gives one value of the{' '}
        <Term meaning="The grid of the kernel’s responses at every position.">feature map</Term>.
      </p>
      <div className="lv-viz" data-tour="cv-step" data-position={k}>
        <div className="lv-viz-title">
          <span>
            Position {k + 1} of {rows * cols}: row {row + 1}, column {col + 1}
          </span>
          <EngineBadge
            text="Convolution computed by the engine · kernel chosen by hand"
            instructions={conv.length}
          />
        </div>
        <div className="lv-row" style={{ gap: 'var(--lv-s2)', marginBottom: 'var(--lv-s3)' }}>
          <button
            type="button"
            className="lv-btn"
            onClick={() => move(-1)}
            disabled={k === 0}
            data-control="a:prev"
          >
            ◀ Previous position
          </button>
          <button
            type="button"
            className="lv-btn lv-btn-primary"
            onClick={() => move(1)}
            disabled={k === rows * cols - 1}
            data-control="a:next"
          >
            Next position ▶
          </button>
        </div>
        <div className="lv-matrix-scroll">
          <div className="lv-matrix-row">
            <MatrixGrid
              values={A_IMAGE}
              rows={5}
              cols={5}
              digits={0}
              scale={1}
              caption="Input image (the outlined patch is under the kernel)"
              highlight={new Set(patch)}
            />
            <MatrixGrid values={VERTICAL} rows={3} cols={3} digits={0} caption="Kernel (chosen by hand)" />
            <MatrixGrid
              values={products}
              rows={3}
              cols={3}
              digits={0}
              scale={1}
              caption="Patch × kernel, element by element (worked out here)"
            />
            <MatrixGrid
              values={conv.maps[0]}
              rows={rows}
              cols={cols}
              digits={0}
              caption="Feature map (engine)"
              picked={k}
              onPick={(i) => {
                setK(i);
                signal('cv-moved');
              }}
              control="a:cell"
            />
          </div>
        </div>
        <dl className="lv-kv" style={{ marginTop: 'var(--lv-s3)' }}>
          <dt>Sum of the nine products (worked out here)</dt>
          <dd className="lv-mono" data-value="sum">
            {products.map((p) => fmt(p, 0)).join(' + ')} = {fmt(sum, 0)}
          </dd>
          <dt>The engine’s output value at this position</dt>
          <dd className="lv-mono" data-value="engine">
            {fmt(engine, 0)}{' '}
            <span className="lv-small">{close(sum, engine) ? '✓ equals the sum' : '✕ differs'}</span>
          </dd>
        </dl>
        <Disclosure summary="The engine’s record of this convolution">
          <RecordList instructions={[conv.instruction]} />
        </Disclosure>
      </div>
    </section>
  );
}

function PartB({
  stride,
  padding,
  setStride,
  setPadding,
}: {
  stride: number;
  padding: number;
  setStride: (v: number) => void;
  setPadding: (v: number) => void;
}) {
  const r = convProbe(B_IMAGE, 6, [VERTICAL], stride, padding);
  useEffect(() => {
    if (stride === 1 && padding === 1) signal('cv-same-found');
  }, [stride, padding]);
  const formula = outSize(6, 3, stride, padding);
  return (
    <section className="lv-part" aria-labelledby="l4-1b">
      <p className="lv-part-kicker">Part B</p>
      <h3 id="l4-1b">Stride and padding</h3>
      <p className="lv-muted">
        <Term meaning="How many pixels the kernel moves between positions.">Stride</Term> and{' '}
        <Term meaning="A border of zeros added around the input.">padding</Term> decide how many positions the
        kernel visits, and so the size of the feature map: ⌊(n + 2p − k)/s⌋ + 1 along each side.
      </p>
      <div className="lv-grid-main">
        <div className="lv-viz">
          <div className="lv-viz-title">
            <span>6×6 input, the same vertical-edge kernel</span>
            <EngineBadge text="Computed by the engine" />
          </div>
          {r.result ? (
            <div className="lv-matrix-scroll">
              <div className="lv-matrix-row">
                <MatrixGrid values={B_IMAGE} rows={6} cols={6} digits={0} scale={1} caption="Input image" />
                <MatrixGrid
                  values={r.result.maps[0]}
                  rows={r.result.rows}
                  cols={r.result.cols}
                  digits={0}
                  caption={`Feature map (engine): ${r.result.rows}×${r.result.cols}`}
                />
              </div>
            </div>
          ) : (
            <ErrorNote title="The engine could not run this convolution.">{r.error}</ErrorNote>
          )}
          <dl className="lv-kv" style={{ marginTop: 'var(--lv-s3)' }}>
            <dt>Size from the formula (worked out here)</dt>
            <dd className="lv-mono" data-value="formula">
              ⌊(6 + 2·{padding} − 3)/{stride}⌋ + 1 = {formula}
            </dd>
            <dt>Size of the engine’s feature map</dt>
            <dd className="lv-mono" data-value="shape">
              {r.result ? `${r.result.rows}×${r.result.cols}` : '—'}
            </dd>
          </dl>
        </div>
        <section className="lv-panel" aria-label="Stride and padding" data-tour="cv-shape">
          <Segmented
            legend="Stride"
            options={[1, 2].map((v) => ({ value: v, label: String(v) }))}
            value={stride}
            onChange={(v) => {
              setStride(v);
              signal('cv-shape-changed');
            }}
            control="b:stride"
          />
          <div style={{ height: 'var(--lv-s3)' }} />
          <Segmented
            legend="Padding"
            options={[0, 1].map((v) => ({ value: v, label: String(v) }))}
            value={padding}
            onChange={(v) => {
              setPadding(v);
              signal('cv-shape-changed');
            }}
            control="b:padding"
          />
          <p className="lv-small lv-muted">
            With padding 1 the kernel can sit on the border, where it also sees the added zeros.
          </p>
        </section>
      </div>
    </section>
  );
}

function PartC() {
  const [mode, setMode] = useState<'max' | 'avg'>('max');
  const [cell, setCell] = useState(0);
  const r = poolProbe(C_MAP, 4, mode);
  const pool = r.result;
  const row = Math.floor(cell / 2);
  const col = cell % 2;
  const block = patchIndices(4, 2, row, col, 2);
  const vals = block.map((i) => C_MAP[i]);
  const top = Math.max(...vals);
  const strong = new Set(mode === 'max' ? block.filter((i) => C_MAP[i] === top) : block);
  const worked = mode === 'max' ? top : vals.reduce((a, b) => a + b, 0) / 4;
  return (
    <section className="lv-part" aria-labelledby="l4-1c">
      <p className="lv-part-kicker">Part C</p>
      <h3 id="l4-1c">Pooling</h3>
      <p className="lv-muted">
        <Term meaning="Summarising each block of a feature map by one value.">Pooling</Term> with 2×2 blocks
        halves a feature map in each direction. Max pooling keeps the largest value of each block; average
        pooling keeps their mean. Pooling has no weights.
      </p>
      <div className="lv-viz" data-tour="cv-pool">
        <div className="lv-viz-title">
          <Segmented
            legend="Pooling"
            options={[
              { value: 'max' as const, label: 'Max' },
              { value: 'avg' as const, label: 'Average' },
            ]}
            value={mode}
            onChange={setMode}
            control="c:mode"
          />
          <EngineBadge text="Pooled by the engine" />
        </div>
        {pool ? (
          <>
            <div className="lv-matrix-row">
              <MatrixGrid
                values={C_MAP}
                rows={4}
                cols={4}
                digits={0}
                caption="Feature map (given)"
                highlight={new Set(block)}
                strong={strong}
              />
              <MatrixGrid
                values={pool.out}
                rows={pool.rows}
                cols={pool.cols}
                digits={2}
                caption="Pooled map (engine): choose a cell"
                picked={cell}
                onPick={(i) => {
                  setCell(i);
                  signal('cv-pool-picked');
                }}
                control="c:cell"
              />
            </div>
            <p className="lv-small" data-value="pool-explain">
              Output cell (row {row + 1}, column {col + 1}) summarises the outlined block {vals.join(', ')}.{' '}
              {mode === 'max'
                ? `The largest, ${top} (marked), is kept; the other values do not affect this output.`
                : `All four contribute equally: (${vals.join(' + ')}) / 4 = ${fmt(worked, 2)}.`}{' '}
              The engine’s value: <span className="lv-mono">{fmt(pool.out[cell], 2)}</span>{' '}
              {close(worked, pool.out[cell]) ? '✓' : '✕ differs'}
            </p>
          </>
        ) : (
          <ErrorNote title="The engine could not pool this map.">{r.error}</ErrorNote>
        )}
      </div>
    </section>
  );
}

function PartD() {
  const [name, setName] = useState<PatternName>('vertical');
  const p = PATTERNS[name];
  const r = convProbe(p.image, 6, [VERTICAL, HORIZONTAL]);
  useEffect(() => {
    if (name === 'uniform') signal('cv-uniform-seen');
  }, [name]);
  const res = r.result;
  const peak = (m: number[]): number => Math.max(...m.map((v) => Math.abs(v)));
  return (
    <section className="lv-part" aria-labelledby="l4-1d">
      <p className="lv-part-kicker">Part D</p>
      <h3 id="l4-1d">What a kernel responds to</h3>
      <p className="lv-muted">
        Two hand-chosen kernels, one for vertical edges and one for horizontal edges, on four simple 6×6
        patterns. Each kernel’s weights add up to 0, so on a region of equal values its products cancel.
      </p>
      <div className="lv-viz" data-tour="cv-filters">
        <div className="lv-viz-title">
          <Segmented
            legend="Input pattern"
            options={(Object.keys(PATTERNS) as PatternName[]).map((n) => ({
              value: n,
              label: PATTERNS[n].label,
            }))}
            value={name}
            onChange={(v) => {
              setName(v);
              signal('cv-pattern-picked');
            }}
            control="d:pattern"
          />
          <EngineBadge text="Computed by the engine · kernels chosen by hand" />
        </div>
        {res ? (
          <div className="lv-matrix-scroll">
            <div className="lv-matrix-row">
              <MatrixGrid
                values={p.image}
                rows={6}
                cols={6}
                digits={0}
                scale={1}
                caption={`Input: ${p.label}`}
              />
              <MatrixGrid
                values={res.maps[0]}
                rows={res.rows}
                cols={res.cols}
                digits={0}
                scale={3}
                caption="Vertical-edge kernel’s feature map"
              />
              <MatrixGrid
                values={res.maps[1]}
                rows={res.rows}
                cols={res.cols}
                digits={0}
                scale={3}
                caption="Horizontal-edge kernel’s feature map"
              />
            </div>
          </div>
        ) : (
          <ErrorNote title="The engine could not run this convolution.">{r.error}</ErrorNote>
        )}
        {res && (
          <table className="lv-table lv-small" style={{ marginTop: 'var(--lv-s3)' }}>
            <caption>Strongest response of each kernel (largest absolute value in its feature map)</caption>
            <thead>
              <tr>
                <th scope="col">Kernel</th>
                <th scope="col">Strongest response</th>
              </tr>
            </thead>
            <tbody>
              <tr data-kernel="vertical">
                <th scope="row">Vertical edge</th>
                <td className="num">{fmt(peak(res.maps[0]), 0)}</td>
              </tr>
              <tr data-kernel="horizontal">
                <th scope="row">Horizontal edge</th>
                <td className="num">{fmt(peak(res.maps[1]), 0)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export function L4Experiment01() {
  const [stride, setStride] = useState(1);
  const [padding, setPadding] = useState(0);
  const rows = useMemo(
    () => convProbe(B_IMAGE, 6, [VERTICAL], stride, padding).result?.rows ?? null,
    [stride, padding],
  );
  const live = useMemo(() => [sizeQuestion(stride, padding, rows)], [stride, padding, rows]);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_4} liveQuestions={live}>
      <PartA />
      <PartB stride={stride} padding={padding} setStride={setStride} setPadding={setPadding} />
      <PartC />
      <PartD />
    </ExperimentLayout>
  );
}
