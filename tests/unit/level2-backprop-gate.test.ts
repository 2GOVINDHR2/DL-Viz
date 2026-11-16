/**
 * Stage 4 capability gate (docs/LEVEL-2-STAGES.md, Stage 4): can the existing engine run Experiment 04's 2-2-1
 * sigmoid network on XOR and expose every gradient the backpropagation visualisation needs? Nothing here assumes
 * it: each capability is demonstrated against values computed independently in this file (plain arithmetic, and
 * central finite differences of the engine's own loss).
 *
 *  G1 forward execution · G2 loss · G3 hidden- and output-layer weight and bias gradients (by hand and by finite
 *  differences) · G4 propagation through the hidden layer · G5 accumulation (across a batch; a value used twice on
 *  the tape) · G6 access from the visualisation layer (reconstructed state, per-weight decomposition, local
 *  derivatives from the op rules) · G7 NPM compatibility (the trace records exactly what backward computed).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { backward, getOp, Tape } from '../../src/core/autodiff';
import { resolveDataset } from '../../src/core/engine/host';
import { TrainingSession, type TrainConfig } from '../../src/core/engine/session';
import { storeSource, TraceStore, reconstructState } from '../../src/core/npm';
import { Tensor } from '../../src/core/tensor/tensor';
import { L2_EXP04_DEFAULTS as D } from '../../src/experiments/level2';

const XOR = {
  xs: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  ys: [0, 1, 1, 0],
};
const P = D.initialParams;
const sig = (z: number): number => 1 / (1 + Math.exp(-z));

const config = (batchSize = 1, epochs = 1, params: Record<string, number[]> = P): TrainConfig => ({
  seed: 0,
  epochs,
  batchSize,
  shuffle: false,
  loss: 'bce',
  optimizer: { type: 'sgd', lr: D.lr },
  model: {
    inputShape: [2],
    layers: [
      { type: 'dense', units: 2, activation: 'sigmoid' },
      { type: 'dense', units: 1, activation: 'sigmoid' },
    ],
  },
  initialParams: params,
});
const data = resolveDataset({ kind: 'xor' });

/** Forward and backward through the 2-2-1 network by hand. Engine layout: W1[i*2+j] joins input i to hidden j. */
function byHand(x: number[], y: number, p: Record<string, number[]> = P) {
  const z1 = [0, 1].map((j) => x[0] * p['L1.W'][j] + x[1] * p['L1.W'][2 + j] + p['L1.b'][j]);
  const a1 = z1.map(sig);
  const z2 = a1[0] * p['L2.W'][0] + a1[1] * p['L2.W'][1] + p['L2.b'][0];
  const a2 = sig(z2);
  const loss = -(y * Math.log(a2) + (1 - y) * Math.log(1 - a2));
  const dA2 = -y / a2 + (1 - y) / (1 - a2);
  const dZ2 = dA2 * a2 * (1 - a2);
  const dW2 = [a1[0] * dZ2, a1[1] * dZ2];
  const dA1 = [p['L2.W'][0] * dZ2, p['L2.W'][1] * dZ2];
  const dZ1 = [0, 1].map((j) => dA1[j] * a1[j] * (1 - a1[j]));
  const dW1 = [x[0] * dZ1[0], x[0] * dZ1[1], x[1] * dZ1[0], x[1] * dZ1[1]];
  return { z1, a1, z2, a2, loss, dA2, dZ2, dW2, db2: [dZ2], dA1, dZ1, dW1, db1: dZ1 };
}

/** The parameters each example sees with one update per example (η·∂L/∂θ subtracted after each), by hand. */
function handSequence(): Record<string, number[]>[] {
  const out: Record<string, number[]>[] = [];
  let p: Record<string, number[]> = Object.fromEntries(Object.entries(P).map(([n, v]) => [n, [...v]]));
  XOR.xs.forEach((x, i) => {
    out.push(p);
    const h = byHand(x, XOR.ys[i], p);
    const g: Record<string, number[]> = { 'L1.W': h.dW1, 'L1.b': h.db1, 'L2.W': h.dW2, 'L2.b': h.db2 };
    p = Object.fromEntries(Object.entries(p).map(([n, v]) => [n, v.map((q, k) => q - D.lr * g[n][k])]));
  });
  return out;
}
/** Numeric equality that treats +0 and −0 as equal (Object.is, used by toEqual, does not). */
const same = (a: number[], b: number[]): boolean => a.length === b.length && a.every((v, k) => v === b[k]);

/** Central finite difference of the engine's own loss for example i, with respect to one parameter value. */
function finiteDifference(i: number, name: string, k: number, h = 1e-6): number {
  const at = (delta: number): number => {
    const p = Object.fromEntries(Object.entries(P).map(([n, v]) => [n, [...v]]));
    p[name][k] += delta;
    return new TrainingSession(config(1, 1, p), data).runSample(i).loss.value.item();
  };
  return (at(h) - at(-h)) / (2 * h);
}

const relErr = (a: number, b: number): number => Math.abs(a - b) / Math.max(1e-8, Math.abs(a), Math.abs(b));
const results: Record<string, unknown> = {};
afterAll(() => {
  writeFileSync(
    resolve(import.meta.dirname, '../../reports/level2-backprop-gate.json'),
    JSON.stringify(results, null, 2) + '\n',
  );
});

describe('Stage 4 gate: the engine and Experiment 04’s 2-2-1 network', () => {
  const session = new TrainingSession(config(), data);

  it('G1 forward execution and G2 loss: every example, against the network computed by hand', () => {
    let worst = 0;
    XOR.xs.forEach((x, i) => {
      const rec = session.runSample(i);
      const h = byHand(x, XOR.ys[i]);
      const out = rec.output.value.data[0];
      worst = Math.max(worst, Math.abs(out - h.a2), Math.abs(rec.loss.value.item() - h.loss));
    });
    results.G1G2_worstAbsDeviation = worst;
    expect(worst).toBeLessThan(1e-14);
  });

  it('G3 every weight and bias gradient of both layers, against hand backpropagation and central finite differences', () => {
    let worstHand = 0;
    let worstFd = 0;
    XOR.xs.forEach((x, i) => {
      const rec = session.runSample(i);
      const h = byHand(x, XOR.ys[i]);
      const expected: Record<string, number[]> = {
        'L1.W': h.dW1,
        'L1.b': h.db1,
        'L2.W': h.dW2,
        'L2.b': h.db2,
      };
      for (const [name, exp] of Object.entries(expected)) {
        const g = Array.from(rec.grads.get(name)!.data);
        g.forEach((v, k) => {
          worstHand = Math.max(worstHand, Math.abs(v - exp[k]));
          worstFd = Math.max(worstFd, relErr(v, finiteDifference(i, name, k)));
        });
      }
    });
    results.G3_worstAbsDeviationFromHand = worstHand;
    results.G3_worstRelativeDeviationFromFiniteDifferences = worstFd;
    results.G3_parametersChecked = '9 values (L1.W ×4, L1.b ×2, L2.W ×2, L2.b ×1) × 4 examples = 36';
    expect(worstHand).toBeLessThan(1e-14);
    expect(worstFd).toBeLessThan(1e-6);
  });

  it('G4 propagation through the hidden layer: ∂L/∂a¹ = W² ∂L/∂z², and ∂L/∂z¹ = ∂L/∂a¹ ⊙ σ′(z¹)', () => {
    const { store } = TraceStore.generate(config(), data);
    const ins = store.range(0, store.length);
    const seq = handSequence();
    XOR.xs.forEach((x, i) => {
      // Example i is processed with the parameters left by the i updates before it.
      const h = byHand(x, XOR.ys[i], seq[i]);
      const sample = ins.filter((q) => q.path.epoch === 0 && q.path.batch === i && q.path.sample === 0);
      const passBack = sample.find((q) => q.kind === 'GRAD_MATMUL_X' && q.path.layer === 'L2')!;
      Array.from(passBack.results.grad.data).forEach((v, j) =>
        expect(Math.abs(v - h.dA1[j])).toBeLessThan(1e-15),
      );
      const dz1 = sample.find((q) => q.kind === 'GRAD_ACTIVATE' && q.path.layer === 'L1')!;
      Array.from(dz1.results.grad.data).forEach((v, j) => expect(Math.abs(v - h.dZ1[j])).toBeLessThan(1e-15));
      // The input layer needs no gradient, so the engine records none for it.
      expect(sample.some((q) => q.kind === 'GRAD_MATMUL_X' && q.path.layer === 'L1')).toBe(false);
      // Backward order: from the loss, output layer first, then the hidden layer.
      const order = sample
        .filter((q) => q.path.phase === 'backward' && q.kind !== 'BACKWARD_LAYER_END')
        .map((q) => `${q.kind}:${q.path.layer ?? 'loss'}`);
      results.G4_backwardOrder = order;
      expect(order.indexOf('GRAD_ACTIVATE:L2')).toBeLessThan(order.indexOf('GRAD_MATMUL_X:L2'));
      expect(order.indexOf('GRAD_MATMUL_X:L2')).toBeLessThan(order.indexOf('GRAD_ACTIVATE:L1'));
      expect(order[0]).toBe('GRAD_INIT:loss');
    });
  });

  it('G5 accumulation: across a batch (GRAD_ACCUMULATE is the mean) and for a value used twice on the tape', () => {
    // Batch size 1: the accumulated gradient is the example's own.
    const one = TraceStore.generate(config(1), data).store;
    const ins1 = one.range(0, one.length);
    const acc1 = ins1.find(
      (q) => q.kind === 'GRAD_ACCUMULATE' && q.meta.param === 'L1.W' && q.path.batch === 0,
    )!;
    expect(same(Array.from(acc1.results.grad.data), byHand(XOR.xs[0], XOR.ys[0]).dW1)).toBe(true);
    const acc1d = ins1.find(
      (q) => q.kind === 'GRAD_ACCUMULATE' && q.meta.param === 'L1.W' && q.path.batch === 3,
    )!;
    const seq = handSequence();
    Array.from(acc1d.results.grad.data).forEach((v, k) =>
      expect(Math.abs(v - byHand(XOR.xs[3], XOR.ys[3], seq[3]).dW1[k])).toBeLessThan(1e-15),
    );
    // Batch size 2: the mean of the two examples' gradients.
    const two = TraceStore.generate(config(2), data).store;
    const acc2 = two
      .range(0, two.length)
      .find((q) => q.kind === 'GRAD_ACCUMULATE' && q.meta.param === 'L1.W' && q.path.batch === 0)!;
    const h0 = byHand(XOR.xs[0], XOR.ys[0]).dW1;
    const h1 = byHand(XOR.xs[1], XOR.ys[1]).dW1;
    Array.from(acc2.results.grad.data).forEach((v, k) =>
      expect(Math.abs(v - (h0[k] + h1[k]) / 2)).toBeLessThan(1e-15),
    );
    // A value used twice: y = x·x + x, so dy/dx = 2x + 1 (the tape adds both paths' contributions).
    const tape = new Tape();
    const x = tape.leaf(Tensor.scalar(1.5), true, 'x');
    const y = tape.apply('add', [tape.apply('mul', [x, x]), x]);
    expect(backward(tape, y).get(x.id)!.item()).toBe(2 * 1.5 + 1);
    results.G5 =
      'batch-1 accumulation is the identity; batch-2 is the mean; a Var used on two paths gets the sum (2x + 1 at x = 1.5 → 4)';
  });

  it('G6 access from the visualisation layer: reconstructed state, per-weight decomposition, op-rule local derivatives', () => {
    const { store } = TraceStore.generate(config(), data);
    const src = storeSource(store);
    const ins = store.range(0, store.length);
    // The cursor at the last backward instruction of example 4, x = (1, 1), before its update.
    const lastBackward = ins.filter((q) => q.path.batch === 3 && q.path.phase === 'backward').at(-1)!;
    const st = reconstructState(src, lastBackward.id);
    const L1 = st.sample!.layers.L1;
    const L2 = st.sample!.layers.L2;
    const h = byHand(XOR.xs[3], XOR.ys[3], handSequence()[3]);
    expect(Math.abs(L2.gradZ!.data[0] - h.dZ2)).toBeLessThan(1e-15);
    // Nothing has been updated yet at this cursor: the batch's update instructions come after it.
    expect(Object.keys(st.updates)).toEqual([]);
    expect(Array.from(L1.gradA!.data).map((v, j) => Math.abs(v - h.dA1[j]) < 1e-15)).toEqual([true, true]);
    // ∂L/∂wᵢⱼ = (input i) × (∂L/∂zⱼ): the decomposition the visualisation shows equals the recorded element.
    const x = Array.from(st.sample!.x.data);
    const gW1 = Array.from(L1.gradW!.data);
    const gZ1 = Array.from(L1.gradZ!.data);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) expect(x[i] * gZ1[j]).toBe(gW1[i * 2 + j]);
    const a1 = Array.from(L1.a!.data);
    const gW2 = Array.from(L2.gradW!.data);
    const gZ2 = L2.gradZ!.data[0];
    for (let i = 0; i < 2; i++) expect(a1[i] * gZ2).toBe(gW2[i]);
    // The local derivative σ′(z) comes from the sigmoid op's registered rule with an incoming gradient of 1.
    const z1 = L1.z!;
    const local = getOp('sigmoid').backward({
      grad: Tensor.full(z1.shape, 1),
      inputs: [z1],
      output: L1.a!,
      attrs: {},
      saved: undefined,
    })[0]!;
    const gA1 = Array.from(L1.gradA!.data);
    Array.from(local.data).forEach((d, j) => expect(Math.abs(gA1[j] * d - gZ1[j])).toBeLessThan(1e-16));
    results.G6 =
      'state.sample.layers gives z, a, ∂L/∂a, ∂L/∂z, ∂L/∂W, ∂L/∂b per layer; input × incoming gradient equals each recorded weight gradient exactly';
  });

  it('G7 NPM compatibility: the trace records exactly the gradients the engine’s backward pass computed', () => {
    const { store } = TraceStore.generate(config(), data);
    const ins = store.range(0, store.length);
    XOR.xs.forEach((_, i) => {
      const rec = new TrainingSession(config(), data);
      // Advance the session to example i's parameters (one update per earlier example), then run it.
      rec.beginEpoch();
      for (let k = 0; k < i; k++) rec.runBatch();
      const sampleRec = rec.runSample(i);
      const sample = ins.filter((q) => q.path.batch === i && q.path.sample === 0);
      const recW1 = sample.find((q) => q.kind === 'GRAD_MATMUL_W' && q.path.layer === 'L1')!;
      const recW2 = sample.find((q) => q.kind === 'GRAD_MATMUL_W' && q.path.layer === 'L2')!;
      expect(Array.from(recW1.results.grad.data)).toEqual(Array.from(sampleRec.grads.get('L1.W')!.data));
      expect(Array.from(recW2.results.grad.data)).toEqual(Array.from(sampleRec.grads.get('L2.W')!.data));
    });
    results.G7 =
      'GRAD_MATMUL_W of both layers, for each of the 4 examples, bit-identical to TrainingSession.runSample';
  });
});
