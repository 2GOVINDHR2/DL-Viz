/**
 * Level 3 capability gate (ADR-098), written before any Level 3 screen. Each check is independent of the code it
 * checks:
 *  G1 Adam: the recorded m, v, m̂, v̂ and Δ over 12 updates against an Adam loop written here, with gradients
 *     computed here by hand (one sigmoid neuron, BCE, full batch);
 *  G2 Adam: the parameters after 30 updates against TF.js's own `tf.train.adam`;
 *  G3 momentum: the recorded velocity and step over 12 updates against the hand recurrence;
 *  G4 L2 weight decay: the recorded λ·w and regularised gradient, biases untouched, multiple updates by hand, and
 *     the regularised gradient against a central finite difference of the penalised loss;
 *  G5 replay: two generations are identical, and segments evicted and regenerated from checkpoints (which now hold
 *     Adam's state) are identical to the first read;
 *  G6 held-out split: the recorded held-out loss against the final parameters evaluated here by hand, and
 *     compareRuns agrees with the record;
 *  G7 every new trace conforms to the NPM grammar.
 * Results are written to reports/level3-optim-gate.json.
 */
import * as tf from '@tensorflow/tfjs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { TrainConfig } from '../../src/core/engine/session';
import { EngineHost, resolveDataset } from '../../src/core/engine/host';
import type { DatasetSpec } from '../../src/core/engine/protocol';
import { conformsToGrammar } from '../../src/core/npm/grammar';
import type { Instruction } from '../../src/core/npm/ir';
import { storeSource } from '../../src/core/npm/source';
import { TraceStore } from '../../src/core/npm/store';
import { encodeTensor } from '../../src/core/npm/serialize';
import type { OptimizerConfig } from '../../src/core/optim/optim';

const results: Record<string, unknown> = {};
afterAll(() => {
  writeFileSync(
    resolve(import.meta.dirname, '../../reports/level3-optim-gate.json'),
    JSON.stringify(results, null, 2) + '\n',
  );
});

// One input, one sigmoid neuron, BCE, four points, full batch: every value can be followed by hand.
const XS = [-2, -1, 0.5, 2];
const YS = [0, 1, 0, 1];
const POINTS: DatasetSpec = { kind: 'points', name: 'gate', xs: XS.map((x) => [x]), ys: YS.map((y) => [y]) };
const neuron = (optimizer: OptimizerConfig, epochs: number): TrainConfig => ({
  seed: 0,
  epochs,
  batchSize: 4,
  shuffle: false,
  loss: 'bce',
  optimizer,
  model: { inputShape: [1], layers: [{ type: 'dense', units: 1, activation: 'sigmoid' }] },
  initialParams: { 'L1.W': [-1.5], 'L1.b': [1] },
});
const sig = (z: number): number => 1 / (1 + Math.exp(-z));
/** Mean BCE gradient of the neuron by hand. */
const grads = (w: number, b: number): { gw: number; gb: number; loss: number } => {
  let gw = 0;
  let gb = 0;
  let loss = 0;
  XS.forEach((x, i) => {
    const a = sig(w * x + b);
    gw += (a - YS[i]) * x;
    gb += a - YS[i];
    loss += -(YS[i] * Math.log(a) + (1 - YS[i]) * Math.log(1 - a));
  });
  return { gw: gw / 4, gb: gb / 4, loss: loss / 4 };
};
const record = (config: TrainConfig, data: DatasetSpec = POINTS, budgetBytes?: number) => {
  const { store } = TraceStore.generate(config, resolveDataset(data), { embedDatasetLimit: 0, budgetBytes });
  const src = storeSource(store);
  return { src, store, all: src.range(0, src.length) };
};
const of = (all: Instruction[], kind: string, param: string) =>
  all.filter((i) => i.kind === kind && i.meta.param === param);
const near = (a: number, b: number, tol: number): void => {
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);
};

describe('Level 3 gate: optimisers', () => {
  it('G1 Adam: m, v, m̂, v̂ and Δ over 12 updates, against Adam and the gradients written here by hand', () => {
    const opt = { type: 'adam', lr: 0.1, beta1: 0.9, beta2: 0.999, epsilon: 1e-8 } as const;
    const { all } = record(neuron(opt, 12));
    const st = of(all, 'OPTIMIZER_STATE', 'L1.W');
    const up = of(all, 'COMPUTE_UPDATE', 'L1.W');
    expect(st).toHaveLength(12);
    let [w, b] = [-1.5, 1];
    let [mw, vw, mb, vb] = [0, 0, 0, 0];
    let worst = 0;
    for (let t = 1; t <= 12; t++) {
      const g = grads(w, b);
      mw = 0.9 * mw + 0.1 * g.gw;
      vw = 0.999 * vw + 0.001 * g.gw * g.gw;
      mb = 0.9 * mb + 0.1 * g.gb;
      vb = 0.999 * vb + 0.001 * g.gb * g.gb;
      const mHat = mw / (1 - 0.9 ** t);
      const vHat = vw / (1 - 0.999 ** t);
      const dw = (-0.1 * mHat) / (Math.sqrt(vHat) + 1e-8);
      const db = (-0.1 * (mb / (1 - 0.9 ** t))) / (Math.sqrt(vb / (1 - 0.999 ** t)) + 1e-8);
      const s = st[t - 1];
      expect(s.meta.t).toBe(t);
      for (const [rec, want] of [
        [s.results.m.data[0], mw],
        [s.results.v.data[0], vw],
        [s.results.mHat.data[0], mHat],
        [s.results.vHat.data[0], vHat],
        [up[t - 1].results.delta.data[0], dw],
      ] as const) {
        worst = Math.max(worst, Math.abs(rec - want));
        near(rec, want, 1e-12);
      }
      // The step reads the corrected moments of this very update.
      expect(up[t - 1].operands.map((o) => [o.ref, o.slot])).toEqual([
        [s.id, 'mHat'],
        [s.id, 'vHat'],
      ]);
      w += dw;
      b += db;
    }
    // After the first update, each state reads the previous one.
    expect(st[1].operands.slice(1).map((o) => o.ref)).toEqual([st[0].id, st[0].id]);
    results.G1 = { updates: 12, worstAbsoluteGap: worst };
  });

  it('G2 Adam: parameters after 30 updates against TF.js tf.train.adam', () => {
    const opt = { type: 'adam', lr: 0.05, beta1: 0.9, beta2: 0.999, epsilon: 1e-7 } as const;
    const { all } = record(neuron(opt, 30));
    const last = (p: string) => of(all, 'APPLY_UPDATE', p).at(-1)!.results.value.data[0];
    const w = tf.variable(tf.scalar(-1.5));
    const b = tf.variable(tf.scalar(1));
    const x = tf.tensor1d(XS);
    const y = tf.tensor1d(YS);
    const adam = tf.train.adam(0.05, 0.9, 0.999, 1e-7);
    for (let k = 0; k < 30; k++)
      adam.minimize(() => {
        const a = tf.sigmoid(tf.add(tf.mul(x, w), b));
        return tf.neg(
          tf.mean(tf.add(tf.mul(y, tf.log(a)), tf.mul(tf.sub(1, y), tf.log(tf.sub(1, a))))),
        ) as tf.Scalar;
      });
    const [tw, tb] = [w.dataSync()[0], b.dataSync()[0]];
    // TF.js computes in float32.
    near(last('L1.W'), tw, 1e-4);
    near(last('L1.b'), tb, 1e-4);
    results.G2 = {
      updates: 30,
      engine: [last('L1.W'), last('L1.b')],
      tfjs: [tw, tb],
      gap: [Math.abs(last('L1.W') - tw), Math.abs(last('L1.b') - tb)],
    };
  });

  it('G3 momentum: velocity and step over 12 updates against the hand recurrence', () => {
    const opt = { type: 'momentum', lr: 0.3, momentum: 0.9 } as const;
    const { all } = record(neuron(opt, 12));
    const st = of(all, 'OPTIMIZER_STATE', 'L1.W');
    const up = of(all, 'COMPUTE_UPDATE', 'L1.W');
    let [w, b, vw, vb] = [-1.5, 1, 0, 0];
    let worst = 0;
    for (let t = 0; t < 12; t++) {
      const g = grads(w, b);
      vw = 0.9 * vw + g.gw;
      vb = 0.9 * vb + g.gb;
      worst = Math.max(worst, Math.abs(st[t].results.velocity.data[0] - vw));
      near(st[t].results.velocity.data[0], vw, 1e-12);
      near(up[t].results.delta.data[0], -0.3 * vw, 1e-12);
      w += -0.3 * vw;
      b += -0.3 * vb;
    }
    results.G3 = { updates: 12, worstAbsoluteGap: worst };
  });

  it('G4 L2 weight decay: λ·w recorded, biases untouched, 12 updates by hand, and a finite-difference check', () => {
    const lam = 0.5;
    const opt = { type: 'sgd', lr: 0.4, weightDecay: lam } as const;
    const { all } = record(neuron(opt, 12));
    const accW = of(all, 'GRAD_ACCUMULATE', 'L1.W');
    const accB = of(all, 'GRAD_ACCUMULATE', 'L1.b');
    let [w, b] = [-1.5, 1];
    let worstFd = 0;
    for (let t = 0; t < 12; t++) {
      const g = grads(w, b);
      const a = accW[t];
      near(a.results.grad.data[0], g.gw, 1e-12);
      near(a.results.decay.data[0], lam * w, 1e-12);
      near(a.results.regularized.data[0], g.gw + lam * w, 1e-12);
      expect(a.meta.weightDecay).toBe(lam);
      // The decayed weight is an operand; the bias has no decay at all.
      expect(a.operands.at(-1)!.role).toBe('parameter (weight decay)');
      expect(accB[t].results.decay).toBeUndefined();
      // The step uses the regularised gradient.
      const step = of(all, 'COMPUTE_UPDATE', 'L1.W')[t];
      expect(step.operands[0]).toMatchObject({ ref: a.id, slot: 'regularized' });
      near(step.results.delta.data[0], -0.4 * (g.gw + lam * w), 1e-12);
      // Finite difference of the penalised objective L(w) + (λ/2)·w² at the current w.
      const h = 1e-6;
      const J = (ww: number) => grads(ww, b).loss + (lam / 2) * ww * ww;
      const fd = (J(w + h) - J(w - h)) / (2 * h);
      worstFd = Math.max(worstFd, Math.abs(fd - a.results.regularized.data[0]));
      near(fd, a.results.regularized.data[0], 1e-8);
      w += -0.4 * (g.gw + lam * w);
      b += -0.4 * g.gb;
    }
    // The bias moved exactly as without decay.
    const lastB = of(all, 'APPLY_UPDATE', 'L1.b').at(-1)!.results.value.data[0];
    near(lastB, b, 1e-12);
    // Decay also reaches Adam: its first moment starts from the regularised gradient.
    const { all: adamAll } = record(
      neuron({ type: 'adam', lr: 0.1, beta1: 0.9, beta2: 0.999, epsilon: 1e-8, weightDecay: lam }, 2),
    );
    const s0 = of(adamAll, 'OPTIMIZER_STATE', 'L1.W')[0];
    expect(s0.operands[0].slot).toBe('regularized');
    near(s0.results.m.data[0], 0.1 * (grads(-1.5, 1).gw + lam * -1.5), 1e-12);
    results.G4 = { updates: 12, lambda: lam, worstFiniteDifferenceGap: worstFd };
  });
});

describe('Level 3 gate: replay, held-out split, grammar', () => {
  const net = (optimizer: OptimizerConfig): TrainConfig => ({
    seed: 4,
    epochs: 6,
    batchSize: 10,
    shuffle: true,
    loss: 'bce',
    optimizer,
    model: {
      inputShape: [2],
      layers: [
        { type: 'dense', units: 6, activation: 'tanh' },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
    },
  });
  const DATA: DatasetSpec = { kind: 'xorClusters', n: 40, seed: 2, noise: 0.4, test: { n: 60, seed: 9 } };
  const fingerprint = (ins: Instruction[]) =>
    JSON.stringify(
      ins.map((i) => [i.id, i.kind, i.operands, Object.values(i.results).map(encodeTensor), i.meta]),
    );

  it('G5 replay: identical regeneration, and segments rebuilt from checkpoints holding Adam’s state are identical', () => {
    const c = net({ type: 'adam', lr: 0.02, beta1: 0.9, beta2: 0.999, epsilon: 1e-8, weightDecay: 0.01 });
    const a = record(c, DATA);
    const b = record(c, DATA);
    expect(fingerprint(b.all)).toBe(fingerprint(a.all));
    // A tiny budget forces every segment out of the cache; reading again regenerates each from its checkpoint.
    const small = record(c, DATA, 1);
    const first = fingerprint(small.src.range(0, small.src.length));
    const again = fingerprint(small.src.range(0, small.src.length));
    expect(again).toBe(first);
    expect(first).toBe(fingerprint(a.all));
    expect(small.store.stats().checkpointBytes).toBeGreaterThan(0);
    results.G5 = { instructions: a.all.length, identical: true };
  });

  it('G6 held-out split: the recorded held-out loss is the final parameters’ loss on 60 unseen points, by hand', async () => {
    const c = net({ type: 'sgd', lr: 0.5 });
    const { all } = record(c, DATA);
    const data = resolveDataset(DATA);
    expect(data.xs.shape[0]).toBe(40);
    expect(data.test!.xs.shape[0]).toBe(60);
    const last = (p: string) => Array.from(of(all, 'APPLY_UPDATE', p).at(-1)!.results.value.data);
    const [W1, b1, W2, b2] = ['L1.W', 'L1.b', 'L2.W', 'L2.b'].map(last);
    let loss = 0;
    for (let i = 0; i < 60; i++) {
      const x = [data.test!.xs.data[2 * i], data.test!.xs.data[2 * i + 1]];
      const a1 = Array.from({ length: 6 }, (_, j) => Math.tanh(x[0] * W1[j] + x[1] * W1[6 + j] + b1[j]));
      const p = sig(a1.reduce((t, a, j) => t + a * W2[j], b2[0]));
      const y = data.test!.ys.data[i];
      loss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    }
    const ends = all.filter((i) => i.kind === 'EVAL_END');
    near(ends.at(-1)!.results.testLoss.item(), loss / 60, 1e-9);
    // compareRuns (the engine without a record) gives the same held-out curve as the record.
    const host = new EngineHost();
    const r = await host.handle({ op: 'compareRuns', configs: [c], dataset: DATA });
    if (r.op !== 'compareRuns') throw new Error('unexpected reply');
    expect(r.runs[0].testLosses).toEqual(ends.map((e) => e.results.testLoss.item()));
    // Without a held-out split nothing changes: no testLoss is recorded.
    const plain = record(c, { kind: 'xorClusters', n: 40, seed: 2, noise: 0.4 });
    expect(plain.all.find((i) => i.kind === 'EVAL_END')!.results.testLoss).toBeUndefined();
    expect(() => resolveDataset({ ...DATA, test: { n: 10, seed: 2 } } as DatasetSpec)).toThrow(
      /different seed/,
    );
    results.G6 = { heldOut: 60, finalHeldOutLoss: loss / 60 };
  });

  it('G7 every new kind of trace conforms to the NPM grammar', () => {
    const configs: OptimizerConfig[] = [
      { type: 'adam', lr: 0.02, beta1: 0.9, beta2: 0.999, epsilon: 1e-8 },
      { type: 'sgd', lr: 0.5, weightDecay: 0.01 },
      { type: 'momentum', lr: 0.1, momentum: 0.9, weightDecay: 0.01 },
      { type: 'adam', lr: 0.02, beta1: 0.9, beta2: 0.999, epsilon: 1e-8, weightDecay: 0.01 },
    ];
    for (const o of configs)
      expect(conformsToGrammar(record(net(o), DATA).all), JSON.stringify(o)).toBe(true);
    // Invalid settings are refused.
    expect(() => record(net({ type: 'adam', lr: 0.1, beta1: 1, beta2: 0.999, epsilon: 1e-8 }), DATA)).toThrow(
      /β₁/,
    );
    expect(() => record(net({ type: 'sgd', lr: 0.1, weightDecay: -1 }), DATA)).toThrow(/weight decay/);
    results.G7 = { configurations: configs.length, conform: true };
  });
});
