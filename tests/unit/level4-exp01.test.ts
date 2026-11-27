/**
 * Level 4, Experiment 01 (convolution and pooling): every engine probe against an independent hand calculation —
 * cross-correlation with zero padding and stride, max and average pooling — the output-size formula against the
 * engine's shapes, the edge kernels' responses, and the live question.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { convProbe, patchIndices, poolProbe } from '../../src/learn/level4/common/probes';
import {
  A_IMAGE,
  B_IMAGE,
  C_MAP,
  HORIZONTAL,
  L4Experiment01,
  outSize,
  PATTERNS,
  sizeQuestion,
  VERTICAL,
} from '../../src/learn/level4/Experiment01';

/** Cross-correlation of an n×n image with a k×k kernel, zero padding p, stride s, by hand. */
function handConv(img: readonly number[], n: number, ker: readonly number[], s: number, p: number): number[] {
  const k = Math.round(Math.sqrt(ker.length));
  const m = Math.floor((n + 2 * p - k) / s) + 1;
  const at = (r: number, c: number): number => (r < 0 || c < 0 || r >= n || c >= n ? 0 : img[r * n + c]);
  const out: number[] = [];
  for (let r = 0; r < m; r++)
    for (let c = 0; c < m; c++) {
      let sum = 0;
      for (let i = 0; i < k; i++)
        for (let j = 0; j < k; j++) sum += at(r * s - p + i, c * s - p + j) * ker[i * k + j];
      out.push(sum);
    }
  return out;
}

describe('Part A: the convolution', () => {
  const r = convProbe(A_IMAGE, 5, [VERTICAL]).result!;

  it('the engine’s feature map is the cross-correlation computed by hand, 3×3', () => {
    expect([r.rows, r.cols]).toEqual([3, 3]);
    expect(r.maps[0]).toEqual(handConv(A_IMAGE, 5, VERTICAL, 1, 0));
    expect(r.instruction.kind).toBe('CONV2D');
  });

  it('at every position the page’s sum of products (patch × kernel) equals the engine’s value', () => {
    for (let k = 0; k < 9; k++) {
      const patch = patchIndices(5, 3, Math.floor(k / 3), k % 3);
      const sum = patch.map((p, i) => A_IMAGE[p] * VERTICAL[i]).reduce((a, b) => a + b, 0);
      expect(sum).toBe(r.maps[0][k]);
    }
  });

  it('the strongest response also occurs after the first position, so the challenge is reachable by moving', () => {
    const max = Math.max(...r.maps[0]);
    expect(r.maps[0].some((v, k) => k > 0 && v === max)).toBe(true);
  });
});

describe('Part B: stride and padding', () => {
  for (const s of [1, 2])
    for (const p of [0, 1])
      it(`stride ${s}, padding ${p}: the engine’s map equals the hand convolution, and its size the formula`, () => {
        const r = convProbe(B_IMAGE, 6, [VERTICAL], s, p).result!;
        expect(r.rows).toBe(outSize(6, 3, s, p));
        expect(r.cols).toBe(outSize(6, 3, s, p));
        expect(r.maps[0]).toEqual(handConv(B_IMAGE, 6, VERTICAL, s, p));
      });

  it('stride 1 with padding 1 keeps the 6×6 size; the live question’s answer is the engine’s row count', () => {
    expect(outSize(6, 3, 1, 1)).toBe(6);
    for (const [s, p] of [
      [1, 0],
      [2, 1],
    ]) {
      const rows = convProbe(B_IMAGE, 6, [VERTICAL], s, p).result!.rows;
      const q = sizeQuestion(s, p, rows);
      expect(q.options.filter((o) => o.correct).map((o) => o.text)).toEqual([String(rows)]);
    }
  });
});

describe('Part C: pooling', () => {
  for (const mode of ['max', 'avg'] as const)
    it(`${mode} pooling 2×2: the engine’s 2×2 map equals the hand summary of each block`, () => {
      const r = poolProbe(C_MAP, 4, mode).result!;
      expect([r.rows, r.cols]).toEqual([2, 2]);
      for (let cell = 0; cell < 4; cell++) {
        const v = patchIndices(4, 2, Math.floor(cell / 2), cell % 2, 2).map((i) => C_MAP[i]);
        expect(r.out[cell]).toBeCloseTo(
          mode === 'max' ? Math.max(...v) : v.reduce((a, b) => a + b, 0) / 4,
          12,
        );
      }
    });
});

describe('Part D: what the edge kernels respond to', () => {
  const peak = (m: number[]) => Math.max(...m.map(Math.abs));
  const run = (name: keyof typeof PATTERNS) =>
    convProbe(PATTERNS[name].image, 6, [VERTICAL, HORIZONTAL]).result!;

  it('both kernels’ weights add up to 0, so a uniform patch gives 0 everywhere', () => {
    expect(VERTICAL.reduce((a, b) => a + b)).toBe(0);
    expect(HORIZONTAL.reduce((a, b) => a + b)).toBe(0);
    const r = run('uniform');
    expect(r.maps.flat().every((v) => v === 0)).toBe(true);
  });

  it('a vertical edge excites only the vertical kernel, a horizontal edge only the horizontal one; a corner both', () => {
    expect([peak(run('vertical').maps[0]), peak(run('vertical').maps[1])]).toEqual([3, 0]);
    expect([peak(run('horizontal').maps[0]), peak(run('horizontal').maps[1])]).toEqual([0, 3]);
    const c = run('corner');
    expect(peak(c.maps[0])).toBeGreaterThan(0);
    expect(peak(c.maps[1])).toBeGreaterThan(0);
  });
});

it('renders the page with engine badges', () => {
  const html = renderToStaticMarkup(createElement(L4Experiment01));
  expect(html).toContain('Inspect a convolution');
  expect(html).toContain('Convolution computed by the engine');
});
