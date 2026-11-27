/**
 * Reading Experiment 02's recorded CNN run (ADR-101). Every value is a recorded instruction result:
 *  - one example's forward pass in a chosen epoch: its LOAD_INPUT, then each layer's CONV2D / ACTIVATE / POOL /
 *    FLATTEN / MATMUL / ADD_BIAS / ACTIVATE (softmax, shown beside the fused loss) and COMPUTE_LOSS;
 *  - a parameter's value at the start (INIT_PARAM) or after a given epoch (that epoch's last APPLY_UPDATE).
 */
import type { Instruction, TraceHeader } from '../../../core/npm/ir';
import { readChunked } from '../../level3/common/updates';

type Read = (from: number, to: number) => Promise<Instruction[]>;

export interface CnnExample {
  index: number;
  epoch: number;
  x: number[];
  target: number[];
  /** Per layer name: the instructions of that layer in order (CONV2D, ACTIVATE / POOL / FLATTEN / MATMUL …). */
  layers: Record<string, Instruction[]>;
  logits: number[];
  probs: number[];
  loss: number;
  /** All the example's forward instructions, LOAD_INPUT first and COMPUTE_LOSS last. */
  instructions: Instruction[];
}

/** The forward pass of dataset example `index` as recorded during epoch `epoch` (0-based) of training. */
export async function readExample(
  read: Read,
  header: TraceHeader,
  epoch: number,
  index: number,
): Promise<CnnExample> {
  const ins = await readChunked(read, header.epochStarts[epoch], header.epochStarts[epoch + 1]);
  const k = ins.findIndex((i) => i.kind === 'LOAD_INPUT' && Number(i.meta.datasetIndex) === index);
  if (k < 0) throw new Error(`example ${index} is not in epoch ${epoch + 1}`);
  const out: Instruction[] = [ins[k]];
  for (let j = k + 1; j < ins.length && ins[j].kind !== 'COMPUTE_LOSS'; j++)
    if (ins[j].kind !== 'FORWARD_LAYER_END') out.push(ins[j]);
  const loss = ins.slice(k).find((i) => i.kind === 'COMPUTE_LOSS')!;
  out.push(loss);
  const layers: Record<string, Instruction[]> = {};
  for (const i of out) if (i.path.layer && i.path.phase === 'forward') (layers[i.path.layer] ??= []).push(i);
  const last = header.model.layers[header.model.layers.length - 1].name;
  const lastIns = layers[last] ?? [];
  const logits = lastIns.find((i) => i.kind === 'ADD_BIAS')!;
  const probs = lastIns.find((i) => i.kind === 'ACTIVATE')!;
  return {
    index,
    epoch,
    x: Array.from(ins[k].results.x.data),
    target: Array.from(ins[k].results.y.data),
    layers,
    logits: Array.from(logits.results.out.data),
    probs: Array.from(probs.results.out.data),
    loss: loss.results.loss.item(),
    instructions: out,
  };
}

/** `param`'s values before training (epoch −1) or after epoch `epoch` (0-based), from the record. */
export async function readParamAt(
  read: Read,
  header: TraceHeader,
  param: string,
  epoch: number,
): Promise<number[]> {
  if (epoch < 0) {
    const init = (await read(0, header.epochStarts[0])).find(
      (i) => i.kind === 'INIT_PARAM' && i.meta.param === param,
    );
    return Array.from(init!.results.value.data);
  }
  const ins = await readChunked(read, header.epochStarts[epoch], header.epochStarts[epoch + 1]);
  const last = ins.filter((i) => i.kind === 'APPLY_UPDATE' && i.meta.param === param).at(-1);
  return Array.from(last!.results.value.data);
}
