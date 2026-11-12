/**
 * The Level 1 design tokens: the one source of the colour meanings used across all four experiments.
 *
 * Colour carries meaning, never decoration:
 *  - input: inputs and neutral information (blue)
 *  - weight: weights and internal parameters (purple)
 *  - bias: bias and intermediate computation (orange)
 *  - correct: correct predictions and successful outputs (green)
 *  - incorrect: incorrect predictions, negative values, errors (red)
 *  - inactive: inactive or contextual (grey)
 *
 * These colours are for graphics only: strokes, fills, chips and markers, which need 3:1 against the surface
 * (WCAG 1.4.11). Values and labels are always printed in the body text colour, so text contrast never depends on a
 * semantic hue. Every colour-coded state also carries a label, symbol, shape or dash pattern.
 *
 * `learn.css` declares the same values as CSS custom properties; tests/unit/level1-palette.test.ts checks that the
 * two agree, and that every pair that carries meaning stays apart under protanopia and deuteranopia (ADR-083).
 */
export const ROLES = ['input', 'weight', 'bias', 'correct', 'incorrect', 'inactive'] as const;
export type Role = (typeof ROLES)[number];

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentText: string;
  focus: string;
  roles: Record<Role, string>;
  /** Light tints for areas (decision regions, highlighted rows); never the only cue. */
  tints: { positive: string; negative: string };
}

export const THEMES: Record<'light' | 'dark', ThemeTokens> = {
  light: {
    bg: '#f7f8fa',
    surface: '#ffffff',
    surface2: '#eef1f5',
    text: '#1a1f27',
    muted: '#4f5a69',
    border: '#d5dbe3',
    accent: '#1a56c4',
    accentText: '#ffffff',
    focus: '#1a56c4',
    roles: {
      input: '#2d7ff9',
      weight: '#5a21b5',
      bias: '#cc6f05',
      correct: '#2f9e7a',
      incorrect: '#a8231a',
      inactive: '#7b8595',
    },
    tints: { positive: '#dbe8fd', negative: '#f1f2f4' },
  },
  dark: {
    bg: '#0f1318',
    surface: '#171c23',
    surface2: '#1f2630',
    text: '#e7ecf2',
    muted: '#a6b0bd',
    border: '#2e3744',
    accent: '#8ab4ff',
    accentText: '#0f1318',
    focus: '#8ab4ff',
    roles: {
      input: '#3d7fe0',
      weight: '#d0b8ff',
      bias: '#ffb547',
      correct: '#7be0b0',
      incorrect: '#d9443b',
      inactive: '#6b7685',
    },
    tints: { positive: '#1c3050', negative: '#20262f' },
  },
};

/**
 * Pairs of roles that appear together and must be told apart. Each must keep ΔE ≥ 15 (OKLab × 100) under normal
 * vision, protanopia and deuteranopia, the threshold the existing CVD test uses. Correct/incorrect must also differ
 * in lightness, so it survives where hue fails.
 */
export const MEANING_PAIRS: { a: Role; b: Role; why: string }[] = [
  { a: 'input', b: 'weight', why: 'an input node and the weight on its connection' },
  { a: 'weight', b: 'bias', why: 'a weight and the bias of the same neuron' },
  { a: 'input', b: 'bias', why: 'an input node and the bias node' },
  { a: 'correct', b: 'incorrect', why: 'a correct and an incorrect prediction' },
  { a: 'input', b: 'incorrect', why: 'a positive and a negative value' },
  { a: 'correct', b: 'input', why: 'a correct marker over an input-coloured region' },
];
