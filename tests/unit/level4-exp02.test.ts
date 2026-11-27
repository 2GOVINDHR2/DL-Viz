/**
 * Level 4, Experiment 02 (CNN training): the recorded forward pass of an image recomputed by hand from the recorded
 * parameters (convolution with padding, bias, ReLU, max pooling, flatten, dense, softmax, cross-entropy); kernels read
 * at an epoch against the record; every update of a kernel weight against Δ = −η·ḡ; the batch gradient as the mean of
 * the examples' recorded GRAD_CONV2D; training actually learns; and the run is deterministic.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveDataset } from '../../src/core/engine/host';
import type { Instruction } from '../../src/core/npm/ir';
import { storeSource } from '../../src/core/npm/source';
import { epochSummaries } from '../../src/core/npm/state';
import { TraceStore } from '../../src/core/npm/store';
import { L4_CNN, l4CnnConfig } from '../../src/experiments/level4';
import { readUpdateSeries } from '../../src/learn/level3/common/updates';
import { readExample, readParamAt } from '../../src/learn/level4/common/cnnRecord';
import { L4Experiment02, probabilityQuestion } from '../../src/learn/level4/Experiment02';

const record = () => {
  const { store } = TraceStore.generate(l4CnnConfig(), resolveDataset(L4_CNN.dataset), {
    embedDatasetLimit: 0,
  });
  const src = storeSource(store);
  return { src, header: store.header, read: async (a: number, b: number) => src.range(a, b) };
};

/** conv2d (cross-correlation) of [C,H,W] with [F,C,k,k], zero padding p, stride 1, plus bias. */
function conv(x: number[], c: number, h: number, w: number[], f: number, k: number, p: number, b: number[]) {
  const out: number[] = [];
  for (let o = 0; o < f; o++)
    for (let r = 0; r < h; r++)
      for (let q = 0; q < h; q++) {
        let s = b[o];
        for (let ch = 0; ch < c; ch++)
          for (let i = 0; i < k; i++)
            for (let j = 0; j < k; j++) {
              const rr = r - p + i;
              const qq = q - p + j;
              if (rr >= 0 && qq >= 0 && rr < h && qq < h)
                s += x[ch * h * h + rr * h + qq] * w[((o * c + ch) * k + i) * k + j];
            }
        out.push(s);
      }
  return out;
}
function maxPool(x: number[], c: number, h: number): number[] {
  const m = h / 2;
  const out: number[] = [];
  for (let ch = 0; ch < c; ch++)
    for (let r = 0; r < m; r++)
      for (let q = 0; q < m; q++) {
        const at = (i: number, j: number) => x[ch * h * h + (2 * r + i) * h + (2 * q + j)];
        out.push(Math.max(at(0, 0), at(0, 1), at(1, 0), at(1, 1)));
      }
  return out;
}
const relu = (v: number[]) => v.map((x) => Math.max(0, x));
const closeAll = (a: number[], b: number[], tol = 1e-12) =>
  a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b[i]))));

describe('the recorded CNN run', () => {
  const { src, header, read } = record();

  it('learns: loss after epoch 1 ≈ 0.96, after the last epoch below 0.1 and every image correct', () => {
    const ep = epochSummaries(src);
    expect(ep).toHaveLength(L4_CNN.epochs);
    expect(ep[0].evalLoss).toBeGreaterThan(0.5);
    expect(ep.at(-1)!.evalLoss).toBeLessThan(0.1);
    expect(ep.at(-1)!.evalAccuracy).toBe(1);
  });

  it('the first image of epoch 1, recomputed by hand from the starting parameters, layer by layer', async () => {
    const P: Record<string, number[]> = {};
    for (const n of ['L1.W', 'L1.b', 'L3.W', 'L3.b', 'L6.W', 'L6.b'])
      P[n] = await readParamAt(read, header, n, -1);
    const ex = await readExample(read, header, 0, 0);
    const out = (layer: string, kind: string) =>
      Array.from(ex.layers[layer].find((i: Instruction) => i.kind === kind)!.results.out.data);
    const a1 = relu(conv(ex.x, 1, 8, P['L1.W'], 4, 3, 1, P['L1.b']));
    closeAll(out('L1', 'ACTIVATE'), a1);
    const p1 = maxPool(a1, 4, 8);
    closeAll(out('L2', 'POOL'), p1);
    const a3 = relu(conv(p1, 4, 4, P['L3.W'], 4, 3, 1, P['L3.b']));
    closeAll(out('L3', 'ACTIVATE'), a3);
    const p2 = maxPool(a3, 4, 4);
    closeAll(out('L5', 'FLATTEN'), p2);
    const logits = [0, 1, 2].map(
      (j) => P['L6.b'][j] + p2.reduce((s, v, i) => s + v * P['L6.W'][i * 3 + j], 0),
    );
    closeAll(ex.logits, logits);
    const m = Math.max(...logits);
    const e = logits.map((z) => Math.exp(z - m));
    const probs = e.map((v) => v / e.reduce((a, b) => a + b));
    closeAll(ex.probs, probs);
    const t = ex.target.indexOf(1);
    expect(Math.abs(ex.loss + Math.log(probs[t]))).toBeLessThan(1e-12);
  });

  it('the kernels at an epoch are that epoch’s last recorded update; before training, the starting values', async () => {
    const init = await readParamAt(read, header, 'L1.W', -1);
    expect(init).toEqual(
      Array.from(
        src.range(0, header.epochStarts[0]).find((i) => i.meta.param === 'L1.W')!.results.value.data,
      ),
    );
    const after = await readParamAt(read, header, 'L1.W', L4_CNN.epochs - 1);
    expect(after).not.toEqual(init);
    expect(after.every((v, i) => v !== init[i])).toBe(true);
  });

  it('every update of four kernel weights: Δ = −η·ḡ and after = before + Δ, chained', async () => {
    for (const k of [0, 4, 13, 35]) {
      const s = await readUpdateSeries(read, header, 'L1.W', k);
      expect(s).toHaveLength((36 / L4_CNN.batchSize) * L4_CNN.epochs);
      s.forEach((u, t) => {
        expect(u.delta).toBe(-L4_CNN.lr * u.grad);
        expect(u.after).toBe(u.before + u.delta);
        if (t > 0) expect(u.before).toBe(s[t - 1].after);
      });
    }
  });

  it('the batch gradient of the first kernel is the mean of the six examples’ recorded GRAD_CONV2D', async () => {
    const ins = src.range(header.epochStarts[0], header.epochStarts[1]);
    const end = ins.findIndex((i) => i.kind === 'GRAD_ACCUMULATE' && i.meta.param === 'L1.W');
    const dW = ins.slice(0, end).filter((i) => i.kind === 'GRAD_CONV2D' && i.path.layer === 'L1');
    expect(dW).toHaveLength(L4_CNN.batchSize);
    const mean = Array.from(dW[0].results.dW.data).map(
      (_, j) => dW.reduce((s, i) => s + i.results.dW.data[j], 0) / dW.length,
    );
    closeAll(Array.from(ins[end].results.grad.data), mean);
  });

  it('the live question’s answer is the class with the largest recorded probability', async () => {
    const ex = await readExample(read, header, L4_CNN.epochs - 1, 4);
    const q = probabilityQuestion(ex);
    const best = ex.probs.indexOf(Math.max(...ex.probs));
    expect(q.options.filter((o) => o.correct).map((o) => o.text)).toEqual([L4_CNN.classes[best]]);
    expect(probabilityQuestion(null).unavailable).toBeTruthy();
  });

  it('is deterministic: a second run records the same instructions and the same final kernels', async () => {
    const again = record();
    expect(again.header.length).toBe(header.length);
    expect(await readParamAt(again.read, again.header, 'L3.W', L4_CNN.epochs - 1)).toEqual(
      await readParamAt(read, header, 'L3.W', L4_CNN.epochs - 1),
    );
  });
});

it('renders the page', () => {
  expect(renderToStaticMarkup(createElement(L4Experiment02))).toContain('Train the CNN');
});
