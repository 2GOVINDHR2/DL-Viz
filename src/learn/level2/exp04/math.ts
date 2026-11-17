/**
 * Experiment 04's values (ADR-092), all from the engine:
 *  - Part A: the chain y = σ(g), g = x². Each local rate and the full dy/dx come from the engine's backward pass on
 *    its tape (`withGradient`). Their product is the one multiplication done here, for display. It is shown beside
 *    the engine's own dy/dx, so the learner sees the chain rule hold.
 *  - Part B: one neuron's recorded backward pass (a probe run at learning rate 0: GRAD_INIT, GRAD_ACTIVATE,
 *    GRAD_MATMUL_W, GRAD_BIAS), with σ′(z) from the sigmoid op's registered rule.
 *  - Part C: a parameter's gradient explained from the reconstructed state at the cursor (state.ts): the incoming
 *    gradient ∂L/∂z and the input it multiplies, both recorded.
 */
import { getOp } from '../../../core/autodiff';
import type { ExecState } from '../../../core/npm/state';
import { Tensor } from '../../../core/tensor/tensor';
import { withGradient } from '../../engine/expr';
import { probe } from '../../engine/probe';

/** Part A: g = x², y = σ(g). */
export function chain(x: number) {
  const g = withGradient({ x }, (b, p) => b.op('square', p.x));
  const f = withGradient({ g: g.value }, (b, p) => b.op('sigmoid', p.g));
  const whole = withGradient({ x }, (b, p) => b.op('sigmoid', b.op('square', p.x)));
  return {
    g: g.value,
    y: whole.value,
    dgdx: g.grad.x,
    dydg: f.grad.g,
    dydx: whole.grad.x,
    product: f.grad.g * g.grad.x,
  };
}

/** σ′(z) for each z, from the sigmoid op's own backward rule with an incoming gradient of 1. */
export function sigmoidLocal(z: number[]): number[] {
  const t = Tensor.from([1, z.length], z);
  const out = getOp('sigmoid').forward([t], {}).value;
  const d = getOp('sigmoid').backward({
    grad: Tensor.full(t.shape, 1),
    inputs: [t],
    output: out,
    attrs: {},
    saved: undefined,
  })[0]!;
  return Array.from(d.data);
}

export interface NeuronBackward {
  z: number;
  a: number;
  loss: number;
  dLda: number;
  dLdz: number;
  dLdw: number;
  dLdb: number;
  local: number;
  /** Ids of the recorded instructions, in backward order. */
  ids: { init: number; activate: number; weight: number; bias: number };
}

/** Part B: one neuron, one example, forward and backward, read from a recorded run. */
export function neuronBackward(x: number, y: number, w: number, b: number): NeuronBackward {
  const r = probe({
    model: { inputShape: [1], layers: [{ type: 'dense', units: 1, activation: 'sigmoid' }] },
    params: { 'L1.W': [w], 'L1.b': [b] },
    xs: [[x]],
    ys: [[y]],
    loss: 'bce',
  });
  const e = r.examples[0];
  const find = (kind: string) => {
    const i = e.backward.find((q) => q.kind === kind);
    if (!i) throw new Error(`the record has no ${kind}`);
    return i;
  };
  const init = find('GRAD_INIT');
  const act = find('GRAD_ACTIVATE');
  const wt = find('GRAD_MATMUL_W');
  const bs = find('GRAD_BIAS');
  const z = e.layers.L1.z![0];
  return {
    z,
    a: e.layers.L1.a![0],
    loss: e.loss!,
    dLda: init.results.grad.data[0],
    dLdz: act.results.grad.data[0],
    dLdw: wt.results.grad.data[0],
    dLdb: bs.results.grad.data[0],
    local: sigmoidLocal([z])[0],
    ids: { init: init.id, activate: act.id, weight: wt.id, bias: bs.id },
  };
}

export type ParamRef =
  { layer: 'L1' | 'L2'; kind: 'W'; i: number; j: number } | { layer: 'L1' | 'L2'; kind: 'b'; j: number };

export const paramLabel = (p: ParamRef): string => {
  if (p.kind === 'b')
    return p.layer === 'L1' ? `bias of hidden neuron ${p.j + 1}` : 'bias of the output neuron';
  return p.layer === 'L1' ? `weight x${'₁₂'[p.i]} → hidden ${p.j + 1}` : `weight hidden ${p.i + 1} → output`;
};

export interface Decomposition {
  /** ∂L/∂z of the neuron the parameter feeds (recorded). */
  incoming: number;
  /** The local derivative: the weight's input (recorded), or 1 for a bias. */
  local: number;
  localName: string;
  /** incoming × local, multiplied here for display. */
  product: number;
  /** The engine's recorded gradient of the parameter. */
  recorded: number;
  /** For hidden-layer parameters: how ∂L/∂z¹ itself arose (∂L/∂a¹ recorded, σ′(z¹) from the op rule). */
  hidden?: { dLda: number; sigmaPrime: number; fromOutput: { weight: number; dLdz2: number } };
}

/**
 * A parameter's gradient explained from the state at the cursor; null until its gradient has been computed. The
 * output weights are read from the state too: with one update per example they change between examples, and within
 * an example the value before its update is the one the backward pass used.
 */
export function decompose(st: ExecState, p: ParamRef): Decomposition | null {
  const s = st.sample;
  if (!s) return null;
  const L = s.layers[p.layer];
  if (!L?.gradZ || !(p.kind === 'W' ? L.gradW : L.gradB)) return null;
  const incoming = L.gradZ.data[p.j];
  const nOut = p.layer === 'L1' ? 2 : 1;
  const input = p.kind === 'b' ? 1 : p.layer === 'L1' ? s.x.data[p.i] : s.layers.L1.a!.data[p.i];
  const recorded = p.kind === 'W' ? L.gradW!.data[p.i * nOut + p.j] : L.gradB!.data[p.j];
  const d: Decomposition = {
    incoming,
    local: input,
    localName:
      p.kind === 'b' ? '1 (a bias is added as it is)' : p.layer === 'L1' ? `x${'₁₂'[p.i]}` : `a¹${'₁₂'[p.i]}`,
    product: incoming * input,
    recorded,
  };
  if (p.layer === 'L1' && L.gradA && L.z) {
    // The output weight this example's backward pass used: once its update has been applied (APPLY_UPDATE of L2.W),
    // the current value is the new one, so the recorded value before the update is read instead.
    const w2 = st.updates['L2.W']?.before ?? st.params['L2.W'].value;
    d.hidden = {
      dLda: L.gradA.data[p.j],
      sigmaPrime: sigmoidLocal(Array.from(L.z.data))[p.j],
      fromOutput: { weight: w2.data[p.j], dLdz2: s.layers.L2.gradZ!.data[0] },
    };
  }
  return d;
}
