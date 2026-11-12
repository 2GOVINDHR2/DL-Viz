/**
 * Colour maths shared by the palette tests: WCAG 2 contrast, and colour-vision-deficiency simulation with the
 * Machado, Oliveira & Fernandes (2009) matrices at severity 1.0, distance as ΔE in OKLab × 100. The same method as
 * tests/unit/cvd.test.ts (which is kept untouched), factored out for the Level 1 palette test.
 */
export type RGB = [number, number, number];
const MACHADO: Record<'protan' | 'deutan', number[][]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};
export type Vision = 'normal' | 'protan' | 'deutan';
const hex = (h: string): RGB => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255) as RGB;
const lin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function oklab([r, g, b]: RGB): RGB {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
export function simulate(h: string, kind: Vision): RGB {
  const c = hex(h).map(lin) as RGB;
  if (kind === 'normal') return c;
  const M = MACHADO[kind];
  return M.map((row) => Math.min(1, Math.max(0, row[0] * c[0] + row[1] * c[1] + row[2] * c[2]))) as RGB;
}
export const deltaE = (a: string, b: string, kind: Vision): number => {
  const [x, y] = [oklab(simulate(a, kind)), oklab(simulate(b, kind))];
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
/** OKLab lightness (0–1) under a given vision. */
export const lightness = (h: string, kind: Vision = 'normal'): number => oklab(simulate(h, kind))[0];
export function contrast(a: string, b: string): number {
  const lum = (c: string): number => {
    const [r, g, bl] = hex(c).map(lin);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
