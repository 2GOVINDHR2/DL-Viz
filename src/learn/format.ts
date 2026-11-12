/** Display formatting only: it never changes a value, it decides how many digits of an engine value to print. */
export function fmt(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return '—';
  if (Number.isNaN(v)) return 'NaN';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  const a = Math.abs(v);
  let s: string;
  if (a !== 0 && (a < 10 ** -digits || a >= 1e6)) s = v.toExponential(Math.max(1, digits - 1));
  else s = v.toFixed(digits);
  if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
  return s.replace(/^-/, '−');
}

/** A signed value, always with its sign. */
export const fmtSigned = (v: number, digits = 2): string => (v > 0 ? '+' : '') + fmt(v, digits);

export const pct = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${Math.round(v * 100)} %`;
