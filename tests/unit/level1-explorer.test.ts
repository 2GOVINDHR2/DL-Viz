/**
 * Experiment 04 trains through the real engine and explores the real trace (ADR-085). These tests run the same
 * EngineHost the worker runs, in-process, through the store the page uses:
 *  - the run is a real NPM trace, deterministic for the same settings;
 *  - the hierarchy tiles each epoch exactly, uses the navigator's own units, and grows only as detail is asked for;
 *  - stepping works in both directions and returns to the same state;
 *  - nothing shown in the overview comes from later in the run than the cursor (the no-future property);
 *  - the largest Level 1 network stays within the one-epoch read limit.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveDataset } from '../../src/core/engine/host';
import { TraceStore, storeSource } from '../../src/core/npm';
import { unitBounds } from '../../src/core/npm/navigator';
import { EXP04_DEFAULTS } from '../../src/experiments/level1';
import { inProcessEngine, setEngineFactory } from '../../src/learn/trace/engine';
import { epochTree, nodesAt, type TreeNode } from '../../src/learn/trace/hierarchy';
import { toConfig } from '../../src/learn/level1/exp04/parts';
import { EPOCH_READ_LIMIT, useRun } from '../../src/learn/trace/store';

const small = { ...EXP04_DEFAULTS, epochs: 20 };
let restore: ReturnType<typeof setEngineFactory>;
beforeEach(() => {
  restore = setEngineFactory(inProcessEngine);
  useRun.getState().dispose();
});
afterEach(() => {
  useRun.getState().dispose();
  setEngineFactory(restore);
});

const flat = (nodes: TreeNode[]): TreeNode[] => nodes.flatMap((n) => [n, ...flat(n.children)]);

describe('Experiment 04: real training and the trace explorer', () => {
  it('training produces a real NPM trace, identical for identical settings', async () => {
    await useRun.getState().train(small, 'a');
    const s1 = useRun.getState();
    expect(s1.status).toBe('ready');
    const direct = TraceStore.generate(small, resolveDataset({ kind: 'xor' })).store;
    expect(s1.length).toBe(direct.length);
    expect(s1.header!.epochStarts).toEqual(direct.header.epochStarts);
    const losses = s1.epochs.map((e) => e.meanLoss);
    await useRun.getState().train(small, 'b');
    expect(useRun.getState().epochs.map((e) => e.meanLoss)).toEqual(losses);
    expect(useRun.getState().runs.map((r) => r.run)).toEqual([1, 2]);
  });

  it('the hierarchy tiles each epoch exactly and agrees with the navigator’s units', async () => {
    await useRun.getState().train(small, 'a');
    const { header } = useRun.getState();
    await useRun.getState().showEpoch(3);
    const ins = useRun.getState().epochView!.instructions;
    expect(ins[0].id).toBe(header!.epochStarts[3]);
    expect(ins.at(-1)!.id).toBe(header!.epochStarts[4] - 1);
    const src = storeSource(TraceStore.generate(small, resolveDataset({ kind: 'xor' })).store);
    for (const detail of ['stages', 'layers', 'operations'] as const) {
      const tree = epochTree(ins, header, detail);
      // Top-level nodes cover the epoch with no gap or overlap.
      let next = ins[0].id;
      for (const n of tree) {
        expect(n.first).toBe(next);
        next = n.last + 1;
      }
      expect(next).toBe(ins.at(-1)!.id + 1);
      for (const n of flat(tree)) {
        if (n.granularity === 'operation') continue;
        expect(unitBounds(src, n.first, n.granularity)).toEqual([n.first, n.last]);
      }
    }
    const kinds = (d: 'stages' | 'layers' | 'operations') =>
      new Set(flat(epochTree(ins, header, d)).map((n) => n.granularity));
    expect(kinds('stages').has('layer')).toBe(false);
    expect(kinds('stages').has('operation')).toBe(false);
    expect(kinds('layers').has('layer')).toBe(true);
    expect(kinds('layers').has('operation')).toBe(false);
    expect(kinds('operations').has('operation')).toBe(true);
    // Two batches per epoch with batch size 2.
    expect(epochTree(ins, header, 'stages').filter((n) => n.label.startsWith('Batch')).length).toBe(2);
  });

  it('steps forwards and backwards at every size, and returns to the same state', async () => {
    await useRun.getState().train(small, 'a');
    const run = useRun.getState();
    await run.jump(run.header!.epochStarts[2] + 5);
    const start = useRun.getState().cursor;
    for (const g of ['epoch', 'batch', 'sample', 'phase', 'layer', 'operation'] as const) {
      await useRun.getState().jump(start);
      await useRun.getState().step(1, g);
      const fwd = useRun.getState().cursor;
      expect(fwd, g).toBeGreaterThan(start);
      await useRun.getState().step(-1, g);
      const back = useRun.getState().cursor;
      expect(back, g).toBeLessThan(fwd);
      await useRun.getState().step(1, g);
      expect(useRun.getState().cursor, g).toBe(fwd);
    }
    const a = useRun.getState().exec!;
    await useRun.getState().jump(a.cursor);
    expect(JSON.stringify(useRun.getState().exec)).toBe(JSON.stringify(a));
  });

  it('the state at the cursor holds nothing from later in the run', async () => {
    await useRun.getState().train(small, 'a');
    const h = useRun.getState().header!;
    await useRun.getState().jump(h.epochStarts[5] + 10);
    const e = useRun.getState().exec!;
    expect(e.completedEpochs).toBe(5);
    expect(e.lastEval!.epoch).toBe(4);
    for (const p of Object.values(e.params)) expect(p.producedBy).toBeLessThanOrEqual(e.cursor);
    const history = await useRun.getState().history('L1.W');
    // Start plus one point per completed update; nothing past the cursor.
    expect(history.length).toBeLessThanOrEqual(1 + 5 * 2 + 1);
    expect(history.length).toBeGreaterThanOrEqual(1 + 5 * 2);
  });

  it('nodesAt follows the cursor down the hierarchy', async () => {
    await useRun.getState().train(small, 'a');
    const h = useRun.getState().header!;
    await useRun.getState().showEpoch(1);
    const tree = epochTree(useRun.getState().epochView!.instructions, h, 'operations');
    const path = nodesAt(tree, h.epochStarts[1] + 8);
    expect(path.map((n) => n.granularity)).toEqual(
      ['batch', 'sample', 'phase', 'layer', 'operation'].slice(0, path.length),
    );
    expect(path.length).toBeGreaterThanOrEqual(3);
  });

  it('the largest Level 1 network still lists an epoch at once', () => {
    const cfg = toConfig(
      EXP04_DEFAULTS,
      { hidden: [8, 8, 8], activation: 'relu' },
      { lr: 1, batchSize: 1, epochs: 2 },
    );
    const store = TraceStore.generate(cfg, resolveDataset({ kind: 'xor' })).store;
    const e = store.header.epochStarts;
    expect(e[1] - e[0]).toBeLessThan(EPOCH_READ_LIMIT);
  });

  it('reports a failed run instead of swallowing it', async () => {
    const bad = { ...small, batchSize: 0 };
    await useRun.getState().train(bad, 'bad');
    expect(useRun.getState().status).toBe('error');
    expect(useRun.getState().error).toMatch(/batchSize/);
  });
});
