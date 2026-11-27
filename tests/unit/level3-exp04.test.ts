/**
 * Level 3, Experiment 04 (overfitting and weight decay): the held-out curve read from the record, the overfitting the
 * page claims, weight decay inside every update (λ·w and ḡ + λ·w against the recorded values, Adam stepping on ḡ + λ·w),
 * biases not decayed, and the comparison's outcome.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EngineHost, resolveDataset } from '../../src/core/engine/host';
import { storeSource } from '../../src/core/npm/source';
import { epochSummaries } from '../../src/core/npm/state';
import { TraceStore } from '../../src/core/npm/store';
import { L3_OVERFIT, l3OverfitConfig } from '../../src/experiments/level3';
import { decayQuestion, L3Experiment04, lowest } from '../../src/learn/level3/Experiment04';
import { parameterChoices, readUpdateSeries } from '../../src/learn/level3/common/updates';

const record = (wd: number) => {
  const { store } = TraceStore.generate(l3OverfitConfig(wd), resolveDataset(L3_OVERFIT.dataset), {
    embedDatasetLimit: 0,
  });
  const src = storeSource(store);
  return { src, header: store.header, read: async (a: number, b: number) => src.range(a, b) };
};

describe('Part A: the recorded run without weight decay overfits', () => {
  const { src } = record(0);
  const ep = epochSummaries(src);

  it('every epoch has a training and a held-out loss', () => {
    expect(ep).toHaveLength(L3_OVERFIT.epochs);
    for (const e of ep) {
      expect(Number.isFinite(e.evalLoss)).toBe(true);
      expect(Number.isFinite(e.testLoss!)).toBe(true);
    }
  });

  it('training loss falls to near 0, while held-out loss has its lowest early and then rises well above it', () => {
    const held = ep.map((e) => e.testLoss!);
    const b = lowest(held);
    expect(ep.at(-1)!.evalLoss).toBeLessThan(0.05);
    expect(b).toBeGreaterThan(5);
    expect(b).toBeLessThan(L3_OVERFIT.epochs / 2);
    expect(held.at(-1)!).toBeGreaterThan(2 * held[b]);
  });

  it('lowest() returns the first minimum', () => {
    expect(lowest([3, 1, 2, 1])).toBe(1);
    expect(lowest([5])).toBe(0);
  });
});

describe('Part C: weight decay inside the updates', () => {
  const lambda = 0.01;
  const { src, header, read } = record(lambda);

  it('for every weight, at every update: λ·w and ḡ + λ·w are recorded exactly, and Adam steps on ḡ + λ·w', async () => {
    const b1 = 0.9,
      b2 = 0.999,
      eps = 1e-8;
    for (const { param, k } of parameterChoices(header).filter((c) => c.param.endsWith('.W'))) {
      const s = await readUpdateSeries(read, header, param, k, 40);
      expect(s).toHaveLength(40);
      let m = 0,
        v = 0;
      s.forEach((u, t) => {
        expect(u.decay).toBe(lambda * u.before);
        expect(u.regularized).toBe(u.grad + u.decay!);
        m = b1 * m + (1 - b1) * u.regularized!;
        v = b2 * v + (1 - b2) * u.regularized! ** 2;
        const mh = m / (1 - b1 ** (t + 1));
        const vh = v / (1 - b2 ** (t + 1));
        expect(u.m!).toBeCloseTo(m, 14);
        expect(u.delta).toBeCloseTo((-L3_OVERFIT.lr * mh) / (Math.sqrt(vh) + eps), 12);
        expect(u.after).toBe(u.before + u.delta);
      });
    }
  });

  it('biases are not decayed', async () => {
    const s = await readUpdateSeries(read, header, 'L2.b', 0, 5);
    for (const u of s) expect(u.decay).toBeUndefined();
  });

  it('the GRAD_ACCUMULATE of a weight carries the weight as an operand and the λ in its meta', () => {
    const g = src
      .range(0, header.epochStarts[1])
      .find((i) => i.kind === 'GRAD_ACCUMULATE' && i.meta.weightDecay)!;
    expect(g.meta.weightDecay).toBe(lambda);
    expect(g.operands.some((o) => o.role === 'parameter (weight decay)')).toBe(true);
  });

  it('the live question’s answer is the recorded ḡ + λ·w', async () => {
    const s = await readUpdateSeries(read, header, 'L2.W', 0, 3);
    const q = decayQuestion(s[2], lambda);
    expect(q.options.filter((o) => o.correct)).toHaveLength(1);
    expect(q.options.find((o) => o.correct)!.feedback).toContain('as recorded');
    expect(decayQuestion(null, lambda).unavailable).toBeTruthy();
  });
});

describe('Part B: the comparison', () => {
  it('a moderate λ ends with a lower held-out loss than λ = 0, and the largest λ has the highest training loss', () => {
    const r = new EngineHost().handle({
      op: 'compareRuns',
      configs: L3_OVERFIT.decays.map((wd) => l3OverfitConfig(wd)),
      dataset: L3_OVERFIT.dataset,
    });
    if (r.op !== 'compareRuns') throw new Error('unexpected reply');
    const held = r.runs.map((q) => q.testLosses!.at(-1)!);
    const train = r.runs.map((q) => q.losses.at(-1)!);
    expect(held[2]).toBeLessThan(held[0]);
    expect(Math.max(...train)).toBe(train[3]);
  });

  it('the comparison’s λ = 0 held-out losses are the recorded run’s', () => {
    const r = new EngineHost().handle({
      op: 'compareRuns',
      configs: [l3OverfitConfig(0)],
      dataset: L3_OVERFIT.dataset,
    });
    if (r.op !== 'compareRuns') throw new Error('unexpected reply');
    expect(r.runs[0].testLosses).toEqual(epochSummaries(record(0).src).map((e) => e.testLoss));
  });

  it('renders the page', () => {
    expect(renderToStaticMarkup(createElement(L3Experiment04))).toContain('Training loss is not the goal');
  });
});
