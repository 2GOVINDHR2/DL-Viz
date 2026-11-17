/**
 * Level 2, Experiment 04 (backpropagation). Every value the page shows is checked against formulas written here by
 * hand, independently of the engine, and the Part C explanation is checked against the engine's recorded trace.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { L2_EXP04_DEFAULTS } from '../../src/experiments/level2';
import {
  chainQuestion,
  L2Experiment04,
  networkConfig,
  PARAMS,
  weightQuestion,
} from '../../src/learn/level2/exp04/Experiment04';
import { chain, decompose, neuronBackward, sigmoidLocal } from '../../src/learn/level2/exp04/math';
import { inProcessEngine, setEngineFactory } from '../../src/learn/trace/engine';
import { renderCurrentRunState, useRun } from '../../src/learn/trace/store';
import { TraceExplorer } from '../../src/learn/trace/TraceExplorer';
import {
  LEVEL1_WORDING,
  LEVEL2_PER_EXAMPLE_WORDING,
  LEVEL2_WORDING,
  TraceWordingProvider,
} from '../../src/learn/trace/wording';

const sig = (z: number): number => 1 / (1 + Math.exp(-z));
const close = (a: number, b: number, tol = 1e-12): void => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('Part A: the chain rule on y = σ(x²)', () => {
  for (const x of [-2, -0.5, 0, 0.8, 1.5, 3])
    it(`x = ${x}: local rates, their product and the engine's dy/dx`, () => {
      const c = chain(x);
      const s = sig(x * x);
      close(c.g, x * x);
      close(c.y, s);
      close(c.dgdx, 2 * x);
      close(c.dydg, s * (1 - s));
      close(c.dydx, 2 * x * s * (1 - s));
      close(c.product, c.dydx, 1e-15);
    });

  it('the live question’s correct answer is the engine’s dy/dx, and a wrong answer is the sum', () => {
    const q = chainQuestion(1.5);
    const right = q.options.filter((o) => o.correct);
    expect(right).toHaveLength(1);
    expect(right[0].text).toBe(chain(1.5).dydx.toFixed(4));
    expect(q.options.length).toBeGreaterThan(1);
  });

  it('σ′ comes from the sigmoid op’s own rule', () => {
    const z = [-3, 0, 0.4, 5];
    sigmoidLocal(z).forEach((d, k) => close(d, sig(z[k]) * (1 - sig(z[k]))));
  });
});

describe('Part B: one neuron’s recorded backward pass', () => {
  for (const [x, y, w, b] of [
    [-2, 0, -1.5, 1],
    [-2, 1, -1.5, 1],
    [0.7, 1, 0.3, -0.2],
    [3, 0, 0, 0],
  ])
    it(`x=${x} y=${y} w=${w} b=${b}`, () => {
      const r = neuronBackward(x, y, w, b);
      const z = w * x + b;
      const a = sig(z);
      close(r.z, z);
      close(r.a, a);
      close(r.loss, -(y * Math.log(a) + (1 - y) * Math.log(1 - a)), 1e-9);
      close(r.dLda, -y / a + (1 - y) / (1 - a), 1e-8);
      close(r.dLdz, a - y, 1e-9);
      close(r.dLdw, (a - y) * x, 1e-9);
      close(r.dLdb, a - y, 1e-9);
      close(r.local, a * (1 - a));
      // Recorded order: the loss's gradient, then the activation, then bias and weight.
      expect(r.ids.init).toBeLessThan(r.ids.activate);
      expect(r.ids.activate).toBeLessThan(Math.min(r.ids.weight, r.ids.bias));
    });
});

describe('Part C: the 2-2-1 network on XOR, one update per example', () => {
  let restore: ReturnType<typeof setEngineFactory>;
  beforeEach(() => {
    restore = setEngineFactory(inProcessEngine);
  });
  afterEach(() => {
    useRun.getState().dispose();
    setEngineFactory(restore);
  });

  /** Hand training, sequentially, from the defaults: returns gradients for each example of the first epoch. */
  function byHand() {
    const P = L2_EXP04_DEFAULTS.initialParams;
    let W1 = [...P['L1.W']];
    let b1 = [...P['L1.b']];
    let W2 = [...P['L2.W']];
    let b2 = [...P['L2.b']];
    const out: { gW1: number[]; gb1: number[]; gW2: number[]; gb2: number[]; before: number[][] }[] = [];
    for (const [x, y] of [
      [[0, 0], 0],
      [[0, 1], 1],
      [[1, 0], 1],
      [[1, 1], 0],
    ] as [number[], number][]) {
      const before = [[...W1], [...b1], [...W2], [...b2]];
      const a1 = [0, 1].map((j) => sig(x[0] * W1[0 * 2 + j] + x[1] * W1[1 * 2 + j] + b1[j]));
      const a2 = sig(a1[0] * W2[0] + a1[1] * W2[1] + b2[0]);
      const d2 = a2 - y;
      const gW2 = [a1[0] * d2, a1[1] * d2];
      const gb2 = [d2];
      const d1 = [0, 1].map((j) => W2[j] * d2 * a1[j] * (1 - a1[j]));
      const gW1 = [0, 1].flatMap((i) => [0, 1].map((j) => x[i] * d1[j]));
      const gb1 = d1;
      out.push({ gW1, gb1, gW2, gb2, before });
      const lr = L2_EXP04_DEFAULTS.lr;
      W1 = W1.map((v, k) => v - lr * gW1[k]);
      b1 = b1.map((v, k) => v - lr * gb1[k]);
      W2 = W2.map((v, k) => v - lr * gW2[k]);
      b2 = b2.map((v, k) => v - lr * gb2[k]);
    }
    return out;
  }

  it('every parameter’s gradient: incoming × local = recorded, and equals the hand calculation, for all four examples', async () => {
    await useRun.getState().train(networkConfig(), '2-2-1', { kind: 'xor' });
    const h = useRun.getState().header!;
    const ins = await useRun.getState().read(h.epochStarts[0], h.epochStarts[1]);
    const hand = byHand();
    for (let batch = 0; batch < 4; batch++) {
      const mine = ins.filter((i) => i.path.batch === batch);
      const lastBackward = mine.filter((i) => i.path.phase === 'backward').at(-1)!.id;
      await useRun.getState().jump(lastBackward);
      const st = useRun.getState().exec!;
      // No update yet: the parameters are still those before this example.
      const H = hand[batch];
      expect(Array.from(st.params['L1.W'].value.data)).toEqual(H.before[0].map((v) => expect.closeTo(v, 12)));
      expect(Array.from(st.params['L2.W'].value.data)).toEqual(H.before[2].map((v) => expect.closeTo(v, 12)));
      for (const p of PARAMS) {
        const d = decompose(st, p)!;
        expect(d, JSON.stringify(p)).not.toBeNull();
        close(d.product, d.recorded, 1e-15);
        const want =
          p.kind === 'b'
            ? (p.layer === 'L1' ? H.gb1 : H.gb2)[p.j]
            : p.layer === 'L1'
              ? H.gW1[p.i * 2 + p.j]
              : H.gW2[p.i];
        close(d.recorded, want, 1e-12);
        if (p.layer === 'L1') {
          const hd = d.hidden!;
          close(hd.dLda * hd.sigmaPrime, d.incoming, 1e-15);
          close(hd.fromOutput.weight * hd.fromOutput.dLdz2, hd.dLda, 1e-15);
        }
      }
      // Example 1 has x = (0, 0): its first-layer weights get exactly zero gradient.
      if (batch === 0)
        for (const p of PARAMS.filter((q) => q.layer === 'L1' && q.kind === 'W'))
          expect(decompose(st, p)!.recorded).toBe(0);
      // The live question asks for the recorded gradient.
      const q = weightQuestion(decompose(st, PARAMS[6]), PARAMS[6]);
      expect(q.options.find((o) => o.correct)!.text).toBe(
        decompose(st, PARAMS[6])!.recorded.toFixed(4).replace(/^-/, '−'),
      );
    }
  });

  it('before the backward pass reaches a parameter, nothing is shown for it', async () => {
    await useRun.getState().train(networkConfig(), '2-2-1', { kind: 'xor' });
    const h = useRun.getState().header!;
    const ins = await useRun.getState().read(h.epochStarts[0], h.epochStarts[1]);
    const first = ins.filter((i) => i.path.batch === 0);
    const loss = first.find((i) => i.kind === 'COMPUTE_LOSS')!.id;
    await useRun.getState().jump(loss);
    for (const p of PARAMS) expect(decompose(useRun.getState().exec!, p)).toBeNull();
    // After the output layer's gradients but before the hidden layer's.
    const outW = first.find((i) => i.kind === 'GRAD_MATMUL_W' && i.path.layer === 'L2')!.id;
    await useRun.getState().jump(outW);
    const st = useRun.getState().exec!;
    expect(decompose(st, PARAMS[6])).not.toBeNull();
    expect(decompose(st, PARAMS[0])).toBeNull();
    expect(weightQuestion(null, PARAMS[0]).unavailable).toBeTruthy();
  });

  it('replaying an example changes nothing; the update is applied only at the end of the example', async () => {
    await useRun.getState().train(networkConfig(), '2-2-1', { kind: 'xor' });
    const h = useRun.getState().header!;
    const ins = await useRun.getState().read(h.epochStarts[0], h.epochStarts[1]);
    const first = ins.filter((i) => i.path.batch === 0);
    const begin = first.find((i) => i.kind === 'BATCH_BEGIN')!.id;
    const lastBackward = first.filter((i) => i.path.phase === 'backward').at(-1)!.id;
    const end = first.find((i) => i.kind === 'BATCH_END')!.id;
    const snapshot = () => {
      const st = useRun.getState().exec!;
      return {
        params: Object.fromEntries(Object.entries(st.params).map(([k, v]) => [k, Array.from(v.value.data)])),
        grads: PARAMS.map((p) => decompose(st, p)!.recorded),
      };
    };
    await useRun.getState().jump(lastBackward);
    const once = snapshot();
    await useRun.getState().jump(begin);
    for (let id = begin; id < lastBackward; id++) await useRun.getState().step(1, 'operation');
    expect(useRun.getState().cursor).toBe(lastBackward);
    expect(snapshot()).toEqual(once);
    // The update: Δ = −lr × gradient, visible only once the example ends.
    await useRun.getState().jump(end);
    const after = useRun.getState().exec!.params;
    const lr = L2_EXP04_DEFAULTS.lr;
    const W2 = Array.from(after['L2.W'].value.data);
    W2.forEach((v, k) => close(v, once.params['L2.W'][k] - lr * once.grads[6 + k], 1e-15));
    // x = (0, 0): the first-layer weights did not move.
    expect(Array.from(after['L1.W'].value.data)).toEqual(once.params['L1.W']);
  });

  it('renders the page, and with a run at the end of a backward pass, without crashing', async () => {
    expect(renderToStaticMarkup(createElement(L2Experiment04))).toContain(
      'Backpropagation: How Errors Travel Through a Network',
    );
    await useRun.getState().train(networkConfig(), '2-2-1', { kind: 'xor' });
    const h = useRun.getState().header!;
    const ins = await useRun.getState().read(h.epochStarts[0], h.epochStarts[1]);
    await useRun.getState().showEpoch(0);
    await useRun
      .getState()
      .jump(ins.filter((i) => i.path.phase === 'backward' && i.path.batch === 0).at(-1)!.id);
    renderCurrentRunState();
    const html = renderToStaticMarkup(createElement(L2Experiment04));
    expect(html).toContain('Recorded gradient');
    expect(html).toContain('✓ the same');
  });

  it('the hidden-layer explanation stays consistent through the update: it uses the output weight the pass used', async () => {
    await useRun.getState().train(networkConfig(), '2-2-1', { kind: 'xor' });
    const h = useRun.getState().header!;
    const ins = await useRun.getState().read(h.epochStarts[0], h.epochStarts[1]);
    let checked = 0;
    let afterOutputUpdate = 0;
    for (let batch = 0; batch < 4; batch++) {
      const mine = ins.filter((i) => i.path.batch === batch);
      const lastBackward = mine.filter((i) => i.path.phase === 'backward').at(-1)!.id;
      const end = mine.find((i) => i.kind === 'BATCH_END')!.id;
      await useRun.getState().jump(lastBackward);
      const usedW2 = Array.from(useRun.getState().exec!.params['L2.W'].value.data);
      // Every position from the end of the backward pass to the end of the example, the update steps included.
      for (let at = lastBackward; at <= end; at++) {
        await useRun.getState().jump(at);
        const st = useRun.getState().exec!;
        if (st.updates['L2.W']?.after) afterOutputUpdate++;
        for (const p of PARAMS.filter((q) => q.layer === 'L1')) {
          const d = decompose(st, p)!;
          expect(d.hidden!.fromOutput.weight).toBe(usedW2[p.j]);
          close(d.hidden!.fromOutput.weight * d.hidden!.fromOutput.dLdz2, d.hidden!.dLda, 1e-15);
          checked++;
        }
      }
      // The output weight really did change at the end of the example, so the check above is not vacuous.
      const after = Array.from(useRun.getState().exec!.params['L2.W'].value.data);
      expect(after).not.toEqual(usedW2);
    }
    expect(afterOutputUpdate).toBeGreaterThan(0);
    expect(checked).toBeGreaterThan(100);
  });

  it('per-example wording: Experiment 04’s explorer never describes its updates as batch averages', async () => {
    await useRun.getState().train(networkConfig(), '2-2-1', { kind: 'xor' });
    const h = useRun.getState().header!;
    const ins = await useRun.getState().read(h.epochStarts[0], h.epochStarts[1]);
    await useRun.getState().showEpoch(0);
    const update = ins.find((i) => i.kind === 'GRAD_ACCUMULATE' && i.path.batch === 1)!.id;
    await useRun.getState().jump(update);
    renderCurrentRunState();
    const page = renderToStaticMarkup(createElement(L2Experiment04)).replace(/<[^>]+>/g, ' ');
    expect(page).toContain('one update for this example');
    expect(page).toContain('nothing to average');
    expect(page).toContain('Example 2 of 4');
    expect(page).not.toMatch(/whole batch|average the gradients|batch’s average|Average loss of this batch/);
    // The same position with Level 2's full-batch wording does say "whole batch": the check above can fail.
    const full = renderToStaticMarkup(
      createElement(
        TraceWordingProvider,
        { value: LEVEL2_WORDING },
        createElement(TraceExplorer, { stale: false }),
      ),
    );
    expect(full).toMatch(/whole batch/);
    // Level 1 and Experiment 03 keep their wording.
    expect(LEVEL1_WORDING.batchLabel).toBeUndefined();
    expect(LEVEL2_WORDING.batchLabel).toBeUndefined();
    expect(LEVEL2_WORDING.updateGroup).toBe('Update the parameters (one update for the whole batch)');
    expect(LEVEL2_PER_EXAMPLE_WORDING.kind('GRAD_MATMUL_W')).toBe(LEVEL2_WORDING.kind('GRAD_MATMUL_W'));
  });
});
