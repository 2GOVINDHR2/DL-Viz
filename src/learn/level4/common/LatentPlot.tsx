/**
 * A scatter plot of 2-number latent codes (Level 4, Experiment 06): one mark per image, its shape and colour by the
 * image's class (shown to the learner only; the autoencoder never saw it). The coordinates are the recorded codes;
 * the plot computes nothing but their placement. A table with every value follows in a disclosure.
 */
import { Disclosure } from '../../components/ui';
import { fmt } from '../../format';
import type { LatentPoint } from './aeRecord';

const COLORS = ['var(--lv-input)', 'var(--lv-bias)', 'var(--lv-correct)'];

export function LatentPlot({
  points,
  classes,
  classOf,
  picked,
  title,
}: {
  points: LatentPoint[];
  classes: string[];
  classOf: (index: number) => number;
  picked?: number;
  title: string;
}) {
  const W = 320;
  const pad = 28;
  const xs = points.map((p) => p.code[0]);
  const ys = points.map((p) => p.code[1]);
  const span = (v: number[]) => {
    const lo = Math.min(...v);
    const hi = Math.max(...v);
    return hi - lo < 1e-9 ? [lo - 1, hi + 1] : [lo - 0.08 * (hi - lo), hi + 0.08 * (hi - lo)];
  };
  const [x0, x1] = span(xs);
  const [y0, y1] = span(ys);
  const px = (v: number) => pad + ((v - x0) / (x1 - x0)) * (W - 2 * pad);
  const py = (v: number) => W - pad - ((v - y0) / (y1 - y0)) * (W - 2 * pad);
  const mark = (c: number, x: number, y: number, r: number) =>
    c === 0 ? (
      <circle cx={x} cy={y} r={r} />
    ) : c === 1 ? (
      <rect x={x - r} y={y - r} width={2 * r} height={2 * r} />
    ) : (
      <path d={`M${x} ${y - r * 1.2} L${x + r * 1.1} ${y + r * 0.9} L${x - r * 1.1} ${y + r * 0.9} Z`} />
    );
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${W}`} width="100%" style={{ maxWidth: W }} role="img" aria-label={title}>
        <rect
          x={pad}
          y={pad}
          width={W - 2 * pad}
          height={W - 2 * pad}
          fill="none"
          stroke="var(--lv-border)"
        />
        <text x={W / 2} y={W - 6} textAnchor="middle" fontSize="11" fill="var(--lv-muted)">
          latent value 1
        </text>
        <text
          x={10}
          y={W / 2}
          textAnchor="middle"
          fontSize="11"
          fill="var(--lv-muted)"
          transform={`rotate(-90 10 ${W / 2})`}
        >
          latent value 2
        </text>
        {points.map((p) => {
          const c = classOf(p.index);
          return (
            <g
              key={p.index}
              fill={COLORS[c]}
              stroke="var(--lv-text)"
              strokeWidth={p.index === picked ? 2 : 0.5}
            >
              {mark(c, px(p.code[0]), py(p.code[1]), p.index === picked ? 7 : 5)}
            </g>
          );
        })}
      </svg>
      <figcaption className="lv-small lv-muted">
        {classes.map((c, k) => (
          <span key={c} style={{ marginRight: 12, whiteSpace: 'nowrap' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              aria-hidden="true"
              style={{ display: 'inline-block', verticalAlign: 'middle' }}
            >
              <g fill={COLORS[k]} stroke="var(--lv-text)" strokeWidth={0.5}>
                {mark(k, 7, 7, 5)}
              </g>
            </svg>{' '}
            {c}
          </span>
        ))}
        {picked !== undefined && <span>· the outlined mark is the image chosen above</span>}
      </figcaption>
      <Disclosure summary="Every latent code as a table">
        <div className="lv-table-wrap">
          <table className="lv-table lv-small">
            <thead>
              <tr>
                <th scope="col">Image</th>
                <th scope="col">Class (not seen by the network)</th>
                <th scope="col">Latent value 1</th>
                <th scope="col">Latent value 2</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.index}>
                  <th scope="row">{p.index + 1}</th>
                  <td>{classes[classOf(p.index)]}</td>
                  <td className="num">{fmt(p.code[0], 3)}</td>
                  <td className="num">{fmt(p.code[1], 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </figure>
  );
}
