/**
 * Experiment 03's demonstrations (Parts A–D), computed by the engine (ADR-091):
 *  - values and derivatives on the engine's tape, by its own backward pass (`withGradient`);
 *  - gradient descent steps by the engine's own optimiser function (`computeUpdate` in src/core/optim/optim.ts, the
 *    function TrainingSession calls) and its tensor `add`.
 * These are demonstrations, not training runs: they make no NPM trace, and the screens say so. Part E records the
 * real run. Nothing here computes a value without engine code, except the geometry of drawing (tangent line ends).
 */
import { computeUpdate } from '../../../core/optim/optim';
import { add } from '../../../core/tensor/ops';
import { Tensor } from '../../../core/tensor/tensor';
import { L2_EXP03_DEFAULTS } from '../../../experiments/level2';
import { evaluate, withGradient } from '../../engine/expr';

const D = L2_EXP03_DEFAULTS;

/** f(x) = (x − 1)² + 0.5 and f′(x), on the engine's tape. */
export function parabola(x: number): { value: number; slope: number } {
  const r = withGradient({ x }, (b, p) =>
    b.op('add', b.op('square', b.op('sub', p.x, b.input(1))), b.input(0.5)),
  );
  return { value: r.value, slope: r.grad.x };
}

/** The neuron's loss L(w, b): mean binary cross-entropy over the four examples, and ∂L/∂w, ∂L/∂b. */
export function neuronLoss(w: number, b: number): { value: number; dw: number; db: number } {
  const r = withGradient({ w, b }, (e, p) => {
    const z = e.op('add', e.op('mul', e.input(D.xs), p.w), p.b);
    return e.op('bceLoss', e.op('sigmoid', z), e.input(D.ys));
  });
  return { value: r.value, dw: r.grad.w, db: r.grad.b };
}

/** One gradient descent step by the engine's optimiser: Δ = −η·g, then θ + Δ. */
export function engineStep(theta: number[], grad: number[], lr: number): { delta: number[]; next: number[] } {
  const g = Tensor.from([grad.length], grad);
  const { delta } = computeUpdate({ type: 'sgd', lr }, g, null);
  const next = add(Tensor.from([theta.length], theta), delta);
  return { delta: Array.from(delta.data), next: Array.from(next.data) };
}

export interface PathPoint {
  x: number;
  value: number;
  slope: number;
}

/** Gradient descent on the parabola from x₀, every step from the engine. Stops early if the values blow up. */
export function parabolaDescent(x0: number, lr: number, steps: number): PathPoint[] {
  const out: PathPoint[] = [];
  let x = x0;
  for (let k = 0; k <= steps; k++) {
    const f = parabola(x);
    out.push({ x, value: f.value, slope: f.slope });
    if (!Number.isFinite(f.value) || Math.abs(x) > 1e6) break;
    x = engineStep([x], [f.slope], lr).next[0];
  }
  return out;
}

export interface LandscapeGrid {
  resolution: number;
  bounds: [number, number, number, number];
  values: number[];
}

/** L(w, b) on a grid over w and b (row = b, from its low end), each value from the engine's ops. */
export function landscape(
  bounds: [number, number, number, number] = [-3, 3, -3, 3],
  resolution = 41,
): LandscapeGrid {
  const values: number[] = [];
  for (let r = 0; r < resolution; r++) {
    const b = bounds[2] + ((bounds[3] - bounds[2]) * (r + 0.5)) / resolution;
    for (let c = 0; c < resolution; c++) {
      const w = bounds[0] + ((bounds[1] - bounds[0]) * (c + 0.5)) / resolution;
      values.push(
        evaluate((e) => ({
          l: e.op(
            'bceLoss',
            e.op('sigmoid', e.op('add', e.op('mul', e.input(D.xs), e.input(w)), e.input(b))),
            e.input(D.ys),
          ),
        })).l[0],
      );
    }
  }
  return { resolution, bounds, values };
}
