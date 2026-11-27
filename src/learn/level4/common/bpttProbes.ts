/**
 * Engine probes for Experiment 04 (ADR-103): a recurrent layer of 2 hidden units with weights given here, run once by
 * the engine on one sequence (η = 0). The gradient sizes and the steps that receive a gradient are read from the
 * probe's recorded backward pass, never computed here.
 */
import type { ModelConfig } from '../../../core/layers/model';
import { tryProbe } from '../../engine/probe';

const T = 8;
const model = (window: number): ModelConfig => {
  const options: Record<string, number> = { hidden: 2 };
  if (window) options.window = window;
  return {
    inputShape: [T, 1],
    layers: [
      { type: 'extension', kind: 'rnn', options },
      { type: 'dense', units: 1, activation: 'linear' },
    ],
  };
};
const params = (s: number) => ({
  'L1.W': [1, 0.5],
  'L1.U': [s, 0, 0, s],
  'L1.b': [0, 0],
  'L2.W': [1, 1],
  'L2.b': [0],
});

/** ‖∂ℓ/∂zₜ‖ at every time step (8 … 1) for U = s·I and the input x₁ = x0 (the other inputs 0). */
export function gradientSizes(
  s: number,
  x0: number,
): { sizes: { t: number; size: number }[]; length: number } | { error: string } {
  const r = tryProbe({
    model: model(0),
    params: params(s),
    xs: [[x0, 0, 0, 0, 0, 0, 0, 0]],
    ys: [[1]],
  });
  if (!r.result) return { error: r.error };
  const sizes = r.result.examples[0].backward
    .filter((i) => i.kind === 'GRAD_ACTIVATE' && i.meta.step !== undefined)
    .map((i) => ({ t: Number(i.meta.step), size: Math.hypot(...Array.from(i.results.grad.data)) }));
  return { sizes, length: r.result.length };
}

/** With truncation window k (0 = full): the time steps whose U receives a contribution, and where the chain is cut. */
export function truncationProbe(
  window: number,
): { uSteps: number[]; cutSteps: number[]; length: number } | { error: string } {
  const r = tryProbe({
    model: model(window),
    params: params(0.8),
    xs: [[0.5, -0.3, 0.2, 0.1, -0.4, 0.3, -0.2, 0.6]],
    ys: [[1]],
  });
  if (!r.result) return { error: r.error };
  const ex = r.result.examples[0];
  return {
    uSteps: ex.backward
      .filter((i) => i.kind === 'GRAD_MATMUL_W' && i.results.grad.size === 4)
      .map((i) => Number(i.meta.step))
      .sort((a, b) => a - b),
    cutSteps: ex.instructions.filter((i) => i.kind === 'STOP_GRADIENT').map((i) => Number(i.meta.step)),
    length: r.result.length,
  };
}
