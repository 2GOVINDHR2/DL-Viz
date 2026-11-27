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
