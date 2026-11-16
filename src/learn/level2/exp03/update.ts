/**
 * One full-batch update of the Experiment 03 neuron, read from its recorded NPM trace (ADR-091). Nothing is
 * computed here: each value is a result of a recorded instruction, kept with that instruction's id.
 *
 *  - starting values: INIT_PARAM (the prologue, before the first epoch);
 *  - per example (epoch 1): LOAD_INPUT, ADD_BIAS (z), ACTIVATE (p), COMPUTE_LOSS, GRAD_MATMUL_W (∂Lᵢ/∂w), GRAD_BIAS (∂Lᵢ/∂b);
 *  - the batch: LOSS_REDUCE (mean loss), GRAD_ACCUMULATE (mean gradient), COMPUTE_UPDATE (Δ = −η·g), APPLY_UPDATE (new value);
 *  - after: epoch 2's forward pass and loss, with the updated parameters.
 */
import type { Instruction } from '../../../core/npm/ir';

export interface Recorded {
  value: number;
  id: number;
}

export interface ExampleRow {
  index: number;
  x: Recorded;
  y: Recorded;
  z: Recorded;
  p: Recorded;
  loss: Recorded;
  gw: Recorded;
  gb: Recorded;
}

export interface UpdateBreakdown {
  initial: { w: Recorded; b: Recorded };
  examples: ExampleRow[];
  batchLoss: Recorded;
  grad: { w: Recorded; b: Recorded };
  lr: number;
  delta: { w: Recorded; b: Recorded };
  after: { w: Recorded; b: Recorded };
  /** How many times each parameter was updated in epoch 1, counted in the trace. */
  updatesInEpoch: number;
  /** How many examples epoch 1 processed, counted in the trace. */
  examplesInEpoch: number;
  next: { examples: { index: number; p: Recorded; loss: Recorded }[]; batchLoss: Recorded } | null;
}

const first = (r: Instruction, slot: string): Recorded => ({ value: r.results[slot].data[0], id: r.id });

function param(ins: Instruction[], kind: string, name: string, slot: string): Recorded {
  const i = ins.find((q) => q.kind === kind && q.meta.param === name);
  if (!i) throw new Error(`the trace has no ${kind} for ${name}`);
  return first(i, slot);
}

function perExample(ins: Instruction[]): Map<number, Instruction[]> {
  const by = new Map<number, Instruction[]>();
  let cur: Instruction[] | null = null;
  for (const i of ins) {
    if (i.kind === 'LOAD_INPUT') {
      cur = [i];
      by.set(Number(i.meta.datasetIndex), cur);
    } else if (cur && i.path.sample !== null) cur.push(i);
    else if (i.path.sample === null) cur = null;
  }
  return by;
}

const pick = (list: Instruction[], kind: string): Instruction => {
  const i = list.find((q) => q.kind === kind);
  if (!i) throw new Error(`an example has no ${kind}`);
  return i;
};

/** `upToEpoch2` holds the prologue and epoch 1; `epoch2` the second epoch's instructions, if there is one. */
export function oneUpdate(
  upToEpoch2: Instruction[],
  epoch1Start: number,
  epoch2: Instruction[] | null,
): UpdateBreakdown {
  const prologue = upToEpoch2.filter((i) => i.id < epoch1Start);
  const e1 = upToEpoch2.filter((i) => i.id >= epoch1Start);
  const rows = [...perExample(e1).entries()].sort((a, b) => a[0] - b[0]);
  const examples = rows.map(([index, list]) => {
    const load = pick(list, 'LOAD_INPUT');
    return {
      index,
      x: first(load, 'x'),
      y: first(load, 'y'),
      z: first(pick(list, 'ADD_BIAS'), 'out'),
      p: first(pick(list, 'ACTIVATE'), 'out'),
      loss: first(pick(list, 'COMPUTE_LOSS'), 'loss'),
      gw: first(pick(list, 'GRAD_MATMUL_W'), 'grad'),
      gb: first(pick(list, 'GRAD_BIAS'), 'grad'),
    };
  });
  const reduce = e1.find((i) => i.kind === 'LOSS_REDUCE');
  if (!reduce) throw new Error('the trace has no LOSS_REDUCE');
  const compute = e1.find((i) => i.kind === 'COMPUTE_UPDATE');
  let next: UpdateBreakdown['next'] = null;
  if (epoch2) {
    const r2 = [...perExample(epoch2).entries()].sort((a, b) => a[0] - b[0]);
    const red2 = epoch2.find((i) => i.kind === 'LOSS_REDUCE');
    if (red2)
      next = {
        examples: r2.map(([index, list]) => ({
          index,
          p: first(pick(list, 'ACTIVATE'), 'out'),
          loss: first(pick(list, 'COMPUTE_LOSS'), 'loss'),
        })),
        batchLoss: first(red2, 'loss'),
      };
  }
  return {
    initial: {
      w: param(prologue, 'INIT_PARAM', 'L1.W', 'value'),
      b: param(prologue, 'INIT_PARAM', 'L1.b', 'value'),
    },
    examples,
    batchLoss: first(reduce, 'loss'),
    grad: {
      w: param(e1, 'GRAD_ACCUMULATE', 'L1.W', 'grad'),
      b: param(e1, 'GRAD_ACCUMULATE', 'L1.b', 'grad'),
    },
    lr: Number(compute?.meta.lr),
    delta: {
      w: param(e1, 'COMPUTE_UPDATE', 'L1.W', 'delta'),
      b: param(e1, 'COMPUTE_UPDATE', 'L1.b', 'delta'),
    },
    after: { w: param(e1, 'APPLY_UPDATE', 'L1.W', 'value'), b: param(e1, 'APPLY_UPDATE', 'L1.b', 'value') },
    updatesInEpoch: e1.filter((i) => i.kind === 'APPLY_UPDATE' && i.meta.param === 'L1.W').length,
    examplesInEpoch: e1.filter((i) => i.kind === 'LOAD_INPUT').length,
    next,
  };
}
