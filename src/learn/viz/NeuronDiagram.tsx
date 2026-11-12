/**
 * One neuron, left to right: inputs → weighted connections → Σ (with the bias) → activation f → output.
 * Every value printed here is passed in from an engine probe. The diagram computes nothing.
 *
 * Non-colour cues: a negative weight is a dashed line, a zero weight a grey dotted line; line thickness grows with
 * the weight's size; every node and edge carries its value as text.
 */
import { fmt } from '../format';

export interface NeuronValues {
  x: number[];
  w: number[];
  b: number;
  /** x·w for each input, from the engine. */
  contributions: number[];
  /** Σ wᵢxᵢ, from the engine. */
  u: number;
  z: number;
  a: number;
  activation: string;
}

const SUB = ['₁', '₂', '₃', '₄'];

export function NeuronDiagram({ v }: { v: NeuronValues }) {
  const W = 660;
  const H = 300;
  const n = v.x.length;
  const ys = v.x.map((_, i) => (n === 1 ? 160 : 90 + (i * 160) / (n - 1)));
  const sum = { x: 350, y: 160 };
  const act = { x: 478, y: 160 };
  const out = { x: 606, y: 160 };
  const bias = { x: 350, y: 46 };
  const desc =
    v.x
      .map(
        (x, i) =>
          `input x${SUB[i]} = ${fmt(x)} with weight w${SUB[i]} = ${fmt(v.w[i])} contributes ${fmt(v.contributions[i])}`,
      )
      .join('; ') +
    `. Weighted sum ${fmt(v.u)}, plus bias ${fmt(v.b)}, gives z = ${fmt(v.z)}. ${v.activation} turns z into the output a = ${fmt(v.a, 3)}.`;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="lv-neuron-t lv-neuron-d">
        <title id="lv-neuron-t">The neuron</title>
        <desc id="lv-neuron-d">{desc}</desc>
        {/* stage labels */}
        <text x={70} y={22} textAnchor="middle" className="lv-svg-muted">
          inputs
        </text>
        <text x={210} y={22} textAnchor="middle" className="lv-svg-muted">
          × weights
        </text>
        <text x={sum.x} y={H - 12} textAnchor="middle" className="lv-svg-muted">
          1 · combine
        </text>
        <text x={act.x} y={H - 12} textAnchor="middle" className="lv-svg-muted">
          2 · activate
        </text>
        <text x={out.x} y={H - 12} textAnchor="middle" className="lv-svg-muted">
          output
        </text>
        {/* connections */}
        {v.x.map((_, i) => {
          const w = v.w[i];
          const cls = w === 0 ? 'lv-edge lv-edge-zero' : w < 0 ? 'lv-edge lv-edge-neg' : 'lv-edge';
          const sw = w === 0 ? 2 : 1.5 + 2.5 * Math.min(Math.abs(w), 2);
          const mx = (96 + sum.x - 34) / 2;
          const my = (ys[i] + sum.y) / 2;
          return (
            <g key={i}>
              <line x1={96} y1={ys[i]} x2={sum.x - 34} y2={sum.y} className={cls} strokeWidth={sw} />
              <rect x={mx - 50} y={my - 30} width={100} height={42} rx={6} className="lv-label-bg" />
              <text x={mx} y={my - 13} textAnchor="middle" className="lv-svg-mono">
                w{SUB[i]} = {fmt(w)}
              </text>
              <text x={mx} y={my + 4} textAnchor="middle" className="lv-svg-muted">
                adds {fmt(v.contributions[i])}
              </text>
            </g>
          );
        })}
        {/* inputs */}
        {v.x.map((x, i) => (
          <g key={`in${i}`}>
            <circle cx={70} cy={ys[i]} r={26} className="lv-node lv-node-input" />
            <text x={70} y={ys[i] + 5} textAnchor="middle" className="lv-svg-mono">
              {fmt(x)}
            </text>
            <text x={30} y={ys[i] + 5} textAnchor="end" className="lv-svg-text">
              x{SUB[i]}
            </text>
          </g>
        ))}
        {/* bias */}
        <line
          x1={bias.x}
          y1={bias.y + 22}
          x2={sum.x}
          y2={sum.y - 34}
          stroke="var(--lv-bias)"
          strokeWidth={2.5}
        />
        <circle cx={bias.x} cy={bias.y} r={22} className="lv-node lv-node-bias" />
        <text x={bias.x} y={bias.y + 5} textAnchor="middle" className="lv-svg-mono">
          {fmt(v.b)}
        </text>
        <text x={bias.x + 30} y={bias.y + 5} className="lv-svg-text">
          bias b
        </text>
        {/* sum */}
        <circle cx={sum.x} cy={sum.y} r={34} className="lv-node lv-node-sum" />
        <text x={sum.x} y={sum.y - 4} textAnchor="middle" className="lv-svg-text" style={{ fontSize: 22 }}>
          Σ
        </text>
        <text x={sum.x} y={sum.y + 16} textAnchor="middle" className="lv-svg-muted">
          + b
        </text>
        <rect x={sum.x - 52} y={sum.y + 42} width={104} height={26} rx={6} className="lv-label-bg" />
        <text x={sum.x} y={sum.y + 60} textAnchor="middle" className="lv-svg-mono">
          z = {fmt(v.z)}
        </text>
        {/* activation */}
        <line x1={sum.x + 34} y1={sum.y} x2={act.x - 40} y2={act.y} stroke="var(--lv-text)" strokeWidth={2} />
        <rect
          x={act.x - 40}
          y={act.y - 30}
          width={80}
          height={60}
          rx={8}
          className="lv-node lv-node-out"
          style={{ strokeWidth: 2 }}
        />
        <text
          x={act.x}
          y={act.y - 4}
          textAnchor="middle"
          className="lv-svg-text"
          style={{ fontStyle: 'italic', fontSize: 18 }}
        >
          f
        </text>
        <text x={act.x} y={act.y + 16} textAnchor="middle" className="lv-svg-muted">
          {v.activation}
        </text>
        {/* output */}
        <line x1={act.x + 40} y1={act.y} x2={out.x - 30} y2={out.y} stroke="var(--lv-text)" strokeWidth={2} />
        <circle cx={out.x} cy={out.y} r={30} className="lv-node lv-node-out" />
        <text x={out.x} y={out.y + 5} textAnchor="middle" className="lv-svg-mono">
          {fmt(v.a, 3)}
        </text>
        <text x={out.x} y={out.y - 40} textAnchor="middle" className="lv-svg-text">
          a
        </text>
      </svg>
    </figure>
  );
}
