/**
 * Level 3 vocabulary follows its experiments (LEVEL3_TERMS): every open page is rendered, and fails if it uses a
 * term scheduled for a later Level 3 experiment or for a later level. Level 1 and Level 2 terms are all allowed.
 * Every page must mark its engine values. The landing page must name no later-level term.
 */
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LEVEL3_TERMS, type Level3Id } from '../../src/experiments/level3';
import { LEVEL_3 } from '../../src/learn/curriculum';
import { L3Experiment01 } from '../../src/learn/level3/Experiment01';
import { L3Experiment02 } from '../../src/learn/level3/Experiment02';
import { Level3Landing } from '../../src/learn/pages/Level3Landing';

const ORDER: Level3Id[] = ['01', '02', '03', '04'];
const PAGES: Partial<Record<Level3Id, () => ReactElement>> = {
  '01': L3Experiment01,
  '02': L3Experiment02,
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
});
