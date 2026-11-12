/**
 * Where a grid of engine outputs crosses a level (the decision boundary), as line segments in input coordinates.
 * Marching squares over the cell centres, with linear interpolation along each edge. It only locates the crossing
 * between two values the engine computed. It computes no network value itself.
 */
import type { Grid } from '../engine/probe';

export type Segment = [number, number, number, number];

export function contourSegments(grid: Grid, level: number): Segment[] {
  const { resolution: n, bounds, values } = grid;
  const [x0, x1, y0, y1] = bounds;
  const cx = (c: number): number => x0 + ((x1 - x0) * (c + 0.5)) / n;
  const cy = (r: number): number => y0 + ((y1 - y0) * (r + 0.5)) / n;
  const v = (r: number, c: number): number => values[r * n + c] - level;
  const out: Segment[] = [];
  const lerp = (a: number, b: number): number => (a === b ? 0.5 : a / (a - b));
  for (let r = 0; r + 1 < n; r++)
    for (let c = 0; c + 1 < n; c++) {
      const a = v(r, c); // bottom-left
      const b = v(r, c + 1); // bottom-right
      const d = v(r + 1, c); // top-left
      const e = v(r + 1, c + 1); // top-right
      const pts: [number, number][] = [];
      if (a >= 0 !== b >= 0) pts.push([cx(c) + (cx(c + 1) - cx(c)) * lerp(a, b), cy(r)]);
      if (b >= 0 !== e >= 0) pts.push([cx(c + 1), cy(r) + (cy(r + 1) - cy(r)) * lerp(b, e)]);
      if (d >= 0 !== e >= 0) pts.push([cx(c) + (cx(c + 1) - cx(c)) * lerp(d, e), cy(r + 1)]);
      if (a >= 0 !== d >= 0) pts.push([cx(c), cy(r) + (cy(r + 1) - cy(r)) * lerp(a, d)]);
      if (pts.length === 2) out.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
      else if (pts.length === 4) {
        out.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
        out.push([pts[2][0], pts[2][1], pts[3][0], pts[3][1]]);
      }
    }
  return out;
}

/** Share of grid cells at or above the level: a text summary for screen readers. */
export function shareAbove(grid: Grid, level: number): number {
  let k = 0;
  for (const x of grid.values) if (x >= level) k++;
  return k / grid.values.length;
}
