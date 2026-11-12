/**
 * Points and grid lines in a plane, as some layer left them. The coordinates are passed in from engine probes.
 * The plot draws them and computes nothing.
 */
import { scaleLinear } from 'd3-scale';
import type { ReactNode } from 'react';
import { fmt } from '../format';

export interface PlotPoint {
  x: number;
  y: number;
  cls: 0 | 1;
  label?: string;
}

export function TransformPlot({
  points,
  lines = [],
  frame = [-3, 3, -3, 3],
  title,
  size = 260,
  axes = ['x₁', 'x₂'],
  extra,
}: {
  points: PlotPoint[];
  lines?: { x: number; y: number }[][];
  frame?: [number, number, number, number];
  title: string;
  size?: number;
  axes?: [string, string];
  extra?: ReactNode;
}) {
  const m = 26;
  const sx = scaleLinear()
    .domain([frame[0], frame[1]])
    .range([m, size - 6]);
  const sy = scaleLinear()
    .domain([frame[2], frame[3]])
    .range([size - m, 6]);
  const clip = `lv-clip-${title.replace(/\W+/g, '')}`;
  const desc = points.map((p) => `${p.label ?? 'point'} at (${fmt(p.x)}, ${fmt(p.y)})`).join('; ');
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${title}. ${desc}.`}>
        <defs>
          <clipPath id={clip}>
            <rect x={m} y={6} width={size - 6 - m} height={size - m - 6} />
          </clipPath>
        </defs>
        <rect
          x={m}
          y={6}
          width={size - 6 - m}
          height={size - m - 6}
          fill="var(--lv-surface)"
          stroke="var(--lv-border)"
        />
        <line x1={sx(0)} x2={sx(0)} y1={6} y2={size - m} stroke="var(--lv-border)" strokeWidth={1.5} />
        <line x1={m} x2={size - 6} y1={sy(0)} y2={sy(0)} stroke="var(--lv-border)" strokeWidth={1.5} />
        <text x={size - 6} y={size - 8} textAnchor="end" className="lv-svg-muted">
          {axes[0]}
        </text>
        <text x={2} y={14} className="lv-svg-muted">
          {axes[1]}
        </text>
        <g clipPath={`url(#${clip})`}>
          {lines.map((l, i) => (
            <polyline
              key={i}
              points={l.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
              fill="none"
              stroke="var(--lv-weight)"
              strokeWidth={1.25}
              opacity={0.55}
            />
          ))}
          {extra && <g>{extra}</g>}
          {points.map((p, i) =>
            p.cls === 1 ? (
              <circle
                key={i}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={7}
                fill="var(--lv-input)"
                stroke="var(--lv-text)"
                strokeWidth={1.5}
              />
            ) : (
              <rect
                key={i}
                x={sx(p.x) - 6}
                y={sy(p.y) - 6}
                width={12}
                height={12}
                fill="var(--lv-surface)"
                stroke="var(--lv-text)"
                strokeWidth={2}
              />
            ),
          )}
        </g>
      </svg>
      <figcaption className="lv-small lv-muted">{title}</figcaption>
    </figure>
  );
}
