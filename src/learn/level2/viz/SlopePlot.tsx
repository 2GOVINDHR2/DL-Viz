/**
 * A curve with a point on it and the tangent there. The curve's points, the point's value and its slope are engine
 * values passed in. The tangent is drawn as the straight line through (x₀, f(x₀)) with that slope. Drawing it is
 * geometry; it computes nothing that is shown as a result. Non-colour cues: the slope's sign is also written
 * (↗ uphill, ↘ downhill, → flat).
 */
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { fmt } from '../../format';

export const slopeWord = (s: number): string =>
  Math.abs(s) < 0.05
    ? '→ flat (zero slope)'
    : s > 0
      ? '↗ uphill (positive slope)'
      : '↘ downhill (negative slope)';

export function SlopePlot({
  curve,
  x0,
  value,
  slope,
  path,
  width = 560,
  height = 260,
  yMax,
  title,
}: {
  curve: { x: number; y: number }[];
  x0: number;
  value: number;
  slope: number;
  /** Optional steps of a descent, drawn as numbered points. */
  path?: { x: number; y: number }[];
  width?: number;
  height?: number;
  yMax?: number;
  title: string;
}) {
  const m = { l: 40, r: 14, t: 14, b: 32 };
  const xs = curve.map((p) => p.x);
  const x = scaleLinear()
    .domain([Math.min(...xs), Math.max(...xs)])
    .range([m.l, width - m.r]);
  const top = yMax ?? Math.max(...curve.map((p) => p.y));
  const y = scaleLinear()
    .domain([0, top])
    .range([height - m.b, m.t]);
  const d =
    line<{ x: number; y: number }>()
      .x((p) => x(p.x))
      .y((p) => y(p.y))(curve) ?? '';
  const span = (x.domain()[1] - x.domain()[0]) * 0.18;
  const t1 = { x: x0 - span, y: value - slope * span };
  const t2 = { x: x0 + span, y: value + slope * span };
  const inside = (p: { x: number; y: number }): boolean => p.y >= 0 && p.y <= top;
  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title}. At x = ${fmt(x0, 2)} the value is ${fmt(value, 3)} and the slope is ${fmt(slope, 3)}: ${slopeWord(slope)}.`}
      >
        <defs>
          <clipPath id="lv-slope-clip">
            <rect x={m.l} y={m.t} width={width - m.l - m.r} height={height - m.t - m.b} />
          </clipPath>
        </defs>
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} className="lv-svg-grid" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="lv-svg-muted">
              {fmt(t, 1)}
            </text>
          </g>
        ))}
        {x.ticks(6).map((t) => (
          <text key={t} x={x(t)} y={height - m.b + 16} textAnchor="middle" className="lv-svg-muted">
            {fmt(t, 1)}
          </text>
        ))}
        <path d={d} className="lv-curve" />
        <g clipPath="url(#lv-slope-clip)">
          <line
            x1={x(t1.x)}
            y1={y(t1.y)}
            x2={x(t2.x)}
            y2={y(t2.y)}
            stroke="var(--lv-bias)"
            strokeWidth={3}
            strokeDasharray="8 4"
          />
          {path?.map((p, k) =>
            inside(p) ? (
              <g key={k}>
                {k > 0 && inside(path[k - 1]) && (
                  <line
                    x1={x(path[k - 1].x)}
                    y1={y(path[k - 1].y)}
                    x2={x(p.x)}
                    y2={y(p.y)}
                    stroke="var(--lv-weight)"
                    strokeWidth={1.5}
                  />
                )}
                <circle cx={x(p.x)} cy={y(p.y)} r={5} fill="var(--lv-weight)" stroke="var(--lv-surface)" />
                <text
                  x={x(p.x)}
                  y={y(p.y) - 9}
                  textAnchor="middle"
                  className="lv-svg-mono"
                  style={{ fontSize: 11 }}
                >
                  {k}
                </text>
              </g>
            ) : null,
          )}
        </g>
        <circle
          cx={x(x0)}
          cy={y(value)}
          r={8}
          fill="var(--lv-surface)"
          stroke="var(--lv-bias)"
          strokeWidth={3}
        />
      </svg>
      <figcaption className="lv-small lv-muted">{title}</figcaption>
    </figure>
  );
}
