/**
 * Level 4, Experiment 03 (vanilla RNN): the run learns; for several sequences and epochs every time step read by
 * rnnSteps is recomputed by hand from the weights its instructions reference (xₜ·W, hₜ₋₁·U, the sum, + b, tanh), in
 * time-step order, from the dataset's own sequence; every step uses the same recorded W and U; the prediction is
 * σ(h₅·V + c) and the loss is BCE; the live question's answer is the recorded value.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveDataset } from '../../src/core/engine/host';
import type { Instruction, Operand } from '../../src/core/npm/ir';
import { storeSource } from '../../src/core/npm/source';
import { epochSummaries } from '../../src/core/npm/state';
import { TraceStore } from '../../src/core/npm/store';
import { L4_RNN, l4RnnConfig } from '../../src/experiments/level4';
import { readExample } from '../../src/learn/level4/common/cnnRecord';
import { rnnSteps, values } from '../../src/learn/level4/common/rnnRecord';
import { L4Experiment03, memoryQuestion } from '../../src/learn/level4/Experiment03';

const { store } = TraceStore.generate(l4RnnConfig(), resolveDataset(L4_RNN.dataset), {
  embedDatasetLimit: 0,
});
const src = storeSource(store);
const header = store.header;
const read = async (a: number, b: number) => src.range(a, b);
const data = resolveDataset(L4_RNN.dataset);
const valueOf = (o: Operand) => Array.from(src.get(o.ref).results[o.slot].data);
const weight = (i: Instruction) => valueOf(i.operands.find((o) => o.role === 'weight')!);
const vm = (v: number[], m: number[], cols: number) =>
  Array.from({ length: cols }, (_, j) => v.reduce((s, x, i) => s + x * m[i * cols + j], 0));
const near = (a: number[], b: number[], tol = 1e-12) =>
  a.forEach((x, j) => expect(Math.abs(x - b[j])).toBeLessThanOrEqual(tol));

describe('the recorded RNN run', () => {
  it('learns: every sequence correct and the loss below 0.05 after 40 epochs', () => {
    const ep = epochSummaries(src);
    expect(ep).toHaveLength(L4_RNN.epochs);
    expect(ep[0].evalLoss).toBeGreaterThan(0.4);
    expect(ep.at(-1)!.evalLoss).toBeLessThan(0.05);
    expect(ep.at(-1)!.evalAccuracy).toBe(1);
  });

  for (const [epoch, index] of [
    [0, 0],
    [0, 7],
    [19, 12],
    [39, 31],
  ])
    it(`epoch ${epoch + 1}, sequence ${index + 1}: every time step by hand, in order, from the referenced weights`, async () => {
      const ex = await readExample(read, header, epoch, index);
      const steps = rnnSteps(ex);
      expect(steps.map((s) => s.t)).toEqual([1, 2, 3, 4, 5]);
      const seq = Array.from(data.xs.data.slice(index * 5, index * 5 + 5));
      expect(steps.map((s) => s.x[0])).toEqual(seq);
      let h: number[] | null = null;
      for (const s of steps) {
        const W = weight(s.xw);
        const b = valueOf(s.z.operands.find((o) => o.role === 'bias')!);
        near(values(s.xw), vm(s.x, W, 4));
        if (s.t === 1) expect(s.hu).toBeNull();
        else {
          expect(s.hPrev).toEqual(h);
          near(values(s.hu), vm(h!, weight(s.hu!), 4));
          near(
            values(s.sum),
            values(s.xw).map((v, j) => v + values(s.hu)[j]),
          );
        }
        const pre = (s.sum ? values(s.sum) : values(s.xw)).map((v, j) => v + b[j]);
        near(values(s.z), pre);
        h = pre.map(Math.tanh);
        near(values(s.h), h);
      }
      // The prediction: σ(h₅·V + c), and the loss BCE of it.
      const dense = ex.layers.L2;
      const V = weight(dense.find((i) => i.kind === 'MATMUL')!);
      const c = valueOf(dense.find((i) => i.kind === 'ADD_BIAS')!.operands.find((o) => o.role === 'bias')!);
      const p = 1 / (1 + Math.exp(-(vm(h!, V, 1)[0] + c[0])));
      expect(Math.abs(ex.probs[0] - p)).toBeLessThan(1e-12);
      const y = ex.target[0];
      expect(Math.abs(ex.loss + (y * Math.log(p) + (1 - y) * Math.log(1 - p)))).toBeLessThan(1e-12);
    });

  it('every time step uses the same recorded W and the same recorded U', async () => {
    for (const epoch of [0, 25]) {
      const steps = rnnSteps(await readExample(read, header, epoch, 3));
      const ref = (i: Instruction) => i.operands.find((o) => o.role === 'weight')!.ref;
      expect(new Set(steps.map((s) => ref(s.xw))).size).toBe(1);
      expect(new Set(steps.filter((s) => s.hu).map((s) => ref(s.hu!))).size).toBe(1);
      expect(src.get(ref(steps[1].hu!)).meta.param).toBe('L1.U');
    }
  });

  it('the live question’s answer is the recorded first value of h₂', async () => {
    const steps = rnnSteps(await readExample(read, header, 39, 0));
    const q = memoryQuestion(steps);
    const right = q.options.filter((o) => o.correct);
    expect(right).toHaveLength(1);
    const h2 = values(steps[1].h)[0];
    expect(right[0].text).toBe((h2 > 0 ? '+' : '') + h2.toFixed(4).replace('-', '−'));
    expect(memoryQuestion(null).unavailable).toBeTruthy();
  });
});

it('renders the page', () => {
  expect(renderToStaticMarkup(createElement(L4Experiment03))).toContain('Unroll the network');
});
