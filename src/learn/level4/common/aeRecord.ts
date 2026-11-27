/**
 * Reading Experiment 06's recorded autoencoder run (ADR-103): every value is a recorded instruction result.
 * Layers: L1 (encoder hidden, tanh), L2 (latent code, linear), L3 (decoder hidden, tanh), L4 (reconstruction, sigmoid).
 */
import type { Instruction, TraceHeader } from '../../../core/npm/ir';
import { readChunked } from '../../level3/common/updates';

export interface LatentPoint {
  index: number;
  code: number[];
  loss: number;
}

/** The latent code (L2's output) and reconstruction loss of every example, as recorded during epoch `epoch`. */
export async function readLatents(
  read: (a: number, b: number) => Promise<Instruction[]>,
  header: TraceHeader,
  epoch: number,
): Promise<LatentPoint[]> {
  const ins = await readChunked(read, header.epochStarts[epoch], header.epochStarts[epoch + 1]);
  const out: LatentPoint[] = [];
  let cur: LatentPoint | null = null;
  for (const i of ins) {
    if (i.kind === 'LOAD_INPUT') {
      cur = { index: Number(i.meta.datasetIndex), code: [], loss: NaN };
      out.push(cur);
    } else if (cur && i.kind === 'ACTIVATE' && i.path.layer === 'L2' && i.path.phase === 'forward')
      cur.code = Array.from(i.results.out.data);
    else if (cur && i.kind === 'COMPUTE_LOSS') cur.loss = i.results.loss.item();
  }
  return out.sort((a, b) => a.index - b.index);
}
