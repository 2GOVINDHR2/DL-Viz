/**
 * Several series over epochs or updates on one chart (Level 3). Series are told apart by colour and by line pattern,
 * and listed in a legend with their last value; a table with every value is available on request. The values are
 * passed in from engine runs; the chart only draws them.
 */
import { fmt } from '../../format';
import { Disclosure } from '../../components/ui';

export interface Series {
  label: string;
  values: number[];
}

const COLORS = [
  'var(--lv-input)',
  'var(--lv-incorrect)',
  'var(--lv-weight)',
  'var(--lv-bias)',
  'var(--lv-correct)',
];
const DASHES = [undefined, '7 4', '2 3', '10 3 2 3', '4 4'];

export function RunsChart({
  series,
  title,
  xLabel = 'epoch',
  log = false,
  marker,
  cap,
  height = 230,
}: {
  series: Series[];
  title: string;
  xLabel?: string;
  /** Logarithmic loss axis (losses from 0.001 to 10 on one chart). */
  log?: boolean;
  /** A 0-based position to mark with a vertical line. */
  marker?: number;
  /** Values above the cap are drawn at the cap (the table holds the exact values). */
  cap?: number;
  height?: number;
}) {
  const W = 560;
  const H = height;
  const m = { l: 52, r: 14, t: 12, b: 32 };
  const n = Math.max(...series.map((s) => s.values.length), 2);
  const finite = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const top = Math.min(cap ?? Infinity, Math.max(...finite, 1e-6));
  // A linear axis spans the data (parameter values can be negative); a log axis needs positive values.
  const low = Math.min(...finite, 0);
  const bottom = log ? Math.max(Math.min(...finite.filter((v) => v > 0), top / 10), 1e-4) : low;
  const lo = log ? Math.log10(bottom) : low;
  const hi = log ? Math.log10(top) : top + (top - low) * 0.05;
  const x = (i: number): number => m.l + (i * (W - m.l - m.r)) / Math.max(1, n - 1);
  const y = (v: number): number => {
    const c = Math.min(Number.isFinite(v) ? v : top, top);
    const q = log ? Math.log10(Math.max(c, bottom)) : c;
    return H - m.b - ((q - lo) / (hi - lo || 1)) * (H - m.t - m.b);
  };
  const ticks = log
    ? Array.from({ length: Math.floor(hi) - Math.ceil(lo) + 1 }, (_, i) => 10 ** (Math.ceil(lo) + i))
    : low < 0
      ? [low, 0, top]
      : [0, hi / 2, hi];
  const desc = series
    .map((s) => `${s.label}: from ${fmt(s.values[0], 3)} to ${fmt(s.values.at(-1), 3)}`)
    .join('; ');
  return (
    <figure style={{ margin: 0, maxWidth: 680 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${desc}.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="lv-svg-grid" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="lv-svg-muted">
              {fmt(t, Math.abs(t) < 0.01 && t !== 0 ? 3 : 2)}
            </text>
          </g>
        ))}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text key={i} x={x(i)} y={H - m.b + 16} textAnchor="middle" className="lv-svg-muted">
            {i + 1}
          </text>
        ))}
        <text x={W - m.r} y={H - 2} textAnchor="end" className="lv-svg-muted">
          {xLabel} →
        </text>
        {marker !== undefined && (
          <line
            x1={x(marker)}
            x2={x(marker)}
            y1={m.t}
            y2={H - m.b}
            stroke="var(--lv-text)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        )}
        {series.map((s, k) => (
          <path
            key={s.label}
            d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')}
            fill="none"
            stroke={COLORS[k % COLORS.length]}
            strokeWidth={2.5}
            strokeDasharray={DASHES[k % DASHES.length]}
          />
        ))}
      </svg>
      <ul className="lv-legend">
        {series.map((s, k) => (
          <li key={s.label}>
            <svg width="28" height="8" aria-hidden="true">
              <line
                x1="0"
                y1="4"
                x2="28"
                y2="4"
                stroke={COLORS[k % COLORS.length]}
                strokeWidth="2.5"
                strokeDasharray={DASHES[k % DASHES.length]}
              />
            </svg>
            {s.label} · last {fmt(s.values.at(-1), 4)}
          </li>
        ))}
      </ul>
      <Disclosure summary={`${title}: every value as a table`}>
        <div className="lv-table-wrap" tabIndex={0} role="region" aria-label={`${title}, as a table`}>
          <table className="lv-table lv-small">
            <thead>
              <tr>
                <th scope="col">{xLabel}</th>
                {series.map((s) => (
                  <th key={s.label} scope="col">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }, (_, i) => (
                <tr key={i}>
                  <td className="num">{i + 1}</td>
                  {series.map((s) => (
                    <td key={s.label} className="num">
                      {s.values[i] === undefined ? '—' : fmt(s.values[i], 4)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </figure>
  );
}
