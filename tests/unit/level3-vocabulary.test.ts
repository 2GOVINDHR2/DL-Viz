/**
 * Level 3 vocabulary follows its experiments (LEVEL3_TERMS): every open page is rendered, and fails if it uses a
 * term scheduled for a later Level 3 experiment or for a later level. Level 1 and Level 2 terms are all allowed.
 * Every page must mark its engine values. The landing page must name no later-level term.
 */
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ADAM_DEFAULTS,
  L3_OVERFIT,
  L3_TASK,
  LEVEL3_TERMS,
  l3OverfitConfig,
  l3TaskConfig,
  type Level3Id,
} from '../../src/experiments/level3';
import type { DatasetSpec } from '../../src/core/engine/protocol';
import type { TrainConfig } from '../../src/core/engine/session';
import { LEVEL_3 } from '../../src/learn/curriculum';
import { L3Experiment01 } from '../../src/learn/level3/Experiment01';
import { L3Experiment02 } from '../../src/learn/level3/Experiment02';
import { L3Experiment03 } from '../../src/learn/level3/Experiment03';
import { L3Experiment04 } from '../../src/learn/level3/Experiment04';
import { Level3Landing } from '../../src/learn/pages/Level3Landing';
import { inProcessEngine, setEngineFactory } from '../../src/learn/trace/engine';
import { renderCurrentRunState, useRun } from '../../src/learn/trace/store';

const ORDER: Level3Id[] = ['01', '02', '03', '04'];
const PAGES: Partial<Record<Level3Id, () => ReactElement>> = {
  '01': L3Experiment01,
  '02': L3Experiment02,
  '03': L3Experiment03,
  '04': L3Experiment04,
};

const text = (html: string): string =>
  html
    .replace(/<nav class="lv-pager"[\s\S]*?<\/nav>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ');

function violations(id: Level3Id, t: string): string[] {
  return LEVEL3_TERMS.filter((term) => term.from === 'later' || ORDER.indexOf(term.from) > ORDER.indexOf(id))
    .filter((term) => term.pattern.test(t))
    .map((term) => {
      const k = t.search(term.pattern);
      return `${term.label}: “…${t.slice(Math.max(0, k - 40), k + 30).replace(/\s+/g, ' ')}…”`;
    });
}

describe('Level 3 vocabulary', () => {
  it('the check is not vacuous', () => {
    expect(violations('01', 'momentum and Adam and overfitting').map((v) => v.split(':')[0])).toEqual([
      'momentum',
      'Adam',
      'overfitting',
    ]);
    expect(violations('04', 'momentum and Adam and overfitting')).toEqual([]);
  });

  it('every open experiment has a page here', () => {
    for (const id of LEVEL_3.open) expect(PAGES[id as Level3Id], id).toBeDefined();
  });

  for (const id of ORDER)
    it(`Experiment ${id} (when open) uses no term taught later, and marks its engine values`, () => {
      const page = PAGES[id];
      if (!page || !LEVEL_3.open.has(id)) return;
      const html = renderToStaticMarkup(createElement(page));
      expect(violations(id, text(html))).toEqual([]);
      expect(html).toMatch(/Trained by the engine|Recorded training run|recorded/i);
    });

  it('the landing page names no term of a later level', () => {
    const t = text(renderToStaticMarkup(createElement(Level3Landing)));
    expect(LEVEL3_TERMS.filter((x) => x.from === 'later' && x.pattern.test(t)).map((x) => x.label)).toEqual(
      [],
    );
  });

  // Each page's own recorded run, as a learner would train it; the page is rendered with its trace explorer at
  // several points: the forward pass, the backward pass, the update section (where the optimiser's wording is
  // used) and the end of the run.
  const RECORDED: [Level3Id, TrainConfig, DatasetSpec][] = [
    ['01', l3TaskConfig({ type: 'sgd', lr: 2 }), L3_TASK.dataset],
    ['02', l3TaskConfig({ type: 'momentum', lr: 0.5, momentum: 0.9 }), L3_TASK.dataset],
    ['03', l3TaskConfig({ type: 'adam', lr: 0.05, ...ADAM_DEFAULTS }), L3_TASK.dataset],
    ['04', l3OverfitConfig(0.01), L3_OVERFIT.dataset],
  ];
  for (const [id, config, dataset] of RECORDED)
    it(`Experiment ${id}, trained, with its trace explorer at several points, uses no term taught later`, async () => {
      const restore = setEngineFactory(inProcessEngine);
      try {
        await useRun.getState().train(config, 'v', dataset);
        await useRun.getState().showEpoch(0);
        renderCurrentRunState();
        const h = useRun.getState().header!;
        const epoch = await useRun.getState().read(h.epochStarts[0], h.epochStarts[1]);
        const first = (k: string): number => epoch.find((i) => i.kind === k)!.id;
        // The forward and backward passes, every kind of the update section, and the end of the run.
        const points = [
          h.epochStarts[0] + 2,
          first('GRAD_ACTIVATE'),
          first('GRAD_ACCUMULATE'),
          ...(id === '01' ? [] : [first('OPTIMIZER_STATE')]),
          first('COMPUTE_UPDATE'),
          first('APPLY_UPDATE'),
          h.length - 1,
        ];
        for (const at of points) {
          await useRun.getState().jump(at);
          const html = renderToStaticMarkup(createElement(PAGES[id]!));
          expect(html, `at ${at}`).toContain('The record of run');
          expect(violations(id, text(html)), `at ${at}`).toEqual([]);
          // Plain gradient descent's rule is never shown for a run that is not plain gradient descent.
          if (id !== '01') expect(text(html), `at ${at}`).not.toMatch(/w ← w − η·g|−η·g:/);
        }
        await useRun.getState().jump(first('APPLY_UPDATE'));
        const note = text(renderToStaticMarkup(createElement(PAGES[id]!)));
        expect(note).toContain(
          { '01': 'The step is −η·g', '02': 'Δ = −η·v', '03': 'Δ = −η·m̂/(√v̂ + ε)', '04': 'of (ḡ + λ·w)' }[id],
        );
      } finally {
        useRun.getState().dispose();
        setEngineFactory(restore);
      }
    }, 60_000);
});
