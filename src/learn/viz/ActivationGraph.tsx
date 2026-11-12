/**
 * The selected activation function as a curve, with the current z marked and the output read off.
 *
 * The curve is engine output: one probe evaluates the activation at 201 values of z, from −10 to 10. For Step,
 * the engine computes z and the step rule is applied (ADR-081). The vertical axis is fitted to the curve inside the
 * visible window, so ReLU and Linear are never clipped into looking saturated (the defect noted as Round 7).
 */
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useMemo } from 'react';
import type { Activation } from '../../core/layers/model';
import { probe, stepRule } from '../engine/probe';
import { fmt } from '../format';

export type NeuronActivation = 'step' | Exclude<Activation, 'softmax'>;

const Z = Array.from({ length: 201 }, (_, i) => -10 + i * 0.1);

/** f(z) at 201 points, from the engine. */
export function activationCurve(act: NeuronActivation): { z: number; a: number }[] {
  const r = probe({
    model: {
      inputShape: [1],
      layers: [{ type: 'dense', units: 1, activation: act === 'step' ? 'linear' : act }],
    },
    params: { 'L1.W': [1], 'L1.b': [0] },
    xs: Z.map((z) => [z]),
  });
  return r.examples.map((e) => {
    const z = e.layers.L1.z![0];
    return { z, a: act === 'step' ? stepRule(z) : e.layers.L1.a![0] };
  });
}

export const ACTIVATION_NAMES: Record<NeuronActivation, string> = {
  step: 'Step',
  sigmoid: 'Sigmoid',
  relu: 'ReLU',
  tanh: 'Tanh',
  linear: 'Linear',
};

export function ActivationGraph({
  act,
  z,
  a,
  width = 620,
}: {
  act: NeuronActivation;
  z: number;
  a: number;
  width?: number;
}) {
  const curve = useMemo(() => activationCurve(act), [act]);
  const half = Math.min(10, Math.max(4, Math.ceil(Math.abs(z) + 1)));
  const visible = curve.filter((p) => p.z >= -half - 1e-9 && p.z <= half + 1e-9);
  const lo = Math.min(...visible.map((p) => p.a), a);
  const hi = Math.max(...visible.map((p) => p.a), a);
  const pad = (hi - lo) * 0.08 || 0.5;
  const H = 260;
  const m = { l: 44, r: 14, t: 14, b: 36 };
  const x = scaleLinear()
    .domain([-half, half])
    .range([m.l, width - m.r]);
  const y = scaleLinear()
    .domain([lo - pad, hi + pad])
    .range([H - m.b, m.t]);
  const path = line<{ z: number; a: number }>()
    .x((p) => x(p.z))
    .y((p) => y(p.a))(visible);
  const yTicks = y.ticks(4);
  const xTicks = x.ticks(5);
  const name = ACTIVATION_NAMES[act];
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${H}`} role="img" aria-labelledby="lv-act-t lv-act-d">
        <title id="lv-act-t">{`${name} activation function`}</title>
        <desc id="lv-act-d">{`The curve of ${name} for z from ${-half} to ${half}. The current weighted sum z = ${fmt(z)} is marked; ${name} gives the output ${fmt(a, 3)}.`}</desc>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} className="lv-svg-grid" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="lv-svg-muted">
              {fmt(t, 1)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={H - m.b + 16} textAnchor="middle" className="lv-svg-muted">
            {fmt(t, 0)}
          </text>
        ))}
        <text x={width - m.r} y={H - 4} textAnchor="end" className="lv-svg-muted">
          weighted sum z →
        </text>
        <text x={4} y={m.t + 2} className="lv-svg-muted" dominantBaseline="hanging">
          a
        </text>
        <path d={path ?? ''} className="lv-curve" />
        <line
          x1={x(z)}
          x2={x(z)}
          y1={H - m.b}
          y2={y(a)}
          stroke="var(--lv-bias)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <line
          x1={m.l}
          x2={x(z)}
          y1={y(a)}
          y2={y(a)}
          stroke="var(--lv-text)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <circle cx={x(z)} cy={y(a)} r="7" fill="var(--lv-surface)" stroke="var(--lv-bias)" strokeWidth="3" />
        <text
          x={x(z) > width / 2 ? x(z) - 12 : x(z) + 12}
          textAnchor={x(z) > width / 2 ? 'end' : 'start'}
          y={Math.max(y(a) - 12, m.t + 12)}
          className="lv-svg-mono"
        >
          z = {fmt(z)}, a = {fmt(a, 3)}
        </text>
      </svg>
      <figcaption className="lv-small lv-muted">
        {name}: the orange marker is the current z. The output a is read off the curve.
        {act === 'step' &&
          ' For Step the engine computes z, and the step rule (1 when z ≥ 0, else 0) is applied to it.'}
      </figcaption>
    </figure>
  );
}
