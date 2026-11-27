/**
 * Convolution and pooling probes for Level 4, Experiment 01 (ADR-101). Each is a real engine run (an engine probe:
 * η = 0, the parameters as given) of a one-layer network on one single-channel image; the feature maps are read back
 * from the recorded CONV2D or POOL instruction, never computed here. A flatten layer follows so the probe's output is a
 * vector, as the probe's loss needs.
 */
import type { Instruction } from '../../../core/npm/ir';
import { tryProbe } from '../../engine/probe';

export interface ConvResult {
  /** One feature map per kernel, row-major. */
  maps: number[][];
  rows: number;
  cols: number;
  /** The recorded convolution. */
  instruction: Instruction;
  /** Instructions in the probe's record. */
  length: number;
}

export function convProbe(
  image: readonly number[],
  size: number,
  kernels: readonly (readonly number[])[],
  stride = 1,
  padding = 0,
): { result: ConvResult; error: null } | { result: null; error: string } {
  const k = Math.round(Math.sqrt(kernels[0].length));
  const r = tryProbe({
    model: {
      inputShape: [1, size, size],
      layers: [
        { type: 'conv2d', filters: kernels.length, kernel: k, stride, padding, activation: 'linear' },
        { type: 'flatten' },
      ],
    },
    params: { 'L1.W': kernels.flat(), 'L1.b': kernels.map(() => 0) },
    xs: [[...image]],
  });
  if (!r.result) return { result: null, error: r.error };
  const ins = r.result.examples[0].instructions.find((i) => i.kind === 'CONV2D');
  if (!ins) return { result: null, error: 'the record has no convolution' };
  const [, f, rows, cols] = ins.results.out.shape;
  const data = Array.from(ins.results.out.data);
  const maps = Array.from({ length: f }, (_, q) => data.slice(q * rows * cols, (q + 1) * rows * cols));
  return { result: { maps, rows, cols, instruction: ins, length: r.result.length }, error: null };
}

export interface PoolResult {
  out: number[];
  rows: number;
  cols: number;
  instruction: Instruction;
  length: number;
}

export function poolProbe(
  map: readonly number[],
  size: number,
  mode: 'max' | 'avg',
  block = 2,
): { result: PoolResult; error: null } | { result: null; error: string } {
  const r = tryProbe({
    model: {
      inputShape: [1, size, size],
      layers: [{ type: 'pool', mode, size: block }, { type: 'flatten' }],
    },
    params: {},
    xs: [[...map]],
  });
  if (!r.result) return { result: null, error: r.error };
  const ins = r.result.examples[0].instructions.find((i) => i.kind === 'POOL');
  if (!ins) return { result: null, error: 'the record has no pooling step' };
  const [, , rows, cols] = ins.results.out.shape;
  return {
    result: { out: Array.from(ins.results.out.data), rows, cols, instruction: ins, length: r.result.length },
    error: null,
  };
}

/** Indices (row-major, in an n×n input) of the k×k patch under output cell (r, c), for a given stride, without padding. */
export function patchIndices(n: number, k: number, r: number, c: number, stride = 1): number[] {
  const out: number[] = [];
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) out.push((r * stride + i) * n + (c * stride + j));
  return out;
}
