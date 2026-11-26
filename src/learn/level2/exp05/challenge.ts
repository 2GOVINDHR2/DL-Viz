/**
 * Experiment 05's final challenge (Stage 6, ADR-095, decision D4): a small MLP trained by the engine on the two
 * Gaussian clusters of registry experiment 3, and a reader that takes one update apart from the recorded trace.
 *
 * `readBatch` reads only recorded instructions: each example's LOAD_INPUT, its last ACTIVATE (the prediction),
 * COMPUTE_LOSS and backward steps; each parameter's GRAD_ACCUMULATE (the batch mean), COMPUTE_UPDATE and APPLY_UPDATE,
 * with the value before the update fetched from the instruction the APPLY_UPDATE operand refers to. Nothing here
 * computes a value the page then presents as the engine's.
 */
import type { TrainConfig } from '../../../core/engine/session';
import type { DatasetSpec } from '../../../core/engine/protocol';
import type { Instruction } from '../../../core/npm/ir';

export const CHALLENGE_DATASET: DatasetSpec = { kind: 'gaussians', n: 40, seed: 3 };

export type Activation = 'tanh' | 'sigmoid' | 'relu';
export interface ChallengeSettings {
  units: number;
  activation: Activation;
  lr: number;
  batchSize: number;
}

/** The choices the learner has: a bounded set, every one checked by the Stage 6 gate. */
export const CHALLENGE_OPTIONS = {
  units: [2, 3, 4],
  activation: ['tanh', 'sigmoid', 'relu'] as Activation[],
  lr: [0.05, 0.5, 2],
  batchSize: [1, 8, 40],
};

export const CHALLENGE_DEFAULTS: ChallengeSettings = { units: 3, activation: 'tanh', lr: 0.5, batchSize: 8 };
export const CHALLENGE_EPOCHS = 20;

export function challengeConfig(s: ChallengeSettings): TrainConfig {
  return {
    seed: 5,
    epochs: CHALLENGE_EPOCHS,
    batchSize: s.batchSize,
    shuffle: true,
    loss: 'bce',
    optimizer: { type: 'sgd', lr: s.lr },
    boundaryGrid: 24,
    model: {
      inputShape: [2],
      layers: [
        { type: 'dense', units: s.units, activation: s.activation },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
    },
  };
}

export const describeNetwork = (s: ChallengeSettings): string =>
  `2-${s.units}-1 (${s.activation} hidden, sigmoid output)`;

const arr = (i: Instruction, slot: string): number[] => Array.from(i.results[slot].data);

export interface ExampleView {
  /** Position in the batch (0-based) and in the dataset. */
  sample: number;
  datasetIndex: number;
  x: number[];
  target: number;
  prediction: number;
  loss: number;
  ids: { load: number; prediction: number; loss: number; backwardStart: number; backwardEnd: number };
  /** The example's backward steps, in recorded order (layer-end markers left out). */
  backward: Instruction[];
  /** This example's own gradient of each parameter (GRAD_MATMUL_W / GRAD_BIAS), keyed "L1.W" etc. */
  grads: Record<string, { values: number[]; id: number }>;
}

export interface UpdateView {
  param: string;
  /** The batch mean ḡ (GRAD_ACCUMULATE) and how many example gradients it averaged. */
  mean: number[];
  averaged: number;
  lr: number;
  delta: number[];
  before: number[];
  after: number[];
  ids: { accumulate: number; compute: number; apply: number; before: number };
}

export interface BatchView {
  epoch: number;
  batch: number;
  examples: ExampleView[];
  updates: UpdateView[];
  /** The batch's mean loss (LOSS_REDUCE). */
  loss: number;
  ids: { begin: number; end: number };
}

/**
 * One batch of a recorded run, from the instructions of its epoch. `fetch` returns any earlier instruction (the
 * value a parameter had before this update may have been made in an earlier epoch).
 */
export async function readBatch(
  epochIns: Instruction[],
  epoch: number,
  batch: number,
  lastLayer: string,
  fetch: (id: number) => Promise<Instruction>,
): Promise<BatchView> {
  const ins = epochIns.filter((i) => i.path.epoch === epoch && i.path.batch === batch);
  if (!ins.length) throw new Error(`no batch ${batch + 1} in epoch ${epoch + 1} of this record`);
  const begin = ins.find((i) => i.kind === 'BATCH_BEGIN')!;
  const end = ins.find((i) => i.kind === 'BATCH_END')!;
  const samples = [...new Set(ins.filter((i) => i.path.sample !== null).map((i) => i.path.sample!))];
  const examples: ExampleView[] = samples.map((s) => {
    const mine = ins.filter((i) => i.path.sample === s);
    const load = mine.find((i) => i.kind === 'LOAD_INPUT')!;
    const pred = mine.filter((i) => i.kind === 'ACTIVATE' && i.path.layer === lastLayer).at(-1)!;
    const loss = mine.find((i) => i.kind === 'COMPUTE_LOSS')!;
    const backward = mine.filter((i) => i.path.phase === 'backward' && i.kind !== 'BACKWARD_LAYER_END');
    const grads: ExampleView['grads'] = {};
    for (const g of backward)
      if (g.kind === 'GRAD_MATMUL_W' || g.kind === 'GRAD_BIAS')
        grads[`${g.path.layer}.${g.kind === 'GRAD_MATMUL_W' ? 'W' : 'b'}`] = {
          values: arr(g, 'grad'),
          id: g.id,
        };
    return {
      sample: s,
      datasetIndex: Number(load.meta.datasetIndex),
      x: arr(load, 'x'),
      target: arr(load, 'y')[0],
      prediction: arr(pred, 'out')[0],
      loss: loss.results.loss.item(),
      ids: {
        load: load.id,
        prediction: pred.id,
        loss: loss.id,
        backwardStart: backward[0].id,
        backwardEnd: backward.at(-1)!.id,
      },
      backward,
      grads,
    };
  });
  const updates: UpdateView[] = [];
  for (const acc of ins.filter((i) => i.kind === 'GRAD_ACCUMULATE')) {
    const param = String(acc.meta.param);
    const compute = ins.find((i) => i.kind === 'COMPUTE_UPDATE' && i.meta.param === param)!;
    const apply = ins.find((i) => i.kind === 'APPLY_UPDATE' && i.meta.param === param)!;
    const op = apply.operands.find((o) => o.role === 'parameter')!;
    const src = await fetch(op.ref);
    updates.push({
      param,
      mean: arr(acc, 'grad'),
      averaged: acc.operands.length,
      lr: Number(compute.meta.lr),
      delta: arr(compute, 'delta'),
      before: arr(src, op.slot),
      after: arr(apply, 'value'),
      ids: { accumulate: acc.id, compute: compute.id, apply: apply.id, before: src.id },
    });
  }
  const reduce = ins.find((i) => i.kind === 'LOSS_REDUCE')!;
  return {
    epoch,
    batch,
    examples,
    updates,
    loss: reduce.results.loss.item(),
    ids: { begin: begin.id, end: end.id },
  };
}

export interface EpochCheck {
  epoch: number;
  loss: number;
  accuracy: number;
  boundary: { resolution: number; bounds: [number, number, number, number]; values: number[] } | null;
}

/** The engine's own check at the end of an epoch (EVAL_END): loss, accuracy and the decision grid. */
export function epochCheck(epochIns: Instruction[], epoch: number): EpochCheck {
  const ev = epochIns.find((i) => i.kind === 'EVAL_END' && i.path.epoch === epoch);
  if (!ev) throw new Error(`epoch ${epoch + 1} has no recorded check`);
  const b = ev.meta.bounds as number[] | undefined;
  return {
    epoch,
    loss: ev.results.loss.item(),
    accuracy: ev.results.accuracy.item(),
    boundary:
      ev.results.boundary && b
        ? {
            resolution: ev.results.boundary.shape[0],
            bounds: [b[0], b[1], b[2], b[3]],
            values: Array.from(ev.results.boundary.data),
          }
        : null,
  };
}
