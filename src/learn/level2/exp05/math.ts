/**
 * Experiment 05's values (ADR-094), all from the engine:
 *  - Parts A–D: expressions run on the engine's tape and read back by `expressionGraph` (src/learn/engine/graph.ts).
 *    The forward values are the tape's; the reverse pass is `backward`'s own report; the finite differences are two
 *    engine evaluations each, divided here and labelled so.
 *  - Part E: how many parameter values a network has (its built model) and what one recorded backward pass produces
 *    (a probe run's GRAD_* instructions). The forward-mode side is an illustration (decision D2).
 *  - Part F: one recorded training run of Experiment 04's network, read by `exampleGraph`.
 */
import { resolveDataset } from '../../../core/engine/host';
import { buildModel, type ModelConfig } from '../../../core/layers/model';
import type { Instruction } from '../../../core/npm/ir';
import { storeSource } from '../../../core/npm/source';
import { TraceStore } from '../../../core/npm/store';
import type { ExprBuild, ExprGraph } from '../../engine/graph';
import { runProbe } from '../../engine/probe';
import { networkConfig } from '../exp04/Experiment04';

export type X3 = 'x₁' | 'x₂' | 'x₃';

export const EXPRESSIONS: Record<'product' | 'sigmoid', { label: string; build: ExprBuild<X3> }> = {
  product: {
    label: '(x₁ + x₂) · x₃',
    build: (op, x) => op('mul', op('add', x['x₁'], x['x₂']), x['x₃']),
  },
  sigmoid: {
    label: 'σ((x₁ + x₂) · x₃)',
    build: (op, x) => op('sigmoid', op('mul', op('add', x['x₁'], x['x₂']), x['x₃'])),
  },
};

/** Part D: x is used twice, once by the multiply and once by the add. */
export const SHARED: { label: string; build: ExprBuild<'x' | 'y'> } = {
  label: 'x · y + x',
  build: (op, v) => op('add', op('mul', v.x, v.y), v.x),
};

/**
 * The stepper's positions over one expression: 0 to F show the forward pass (inputs, then one more operation each);
 * F + 1 seeds the reverse pass (∂f/∂f = 1 at the output); F + 1 + k shows the first k reverse steps.
 */
export interface Stage {
  /** How many operation nodes have their value (inputs always do). */
  forward: number;
  /** -1 before the reverse pass; 0 at the seed; k after k reverse steps. */
  reverse: number;
  phase: 'forward' | 'seed' | 'reverse';
}

export const positions = (g: ExprGraph): number =>
  g.nodes.filter((n) => n.kind === 'op').length + g.reverse.length + 2;

export function stageAt(g: ExprGraph, pos: number): Stage {
  const F = g.nodes.filter((n) => n.kind === 'op').length;
  const p = Math.max(0, Math.min(pos, positions(g) - 1));
  if (p <= F) return { forward: p, reverse: -1, phase: 'forward' };
  if (p === F + 1) return { forward: F, reverse: 0, phase: 'seed' };
  return { forward: F, reverse: p - F - 1, phase: 'reverse' };
}

/**
 * Which gradients are known after `reverse` steps: the output's from the seed, any other node's once the last step
 * that contributes to it has run. The value is always `backward`'s own final gradient.
 */
export function knownGradients(g: ExprGraph, reverse: number): Map<number, number> {
  const known = new Map<number, number>();
  if (reverse < 0) return known;
  known.set(g.output, g.grads[g.output]);
  const lastStep = new Map<number, number>();
  g.reverse.forEach((r, k) => r.contributions.forEach((c) => lastStep.set(c.to, k)));
  for (const [node, k] of lastStep)
    if (k < reverse && g.grads[node] !== undefined) known.set(node, g.grads[node]);
  return known;
}

// ---------------------------------------------------------------- Part E

export const MODE_NETWORKS: { id: string; label: string; model: ModelConfig }[] = [
  {
    id: '2-2-1',
    label: '2-2-1 (Experiment 04)',
    model: {
      inputShape: [2],
      layers: [
        { type: 'dense', units: 2, activation: 'sigmoid' },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
    },
  },
  {
    id: '2-3-1',
    label: '2-3-1',
    model: {
      inputShape: [2],
      layers: [
        { type: 'dense', units: 3, activation: 'tanh' },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
    },
  },
  {
    id: '2-16-16-1',
    label: '2-16-16-1',
    model: {
      inputShape: [2],
      layers: [
        { type: 'dense', units: 16, activation: 'tanh' },
        { type: 'dense', units: 16, activation: 'tanh' },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
    },
  },
];

export interface ModeCounts {
  /** Trainable values in the model (from the engine's built model). */
  parameters: number;
  /** Backward passes recorded for one example (GRAD_INIT instructions). */
  backwardPasses: number;
  /** Gradient values those passes produced (GRAD_MATMUL_W and GRAD_BIAS results). */
  gradientValues: number;
}

/** Counts from the engine: the model's parameters, and one example's recorded backward pass. */
export function modeCounts(model: ModelConfig): ModeCounts {
  const built = buildModel(model);
  const params = Object.fromEntries(
    built.params.map((p) => [p.name, Array(p.shape.reduce((a, b) => a * b, 1)).fill(0.1)]),
  );
  const r = runProbe({ model, params, xs: [[0.5, -0.5]], ys: [[1]], loss: 'bce' });
  const back = r.examples[0].backward;
  return {
    parameters: built.params.reduce((t, p) => t + p.shape.reduce((a, b) => a * b, 1), 0),
    backwardPasses: back.filter((i) => i.kind === 'GRAD_INIT').length,
    gradientValues: back
      .filter((i) => i.kind === 'GRAD_MATMUL_W' || i.kind === 'GRAD_BIAS')
      .reduce((t, i) => t + i.results.grad.size, 0),
  };
}

// ---------------------------------------------------------------- Part F

let recorded: Instruction[] | null = null;

/** One epoch of Experiment 04's network on XOR, recorded by the engine (148 instructions, made once). */
export function recordedRun(): Instruction[] {
  if (!recorded) {
    const { store } = TraceStore.generate(
      { ...networkConfig(), epochs: 1 },
      resolveDataset({ kind: 'xor' }),
      { embedDatasetLimit: 0 },
    );
    const src = storeSource(store);
    recorded = src.range(0, src.length);
  }
  return recorded;
}

/** A node's short name, from the instruction's own symbolic form (the part before "=", "~" or "←"). */
export function nodeName(i: Instruction): string {
  if (i.kind === 'LOAD_INPUT') return 'x, y';
  return i.symbolic.split(/ = | ~ | ← /)[0].trim();
}
