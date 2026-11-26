/**
 * Reading a recorded run's updates, one parameter value at a time (Level 3, ADR-099). Every number is a recorded
 * instruction result; nothing is recomputed here:
 *  - ḡ (GRAD_ACCUMULATE.grad), and with weight decay λ·w and ḡ + λ·w (`decay`, `regularized`);
 *  - momentum's velocity, or Adam's m, v, m̂, v̂ (OPTIMIZER_STATE);
 *  - the step Δ (COMPUTE_UPDATE) and the value after it (APPLY_UPDATE);
 *  - the value before: the starting value (INIT_PARAM) for the first update, then the previous update's result,
 *    which is exactly what each APPLY_UPDATE's parameter operand refers to (checked in the tests);
 *  - the batch's loss before the update (LOSS_REDUCE), computed with the values before it.
 */
import type { TraceHeader, Instruction } from '../../../core/npm/ir';
import { EPOCH_READ_LIMIT } from '../../trace/store';

export interface UpdateRecord {
  /** 1-based update number. */
  n: number;
  epoch: number;
  batch: number;
  /** The mean loss of the batch the gradient came from (before this update). */
  loss: number;
  grad: number;
  decay?: number;
  regularized?: number;
  velocity?: number;
  m?: number;
  v?: number;
  mHat?: number;
  vHat?: number;
  /** Adam's step number t. */
  t?: number;
  lr: number;
  delta: number;
  before: number;
  after: number;
  ids: { accumulate: number; state?: number; compute: number; apply: number };
}

/** Recorded instructions [from, to), read in pieces no larger than the explorer's limit. */
export async function readChunked(
  read: (from: number, to: number) => Promise<Instruction[]>,
  from: number,
  to: number,
): Promise<Instruction[]> {
  const out: Instruction[] = [];
  for (let a = from; a < to; a += EPOCH_READ_LIMIT)
    out.push(...(await read(a, Math.min(to, a + EPOCH_READ_LIMIT))));
  return out;
}

const at = (i: Instruction | undefined, slot: string, k: number): number | undefined =>
  i?.results[slot] ? i.results[slot].data[k] : undefined;

/** The updates of `param` (value index k) in the first `epochs` epochs of the run, in order. */
export async function readUpdateSeries(
  read: (from: number, to: number) => Promise<Instruction[]>,
  header: TraceHeader,
  param: string,
  k: number,
  epochs = header.epochStarts.length - 1,
): Promise<UpdateRecord[]> {
  const end = header.epochStarts[Math.min(epochs, header.epochStarts.length - 1)];
  const ins = await readChunked(read, 0, end);
  const init = ins.find((i) => i.kind === 'INIT_PARAM' && i.meta.param === param);
  if (!init) throw new Error(`no parameter ${param} in this record`);
  let before = init.results.value.data[k];
  const out: UpdateRecord[] = [];
  let lossOfBatch = NaN;
  let acc: Instruction | undefined;
  let state: Instruction | undefined;
  let compute: Instruction | undefined;
  for (const i of ins) {
    if (i.kind === 'LOSS_REDUCE') lossOfBatch = i.results.loss.item();
    if (i.meta.param !== param) continue;
    if (i.kind === 'GRAD_ACCUMULATE') {
      acc = i;
      state = undefined;
    } else if (i.kind === 'OPTIMIZER_STATE') state = i;
    else if (i.kind === 'COMPUTE_UPDATE') compute = i;
    else if (i.kind === 'APPLY_UPDATE' && acc && compute) {
      const after = i.results.value.data[k];
      out.push({
        n: out.length + 1,
        epoch: i.path.epoch ?? 0,
        batch: i.path.batch ?? 0,
        loss: lossOfBatch,
        grad: acc.results.grad.data[k],
        decay: at(acc, 'decay', k),
        regularized: at(acc, 'regularized', k),
        velocity: at(state, 'velocity', k),
        m: at(state, 'm', k),
        v: at(state, 'v', k),
        mHat: at(state, 'mHat', k),
        vHat: at(state, 'vHat', k),
        t: state?.meta.t === undefined ? undefined : Number(state.meta.t),
        lr: Number(compute.meta.lr),
        delta: compute.results.delta.data[k],
        before,
        after,
        ids: { accumulate: acc.id, state: state?.id, compute: compute.id, apply: i.id },
      });
      before = after;
      acc = undefined;
      compute = undefined;
    }
  }
  return out;
}

/** Every parameter value of the model, labelled for a selector ("hidden weight x₁ → neuron 3" …). */
export function parameterChoices(header: TraceHeader): { param: string; k: number; label: string }[] {
  const out: { param: string; k: number; label: string }[] = [];
  const sub = (n: number) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
  header.model.layers.forEach((l, li) => {
    const last = li === header.model.layers.length - 1;
    const where = last ? 'output' : 'hidden';
    const nIn = l.inShape[0];
    const nOut = l.outShape[0];
    for (let i = 0; i < nIn; i++)
      for (let j = 0; j < nOut; j++)
        out.push({
          param: `${l.name}.W`,
          k: i * nOut + j,
          label: `${where} weight ${li === 0 ? `x${sub(i + 1)}` : `h${sub(i + 1)}`} → ${last ? 'output' : `neuron ${j + 1}`}`,
        });
    for (let j = 0; j < nOut; j++)
      out.push({ param: `${l.name}.b`, k: j, label: `${where} bias${last ? '' : ` of neuron ${j + 1}`}` });
  });
  return out;
}
