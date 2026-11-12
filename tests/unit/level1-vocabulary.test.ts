/**
 * Level 1's interface properties, ported from the workbench's UI tests (vocabulary, views-from-trace, no-future):
 *  - **vocabulary:** no Level 1 page uses a term scheduled for a later experiment (LEVEL1_TERMS), and no
 *    Levels 2+ term appears anywhere in Level 1;
 *  - **values from the engine:** every number on Experiment 01's neuron is the probe's;
 *  - **demonstrations are labelled:** the one simplified illustration says so.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  LEVEL1_TERMS,
  LEVEL1_EXPERIMENTS,
  EXP01_DEFAULTS,
  EXP04_DEFAULTS,
} from '../../src/experiments/level1';
import { Experiment01, neuronProbe, neuronValues } from '../../src/learn/level1/Experiment01';
import { Experiment02 } from '../../src/learn/level1/Experiment02';
import { Experiment03 } from '../../src/learn/level1/Experiment03';
import { Experiment04 } from '../../src/learn/level1/exp04/Experiment04';
import { TraceExplorer } from '../../src/learn/level1/exp04/TraceExplorer';
import { TrainingOverview } from '../../src/learn/level1/exp04/TrainingOverview';
import { inProcessEngine, setEngineFactory } from '../../src/learn/level1/exp04/engine';
import { useRun } from '../../src/learn/level1/exp04/store';
import { fmt } from '../../src/learn/format';

const PAGES = { '01': Experiment01, '02': Experiment02, '03': Experiment03, '04': Experiment04 } as const;
const ORDER = ['01', '02', '03', '04'];

/**
 * Visible text: tags removed. The code names of recorded steps (MATMUL, GRAD_BIAS) and the experiment titles in the
 * previous/next navigation are names, not vocabulary (as in the workbench's vocabulary test).
 */
const text = (html: string): string =>
  html
    .replace(/<nav class="lv-pager"[\s\S]*?<\/nav>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<(title|desc)[^>]*>[\s\S]*?<\/\1>/g, (m) => m.replace(/<[^>]+>/g, ' '))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ');

function violations(id: string, t: string): string[] {
  return LEVEL1_TERMS.filter((term) => term.from === 'later' || ORDER.indexOf(term.from) > ORDER.indexOf(id))
    .filter((term) => term.pattern.test(t))
    .map(
      (term) =>
        `${term.label}: “…${t.slice(Math.max(0, t.search(term.pattern) - 40), t.search(term.pattern) + 30).replace(/\s+/g, ' ')}…”`,
    );
}

let restore: ReturnType<typeof setEngineFactory>;
beforeAll(() => {
  restore = setEngineFactory(inProcessEngine);
  // Server renders read the store's current state (as the workbench tests do, ADR-050).
  (useRun as unknown as { getInitialState: () => unknown }).getInitialState = useRun.getState;
});
afterAll(() => {
  useRun.getState().dispose();
  setEngineFactory(restore);
});

describe('Level 1 vocabulary follows the experiments', () => {
  for (const e of LEVEL1_EXPERIMENTS)
    it(`Experiment ${e.id} uses no term taught later`, () => {
      const html = renderToStaticMarkup(createElement(PAGES[e.id]));
      expect(violations(e.id, text(html))).toEqual([]);
    });

  it('Experiment 04’s training view and trace explorer, after a real run, use no Levels 2+ term', async () => {
    await useRun.getState().train({ ...EXP04_DEFAULTS, epochs: 10 }, 'test');
    const h = useRun.getState().header!;
    for (const at of [-1, h.epochStarts[0] + 3, h.epochStarts[2] + 30, h.length - 1]) {
      await useRun.getState().jump(at);
      const html = renderToStaticMarkup(
        createElement(
          'div',
          null,
          createElement(TrainingOverview),
          createElement(TraceExplorer, { stale: false }),
        ),
      );
      expect(violations('04', text(html)), `at ${at}`).toEqual([]);
    }
  });
});

describe('Level 1 shows engine values', () => {
  it('Experiment 01’s neuron prints the probe’s values at the defaults', () => {
    const s = {
      ...EXP01_DEFAULTS,
      x: [...EXP01_DEFAULTS.x],
      w: [...EXP01_DEFAULTS.w],
      activation: 'sigmoid' as const,
    };
    const v = neuronValues(s, neuronProbe(s));
    const html = renderToStaticMarkup(createElement(Experiment01));
    for (const shown of [
      `z = ${fmt(v.z)}`,
      fmt(v.a, 3),
      `adds ${fmt(v.contributions[0])}`,
      `adds ${fmt(v.contributions[1])}`,
    ])
      expect(html, shown).toContain(shown);
  });
  it('every page marks engine values, and Experiment 04’s idea-only loop is labelled as an illustration', () => {
    for (const id of ORDER)
      expect(renderToStaticMarkup(createElement(PAGES[id as '01']))).toMatch(
        /Computed by the engine|computed by the engine/,
      );
    expect(renderToStaticMarkup(createElement(Experiment04))).toContain(
      'Idea only: the numbers are examples',
    );
  });
});
