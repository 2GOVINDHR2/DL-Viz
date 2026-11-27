/**
 * Recurrent layers (Level 4, ADR-102), registered as extension layers. Each is built only from engine ops on the
 * autodiff tape, one time step after another, so the trace records every step of every time step and backpropagation
 * through time is the tape's ordinary backward pass:
 *  - the same parameter Vars are used at every step, so the tape adds their gradient contributions and the emitter
 *    records that sum as GRAD_SUM (a weight shared across time);
 *  - each operation carries `step` (1-based) and, in gated cells, `gate`, which the emitter copies into the trace.
 *
 * Input [T, F] per example; output: the last hidden state [H]. The initial state is zero, so the step-1 terms that
 * would multiply h₀ (or c₀) are omitted rather than computed as zero; the values are identical.
 *
 * Notation: W· multiplies the input x_t, U· the previous hidden state h_{t−1}, b· is a bias.
 *  - rnn:  h_t = tanh(x_t W + h_{t−1} U + b)
 *  - lstm: f, i, o = σ(x_t W· + h_{t−1} U· + b·), g = tanh(x_t Wg + h_{t−1} Ug + bg),
 *          c_t = f ⊙ c_{t−1} + i ⊙ g,  h_t = o ⊙ tanh(c_t)
 *  - gru:  z, r = σ(x_t W· + h_{t−1} U· + b·), n = tanh(x_t Wn + (r ⊙ h_{t−1}) Un + bn),
 *          h_t = (1 − z) ⊙ n + z ⊙ h_{t−1}
 *
 * `window` (rnn only, 0 = full): truncated backpropagation through time. Only the operations of the last `window`
 * time steps receive a gradient: the hidden state entering step t passes through STOP_GRADIENT when
 * t ≤ T − window + 1. Window 1 trains on the last step only; window T is full backpropagation through time. The
 * forward values are unchanged.
 */
import type { Tape, Var } from '../autodiff';
import { ShapeError } from '../tensor/tensor';
import { registerLayer, type LayerOptions } from './extensions';

const hiddenOf = (o: LayerOptions): number => {
  const h = Number(o.hidden);
  if (!Number.isInteger(h) || h < 1)
    throw new ShapeError('a recurrent layer needs a whole number of hidden units');
  return h;
};
const checkIn = (kind: string, inShape: readonly number[]): [number, number] => {
  if (inShape.length !== 2)
    throw new ShapeError(`${kind} needs a [time steps, features] input, got [${inShape}]`);
  return [inShape[0], inShape[1]];
};

type Gate = { name: string; key: string; act: 'sigmoid' | 'tanh' };
const LSTM_GATES: Gate[] = [
  { name: 'forget', key: 'f', act: 'sigmoid' },
  { name: 'input', key: 'i', act: 'sigmoid' },
  { name: 'candidate', key: 'g', act: 'tanh' },
  { name: 'output', key: 'o', act: 'sigmoid' },
];
const GRU_GATES: Gate[] = [
  { name: 'update', key: 'z', act: 'sigmoid' },
  { name: 'reset', key: 'r', act: 'sigmoid' },
  { name: 'candidate', key: 'n', act: 'tanh' },
];

function gateParams(gates: Gate[], f: number, h: number) {
  return gates.flatMap((g) => [
    { role: `W${g.key}`, shape: [f, h], init: 'glorotUniform' as const },
    { role: `U${g.key}`, shape: [h, h], init: 'glorotUniform' as const },
    { role: `b${g.key}`, shape: [h], init: 'zeros' as const },
  ]);
}

/** act(x_t W + hIn U + b) for one gate at one step; hIn is omitted at step 1 (h₀ = 0). */
function gate(
  tape: Tape,
  x: Var,
  hIn: Var | null,
  p: (role: string) => Var,
  g: Gate,
  meta: { layer: string; step: number },
): Var {
  const m = { ...meta, gate: g.name };
  let u = tape.apply('matmul', [x, p(`W${g.key}`)], {}, m);
  if (hIn) u = tape.apply('add', [u, tape.apply('matmul', [hIn, p(`U${g.key}`)], {}, m)], {}, m);
  return tape.apply(g.act, [tape.apply('addBias', [u, p(`b${g.key}`)], {}, m)], {}, m);
}

registerLayer({
  kind: 'rnn',
  outShape: (inShape, o) => (checkIn('rnn', inShape), [hiddenOf(o)]),
  params: (inShape, o) => {
    const [, f] = checkIn('rnn', inShape);
    const h = hiddenOf(o);
    return [
      { role: 'W', shape: [f, h], init: 'glorotUniform' },
      { role: 'U', shape: [h, h], init: 'glorotUniform' },
      { role: 'b', shape: [h], init: 'zeros' },
    ];
  },
  forward(tape, x, p, o, meta) {
    const steps = x.value.shape[1];
    const window = Number(o.window ?? 0);
    let h: Var | null = null;
    for (let t = 1; t <= steps; t++) {
      const m = { ...meta, step: t };
      const xt = tape.apply('timeStep', [x], { t: t - 1 }, m);
      let u = tape.apply('matmul', [xt, p('W')], {}, m);
      if (h) {
        const hIn = window > 0 && t <= steps - window + 1 ? tape.apply('stopGradient', [h], {}, m) : h;
        u = tape.apply('add', [u, tape.apply('matmul', [hIn, p('U')], {}, m)], {}, m);
      }
      h = tape.apply('tanh', [tape.apply('addBias', [u, p('b')], {}, m)], {}, m);
    }
    return h!;
  },
});

registerLayer({
  kind: 'lstm',
  outShape: (inShape, o) => (checkIn('lstm', inShape), [hiddenOf(o)]),
  params: (inShape, o) => gateParams(LSTM_GATES, checkIn('lstm', inShape)[1], hiddenOf(o)),
  forward(tape, x, p, _o, meta) {
    const steps = x.value.shape[1];
    let h: Var | null = null;
    let c: Var | null = null;
    for (let t = 1; t <= steps; t++) {
      const m = { ...meta, step: t };
      const xt = tape.apply('timeStep', [x], { t: t - 1 }, m);
      const [f, i, g, o] = LSTM_GATES.map((q) => gate(tape, xt, h, p, q, m));
      const ig = tape.apply('mul', [i, g], {}, { ...m, gate: 'cell' });
      c = c
        ? tape.apply(
            'add',
            [tape.apply('mul', [f, c], {}, { ...m, gate: 'cell' }), ig],
            {},
            { ...m, gate: 'cell' },
          )
        : ig;
      const tc = tape.apply('tanh', [c], {}, { ...m, gate: 'hidden' });
      h = tape.apply('mul', [o, tc], {}, { ...m, gate: 'hidden' });
    }
    return h!;
  },
});

registerLayer({
  kind: 'gru',
  outShape: (inShape, o) => (checkIn('gru', inShape), [hiddenOf(o)]),
  params: (inShape, o) => gateParams(GRU_GATES, checkIn('gru', inShape)[1], hiddenOf(o)),
  forward(tape, x, p, _o, meta) {
    const steps = x.value.shape[1];
    let h: Var | null = null;
    for (let t = 1; t <= steps; t++) {
      const m = { ...meta, step: t };
      const xt = tape.apply('timeStep', [x], { t: t - 1 }, m);
      const z = gate(tape, xt, h, p, GRU_GATES[0], m);
      const r = h ? gate(tape, xt, h, p, GRU_GATES[1], m) : null;
      const rh = h && r ? tape.apply('mul', [r, h], {}, { ...m, gate: 'reset' }) : null;
      const n = gate(tape, xt, rh, p, GRU_GATES[2], m);
      const keepNew = tape.apply(
        'mul',
        [tape.apply('oneMinus', [z], {}, { ...m, gate: 'hidden' }), n],
        {},
        { ...m, gate: 'hidden' },
      );
      h = h
        ? tape.apply(
            'add',
            [keepNew, tape.apply('mul', [z, h], {}, { ...m, gate: 'hidden' })],
            {},
            { ...m, gate: 'hidden' },
          )
        : keepNew;
    }
    return h!;
  },
});
