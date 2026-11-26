/**
 * Level 2, Experiment 05 (automatic differentiation). The stepper's timeline, what each position shows, the live
 * questions and the counts of Part E are checked against values worked out here by hand; Part F against the record.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { L2_EXP05_DEFAULTS } from '../../src/experiments/level2';
import { exampleGraph, expressionGraph } from '../../src/learn/engine/graph';
import { gradQuestion, L2Experiment05, sharedQuestion } from '../../src/learn/level2/exp05/Experiment05';
import {
  EXPRESSIONS,
  knownGradients,
  MODE_NETWORKS,
  modeCounts,
  nodeName,
  positions,
  recordedRun,
  SHARED,
  stageAt,
} from '../../src/learn/level2/exp05/math';

const sig = (z: number): number => 1 / (1 + Math.exp(-z));

describe('Parts A–C: the stepper over (x₁ + x₂)·x₃', () => {
  const x = L2_EXP05_DEFAULTS.product;
  const g = expressionGraph(x, EXPRESSIONS.product.build);

  it('has 2 forward steps, a seed and 2 reverse steps, in that order', () => {
    expect(positions(g)).toBe(6);
    expect([0, 1, 2, 3, 4, 5].map((p) => stageAt(g, p))).toEqual([
      { forward: 0, reverse: -1, phase: 'forward' },
      { forward: 1, reverse: -1, phase: 'forward' },
      { forward: 2, reverse: -1, phase: 'forward' },
      { forward: 2, reverse: 0, phase: 'seed' },
      { forward: 2, reverse: 1, phase: 'reverse' },
      { forward: 2, reverse: 2, phase: 'reverse' },
    ]);
    // Out-of-range positions are clamped.
    expect(stageAt(g, -3)).toEqual(stageAt(g, 0));
    expect(stageAt(g, 99)).toEqual(stageAt(g, 5));
  });

  it('a gradient is shown only once every contribution to it has arrived, and it is backward’s value', () => {
    // Node ids: x₁ 0, x₂ 1, x₃ 2, + 3, × 4.
    expect([...knownGradients(g, -1).keys()]).toEqual([]);
    expect(Object.fromEntries(knownGradients(g, 0))).toEqual({ 4: 1 });
    // After the multiply's step: the + node and x₃.
    expect(Object.fromEntries(knownGradients(g, 1))).toEqual({ 4: 1, 3: x['x₃'], 2: x['x₁'] + x['x₂'] });
    // After the add's step: x₁ and x₂ too.
    expect(Object.fromEntries(knownGradients(g, 2))).toEqual({
      4: 1,
      3: x['x₃'],
      2: x['x₁'] + x['x₂'],
      0: x['x₃'],
      1: x['x₃'],
    });
  });

  it('the sigmoid expression: gradients by hand', () => {
    const s = expressionGraph(x, EXPRESSIONS.sigmoid.build);
    const p = (x['x₁'] + x['x₂']) * x['x₃'];
    const d = sig(p) * (1 - sig(p));
    expect(s.nodes[s.output].value).toBeCloseTo(sig(p), 15);
    expect(s.grads[0]).toBeCloseTo(d * x['x₃'], 15);
    expect(s.grads[2]).toBeCloseTo(d * (x['x₁'] + x['x₂']), 15);
  });

  it('the live question’s correct answer is ∂f/∂x₃ from the reverse pass', () => {
    const q = gradQuestion(x, 'product');
    expect(q.options.filter((o) => o.correct).map((o) => o.text)).toEqual([(x['x₁'] + x['x₂']).toFixed(4)]);
    expect(gradQuestion({ ...x, 'x₁': Number.NaN }, 'product').unavailable).toBeTruthy();
  });
});

describe('Part D: x used twice in x·y + x', () => {
  it('x’s gradient appears only after both contributions; it is y + 1', () => {
    const v = { x: 2, y: 3 };
    const g = expressionGraph(v, SHARED.build);
    // Reverse step 1 is the add (sends 1 to x), step 2 the multiply (sends y to x).
    expect(knownGradients(g, 1).has(0)).toBe(false);
    expect(knownGradients(g, 2).get(0)).toBe(v.y + 1);
    expect(sharedQuestion(v).options.find((o) => o.correct)!.text).toBe((v.y + 1).toFixed(4));
  });

  it('with y = −1 the contributions cancel to exactly 0', () => {
    const g = expressionGraph({ x: 2, y: -1 }, SHARED.build);
    const parts = g.reverse.flatMap((r) => r.contributions.filter((c) => c.to === 0).map((c) => c.value));
    expect(parts).toEqual([1, -1]);
    expect(g.grads[0]).toBe(0);
  });
});

describe('Part E: counts from the engine', () => {
  // Parameter values by hand: inputs × units + units, layer by layer.
  const hand: Record<string, number> = {
    '2-2-1': 2 * 2 + 2 + 2 * 1 + 1,
    '2-3-1': 2 * 3 + 3 + 3 * 1 + 1,
    '2-16-16-1': 2 * 16 + 16 + 16 * 16 + 16 + 16 * 1 + 1,
  };
  for (const m of MODE_NETWORKS)
    it(`${m.id}: one backward pass gives a gradient for every one of its ${hand[m.id]} parameter values`, () => {
      const c = modeCounts(m.model);
      expect(c).toEqual({ parameters: hand[m.id], backwardPasses: 1, gradientValues: hand[m.id] });
    });
});

describe('Part F: the recorded run', () => {
  const all = recordedRun();

  it('is one epoch of Experiment 04’s network, and the same run every time', () => {
    expect(all).toHaveLength(148);
    expect(recordedRun()).toBe(all);
    expect(all.filter((i) => i.kind === 'BATCH_BEGIN')).toHaveLength(4);
  });

  it('names every node from its own symbolic form', () => {
    const g = exampleGraph(all, 0, 0);
    expect(g.sources.map(nodeName)).toEqual(['W¹', 'b¹', 'W²', 'b²']);
    expect(g.steps.map(nodeName)).toEqual([
      'x, y',
      'u¹',
      'z¹',
      'a¹',
      'u²',
      'z²',
      'a²',
      'ℓ',
      '∂ℓ/∂ŷ',
      '∂ℓ/∂z²',
      '∂ℓ/∂b²',
      '∂ℓ/∂W²',
      '∂ℓ/∂a¹',
      '∂ℓ/∂z¹',
      '∂ℓ/∂b¹',
      '∂ℓ/∂W¹',
    ]);
  });

  it('example 3 reads a first-layer weight that example 2’s update changed', () => {
    const g = exampleGraph(all, 0, 2);
    const w1 = g.sources.find((s) => s.meta.param === 'L1.W')!;
    expect(w1.kind).toBe('APPLY_UPDATE');
    expect(w1.path.batch).toBe(1);
    const start = all.find((i) => i.kind === 'INIT_PARAM' && i.meta.param === 'L1.W')!;
    expect(Array.from(w1.results.value.data)).not.toEqual(Array.from(start.results.value.data));
  });
});

describe('the page', () => {
  it('renders every part, labels the illustration, and marks engine values', () => {
    const html = renderToStaticMarkup(createElement(L2Experiment05));
    for (const t of [
      'A calculation as a graph',
      'Forwards, then in reverse',
      'Checking the gradients from outside',
      'A value used twice',
      'Forward mode and reverse mode',
      'The engine’s own graph',
    ])
      expect(html).toContain(t);
    expect(html).toContain('Illustration · the engine has no forward mode');
    expect(html).toContain('Read from a recorded training run');
    expect(html).toContain('Computed by the engine’s automatic differentiation');
  });
});
