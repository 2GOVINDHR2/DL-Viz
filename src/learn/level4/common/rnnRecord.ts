/**
 * One example's recurrent layer, read from the record by time step (Level 4, ADR-103). Every value is a recorded
 * instruction result; the layer's instructions carry `meta.step`, and within a step the recorded order is
 * SELECT_STEP, MATMUL (x·W), [STOP_GRADIENT], [MATMUL (h·U), ADD], ADD_BIAS, ACTIVATE (see layers/recurrent.ts).
 */
import type { Instruction } from '../../../core/npm/ir';
import type { CnnExample } from './cnnRecord';

export interface RnnStep {
  t: number;
  x: number[];
  select: Instruction;
  /** x_t·W */
  xw: Instruction;
  /** h_{t−1}·U (absent at step 1, where h₀ = 0) */
  hu: Instruction | null;
  stop: Instruction | null;
  /** x_t·W + h_{t−1}·U */
  sum: Instruction | null;
  /** … + b */
  z: Instruction;
  /** h_t = tanh(z) */
  h: Instruction;
  /** h_{t−1} as recorded (the previous step's ACTIVATE), null at step 1. */
  hPrev: number[] | null;
}

export const values = (i: Instruction | null | undefined): number[] =>
  i ? Array.from(Object.values(i.results)[0].data) : [];

export function rnnSteps(ex: CnnExample, layer = 'L1'): RnnStep[] {
  const ins = (ex.layers[layer] ?? []).filter((i) => i.meta.step !== undefined);
  const steps = [...new Set(ins.map((i) => Number(i.meta.step)))].sort((a, b) => a - b);
  const out: RnnStep[] = [];
  for (const t of steps) {
    const s = ins.filter((i) => Number(i.meta.step) === t);
    const mm = s.filter((i) => i.kind === 'MATMUL');
    const select = s.find((i) => i.kind === 'SELECT_STEP')!;
    const h = s.find((i) => i.kind === 'ACTIVATE')!;
    out.push({
      t,
      x: values(select),
      select,
      xw: mm[0],
      hu: mm[1] ?? null,
      stop: s.find((i) => i.kind === 'STOP_GRADIENT') ?? null,
      sum: s.find((i) => i.kind === 'ADD') ?? null,
      z: s.find((i) => i.kind === 'ADD_BIAS')!,
      h,
      hPrev: out.length ? values(out[out.length - 1].h) : null,
    });
  }
  return out;
}

/** One time step of the backward pass through a recurrent layer, from the record (Level 4, Experiment 04). */
export interface RnnBackStep {
  t: number;
  /** ∂ℓ/∂hₜ: the gradient arriving at hₜ (GRAD_ACTIVATE's upstream operand). */
  dh: number[];
  /** ∂ℓ/∂zₜ = ∂ℓ/∂hₜ ⊙ (1 − hₜ²) (GRAD_ACTIVATE). */
  dz: Instruction;
  /** This step's contribution to U's gradient, hₜ₋₁ᵀ·∂ℓ/∂zₜ (GRAD_MATMUL_W of the h·U product); none at step 1. */
  dU: Instruction | null;
  /** This step's contribution to W's gradient, xₜᵀ·∂ℓ/∂zₜ. */
  dW: Instruction;
  /** The gradient sent back to hₜ₋₁, ∂ℓ/∂zₜ·Uᵀ (GRAD_MATMUL_X); none at step 1, or where truncation cut it. */
  dhPrev: Instruction | null;
}

/** The backward-phase instructions of the example whose forward pass is `ex` (same epoch, batch and position). */
export async function readBackward(
  read: (a: number, b: number) => Promise<Instruction[]>,
  ex: CnnExample,
): Promise<Instruction[]> {
  const load = ex.instructions[0];
  const loss = ex.instructions[ex.instructions.length - 1];
  const out: Instruction[] = [];
  // The backward pass follows the loss directly; it ends where the next example (or the batch end) begins.
  for (let from = loss.id + 1; ; from += 400) {
    const chunk = await read(from, from + 400);
    for (const i of chunk) {
      if (
        i.path.sample !== load.path.sample ||
        i.path.batch !== load.path.batch ||
        i.path.epoch !== load.path.epoch
      )
        return out;
      out.push(i);
    }
    if (chunk.length < 400) return out;
  }
}

export function rnnBackSteps(back: readonly Instruction[], hidden: number, layer = 'L1'): RnnBackStep[] {
  const byId = new Map(back.map((i) => [i.id, i]));
  const at = (t: number) => back.filter((i) => i.path.layer === layer && Number(i.meta.step) === t);
  const steps = [
    ...new Set(
      back.filter((i) => i.path.layer === layer && i.meta.step !== undefined).map((i) => Number(i.meta.step)),
    ),
  ].sort((a, b) => b - a);
  return steps.flatMap((t) => {
    const s = at(t);
    const dz = s.find((i) => i.kind === 'GRAD_ACTIVATE');
    if (!dz) return [];
    const up = dz.operands.find((o) => o.role === 'upstream')!;
    const src = byId.get(up.ref);
    const mw = s.filter((i) => i.kind === 'GRAD_MATMUL_W');
    return [
      {
        t,
        dh: src ? Array.from(src.results[up.slot].data) : [],
        dz,
        dU: mw.find((i) => i.results.grad.size === hidden * hidden) ?? null,
        dW: mw.find((i) => i.results.grad.size !== hidden * hidden)!,
        dhPrev: s.find((i) => i.kind === 'GRAD_MATMUL_X') ?? null,
      },
    ];
  });
}

export const norm = (v: readonly number[]): number => Math.sqrt(v.reduce((a, x) => a + x * x, 0));
