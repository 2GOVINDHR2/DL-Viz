/**
 * Engine probes for the experiments that do not train (Level 1, experiments 01–03; ADR-082).
 *
 * A probe is a real engine run: the network the learner configured, with the parameter values they set, run once
 * over the given examples through `TraceStore.generate`, which records it as an NPM trace. The learning rate is 0,
 * so the update step changes nothing (Δ = −0·g) and the parameters stay as set. Every value the screens show (the
 * weighted sum, the bias sum, each activation, the loss, the decision-boundary grid) is read from that trace's
 * instructions, never computed here.
 *
 * Probes are tiny (a handful of examples, one or two small layers) and synchronous, so a slider can update the
 * picture in the same frame. They run on the main thread. Real training (experiment 04) runs in the worker.
 */
import { resolveDataset } from '../../core/engine/host';
import type { TrainConfig } from '../../core/engine/session';
import { buildModel, type ModelConfig } from '../../core/layers/model';
import type { LossName } from '../../core/losses/losses';
import type { Instruction } from '../../core/npm/ir';
import { storeSource } from '../../core/npm/source';
import { TraceStore } from '../../core/npm/store';

export interface ProbeSpec {
  model: ModelConfig;
  /** Every trainable parameter of the model, row-major. A probe never falls back to random starting values. */
  params: Record<string, number[]>;
  xs: number[][];
  /** Targets; zeros of the output size when omitted (the probe is then about the forward pass only). */
  ys?: number[][];
  /** Defaults to squared error, which pairs with every output activation. */
  loss?: LossName;
  /** Resolution of the engine's decision-boundary grid over the examples' extent (2-input models); 0 for none. */
  grid?: number;
}

export interface LayerValues {
  /** Weighted sum before the bias (u = Σ wᵢxᵢ). */
  u?: number[];
  /** Weighted sum plus bias (z). */
  z?: number[];
  /** The layer's output after its activation (a = f(z)). */
  a?: number[];
}

export interface ExampleValues {
  index: number;
  x: number[];
  y: number[];
  layers: Record<string, LayerValues>;
  /** Output of the last layer. */
  output: number[];
  loss: number | null;
  /** The instructions that produced these values (LOAD_INPUT, then each layer's MATMUL, ADD_BIAS, ACTIVATE), for "see the record". */
  instructions: Instruction[];
  /** The example's backward-phase instructions (GRAD_INIT, GRAD_ACTIVATE, GRAD_MATMUL_W …), in recorded order. */
  backward: Instruction[];
}

export interface ProbeResult {
  examples: ExampleValues[];
  boundary: { resolution: number; bounds: [number, number, number, number]; values: number[] } | null;
  /** Number of instructions in the trace the values came from. */
  length: number;
  layerNames: string[];
}

export class ProbeError extends Error {}

function configOf(spec: ProbeSpec): TrainConfig {
  return {
    model: spec.model,
    loss: spec.loss ?? 'mse',
    optimizer: { type: 'sgd', lr: 0 },
    batchSize: spec.xs.length,
    epochs: 1,
    seed: 0,
    shuffle: false,
    boundaryGrid: spec.grid ?? 0,
    initialParams: spec.params,
  };
}

/** Runs the engine once and reads the values back from the recorded trace. */
export function runProbe(spec: ProbeSpec): ProbeResult {
  if (spec.xs.length === 0) throw new ProbeError('a probe needs at least one example');
  const model = buildModel(spec.model);
  for (const p of model.params)
    if (!spec.params[p.name])
      throw new ProbeError(`no value given for ${p.name}; a probe never uses random values`);
  for (const [name, v] of Object.entries(spec.params))
    if (v.some((x) => !Number.isFinite(x))) throw new ProbeError(`${name} must be a finite number`);
  for (const row of spec.xs)
    if (row.some((x) => !Number.isFinite(x))) throw new ProbeError('every input must be a finite number');
  const outSize = model.outputShape[0];
  const ys = spec.ys ?? spec.xs.map(() => Array.from({ length: outSize }, () => 0));
  const shape = spec.model.inputShape;
  const data = resolveDataset({
    kind: 'points',
    name: 'probe',
    xs: spec.xs,
    ys,
    ...(shape.length > 1 ? { shape } : {}),
  });
  const { store } = TraceStore.generate(configOf(spec), data, { embedDatasetLimit: 0 });
  const src = storeSource(store);
  const all = src.range(0, src.length);

  const layerNames = model.layers.map((l) => l.name);
  const last = layerNames[layerNames.length - 1];
  const examples: ExampleValues[] = [];
  let cur: ExampleValues | null = null;
  let boundary: ProbeResult['boundary'] = null;
  for (const ins of all) {
    if (ins.kind === 'LOAD_INPUT') {
      cur = {
        index: Number(ins.meta.datasetIndex),
        x: Array.from(ins.results.x.data),
        y: Array.from(ins.results.y.data),
        layers: {},
        output: [],
        loss: null,
        instructions: [ins],
        backward: [],
      };
      examples.push(cur);
      continue;
    }
    if (ins.kind === 'EVAL_END' && ins.results.boundary) {
      const b = ins.meta.bounds as number[];
      boundary = {
        resolution: ins.results.boundary.shape[0],
        bounds: [b[0], b[1], b[2], b[3]],
        values: Array.from(ins.results.boundary.data),
      };
    }
    if (!cur || ins.path.sample === null) continue;
    if (ins.path.phase === 'forward' && ins.path.layer) {
      // The record shown lists the steps that compute (the layer-end marker repeats the activation's value).
      if (ins.kind !== 'FORWARD_LAYER_END') cur.instructions.push(ins);
      const L = (cur.layers[ins.path.layer] ??= {});
      const v = ins.results.out ? Array.from(ins.results.out.data) : undefined;
      if (ins.kind === 'MATMUL') L.u = v;
      else if (ins.kind === 'ADD_BIAS') L.z = v;
      else if (ins.kind === 'ACTIVATE') {
        L.a = v;
        if (ins.path.layer === last && v) cur.output = v;
      }
    } else if (ins.kind === 'COMPUTE_LOSS') {
      cur.loss = ins.results.loss.item();
    } else if (ins.path.phase === 'backward' && ins.kind !== 'BACKWARD_LAYER_END') {
      cur.backward.push(ins);
    }
  }
  examples.sort((p, q) => p.index - q.index);
  return { examples, boundary, length: src.length, layerNames };
}

const cache = new Map<string, ProbeResult>();
const CACHE_LIMIT = 96;

/** runProbe with a small LRU cache keyed by the specification, so re-renders never re-run the engine. */
export function probe(spec: ProbeSpec): ProbeResult {
  const key = JSON.stringify(spec);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const r = runProbe(spec);
  cache.set(key, r);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return r;
}

/** Like probe, but returns the error instead of throwing, for rendering. */
export function tryProbe(
  spec: ProbeSpec,
): { result: ProbeResult; error: null } | { result: null; error: string } {
  try {
    return { result: probe(spec), error: null };
  } catch (e) {
    return { result: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * The step rule. The engine has no step activation: a step has no useful gradient, so the core never needed one
 * (ADR-081). For Step, the engine computes z, and this rule turns z into 0 or 1. It is the only arithmetic the Level 1
 * screens apply to an engine value, and every screen that uses it says so.
 */
export const stepRule = (z: number): 0 | 1 => (z >= 0 ? 1 : 0);

export interface Grid {
  resolution: number;
  bounds: [number, number, number, number];
  /** Row-major (row = second input, from its low end); the network's first output at each cell centre. */
  values: number[];
}

/**
 * The network's output over a rectangle, from the engine's own decision-boundary evaluation (EVAL_END of a probe
 * run). The engine frames its grid on the examples' extent padded by 15 %, so the probe's two examples are placed
 * so that the padded extent is exactly `frame`. Those two examples serve only to set the frame and are not shown.
 */
export function probeGrid(
  model: ModelConfig,
  params: Record<string, number[]>,
  frame: [number, number, number, number],
  resolution = 48,
): Grid {
  const inner = (lo: number, hi: number): [number, number] => {
    const span = (hi - lo) / 1.3;
    return [lo + 0.15 * span, lo + 1.15 * span];
  };
  const [x0, x1] = inner(frame[0], frame[1]);
  const [y0, y1] = inner(frame[2], frame[3]);
  const r = probe({
    model,
    params,
    xs: [
      [x0, y0],
      [x1, y1],
    ],
    grid: resolution,
  });
  if (!r.boundary) throw new ProbeError('the engine returned no grid (the model needs exactly two inputs)');
  return r.boundary;
}
