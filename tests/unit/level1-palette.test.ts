/**
 * The Level 1 palette (ADR-083). Checked the same way as the workbench palette (tests/unit/cvd.test.ts, unchanged):
 *  - every semantic colour keeps 3:1 against the surfaces it is drawn on (WCAG 1.4.11, non-text graphics);
 *  - body and secondary text keep 4.5:1 (WCAG 1.4.3);
 *  - every pair that carries meaning keeps ΔE ≥ 15 under normal vision, protanopia and deuteranopia;
 *  - correct and incorrect also differ in lightness by ≥ 0.1 (OKLab L) under all three, so they survive where hue fails;
 *  - learn.css declares exactly the values in tokens.ts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MEANING_PAIRS, ROLES, THEMES } from '../../src/learn/design/tokens';
import { contrast, deltaE, lightness, type Vision } from '../support/colour';

const VISIONS: Vision[] = ['normal', 'protan', 'deutan'];
const CSS = readFileSync(resolve(import.meta.dirname, '../../src/learn/learn.css'), 'utf8');

function cssBlock(selector: string): Record<string, string> {
  const start = CSS.indexOf(selector);
  const body = CSS.slice(CSS.indexOf('{', start) + 1, CSS.indexOf('}', start));
  return Object.fromEntries(
    [...body.matchAll(/--lv-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]),
  );
}

describe('Level 1 palette', () => {
  for (const [name, t] of Object.entries(THEMES)) {
    describe(`${name} theme`, () => {
      it('semantic colours keep 3:1 against the surface and the page background', () => {
        for (const r of ROLES)
          for (const bg of [t.surface, t.bg])
            expect(contrast(t.roles[r], bg), `${r} on ${bg}`).toBeGreaterThanOrEqual(3);
      });
      it('text and secondary text keep 4.5:1 on every background they appear on', () => {
        for (const bg of [t.surface, t.bg, t.surface2, t.tints.positive, t.tints.negative]) {
          expect(contrast(t.text, bg)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(t.muted, bg), `muted on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(t.accentText, t.accent)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t.focus, t.surface)).toBeGreaterThanOrEqual(3);
      });
      for (const p of MEANING_PAIRS)
        it(`${p.a} vs ${p.b} (${p.why}): ΔE ≥ 15 for normal vision, protanopia and deuteranopia`, () => {
          for (const v of VISIONS)
            expect(deltaE(t.roles[p.a], t.roles[p.b], v), v).toBeGreaterThanOrEqual(15);
        });
      it('correct and incorrect differ in lightness as well as hue', () => {
        for (const v of VISIONS)
          expect(
            Math.abs(lightness(t.roles.correct, v) - lightness(t.roles.incorrect, v)),
            v,
          ).toBeGreaterThanOrEqual(0.1);
      });
    });
  }

  it('learn.css declares the token values (light, dark by preference, dark by choice)', () => {
    const blocks = {
      light: cssBlock(':root {'),
      darkPref: cssBlock(":root:not([data-theme='light'])"),
      darkSet: cssBlock(":root[data-theme='dark']"),
    };
    for (const [b, theme] of [
      ['light', THEMES.light],
      ['darkPref', THEMES.dark],
      ['darkSet', THEMES.dark],
    ] as const) {
      const css = blocks[b];
      for (const r of ROLES) expect(css[r], `${b} ${r}`).toBe(theme.roles[r]);
      expect(css.bg).toBe(theme.bg);
      expect(css.surface).toBe(theme.surface);
      expect(css.text).toBe(theme.text);
      expect(css.muted).toBe(theme.muted);
      expect(css['tint-positive']).toBe(theme.tints.positive);
    }
  });
});
