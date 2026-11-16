/**
 * The words the shared trace explorer uses, per level (ADR-090). The explorer, the hierarchy labels and the detail
 * panel read them from here, so one explorer serves Level 1, which deliberately avoids "gradient" and says
 * "adjustment signal", and Level 2, which teaches gradients by name.
 *
 * LEVEL1_WORDING is the explorer's original text, unchanged. It is the default everywhere, so Level 1 needs no
 * configuration and renders exactly as before.
 */
import { createContext, useContext } from 'react';
import { kindWords } from '../components/ui';

export interface TraceWording {
  /** The tag and tree label of each phase. */
  phases: Record<string, { tag: string; label: string }>;
  /** One-sentence explanation of each phase in the detail panel. */
  phaseExplain: Record<string, string>;
  /** Tree label of a batch's update group. */
  updateGroup: string;
  /** Column heading of ∂L/∂z, and its explanation. */
  signalColumn: string;
  signalExplain: string;
  /** Caption of the batch's update table, and its note. */
  updatesCaption: string;
  updatesNote: string;
  /** Plain words for an instruction kind. */
  kind(kind: string): string;
}

export const LEVEL1_WORDING: TraceWording = {
  phases: {
    forward: { tag: 'forward', label: 'Forward: the network predicts' },
    loss: { tag: 'loss', label: 'Loss: compare the prediction with the target' },
    backward: { tag: 'backward', label: 'Backward: work out how to adjust' },
    update: { tag: 'update', label: 'Update: adjust the parameters' },
    eval: { tag: 'check', label: 'Check: test every example' },
    control: { tag: 'control', label: 'Bookkeeping' },
    init: { tag: 'start', label: 'Starting values' },
  },
  phaseExplain: {
    init: 'Before training: every weight and bias gets its starting value, chosen by the seeded random generator, so the same seed always gives the same start.',
    forward: 'The example’s inputs flow through the layers, layer by layer, to a prediction.',
    loss: 'The prediction is compared with the target. The loss says how far off it is.',
    backward:
      'Working backwards from the loss, the engine works out, for every weight and bias, which way and how much it should change to reduce the loss.',
    update:
      'Each parameter is adjusted once for the whole batch: the average of the examples’ adjustments, scaled by the learning rate.',
    eval: 'After the epoch, every example is checked with the new parameters, giving a loss and the share of correct answers.',
    control: 'Bookkeeping: an epoch or batch begins or ends.',
  },
  updateGroup: 'Adjust the parameters (one update for the batch)',
  signalColumn: 'Adjustment signal',
  signalExplain:
    'The adjustment signal (worked out in the backward stage) says, for each neuron, which way and how strongly its value should change to reduce the loss. Experiments in later levels explain how it is computed.',
  updatesCaption: 'Parameters adjusted in this batch',
  updatesNote:
    'First four values of each. The step is the learning rate times the batch’s average adjustment, with its sign reversed so that the loss goes down.',
  kind: kindWords,
};

const LEVEL2_KINDS: Record<string, string> = {
  GRAD_INIT: 'start the backward pass: the gradient of the loss with respect to the output',
  GRAD_ACTIVATE: 'gradient through the activation: ∂L/∂z',
  GRAD_MATMUL_W: 'gradient of each weight: ∂L/∂w',
  GRAD_MATMUL_X: 'gradient passed to the previous layer: ∂L/∂a',
  GRAD_BIAS: 'gradient of each bias: ∂L/∂b',
  BACKWARD_LAYER_END: 'finish this layer (backward)',
  GRAD_ACCUMULATE: 'average the gradients over the batch',
  COMPUTE_UPDATE: 'multiply the gradient by the learning rate: −η·g',
  APPLY_UPDATE: 'apply the update: new value = old value − η·g',
};

/** Level 2 names gradients, the update rule and the batch average explicitly (Experiment 03 onwards). */
export const LEVEL2_WORDING: TraceWording = {
  ...LEVEL1_WORDING,
  phases: {
    ...LEVEL1_WORDING.phases,
    backward: { tag: 'backward', label: 'Backward: compute the gradients' },
    update: { tag: 'update', label: 'Update: w ← w − η·g' },
  },
  phaseExplain: {
    ...LEVEL1_WORDING.phaseExplain,
    backward:
      'Working backwards from the loss, the engine computes the gradient of the loss for every weight and bias: which way, and how strongly, each should change to reduce this example’s loss.',
    update:
      'Each parameter is updated once for the whole batch: the gradients of the batch’s examples are averaged (g), multiplied by the learning rate (η), and subtracted: w ← w − η·g.',
  },
  updateGroup: 'Update the parameters (one update for the whole batch)',
  signalColumn: 'Gradient ∂L/∂z',
  signalExplain:
    'The gradient ∂L/∂z (computed in the backward stage) says, for each neuron, how the loss changes when that neuron’s weighted sum z changes: its sign gives the direction, its size the strength.',
  updatesCaption: 'Parameters updated in this batch',
  updatesNote:
    'First four values of each. The step is −η·g: the learning rate times the batch’s average gradient, with its sign reversed so that the loss goes down.',
  kind: (k) => LEVEL2_KINDS[k] ?? kindWords(k),
};

const WordingContext = createContext<TraceWording>(LEVEL1_WORDING);
export const TraceWordingProvider = WordingContext.Provider;
export const useTraceWording = (): TraceWording => useContext(WordingContext);
