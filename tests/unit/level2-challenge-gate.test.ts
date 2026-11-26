/**
 * Stage 6 gate (docs/LEVEL-2-ARCHITECTURE.md §8): before the final challenge is built, check that
 *  - every configuration the challenge offers trains in the engine, records finite values, and keeps every epoch
 *    within the explorer's read limit;
 *  - `readBatch` (src/learn/level2/exp05/challenge.ts) reports exactly what the record holds, checked against a
 *    forward pass, loss, backpropagation, batch mean and update worked out here by hand from the parameter values the
 *    record says the batch started from.
 * Results are written to reports/level2-challenge-gate.json.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveDataset } from '../../src/core/engine/host';
import type { Instruction } from '../../src/core/npm/ir';
import { storeSource } from '../../src/core/npm/source';
import { TraceStore } from '../../src/core/npm/store';
import {
  CHALLENGE_DATASET,
  CHALLENGE_DEFAULTS,
  CHALLENGE_OPTIONS,
  challengeConfig,
  epochCheck,
  readBatch,
  type ChallengeSettings,
} from '../../src/learn/level2/exp05/challenge';
import { EPOCH_READ_LIMIT } from '../../src/learn/trace/store';

const results: Record<string, unknown> = {};
afterAll(() => {
  writeFileSync(
    resolve(import.meta.dirname, '../../reports/level2-challenge-gate.json'),
    JSON.stringify(results, null, 2) + '\n',
  );
});

const data = resolveDataset(CHALLENGE_DATASET);
const X = (i: number): number[] => [data.xs.data[2 * i], data.xs.data[2 * i + 1]];
const Y = (i: number): number => data.ys.data[i];
const run = (s: ChallengeSettings) => {
  const { store } = TraceStore.generate(challengeConfig(s), data, { embedDatasetLimit: 0 });
  const src = storeSource(store);
  return { src, header: store.header, all: src.range(0, src.length) };
};

const act = (name: string, z: number): number =>
  name === 'tanh' ? Math.tanh(z) : name === 'relu' ? Math.max(0, z) : 1 / (1 + Math.exp(-z));
const dAct = (name: string, z: number, a: number): number =>
  name === 'tanh' ? 1 - a * a : name === 'relu' ? (z > 0 ? 1 : 0) : a * (1 - a);

/** One example by hand: W1 [2×h] row-major, b1 [h], W2 [h×1], b2 [1]; BCE on a sigmoid output. */
function byHand(x: number[], y: number, p: Record<string, number[]>, h: number, activation: string) {
  const z1 = Array.from(
    { length: h },
    (_, j) => x[0] * p['L1.W'][j] + x[1] * p['L1.W'][h + j] + p['L1.b'][j],
  );
  const a1 = z1.map((z) => act(activation, z));
  const z2 = a1.reduce((t, a, j) => t + a * p['L2.W'][j], p['L2.b'][0]);
  const a2 = 1 / (1 + Math.exp(-z2));
  const loss = -(y * Math.log(a2) + (1 - y) * Math.log(1 - a2));
  const d2 = a2 - y;
  const d1 = a1.map((a, j) => p['L2.W'][j] * d2 * dAct(activation, z1[j], a));
  return {
    prediction: a2,
    loss,
    grads: {
      'L2.W': a1.map((a) => a * d2),
      'L2.b': [d2],
      'L1.W': [...d1.map((d) => x[0] * d), ...d1.map((d) => x[1] * d)],
      'L1.b': d1,
    } as Record<string, number[]>,
  };
}

const close = (a: number[], b: number[], tol: number): number => {
  expect(a.length).toBe(b.length);
  let worst = 0;
  a.forEach((v, i) => {
    worst = Math.max(worst, Math.abs(v - b[i]));
  });
  expect(worst).toBeLessThan(tol);
  return worst;
};

describe('Stage 6 gate: the challenge’s configurations', () => {
  it('G1 every offered configuration trains, records finite values, and fits the explorer’s per-epoch read limit', () => {
    const rows: Record<string, unknown>[] = [];
    for (const units of CHALLENGE_OPTIONS.units)
      for (const activation of CHALLENGE_OPTIONS.activation)
        for (const lr of CHALLENGE_OPTIONS.lr)
          for (const batchSize of CHALLENGE_OPTIONS.batchSize) {
            const s = { units, activation, lr, batchSize };
            const { header, all } = run(s);
            const perEpoch = header.epochStarts.slice(1).map((v, i) => v - header.epochStarts[i]);
            expect(Math.max(...perEpoch), JSON.stringify(s)).toBeLessThanOrEqual(EPOCH_READ_LIMIT);
            const finite = all.every((i) =>
              Object.values(i.results).every((t) => Array.from(t.data).every(Number.isFinite)),
            );
            expect(finite, JSON.stringify(s)).toBe(true);
            const first = epochCheck(all, 0);
            const last = epochCheck(all, header.epochStarts.length - 2);
            rows.push({
              ...s,
              instructions: all.length,
              maxPerEpoch: Math.max(...perEpoch),
              lossAfterEpoch1: first.loss,
              lossAfterLast: last.loss,
              accuracyAfterLast: last.accuracy,
            });
          }
    expect(rows).toHaveLength(81);
    results.G1 = {
      configurations: rows.length,
      largestEpoch: Math.max(...rows.map((r) => r.maxPerEpoch as number)),
      readLimit: EPOCH_READ_LIMIT,
      worstFinalAccuracy: Math.min(...rows.map((r) => r.accuracyAfterLast as number)),
      rows,
    };
  });
});

describe('Stage 6 gate: one update taken apart from the record, against the hand calculation', () => {
  for (const batchSize of CHALLENGE_OPTIONS.batchSize)
    it(`G2 batch size ${batchSize}: prediction, loss, gradients, batch mean and update by hand, at the start, middle and end of the run`, async () => {
      const s = { ...CHALLENGE_DEFAULTS, batchSize };
      const { src, header, all } = run(s);
      const fetch = async (id: number): Promise<Instruction> => src.get(id);
      const epochs = header.epochStarts.length - 1;
      const batches = Math.ceil(40 / batchSize);
      let worst = 0;
      let checked = 0;
      let previousAfter: Record<string, number[]> | null = null;
      for (const [epoch, batch] of [
        [0, 0],
        [0, Math.min(1, batches - 1)],
        [Math.floor(epochs / 2), Math.floor(batches / 2)],
        [epochs - 1, batches - 1],
      ]) {
        const v = await readBatch(all, epoch, batch, 'L2', fetch);
        expect(v.examples).toHaveLength(Math.min(batchSize, 40 - batch * batchSize));
        // The parameters this batch started from, as the record says.
        const p: Record<string, number[]> = Object.fromEntries(v.updates.map((u) => [u.param, u.before]));
        if (epoch === 0 && batch === 0) {
          // The very first batch reads the starting values.
          for (const u of v.updates) expect(src.get(u.ids.before).kind).toBe('INIT_PARAM');
        }
        if (previousAfter && epoch === 0 && batch === 1)
          for (const u of v.updates) expect(u.before).toEqual(previousAfter[u.param]);
        const sums: Record<string, number[]> = {};
        for (const e of v.examples) {
          expect(e.x).toEqual(X(e.datasetIndex));
          expect(e.target).toBe(Y(e.datasetIndex));
          const h = byHand(e.x, e.target, p, s.units, s.activation);
          // The forward steps: each layer's weighted sum, bias and activation; the last is the prediction.
          expect(e.forward.map((i) => `${i.kind}:${i.path.layer}`)).toEqual([
            'MATMUL:L1',
            'ADD_BIAS:L1',
            'ACTIVATE:L1',
            'MATMUL:L2',
            'ADD_BIAS:L2',
            'ACTIVATE:L2',
          ]);
          expect(e.forward.at(-1)!.results.out.data[0]).toBe(e.prediction);
          const u1 = Array.from(e.forward[0].results.out.data);
          worst = Math.max(
            worst,
            close(
              u1,
              u1.map((_, j) => e.x[0] * p['L1.W'][j] + e.x[1] * p['L1.W'][s.units + j]),
              1e-12,
            ),
          );
          worst = Math.max(worst, close([e.prediction], [h.prediction], 1e-12));
          worst = Math.max(worst, close([e.loss], [h.loss], 1e-9));
          for (const k of Object.keys(h.grads)) {
            worst = Math.max(worst, close(e.grads[k].values, h.grads[k], 1e-12));
            sums[k] = (sums[k] ?? h.grads[k].map(() => 0)).map((t, i) => t + h.grads[k][i]);
          }
          checked++;
        }
        for (const u of v.updates) {
          const n = v.examples.length;
          expect(u.averaged).toBe(n);
          expect(u.lr).toBe(s.lr);
          worst = Math.max(
            worst,
            close(
              u.mean,
              sums[u.param].map((t) => t / n),
              1e-12,
            ),
          );
          worst = Math.max(
            worst,
            close(
              u.delta,
              u.mean.map((g) => -s.lr * g),
              1e-15,
            ),
          );
          worst = Math.max(
            worst,
            close(
              u.after,
              u.before.map((b, i) => b + u.delta[i]),
              1e-15,
            ),
          );
        }
        previousAfter = Object.fromEntries(v.updates.map((u) => [u.param, u.after]));
      }
      results[`G2-batch${batchSize}`] = { examplesChecked: checked, worstAbsoluteGap: worst };
    });

  it('G3 the reader refuses what is not there', async () => {
    const { src, all } = run(CHALLENGE_DEFAULTS);
    await expect(readBatch(all, 0, 99, 'L2', async (id) => src.get(id))).rejects.toThrow(/no batch 100/);
    expect(() => epochCheck(all, 99)).toThrow(/epoch 100/);
  });
});
