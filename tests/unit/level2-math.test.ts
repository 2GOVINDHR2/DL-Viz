/**
 * Level 2, Stage 2: the values Experiments 01 and 02 display are the engine's, and the engine's agree with
 * independently written formulas (plain arithmetic in this file, not engine code). Tolerances are float64 rounding.
 */
import { describe, expect, it } from 'vitest';
import { L2_EXP01_DEFAULTS, L2_EXP02_DEFAULTS, LEVEL2_EXPERIMENTS } from '../../src/experiments/level2';
import { LEVEL1_EXPERIMENTS } from '../../src/experiments/level1';
import { bce, logitChain, mseBreakdown, squaredError } from '../../src/learn/engine/expr';
import {
  networkQuestions,
  networkRun,
  neuronRun,
  textbookRows,
  type NetSetting,
} from '../../src/learn/level2/Experiment01';
import { mseQuestions } from '../../src/learn/level2/Experiment02';
import { LEVEL_1, LEVEL_2 } from '../../src/learn/curriculum';
import { parseRoute } from '../../src/learn/router';
import { fmt } from '../../src/learn/format';

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));
const ACT = {
  sigmoid,
  tanh: Math.tanh,
  relu: (z: number) => Math.max(0, z),
  linear: (z: number) => z,
} as const;
const close = (a: number, b: number, tol = 1e-12): void =>
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tol);

describe('Experiment 01: forward propagation', () => {
  it('Part A: z = Σ wᵢxᵢ + b and a = f(z), with each contribution wᵢxᵢ, for every activation', () => {
    const x = [1.3, -0.4, 2];
    const w = [0.7, -1.1, 0.25];
    const b = -0.3;
    for (const act of ['sigmoid', 'tanh', 'relu', 'linear'] as const) {
      const v = neuronRun(x, w, b, act);
      const z = x.reduce((s, xi, i) => s + xi * w[i], 0) + b;
      close(v.z, z);
      close(v.a, ACT[act](z));
      v.contributions.forEach((c, i) => close(c, x[i] * w[i]));
    }
  });

  const setting = (over: Partial<NetSetting> = {}): NetSetting => {
    const d = L2_EXP01_DEFAULTS.network;
    return {
      x: [...d.x],
      hidden: { W: [...d.hidden.W], b: [...d.hidden.b] },
      output: { W: [...d.output.W], b: [...d.output.b] },
      act: 'sigmoid',
      ...over,
    };
  };

  /** The 2-2-1 forward pass in plain arithmetic, engine layout W[i][j] = input i → neuron j. */
  function byHand(s: NetSetting) {
    const f = ACT[s.act];
    const z1 = [0, 1].map((j) => s.x[0] * s.hidden.W[j] + s.x[1] * s.hidden.W[2 + j] + s.hidden.b[j]);
    const a1 = z1.map(f);
    const z2 = a1[0] * s.output.W[0] + a1[1] * s.output.W[1] + s.output.b[0];
    return { z1, a1, z2, a2: sigmoid(z2), parts: [a1[0] * s.output.W[0], a1[1] * s.output.W[1]] };
  }

  it('Part C: every recorded forward step matches the network computed by hand', () => {
    for (const s of [
      setting(),
      setting({ x: [-1.5, 0.8], act: 'tanh' }),
      setting({ x: [2, -2], act: 'relu', output: { W: [-0.9, 1.6], b: [0.3] } }),
    ]) {
      const { steps, contributions } = networkRun(s);
      const h = byHand(s);
      expect(steps.map((i) => `${i.kind}:${i.path.layer ?? ''}`)).toEqual([
        'LOAD_INPUT:',
        'MATMUL:L1',
        'ADD_BIAS:L1',
        'ACTIVATE:L1',
        'MATMUL:L2',
        'ADD_BIAS:L2',
        'ACTIVATE:L2',
      ]);
      const out = (k: number): number[] => Array.from(steps[k].results.out.data);
      out(2).forEach((v, j) => close(v, h.z1[j]));
      out(3).forEach((v, j) => close(v, h.a1[j]));
      close(out(5)[0], h.z2);
      close(out(6)[0], h.a2);
      contributions.forEach((c, j) => close(c, h.parts[j]));
      // The contributions and the bias add up to the output's z.
      close(contributions[0] + contributions[1] + s.output.b[0], out(5)[0]);
    }
  });

  it('Part D: the textbook rows times a, plus b, reproduce each recorded z (W shown one row per neuron)', () => {
    const s = setting({ x: [0.6, -1.2] });
    const { steps } = networkRun(s);
    const rows = textbookRows(s.hidden.W, 2, 2);
    expect(rows).toEqual([
      [s.hidden.W[0], s.hidden.W[2]],
      [s.hidden.W[1], s.hidden.W[3]],
    ]);
    const z = Array.from(steps[2].results.out.data);
    rows.forEach((r, j) => close(r[0] * s.x[0] + r[1] * s.x[1] + s.hidden.b[j], z[j]));
  });

  it('its live question names the hidden neuron with the larger contribution, at any settings', () => {
    for (const s of [setting(), setting({ output: { W: [0.1, -1.9], b: [0] } })]) {
      const h = byHand(s);
      const right = Math.abs(h.parts[0]) >= Math.abs(h.parts[1]) ? 'Hidden neuron 1' : 'Hidden neuron 2';
      const q = networkQuestions(s)[0];
      expect(q.options.find((o) => o.correct)!.text).toBe(right);
      for (const o of q.options) expect(o.feedback).toContain(fmt(h.parts[0], 3));
    }
  });
});

describe('Experiment 02: loss functions', () => {
  it('error, squares, sum, mean error and MSE agree with the formulas', () => {
    const p = [0.9, 0.2, 0.6, 0.4];
    const y = [1, 0, 1, 0];
    const r = mseBreakdown(p, y);
    const e = y.map((t, i) => t - p[i]);
    r.error.forEach((v, i) => close(v, e[i]));
    r.squared.forEach((v, i) => close(v, e[i] ** 2));
    close(
      r.sum[0],
      e.reduce((s, v) => s + v * v, 0),
    );
    close(r.meanError[0], e.reduce((s, v) => s + v, 0) / 4);
    close(r.mse[0], e.reduce((s, v) => s + v * v, 0) / 4);
    expect(mseBreakdown(y, y).mse[0]).toBe(0);
  });

  it('BCE is −[y log p + (1 − y) log(1 − p)] across (0, 1), for both targets', () => {
    for (let k = 1; k < 100; k++) {
      const p = k / 100;
      close(bce(p, 1), -Math.log(p), 1e-12);
      close(bce(p, 0), -Math.log(1 - p), 1e-12);
    }
  });

  it('squared error is (p − y)², and never exceeds 1 for p in [0, 1] (the claim in Part D)', () => {
    for (let k = 0; k <= 100; k++) {
      const p = k / 100;
      for (const y of [0, 1]) {
        close(squaredError(p, y), (p - y) ** 2);
        expect(squaredError(p, y)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('logit → sigmoid → probability → BCE matches the formulas, and the loss stops at −ln 10⁻⁷ (the clipping note)', () => {
    for (const z of [-3, -0.5, 0, 0.8, 4]) {
      const c = logitChain(z, 1);
      close(c.p, sigmoid(z));
      close(c.loss, -Math.log(sigmoid(z)), 1e-12);
    }
    close(logitChain(0, 1).p, 0.5);
    const edge = logitChain(20, 0);
    close(edge.loss, -Math.log(1e-7), 1e-6);
    expect(edge.loss).toBeCloseTo(16.118, 3);
  });

  it('its live question’s right answer is the engine’s MSE at the current predictions, not the defaults', () => {
    const y = L2_EXP02_DEFAULTS.batch.targets;
    for (const p of [L2_EXP02_DEFAULTS.batch.predictions, [0.1, 0.7, 0.95, 0.05]]) {
      const expected = y.reduce((s, t, i) => s + (t - p[i]) ** 2, 0) / 4;
      const q = mseQuestions(p, y)[0];
      expect(q.options.find((o) => o.correct)!.text).toBe(fmt(expected, 3));
      expect(new Set(q.options.map((o) => o.text)).size).toBe(q.options.length);
    }
  });
});

describe('Level 2 structure', () => {
  it('Stage 2 opens Experiments 01 and 02; each has objectives, a primer of 2–4 terms, a tour and 3–5 questions', () => {
    expect(LEVEL2_EXPERIMENTS.map((e) => e.id)).toEqual(['01', '02']);
    expect([...LEVEL_2.open]).toEqual(['01', '02']);
    for (const e of LEVEL2_EXPERIMENTS) {
      expect(e.objectives.length).toBeGreaterThan(0);
      expect(e.primer.terms.length).toBeGreaterThanOrEqual(2);
      expect(e.primer.terms.length).toBeLessThanOrEqual(4);
      expect(e.tour.length).toBeGreaterThan(2);
      expect(e.questions.length + 1).toBeGreaterThanOrEqual(3);
      expect(e.questions.length + 1).toBeLessThanOrEqual(5);
      for (const q of e.questions) expect(q.options.filter((o) => o.correct)).toHaveLength(1);
    }
  });

  it('routes and status keys: Level 2 has its own, and Level 1’s are unchanged', () => {
    expect(parseRoute('#/level-2')).toEqual({ page: 'level', level: 2 });
    expect(parseRoute('#/level-2/experiment-01')).toEqual({ page: 'experiment', level: 2, id: '01' });
    expect(parseRoute('#/level-1/experiment-03')).toEqual({ page: 'experiment', level: 1, id: '03' });
    expect(parseRoute('#/level-1')).toEqual({ page: 'level', level: 1 });
    expect(LEVEL_1.statusKey('01')).toBe('01');
    expect(LEVEL_2.statusKey('01')).toBe('l2:01');
    expect(LEVEL_1.experiments).toBe(LEVEL1_EXPERIMENTS);
  });
});
