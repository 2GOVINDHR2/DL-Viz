/**
 * Level 2 vocabulary follows its experiments (LEVEL2_TERMS): each page is rendered and fails if it uses a term
 * scheduled for a later Level 2 experiment, or one that belongs to a later level. Level 1 terms are all allowed.
 * Every page must also mark its engine values.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LEVEL2_TERMS, type Level2Id } from '../../src/experiments/level2';
import { L2Experiment01 } from '../../src/learn/level2/Experiment01';
import { L2Experiment02 } from '../../src/learn/level2/Experiment02';
import { Level2Landing } from '../../src/learn/pages/Level2Landing';

const ORDER: Level2Id[] = ['01', '02', '03', '04', '05'];

/** Visible text: tags removed; recorded step names (MATMUL, ADD_BIAS) and the pager's titles are names, not vocabulary. */
const text = (html: string): string =>
  html
    .replace(/<nav class="lv-pager"[\s\S]*?<\/nav>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ');

function violations(id: Level2Id, t: string): string[] {
  return LEVEL2_TERMS.filter((term) => term.from === 'later' || ORDER.indexOf(term.from) > ORDER.indexOf(id))
    .filter((term) => term.pattern.test(t))
    .map((term) => {
      const k = t.search(term.pattern);
      return `${term.label}: “…${t.slice(Math.max(0, k - 40), k + 30).replace(/\s+/g, ' ')}…”`;
    });
}

describe('Level 2 vocabulary', () => {
  it('the check is not vacuous: planted later terms are found', () => {
    expect(
      violations('01', 'the gradient, by the chain rule, with momentum').map((v) => v.split(':')[0]),
    ).toEqual(['gradient', 'chain rule', 'momentum']);
    expect(violations('03', 'the gradient')).toEqual([]);
  });

  for (const [id, page] of [
    ['01', L2Experiment01],
    ['02', L2Experiment02],
  ] as const)
    it(`Experiment ${id} uses no term taught later, and marks its engine values`, () => {
      const html = renderToStaticMarkup(createElement(page));
      expect(violations(id, text(html))).toEqual([]);
      expect(html).toMatch(/Computed by the engine/);
    });

  it('the landing page names only the level’s topics, and no term of a later level', () => {
    const t = text(renderToStaticMarkup(createElement(Level2Landing)));
    expect(LEVEL2_TERMS.filter((x) => x.from === 'later' && x.pattern.test(t)).map((x) => x.label)).toEqual(
      [],
    );
  });
});
