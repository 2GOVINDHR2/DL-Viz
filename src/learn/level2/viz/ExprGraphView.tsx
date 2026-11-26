/**
 * An expression's computational graph at one point of its forward or reverse pass (Experiment 05). Everything shown
 * comes from `expressionGraph` (src/learn/engine/graph.ts): node values from the engine's tape, edge contributions
 * from `backward`'s report, and a node's gradient from `backward`'s returned map once every contribution to it has
 * arrived. Nothing is added up here.
 *
 * Forward and reverse are told apart by more than colour: forward edges are solid with values in the nodes; the
 * reverse pass draws dashed arrows pointing back along the edges, labelled with what each sends, and the gradients
 * appear in the boxes under the nodes ("∂f/∂…").
 */
import type { ExprGraph } from '../../engine/graph';
import { fmt, fmtSigned } from '../../format';
import { knownGradients, type Stage } from '../exp05/math';

export function ExprGraphView({
  g,
  stage,
  title,
}: {
  g: ExprGraph;
  stage: Stage;
  /** The expression, for the accessible name. */
  title: string;
}) {
  // Columns by depth: an operation one column after its deepest input; an input one column before its first use,
  // so an edge from an input does not run past other nodes.
  const depth: number[] = [];
  for (const n of g.nodes) if (n.kind === 'op') depth[n.id] = 0;
  for (const n of g.nodes)
    if (n.kind === 'op')
      depth[n.id] = 1 + Math.max(0, ...n.inputs.filter((i) => g.nodes[i].kind === 'op').map((i) => depth[i]));
  for (const n of g.nodes)
    if (n.kind === 'input') {
      const users = g.nodes.filter((m) => m.inputs.includes(n.id)).map((m) => depth[m.id]);
      depth[n.id] = users.length ? Math.min(...users) - 1 : 0;
    }
  const cols = Math.max(...depth) + 1;
  const byCol: number[][] = Array.from({ length: cols }, () => []);
  for (const n of g.nodes) byCol[depth[n.id]].push(n.id);
  const W = Math.max(520, 170 * cols + 80);
  const rows = Math.max(...byCol.map((c) => c.length));
  const H = Math.max(240, rows * 150 + 40);
  const pos = new Map<number, { x: number; y: number }>();
  byCol.forEach((ids, c) =>
    ids.forEach((id, r) =>
      pos.set(id, {
        x: 70 + c * ((W - 140) / Math.max(1, cols - 1)),
        y: ((r + 1) * H) / (ids.length + 1) - 10,
      }),
    ),
  );
  const opIds = g.nodes.filter((n) => n.kind === 'op').map((n) => n.id);
  const hasValue = (id: number): boolean => g.nodes[id].kind === 'input' || opIds.indexOf(id) < stage.forward;
  const grads = knownGradients(g, stage.reverse);
  const shownSteps = stage.reverse > 0 ? g.reverse.slice(0, stage.reverse) : [];
  const current = stage.phase === 'reverse' ? g.reverse[stage.reverse - 1]?.node : undefined;
  const currentOp = stage.phase === 'forward' && stage.forward > 0 ? opIds[stage.forward - 1] : undefined;
  const R = 26;

  const desc = g.nodes
    .map((n) => {
      const name = n.kind === 'input' ? n.label : `${n.op} node`;
      const v = hasValue(n.id) ? `value ${fmt(n.value, 4)}` : 'value not computed yet';
      const d = grads.has(n.id) ? `, gradient ${fmt(grads.get(n.id)!, 4)}` : '';
      return `${name}: ${v}${d}`;
    })
    .join('; ');

  return (
    <figure style={{ margin: 0 }}>
      <div
        className="lv-table-wrap"
        tabIndex={0}
        role="region"
        aria-label="The graph (scrolls sideways on narrow screens)"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ minWidth: Math.min(W, 520), display: 'block' }}
          role="img"
          aria-label={`Computational graph of f = ${title}, ${stage.phase} pass. ${desc}.`}
        >
          <defs>
            <marker
              id="lv-ad-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--lv-incorrect)" />
            </marker>
            <marker
              id="lv-ad-fwd"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--lv-muted)" />
            </marker>
          </defs>
          {g.nodes.flatMap((n) =>
            n.inputs.map((from, k) => {
              const a = pos.get(from)!;
              const b = pos.get(n.id)!;
              // What this op's reverse step sent back along this edge (matched by argument position).
              const sentHere = shownSteps
                .find((s) => s.node === n.id)
                ?.contributions.find((c) => c.arg === k);
              // An edge that skips a column arches above the nodes it passes, so it never runs through them.
              const skips = depth[n.id] - depth[from] > 1;
              const lift = skips ? -Math.min(a.y, b.y) + 18 : 0;
              const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + lift };
              // Unit vectors along the curve at each end, to stop it at the circles.
              const ua = { x: c.x - a.x, y: c.y - a.y };
              const ub = { x: b.x - c.x, y: b.y - c.y };
              const la = Math.hypot(ua.x, ua.y);
              const lb = Math.hypot(ub.x, ub.y);
              const p1 = { x: a.x + (ua.x / la) * R, y: a.y + (ua.y / la) * R };
              const p2 = { x: b.x - (ub.x / lb) * (R + 4), y: b.y - (ub.y / lb) * (R + 4) };
              // The reverse arrow runs alongside, offset to the left of the forward direction.
              const off = 8;
              const nx = -(ub.y / lb + ua.y / la) / 2;
              const ny = (ub.x / lb + ua.x / la) / 2;
              const q1 = { x: p2.x - nx * off, y: p2.y - ny * off };
              const q2 = { x: p1.x - nx * off, y: p1.y - ny * off };
              const qc = { x: c.x - nx * off, y: c.y - ny * off };
              // The label sits at the middle of the curve, further out on the same side.
              const mid = { x: (a.x + 2 * c.x + b.x) / 4, y: (a.y + 2 * c.y + b.y) / 4 };
              return (
                <g key={`${n.id}-${k}`}>
                  <path
                    d={`M${p1.x},${p1.y} Q${c.x},${c.y} ${p2.x},${p2.y}`}
                    className="lv-edge"
                    strokeWidth={2}
                    markerEnd="url(#lv-ad-fwd)"
                    opacity={stage.phase === 'forward' ? 1 : 0.45}
                  />
                  {sentHere && (
                    <>
                      <path
                        d={`M${q1.x},${q1.y} Q${qc.x},${qc.y} ${q2.x},${q2.y}`}
                        fill="none"
                        stroke="var(--lv-incorrect)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        markerEnd="url(#lv-ad-arrow)"
                      />
                      <text
                        x={mid.x - nx * 24}
                        y={mid.y - ny * 24 + 4}
                        textAnchor="middle"
                        className="lv-svg-mono"
                        style={{
                          fontSize: 12,
                          paintOrder: 'stroke',
                          stroke: 'var(--lv-surface)',
                          strokeWidth: 4,
                        }}
                      >
                        sends {fmtSigned(sentHere.value, 3)}
                      </text>
                    </>
                  )}
                </g>
              );
            }),
          )}
          {g.nodes.map((n) => {
            const p = pos.get(n.id)!;
            const isCurrent = n.id === current || n.id === currentOp;
            const grad = grads.get(n.id);
            return (
              <g key={n.id} data-node={n.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={R}
                  className={`lv-node ${n.kind === 'input' ? 'lv-node-input' : n.id === g.output ? 'lv-node-out' : 'lv-node-hidden'}`}
                  strokeWidth={isCurrent ? 5 : 2.5}
                />
                <text
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  className="lv-svg-text"
                  style={{ fontWeight: 700 }}
                >
                  {n.label}
                </text>
                <text
                  x={p.x}
                  y={p.y - R - 8}
                  textAnchor="middle"
                  className="lv-svg-mono"
                  style={{ fontSize: 12 }}
                >
                  {hasValue(n.id) ? `= ${fmt(n.value, 3)}` : '= ·'}
                </text>
                {grad !== undefined && (
                  <text
                    x={p.x}
                    y={p.y + R + 18}
                    textAnchor="middle"
                    className="lv-svg-mono"
                    style={{ fontSize: 12, fill: 'var(--lv-incorrect)', fontWeight: 700 }}
                  >
                    {n.kind === 'input' ? `∂f/∂${n.label}` : `∂f/∂(${n.label})`} = {fmtSigned(grad, 3)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="lv-legend">
        <li>
          <svg width="26" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="26" y2="3" className="lv-edge" strokeWidth="2" />
          </svg>
          forward: values (= …)
        </li>
        <li>
          <svg width="26" height="8" aria-hidden="true">
            <line
              x1="26"
              y1="4"
              x2="2"
              y2="4"
              stroke="var(--lv-incorrect)"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          </svg>
          reverse: what each step sends back, and gradients (∂f/∂ …)
        </li>
        <li>thick ring: the step just taken</li>
      </ul>
    </figure>
  );
}
