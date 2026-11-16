/**
 * Level 2, Stage 3 (Experiment 03). Every expected value is computed in this file with plain formulas, independently
 * of the engine:
 *  - one input, sigmoid, BCE: z = w·x + b, p = σ(z), Lᵢ = −[y ln p + (1−y) ln(1−p)], ∂Lᵢ/∂w = (p−y)·x, ∂Lᵢ/∂b = p−y;
 *  - full batch: L = mean Lᵢ, g = mean of the per-example gradients, Δ = −η·g, θ ← θ + Δ.
 * It checks the real training run (trace store + in-process EngineHost, the worker's code), the recorded trace, the
 * shared explorer with Level 2 wording, the learning-rate behaviour, and Parts A–D's engine demonstrations.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveDataset } from '../../src/core/engine/host';
import { TrainingSession } from '../../src/core/engine/session';
import { TraceStore } from '../../src/core/npm';
import { L2_EXP03_DEFAULTS as D } from '../../src/experiments/level2';
import {
  engineStep,
  landscape,
  neuronLoss,
  parabola,
  parabolaDescent,
} from '../../src/learn/level2/exp03/math';
import { slopeQuestion } from '../../src/learn/level2/exp03/PartsAD';
import { NEURON_DATASET, neuronConfig, runQuestion } from '../../src/learn/level2/exp03/Training';
import { oneUpdate, type UpdateBreakdown } from '../../src/learn/level2/exp03/update';
import { inProcessEngine, setEngineFactory } from '../../src/learn/trace/engine';
import { epochTree } from '../../src/learn/trace/hierarchy';
import { renderCurrentRunState, useRun } from '../../src/learn/trace/store';
import { TraceExplorer } from '../../src/learn/trace/TraceExplorer';
import { LEVEL1_WORDING, LEVEL2_WORDING, TraceWordingProvider } from '../../src/learn/trace/wording';

const sig = (z: number): number => 1 / (1 + Math.exp(-z));
const close = (a: number, b: number, tol = 1e-12): void =>
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tol);

/** One full-batch step by hand. */
function byHand(w: number, b: number, lr: number) {
  const rows = D.xs.map((x, i) => {
    const y = D.ys[i];
    const z = w * x + b;
    const p = sig(z);
    return { z, p, loss: -(y * Math.log(p) + (1 - y) * Math.log(1 - p)), gw: (p - y) * x, gb: p - y };
  });
  const mean = (f: (r: (typeof rows)[number]) => number): number =>
    rows.reduce((s, r) => s + f(r), 0) / rows.length;
  const gw = mean((r) => r.gw);
  const gb = mean((r) => r.gb);
  return {
    rows,
    loss: mean((r) => r.loss),
    gw,
    gb,
    dw: -lr * gw,
    db: -lr * gb,
    w1: w - lr * gw,
    b1: b - lr * gb,
  };
}

/** The loss with given parameters, by hand. */
const lossAt = (w: number, b: number): number => byHand(w, b, 0).loss;

let restore: ReturnType<typeof setEngineFactory>;
beforeEach(() => {
  restore = setEngineFactory(inProcessEngine);
  useRun.getState().dispose();
});
afterEach(() => {
  useRun.getState().dispose();
  setEngineFactory(restore);
});

async function trainAndRead(lr: number, epochs = D.epochs): Promise<UpdateBreakdown> {
  await useRun.getState().train(neuronConfig(lr, epochs), `η ${lr}`, NEURON_DATASET);
  const s = useRun.getState();
  expect(s.status, s.error ?? '').toBe('ready');
  const e = s.header!.epochStarts;
  const upTo2 = await s.read(0, e[1]);
  const second = e.length > 2 ? await s.read(e[1], e[2]) : null;
  return oneUpdate(upTo2, e[0], second);
}

describe('Experiment 03, Part E: the real full-batch update matches the hand computation', () => {
  for (const lr of D.learningRates)
    it(`η = ${lr}: predictions, losses, per-example and averaged gradients, η·g, the update and the next forward pass`, async () => {
      const u = await trainAndRead(lr);
      const h = byHand(D.w0, D.b0, lr);
      close(u.initial.w.value, D.w0);
      close(u.initial.b.value, D.b0);
      expect(u.examples.map((e) => e.x.value)).toEqual(D.xs);
      expect(u.examples.map((e) => e.y.value)).toEqual(D.ys);
      u.examples.forEach((e, i) => {
        close(e.z.value, h.rows[i].z);
        close(e.p.value, h.rows[i].p);
        close(e.loss.value, h.rows[i].loss);
        close(e.gw.value, h.rows[i].gw);
        close(e.gb.value, h.rows[i].gb);
      });
      close(u.batchLoss.value, h.loss);
      close(u.grad.w.value, h.gw);
      close(u.grad.b.value, h.gb);
      expect(u.lr).toBe(lr);
      close(u.delta.w.value, h.dw);
      close(u.delta.b.value, h.db);
      close(u.after.w.value, h.w1);
      close(u.after.b.value, h.b1);
      // The next epoch's forward pass uses the updated parameters.
      const h2 = byHand(h.w1, h.b1, lr);
      u.next!.examples.forEach((e, i) => {
        close(e.p.value, h2.rows[i].p);
        close(e.loss.value, h2.rows[i].loss);
      });
      close(u.next!.batchLoss.value, h2.loss);
    });

  it('four examples are processed and the parameters are updated once per epoch; batch size 1 updates four times', async () => {
    const u = await trainAndRead(1);
    expect(u.examplesInEpoch).toBe(4);
    expect(u.updatesInEpoch).toBe(1);
    const { store } = TraceStore.generate(neuronConfig(1, 1, 1), resolveDataset(NEURON_DATASET));
    const ins = store.range(0, store.length);
    const updates = ins.filter((i) => i.kind === 'APPLY_UPDATE' && i.meta.param === 'L1.W');
    expect(updates).toHaveLength(4);
    // Batch size 1, by hand: four sequential single-example steps.
    let w = D.w0;
    let b = D.b0;
    D.xs.forEach((x, i) => {
      const p = sig(w * x + b);
      const g = p - D.ys[i];
      w -= 1 * g * x;
      b -= 1 * g;
      close(updates[i].results.value.data[0], w);
    });
  });
});

describe('Experiment 03: the trace records the run, and the shared explorer reads it', () => {
  it('the averaged gradient is the mean of the recorded per-example gradients, and APPLY_UPDATE = INIT_PARAM + COMPUTE_UPDATE', async () => {
    const u = await trainAndRead(1, 3);
    close(u.grad.w.value, u.examples.reduce((s, e) => s + e.gw.value, 0) / 4);
    close(u.grad.b.value, u.examples.reduce((s, e) => s + e.gb.value, 0) / 4);
    close(u.after.w.value, u.initial.w.value + u.delta.w.value);
    close(u.after.b.value, u.initial.b.value + u.delta.b.value);
    // Every value carries the id of the instruction it was read from, in execution order.
    const ids = [
      u.initial.w.id,
      u.examples[0].z.id,
      u.examples[0].loss.id,
      u.examples[0].gw.id,
      u.grad.w.id,
      u.delta.w.id,
      u.after.w.id,
    ];
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
  });

  it('the trace in the store is the run the engine produces directly, instruction for instruction', async () => {
    await useRun.getState().train(neuronConfig(1, 4), 'a', NEURON_DATASET);
    const s = useRun.getState();
    const direct = TraceStore.generate(neuronConfig(1, 4), resolveDataset(NEURON_DATASET)).store;
    expect(s.length).toBe(direct.length);
    const mine = await s.read(0, s.length);
    const theirs = direct.range(0, direct.length);
    mine.forEach((i, k) => {
      expect(i.kind).toBe(theirs[k].kind);
      for (const [slot, t] of Object.entries(i.results))
        expect(Array.from(t.data)).toEqual(Array.from(theirs[k].results[slot].data));
    });
  });

  it('the explorer shows Level 2 wording when asked, and Level 1 wording by default', async () => {
    await useRun.getState().train(neuronConfig(1, 3), 'a', NEURON_DATASET);
    renderCurrentRunState();
    const s = useRun.getState();
    await s.jump(s.header!.epochStarts[0] + 12);
    const l2 = renderToStaticMarkup(
      createElement(
        TraceWordingProvider,
        { value: LEVEL2_WORDING },
        createElement(TraceExplorer, { stale: false }),
      ),
    );
    expect(l2).toContain('The record of run 1');
    expect(l2).toContain('Network 1 → 1 (sigmoid output)');
    expect(l2).toContain('Gradient ∂L/∂z');
    expect(l2).not.toContain('Adjustment signal');
    const l1 = renderToStaticMarkup(createElement(TraceExplorer, { stale: false }));
    expect(l1).toContain('Adjustment signal');
    expect(l1).not.toContain('Gradient ∂L/∂z');
    const ins = useRun.getState().epochView!.instructions;
    const labels = (w: typeof LEVEL1_WORDING) => JSON.stringify(epochTree(ins, s.header, 'stages', w));
    expect(labels(LEVEL2_WORDING)).toContain('Update the parameters (one update for the whole batch)');
    expect(labels(LEVEL1_WORDING)).toContain('Adjust the parameters (one update for the batch)');
  });
});

describe('Experiment 03: learning rates in the real training run', () => {
  const run = (lr: number, epochs: number): number[] => {
    const s = new TrainingSession(neuronConfig(lr, epochs), resolveDataset(NEURON_DATASET));
    const out: number[] = [];
    while (!s.done) out.push(s.runEpoch().eval.loss);
    return out;
  };
  const MIN = run(1, 400).at(-1)!;

  it('the loss has a finite minimum near w ≈ 0.602, b ≈ 0.086 (the claim in level2.ts)', () => {
    const s = new TrainingSession(neuronConfig(1, 400), resolveDataset(NEURON_DATASET));
    while (!s.done) s.runEpoch();
    expect(s.parameters().get('L1.W')!.data[0]).toBeCloseTo(0.602, 2);
    expect(s.parameters().get('L1.b')!.data[0]).toBeCloseTo(0.086, 2);
    expect(MIN).toBeCloseTo(0.6038, 3);
    close(MIN, lossAt(s.parameters().get('L1.W')!.data[0], s.parameters().get('L1.b')!.data[0]), 1e-12);
  });
  it('η = 0.1 decreases the loss every epoch but is still clearly above the minimum after 50 epochs', () => {
    const l = run(0.1, 50);
    l.slice(1).forEach((v, i) => expect(v).toBeLessThan(l[i]));
    expect(l.at(-1)! - MIN).toBeGreaterThan(0.005);
  });
  it('η = 1 decreases the loss every epoch and reaches the minimum within 50 epochs', () => {
    const l = run(1, 50);
    l.slice(1).forEach((v, i) => expect(v).toBeLessThanOrEqual(l[i] + 1e-15));
    expect(l.at(-1)! - MIN).toBeLessThan(1e-6);
  });
  it('η = 10 does not settle: the loss rises in many epochs and stays far above the minimum', () => {
    const l = run(10, 50);
    const rises = l.slice(1).filter((v, i) => v > l[i]).length;
    expect(rises).toBeGreaterThanOrEqual(10);
    expect(l.at(-1)! - MIN).toBeGreaterThan(0.1);
  });
});

describe('Experiment 03, Parts A–D: engine demonstrations against the formulas', () => {
  it('Part A: f(x) = (x − 1)² + 0.5 and its derivative 2(x − 1)', () => {
    for (const x of [-1, -0.6, 0, 1, 1.7, 3]) {
      close(parabola(x).value, (x - 1) ** 2 + 0.5);
      close(parabola(x).slope, 2 * (x - 1));
    }
  });
  it('Part B: the neuron’s loss and its partial derivatives', () => {
    for (const [w, b] of [
      [-1.5, 1],
      [0.3, -0.4],
      [2, 2],
    ]) {
      const h = byHand(w, b, 0);
      const e = neuronLoss(w, b);
      close(e.value, h.loss);
      close(e.dw, h.gw);
      close(e.db, h.gb);
    }
  });
  it('Part C: a step is Δ = −η·g; k steps equal k epochs of real full-batch training', () => {
    const s = engineStep([-1.5, 1], [0.3, -0.2], 2);
    expect(s.delta).toEqual([-0.6, 0.4]);
    close(s.next[0], -2.1);
    close(s.next[1], 1.4);
    let p = [D.w0, D.b0];
    for (let k = 0; k < 5; k++) {
      const g = neuronLoss(p[0], p[1]);
      p = engineStep(p, [g.dw, g.db], 1).next;
    }
    const t = new TrainingSession(neuronConfig(1, 5), resolveDataset(NEURON_DATASET));
    while (!t.done) t.runEpoch();
    close(p[0], t.parameters().get('L1.W')!.data[0], 1e-12);
    close(p[1], t.parameters().get('L1.b')!.data[0], 1e-12);
  });
  it('Part C: the grid’s lowest cell is beside the real minimum', () => {
    const g = landscape();
    const k = g.values.indexOf(Math.min(...g.values));
    const cell = 6 / g.resolution;
    const w = -3 + cell * ((k % g.resolution) + 0.5);
    const b = -3 + cell * (Math.floor(k / g.resolution) + 0.5);
    expect(Math.abs(w - 0.602)).toBeLessThan(cell);
    expect(Math.abs(b - 0.086)).toBeLessThan(cell);
  });
  it('Part D: small converges slowly, suitable quickly, large overshoots but converges, too large diverges', () => {
    const dist = (lr: number) => parabolaDescent(D.parabola.x0, lr, 8).map((p) => p.x - 1);
    // By hand: x_{k+1} − 1 = (1 − 2η)(x_k − 1).
    for (const lr of [0.1, 0.45, 0.9, 1.05])
      dist(lr).forEach((d, k) => close(d, (D.parabola.x0 - 1) * (1 - 2 * lr) ** k, 1e-12));
    expect(Math.abs(dist(0.1).at(-1)!)).toBeGreaterThan(0.1);
    expect(Math.abs(dist(0.45).at(-1)!)).toBeLessThan(0.01);
    const big = dist(0.9);
    expect(big.slice(1).every((d, k) => Math.sign(d) !== Math.sign(big[k]))).toBe(true);
    expect(Math.abs(big.at(-1)!)).toBeLessThan(Math.abs(big[0]));
    expect(Math.abs(dist(1.05).at(-1)!)).toBeGreaterThan(Math.abs(dist(1.05)[0]));
  });
});

describe('Experiment 03: live questions follow the learner’s settings and run', () => {
  it('the slope question points against the derivative at the current point', () => {
    const right = (x: number) => slopeQuestion(x).options.find((o) => o.correct)!.text;
    expect(right(-0.6)).toMatch(/right/);
    expect(right(2.5)).toMatch(/left/);
    expect(right(1)).toMatch(/flat/);
  });
  it('the run question follows the sign of the recorded update, for each learning rate', async () => {
    for (const lr of D.learningRates) {
      const u = await trainAndRead(lr, 2);
      const q = runQuestion(u, 1);
      expect(q.options.find((o) => o.correct)!.text).toBe(u.delta.w.value > 0 ? 'Up' : 'Down');
      useRun.getState().dispose();
    }
    expect(runQuestion(null, 0).unavailable).toBeTruthy();
  });
});
