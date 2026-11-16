/**
 * Expressions evaluated by the engine's own operations (ADR-088, decision D3 of docs/LEVEL-2-ARCHITECTURE.md).
 *
 * `evaluate` gives a builder a real `Tape` from src/core/autodiff. Every value comes from a registered engine op
 * (`sub`, `square`, `mseLoss`, `sigmoid`, `bceLoss` …), exactly the code a training run uses. Nothing here computes
 * a value itself. These evaluations are not training runs, so they produce no NPM trace; screens label them
 * "computed by the engine's … operation", never as a recorded run.
 */
import { Tape, type Var } from '../../core/autodiff';
import { Tensor } from '../../core/tensor/tensor';

export interface ExprBuilder {
  tape: Tape;
  /** A constant input: a scalar, or a row of values. */
  input(v: number | number[], name?: string): Var;
  op(name: string, ...inputs: Var[]): Var;
}

const toTensor = (v: number | number[]): Tensor =>
  Array.isArray(v) ? Tensor.from([1, v.length], v) : Tensor.scalar(v);

/** Runs `build` on a fresh tape and returns the values of the Vars it names. */
export function evaluate<K extends string>(build: (b: ExprBuilder) => Record<K, Var>): Record<K, number[]> {
  const tape = new Tape();
  const b: ExprBuilder = {
    tape,
    input: (v, name) => {
      const t = toTensor(v);
      if (Array.from(t.data).some((x) => !Number.isFinite(x)))
        throw new Error('every input must be a finite number');
      return tape.leaf(t, false, name);
    },
    op: (name, ...inputs) => tape.apply(name, inputs),
  };
  const named = build(b);
  const out = {} as Record<K, number[]>;
  for (const k of Object.keys(named) as K[]) out[k] = Array.from(named[k].value.data);
  return out;
}

/** Squared error, MSE and the per-example terms, from the engine's `sub`, `square`, `mean` and `mseLoss`. */
export function mseBreakdown(predictions: number[], targets: number[]) {
  return evaluate((b) => {
    const p = b.input(predictions, 'ŷ');
    const y = b.input(targets, 'y');
    const error = b.op('sub', y, p);
    const squared = b.op('square', error);
    return {
      error,
      squared,
      sum: b.op('sum', squared),
      meanError: b.op('mean', error),
      mse: b.op('mseLoss', p, y),
    };
  });
}

/** Binary cross-entropy of a probability for a target, from the engine's `bceLoss` (probability clipped to [1e-7, 1 − 1e-7]). */
export function bce(p: number, y: number): number {
  return evaluate((b) => ({ loss: b.op('bceLoss', b.input(p), b.input(y)) })).loss[0];
}

/** Squared error of one prediction, from the engine's `mseLoss`. */
export function squaredError(p: number, y: number): number {
  return evaluate((b) => ({ loss: b.op('mseLoss', b.input(p), b.input(y)) })).loss[0];
}

/** Logit → sigmoid → probability → BCE, each step an engine op. */
export function logitChain(logit: number, y: number): { logit: number; p: number; loss: number } {
  const r = evaluate((b) => {
    const z = b.input(logit, 'z');
    const p = b.op('sigmoid', z);
    return { p, loss: b.op('bceLoss', p, b.input(y, 'y')) };
  });
  return { logit, p: r.p[0], loss: r.loss[0] };
}
