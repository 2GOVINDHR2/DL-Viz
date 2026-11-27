/**
 * Level 4's words for the shared trace explorer (ADR-090 pattern): Level 2's, plus the convolutional, pooling and
 * flattening steps (Experiments 01–02). Recurrent kinds are added by the experiments that teach them. Levels 1–3 are
 * unchanged.
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

export function level4Wording(extra: Record<string, string> = {}): TraceWording {
  const kinds = { ...CNN_KINDS, ...extra };
  return { ...LEVEL2_WORDING, kind: (k) => kinds[k] ?? LEVEL2_WORDING.kind(k) };
}
