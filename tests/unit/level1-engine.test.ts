/**
 * Level 1's experiments read every value from the engine (ADR-082). These tests check that the probes return what
 * the engine computes by an independent path (TrainingSession.predict), that a probe never changes or invents
 * parameters, and that each experiment's claims hold for the engine: the gate solutions, XOR's limit for one line,
 * the composed-layer equivalence, the nonlinear XOR network, and Experiment 04's defaults.
 */
import { describe, expect, it } from 'vitest';
import { resolveDataset } from '../../src/core/engine/host';
import { TrainingSession } from '../../src/core/engine/session';
import { Tensor } from '../../src/core/tensor/tensor';
import { EXPERIMENTS, experimentById } from '../../src/experiments/registry';
import {
  AND_TABLE,
  EXP03_XOR_NET,
  EXP04_DEFAULTS,
  GATES,
  LEVEL1_EXPERIMENTS,
} from '../../src/experiments/level1';
import { probe, probeGrid, ProbeError, runProbe, stepRule } from '../../src/learn/engine/probe';
import { neuronProbe, neuronQuestions, neuronValues } from '../../src/learn/level1/Experiment01';
import { perceptronQuestions, perceptronRows } from '../../src/learn/level1/Experiment02';
import { xorNetRun, xorQuestions } from '../../src/learn/level1/Experiment03';
import { lossOf } from '../../src/learn/level1/exp04/parts';
import { fmt } from '../../src/learn/format';

const dense = (inputs: number, units: number, act: 'linear' | 'sigmoid' | 'relu' | 'tanh') => ({
  inputShape: [inputs],
  layers: [{ type: 'dense' as const, units, activation: act }],
});

function predict(
  model: ReturnType<typeof dense>,
  params: Record<string, number[]>,
  xs: number[][],
): number[] {
  const s = new TrainingSession(
    {
      model,
      loss: 'mse',
      optimizer: { type: 'sgd', lr: 0 },
      batchSize: 1,
      epochs: 1,
      seed: 0,
      shuffle: false,
      initialParams: params,
    },
    resolveDataset({ kind: 'points', name: 't', xs, ys: xs.map(() => [0]) }),
  );
  return Array.from(s.predict(Tensor.from([xs.length, xs[0].length], xs.flat())).data);
}

describe('engine probes', () => {
  it('agree with the engine’s own prediction path, for every activation', () => {
    for (const act of ['linear', 'sigmoid', 'relu', 'tanh'] as const) {
      const params = { 'L1.W': [0.7, -1.3], 'L1.b': [0.25] };
      const xs = [
        [1, 2],
        [-0.5, 0.3],
        [0, 0],
      ];
      const r = runProbe({ model: dense(2, 1, act), params, xs });
      expect(r.examples.map((e) => e.output[0])).toEqual(predict(dense(2, 1, act), params, xs));
    }
  });
  it('record u, z and a exactly as the layer computes them', () => {
    const r = runProbe({
      model: dense(2, 1, 'sigmoid'),
      params: { 'L1.W': [0.5, -0.25], 'L1.b': [0.1] },
      xs: [[1, 2]],
    });
    const L = r.examples[0].layers.L1;
    expect(L.u![0]).toBe(0);
    expect(L.z![0]).toBe(0.1);
    expect(L.a![0]).toBeCloseTo(1 / (1 + Math.exp(-0.1)), 15);
  });
  it('leave the parameters exactly as set (learning rate 0)', () => {
    const params = { 'L1.W': [0.3, 0.9], 'L1.b': [-0.2] };
    const r = runProbe({
      model: dense(2, 1, 'tanh'),
      params,
      xs: [
        [1, 1],
        [2, -1],
      ],
      ys: [[1], [0]],
    });
    expect(r.examples.length).toBe(2);
    const again = runProbe({ model: dense(2, 1, 'tanh'), params, xs: [[2, -1]] });
    expect(again.examples[0].output).toEqual(r.examples[1].output);
  });
  it('refuse to run with a missing or non-finite parameter instead of using random values', () => {
    expect(() =>
      runProbe({ model: dense(2, 1, 'linear'), params: { 'L1.W': [1, 1] }, xs: [[0, 0]] }),
    ).toThrow(ProbeError);
    expect(() =>
      runProbe({ model: dense(2, 1, 'linear'), params: { 'L1.W': [1, NaN], 'L1.b': [0] }, xs: [[0, 0]] }),
    ).toThrow(ProbeError);
  });
  it('frame the engine’s evaluation grid exactly on the requested rectangle', () => {
    const g = probeGrid(dense(2, 1, 'linear'), { 'L1.W': [1, 0], 'L1.b': [0] }, [-0.5, 1.5, -0.5, 1.5], 20);
    g.bounds.forEach((b, i) => expect(b).toBeCloseTo([-0.5, 1.5, -0.5, 1.5][i], 12));
    // The output is x₁ at each cell centre, from the engine.
    expect(g.values[0]).toBeCloseTo(-0.5 + 2 / 40, 12);
  });
  it('the step rule is the only interface arithmetic, and it is a threshold at 0', () => {
    expect([stepRule(-1e-9), stepRule(0), stepRule(3)]).toEqual([0, 1, 1]);
  });
});

describe('Experiment 01', () => {
  it('per-input contributions come from the engine and add up to the weighted sum', () => {
    const s = { x: [1.3, -0.7], w: [0.9, 1.1], b: -0.4, activation: 'relu' as const };
    const v = neuronValues(s, neuronProbe(s));
    expect(v.contributions[0] + v.contributions[1]).toBeCloseTo(v.u, 14);
    expect(v.z).toBeCloseTo(v.u - 0.4, 14);
    expect(v.a).toBe(Math.max(0, v.z));
  });
  it('the live questions describe the current settings, not the defaults (the self-check defect)', () => {
    for (const s of [
      { x: [1, 0.5], w: [0.8, -0.4], b: 0.1, activation: 'sigmoid' as const },
      { x: [-2, 1], w: [1.5, 0.2], b: -0.3, activation: 'tanh' as const },
    ]) {
      const z = neuronValues(s, neuronProbe(s)).z;
      const [relu, step] = neuronQuestions(s);
      expect(relu.prompt).toContain(fmt(z));
      const right = relu.options.filter((o) => o.correct);
      expect(right).toHaveLength(1);
      expect(right[0].text).toBe(fmt(Math.max(0, z)));
      expect(step.options.find((o) => o.correct)!.text).toBe(String(stepRule(z)));
      for (const o of [...relu.options, ...step.options]) expect(o.feedback).toContain(fmt(z));
    }
  });
});

describe('Experiment 02', () => {
  it('reuses experiment 1’s AND truth table', () => {
    const d = experimentById('single-neuron').dataset;
    expect(d.kind === 'points' && d.xs).toEqual(AND_TABLE.xs);
  });
  it('the offered solutions implement AND, OR and NOT', () => {
    const sol = {
      AND: { w: [1, 1], b: -1.5 },
      OR: { w: [1, 1], b: -0.5 },
      NOT: { w: [-1], b: 0.5 },
    } as const;
    for (const [gate, s] of Object.entries(sol)) {
      const { rows } = perceptronRows({ gate: gate as 'AND', w: [...s.w], b: s.b });
      expect(
        rows.every((r) => r.output === r.target),
        gate,
      ).toBe(true);
    }
  });
  it('no setting of one perceptron gets more than 3 of 4 XOR rows right (sweep of 9,261 settings)', () => {
    let best = 0;
    const vals = Array.from({ length: 21 }, (_, i) => -2 + i * 0.2);
    for (const w1 of vals)
      for (const w2 of vals)
        for (const b of vals) {
          const { rows } = perceptronRows({ gate: 'XOR', w: [w1, w2], b });
          best = Math.max(best, rows.filter((r) => r.output === r.target).length);
        }
    expect(best).toBe(3);
  });
  it('its live question’s answer is the engine’s output at the current settings', () => {
    const s = { gate: 'OR' as const, w: [0.4, -1.2], b: -0.3 };
    const q = perceptronQuestions(s)[0];
    const z = probe({ model: dense(2, 1, 'linear'), params: { 'L1.W': s.w, 'L1.b': [s.b] }, xs: [[1, 0]] })
      .examples[0].layers.L1.z![0];
    expect(q.options.find((o) => o.correct)!.text).toBe(String(stepRule(z)));
  });
});

describe('Experiment 03', () => {
  it('with ReLU the fixed network gets all of XOR right; without it, at most 3', () => {
    const relu = xorNetRun({ activation: 'relu', hiddenBias: [...EXP03_XOR_NET.hidden.b] }).rows;
    const lin = xorNetRun({ activation: 'linear', hiddenBias: [...EXP03_XOR_NET.hidden.b] }).rows;
    expect(relu.filter((r) => r.output === r.target).length).toBe(4);
    expect(lin.filter((r) => r.output === r.target).length).toBeLessThanOrEqual(3);
  });
  it('without ReLU, no hidden biases make the network solve XOR', () => {
    const vals = Array.from({ length: 21 }, (_, i) => -2 + i * 0.2);
    for (const b1 of vals)
      for (const b2 of vals) {
        const n = xorNetRun({ activation: 'linear', hiddenBias: [b1, b2] }).rows.filter(
          (r) => r.output === r.target,
        ).length;
        expect(n).toBeLessThan(4);
      }
  });
  it('two linear layers equal the single layer read off their outputs (to rounding)', () => {
    const params = {
      'L1.W': [0.866, 0.5, -0.5, 0.866],
      'L1.b': [0.3, -0.2],
      'L2.W': [1.6, 0, 0.8, 0.6],
      'L2.b': [-0.5, 0.4],
    };
    const two = {
      inputShape: [2],
      layers: [
        { type: 'dense' as const, units: 2, activation: 'linear' as const },
        { type: 'dense' as const, units: 2, activation: 'linear' as const },
      ],
    };
    const [o, e1, e2] = probe({
      model: two,
      params,
      xs: [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
    }).examples.map((e) => e.layers.L2.a!);
    const single = { 'L1.W': [e1[0] - o[0], e1[1] - o[1], e2[0] - o[0], e2[1] - o[1]], 'L1.b': [o[0], o[1]] };
    const xs = [
      [1.7, -0.3],
      [-2, 2],
      [0.5, 0.5],
    ];
    const a = probe({ model: two, params, xs }).examples.map((e) => e.layers.L2.a!);
    const b = probe({ model: { inputShape: [2], layers: [two.layers[0]] }, params: single, xs }).examples.map(
      (e) => e.layers.L1.a!,
    );
    a.forEach((p, i) => p.forEach((v, k) => expect(Math.abs(v - b[i][k])).toBeLessThan(1e-12)));
  });
  it('its live question’s answer is the engine’s count', () => {
    for (const activation of ['linear', 'relu'] as const) {
      const s = { activation, hiddenBias: [0.2, -0.6] };
      const n = xorNetRun(s).rows.filter((r) => r.output === r.target).length;
      expect(xorQuestions(s)[0].options.find((o) => o.correct)!.text).toBe(String(n));
    }
  });
});

describe('Experiment 04', () => {
  it('starts from experiment 7’s XOR configuration, with batches of 2', () => {
    const base = experimentById('xor-mlp').config;
    expect({ ...EXP04_DEFAULTS, batchSize: base.batchSize, boundaryGrid: base.boundaryGrid }).toEqual(base);
    expect(EXP04_DEFAULTS.batchSize).toBe(2);
  });
  it('its defaults learn XOR for each of seeds 1–10 (the claim in level1.ts)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = new TrainingSession(
        { ...EXP04_DEFAULTS, seed, boundaryGrid: 0 },
        resolveDataset({ kind: 'xor' }),
      );
      let acc = 0;
      while (!s.done) acc = s.runEpoch().eval.accuracy ?? 0;
      expect(acc, `seed ${seed}`).toBe(1);
    }
  });
  it('the loss example is the engine’s squared error', () => {
    expect(lossOf(0.3, 1)).toBeCloseTo(0.49, 14);
    expect(lossOf(1, 1)).toBe(0);
  });
});

describe('the curriculum is extended, not replaced', () => {
  it('keeps all ten registry experiments and adds four Level 1 experiments', () => {
    expect(EXPERIMENTS.map((e) => e.id)).toEqual([
      'single-neuron',
      'activations',
      'forward-propagation',
      'loss',
      'gradient-descent',
      'backpropagation',
      'xor-mlp',
      'cnn-mnist',
      'vanishing-gradients',
      'lr-pathology',
    ]);
    expect(LEVEL1_EXPERIMENTS.map((e) => e.id)).toEqual(['01', '02', '03', '04']);
  });
  it('every experiment has objectives, a primer of 2–4 terms, a tour and 3–5 questions with one right answer each', () => {
    for (const e of LEVEL1_EXPERIMENTS) {
      expect(e.objectives.length).toBeGreaterThan(0);
      expect(e.primer.terms.length).toBeGreaterThanOrEqual(2);
      expect(e.primer.terms.length).toBeLessThanOrEqual(4);
      expect(e.tour.length).toBeGreaterThan(2);
      expect(e.questions.length).toBeGreaterThanOrEqual(3);
      expect(e.questions.length).toBeLessThanOrEqual(5);
      for (const q of e.questions) {
        expect(q.options.filter((o) => o.correct)).toHaveLength(1);
        for (const o of q.options) expect(o.feedback.length).toBeGreaterThan(10);
      }
    }
    expect(Object.keys(GATES)).toEqual(['AND', 'OR', 'NOT', 'XOR']);
  });
});
