/**
 * Level 3, Experiment 02 (momentum): the velocity and step read from the record, against the momentum rule, over every
 * update, and the comparison's outcome.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EngineHost, resolveDataset } from '../../src/core/engine/host';
import { storeSource } from '../../src/core/npm/source';
import { TraceStore } from '../../src/core/npm/store';
import { L3_TASK, l3TaskConfig } from '../../src/experiments/level3';
import { L3Experiment02, MO_LR, velocityQuestion } from '../../src/learn/level3/Experiment02';
import { parameterChoices, readUpdateSeries } from '../../src/learn/level3/common/updates';

const record = (mu: number) => {
  const { store } = TraceStore.generate(
    l3TaskConfig({ type: 'momentum', lr: MO_LR, momentum: mu }),
    resolveDataset(L3_TASK.dataset),
    { embedDatasetLimit: 0 },
  );
  const src = storeSource(store);
  return { src, header: store.header, read: async (a: number, b: number) => src.range(a, b) };
};

describe('the recorded momentum run', () => {
  const { src, header, read } = record(0.9);

  it('every update of every fifth parameter value: v = μ·v + ḡ, Δ = −η·v, after = before + Δ, state linked to the previous one', async () => {
    for (const { param, k } of parameterChoices(header).filter((_, i) => i % 5 === 0)) {
      const s = await readUpdateSeries(read, header, param, k);
      expect(s).toHaveLength(60);
      let prev = 0;
      s.forEach((u, t) => {
        expect(u.velocity).toBe(0.9 * prev + u.grad);
        expect(u.delta).toBe(u.velocity! * -MO_LR);
        expect(u.after).toBe(u.before + u.delta);
        const state = src.get(u.ids.state!);
        const prevOp = state.operands.find((o) => o.role === 'previous velocity');
        if (t === 0) expect(prevOp).toBeUndefined();
        else expect(prevOp!.ref).toBe(s[t - 1].ids.state);
        prev = u.velocity!;
      });
    }
  });

  it('the default parameter shows the build-up the challenge asks for (a step more than twice the plain step)', async () => {
    const c = parameterChoices(header)[18];
    const s = await readUpdateSeries(read, header, c.param, c.k);
    expect(s.some((u) => Math.abs(u.delta / (-u.lr * u.grad)) > 2)).toBe(true);
  });

  it('with μ = 0 the velocity is the gradient: plain gradient descent', async () => {
    const z = record(0);
    const s = await readUpdateSeries(z.read, z.header, 'L1.W', 0);
    for (const u of s) {
      expect(u.velocity).toBe(u.grad);
      expect(u.delta).toBe(-MO_LR * u.grad);
    }
  });

  it('the live question’s answer is the recorded velocity', async () => {
    const s = await readUpdateSeries(read, header, 'L2.b', 0);
    const q = velocityQuestion(s[1], s[0].velocity!, 0.9);
    expect(q.options.find((o) => o.correct)!.text).toBe(
      (s[1].velocity! > 0 ? '+' : '') + s[1].velocity!.toFixed(4).replace('-', '−'),
    );
    expect(velocityQuestion(null, 0, 0.9).unavailable).toBeTruthy();
  });
});

describe('Part A: the comparison', () => {
  it('at the same η, momentum μ = 0.9 ends far lower than plain gradient descent, and μ = 0.5 in between', () => {
    const r = new EngineHost().handle({
      op: 'compareRuns',
      configs: [
        l3TaskConfig({ type: 'sgd', lr: MO_LR }),
        l3TaskConfig({ type: 'momentum', lr: MO_LR, momentum: 0.5 }),
        l3TaskConfig({ type: 'momentum', lr: MO_LR, momentum: 0.9 }),
      ],
      dataset: L3_TASK.dataset,
    });
    if (r.op !== 'compareRuns') throw new Error('unexpected reply');
    const last = r.runs.map((q) => q.losses.at(-1)!);
    expect(last[2]).toBeLessThan(last[1]);
    expect(last[1]).toBeLessThan(last[0]);
    expect(last[2]).toBeLessThan(0.1);
  });

  it('renders the page', () => {
    expect(renderToStaticMarkup(createElement(L3Experiment02))).toContain('Plain steps against momentum');
  });
});
