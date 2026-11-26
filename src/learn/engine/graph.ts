/**
 * Computational graphs for Experiment 05 (ADR-094). Two readers of what the engine already produces; neither is a
 * second automatic differentiation:
 *
 *  - `expressionGraph` runs an expression on a real `Tape` (src/core/autodiff) and reads it back: every tape entry is
 *    a node, its `inputs` are the edges, the forward order is the tape's order. The reverse pass is `backward` itself:
 *    its `onStep` reports, for each entry, the incoming gradient and each input's contribution, in the order the
 *    engine computes them, and its returned map gives every node's final gradient. Where a value is used twice,
 *    `backward` adds the contributions (accumulation); the reader only reports them.
 *  - `exampleGraph` reads one training example of a recorded run (an NPM trace): every instruction is a node and its
 *    `operands[].ref` are the edges, so the graph is exactly the dataflow the engine executed and recorded.
 *
 * Expressions are not training runs, so they produce no NPM record (decision D3); screens label them "computed by
 * the engine's automatic differentiation".
 */
import { Tape, backward, type Var } from '../../core/autodiff';
import type { Instruction } from '../../core/npm/ir';
import { Tensor } from '../../core/tensor/tensor';

export interface ExprNode {
  /** Index in `nodes`: inputs first (in the order given), then one node per tape entry, in forward order. */
  id: number;
  kind: 'input' | 'op';
  /** The engine op that produced it (`add`, `mul` …); null for an input. */
  op: string | null;
  /** The input's name, or the op's symbol. */
  label: string;
  value: number;
  /** Node ids of the op's inputs, in the op's argument order. */
  inputs: number[];
}

export interface ReverseStep {
  /** The node whose gradient rule ran. */
  node: number;
  /** ∂f/∂(this node), as it arrived: the incoming gradient. */
  incoming: number;
  /** What this step sends to each of its inputs (its local derivative × the incoming gradient). */
  contributions: { to: number; value: number }[];
}

export interface ExprGraph {
  nodes: ExprNode[];
  /** The node whose derivatives are taken. */
  output: number;
  /** The reverse pass, in the engine's order (`backward`'s `onStep`). */
  reverse: ReverseStep[];
  /** Final ∂f/∂node for every node on a path to the output (`backward`'s returned map). */
  grads: Record<number, number>;
}

/** Symbols for the ops a learner meets in Experiment 05. Any other registered op is shown by its name. */
const SYMBOL: Record<string, string> = {
  add: '+',
  sub: '−',
  mul: '×',
  div: '÷',
  square: '( )²',
  sigmoid: 'σ',
};

export type ExprBuild<K extends string> = (
  op: (name: string, ...inputs: Var[]) => Var,
  x: Record<K, Var>,
) => Var;

/** Runs `build` on a fresh tape, with every input a leaf that requires a gradient, and reads the graph back. */
export function expressionGraph<K extends string>(inputs: Record<K, number>, build: ExprBuild<K>): ExprGraph {
  const tape = new Tape();
  const names = Object.keys(inputs) as K[];
  const leaves = {} as Record<K, Var>;
  for (const k of names) {
    if (!Number.isFinite(inputs[k])) throw new Error(`${k} must be a finite number`);
    leaves[k] = tape.leaf(Tensor.scalar(inputs[k]), true, k);
  }
  const out = build((name, ...vars) => tape.apply(name, vars), leaves);

  const nodeOf = new Map<number, number>();
  const nodes: ExprNode[] = [];
  for (const k of names) {
    nodeOf.set(leaves[k].id, nodes.length);
    nodes.push({
      id: nodes.length,
      kind: 'input',
      op: null,
      label: k,
      value: leaves[k].value.item(),
      inputs: [],
    });
  }
  for (const e of tape.entries) {
    const inputsOf = e.inputs.map((v) => {
      const n = nodeOf.get(v.id);
      if (n === undefined) throw new Error('an expression may use only its own inputs and results');
      return n;
    });
    nodeOf.set(e.output.id, nodes.length);
    nodes.push({
      id: nodes.length,
      kind: 'op',
      op: e.op,
      label: SYMBOL[e.op] ?? e.op,
      value: e.output.value.item(),
      inputs: inputsOf,
    });
  }

  const reverse: ReverseStep[] = [];
  const g = backward(tape, out, undefined, (s) => {
    reverse.push({
      node: nodeOf.get(s.entry.output.id)!,
      incoming: s.gradOutput.item(),
      contributions: s.entry.inputs.flatMap((v, k) => {
        const c = s.gradInputs[k];
        return c ? [{ to: nodeOf.get(v.id)!, value: c.item() }] : [];
      }),
    });
  });
  const grads: Record<number, number> = {};
  for (const [varId, t] of g) {
    const n = nodeOf.get(varId);
    if (n !== undefined) grads[n] = t.item();
  }
  return { nodes, output: nodeOf.get(out.id)!, reverse, grads };
}

/** The expression's value alone, from the same engine ops (used for finite differences). */
export function expressionValue<K extends string>(inputs: Record<K, number>, build: ExprBuild<K>): number {
  const g = expressionGraph(inputs, build);
  return g.nodes[g.output].value;
}

/**
 * The central finite difference (f(x + h) − f(x − h)) / 2h for one input: two engine evaluations, divided here.
 * It estimates the derivative from outside, without the graph, so it can check automatic differentiation.
 */
export function finiteDifference<K extends string>(
  inputs: Record<K, number>,
  build: ExprBuild<K>,
  wrt: K,
  h = 1e-4,
): number {
  const up = expressionValue({ ...inputs, [wrt]: inputs[wrt] + h }, build);
  const down = expressionValue({ ...inputs, [wrt]: inputs[wrt] - h }, build);
  return (up - down) / (2 * h);
}

// ---------------------------------------------------------------- one recorded training example

export interface ExampleGraph {
  /** The example's own steps, in recorded order: forward, loss, backward (layer-end markers left out). */
  steps: Instruction[];
  /** Values the example reads that were made before it: parameters (INIT_PARAM or the last APPLY_UPDATE). */
  sources: Instruction[];
  /** Every edge: from the instruction that produced a value to the instruction that used it. */
  edges: { from: number; to: number; slot: string; role: string }[];
}

const MARKERS = new Set(['FORWARD_LAYER_END', 'BACKWARD_LAYER_END']);

/**
 * One example's graph from a run's instructions (`all` must hold every instruction it refers to). Edges are the
 * recorded `operands[].ref`; a reference to a layer-end marker is followed to the value the marker repeats.
 */
export function exampleGraph(all: Instruction[], epoch: number, batch: number): ExampleGraph {
  const byId = new Map(all.map((i) => [i.id, i]));
  const steps = all.filter(
    (i) =>
      i.path.epoch === epoch &&
      i.path.batch === batch &&
      i.path.sample !== null &&
      (i.path.phase === 'forward' || i.path.phase === 'loss' || i.path.phase === 'backward') &&
      !MARKERS.has(i.kind),
  );
  if (!steps.length) throw new Error(`no example ${batch + 1} in epoch ${epoch + 1} of this record`);
  const own = new Set(steps.map((i) => i.id));
  const resolve = (ref: number): number => {
    let r = ref;
    for (let guard = 0; guard < 4; guard++) {
      const i = byId.get(r);
      if (!i || !MARKERS.has(i.kind) || !i.operands.length) break;
      r = i.operands[0].ref;
    }
    return r;
  };
  const edges: ExampleGraph['edges'] = [];
  const sourceIds = new Set<number>();
  for (const s of steps)
    for (const o of s.operands) {
      const from = resolve(o.ref);
      if (!own.has(from)) sourceIds.add(from);
      edges.push({ from, to: s.id, slot: o.slot, role: o.role });
    }
  const sources = [...sourceIds]
    .sort((a, b) => a - b)
    .map((id) => {
      const i = byId.get(id);
      if (!i) throw new Error(`instruction #${id} is not in the given record`);
      return i;
    });
  return { steps, sources, edges };
}
