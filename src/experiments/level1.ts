/**
 * Level 1 — Beginner: Neural Network Foundations (ADR-084).
 *
 * The four experiments as data: what each teaches, the terms its primer introduces, its guided tour, its
 * exploration challenges and its fixed knowledge-check questions. Questions whose answer depends on the learner's
 * current settings are built by the experiment from engine results (see src/learn/level1/*), never written here
 * with a default answer.
 *
 * Every default setting is fixed here, identical for every learner and every session, so a study can give all
 * participants the same starting point (task §14). Nothing in Level 1 is randomised.
 *
 * This file adds to the curriculum in registry.ts. It does not replace or edit it: Level 1 reuses that file's
 * machinery (the `points` dataset with editable inputs, `initialParams`), its AND truth table and its XOR
 * configuration. The ten registry experiments remain the Levels 2+ material and the basis of the report's claims.
 */
import type { TrainConfig } from '../core/engine/session';
import type { Activation } from '../core/layers/model';
import { experimentById } from './registry';

export type Level1Id = '01' | '02' | '03' | '04';

export interface PrimerTerm {
  term: string;
  meaning: string;
  /** Colour role, when the term has one on screen. */
  role?: 'input' | 'weight' | 'bias' | 'correct' | 'incorrect';
}

export interface TourStep {
  /** `data-tour` id of the element to highlight. */
  target: string;
  title: string;
  text: string;
  /** What the learner should do, when the step asks for an action. */
  doThis?: string;
  /** Signal that completes the step (src/learn/signals.ts); the tour advances on it. */
  waitFor?: string;
}

export interface Challenge {
  id: string;
  title: string;
  prompt: string;
  /** What to look for afterwards. */
  notice: string;
  /** Signal that marks the challenge as tried. */
  doneOn?: string;
}

export interface QuestionOption {
  text: string;
  correct?: boolean;
  /** Why this answer is right or wrong. It must stay true whatever the learner has set. */
  feedback: string;
}

export interface Question {
  id: string;
  kind: 'choice' | 'predict' | 'scenario' | 'challenge';
  prompt: string;
  options: QuestionOption[];
}

/**
 * The shape every lesson experiment shares, whatever its level (Level 2 reuses it: ADR-087). `Level1Experiment`
 * narrows the id to Level 1's four.
 */
export type LessonExperiment = Omit<Level1Experiment, 'id'> & { id: string };

export interface Level1Experiment {
  id: Level1Id;
  title: string;
  short: string;
  description: string;
  minutes: string;
  concept: string;
  objectives: string[];
  outcomes: string[];
  primer: { intro: string; terms: PrimerTerm[] };
  tour: TourStep[];
  challenges: Challenge[];
  questions: Question[];
}

/** The AND truth table, taken from experiment 1 of the curriculum (the single neuron). */
export const AND_TABLE = (() => {
  const d = experimentById('single-neuron').dataset;
  if (d.kind !== 'points') throw new Error('single-neuron dataset changed shape');
  return { xs: d.xs, ys: d.ys.map((y) => y[0]) };
})();

export type GateName = 'AND' | 'OR' | 'NOT' | 'XOR';
export const GATES: Record<GateName, { inputs: 1 | 2; xs: number[][]; ys: number[]; description: string }> = {
  AND: {
    inputs: 2,
    xs: AND_TABLE.xs,
    ys: AND_TABLE.ys,
    description: 'outputs 1 only when both inputs are 1',
  },
  OR: {
    inputs: 2,
    xs: AND_TABLE.xs,
    ys: [0, 1, 1, 1],
    description: 'outputs 1 when at least one input is 1',
  },
  NOT: { inputs: 1, xs: [[0], [1]], ys: [1, 0], description: 'outputs the opposite of its one input' },
  XOR: {
    inputs: 2,
    xs: AND_TABLE.xs,
    ys: [0, 1, 1, 0],
    description: 'outputs 1 when exactly one input is 1',
  },
};

/** Experiment 01's starting settings. */
export const EXP01_DEFAULTS = {
  x: [1, 0.5],
  w: [0.8, -0.4],
  b: 0.1,
  activation: 'sigmoid' as 'step' | Activation,
};

/** Experiment 02's starting settings: a perceptron that does not yet implement any gate. */
export const EXP02_DEFAULTS = { gate: 'AND' as GateName, w: [0.5, 0.5], b: 0 };

/** Experiment 03: a fixed 2-2-1 network that separates XOR only when its hidden layer is non-linear. */
export const EXP03_XOR_NET = {
  hidden: { W: [1, 1, 1, 1], b: [0, -1] },
  output: { W: [1, -2], b: [-0.5] },
};

/**
 * Experiment 04's starting configuration: experiment 7's XOR network (4 tanh hidden units, sigmoid output,
 * cross-entropy, learning rate 1, seed 3, 150 epochs), with mini-batches of 2 so an epoch visibly has more than one
 * batch. With these settings all 10 of seeds 1–10 reach 100 % on XOR (checked by tests/unit/level1-engine.test.ts).
 */
export const EXP04_DEFAULTS: TrainConfig = (() => {
  const base = experimentById('xor-mlp').config;
  return { ...base, batchSize: 2, boundaryGrid: 32 };
})();

export const EXP04_LIMITS = {
  hiddenLayers: [1, 2, 3],
  units: [1, 2, 3, 4, 6, 8],
  activations: ['tanh', 'relu', 'sigmoid'] as Activation[],
  learningRates: [0.1, 1, 10],
  batchSizes: [1, 2, 4],
  epochs: [50, 150, 300],
};

export const LEVEL1 = {
  title: 'Level 1 — Beginner: Neural Network Foundations',
  tagline:
    'Discover how artificial neurons work, how neural networks make decisions, and why multiple layers and nonlinear transformations are important.',
  minutes: '45–65 minutes',
  understand: [
    'what an artificial neuron computes from its inputs, weights and bias',
    'how a single neuron can make a yes-or-no decision, and where that stops working',
    'why a network needs a nonlinear step between its layers',
    'how a network learns from examples, and how to inspect a real record of that learning',
  ],
};

export const LEVEL1_EXPERIMENTS: Level1Experiment[] = [
  {
    id: '01',
    title: 'Inside a Neuron',
    short: 'See how a neuron combines its inputs and then responds.',
    description:
      'An artificial neuron takes a few numbers in and gives one number out. Change the inputs, the weights and the bias, and watch each step of the calculation change.',
    minutes: '10–15 min',
    concept: 'Weighted sum and activation',
    objectives: [
      'Describe the two stages of a neuron: first combine the inputs, then activate.',
      'Predict how changing an input, a weight or the bias changes the weighted sum.',
      'Compare how Step, Sigmoid, ReLU and Tanh turn the same weighted sum into an output.',
    ],
    outcomes: [
      'what a weight does to its input',
      'what the bias adds',
      'why the activation function matters',
    ],
    primer: {
      intro: 'Four words to start. Each one appears in the diagram below.',
      terms: [
        { term: 'Input', meaning: 'A number the neuron receives, such as a measurement.', role: 'input' },
        {
          term: 'Weight',
          meaning: 'How strongly one input counts. The neuron multiplies each input by its weight.',
          role: 'weight',
        },
        {
          term: 'Bias',
          meaning: 'A number the neuron adds on its own, whatever the inputs are.',
          role: 'bias',
        },
        {
          term: 'Activation function',
          meaning: 'The rule that turns the combined number into the neuron’s output.',
        },
      ],
    },
    tour: [
      {
        target: 'neuron-diagram',
        title: 'One neuron, left to right',
        text: 'Inputs on the left travel along weighted connections into the sum (Σ). The sum goes through the activation function (f), and the result on the right is the output.',
      },
      {
        target: 'control-x1',
        title: 'Change an input',
        text: 'The weighted sum z changes with it. How much it changes depends on that input’s weight.',
        doThis: 'Move the slider for input x₁.',
        waitFor: 'input-changed',
      },
      {
        target: 'control-w1',
        title: 'Switch a connection off',
        text: 'A weight of 0 means the input no longer counts at all. The connection turns grey and dotted.',
        doThis: 'Set weight w₁ to 0.',
        waitFor: 'weight-zero',
      },
      {
        target: 'control-b',
        title: 'Shift with the bias',
        text: 'The bias moves z up or down by the same amount, whatever the inputs are.',
        doThis: 'Change the bias.',
        waitFor: 'bias-changed',
      },
      {
        target: 'activation-picker',
        title: 'Choose how the neuron responds',
        text: 'The same z can give very different outputs. Watch the marker move on the graph.',
        doThis: 'Choose ReLU.',
        waitFor: 'activation:relu',
      },
      {
        target: 'breakdown',
        title: 'Every number, step by step',
        text: 'The breakdown lists each multiplication and addition the engine performed, and the steps it recorded while doing them.',
        doThis: 'Open “Show the calculation”.',
        waitFor: 'breakdown-open',
      },
    ],
    challenges: [
      {
        id: 'raise',
        title: 'Raise one input',
        prompt: 'Increase x₂ while its weight is negative.',
        notice: 'Does the output go up or down? Why?',
        doneOn: 'input-changed',
      },
      {
        id: 'zero',
        title: 'Silence a connection',
        prompt: 'Set a weight to 0, then move its input.',
        notice: 'The output does not move at all. The input has no effect.',
        doneOn: 'weight-zero',
      },
      {
        id: 'flip',
        title: 'Flip a weight',
        prompt: 'Make a positive weight negative.',
        notice: 'The input now pulls z the other way. The line becomes dashed.',
        doneOn: 'weight-flipped',
      },
      {
        id: 'bias',
        title: 'Push with the bias',
        prompt: 'With Step selected, change only the bias until the output changes from 0 to 1.',
        notice: 'The bias decides how large the inputs must be before the neuron fires.',
        doneOn: 'step-flipped',
      },
      {
        id: 'compare',
        title: 'Sigmoid against ReLU',
        prompt: 'Make z negative, then switch between Sigmoid and ReLU.',
        notice: 'Sigmoid gives a small positive number. ReLU gives exactly 0.',
        doneOn: 'activation:compare',
      },
    ],
    questions: [
      {
        id: 'n-stages',
        kind: 'choice',
        prompt: 'A neuron works in two stages. What does the first stage produce?',
        options: [
          {
            text: 'The weighted sum z: each input times its weight, added up, plus the bias',
            correct: true,
            feedback:
              'Right. The neuron first combines its inputs into z, and only then applies the activation function.',
          },
          {
            text: 'The output a',
            feedback:
              'Not yet. The output comes from the second stage, when the activation function is applied to z.',
          },
          {
            text: 'A new set of weights',
            feedback: 'No. Working out an output never changes the weights. The weights stay exactly as set.',
          },
        ],
      },
      {
        id: 'n-zero',
        kind: 'scenario',
        prompt: 'You set weight w₁ to 0. Then you change input x₁ from 0 to 5. What happens to z?',
        options: [
          {
            text: 'Nothing: z stays the same',
            correct: true,
            feedback: 'Right. x₁ is multiplied by w₁ = 0, so it adds 0 to z whatever its value.',
          },
          {
            text: 'z goes up by 5',
            feedback: 'That would be true if w₁ were 1. With w₁ = 0, x₁ contributes 0 × x₁ = 0.',
          },
          {
            text: 'z becomes 0',
            feedback: 'No. Only x₁’s contribution becomes 0. The other input and the bias still count.',
          },
        ],
      },
      {
        id: 'n-step',
        kind: 'choice',
        prompt: 'Which activation function can only give 0 or 1?',
        options: [
          {
            text: 'Step',
            correct: true,
            feedback: 'Right. Step outputs 1 when z is at least 0 and 0 otherwise.',
          },
          {
            text: 'Sigmoid',
            feedback:
              'Sigmoid gives any value between 0 and 1, such as 0.73. It never reaches exactly 0 or 1.',
          },
          {
            text: 'ReLU',
            feedback: 'ReLU gives 0 for negative z and z itself for positive z, so it can exceed 1.',
          },
        ],
      },
    ],
  },
  {
    id: '02',
    title: 'Perceptrons and Logic Gates',
    short: 'Use one neuron to make yes-or-no decisions.',
    description:
      'A perceptron is a neuron that answers yes (1) or no (0). Set its weights and bias by hand so that it behaves like the logic gates AND, OR and NOT. Then try XOR.',
    minutes: '10–15 min',
    concept: 'Decision boundary',
    objectives: [
      'Explain how a perceptron turns a weighted sum into a binary decision with a threshold.',
      'Set weights and a bias by hand so that a perceptron reproduces AND, OR and NOT.',
      'Recognise that a perceptron separates the inputs with one straight line, and that XOR cannot be split that way.',
    ],
    outcomes: ['what a decision boundary is', 'how weights and bias move it', 'why XOR is a problem'],
    primer: {
      intro: 'The neuron from Experiment 01, used to make a decision.',
      terms: [
        { term: 'Perceptron', meaning: 'A neuron whose output is only 0 or 1: a yes-or-no answer.' },
        {
          term: 'Threshold',
          meaning: 'The point where the answer changes. Here: output 1 when z is at least 0.',
          role: 'bias',
        },
        {
          term: 'Class',
          meaning: 'One of the possible answers. A binary classification has two classes, 0 and 1.',
        },
        {
          term: 'Truth table',
          meaning: 'A list of every input combination and the answer it should give.',
          role: 'input',
        },
      ],
    },
    tour: [
      {
        target: 'gate-picker',
        title: 'Pick a target',
        text: 'Each gate has a truth table: the answers the perceptron should give. Start with AND.',
      },
      {
        target: 'truth-table',
        title: 'Check every row',
        text: 'Each row shows what the perceptron outputs for one input combination, and whether that matches the table.',
      },
      {
        target: 'boundary',
        title: 'The decision boundary',
        text: 'The line is where z = 0. Inputs on the shaded side get output 1. Each change of a weight or the bias moves the line.',
        doThis: 'Change the bias and watch the line move.',
        waitFor: 'bias-changed',
      },
      {
        target: 'perceptron-controls',
        title: 'Make it an AND gate',
        text: 'Find weights and a bias that get all four rows right.',
        doThis: 'Get every row of AND correct.',
        waitFor: 'all-correct:AND',
      },
      {
        target: 'gate-picker',
        title: 'Now try XOR',
        text: 'XOR outputs 1 when exactly one input is 1. Try to get all four rows right.',
        doThis: 'Choose XOR.',
        waitFor: 'gate:XOR',
      },
    ],
    challenges: [
      {
        id: 'or',
        title: 'Build OR',
        prompt: 'Find settings that make all four OR rows correct.',
        notice: 'How is it different from your AND settings? Usually only the bias needs to move.',
        doneOn: 'all-correct:OR',
      },
      {
        id: 'not',
        title: 'Build NOT',
        prompt: 'NOT has one input. Make 0 → 1 and 1 → 0.',
        notice: 'The weight must be negative: a larger input has to lower z.',
        doneOn: 'all-correct:NOT',
      },
      {
        id: 'rotate',
        title: 'Turn the line',
        prompt: 'Keep the bias fixed and change only one weight.',
        notice: 'The line turns, it does not just slide.',
        doneOn: 'weight-changed',
      },
      {
        id: 'xor',
        title: 'Fight XOR',
        prompt: 'Try at least five different settings for XOR.',
        notice: 'Watch the “best so far” count. It never reaches 4 of 4.',
        doneOn: 'xor-attempts',
      },
    ],
    questions: [
      {
        id: 'p-rule',
        kind: 'choice',
        prompt: 'In this experiment, when does the perceptron output 1?',
        options: [
          {
            text: 'When its weighted sum plus bias, z, is at least 0',
            correct: true,
            feedback:
              'Right. That is the threshold rule. The decision boundary is exactly the line where z = 0.',
          },
          {
            text: 'When both inputs are 1',
            feedback:
              'That is the AND gate’s truth table. A perceptron only does that if its weights and bias are set to make it so.',
          },
          {
            text: 'When its weights are positive',
            feedback:
              'No. The weights decide how z is formed. The output depends on whether z itself is at least 0.',
          },
        ],
      },
      {
        id: 'p-bias',
        kind: 'scenario',
        prompt:
          'You make the bias much more negative and leave the weights alone. What happens to the region that outputs 1?',
        options: [
          {
            text: 'It grows',
            feedback:
              'No. A more negative bias lowers z for every input, so fewer inputs reach the threshold, not more.',
          },
          {
            text: 'It shrinks: every z drops by the same amount, so fewer inputs reach the threshold',
            correct: true,
            feedback:
              'Right. Lowering the bias lowers z for every input equally, so fewer inputs reach z ≥ 0. This is true for any weights.',
          },
          {
            text: 'It turns around',
            feedback: 'No. The bias only slides the line. Turning it takes a change of the weights.',
          },
        ],
      },
      {
        id: 'p-xor',
        kind: 'choice',
        prompt: 'Why can no setting of one perceptron get all four XOR rows right?',
        options: [
          {
            text: 'Its decision boundary is one straight line, and no straight line puts (0,1) and (1,0) on one side with (0,0) and (1,1) on the other',
            correct: true,
            feedback: 'Right. XOR is not linearly separable. Experiment 03 shows what it takes.',
          },
          {
            text: 'The weights would need to be very large',
            feedback:
              'Size does not help. Larger weights only make the same straight line steeper or flatter.',
          },
          {
            text: 'XOR has too few examples',
            feedback:
              'Four examples are enough for AND and OR. The problem is how XOR’s two classes are arranged.',
          },
        ],
      },
    ],
  },
  {
    id: '03',
    title: 'Linear vs Nonlinear Transformations',
    short: 'Find out why stacking layers is not enough on its own.',
    description:
      'A layer of neurons moves, stretches and turns its inputs. Here you watch what one layer, then two, does to a set of points. Then you add one small nonlinear step and solve XOR.',
    minutes: '10–15 min',
    concept: 'Nonlinearity',
    objectives: [
      'Describe what a linear (affine) transformation does to points: it stretches, turns, shears and shifts, and keeps lines straight.',
      'Show that two linear layers in a row act like a single linear layer.',
      'Explain why a nonlinear activation between layers is what lets a network separate XOR.',
    ],
    outcomes: [
      'why more layers alone add no power',
      'what a nonlinear activation changes',
      'how XOR becomes separable',
    ],
    primer: {
      intro: 'Three ideas. You will see each one happen to real points.',
      terms: [
        {
          term: 'Linear transformation',
          meaning:
            'Multiply by weights and add a bias (strictly, an affine transformation). Straight lines stay straight and parallel lines stay parallel.',
          role: 'weight',
        },
        {
          term: 'Nonlinear transformation',
          meaning: 'Anything that can bend or fold, such as ReLU, which sets every negative value to 0.',
          role: 'bias',
        },
        {
          term: 'Linearly separable',
          meaning: 'Two groups that one straight line can split.',
          role: 'input',
        },
      ],
    },
    tour: [
      {
        target: 'transform-presets',
        title: 'One linear layer',
        text: 'Each preset sets the layer’s weights and bias. The engine moves every point and every grid line.',
        doThis: 'Pick a preset.',
        waitFor: 'transform-preset',
      },
      {
        target: 'two-layers',
        title: 'Two layers in a row',
        text: 'The middle picture is after layer 1, the right one after layer 2. The grid lines are still straight and evenly spaced.',
        doThis: 'Press “Find the single layer that does the same”.',
        waitFor: 'layers-combined',
      },
      {
        target: 'xor-linear',
        title: 'XOR with one straight line',
        text: 'This is the problem from Experiment 02 again.',
        doThis: 'Move a weight or the bias.',
        waitFor: 'xor-linear-changed',
      },
      {
        target: 'nonlinear-toggle',
        title: 'Add a nonlinear step',
        text: 'The same network, the same weights. Only the hidden layer’s activation changes.',
        doThis: 'Switch ReLU on.',
        waitFor: 'nonlinear:on',
      },
    ],
    challenges: [
      {
        id: 'flatten',
        title: 'Squash the plane',
        prompt: 'In Part 1, open the weight controls and make both rows of weights equal.',
        notice: 'Every point lands on one line. Information is lost, but lines stay straight.',
        doneOn: 'transform-custom',
      },
      {
        id: 'compose',
        title: 'Compose two layers',
        prompt: 'In Part 2 choose two different presets, then combine them.',
        notice: 'One layer reproduces the same result.',
        doneOn: 'layers-combined',
      },
      {
        id: 'hidden',
        title: 'Look inside',
        prompt: 'With ReLU on, look at where the four XOR points sit after the hidden layer.',
        notice: 'Two of them land on the same spot. Now one straight line can split the classes.',
        doneOn: 'nonlinear:on',
      },
      {
        id: 'break',
        title: 'Break the solution',
        prompt: 'With ReLU on, change a hidden bias.',
        notice: 'How far can you move it before a point is misclassified?',
        doneOn: 'hidden-changed',
      },
    ],
    questions: [
      {
        id: 'l-compose',
        kind: 'choice',
        prompt: 'Two linear layers, one after the other, with no activation between them, can do…',
        options: [
          {
            text: 'exactly what one linear layer can do, and nothing more',
            correct: true,
            feedback:
              'Right. A linear layer followed by a linear layer is again a linear layer. Part 2 finds that single layer for you.',
          },
          {
            text: 'twice as much as one layer',
            feedback:
              'No. The combination is itself one linear transformation, so it can only stretch, turn, shear and shift.',
          },
          {
            text: 'anything, if the layers are wide enough',
            feedback: 'Width does not help either. Without a nonlinear step, the whole stack stays linear.',
          },
        ],
      },
      {
        id: 'l-grid',
        kind: 'scenario',
        prompt: 'You apply any linear layer to a square grid. What happens to the grid lines?',
        options: [
          {
            text: 'They stay straight, and parallel lines stay parallel',
            correct: true,
            feedback: 'Right, for every choice of weights and bias. That is what “linear” means here.',
          },
          {
            text: 'They can bend into curves',
            feedback: 'Not with a linear layer. Bending needs a nonlinear step such as ReLU.',
          },
          {
            text: 'They always stay exactly the same',
            feedback: 'No. They can be stretched, turned, sheared and shifted. They just stay straight.',
          },
        ],
      },
      {
        id: 'l-fix',
        kind: 'choice',
        prompt: 'Which change lets a network separate XOR?',
        options: [
          {
            text: 'Adding a nonlinear activation between the layers',
            correct: true,
            feedback:
              'Right. The nonlinear step lets the hidden layer fold the inputs, so the output layer’s one straight line can split them.',
          },
          {
            text: 'Adding more linear layers',
            feedback:
              'No. However many linear layers you stack, they act as one, and one straight line cannot split XOR.',
          },
          {
            text: 'Using larger weights',
            feedback: 'No. Larger weights in a linear network still give a straight boundary.',
          },
        ],
      },
    ],
  },
  {
    id: '04',
    title: 'Multilayer Perceptron: From Architecture to Training Trace',
    short: 'Build a network, train it for real, and inspect what happened.',
    description:
      'Neurons connected in layers form a network. Build one, let it learn XOR from examples, and then step through the record of that training, forwards and backwards, down to single operations.',
    minutes: '15–20 min',
    concept: 'Training and the execution trace',
    objectives: [
      'Describe a network’s architecture: its input, hidden and output layers, and how many parameters it has.',
      'Explain training as adjusting parameters, using examples, so that predictions improve.',
      'Tell an epoch from a batch, and say what the loss and the learning rate are.',
      'Inspect a real recorded training run, from epochs down to single operations, and move backwards and forwards through it.',
    ],
    outcomes: [
      'how a network is put together',
      'what happens in one step of training',
      'how to read the record of a real run',
    ],
    primer: {
      intro: 'You already know neurons. Three words for putting them together.',
      terms: [
        { term: 'Layer', meaning: 'A group of neurons that all receive the same inputs.', role: 'input' },
        {
          term: 'Hidden layer',
          meaning:
            'A layer between the input and the output. Its values are internal: you never see them directly unless you inspect them.',
          role: 'weight',
        },
        {
          term: 'Parameters',
          meaning: 'All the weights and biases of the network: the numbers training adjusts.',
          role: 'bias',
        },
      ],
    },
    tour: [
      {
        target: 'architecture',
        title: 'Build the network',
        text: 'This changes the real model the engine will train. The parameter count updates with it.',
        doThis: 'Change the number of neurons.',
        waitFor: 'arch-changed',
      },
      {
        target: 'loss-demo',
        title: 'How wrong is a prediction?',
        text: 'The loss is one number that says how far a prediction is from the target.',
        doThis: 'Move the prediction slider.',
        waitFor: 'loss-moved',
      },
      {
        target: 'train-button',
        title: 'Train it for real',
        text: 'The engine runs every example, works out the adjustments and applies them, and records each operation as it goes.',
        doThis: 'Press “Train the network”.',
        waitFor: 'trained',
      },
      {
        target: 'trace-epochs',
        title: 'The record, one epoch at a time',
        text: 'Each bar is one epoch, a pass through all four examples. Its height is that epoch’s loss.',
        doThis: 'Select an epoch.',
        waitFor: 'epoch-selected',
      },
      {
        target: 'trace-stepper',
        title: 'Move through the run',
        text: 'Step forwards or backwards. Every value you see is read from the record at that point.',
        doThis: 'Press Next.',
        waitFor: 'stepped',
      },
    ],
    challenges: [
      {
        id: 'tiny',
        title: 'Too small a network',
        prompt: 'Train with 1 hidden neuron.',
        notice: 'Compare the final accuracy with the default run in “Runs so far”.',
        doneOn: 'trained:units-1',
      },
      {
        id: 'lr',
        title: 'Too large a step',
        prompt: 'Train with learning rate 10.',
        notice: 'Watch the loss curve: it does not settle the way the default run does.',
        doneOn: 'trained:lr-10',
      },
      {
        id: 'batch',
        title: 'One example at a time',
        prompt: 'Train with batch size 1 and open one epoch.',
        notice: 'Now each epoch holds four batches and four updates.',
        doneOn: 'trained:batch-1',
      },
      {
        id: 'compare',
        title: 'Watch a weight change',
        prompt: 'In the trace explorer, pin a weight, then step forward through an update.',
        notice: 'The difference shown is exactly the step the engine applied.',
        doneOn: 'pinned',
      },
      {
        id: 'ops',
        title: 'Down to the operations',
        prompt: 'Set the detail to “Operations” and step through one forward stage.',
        notice:
          'Each operation is one instruction the engine recorded: a multiplication, an addition, an activation.',
        doneOn: 'detail:operation',
      },
    ],
    questions: [
      {
        id: 'm-epoch',
        kind: 'choice',
        prompt: 'What is an epoch?',
        options: [
          {
            text: 'One complete pass through all the training examples',
            correct: true,
            feedback: 'Right. Within one epoch every example is used once.',
          },
          {
            text: 'One group of examples processed together',
            feedback: 'That is a batch. An epoch contains one or more batches.',
          },
          {
            text: 'One adjustment of the parameters',
            feedback: 'That is an update. There is one update per batch, so an epoch can contain several.',
          },
        ],
      },
      {
        id: 'm-lr',
        kind: 'choice',
        prompt: 'What does the learning rate control?',
        options: [
          {
            text: 'How large each adjustment of the parameters is',
            correct: true,
            feedback:
              'Right. Too small and learning is slow. Too large and each step overshoots, so the loss jumps around.',
          },
          {
            text: 'How many examples are processed together',
            feedback: 'That is the batch size.',
          },
          {
            text: 'How many neurons each layer has',
            feedback: 'That is part of the architecture, not the training.',
          },
        ],
      },
      {
        id: 'm-loss',
        kind: 'scenario',
        prompt:
          'A network predicts 0.9 for an example whose target is 0. Another predicts 0.1 for the same example. Which has the larger loss?',
        options: [
          {
            text: 'The one that predicts 0.9',
            correct: true,
            feedback:
              'Right. Its prediction is further from the target, and the loss measures that distance.',
          },
          {
            text: 'The one that predicts 0.1',
            feedback: 'No. 0.1 is closer to the target 0, so its loss is smaller.',
          },
          {
            text: 'They are equal',
            feedback:
              'No. The loss grows with the distance between prediction and target, and these distances differ.',
          },
        ],
      },
    ],
  },
];

/** The consolidated assessment at the end of Level 1: fixed questions, one or two per experiment. */
export const LEVEL1_ASSESSMENT: (Question & { from: Level1Id })[] = [
  {
    from: '01',
    id: 'a-neuron',
    kind: 'predict',
    prompt: 'A neuron has inputs 2 and 3, weights 1 and 0, and bias −1. What is its weighted sum z?',
    options: [
      { text: '1', correct: true, feedback: 'Right: 2 × 1 + 3 × 0 − 1 = 1.' },
      { text: '4', feedback: 'That forgets that x₂’s weight is 0: 3 × 0 adds nothing.' },
      { text: '5', feedback: 'That adds the inputs without their weights and without the bias.' },
    ],
  },
  {
    from: '01',
    id: 'a-relu',
    kind: 'choice',
    prompt: 'What does ReLU output when z is −2?',
    options: [
      { text: '0', correct: true, feedback: 'Right. ReLU sets every negative z to 0.' },
      { text: '−2', feedback: 'That is what a linear (identity) activation would give.' },
      { text: '2', feedback: 'ReLU does not flip the sign. It replaces negative values with 0.' },
    ],
  },
  {
    from: '02',
    id: 'a-boundary',
    kind: 'choice',
    prompt: 'What is a perceptron’s decision boundary?',
    options: [
      {
        text: 'The line of inputs where its weighted sum plus bias is exactly at the threshold',
        correct: true,
        feedback: 'Right. On one side it outputs 1, on the other 0.',
      },
      {
        text: 'The largest input it accepts',
        feedback: 'No. It is a line through the input space, not a limit.',
      },
      {
        text: 'The set of inputs it gets wrong',
        feedback: 'No. The boundary exists whether or not the answers are right.',
      },
    ],
  },
  {
    from: '02',
    id: 'a-separable',
    kind: 'scenario',
    prompt: 'Which of these gates can a single perceptron NOT implement?',
    options: [
      { text: 'XOR', correct: true, feedback: 'Right. XOR’s classes are not linearly separable.' },
      { text: 'AND', feedback: 'AND is linearly separable: one line puts (1,1) alone on one side.' },
      { text: 'NOT', feedback: 'NOT is one input with a negative weight. It is easy for a perceptron.' },
    ],
  },
  {
    from: '03',
    id: 'a-linear',
    kind: 'choice',
    prompt: 'Why do networks put a nonlinear activation between layers?',
    options: [
      {
        text: 'Without it, any stack of layers acts like a single linear layer',
        correct: true,
        feedback: 'Right. The nonlinear step is what lets more layers represent more.',
      },
      {
        text: 'It makes training faster',
        feedback: 'That is not its main purpose. Its purpose is expressive power.',
      },
      { text: 'It keeps the weights small', feedback: 'No. Activations act on values, not on weights.' },
    ],
  },
  {
    from: '04',
    id: 'a-batch',
    kind: 'predict',
    prompt: 'There are 8 training examples and the batch size is 4. How many batches are in one epoch?',
    options: [
      {
        text: '2',
        correct: true,
        feedback: 'Right: 8 examples in groups of 4 make 2 batches, and so 2 updates per epoch.',
      },
      { text: '4', feedback: 'That is the size of each batch, not the number of batches.' },
      { text: '32', feedback: 'That multiplies instead of dividing.' },
    ],
  },
  {
    from: '04',
    id: 'a-training',
    kind: 'choice',
    prompt: 'Which sentence describes training?',
    options: [
      {
        text: 'Adjusting the parameters, using examples, so that predictions improve',
        correct: true,
        feedback: 'Right. That is the loop you watched in Experiment 04.',
      },
      {
        text: 'Choosing the number of layers',
        feedback: 'That is designing the architecture, which happens before training.',
      },
      {
        text: 'Running the network on one input to see its answer',
        feedback: 'That is a prediction (the forward pass). Training also compares and adjusts.',
      },
    ],
  },
  {
    from: '04',
    id: 'a-trace',
    kind: 'choice',
    prompt: 'What is the training trace you explored in Experiment 04?',
    options: [
      {
        text: 'A record of every operation the engine performed during that run, which you can step through in both directions',
        correct: true,
        feedback: 'Right. Every value you inspected was read from that record.',
      },
      {
        text: 'An animation showing roughly what a network does',
        feedback:
          'No. Nothing in it is drawn by hand. Each step is a recorded operation with its real values.',
      },
      {
        text: 'A summary of the final accuracy only',
        feedback: 'It holds much more: every forward and backward step and every update, for every example.',
      },
    ],
  },
];

export const level1ById = (id: string): Level1Experiment | undefined =>
  LEVEL1_EXPERIMENTS.find((e) => e.id === id);

/**
 * When each technical term may first appear in Level 1 (task §1: "introduce each term at the moment it becomes
 * necessary"). `tests/unit/level1-vocabulary.test.ts` renders every Level 1 experiment and fails if a page uses a
 * term scheduled for a later experiment. Terms marked 'later' belong to Levels 2+ and never appear in Level 1.
 */
export const LEVEL1_TERMS: { label: string; pattern: RegExp; from: Level1Id | 'later' }[] = [
  { label: 'perceptron', pattern: /\bperceptrons?\b/i, from: '02' },
  { label: 'threshold', pattern: /\bthreshold\b/i, from: '02' },
  { label: 'decision boundary', pattern: /\bdecision boundar/i, from: '02' },
  { label: 'truth table', pattern: /\btruth tables?\b/i, from: '02' },
  { label: 'linearly separable', pattern: /\blinear(ly)? separab/i, from: '02' },
  { label: 'affine', pattern: /\baffine\b/i, from: '03' },
  { label: 'layer', pattern: /\blayers?\b/i, from: '03' },
  { label: 'hidden layer', pattern: /\bhidden\b/i, from: '03' },
  { label: 'nonlinear', pattern: /\bnon-?linear/i, from: '03' },
  { label: 'training', pattern: /\btrain(ing|ed|s)?\b/i, from: '04' },
  { label: 'loss', pattern: /\bloss(es)?\b/i, from: '04' },
  { label: 'learning rate', pattern: /\blearning rates?\b/i, from: '04' },
  { label: 'epoch', pattern: /\bepochs?\b/i, from: '04' },
  { label: 'batch', pattern: /\bbatch(es)?\b/i, from: '04' },
  { label: 'parameter', pattern: /\bparameters?\b/i, from: '04' },
  { label: 'trace', pattern: /\btraces?\b/i, from: '04' },
  { label: 'cross-entropy', pattern: /\bcross-entropy\b/i, from: '04' },
  { label: 'gradient', pattern: /\bgradients?\b/i, from: 'later' },
  { label: 'derivative', pattern: /\bderivatives?\b/i, from: 'later' },
  { label: 'back-propagation', pattern: /\bback-?propagat/i, from: 'later' },
  { label: 'chain rule', pattern: /\bchain rule\b/i, from: 'later' },
  { label: 'tensor', pattern: /\btensors?\b/i, from: 'later' },
  { label: 'softmax', pattern: /\bsoftmax\b/i, from: 'later' },
  { label: 'convolution', pattern: /\bconvol/i, from: 'later' },
  { label: 'granularity', pattern: /\bgranularit/i, from: 'later' },
  { label: 'optimiser', pattern: /\boptimi[sz]er\b/i, from: 'later' },
];
