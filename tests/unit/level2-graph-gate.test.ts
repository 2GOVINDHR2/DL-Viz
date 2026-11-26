/**
 * Stage 5 gate (docs/LEVEL-2-ARCHITECTURE.md §8): before Experiment 05 shows a computational graph, its two readers
 * (src/learn/engine/graph.ts) are checked against values computed here independently:
 *  - an expression's graph, forward values and reverse-pass gradients, against hand derivatives, the engine's own
 *    `withGradient`, and central finite differences;
 *  - accumulation: where a value is used twice, its contributions add up to exactly the gradient `backward` returns;
 *  - one recorded training example: every edge (`operands[].ref`) leads to the value the instruction actually used,
 *    shown by recomputing each forward and backward result by hand from the values at the ends of its edges.
 * Results are written to reports/level2-graph-gate.json.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveDataset } from '../../src/core/engine/host';
import type { Instruction } from '../../src/core/npm/ir';
import { storeSource } from '../../src/core/npm/source';
import { TraceStore } from '../../src/core/npm/store';
import {
  exampleGraph,
  expressionGraph,
  finiteDifference,
  type ExprBuild,
} from '../../src/learn/engine/graph';
import { withGradient } from '../../src/learn/engine/expr';
import { networkConfig } from '../../src/learn/level2/exp04/Experiment04';

const results: Record<string, unknown> = {};
afterAll(() => {
  writeFileSync(
    resolve(import.meta.dirname, '../../reports/level2-graph-gate.json'),
    JSON.stringify(results, null, 2) + '\n',
  );
});
const relErr = (a: number, b: number): number => Math.abs(a - b) / Math.max(1e-8, Math.abs(a), Math.abs(b));

type X3 = 'x₁' | 'x₂' | 'x₃';
const product: ExprBuild<X3> = (op, x) => op('mul', op('add', x['x₁'], x['x₂']), x['x₃']);

describe('Stage 5 gate: expression graphs on the engine’s tape', () => {
  const points: Record<X3, number>[] = [
    { 'x₁': 2, 'x₂': -1, 'x₃': 3 },
    { 'x₁': 0.5, 'x₂': 0.25, 'x₃': -4 },
    { 'x₁': -3, 'x₂': 3, 'x₃': 7 },
    { 'x₁': 1e-3, 'x₂': 2.5, 'x₃': 0 },
  ];

  it('G1 (x₁ + x₂)·x₃: nodes, forward order, values and gradients against hand, withGradient and finite differences', () => {
    let worstFd = 0;
    for (const p of points) {
      const g = expressionGraph(p, product);
      // Three inputs, then the add, then the multiply: the tape's forward order.
      expect(g.nodes.map((n) => n.op)).toEqual([null, null, null, 'add', 'mul']);
      expect(g.nodes[3].inputs).toEqual([0, 1]);
      expect(g.nodes[4].inputs).toEqual([3, 2]);
      expect(g.output).toBe(4);
      const s = p['x₁'] + p['x₂'];
      expect(g.nodes[3].value).toBe(s);
      expect(g.nodes[4].value).toBe(s * p['x₃']);
      // Reverse order: the multiply's rule runs first, then the add's.
      expect(g.reverse.map((r) => g.nodes[r.node].op)).toEqual(['mul', 'add']);
      expect(g.reverse[0].incoming).toBe(1);
      // Hand derivatives: ∂f/∂x₁ = ∂f/∂x₂ = x₃, ∂f/∂x₃ = x₁ + x₂, ∂f/∂(x₁+x₂) = x₃.
      expect(g.grads[0]).toBe(p['x₃']);
      expect(g.grads[1]).toBe(p['x₃']);
      expect(g.grads[2]).toBe(s);
      expect(g.grads[3]).toBe(p['x₃']);
      // The same gradients as the engine's withGradient (Experiments 03 and 04).
      const w = withGradient(p, (b, x) => b.op('mul', b.op('add', x['x₁'], x['x₂']), x['x₃']));
      expect([g.grads[0], g.grads[1], g.grads[2]]).toEqual([w.grad['x₁'], w.grad['x₂'], w.grad['x₃']]);
      // Central finite differences: an estimate from outside the graph.
      (['x₁', 'x₂', 'x₃'] as X3[]).forEach((k, i) => {
        const fd = finiteDifference(p, product, k);
        worstFd = Math.max(worstFd, Math.abs(fd - g.grads[i]));
        expect(Math.abs(fd - g.grads[i])).toBeLessThan(1e-8);
      });
    }
    results.G1 = { points: points.length, worstAbsoluteFiniteDifferenceGap: worstFd };
  });

  it('G2 accumulation: x used twice in f = x·y + x; the two contributions add up to exactly backward’s gradient', () => {
    const f: ExprBuild<'x' | 'y'> = (op, v) => op('add', op('mul', v.x, v.y), v.x);
    const rows = [];
    for (const p of [
      { x: 2, y: 3 },
      { x: -1.5, y: 0.25 },
      { x: 0, y: -2 },
    ]) {
      const g = expressionGraph(p, f);
      const toX = g.reverse.flatMap((r) => r.contributions.filter((c) => c.to === 0).map((c) => c.value));
      // One contribution through the multiply (y) and one through the add (1).
      expect(toX).toEqual([1, p.y]);
      expect(toX[0] + toX[1]).toBe(g.grads[0]);
      expect(g.grads[0]).toBe(p.y + 1);
      expect(g.grads[1]).toBe(p.x);
      expect(relErr(finiteDifference(p, f, 'x'), g.grads[0])).toBeLessThan(1e-8);
      rows.push({ ...p, contributions: toX, gradient: g.grads[0] });
    }
    results.G2 = rows;
  });

  it('G3 random expressions with shared values: every node’s contributions sum to its gradient; gradients match finite differences', () => {
    let seed = 7;
    const rand = (): number => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    const ops2 = ['add', 'sub', 'mul'];
    let worstRel = 0;
    let nodesChecked = 0;
    for (let trial = 0; trial < 60; trial++) {
      const p = { a: rand() * 2 - 1, b: rand() * 2 - 1, c: rand() * 2 - 1 };
      const plan = Array.from({ length: 6 }, () => ({
        unary: rand() < 0.3 ? (rand() < 0.5 ? 'square' : 'sigmoid') : null,
        op: ops2[Math.floor(rand() * 3)],
        i: rand(),
        j: rand(),
      }));
      // Each step combines two earlier values (often reusing one), so values are shared.
      const build: ExprBuild<'a' | 'b' | 'c'> = (op, v) => {
        const vals = [v.a, v.b, v.c];
        for (const s of plan) {
          let r = op(s.op, vals[Math.floor(s.i * vals.length)], vals[Math.floor(s.j * vals.length)]);
          if (s.unary) r = op(s.unary, r);
          vals.push(r);
        }
        return vals[vals.length - 1];
      };
      const g = expressionGraph(p, build);
      const sums: Record<number, number> = {};
      for (const r of g.reverse)
        for (const c of r.contributions)
          // As backward does: the first contribution as it is, later ones added to it.
          sums[c.to] = sums[c.to] === undefined ? c.value : sums[c.to] + c.value;
      for (const [node, grad] of Object.entries(g.grads)) {
        if (Number(node) === g.output) continue;
        // backward adds the contributions in the same order, so the sum is exact, not approximate.
        expect(sums[Number(node)], `trial ${trial} node ${node}`).toBe(grad);
        nodesChecked++;
      }
      for (const [k, i] of [
        ['a', 0],
        ['b', 1],
        ['c', 2],
      ] as const) {
        const fd = finiteDifference(p, build, k, 1e-5);
        const ad = g.grads[i] ?? 0;
        const rel = Math.abs(fd - ad) / Math.max(1, Math.abs(ad));
        worstRel = Math.max(worstRel, rel);
        expect(rel, `trial ${trial} ${k}`).toBeLessThan(1e-6);
      }
    }
    results.G3 = { expressions: 60, nodesChecked, worstRelativeFiniteDifferenceGap: worstRel };
  });
});

describe('Stage 5 gate: one recorded training example as a graph', () => {
  const { store } = TraceStore.generate({ ...networkConfig(), epochs: 1 }, resolveDataset({ kind: 'xor' }), {
    embedDatasetLimit: 0,
  });
  const src = storeSource(store);
  const all = src.range(0, src.length);
  const byId = new Map(all.map((i) => [i.id, i]));
  const val = (i: Instruction, slot: string): number[] => Array.from(i.results[slot].data);
  const sig = (z: number): number => 1 / (1 + Math.exp(-z));

  it('G4 every edge leads to the value the instruction used: each result recomputed by hand from its edges', () => {
    const rows = [];
    for (let batch = 0; batch < 4; batch++) {
      const g = exampleGraph(all, 0, batch);
      const into = (id: number) => g.edges.filter((e) => e.to === id);
      const from = (id: number, role: string): number[] => {
        const e = into(id).find((x) => x.role === role)!;
        return val(byId.get(e.from)!, e.slot);
      };
      let checked = 0;
      for (const s of g.steps) {
        // Edges always point back in time.
        for (const e of into(s.id)) expect(e.from).toBeLessThan(s.id);
        const out = s.results.out ? val(s, 'out') : s.results.grad ? val(s, 'grad') : null;
        switch (s.kind) {
          case 'MATMUL': {
            const x = from(s.id, 'input');
            const W = from(s.id, 'weight');
            const n = out!.length;
            out!.forEach((v, j) =>
              expect(v).toBeCloseTo(
                x.reduce((t, xi, i) => t + xi * W[i * n + j], 0),
                14,
              ),
            );
            checked++;
            break;
          }
          case 'ADD_BIAS': {
            const u = from(s.id, 'input');
            const b = from(s.id, 'bias');
            out!.forEach((v, j) => expect(v).toBeCloseTo(u[j] + b[j], 14));
            checked++;
            break;
          }
          case 'ACTIVATE': {
            const z = from(s.id, 'preactivation');
            out!.forEach((v, j) => expect(v).toBeCloseTo(sig(z[j]), 14));
            checked++;
            break;
          }
          case 'GRAD_ACTIVATE': {
            const up = from(s.id, 'upstream');
            const a = from(s.id, 'activation');
            out!.forEach((v, j) => expect(v).toBeCloseTo(up[j] * a[j] * (1 - a[j]), 14));
            checked++;
            break;
          }
          case 'GRAD_MATMUL_W': {
            const up = from(s.id, 'upstream');
            const x = from(s.id, 'input');
            const n = up.length;
            out!.forEach((v, k) => expect(v).toBeCloseTo(x[Math.floor(k / n)] * up[k % n], 14));
            checked++;
            break;
          }
          case 'GRAD_MATMUL_X': {
            const up = from(s.id, 'upstream');
            const W = from(s.id, 'weight');
            const n = up.length;
            out!.forEach((v, i) =>
              expect(v).toBeCloseTo(
                up.reduce((t, gj, j) => t + gj * W[i * n + j], 0),
                14,
              ),
            );
            checked++;
            break;
          }
          case 'GRAD_BIAS': {
            const up = from(s.id, 'upstream');
            out!.forEach((v, j) => expect(v).toBeCloseTo(up[j], 14));
            checked++;
            break;
          }
        }
      }
      // Example 1 reads the starting parameters; later examples read the previous example's updates.
      const kinds = g.sources.map((i) => i.kind);
      expect(kinds).toEqual(Array(4).fill(batch === 0 ? 'INIT_PARAM' : 'APPLY_UPDATE'));
      expect(g.sources.map((i) => i.meta.param)).toEqual(['L1.W', 'L1.b', 'L2.W', 'L2.b']);
      // One backward pass gives a gradient for every one of the network's 9 parameter values.
      const gradValues = g.steps
        .filter((i) => i.kind === 'GRAD_MATMUL_W' || i.kind === 'GRAD_BIAS')
        .reduce((t, i) => t + i.results.grad.size, 0);
      expect(gradValues).toBe(9);
      expect(g.steps.filter((i) => i.kind === 'GRAD_INIT')).toHaveLength(1);
      rows.push({
        example: batch + 1,
        steps: g.steps.length,
        edges: g.edges.length,
        resultsRecomputed: checked,
      });
    }
    results.G4 = rows;
  });

  it('G5 the reader refuses what is not there', () => {
    expect(() => exampleGraph(all, 0, 7)).toThrow(/no example 8/);
    expect(() =>
      exampleGraph(
        all.filter((i) => i.kind !== 'INIT_PARAM'),
        0,
        0,
      ),
    ).toThrow(/not in the given record/);
    expect(() => expressionGraph({ x: Number.NaN }, (op, v) => op('square', v.x))).toThrow(/finite/);
  });
});
