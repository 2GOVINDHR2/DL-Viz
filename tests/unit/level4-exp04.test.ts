/**
 * Level 4, Experiment 04 (BPTT): the recorded backward pass, step by step, against hand calculations from the recorded
 * forward values and weights — ∂ℓ/∂zₜ = ∂ℓ/∂hₜ ⊙ (1 − hₜ²), U's contribution hₜ₋₁ᵀ·∂ℓ/∂zₜ, the gradient sent back
 * ∂ℓ/∂zₜ·Uᵀ, and the chain from one step to the previous; U's recorded sum over its uses; truncation's reach (probes);
 * full against truncated training (compareRuns); the probes' vanishing and exploding cases.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EngineHost, resolveDataset } from '../../src/core/engine/host';
import type { Operand } from '../../src/core/npm/ir';
import { storeSource } from '../../src/core/npm/source';
import { epochSummaries } from '../../src/core/npm/state';
import { TraceStore } from '../../src/core/npm/store';
import { L4_BPTT, l4BpttConfig } from '../../src/experiments/level4';
import { gradientSizes, truncationProbe } from '../../src/learn/level4/common/bpttProbes';
import { readExample } from '../../src/learn/level4/common/cnnRecord';
import { readBackward, rnnBackSteps, rnnSteps, values } from '../../src/learn/level4/common/rnnRecord';
import { L4Experiment04, sumQuestion } from '../../src/learn/level4/Experiment04';

const { store } = TraceStore.generate(l4BpttConfig(), resolveDataset(L4_BPTT.dataset), {
  embedDatasetLimit: 0,
});
const src = storeSource(store);
const read = async (a: number, b: number) => src.range(a, b);
const valueOf = (o: Operand) => Array.from(src.get(o.ref).results[o.slot].data);
const H = L4_BPTT.hidden;
const near = (a: number[], b: number[], tol = 1e-12) =>
  a.forEach((x, j) =>
    expect(Math.abs(x - b[j]), `entry ${j}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b[j]))),
  );

describe('the recorded BPTT run', () => {
  it('full BPTT learns the first-value task', () => {
    const ep = epochSummaries(src);
    expect(ep.at(-1)!.evalLoss).toBeLessThan(0.05);
    expect(ep.at(-1)!.evalAccuracy).toBe(1);
  });

  for (const [epoch, index] of [
    [0, 0],
    [30, 9],
  ])
    it(`epoch ${epoch + 1}, sequence ${index + 1}: every backward step by hand, chained from t = 5 to t = 1`, async () => {
      const ex = await readExample(read, store.header, epoch, index);
      const fwd = rnnSteps(ex);
      const back = rnnBackSteps(await readBackward(read, ex), H);
      expect(back.map((b) => b.t)).toEqual([5, 4, 3, 2, 1]);
      const U = valueOf(fwd[1].hu!.operands.find((o) => o.role === 'weight')!);
      // At t = 5 the gradient arrives from the output layer: ∂ℓ/∂h₅ = ∂ℓ/∂(output z) · Vᵀ.
      const dense = (await readBackward(read, ex)).find(
        (i) => i.kind === 'GRAD_MATMUL_X' && i.path.layer === 'L2',
      )!;
      expect(back[0].dh).toEqual(Array.from(dense.results.grad.data));
      for (const b of back) {
        const h = values(fwd[b.t - 1].h);
        const dz = values(b.dz);
        near(
          dz,
          b.dh.map((g, j) => g * (1 - h[j] ** 2)),
        );
        if (b.t === 1) {
          expect(b.dU).toBeNull();
          expect(b.dhPrev).toBeNull();
          continue;
        }
        const hPrev = values(fwd[b.t - 2].h);
        near(
          values(b.dU),
          Array.from({ length: H * H }, (_, k) => hPrev[Math.floor(k / H)] * dz[k % H]),
        );
        const sent = Array.from({ length: H }, (_, i) => dz.reduce((s, g, j) => s + g * U[i * H + j], 0));
        near(values(b.dhPrev), sent);
        // The gradient arriving at hₜ₋₁ is exactly what step t sent back (one use, so no sum).
        expect(back.find((q) => q.t === b.t - 1)!.dh).toEqual(values(b.dhPrev));
      }
      // U's gradient for the example is the recorded sum of its four contributions.
      const sum = (await readBackward(read, ex)).find(
        (i) => i.kind === 'GRAD_SUM' && i.meta.param === 'L1.U',
      )!;
      expect(sum.meta.uses).toBe(4);
      const parts = back.filter((b) => b.dU).sort((a, b2) => a.t - b2.t);
      near(
        Array.from(sum.results.grad.data),
        Array.from({ length: H * H }, (_, k) => parts.reduce((s, p) => s + p.dU!.results.grad.data[k], 0)),
        1e-15,
      );
      const q = sumQuestion(back, sum);
      const right = q.options.filter((o) => o.correct);
      expect(right).toHaveLength(1);
      expect(right[0].feedback).toContain('as the record’s sum shows');
    });
});

describe('truncation', () => {
  it('a window of k reaches U at the last k time steps only, and cuts the chain at every earlier step (probes)', () => {
    for (const k of [1, 2, 3]) {
      const r = truncationProbe(k);
      if ('error' in r) throw new Error(r.error);
      expect(r.uSteps).toEqual(Array.from({ length: k }, (_, i) => 8 - k + 1 + i).filter((t) => t > 1));
      expect(r.cutSteps).toEqual(Array.from({ length: 8 - k }, (_, i) => i + 2));
    }
    const full = truncationProbe(0);
    if ('error' in full) throw new Error(full.error);
    expect(full.uSteps).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(full.cutSteps).toEqual([]);
  });

  it('on the first-value task, full BPTT ends lowest and a longer window does better than a shorter one', () => {
    const r = new EngineHost().handle({
      op: 'compareRuns',
      configs: L4_BPTT.windows.map((w) => l4BpttConfig(w)),
      dataset: L4_BPTT.dataset,
    });
    if (r.op !== 'compareRuns') throw new Error('unexpected reply');
    const [full, w1, w2, w3] = r.runs.map((q) => q.losses.at(-1)!);
    expect(full).toBeLessThan(0.01);
    expect(w1).toBeGreaterThan(w2);
    expect(w2).toBeGreaterThan(w3);
    expect(w3).toBeGreaterThan(full);
  });
});

describe('gradient sizes in the probes', () => {
  const ratio = (s: number, x: number) => {
    const r = gradientSizes(s, x);
    if ('error' in r) throw new Error(r.error);
    expect(r.sizes.map((q) => q.t)).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
    return r.sizes.at(-1)!.size / r.sizes[0].size;
  };
  it('U = 0.5·I vanishes (step 1 below a hundredth of step 8)', () =>
    expect(ratio(0.5, 0.5)).toBeLessThan(0.01));
  it('U = 2·I with a tiny input explodes (step 1 larger than step 8)', () =>
    expect(ratio(2, 0.01)).toBeGreaterThan(1));
  it('U = 2·I with a larger input saturates tanh and vanishes instead', () =>
    expect(ratio(2, 0.5)).toBeLessThan(0.01));
  it('U = I with a tiny input roughly keeps its size', () => {
    const q = ratio(1, 0.01);
    expect(q).toBeGreaterThan(0.5);
    expect(q).toBeLessThan(2);
  });
});

it('renders the page', () => {
  expect(renderToStaticMarkup(createElement(L4Experiment04))).toContain('Backward, one time step at a time');
});
