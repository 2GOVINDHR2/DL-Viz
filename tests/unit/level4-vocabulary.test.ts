/**
 * Level 4 vocabulary follows its experiments (LEVEL4_TERMS): every open page is rendered and fails if it uses a term
 * scheduled for a later Level 4 experiment or for a later level. Levels 1–3 terms are all allowed. Every page must
 * mark its engine values. The landing page names no later-level term.
 *
 * Pages that train are also rendered with their own recorded run and the trace explorer at several points: the
 * forward pass, the loss, the backward pass, the accumulation, the update and the end of the run. At each point the
 * explorer must describe the current instruction with Level 4's words for it (not a generic fallback).
 */
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DatasetSpec } from '../../src/core/engine/protocol';
import type { TrainConfig } from '../../src/core/engine/session';
import {
  L4_BPTT,
  l4BpttConfig,
  L4_CNN,
  l4CnnConfig,
  L4_RNN,
  l4RnnConfig,
  LEVEL4_TERMS,
  type Level4Id,
} from '../../src/experiments/level4';
import { level3Wording } from '../../src/learn/level3/common/wording';
import type { TraceWording } from '../../src/learn/trace/wording';
import { LEVEL_4 } from '../../src/learn/curriculum';
import { level4Wording, RNN_KINDS } from '../../src/learn/level4/common/wording';
import { L4Experiment01 } from '../../src/learn/level4/Experiment01';
import { L4Experiment02 } from '../../src/learn/level4/Experiment02';
import { L4Experiment03 } from '../../src/learn/level4/Experiment03';
import { L4Experiment04 } from '../../src/learn/level4/Experiment04';
import { Level4Landing } from '../../src/learn/pages/Level4Landing';
import { inProcessEngine, setEngineFactory } from '../../src/learn/trace/engine';
import { renderCurrentRunState, useRun } from '../../src/learn/trace/store';

const ORDER: Level4Id[] = ['01', '02', '03', '04', '05', '06'];
const PAGES: Partial<Record<Level4Id, () => ReactElement>> = {
  '01': L4Experiment01,
  '02': L4Experiment02,
  '03': L4Experiment03,
  '04': L4Experiment04,
};

const text = (html: string): string =>
  html
    .replace(/<nav class="lv-pager"[\s\S]*?<\/nav>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ');

function violations(id: Level4Id, t: string): string[] {
  return LEVEL4_TERMS.filter((term) => term.from === 'later' || ORDER.indexOf(term.from) > ORDER.indexOf(id))
    .filter((term) => term.pattern.test(t))
    .map((term) => {
      const k = t.search(term.pattern);
      return `${term.label}: “…${t.slice(Math.max(0, k - 40), k + 30).replace(/\s+/g, ' ')}…”`;
    });
}

describe('Level 4 vocabulary', () => {
  it('the check is not vacuous', () => {
    expect(
      violations('01', 'the hidden state of an LSTM and its latent code').map((v) => v.split(':')[0]),
    ).toEqual(['hidden state', 'LSTM', 'latent']);
    expect(violations('06', 'the hidden state of an LSTM and its latent code')).toEqual([]);
    expect(violations('06', 'self-attention in a transformer')).toHaveLength(1);
  });

  it('every open experiment has a page here', () => {
    for (const id of LEVEL_4.open) expect(PAGES[id as Level4Id], id).toBeDefined();
  });

  for (const id of ORDER)
    it(`Experiment ${id} (when open) uses no term taught later, and marks its engine values`, () => {
      const page = PAGES[id];
      if (!page || !LEVEL_4.open.has(id)) return;
      const html = renderToStaticMarkup(createElement(page));
      expect(violations(id, text(html))).toEqual([]);
      expect(html).toMatch(/computed by the engine|Recorded training run|recorded/i);
    });

  it('the landing page names no term of a later level', () => {
    const t = text(renderToStaticMarkup(createElement(Level4Landing)));
    expect(LEVEL4_TERMS.filter((x) => x.from === 'later' && x.pattern.test(t)).map((x) => x.label)).toEqual(
      [],
    );
  });

  const RECORDED: [Level4Id, TrainConfig, DatasetSpec, string[], TraceWording?][] = [
    [
      '02',
      l4CnnConfig(),
      L4_CNN.dataset,
      [
        'CONV2D',
        'POOL',
        'FLATTEN',
        'COMPUTE_LOSS',
        'GRAD_CONV2D',
        'GRAD_POOL',
        'GRAD_ACCUMULATE',
        'COMPUTE_UPDATE',
        'APPLY_UPDATE',
      ],
    ],
    [
      '03',
      l4RnnConfig(),
      L4_RNN.dataset,
      [
        'SELECT_STEP',
        'MATMUL',
        'ADD',
        'ACTIVATE',
        'COMPUTE_LOSS',
        'GRAD_ACTIVATE',
        'GRAD_MATMUL_W',
        'GRAD_SUM',
        'GRAD_ACCUMULATE',
        'OPTIMIZER_STATE',
        'COMPUTE_UPDATE',
        'APPLY_UPDATE',
      ],
      level4Wording(RNN_KINDS, level3Wording({ optimizer: 'adam', decay: false })),
    ],
    [
      '04',
      l4BpttConfig(),
      L4_BPTT.dataset,
      [
        'SELECT_STEP',
        'ADD',
        'COMPUTE_LOSS',
        'GRAD_INIT',
        'GRAD_ACTIVATE',
        'GRAD_MATMUL_W',
        'GRAD_MATMUL_X',
        'GRAD_SUM',
        'GRAD_ACCUMULATE',
        'COMPUTE_UPDATE',
        'APPLY_UPDATE',
      ],
      level4Wording(RNN_KINDS, level3Wording({ optimizer: 'adam', decay: false })),
    ],
  ];
  for (const [id, config, dataset, kinds, words = level4Wording()] of RECORDED)
    it(`Experiment ${id}, trained, with its explorer at every kind of step, uses no later term and describes each step`, async () => {
      const restore = setEngineFactory(inProcessEngine);
      try {
        await useRun.getState().train(config, 'v', dataset);
        await useRun.getState().showEpoch(0);
        renderCurrentRunState();
        const h = useRun.getState().header!;
        const epoch = await useRun.getState().read(h.epochStarts[0], h.epochStarts[1]);
        const points = kinds.map((k) => {
          const i = epoch.find((x) => x.kind === k);
          expect(i, k).toBeDefined();
          return { at: i!.id, kind: k };
        });
        points.push({ at: h.length - 1, kind: 'EPOCH_END' });
        for (const { at, kind } of points) {
          await useRun.getState().jump(at);
          const html = renderToStaticMarkup(createElement(PAGES[id]!));
          expect(html, `at ${at}`).toContain('The record of run');
          expect(violations(id, text(html)), `at ${at}`).toEqual([]);
          // The explorer names the step it is on with Level 4's words for that kind.
          expect(text(html), `${kind} at ${at}`).toContain(`Last step executed: ${words.kind(kind)}`);
          // The explorer describes a CNN layer by layer, and does not list an image's 64 pixels as inputs.
          expect(text(html)).not.toContain('→ ?');
          if (id === '03') {
            expect(text(html)).toContain('Network 5×1 → recurrent layer (4 hidden units)');
            // The parameter picker names W, U and b of the recurrent layer, not three times “Biases”.
            expect(text(html)).toContain('Recurrent weights U of hidden layer 1');
            expect(text(html)).toContain('Input weights W of hidden layer 1');
          }
          if (id === '02') {
            expect(text(html)).toContain('Network 1×8×8 → convolution 4 × 3×3 (relu) → max pooling 2×2');
            if (kind === 'CONV2D') expect(text(html)).toMatch(/Example #1: inputs \(64 values\)/);
          }
        }
      } finally {
        useRun.getState().dispose();
        setEngineFactory(restore);
      }
    }, 120_000);

  it('Level 4’s words cover the CNN and sequence steps (not the generic fallback)', () => {
    const words = level4Wording(RNN_KINDS);
    for (const k of ['SELECT_STEP', 'ADD', 'GRAD_SUM'])
      expect(words.kind(k)).not.toBe(k.toLowerCase().replace(/_/g, ' '));
    for (const k of ['CONV2D', 'POOL', 'FLATTEN', 'GRAD_CONV2D', 'GRAD_POOL', 'GRAD_FLATTEN'])
      expect(words.kind(k)).not.toBe(k.toLowerCase().replace(/_/g, ' '));
  });
});
