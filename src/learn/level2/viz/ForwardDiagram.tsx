/**
 * A small dense network, column by column, with the values known at the current point of a forward pass. Every
 * number is passed in from an engine probe (or its recorded forward instructions). A value not yet computed is
 * drawn as "·", so the diagram never shows a value from later in the pass than the step being viewed.
 *
 * Weights arrive in the engine's layout (W[i][j] joins input i to neuron j, row-major: NPM-SPEC §5). Non-colour
 * cues: a negative weight is dashed, a zero weight dotted; the current layer has a thicker outline.
 */
import { fmt } from '../../format';

export interface DiagramLayer {
  /** Weights into this layer, engine layout [inputs × neurons], row-major. */
  W: number[];
  b: number[];
  /** Weighted sums plus bias, when computed. */
  z?: (number | undefined)[];
  /** Activations, when computed. */
  a?: (number | undefined)[];
  label: string;
}

const SUB = ['₁', '₂', '₃', '₄'];

export function ForwardDiagram({
  inputs,
  layers,
  current,
  title,
  showWeights = true,
}: {
  inputs: (number | undefined)[];
  layers: DiagramLayer[];
  /** Index of the layer being computed (−1: the inputs), highlighted. */
  current?: number;
  title: string;
  showWeights?: boolean;
}) {
  const sizes = [inputs.length, ...layers.map((l) => l.b.length)];
  const W = 640;
  const H = 300;
  const xs = sizes.map((_, c) => 60 + (c * (W - 150)) / Math.max(1, sizes.length - 1));
  const ys = (n: number): number[] =>
    Array.from({ length: n }, (_, k) => (n === 1 ? H / 2 : 70 + (k * (H - 140)) / (n - 1)));
  const v = (x: number | undefined, d = 2): string => (x === undefined ? '·' : fmt(x, d));
  const desc =
    `Inputs ${inputs.map((x, i) => `x${SUB[i]} = ${v(x)}`).join(', ')}. ` +
    layers
      .map(
        (l) =>
          `${l.label}: ${l.b.map((_, j) => `neuron ${j + 1} z = ${v(l.z?.[j])}, a = ${v(l.a?.[j], 3)}`).join('; ')}`,
      )
      .join('. ');
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${desc}`}>
        {layers.map((l, c) => {
          const nIn = sizes[c];
          const nOut = sizes[c + 1];
          return ys(nIn).flatMap((y1, i) =>
            ys(nOut).map((y2, j) => {
              const w = l.W[i * nOut + j];
              const cls = w === 0 ? 'lv-edge lv-edge-zero' : w < 0 ? 'lv-edge lv-edge-neg' : 'lv-edge';
              const x1 = xs[c] + 26;
              const x2 = xs[c + 1] - 30;
              const t = 0.3 + 0.4 * (j / Math.max(1, nOut - 1));
              return (
                <g key={`${c}-${i}-${j}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    className={cls}
                    strokeWidth={w === 0 ? 1.5 : 1.2 + 2 * Math.min(Math.abs(w), 2)}
                    opacity={current === undefined || current === c ? 1 : 0.45}
                  />
                  {showWeights && (
                    <text
                      x={x1 + (x2 - x1) * t}
                      y={y1 + (y2 - y1) * t - 5}
                      textAnchor="middle"
                      className="lv-svg-mono"
                      style={{
                        fontSize: 11,
                        paintOrder: 'stroke',
                        stroke: 'var(--lv-surface)',
                        strokeWidth: 4,
                      }}
                    >
                      {fmt(w)}
                    </text>
                  )}
                </g>
              );
            }),
          );
        })}
        {inputs.map((x, i) => {
          const y = ys(inputs.length)[i];
          return (
            <g key={`in${i}`}>
              <circle
                cx={xs[0]}
                cy={y}
                r={24}
                className="lv-node lv-node-input"
                strokeWidth={current === -1 ? 4 : 2.5}
              />
              <text x={xs[0]} y={y + 5} textAnchor="middle" className="lv-svg-mono">
                {v(x)}
              </text>
              <text x={xs[0] - 32} y={y + 5} textAnchor="end" className="lv-svg-text">
                x{SUB[i]}
              </text>
            </g>
          );
        })}
        {layers.map((l, c) =>
          ys(l.b.length).map((y, j) => {
            const last = c === layers.length - 1;
            return (
              <g key={`n${c}-${j}`}>
                <circle
                  cx={xs[c + 1]}
                  cy={y}
                  r={30}
                  className={`lv-node ${last ? 'lv-node-out' : 'lv-node-hidden'}`}
                  strokeWidth={current === c ? 4.5 : 2.5}
                />
                <text
                  x={xs[c + 1]}
                  y={y - 4}
                  textAnchor="middle"
                  className="lv-svg-muted"
                  style={{ fontSize: 11 }}
                >
                  z {v(l.z?.[j])}
                </text>
                <text
                  x={xs[c + 1]}
                  y={y + 12}
                  textAnchor="middle"
                  className="lv-svg-mono"
                  style={{ fontSize: 12 }}
                >
                  a {v(l.a?.[j], 3)}
                </text>
                <text x={xs[c + 1] + 36} y={y + 4} className="lv-svg-muted" style={{ fontSize: 11 }}>
                  b {fmt(l.b[j])}
                </text>
              </g>
            );
          }),
        )}
        {['Inputs', ...layers.map((l) => l.label)].map((name, c) => (
          <text
            key={name}
            x={xs[c]}
            y={H - 12}
            textAnchor="middle"
            className="lv-svg-text"
            style={{ fontWeight: 600 }}
          >
            {name}
          </text>
        ))}
      </svg>
      <figcaption className="lv-small lv-muted">
        {title}. “·” marks a value not computed yet at this step.
      </figcaption>
    </figure>
  );
}
