/**
 * The 2-2-1 network at one recorded point of an example's pass. Everything shown is read from the reconstructed
 * state at the cursor (src/core/npm/state.ts), so a value appears only once the engine has computed it.
 *
 * Forward and backward are told apart by more than colour:
 *  - forward: solid connections; node values labelled "a";
 *  - backward: dashed arrows pointing right to left along each connection, with gradient labels "∂L/∂…".
 * The selected parameter is drawn thicker and marked ◆.
 */
import type { ExecState } from '../../../core/npm/state';
import { fmt } from '../../format';
import type { ParamRef } from '../exp04/math';

const SUB = ['₁', '₂'];

export function BackpropDiagram({
  st,
  selected,
  phase,
}: {
  st: ExecState | null;
  selected: ParamRef | null;
  phase: string;
}) {
  const W = 660;
  const H = 360;
  const X = [70, 330, 580];
  const yIn = [100, 230];
  const yHid = [95, 235];
  const yOut = 165;
  const s = st?.sample ?? null;
  const W1 = st?.params['L1.W']?.value.data;
  const b1 = st?.params['L1.b']?.value.data;
  const W2 = st?.params['L2.W']?.value.data;
  const b2 = st?.params['L2.b']?.value.data;
  const L1 = s?.layers.L1;
  const L2 = s?.layers.L2;
  const v = (t: { data: ArrayLike<number> } | undefined, k: number, d = 3): string =>
    t ? fmt(t.data[k], d) : '·';
  const isSel = (layer: 'L1' | 'L2', kind: 'W' | 'b', i: number, j: number): boolean =>
    !!selected &&
    selected.layer === layer &&
    selected.kind === kind &&
    (kind === 'b' ? selected.j === j : selected.kind === 'W' && selected.i === i && selected.j === j);
  const backward = phase === 'backward' || phase === 'update';
  const edge = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    w: number | undefined,
    g: number | undefined,
    sel: boolean,
    key: string,
    t = 0.45,
  ) => {
    const mx = x1 + (x2 - x1) * t;
    const my = y1 + (y2 - y1) * t;
    return (
      <g key={key}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="lv-edge"
          strokeWidth={sel ? 5 : 2}
          opacity={backward ? 0.5 : 1}
        />
        {g !== undefined && (
          <line
            x1={x2 - (x2 - x1) * 0.2}
            y1={y2 - (y2 - y1) * 0.2}
            x2={x1 + (x2 - x1) * 0.2}
            y2={y1 + (y2 - y1) * 0.2}
            stroke="var(--lv-incorrect)"
            strokeWidth={2}
            strokeDasharray="5 4"
            markerEnd="url(#lv-bp-arrow)"
          />
        )}
        <text
          x={mx}
          y={my - 8}
          textAnchor="middle"
          className="lv-svg-mono"
          style={{ fontSize: 11, paintOrder: 'stroke', stroke: 'var(--lv-surface)', strokeWidth: 4 }}
        >
          {sel ? '◆ ' : ''}w {w === undefined ? '·' : fmt(w, 2)}
        </text>
        {g !== undefined && (
          <text
            x={mx}
            y={my + 14}
            textAnchor="middle"
            className="lv-svg-mono"
            style={{
              fontSize: 11,
              fill: 'var(--lv-text)',
              paintOrder: 'stroke',
              stroke: 'var(--lv-surface)',
              strokeWidth: 4,
            }}
          >
            ∂L/∂w {fmt(g, 3)}
          </text>
        )}
      </g>
    );
  };
  const desc = s
    ? `Example with inputs (${Array.from(s.x.data).join(', ')}) and target ${s.y.data[0]}. ` +
      `Hidden activations ${v(L1?.a, 0)}, ${v(L1?.a, 1)}; output ${v(L2?.a, 0)}; loss ${s.loss === undefined ? 'not computed yet' : fmt(s.loss, 4)}. ` +
      (L2?.gradZ ? `Backward: output ∂L/∂z = ${v(L2.gradZ, 0)}. ` : 'No gradient computed yet. ') +
      (L1?.gradZ ? `Hidden ∂L/∂z = ${v(L1.gradZ, 0)}, ${v(L1.gradZ, 1)}.` : '')
    : 'Before the run: nothing has executed yet.';
  return (
    <figure style={{ margin: 0 }}>
      {/* Below about 560 px the labels would shrink past reading size, so the diagram keeps that width and scrolls. */}
      <div
        className="lv-table-wrap"
        tabIndex={0}
        role="region"
        aria-label="The network diagram (scrolls sideways on narrow screens)"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ minWidth: 560, display: 'block' }}
          role="img"
          aria-label={`The 2-2-1 network during the ${phase} stage. ${desc}`}
        >
          <defs>
            <marker
              id="lv-bp-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--lv-incorrect)" />
            </marker>
          </defs>
          {[0, 1].flatMap((i) =>
            [0, 1].map((j) =>
              edge(
                X[0] + 26,
                yIn[i],
                X[1] - 30,
                yHid[j],
                W1?.[i * 2 + j],
                L1?.gradW?.data[i * 2 + j],
                isSel('L1', 'W', i, j),
                `1-${i}-${j}`,
                j === i ? 0.55 : 0.2,
              ),
            ),
          )}
          {[0, 1].map((i) =>
            edge(
              X[1] + 30,
              yHid[i],
              X[2] - 32,
              yOut,
              W2?.[i],
              L2?.gradW?.data[i],
              isSel('L2', 'W', i, 0),
              `2-${i}`,
            ),
          )}
          {[0, 1].map((i) => (
            <g key={`x${i}`}>
              <circle cx={X[0]} cy={yIn[i]} r={24} className="lv-node lv-node-input" />
              <text x={X[0]} y={yIn[i] + 5} textAnchor="middle" className="lv-svg-mono">
                {s ? fmt(s.x.data[i], 0) : '·'}
              </text>
              <text x={X[0] - 32} y={yIn[i] + 5} textAnchor="end" className="lv-svg-text">
                x{SUB[i]}
              </text>
            </g>
          ))}
          {[0, 1].map((j) => (
            <g key={`h${j}`}>
              <circle
                cx={X[1]}
                cy={yHid[j]}
                r={30}
                className="lv-node lv-node-hidden"
                strokeWidth={isSel('L1', 'b', 0, j) ? 5 : 2.5}
              />
              <text
                x={X[1]}
                y={yHid[j] + 5}
                textAnchor="middle"
                className="lv-svg-mono"
                style={{ fontSize: 12 }}
              >
                a {v(L1?.a, j)}
              </text>
              <text
                x={X[1]}
                y={yHid[j] - 40}
                textAnchor="middle"
                className="lv-svg-muted"
                style={{ fontSize: 11 }}
              >
                {isSel('L1', 'b', 0, j) ? '◆ ' : ''}b {b1 ? fmt(b1[j], 2) : '·'}
              </text>
              {L1?.gradZ && (
                <text
                  x={X[1]}
                  y={yHid[j] + 61}
                  textAnchor="middle"
                  className="lv-svg-mono"
                  style={{ fontSize: 11 }}
                >
                  ∂L/∂z {v(L1.gradZ, j)}
                </text>
              )}
              {L1?.gradA && (
                <text
                  x={X[1]}
                  y={yHid[j] + 46}
                  textAnchor="middle"
                  className="lv-svg-mono"
                  style={{ fontSize: 11 }}
                >
                  ∂L/∂a {v(L1.gradA, j)}
                </text>
              )}
            </g>
          ))}
          <circle
            cx={X[2]}
            cy={yOut}
            r={32}
            className="lv-node lv-node-out"
            strokeWidth={isSel('L2', 'b', 0, 0) ? 5 : 2.5}
          />
          <text x={X[2]} y={yOut + 5} textAnchor="middle" className="lv-svg-mono" style={{ fontSize: 12 }}>
            a {v(L2?.a, 0)}
          </text>
          <text x={X[2]} y={yOut - 42} textAnchor="middle" className="lv-svg-muted" style={{ fontSize: 11 }}>
            {isSel('L2', 'b', 0, 0) ? '◆ ' : ''}b {b2 ? fmt(b2[0], 2) : '·'}
          </text>
          {L2?.gradZ && (
            <text x={X[2]} y={yOut + 50} textAnchor="middle" className="lv-svg-mono" style={{ fontSize: 11 }}>
              ∂L/∂z {v(L2.gradZ, 0)}
            </text>
          )}
          <text x={X[2]} y={H - 30} textAnchor="middle" className="lv-svg-text">
            target {s ? fmt(s.y.data[0], 0) : '·'} · loss {s?.loss === undefined ? '·' : fmt(s.loss, 3)}
          </text>
          {['Inputs', 'Hidden layer', 'Output'].map((n, k) => (
            <text
              key={n}
              x={X[k]}
              y={H - 8}
              textAnchor="middle"
              className="lv-svg-text"
              style={{ fontWeight: 600 }}
            >
              {n}
            </text>
          ))}
        </svg>
      </div>
      <ul className="lv-legend">
        <li>
          <svg width="26" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="26" y2="3" className="lv-edge" strokeWidth="2" />
          </svg>
          forward: values a
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
          backward: gradients ∂L/∂…
        </li>
        <li>◆ selected parameter</li>
        <li>· not computed yet at this step</li>
      </ul>
    </figure>
  );
}
