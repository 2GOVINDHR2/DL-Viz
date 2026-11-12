/**
 * A two-input classifier's decision boundary. The shaded region is where the network's output reaches `level`,
 * read cell by cell from the engine's evaluation grid. The line is where the grid crosses `level`. Points show
 * their target class by shape (filled circle = 1, open square = 0) and whether the network got them right by
 * symbol (✓ or ✕), as well as by colour.
 */
import { scaleLinear } from 'd3-scale';
import { memo, useMemo } from 'react';
import type { Grid } from '../engine/probe';
import { fmt } from '../format';
import { contourSegments, shareAbove } from './contour';

export interface BoundaryPoint {
  x: number[];
  target: number;
  /** The network's answer for this point, when the record holds it; without it no correctness is shown. */
  predicted?: number;
  label?: string;
}

const Regions = memo(function Regions({
  grid,
  level,
  sx,
  sy,
}: {
  grid: Grid;
  level: number;
  sx: (v: number) => number;
  sy: (v: number) => number;
}) {
  const { resolution: n, bounds, values } = grid;
  const cw = (bounds[1] - bounds[0]) / n;
  const ch = (bounds[3] - bounds[2]) / n;
  const rects = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (values[r * n + c] < level) continue;
      const x0 = sx(bounds[0] + c * cw);
      const y0 = sy(bounds[2] + (r + 1) * ch);
      rects.push(
        <rect
          key={r * n + c}
          x={x0}
          y={y0}
          width={sx(bounds[0] + (c + 1) * cw) - x0 + 0.5}
          height={sy(bounds[2] + r * ch) - y0 + 0.5}
          className="lv-region-pos"
        />,
      );
    }
  return <g aria-hidden="true">{rects}</g>;
});

export function DecisionBoundary({
  grid,
  level,
  points,
  size = 360,
  title,
  axes = ['x₁', 'x₂'],
}: {
  grid: Grid;
  level: number;
  points: BoundaryPoint[];
  size?: number;
  title: string;
  axes?: [string, string];
}) {
  const m = 34;
  const [x0, x1, y0, y1] = grid.bounds;
  const sx = useMemo(
    () =>
      scaleLinear()
        .domain([x0, x1])
        .range([m, size - 8]),
    [x0, x1, size],
  );
  const sy = useMemo(
    () =>
      scaleLinear()
        .domain([y0, y1])
        .range([size - m, 8]),
    [y0, y1, size],
  );
  const segs = useMemo(() => contourSegments(grid, level), [grid, level]);
  const share = shareAbove(grid, level);
  const judged = points.filter((p) => p.predicted !== undefined);
  const right = judged.filter((p) => p.predicted === p.target).length;
  const desc =
    `The region where the output is 1 covers about ${Math.round(share * 100)} % of the square` +
    (segs.length
      ? ', separated from the rest by the decision boundary. '
      : '; there is no boundary inside the square. ') +
    points
      .map((p) =>
        p.predicted === undefined
          ? `Point (${p.x.map((v) => fmt(v, 1)).join(', ')}): target ${p.target}.`
          : `Point (${p.x.map((v) => fmt(v, 1)).join(', ')}): target ${p.target}, output ${p.predicted}, ${p.predicted === p.target ? 'correct' : 'incorrect'}.`,
      )
      .join(' ') +
    (judged.length ? ` ${right} of ${judged.length} correct.` : '');
  const ticks = sx.ticks(4);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${title}. ${desc}`}>
        <rect x={m} y={8} width={size - 8 - m} height={size - m - 8} className="lv-region-neg" />
        <Regions grid={grid} level={level} sx={sx} sy={sy} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={8} y2={size - m} className="lv-svg-grid" opacity={0.6} />
            <line x1={m} x2={size - 8} y1={sy(t)} y2={sy(t)} className="lv-svg-grid" opacity={0.6} />
            <text x={sx(t)} y={size - m + 16} textAnchor="middle" className="lv-svg-muted">
              {fmt(t, 1)}
            </text>
            <text x={m - 6} y={sy(t) + 4} textAnchor="end" className="lv-svg-muted">
              {fmt(t, 1)}
            </text>
          </g>
        ))}
        <text x={size - 8} y={size - 4} textAnchor="end" className="lv-svg-muted">
          {axes[0]} →
        </text>
        <text x={4} y={14} className="lv-svg-muted">
          {axes[1]} ↑
        </text>
        {segs.map((s, i) => (
          <line
            key={i}
            x1={sx(s[0])}
            y1={sy(s[1])}
            x2={sx(s[2])}
            y2={sy(s[3])}
            className="lv-boundary-line"
          />
        ))}
        {points.map((p, i) => {
          const cx = sx(p.x[0]);
          const cy = sy(p.x[1]);
          const judgedHere = p.predicted !== undefined;
          const ok = p.predicted === p.target;
          return (
            <g key={i}>
              {judgedHere && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={17}
                  fill="none"
                  strokeWidth={3}
                  className={ok ? 'lv-pt-ok' : 'lv-pt-bad'}
                  strokeDasharray={ok ? undefined : '4 3'}
                />
              )}
              {p.target === 1 ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={9}
                  fill="var(--lv-input)"
                  stroke="var(--lv-text)"
                  strokeWidth={1.5}
                />
              ) : (
                <rect
                  x={cx - 8}
                  y={cy - 8}
                  width={16}
                  height={16}
                  fill="var(--lv-surface)"
                  stroke="var(--lv-text)"
                  strokeWidth={2}
                />
              )}
              {judgedHere && (
                <text x={cx + 20} y={cy - 12} className="lv-svg-mono" style={{ fontSize: 14 }}>
                  {ok ? '✓' : '✕'}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="lv-small lv-muted">{title}</figcaption>
    </figure>
  );
}

export function BoundaryLegend({
  positive = 'output 1',
  negative = 'output 0',
  marks = true,
}: {
  positive?: string;
  negative?: string;
  marks?: boolean;
}) {
  return (
    <ul className="lv-legend">
      <li>
        <svg width="18" height="14" aria-hidden="true">
          <rect width="18" height="14" className="lv-region-pos" stroke="var(--lv-border)" />
        </svg>
        shaded: {positive}
      </li>
      <li>
        <svg width="18" height="14" aria-hidden="true">
          <rect width="18" height="14" className="lv-region-neg" stroke="var(--lv-border)" />
        </svg>
        unshaded: {negative}
      </li>
      <li>
        <svg width="24" height="4" aria-hidden="true">
          <line x1="0" x2="24" y1="2" y2="2" className="lv-boundary-line" />
        </svg>
        decision boundary
      </li>
      <li>
        <svg width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="5" fill="var(--lv-input)" stroke="var(--lv-text)" />
        </svg>
        target 1
      </li>
      <li>
        <svg width="14" height="14" aria-hidden="true">
          <rect
            x="2"
            y="2"
            width="10"
            height="10"
            fill="var(--lv-surface)"
            stroke="var(--lv-text)"
            strokeWidth="2"
          />
        </svg>
        target 0
      </li>
      {marks && <li>✓ solid green ring: correct</li>}
      {marks && <li>✕ dashed red ring: incorrect</li>}
    </ul>
  );
}
