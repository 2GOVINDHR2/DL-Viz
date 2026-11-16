/**
 * Level 2, Experiment 03 — Derivatives and Gradient Descent: How Parameters Learn (ADR-091).
 *
 * Parts A–D are demonstrations computed by the engine, not training runs (PartsAD.tsx). Part E is real full-batch
 * training of a one-input sigmoid neuron, recorded as an NPM trace and opened in the shared explorer (Training.tsx).
 */
import { useCallback, useMemo, useState } from 'react';
import { L2_EXP03_DEFAULTS, level2ById } from '../../../experiments/level2';
import { LEVEL_2 } from '../../curriculum';
import { ExperimentLayout } from '../../components/ExperimentLayout';
import { PartA, PartD, PartsBC, slopeQuestion } from './PartsAD';
import { PartE, runQuestion } from './Training';
import type { UpdateBreakdown } from './update';

const EXP = level2ById('03')!;

export function L2Experiment03() {
  const [x0, setX0] = useState(L2_EXP03_DEFAULTS.parabola.x0);
  const [lr, setLr] = useState(L2_EXP03_DEFAULTS.lr);
  const [first, setFirst] = useState<{ u: UpdateBreakdown | null; run: number }>({ u: null, run: 0 });
  const onUpdate = useCallback((u: UpdateBreakdown | null, run: number) => setFirst({ u, run }), []);
  const live = useMemo(() => [slopeQuestion(x0), runQuestion(first.u, first.run)], [x0, first]);
  return (
    <ExperimentLayout exp={EXP} level={LEVEL_2} liveQuestions={live}>
      <PartA x0={x0} setX0={setX0} />
      <PartsBC x0={x0} lr={lr} setLr={setLr} />
      <PartD />
      <PartE onUpdate={onUpdate} />
    </ExperimentLayout>
  );
}
