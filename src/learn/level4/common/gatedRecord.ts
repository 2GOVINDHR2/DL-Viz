/**
 * One example's LSTM or GRU layer, read from the record by time step and gate (Level 4, Experiment 05; ADR-103).
 * Every value is a recorded instruction result, located by `meta.step`, `meta.gate` and kind (layers/recurrent.ts):
 *  - LSTM: ACTIVATE of forget / input / candidate / output; the cell state cₜ (ADD of gate "cell", or at step 1 the
 *    MULTIPLY i ⊙ g); tanh(cₜ) (ACTIVATE "hidden"); hₜ (MULTIPLY "hidden");
 *  - GRU: ACTIVATE of update / reset (from step 2) / candidate; 1 − z (ONE_MINUS); hₜ (the last "hidden" result).
 */
import type { Instruction } from '../../../core/npm/ir';
import type { CnnExample } from './cnnRecord';
import { values } from './rnnRecord';

const fwd = (ex: CnnExample, layer = 'L1') =>
  (ex.layers[layer] ?? []).filter((i) => i.path.phase === 'forward');
const pick = (ins: Instruction[], t: number, gate: string, kind: string): Instruction | undefined =>
  ins.filter((i) => Number(i.meta.step) === t && i.meta.gate === gate && i.kind === kind).at(-1);

export interface LstmStep {
  t: number;
  x: number;
  f: number[];
  i: number[];
  g: number[];
  o: number[];
  cPrev: number[] | null;
  c: number[];
  tanhC: number[];
  h: number[];
  hPrev: number[] | null;
  ids: { f: number; i: number; g: number; o: number; c: number; h: number };
}

export function lstmSteps(ex: CnnExample): LstmStep[] {
  const ins = fwd(ex);
  const steps = [...new Set(ins.map((i) => Number(i.meta.step)).filter((t) => t > 0))].sort((a, b) => a - b);
  const out: LstmStep[] = [];
  for (const t of steps) {
    const f = pick(ins, t, 'forget', 'ACTIVATE')!;
    const i = pick(ins, t, 'input', 'ACTIVATE')!;
    const g = pick(ins, t, 'candidate', 'ACTIVATE')!;
    const o = pick(ins, t, 'output', 'ACTIVATE')!;
    const c = (pick(ins, t, 'cell', 'ADD') ?? pick(ins, t, 'cell', 'MULTIPLY'))!;
    const tc = pick(ins, t, 'hidden', 'ACTIVATE')!;
    const h = pick(ins, t, 'hidden', 'MULTIPLY')!;
    const sel = ins.find((q) => q.kind === 'SELECT_STEP' && Number(q.meta.step) === t)!;
    const prev = out[out.length - 1];
    out.push({
      t,
      x: values(sel)[0],
      f: values(f),
      i: values(i),
      g: values(g),
      o: values(o),
      cPrev: prev ? prev.c : null,
      c: values(c),
      tanhC: values(tc),
      h: values(h),
      hPrev: prev ? prev.h : null,
      ids: { f: f.id, i: i.id, g: g.id, o: o.id, c: c.id, h: h.id },
    });
  }
  return out;
}

export interface GruStep {
  t: number;
  x: number;
  z: number[];
  /** Absent at step 1: with h₀ = 0 there is nothing for the reset gate to act on. */
  r: number[] | null;
  n: number[];
  oneMinusZ: number[];
  h: number[];
  hPrev: number[] | null;
  ids: { z: number; n: number; h: number };
}

export function gruSteps(ex: CnnExample): GruStep[] {
  const ins = fwd(ex);
  const steps = [...new Set(ins.map((i) => Number(i.meta.step)).filter((t) => t > 0))].sort((a, b) => a - b);
  const out: GruStep[] = [];
  for (const t of steps) {
    const z = pick(ins, t, 'update', 'ACTIVATE')!;
    const r = pick(ins, t, 'reset', 'ACTIVATE');
    const n = pick(ins, t, 'candidate', 'ACTIVATE')!;
    const om = pick(ins, t, 'hidden', 'ONE_MINUS')!;
    const hidden = ins.filter((q) => Number(q.meta.step) === t && q.meta.gate === 'hidden');
    const h = hidden.at(-1)!;
    const sel = ins.find((q) => q.kind === 'SELECT_STEP' && Number(q.meta.step) === t)!;
    const prev = out[out.length - 1];
    out.push({
      t,
      x: values(sel)[0],
      z: values(z),
      r: r ? values(r) : null,
      n: values(n),
      oneMinusZ: values(om),
      h: values(h),
      hPrev: prev ? prev.h : null,
      ids: { z: z.id, n: n.id, h: h.id },
    });
  }
  return out;
}

/** Number of trainable values of a model description (from the header's parameter shapes). */
export const parameterCount = (params: readonly { shape: readonly number[] }[]): number =>
  params.reduce((s, p) => s + p.shape.reduce((a, b) => a * b, 1), 0);
