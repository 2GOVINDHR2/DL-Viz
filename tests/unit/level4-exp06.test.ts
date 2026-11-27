/**
 * Level 4, Experiment 06 (autoencoder): the run learns to reconstruct; one image's encoder and decoder recomputed by
 * hand from the recorded starting parameters (tanh, linear code, tanh, sigmoid) and its reconstruction loss as the
 * mean squared difference; the latent codes read for the latent space are the recorded L2 outputs; the measured
 * distances; the comparison of code sizes (a 1-number code is worst; no monotonicity is claimed); the live question.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EngineHost, resolveDataset } from '../../src/core/engine/host';
import { storeSource } from '../../src/core/npm/source';
import { epochSummaries } from '../../src/core/npm/state';
import { TraceStore } from '../../src/core/npm/store';
import { L4_AE, l4AeConfig } from '../../src/experiments/level4';
import { readLatents } from '../../src/learn/level4/common/aeRecord';
import { readExample, readParamAt } from '../../src/learn/level4/common/cnnRecord';
import { distances, L4Experiment06, lossQuestion, mse } from '../../src/learn/level4/Experiment06';

const { store } = TraceStore.generate(l4AeConfig(), resolveDataset(L4_AE.dataset), { embedDatasetLimit: 0 });
const src = storeSource(store);
const header = store.header;
const read = async (a: number, b: number) => src.range(a, b);
const dense = (x: number[], W: number[], b: number[], f: (v: number) => number) =>
  b.map((bj, j) => f(bj + x.reduce((s, v, i) => s + v * W[i * b.length + j], 0)));
const act = (ex: Awaited<ReturnType<typeof readExample>>, layer: string) =>
  Array.from(ex.layers[layer].find((i) => i.kind === 'ACTIVATE')!.results.out.data);
const near = (a: number[], b: number[], tol = 1e-12) =>
  a.forEach((x, j) => expect(Math.abs(x - b[j])).toBeLessThanOrEqual(tol));

describe('the recorded autoencoder run', () => {
  it('learns: the reconstruction loss falls from above 0.2 to below 0.07', () => {
    const ep = epochSummaries(src);
    expect(ep).toHaveLength(L4_AE.epochs);
    expect(ep[0].evalLoss).toBeGreaterThan(0.15);
    expect(ep.at(-1)!.evalLoss).toBeLessThan(0.07);
  });

  it('image 1 in epoch 1, by hand: encoder 25 → 8 → 2, decoder 2 → 8 → 25, loss = mean squared difference', async () => {
    const P: Record<string, number[]> = {};
    for (const l of ['L1', 'L2', 'L3', 'L4'])
      for (const r of ['W', 'b']) P[`${l}.${r}`] = await readParamAt(read, header, `${l}.${r}`, -1);
    const ex = await readExample(read, header, 0, 0);
    const h1 = dense(ex.x, P['L1.W'], P['L1.b'], Math.tanh);
    near(act(ex, 'L1'), h1);
    const z = dense(h1, P['L2.W'], P['L2.b'], (v) => v);
    expect(z).toHaveLength(2);
    near(act(ex, 'L2'), z);
    const h3 = dense(z, P['L3.W'], P['L3.b'], Math.tanh);
    near(act(ex, 'L3'), h3);
    const y = dense(h3, P['L4.W'], P['L4.b'], (v) => 1 / (1 + Math.exp(-v)));
    near(act(ex, 'L4'), y);
    expect(ex.target).toEqual(ex.x);
    expect(Math.abs(ex.loss - mse(ex.x, y))).toBeLessThan(1e-12);
  });

  it('the latent space reads every image’s recorded code and loss', async () => {
    const pts = await readLatents(read, header, 10);
    expect(pts.map((p) => p.index)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    for (const i of [0, 7, 23]) {
      const ex = await readExample(read, header, 10, i);
      expect(pts[i].code).toEqual(act(ex, 'L2'));
      expect(pts[i].loss).toBe(ex.loss);
    }
    const d = distances(pts);
    expect(d.within).toBeGreaterThan(0);
    expect(d.between).toBeGreaterThan(0);
  });

  it('distances() separates within-class and between-class pairs', () => {
    const pts = [0, 1, 2, 3, 4, 5].map((index) => ({ index, code: [index % 3, 0], loss: 0 }));
    // same class ↔ same code: within = 0; of the 12 different-class pairs, 8 are 1 apart and 4 are 2 apart.
    expect(distances(pts)).toEqual({ within: 0, between: (1 * 8 + 2 * 4) / 12 });
  });

  it('the live question’s answer is the recorded loss', async () => {
    const ex = await readExample(read, header, 149, 3);
    const q = lossQuestion(ex);
    const right = q.options.filter((o) => o.correct);
    expect(right).toHaveLength(1);
    expect(Number(right[0].text)).toBeCloseTo(ex.loss, 4);
    expect(lossQuestion(null).unavailable).toBeTruthy();
  });

  it('code sizes compared: a 1-number code reconstructs worst', () => {
    const r = new EngineHost().handle({
      op: 'compareRuns',
      configs: L4_AE.latents.map((k) => l4AeConfig(k)),
      dataset: L4_AE.dataset,
    });
    if (r.op !== 'compareRuns') throw new Error('unexpected reply');
    const last = r.runs.map((q) => q.losses.at(-1)!);
    expect(Math.max(...last)).toBe(last[0]);
  });
});

it('renders the page', () => {
  expect(renderToStaticMarkup(createElement(L4Experiment06))).toContain('The encoder');
});
