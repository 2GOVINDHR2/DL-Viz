/**
 * Level 4's words for the shared trace explorer (ADR-090 pattern): a base (Level 2's, or Level 3's for a run trained
 * with Adam, whose update is not −η·ḡ), plus the convolutional steps (Experiments 01–02) and the sequence steps
 * (Experiment 03 on). Levels 1–3 are unchanged.
 */
import { LEVEL2_WORDING, type TraceWording } from '../../trace/wording';

const CNN_KINDS: Record<string, string> = {
  CONV2D: 'slide each kernel over the input: multiply and add at every position (a feature map per kernel)',
  POOL: 'pool: keep one value (the largest, or the average) of each block of the feature map',
  FLATTEN: 'flatten the feature maps into one vector',
  GRAD_CONV2D:
    'gradient of every kernel weight, summed over all positions, and the gradient passed to the input',
  GRAD_POOL: 'pass the gradient back through pooling (to the values that were kept)',
  GRAD_FLATTEN: 'give the gradient back its feature-map shape',
};

/** The steps of a recurrent layer (Experiment 03 on; the words avoid terms taught later). */
export const RNN_KINDS: Record<string, string> = {
  SELECT_STEP: 'read the input of the next time step',
  ADD: 'add the part from the input and the part from the previous hidden state',
  GRAD_SELECT_STEP: 'gradient of one time step’s input',
  GRAD_SUM: 'add up the gradient contributions of a value used at several time steps',
};

export function level4Wording(
  extra: Record<string, string> = {},
  base: TraceWording = LEVEL2_WORDING,
): TraceWording {
  const kinds = { ...CNN_KINDS, ...extra };
  return { ...base, kind: (k) => kinds[k] ?? base.kind(k) };
}
