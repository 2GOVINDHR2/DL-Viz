/**
 * Level 4, Experiment 05 (LSTM and GRU): both recorded runs learn; every LSTM and GRU time step read by lstmSteps /
 * gruSteps is recomputed by hand from the weights its instructions reference (each gate's σ or tanh of x·W + h·U + b,
 * the cell and hidden state); the cell-state gradient path is exactly upstream ⊙ f; the parameter counts; the
 * comparison's gated layers learn; the live question.
 *
 * Note (ADR-103): the engine is deterministic within one JavaScript runtime. Math.tanh/exp/log can differ in the
 * last bit between JavaScript engines (Node's V8 and Chromium's V8 differ), which a training run near an unstable
 * point can amplify; the plain recurrent layer's comparison result is therefore not asserted here.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EngineHost, resolveDataset } from '../../src/core/engine/host';
import { buildModel } from '../../src/core/layers/model';
import type { Instruction, Operand } from '../../src/core/npm/ir';
import { storeSource } from '../../src/core/npm/source';
import { epochSummaries } from '../../src/core/npm/state';
import { TraceStore } from '../../src/core/npm/store';
import { L4_GATED, l4GatedCompareConfig, l4GatedConfig } from '../../src/experiments/level4';
import { readExample } from '../../src/learn/level4/common/cnnRecord';
import { gruSteps, lstmSteps, parameterCount } from '../../src/learn/level4/common/gatedRecord';
import { readBackward } from '../../src/learn/level4/common/rnnRecord';
import { cellQuestion, L4Experiment05 } from '../../src/learn/level4/Experiment05';

const record = (kind: 'lstm' | 'gru') => {
  const { store } = TraceStore.generate(l4GatedConfig(kind), resolveDataset(L4_GATED.dataset), {
    embedDatasetLimit: 0,
  });
  const src = storeSource(store);
  return { src, header: store.header, read: async (a: number, b: number) => src.range(a, b) };
};
const H = L4_GATED.hidden;
const near = (a: number[], b: number[], tol = 1e-12) =>
  a.forEach((x, j) => expect(Math.abs(x - b[j]), `entry ${j}`).toBeLessThanOrEqual(tol));
const sig = (v: number[]) => v.map((x) => 1 / (1 + Math.exp(-x)));
const vm = (v: number[], m: number[], cols: number) =>
  Array.from({ length: cols }, (_, j) => v.reduce((s, x, i) => s + x * m[i * cols + j], 0));

/** σ or tanh of x·W + h·U + b for one gate at one step, from the weights its own instructions reference. */
function gateByHand(
  src: ReturnType<typeof record>['src'],
  ins: Instruction[],
  t: number,
  gate: string,
  x: number,
  h: number[] | null,
) {
  const val = (o: Operand) => Array.from(src.get(o.ref).results[o.slot].data);
  const g = ins.filter(
    (i) => Number(i.meta.step) === t && i.meta.gate === gate && i.path.phase === 'forward',
  );
  const mm = g.filter((i) => i.kind === 'MATMUL');
  const W = val(mm[0].operands.find((o) => o.role === 'weight')!);
  const bias = val(g.find((i) => i.kind === 'ADD_BIAS')!.operands.find((o) => o.role === 'bias')!);
  let pre = vm([x], W, H);
  if (mm[1]) {
    const hIn = val(mm[1].operands.find((o) => o.role === 'input')!);
    if (h && gate !== 'candidate') near(hIn, h);
    pre = pre.map((v, j) => v + vm(hIn, val(mm[1].operands.find((o) => o.role === 'weight')!), H)[j]);
  }
  pre = pre.map((v, j) => v + bias[j]);
  return g.find((i) => i.kind === 'ACTIVATE')!.meta.fn === 'tanh' ? pre.map(Math.tanh) : sig(pre);
}

describe('the recorded LSTM run', () => {
  const r = record('lstm');
  it('learns the first-value task', () => {
    const ep = epochSummaries(r.src);
    expect(ep.at(-1)!.evalLoss).toBeLessThan(0.05);
    expect(ep.at(-1)!.evalAccuracy).toBe(1);
  });

  it('every step of two sequences, by hand: four gates, cₜ = f ⊙ cₜ₋₁ + i ⊙ g, hₜ = o ⊙ tanh(cₜ)', async () => {
    for (const [epoch, index] of [
      [0, 0],
      [39, 5],
    ]) {
      const ex = await readExample(r.read, r.header, epoch, index);
      const steps = lstmSteps(ex);
      expect(steps.map((s) => s.t)).toEqual([1, 2, 3, 4, 5, 6]);
      let h: number[] | null = null;
      let c: number[] | null = null;
      for (const s of steps) {
        const ins = ex.layers.L1;
        const [f, i, g, o] = ['forget', 'input', 'candidate', 'output'].map((q) =>
          gateByHand(r.src, ins, s.t, q, s.x, h),
        );
        near(s.f, f);
        near(s.i, i);
        near(s.g, g);
        near(s.o, o);
        c = c ? f.map((v, j) => v * c![j] + i[j] * g[j]) : i.map((v, j) => v * g[j]);
        near(s.c, c);
        h = o.map((v, j) => v * Math.tanh(c![j]));
        near(s.h, h);
      }
    }
  });

  it('along the cell state, the gradient passed back to cₜ₋₁ through f ⊙ cₜ₋₁ is exactly upstream ⊙ f', async () => {
    const ex = await readExample(r.read, r.header, 0, 2);
    const back = await readBackward(r.read, ex);
    const steps = lstmSteps(ex);
    const byId = new Map(back.map((i) => [i.id, i]));
    let checked = 0;
    for (const i of back.filter((q) => q.kind === 'GRAD_MULTIPLY' && q.meta.gate === 'cell' && q.results.b)) {
      const st = steps[Number(i.meta.step) - 1];
      if (!i.operands.some((o) => o.role === 'a' && o.ref === st.ids.f)) continue;
      const up = i.operands.find((o) => o.role === 'upstream')!;
      const g = Array.from(byId.get(up.ref)!.results[up.slot].data);
      expect(Array.from(i.results.b.data)).toEqual(g.map((v, j) => v * st.f[j]));
      checked++;
    }
    expect(checked).toBe(5);
  });

  it('the live question’s answer is the recorded cₜ', async () => {
    const s = lstmSteps(await readExample(r.read, r.header, 39, 0))[2];
    const q = cellQuestion(s);
    const right = q.options.filter((o) => o.correct);
    expect(right).toHaveLength(1);
    expect(right[0].feedback).toContain('as recorded');
    expect(cellQuestion(null).unavailable).toBeTruthy();
  });
});

describe('the recorded GRU run', () => {
  const r = record('gru');
  it('learns, and every step by hand: z, r (from step 2), n, hₜ = (1 − z) ⊙ n + z ⊙ hₜ₋₁', async () => {
    expect(epochSummaries(r.src).at(-1)!.evalLoss).toBeLessThan(0.05);
    const ex = await readExample(r.read, r.header, 20, 3);
    const steps = gruSteps(ex);
    let h: number[] | null = null;
    for (const s of steps) {
      const ins = ex.layers.L1;
      const z = gateByHand(r.src, ins, s.t, 'update', s.x, h);
      near(s.z, z);
      if (s.t === 1) expect(s.r).toBeNull();
      else near(s.r!, gateByHand(r.src, ins, s.t, 'reset', s.x, h));
      near(s.n, gateByHand(r.src, ins, s.t, 'candidate', s.x, null));
      near(
        s.oneMinusZ,
        z.map((v) => 1 - v),
      );
      h = h ? z.map((v, j) => (1 - v) * s.n[j] + v * h![j]) : z.map((v, j) => (1 - v) * s.n[j]);
      near(s.h, h);
    }
    expect(r.header.model.params.every((p) => !p.name.includes('.Wf'))).toBe(true);
  });
});

describe('Part D', () => {
  it('parameter counts: LSTM 4 sets of W, U, b; GRU 3; plain 1 (plus the dense layer)', () => {
    const count = (k: 'rnn' | 'lstm' | 'gru') =>
      parameterCount(buildModel(l4GatedCompareConfig(k, 1).model).params);
    expect([count('rnn'), count('lstm'), count('gru')]).toEqual([4 * 6 + 5, 4 * 4 * 6 + 5, 3 * 4 * 6 + 5]);
  });

  it('both gated layers learn the 10-step task (seed 1)', () => {
    const r = new EngineHost().handle({
      op: 'compareRuns',
      configs: (['lstm', 'gru'] as const).map((k) => l4GatedCompareConfig(k, 1)),
      dataset: L4_GATED.compare.dataset,
    });
    if (r.op !== 'compareRuns') throw new Error('unexpected reply');
    for (const q of r.runs) expect(q.losses.at(-1)!).toBeLessThan(0.1);
  });
});

it('renders the page', () => {
  expect(renderToStaticMarkup(createElement(L4Experiment05))).toContain('The LSTM cell');
});
