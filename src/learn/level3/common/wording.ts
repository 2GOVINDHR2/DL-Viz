/**
 * Level 3's words for the shared trace explorer (ADR-090 pattern): Level 2's, plus the optimiser state and weight
 * decay, named only from the experiment that teaches them (the vocabulary schedule, LEVEL3_TERMS). Level 1 and
 * Level 2 wording are unchanged.
 */
import { LEVEL2_WORDING, type TraceWording } from '../../trace/wording';

export function level3Wording(o: { optimizer: 'sgd' | 'momentum' | 'adam'; decay: boolean }): TraceWording {
  const kinds: Record<string, string> = {
    COMPUTE_UPDATE:
      o.optimizer === 'sgd'
        ? 'multiply the gradient by the learning rate: −η·g'
        : 'compute the step from the optimiser’s state and the learning rate',
  };
  if (o.optimizer === 'momentum') kinds.OPTIMIZER_STATE = 'update the velocity: v ← μ·v + ḡ';
  if (o.optimizer === 'adam')
    kinds.OPTIMIZER_STATE = 'update Adam’s moment estimates m, v and their corrections m̂, v̂';
  if (o.decay) kinds.GRAD_ACCUMULATE = 'average the gradients over the batch, then add λ·w (weight decay)';
  // Level 2's "w ← w − η·g" describes plain gradient descent only; with momentum, Adam or weight decay the step is
  // something else, so the label, the table note and APPLY_UPDATE name the step Δ instead.
  const plain = o.optimizer === 'sgd' && !o.decay;
  if (!plain) kinds.APPLY_UPDATE = 'apply the step: new value = old value + Δ';
  const g = o.decay ? '(ḡ + λ·w)' : 'ḡ';
  const step =
    o.optimizer === 'momentum'
      ? `The step is Δ = −η·v, where the velocity v ← μ·v + ${g}.`
      : o.optimizer === 'adam'
        ? `The step is Δ = −η·m̂/(√v̂ + ε), from Adam’s moment estimates of ${g}.`
        : `The step is Δ = −η·${g}, the learning rate times the gradient, with its sign reversed.`;
  const extra =
    o.optimizer === 'momentum'
      ? ' The optimiser first updates its velocity, and the step uses the velocity.'
      : o.optimizer === 'adam'
        ? ' The optimiser first updates its moment estimates, and the step uses them.'
        : '';
  return {
    ...LEVEL2_WORDING,
    ...(plain
      ? {}
      : {
          phases: { ...LEVEL2_WORDING.phases, update: { tag: 'update', label: 'Update: w ← w + Δ' } },
          updatesNote: `First four values of each. ${step}`,
        }),
    phaseExplain: {
      ...LEVEL2_WORDING.phaseExplain,
      update:
        'Each parameter is updated once for the whole batch, from the batch’s mean gradient' +
        (o.decay ? ' plus λ·w' : '') +
        '.' +
        extra,
    },
    kind: (k) => kinds[k] ?? LEVEL2_WORDING.kind(k),
  };
}
