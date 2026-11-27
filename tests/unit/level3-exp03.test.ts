/**
 * Level 3, Experiment 03 (Adam): m, v, m̂, v̂ and Δ read from the record, against Adam's rule, over every update; the
 * first update's bias correction; Part C's adaptive step sizes; and the comparison.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EngineHost, resolveDataset } from '../../src/core/engine/host';
import { storeSource } from '../../src/core/npm/source';
import { TraceStore } from '../../src/core/npm/store';
import { ADAM_DEFAULTS, L3_TASK, l3TaskConfig } from '../../src/experiments/level3';
import {
  AD_LR,
  adamConfig,
  correctionQuestion,
  L3Experiment03,
  stepsAt,
} from '../../src/learn/level3/Experiment03';
import { parameterChoices, readUpdateSeries } from '../../src/learn/level3/common/updates';

const { beta1: B1, beta2: B2, epsilon: EPS } = ADAM_DEFAULTS;
const { store } = TraceStore.generate(adamConfig(), resolveDataset(L3_TASK.dataset), {
  embedDatasetLimit: 0,
});
const src = storeSource(store);
const header = store.header;
const read = async (a: number, b: number) => src.range(a, b);
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-300, Math.abs(a), Math.abs(b));

describe('the recorded Adam run', () => {
  it('every update of every fifth parameter value follows Adam’s rule, and each state reads the previous one', async () => {
    let worst = 0;
    for (const { param, k } of parameterChoices(header).filter((_, i) => i % 5 === 0)) {
      const s = await readUpdateSeries(read, header, param, k);
      expect(s).toHaveLength(60);
      let [m, v] = [0, 0];
      s.forEach((u, i) => {
        const t = i + 1;
        expect(u.t).toBe(t);
        m = B1 * m + (1 - B1) * u.grad;
        v = B2 * v + (1 - B2) * u.grad * u.grad;
        const mHat = m / (1 - B1 ** t);
        const vHat = v / (1 - B2 ** t);
        for (const [got, want] of [
          [u.m!, m],
          [u.v!, v],
          [u.mHat!, mHat],
          [u.vHat!, vHat],
          [u.delta, (-AD_LR * mHat) / (Math.sqrt(vHat) + EPS)],
        ])
          worst = Math.max(worst, rel(got, want));
        expect(u.after).toBe(u.before + u.delta);
        const state = src.get(u.ids.state!);
        const prev = state.operands.filter((o) => o.role.startsWith('previous'));
        expect(prev.map((o) => o.ref)).toEqual(i === 0 ? [] : [s[i - 1].ids.state, s[i - 1].ids.state]);
      });
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it('update 1: bias correction makes m̂ = ḡ and v̂ = ḡ², so the step is ±η (up to ε)', async () => {
    for (const { param, k } of parameterChoices(header)) {
      const [u] = await readUpdateSeries(read, header, param, k);
      expect(rel(u.mHat!, u.grad)).toBeLessThan(1e-12);
      expect(rel(u.vHat!, u.grad * u.grad)).toBeLessThan(1e-12);
      if (Math.abs(u.grad) > 1e-6) expect(Math.abs(Math.abs(u.delta) - AD_LR)).toBeLessThan(1e-3);
    }
  });

  it('Part C: at every inspected update some gradients differ >10× while their steps differ <3×; no step exceeds ~η', async () => {
    for (const n of [1, 2, 10, 20, 60]) {
      const rows = stepsAt(header, await read(header.epochStarts[n - 1], header.epochStarts[n]));
      expect(rows).toHaveLength(25);
      const found = rows.some((a) =>
        rows.some(
          (q) =>
            Math.abs(q.grad) > 0 &&
            Math.abs(a.grad) > 10 * Math.abs(q.grad) &&
            Math.max(Math.abs(a.delta), Math.abs(q.delta)) <
              3 * Math.min(Math.abs(a.delta), Math.abs(q.delta)),
        ),
      );
      expect(found, `update ${n}`).toBe(true);
      expect(Math.max(...rows.map((r) => Math.abs(r.delta))), `update ${n}`).toBeLessThan(1.5 * AD_LR);
    }
    // Each row is the record’s own value.
    const ins = src.range(header.epochStarts[9], header.epochStarts[10]);
    const acc = ins.find((i) => i.kind === 'GRAD_ACCUMULATE')!;
    expect(stepsAt(header, ins)[0].grad).toBe(acc.results.grad.data[0]);
  });

  it('the live question’s answer is the recorded m̂', async () => {
    const s = await readUpdateSeries(read, header, 'L2.b', 0);
    const q = correctionQuestion(s[2]);
    expect(q.options.find((o) => o.correct)!.text).toBe(
      (s[2].mHat! > 0 ? '+' : '') + s[2].mHat!.toFixed(5).replace('-', '−'),
    );
    expect(correctionQuestion(null).unavailable).toBeTruthy();
  });
});

describe('Part A and the page', () => {
  it('at η = 0.05: Adam ends far lower than plain gradient descent', () => {
    const r = new EngineHost().handle({
      op: 'compareRuns',
      configs: [
        l3TaskConfig({ type: 'sgd', lr: AD_LR }),
        l3TaskConfig({ type: 'momentum', lr: AD_LR, momentum: 0.9 }),
        adamConfig(),
      ],
      dataset: L3_TASK.dataset,
    });
    if (r.op !== 'compareRuns') throw new Error('unexpected reply');
    const last = r.runs.map((q) => q.losses.at(-1)!);
    expect(last[2]).toBeLessThan(last[1]);
    expect(last[1]).toBeLessThan(last[0]);
    expect(last[2]).toBeLessThan(0.15);
  });

  it('renders the page', () => {
    expect(renderToStaticMarkup(createElement(L3Experiment03))).toContain('Three optimisers, one task');
  });
});
