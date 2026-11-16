/**
 * The training view at the cursor: progress through the run, the loss per epoch (marked at the cursor), and the
 * decision boundary as the latest evaluation at or before the cursor recorded it. All values are from the trace
 * (epoch summaries and the reconstructed state).
 */
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { GATES } from '../../experiments/level1';
import { pct, fmt } from '../format';
import { BoundaryLegend, DecisionBoundary } from '../viz/DecisionBoundary';
import { useRun } from './store';

function LossChart() {
  const epochs = useRun((s) => s.epochs);
  const exec = useRun((s) => s.exec);
  if (!epochs.length) return null;
  const done = exec?.completedEpochs ?? 0;
  const W = 520;
  const H = 200;
  const m = { l: 46, r: 12, t: 12, b: 32 };
  const vals = epochs.map((e) => e.evalLoss);
  const max = Math.max(...vals.filter(Number.isFinite)) * 1.05 || 1;
  const sx = scaleLinear()
    .domain([1, Math.max(2, epochs.length)])
    .range([m.l, W - m.r]);
  const sy = scaleLinear()
    .domain([0, max])
    .range([H - m.b, m.t]);
  const all = line<number>()
    .x((_, i) => sx(i + 1))
    .y((v) => sy(Number.isFinite(v) ? v : max))(vals);
  const sofar =
    done > 0
      ? line<number>()
          .x((_, i) => sx(i + 1))
          .y((v) => sy(Number.isFinite(v) ? v : max))(vals.slice(0, done))
      : null;
  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Loss after each epoch. ${done} of ${epochs.length} epochs completed at this point in the record${done ? `; latest loss ${fmt(vals[done - 1], 3)}` : ''}. The whole run ends at ${fmt(vals.at(-1), 3)}.`}
      >
        {sy.ticks(4).map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} className="lv-svg-grid" />
            <text x={m.l - 6} y={sy(t) + 4} textAnchor="end" className="lv-svg-muted">
              {fmt(t, 2)}
            </text>
          </g>
        ))}
        {sx.ticks(5).map((t) => (
          <text key={t} x={sx(t)} y={H - m.b + 16} textAnchor="middle" className="lv-svg-muted">
            {t}
          </text>
        ))}
        <text x={W - m.r} y={H - 2} textAnchor="end" className="lv-svg-muted">
          epoch →
        </text>
        <path d={all ?? ''} fill="none" stroke="var(--lv-inactive)" strokeWidth={1.5} strokeDasharray="3 3" />
        {sofar && <path d={sofar} className="lv-curve" />}
        {done > 0 && (
          <circle cx={sx(done)} cy={sy(vals[done - 1])} r={5} fill="var(--lv-bias)" stroke="var(--lv-text)" />
        )}
      </svg>
      <figcaption className="lv-small lv-muted">
        Loss after each epoch (checked on all four examples). Solid: up to the current point in the record.
        Dashed grey: the rest of the run.
      </figcaption>
    </figure>
  );
}

export function TrainingOverview() {
  const header = useRun((s) => s.header);
  const exec = useRun((s) => s.exec);
  const epochs = useRun((s) => s.epochs);
  if (!header || !exec) return null;
  const total = epochs.length;
  const done = exec.completedEpochs;
  const ev = exec.lastEval;
  const grid =
    ev?.boundary && ev.bounds
      ? {
          resolution: ev.boundary.shape[0],
          bounds: ev.bounds as [number, number, number, number],
          values: Array.from(ev.boundary.data),
        }
      : null;
  return (
    <section aria-label="Training overview" className="lv-grid-main">
      <div className="lv-viz">
        <h4>Progress at this point in the record</h4>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label="Epochs completed"
          style={{
            height: 10,
            background: 'var(--lv-surface-2)',
            borderRadius: 999,
            overflow: 'hidden',
            border: '1px solid var(--lv-border)',
          }}
        >
          <div
            style={{
              width: `${(100 * done) / Math.max(1, total)}%`,
              height: '100%',
              background: 'var(--lv-input)',
            }}
          />
        </div>
        <p className="lv-small" style={{ marginTop: 6 }}>
          {done} of {total} epochs completed · the cursor is at instruction {exec.cursor + 1} of{' '}
          {header.length}
        </p>
        <LossChart />
      </div>
      <div className="lv-viz">
        <h4>The network’s decision {ev ? `after epoch ${ev.epoch + 1}` : ''}</h4>
        {grid ? (
          <>
            <DecisionBoundary
              grid={grid}
              level={0.5}
              points={GATES.XOR.xs.map((x, i) => ({ x, target: GATES.XOR.ys[i] }))}
              title="Shaded: the network answers 1 (output ≥ 0.5)."
              size={300}
            />
            <BoundaryLegend marks={false} />
          </>
        ) : (
          <p className="lv-muted">
            No epoch has finished yet at this point, so there is no check to show. Step forward to the end of
            epoch 1.
          </p>
        )}
        {ev && (
          <dl className="lv-kv" style={{ marginTop: 'var(--lv-s3)' }}>
            <dt>Loss</dt>
            <dd>{fmt(ev.loss, 4)}</dd>
            <dt>Correct answers</dt>
            <dd>
              {ev.accuracy === null ? '—' : `${pct(ev.accuracy)} (${Math.round(ev.accuracy * 4)} of 4)`}
            </dd>
          </dl>
        )}
      </div>
    </section>
  );
}
