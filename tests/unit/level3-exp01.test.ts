/**
 * Level 3, Experiment 01 (learning rate), and the shared Level 3 reader (`readUpdateSeries`). Values on the screen are
 * checked against the record and against hand calculations.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EngineHost, resolveDataset } from '../../src/core/engine/host';
import { storeSource } from '../../src/core/npm/source';
import { TraceStore } from '../../src/core/npm/store';
import { L3_TASK, l3TaskConfig } from '../../src/experiments/level3';
import { L3Experiment01, LR_CHOICES, stepQuestion, verdict } from '../../src/learn/level3/Experiment01';
import { parameterChoices, readUpdateSeries } from '../../src/learn/level3/common/updates';

const record = (lr: number) => {
  const { store } = TraceStore.generate(l3TaskConfig({ type: 'sgd', lr }), resolveDataset(L3_TASK.dataset), {
    embedDatasetLimit: 0,
  });
  const src = storeSource(store);
  return { src, header: store.header, read: async (a: number, b: number) => src.range(a, b) };
};

describe('readUpdateSeries, against the record', () => {
  const { src, header, read } = record(2);

  it('names every parameter value of the 2-6-1 network once', () => {
    const c = parameterChoices(header);
    expect(c).toHaveLength(2 * 6 + 6 + 6 * 1 + 1);
    expect(new Set(c.map((q) => `${q.param}:${q.k}`)).size).toBe(c.length);
    expect(c[0].label).toBe('hidden weight x₁ → neuron 1');
    expect(c.at(-1)!.label).toBe('output bias');
  });

  it('each update: before is what APPLY_UPDATE read, Δ = −η·ḡ, after = before + Δ, over all 60 updates', async () => {
    for (const { param, k } of parameterChoices(header).filter((_, i) => i % 5 === 0)) {
      const s = await readUpdateSeries(read, header, param, k);
      expect(s).toHaveLength(60);
      for (const u of s) {
        const apply = src.get(u.ids.apply);
        const op = apply.operands.find((o) => o.role === 'parameter')!;
        expect(u.before).toBe(src.get(op.ref).results[op.slot].data[k]);
        expect(u.delta).toBe(-2 * u.grad);
        expect(u.after).toBe(u.before + u.delta);
        expect(u.lr).toBe(2);
        expect(u.velocity).toBeUndefined();
      }
    }
  });

  it('the first update’s loss is the starting network’s loss on all 60 points, by hand', async () => {
    const s = await readUpdateSeries(read, header, 'L2.b', 0);
    const all = src.range(0, header.epochStarts[1]);
    const init = (p: string) =>
      Array.from(all.find((i) => i.kind === 'INIT_PARAM' && i.meta.param === p)!.results.value.data);
    const [W1, b1, W2, b2] = ['L1.W', 'L1.b', 'L2.W', 'L2.b'].map(init);
    const d = resolveDataset(L3_TASK.dataset);
    let loss = 0;
    for (let i = 0; i < 60; i++) {
      const x = [d.xs.data[2 * i], d.xs.data[2 * i + 1]];
      const a = Array.from({ length: 6 }, (_, j) => Math.tanh(x[0] * W1[j] + x[1] * W1[6 + j] + b1[j]));
      const p = 1 / (1 + Math.exp(-a.reduce((t, v, j) => t + v * W2[j], b2[0])));
      const y = d.ys.data[i];
      loss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    }
    expect(s[0].loss).toBeCloseTo(loss / 60, 12);
  });
});

describe('Part A: the comparison', () => {
  const host = new EngineHost();
  const r = host.handle({
    op: 'compareRuns',
    configs: LR_CHOICES.map((lr) => l3TaskConfig({ type: 'sgd', lr })),
    dataset: L3_TASK.dataset,
  });
  if (r.op !== 'compareRuns') throw new Error('unexpected reply');

  it('runs without a record give exactly the recorded run’s losses (same engine, same start)', () => {
    const { src, header } = record(2);
    const evals = src
      .range(0, header.length)
      .filter((i) => i.kind === 'EVAL_END')
      .map((i) => i.results.loss.item());
    expect(r.runs[LR_CHOICES.indexOf(2)].losses).toEqual(evals);
  });

  it('the verdicts read from the curves: too small, slow, useful, unstable, broken', () => {
    expect(r.runs.map((q) => verdict(q.losses))).toEqual([
      'barely moved',
      'learned slowly',
      'learned',
      'unstable',
      'got worse',
    ]);
  });
});

describe('the page and its live question', () => {
  it('renders, and the live question’s answer is the recorded step', async () => {
    expect(renderToStaticMarkup(createElement(L3Experiment01))).toContain(
      'Same network, different learning rates',
    );
    const { header, read } = record(8);
    const s = await readUpdateSeries(read, header, 'L1.b', 0);
    const q = stepQuestion(s[3]);
    expect(q.options.find((o) => o.correct)!.text).toBe(
      (s[3].delta > 0 ? '+' : '') + s[3].delta.toFixed(4).replace('-', '−'),
    );
    expect(stepQuestion(null).unavailable).toBeTruthy();
  });
});
