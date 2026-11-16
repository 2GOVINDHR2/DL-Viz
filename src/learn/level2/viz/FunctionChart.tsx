/**
 * Curves sampled from the engine (each point is an engine evaluation), with an optional marker at the current
 * input. The vertical axis is fixed by the caller; points above it are drawn at the top edge and the chart says so,
 * so a cut-off curve is never mistaken for a flat one.
 */
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { fmt } from '../../format';

export interface Series {
  label: string;
  points: { x: number; y: number }[];
  /** Colour role and dash pattern: every series differs in both. */
  stroke: string;
  dash?: string;
}

export function FunctionChart({
  series,
  marker,
  xLabel,
  yLabel,
  yMax,
  title,
  width = 560,
  height = 240,
}: {
  series: Series[];
  marker?: number;
  xLabel: string;
  yLabel: string;
  yMax: number;
  title: string;
  width?: number;
  height?: number;
}) {
  const m = { l: 46, r: 14, t: 14, b: 38 };
  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const x = scaleLinear()
    .domain([Math.min(...xs), Math.max(...xs)])
    .range([m.l, width - m.r]);
  const y = scaleLinear()
    .domain([0, yMax])
    .range([height - m.b, m.t]);
  const clipped = series.some((s) => s.points.some((p) => p.y > yMax));
  const at = (s: Series): { x: number; y: number } | null => {
    if (marker === undefined) return null;
    let best = s.points[0];
    for (const p of s.points) if (Math.abs(p.x - marker) < Math.abs(best.x - marker)) best = p;
    return best;
  };
  const desc = series
    .map((s) => {
      const p = at(s);
      return `${s.label}${p ? `: ${fmt(p.y, 3)} at ${xLabel} = ${fmt(p.x, 2)}` : ''}`;
    })
    .join('; ');
  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title}. ${desc}.${clipped ? ` Values above ${yMax} run off the top of the chart.` : ''}`}
      >
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} className="lv-svg-grid" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="lv-svg-muted">
              {fmt(t, 1)}
            </text>
          </g>
        ))}
        {x.ticks(5).map((t) => (
          <text key={t} x={x(t)} y={height - m.b + 16} textAnchor="middle" className="lv-svg-muted">
            {fmt(t, 1)}
          </text>
        ))}
        <text x={width - m.r} y={height - 4} textAnchor="end" className="lv-svg-muted">
          {xLabel} →
        </text>
        <text x={4} y={m.t + 2} className="lv-svg-muted" dominantBaseline="hanging">
          {yLabel}
        </text>
        {series.map((s) => (
          <path
            key={s.label}
            d={
              line<{ x: number; y: number }>()
                .x((p) => x(p.x))
                .y((p) => y(Math.min(p.y, yMax)))(s.points) ?? ''
            }
            fill="none"
            stroke={s.stroke}
            strokeWidth={2.5}
            strokeDasharray={s.dash}
          />
        ))}
        {marker !== undefined && (
          <line
            x1={x(marker)}
            x2={x(marker)}
            y1={m.t}
            y2={height - m.b}
            stroke="var(--lv-text)"
            strokeDasharray="3 3"
          />
        )}
        {series.map((s) => {
          const p = at(s);
          return p ? (
            <circle
              key={s.label}
              cx={x(p.x)}
              cy={y(Math.min(p.y, yMax))}
              r={6}
              fill="var(--lv-surface)"
              stroke={s.stroke}
              strokeWidth={3}
            />
          ) : null;
        })}
      </svg>
      <figcaption className="lv-small lv-muted">
        {title}
        {clipped ? ` Values above ${yMax} run off the top of the chart.` : ''}
      </figcaption>
      <ul className="lv-legend">
        {series.map((s) => (
          <li key={s.label}>
            <svg width="26" height="6" aria-hidden="true">
              <line x1="0" x2="26" y1="3" y2="3" stroke={s.stroke} strokeWidth="3" strokeDasharray={s.dash} />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
