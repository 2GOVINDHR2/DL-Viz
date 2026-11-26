/**
 * Optimisers.
 *
 * - SGD:       Δ = −η·g
 * - Momentum:  the accumulator form shared by TF.js and PyTorch, v ← μ·v + g, Δ = −η·v, which equals the "velocity"
 *              form v ← μ·v − η·g for a constant learning rate.
 * - Adam (Kingma & Ba 2015, as in TF.js `tf.train.adam`): m ← β₁m + (1−β₁)g, v ← β₂v + (1−β₂)g²,
 *              m̂ = m/(1−β₁ᵗ), v̂ = v/(1−β₂ᵗ), Δ = −η·m̂/(√v̂ + ε), with t the step number (1 at the first update).
 *
 * L2 weight decay (Level 3, ADR-098) is not part of the optimiser: the session adds λ·w to a weight's gradient
 * before calling `computeUpdate`, so every optimiser receives the regularised gradient.
 */
import { add, div, map, mul, scale } from '../tensor/ops';
import { Tensor } from '../tensor/tensor';

interface Common {
  lr: number;
  /** L2 weight decay λ: the gradient of (λ/2)·‖W‖² is added to every weight's gradient (not to biases). */
  weightDecay?: number;
}

export type OptimizerConfig =
  | ({ type: 'sgd' } & Common)
  | ({ type: 'momentum'; momentum: number } & Common)
  | ({ type: 'adam'; beta1: number; beta2: number; epsilon: number } & Common);

/** Adam's state for one parameter: the two moment estimates and the number of steps taken. */
export interface AdamState {
  m: Tensor;
  v: Tensor;
  t: number;
}

/** Optimiser state for one parameter: momentum's velocity, Adam's moments, or nothing for SGD. */
export type OptState = Tensor | AdamState | null;

export const isAdamState = (s: OptState): s is AdamState => s !== null && !(s instanceof Tensor);

export interface UpdateResult {
  /** Optimiser state after this step (velocity for momentum, moments for Adam), or null for plain SGD. */
  state: OptState;
  delta: Tensor;
  /** Adam only: the bias-corrected moments used for this step. */
  corrected?: { mHat: Tensor; vHat: Tensor };
}

export function validateOptimizer(opt: OptimizerConfig): void {
  const bad = (m: string): never => {
    throw new Error(`optimizer: ${m}`);
  };
  // 0 is allowed: engine probes run at η = 0 so that parameters stay exactly as set (ADR-082).
  if (!Number.isFinite(opt.lr) || opt.lr < 0) bad('the learning rate must be a non-negative number');
  if (opt.weightDecay !== undefined && (!Number.isFinite(opt.weightDecay) || opt.weightDecay < 0))
    bad('weight decay must be a non-negative number');
  if (opt.type === 'momentum' && !(opt.momentum >= 0 && opt.momentum < 1)) bad('momentum must be in [0, 1)');
  if (opt.type === 'adam') {
    if (!(opt.beta1 >= 0 && opt.beta1 < 1)) bad('β₁ must be in [0, 1)');
    if (!(opt.beta2 >= 0 && opt.beta2 < 1)) bad('β₂ must be in [0, 1)');
    if (!(opt.epsilon > 0)) bad('ε must be positive');
  }
}

export function computeUpdate(opt: OptimizerConfig, grad: Tensor, state: OptState): UpdateResult {
  switch (opt.type) {
    case 'sgd':
      return { state: null, delta: scale(grad, -opt.lr) };
    case 'momentum': {
      const prev = state instanceof Tensor ? state : Tensor.zeros(grad.shape);
      const v = add(scale(prev, opt.momentum), grad);
      return { state: v, delta: scale(v, -opt.lr) };
    }
    case 'adam': {
      const prev = isAdamState(state)
        ? state
        : { m: Tensor.zeros(grad.shape), v: Tensor.zeros(grad.shape), t: 0 };
      const t = prev.t + 1;
      const m = add(scale(prev.m, opt.beta1), scale(grad, 1 - opt.beta1));
      const v = add(scale(prev.v, opt.beta2), scale(mul(grad, grad), 1 - opt.beta2));
      const mHat = scale(m, 1 / (1 - opt.beta1 ** t));
      const vHat = scale(v, 1 / (1 - opt.beta2 ** t));
      const delta = scale(
        div(
          mHat,
          map(vHat, (x) => Math.sqrt(x) + opt.epsilon),
        ),
        -opt.lr,
      );
      return { state: { m, v, t }, delta, corrected: { mHat, vHat } };
    }
  }
}
