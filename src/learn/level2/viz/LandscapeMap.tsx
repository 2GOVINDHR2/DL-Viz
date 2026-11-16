/**
 * The loss L(w, b) over a rectangle of (w, b), from engine values: darker cells have a higher loss, and contour
 * lines join equal losses (marching squares over the engine grid). The current point, its downhill direction
 * (−gradient, from the engine) and any descent path are drawn on top. The arrow's length is scaled for visibility;
 * its direction is exact.
 */
import { scaleLinear } from 'd3-scale';
import { memo, useMemo } from 'react';
import { fmt } from '../../format';
import { contourSegments } from '../../viz/contour';
import type { LandscapeGrid } from '../exp03/math';

const Cells = memo(function Cells({
  grid,
  sx,
  sy,
}: {
  grid: LandscapeGrid;
  sx: (v: number) => number;
  sy: (v: number) => number;
}) {
  const { resolution: n, bounds, values } = grid;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const cw = (bounds[1] - bounds[0]) / n;
  const ch = (bounds[3] - bounds[2]) / n;
  const out = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const t = (Math.log(values[r * n + c]) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
      const x0 = sx(bounds[0] + c * cw);
      const y0 = sy(bounds[2] + (r + 1) * ch);
      out.push(
        <rect
          key={r * n + c}
          x={x0}
          y={y0}
          width={sx(bounds[0] + (c + 1) * cw) - x0 + 0.5}
          height={sy(bounds[2] + r * ch) - y0 + 0.5}
          fill="var(--lv-input)"
          opacity={0.08 + 0.6 * t}
        />,
      );
    }
  return <g aria-hidden="true">{out}</g>;
});

export function LandscapeMap({
  grid,
  point,
  gradient,
  path,
  size = 380,
  title,
}: {
  grid: LandscapeGrid;
  point: { w: number; b: number; loss: number };
  gradient: { dw: number; db: number };
  path: { w: number; b: number }[];
  size?: number;
  title: string;
}) {
  const m = 34;
  const [w0, w1, b0, b1] = grid.bounds;
  const sx = useMemo(
    () =>
      scaleLinear()
        .domain([w0, w1])
        .range([m, size - 8]),
    [w0, w1, size],
  );
  const sy = useMemo(
    () =>
      scaleLinear()
        .domain([b0, b1])
        .range([size - m, 8]),
    [b0, b1, size],
  );
  const levels = useMemo(() => {
    const v = [...grid.values].sort((a, b) => a - b);
    return [0.02, 0.1, 0.25, 0.45, 0.7].map((q) => v[Math.floor(q * (v.length - 1))]);
  }, [grid]);
  const segs = useMemo(() => levels.flatMap((l) => contourSegments(grid, l)), [grid, levels]);
  const lowest = useMemo(() => {
    let k = 0;
    grid.values.forEach((v, i) => (v < grid.values[k] ? (k = i) : 0));
    const n = grid.resolution;
    return {
      w: w0 + ((w1 - w0) * ((k % n) + 0.5)) / n,
      b: b0 + ((b1 - b0) * (Math.floor(k / n) + 0.5)) / n,
      v: grid.values[k],
    };
  }, [grid, w0, w1, b0, b1]);
  const len = Math.hypot(gradient.dw, gradient.db);
  const ux = len ? -gradient.dw / len : 0;
  const uy = len ? -gradient.db / len : 0;
  const ax = sx(point.w);
  const ay = sy(point.b);
  const arrow = 46;
  const ex = ax + ux * arrow;
  const ey = ay - uy * arrow;
  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${title}. Current point w = ${fmt(point.w, 2)}, b = ${fmt(point.b, 2)}, loss ${fmt(point.loss, 4)}. The gradient is (${fmt(gradient.dw, 3)}, ${fmt(gradient.db, 3)}); downhill is the opposite direction. ${path.length - 1} steps taken. The lowest loss on this grid, ${fmt(lowest.v, 4)}, is near w = ${fmt(lowest.w, 2)}, b = ${fmt(lowest.b, 2)}.`}
      >
        <defs>
          <marker
            id="lv-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--lv-incorrect)" />
          </marker>
        </defs>
        <clipPath id="lv-land-clip">
          <rect x={m} y={8} width={size - 8 - m} height={size - m - 8} />
        </clipPath>
        <rect x={m} y={8} width={size - 8 - m} height={size - m - 8} fill="var(--lv-surface)" />
        <Cells grid={grid} sx={sx} sy={sy} />
        {segs.map((s, i) => (
          <line
            key={i}
            x1={sx(s[0])}
            y1={sy(s[1])}
            x2={sx(s[2])}
            y2={sy(s[3])}
            stroke="var(--lv-text)"
            strokeWidth={0.8}
            opacity={0.5}
          />
        ))}
        {sx.ticks(5).map((t) => (
          <text key={`x${t}`} x={sx(t)} y={size - m + 16} textAnchor="middle" className="lv-svg-muted">
            {fmt(t, 0)}
          </text>
        ))}
        {sy.ticks(5).map((t) => (
          <text key={`y${t}`} x={m - 6} y={sy(t) + 4} textAnchor="end" className="lv-svg-muted">
            {fmt(t, 0)}
          </text>
        ))}
        <text x={size - 8} y={size - 4} textAnchor="end" className="lv-svg-muted">
          weight w →
        </text>
        <text
          x={m + 6}
          y={22}
          className="lv-svg-muted"
          style={{ paintOrder: 'stroke', stroke: 'var(--lv-surface)', strokeWidth: 3 }}
        >
          bias b ↑
        </text>
        <g aria-hidden="true">
          <circle
            cx={sx(lowest.w)}
            cy={sy(lowest.b)}
            r={6}
            fill="none"
            stroke="var(--lv-correct)"
            strokeWidth={3}
          />
          <text
            x={sx(lowest.w)}
            y={sy(lowest.b) + 20}
            textAnchor="middle"
            className="lv-svg-muted"
            style={{ fontSize: 11, paintOrder: 'stroke', stroke: 'var(--lv-surface)', strokeWidth: 3 }}
          >
            lowest on grid
          </text>
        </g>
        <g clipPath="url(#lv-land-clip)">
          {path.slice(1).map((p, k) => (
            <line
              key={k}
              x1={sx(path[k].w)}
              y1={sy(path[k].b)}
              x2={sx(p.w)}
              y2={sy(p.b)}
              stroke="var(--lv-weight)"
              strokeWidth={2}
            />
          ))}
          {path.map((p, k) => (
            <circle key={k} cx={sx(p.w)} cy={sy(p.b)} r={3.5} fill="var(--lv-weight)" />
          ))}
          {len > 0 && (
            <line
              x1={ax}
              y1={ay}
              x2={ex}
              y2={ey}
              stroke="var(--lv-incorrect)"
              strokeWidth={3}
              markerEnd="url(#lv-arrow)"
            />
          )}
          <circle cx={ax} cy={ay} r={7} fill="var(--lv-surface)" stroke="var(--lv-bias)" strokeWidth={3} />
        </g>
      </svg>
      {(point.w < w0 || point.w > w1 || point.b < b0 || point.b > b1) && (
        <p className="lv-small" role="status">
          The current point (w = {fmt(point.w, 2)}, b = {fmt(point.b, 2)}) is off this map: the last step was
          too long.
        </p>
      )}
      <figcaption className="lv-small lv-muted">{title}</figcaption>
      <ul className="lv-legend">
        <li>darker: higher loss</li>
        <li>thin lines: equal loss</li>
        <li>
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke="var(--lv-incorrect)" strokeWidth="3" />
          </svg>
          downhill (−gradient), length not to scale
        </li>
        <li>○ green: lowest loss on the grid</li>
        <li>purple dots: steps taken</li>
      </ul>
    </figure>
  );
}
