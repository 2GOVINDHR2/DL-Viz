/**
 * Level 4 recurrent engine gate (ADR-102), run before any recurrent screen:
 *  R1 forward by hand: every recorded hidden state (and every LSTM/GRU gate) of an example, recomputed step by step
 *     from the recorded parameters and inputs, in time-step order;
 *  R2 TF.js parity: the per-example parameter gradients of RNN, LSTM and GRU against TF.js's own autodiff of the same
 *     cell (float32), from the same parameters and input;
 *  R3 shared-weight accumulation: a recurrent weight's GRAD_SUM is exactly the tape's per-example gradient, its
 *     operands are one GRAD_MATMUL_W per time step that used it, and its value is their sum;
 *  R4 shared parameter references: within an example, every use of a weight (every time step) references the same
 *     recorded value;
 *  R5 truncated BPTT: with window 1, the recurrent weight's gradient is exactly the full run's last-step contribution;
 *     STOP_GRADIENT is recorded where the chain is cut; window = T equals full BPTT; stopGradient blocks the gradient;
 *  R6 determinism and replay: identical regeneration, segments rebuilt from checkpoints identical, another seed
 *     differs;
 *  R7 every new trace conforms to the NPM grammar; GRAD_SUM never appears in a feed-forward trace.
 * Results are written to reports/level4-recurrent-gate.json.
 */
import * as tf from '@tensorflow/tfjs';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Tape, backward } from '../../src/core/autodiff';
import { resolveDataset } from '../../src/core/engine/host';
import type { DatasetSpec } from '../../src/core/engine/protocol';
import { TrainingSession, type TrainConfig } from '../../src/core/engine/session';
import { conformsToGrammar } from '../../src/core/npm/grammar';
import type { Instruction } from '../../src/core/npm/ir';
import { storeSource } from '../../src/core/npm/source';
import { TraceStore } from '../../src/core/npm/store';
import { Tensor } from '../../src/core/tensor/tensor';

const results: Record<string, unknown> = {};
afterAll(() =>
  writeFileSync(
    resolve(import.meta.dirname, '../../reports/level4-recurrent-gate.json'),
    JSON.stringify(results, null, 2) + '\n',
  ),
);
beforeAll(async () => {
  await tf.setBackend('cpu');
  await tf.ready();
});

const T = 5;
const DATA: DatasetSpec = { kind: 'sequence', task: 'first', n: 8, steps: T, seed: 3 };
const cfg = (kind: string, options: Record<string, number> = {}, seed = 1, epochs = 3): TrainConfig => ({
  seed,
  epochs,
  batchSize: 4,
  shuffle: false,
  loss: 'bce',
  optimizer: { type: 'adam', lr: 0.05, beta1: 0.9, beta2: 0.999, epsilon: 1e-8 },
  boundaryGrid: 0,
  model: {
    inputShape: [T, 1],
    layers: [
      { type: 'extension', kind, options: { hidden: 3, ...options } },
      { type: 'dense', units: 1, activation: 'sigmoid' },
    ],
  },
});
const record = (c: TrainConfig, budget?: number) => {
  const { store } = TraceStore.generate(c, resolveDataset(DATA), {
    embedDatasetLimit: 0,
    ...(budget ? { budgetBytes: budget } : {}),
  });
  const src = storeSource(store);
  return { store, src, header: store.header, all: src.range(0, src.length) };
};
const fingerprint = (ins: Instruction[]): string => {
  const h = createHash('sha256');
  for (const i of ins) {
    h.update(`${i.id}${i.kind}${JSON.stringify(i.meta)}${JSON.stringify(i.operands)}`);
    for (const [k, t] of Object.entries(i.results))
      h.update(k + Buffer.from(t.data.buffer).toString('base64'));
  }
  return h.digest('hex');
};
/** The first example's forward and backward instructions (epoch 1, batch 1, example 1). */
const firstExample = (all: Instruction[]) =>
  all.filter((i) => i.path.epoch === 0 && i.path.batch === 0 && i.path.sample === 0);
const initial = (all: Instruction[], name: string): number[] =>
  Array.from(all.find((i) => i.kind === 'INIT_PARAM' && i.meta.param === name)!.results.value.data);

// Small hand linear algebra on plain arrays (row vector times matrix).
const vm = (v: number[], m: number[], cols: number) =>
  Array.from({ length: cols }, (_, j) => v.reduce((s, x, i) => s + x * m[i * cols + j], 0));
const plus = (...vs: number[][]) => vs[0].map((_, j) => vs.reduce((s, v) => s + v[j], 0));
const times = (a: number[], b: number[]) => a.map((x, j) => x * b[j]);
const sig = (v: number[]) => v.map((x) => 1 / (1 + Math.exp(-x)));
const th = (v: number[]) => v.map(Math.tanh);
const near = (a: number[], b: number[], tol = 1e-12) =>
  a.forEach((x, j) => expect(Math.abs(x - b[j])).toBeLessThanOrEqual(tol));

describe('R1 forward by hand, step by step', () => {
  it('rnn: h_t = tanh(x_t W + h_{t−1} U + b) at every step, in time-step order', () => {
    const { all } = record(cfg('rnn'));
    const ex = firstExample(all);
    const x = Array.from(ex.find((i) => i.kind === 'LOAD_INPUT')!.results.x.data);
    const [W, U, b] = ['L1.W', 'L1.U', 'L1.b'].map((n) => initial(all, n));
    const hs = ex.filter((i) => i.kind === 'ACTIVATE' && i.path.layer === 'L1');
    expect(hs.map((i) => i.meta.step)).toEqual([1, 2, 3, 4, 5]);
    const sel = ex.filter((i) => i.kind === 'SELECT_STEP');
    expect(sel.map((i) => Array.from(i.results.out.data)[0])).toEqual(x);
    let h: number[] | null = null;
    for (let t = 0; t < T; t++) {
      const u = vm([x[t]], W, 3);
      h = th(plus(h ? plus(u, vm(h, U, 3)) : u, b));
      near(Array.from(hs[t].results.out.data), h);
    }
    results.R1 = { ...(results.R1 as object), rnn: 'every step equal to 1e-12' };
  });

  it('lstm: every gate, the cell state and the hidden state at every step', () => {
    const { all } = record(cfg('lstm'));
    const ex = firstExample(all);
    const x = Array.from(ex.find((i) => i.kind === 'LOAD_INPUT')!.results.x.data);
    const P = (n: string) => initial(all, `L1.${n}`);
    const at = (t: number, gate: string, kind: string) =>
      Array.from(
        ex.filter((i) => i.meta.step === t && i.meta.gate === gate && i.kind === kind).at(-1)!.results.out
          .data,
      );
    let h: number[] | null = null;
    let c: number[] | null = null;
    for (let t = 1; t <= T; t++) {
      const g = (k: string, act: (v: number[]) => number[]) => {
        const u = vm([x[t - 1]], P(`W${k}`), 3);
        return act(plus(h ? plus(u, vm(h, P(`U${k}`), 3)) : u, P(`b${k}`)));
      };
      const [f, i, cand, o] = [g('f', sig), g('i', sig), g('g', th), g('o', sig)];
      near(at(t, 'forget', 'ACTIVATE'), f);
      near(at(t, 'input', 'ACTIVATE'), i);
      near(at(t, 'candidate', 'ACTIVATE'), cand);
      near(at(t, 'output', 'ACTIVATE'), o);
      c = c ? plus(times(f, c), times(i, cand)) : times(i, cand);
      h = times(o, th(c));
      near(at(t, 'hidden', 'MULTIPLY'), h);
    }
    results.R1 = { ...(results.R1 as object), lstm: 'gates, cell and hidden state equal to 1e-12' };
  });

  it('gru: update and reset gates, candidate and hidden state at every step', () => {
    const { all } = record(cfg('gru'));
    const ex = firstExample(all);
    const x = Array.from(ex.find((i) => i.kind === 'LOAD_INPUT')!.results.x.data);
    const P = (n: string) => initial(all, `L1.${n}`);
    const last = (t: number, gate: string, kind: string) =>
      Array.from(
        ex.filter((i) => i.meta.step === t && i.meta.gate === gate && i.kind === kind).at(-1)!.results.out
          .data,
      );
    let h: number[] | null = null;
    for (let t = 1; t <= T; t++) {
      const xt = [x[t - 1]];
      const z = sig(plus(h ? plus(vm(xt, P('Wz'), 3), vm(h, P('Uz'), 3)) : vm(xt, P('Wz'), 3), P('bz')));
      near(last(t, 'update', 'ACTIVATE'), z);
      let n: number[];
      if (h) {
        const r = sig(plus(plus(vm(xt, P('Wr'), 3), vm(h, P('Ur'), 3)), P('br')));
        near(last(t, 'reset', 'ACTIVATE'), r);
        n = th(plus(plus(vm(xt, P('Wn'), 3), vm(times(r, h), P('Un'), 3)), P('bn')));
        h = plus(
          times(
            z.map((v) => 1 - v),
            n,
          ),
          times(z, h),
        );
      } else {
        n = th(plus(vm(xt, P('Wn'), 3), P('bn')));
        h = times(
          z.map((v) => 1 - v),
          n,
        );
      }
      near(last(t, 'candidate', 'ACTIVATE'), n);
      near(
        Array.from(
          ex
            .filter((i) => i.path.phase === 'forward' && i.meta.step === t && i.meta.gate === 'hidden')
            .at(-1)!.results.out.data,
        ),
        h,
      );
    }
    results.R1 = { ...(results.R1 as object), gru: 'gates, candidate and hidden state equal to 1e-12' };
  });
});

describe('R2 TF.js parity of the per-example gradients', () => {
  for (const kind of ['rnn', 'lstm', 'gru'] as const)
    it(`${kind}: every parameter's gradient against tf.grads of the same cell`, () => {
      const c = cfg(kind);
      const session = new TrainingSession(c, resolveDataset(DATA));
      const rec = session.runSample(0);
      const names = session.model.params.map((p) => p.name);
      const vals = names.map((n) => session.parameters().get(n)!);
      const x = Array.from(rec.x.data);
      const y = rec.y.data[0];
      const lossFn = (...ps: tf.Tensor[]) => {
        const P = (n: string) => ps[names.indexOf(n)] as tf.Tensor2D;
        const v = (n: string) => ps[names.indexOf(n)] as tf.Tensor1D;
        let h: tf.Tensor2D | null = null;
        let cs: tf.Tensor2D | null = null;
        for (let t = 0; t < T; t++) {
          const xt = tf.tensor2d([[x[t]]]);
          const lin = (k: string, hIn: tf.Tensor2D | null) => {
            const u = tf.matMul(xt, P(`L1.W${k}`));
            return tf.add(hIn ? tf.add(u, tf.matMul(hIn, P(`L1.U${k}`))) : u, v(`L1.b${k}`)) as tf.Tensor2D;
          };
          if (kind === 'rnn') h = tf.tanh(lin('', h));
          else if (kind === 'lstm') {
            const f = tf.sigmoid(lin('f', h));
            const i = tf.sigmoid(lin('i', h));
            const g = tf.tanh(lin('g', h));
            const o = tf.sigmoid(lin('o', h));
            cs = (cs ? tf.add(tf.mul(f, cs), tf.mul(i, g)) : tf.mul(i, g)) as tf.Tensor2D;
            h = tf.mul(o, tf.tanh(cs)) as tf.Tensor2D;
          } else {
            const z = tf.sigmoid(lin('z', h));
            if (h) {
              const r = tf.sigmoid(lin('r', h));
              const n = tf.tanh(lin('n', tf.mul(r, h) as tf.Tensor2D));
              h = tf.add(tf.mul(tf.sub(1, z), n), tf.mul(z, h)) as tf.Tensor2D;
            } else h = tf.mul(tf.sub(1, z), tf.tanh(lin('n', null))) as tf.Tensor2D;
          }
        }
        const p = tf.sigmoid(tf.add(tf.matMul(h!, P('L2.W')), v('L2.b')));
        const q = tf.clipByValue(p, 1e-7, 1 - 1e-7);
        return tf.neg(tf.add(tf.mul(y, tf.log(q)), tf.mul(1 - y, tf.log(tf.sub(1, q))))).mean() as tf.Scalar;
      };
      const tfVals = vals.map((t) => tf.tensor(Array.from(t.data), [...t.shape]));
      const grads = tf.grads(lossFn)(tfVals);
      let worst = 0;
      names.forEach((n, k) => {
        const ours = Array.from(rec.grads.get(n)!.data);
        const theirs = Array.from(grads[k].dataSync());
        ours.forEach((g, j) => (worst = Math.max(worst, Math.abs(g - theirs[j]))));
      });
      expect(worst).toBeLessThan(1e-5);
      results.R2 = { ...(results.R2 as object), [kind]: { params: names.length, maxAbsDiff: worst } };
    });
});

describe('R3–R4 shared weights across time', () => {
  it('rnn: the recurrent weight’s GRAD_SUM is exactly the tape’s per-example gradient, summed over its 4 uses', () => {
    const c = cfg('rnn');
    const { all } = record(c);
    const ex = firstExample(all);
    const byId = new Map(all.map((i) => [i.id, i]));
    const sumU = ex.find((i) => i.kind === 'GRAD_SUM' && i.meta.param === 'L1.U')!;
    const sumW = ex.find((i) => i.kind === 'GRAD_SUM' && i.meta.param === 'L1.W')!;
    expect(sumU.meta.uses).toBe(T - 1);
    expect(sumW.meta.uses).toBe(T);
    const parts = sumU.operands.map((o) => byId.get(o.ref)!);
    expect(parts.every((p) => p.kind === 'GRAD_MATMUL_W')).toBe(true);
    expect(parts.map((p) => p.meta.step).sort()).toEqual([2, 3, 4, 5]);
    const session = new TrainingSession(c, resolveDataset(DATA));
    const rec = session.runSample(0);
    expect(Array.from(sumU.results.grad.data)).toEqual(Array.from(rec.grads.get('L1.U')!.data));
    expect(Array.from(sumW.results.grad.data)).toEqual(Array.from(rec.grads.get('L1.W')!.data));
    const byHand = parts.reduce(
      (s, p) => s.map((v, j) => v + p.results.grad.data[j]),
      new Array<number>(9).fill(0),
    );
    near(Array.from(sumU.results.grad.data), byHand, 1e-15);
    // The batch's GRAD_ACCUMULATE averages the four examples' GRAD_SUMs.
    const acc = all.find((i) => i.kind === 'GRAD_ACCUMULATE' && i.meta.param === 'L1.U')!;
    expect(acc.operands.map((o) => byId.get(o.ref)!.kind)).toEqual([
      'GRAD_SUM',
      'GRAD_SUM',
      'GRAD_SUM',
      'GRAD_SUM',
    ]);
    results.R3 = { rnn: { uses: { U: T - 1, W: T }, equalToTape: true } };
  });

  it('lstm: a hidden state feeding four gates gets a GRAD_SUM of its four contributions', () => {
    const { all } = record(cfg('lstm'));
    const ex = firstExample(all);
    const sums = ex.filter((i) => i.kind === 'GRAD_SUM' && !i.meta.param);
    expect(sums.length).toBeGreaterThan(0);
    expect(sums.some((s) => s.meta.uses === 4)).toBe(true);
    for (const p of ['Wf', 'Uf', 'Wi', 'Ui', 'Wg', 'Ug', 'Wo', 'Uo'])
      expect(
        ex.some((i) => i.kind === 'GRAD_SUM' && i.meta.param === `L1.${p}`),
        p,
      ).toBe(true);
  });

  it('every use of a weight within an example references the same recorded value', () => {
    for (const kind of ['rnn', 'lstm', 'gru']) {
      const { all } = record(cfg(kind));
      const ex = all.filter((i) => i.path.epoch === 1 && i.path.batch === 1 && i.path.sample === 2);
      const uses = new Map<string, Set<string>>();
      for (const i of ex.filter((q) => q.kind === 'MATMUL' && q.path.layer === 'L1')) {
        const w = i.operands.find((o) => o.role === 'weight')!;
        const name = String(all[w.ref].meta.param);
        (uses.get(name) ?? uses.set(name, new Set()).get(name)!).add(`${w.ref}.${w.slot}`);
      }
      expect(uses.size).toBeGreaterThan(0);
      for (const [name, refs] of uses) expect(refs.size, `${kind} ${name}`).toBe(1);
    }
  });
});

describe('R5 truncated backpropagation through time', () => {
  it('window 1: the recurrent weight’s gradient is exactly the full run’s step-5 contribution; STOP_GRADIENT cuts every earlier step', () => {
    const full = firstExample(record(cfg('rnn')).all);
    const cut = firstExample(record(cfg('rnn', { window: 1 })).all);
    const lastFull = full.find(
      (i) =>
        i.kind === 'GRAD_MATMUL_W' &&
        i.meta.step === T &&
        i.path.layer === 'L1' &&
        i.operands.some(() => true) &&
        i.results.grad.size === 9,
    )!;
    const uCut = cut.filter((i) => i.kind === 'GRAD_MATMUL_W' && i.results.grad.size === 9);
    expect(uCut).toHaveLength(1);
    expect(Array.from(uCut[0].results.grad.data)).toEqual(Array.from(lastFull.results.grad.data));
    expect(cut.filter((i) => i.kind === 'STOP_GRADIENT').map((i) => i.meta.step)).toEqual([2, 3, 4, 5]);
    // The forward values are untouched by truncation.
    const h = (ins: Instruction[]) =>
      ins
        .filter((i) => i.kind === 'ACTIVATE' && i.path.layer === 'L1')
        .map((i) => Array.from(i.results.out.data));
    expect(h(cut)).toEqual(h(full));
    results.R5 = {
      window1: 'U gradient = full run’s last-step contribution',
      stopGradientSteps: [2, 3, 4, 5],
    };
  });

  it('window = T is full BPTT; stopGradient blocks the gradient on the tape', () => {
    const a = firstExample(record(cfg('rnn')).all).filter((i) => i.kind === 'GRAD_SUM');
    const b = firstExample(record(cfg('rnn', { window: T })).all).filter((i) => i.kind === 'GRAD_SUM');
    expect(b.map((i) => Array.from(i.results.grad.data))).toEqual(
      a.map((i) => Array.from(i.results.grad.data)),
    );
    const tape = new Tape();
    const v = tape.leaf(Tensor.from([2], [1, 2]), true);
    const out = tape.apply('sum', [tape.apply('mul', [tape.apply('stopGradient', [v]), v])]);
    const g = backward(tape, out).get(v.id)!;
    expect(Array.from(g.data)).toEqual([1, 2]); // only the unstopped factor contributes: ∂(s·v)/∂v = s
  });
});

describe('R6–R7 determinism, replay and grammar', () => {
  for (const [kind, options] of [
    ['rnn', {}],
    ['rnn', { window: 2 }],
    ['lstm', {}],
    ['gru', {}],
  ] as const)
    it(`${kind}${'window' in options ? ' (window 2)' : ''}: identical regeneration, segments rebuilt from checkpoints identical, grammar`, () => {
      const c = cfg(kind, options);
      const a = record(c);
      const b = record(c);
      expect(fingerprint(b.all)).toBe(fingerprint(a.all));
      const small = record(c, 1);
      const first = fingerprint(small.src.range(0, small.src.length));
      expect(fingerprint(small.src.range(0, small.src.length))).toBe(first);
      expect(first).toBe(fingerprint(a.all));
      expect(conformsToGrammar(a.all)).toBe(true);
      const other = record(cfg(kind, options, 2));
      expect(initial(other.all, 'L1.U' + (kind === 'rnn' ? '' : kind === 'lstm' ? 'f' : 'z'))).not.toEqual(
        initial(a.all, 'L1.U' + (kind === 'rnn' ? '' : kind === 'lstm' ? 'f' : 'z')),
      );
      results.R6 = {
        ...(results.R6 as object),
        [`${kind}${'window' in options ? '-window2' : ''}`]: {
          instructions: a.all.length,
          identical: true,
          grammar: true,
        },
      };
    });

  it('a feed-forward trace has no GRAD_SUM and no time steps', () => {
    const { all } = record({
      ...cfg('rnn'),
      model: {
        inputShape: [T, 1],
        layers: [{ type: 'flatten' }, { type: 'dense', units: 1, activation: 'sigmoid' }],
      },
    });
    expect(all.some((i) => i.kind === 'GRAD_SUM' || i.meta.step !== undefined)).toBe(false);
  });
});
