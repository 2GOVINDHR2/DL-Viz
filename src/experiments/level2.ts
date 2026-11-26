/**
 * Level 2 — How Neural Networks Learn (ADR-087).
 *
 * The experiments as data, in the same shape as Level 1 (`LessonExperiment`). Every default is fixed here and
 * nothing is randomised, so every learner starts from the same settings. Questions whose answers depend on the
 * learner's settings are built by the experiment from engine results; the fixed ones below are written to stay true
 * whatever is set.
 *
 * Stage 2 of the Level 2 plan (docs/LEVEL-2-ARCHITECTURE.md) defines Experiments 01 and 02. Experiments 03–05 are
 * listed in LEVEL2_PLANNED so the landing page can show the path. They are defined when their stages are built.
 */
import type { LessonExperiment } from './level1';

export const LEVEL2 = {
  title: 'Level 2 — How Neural Networks Learn',
  tagline:
    'Follow a prediction through a network, measure how wrong it is, and see how gradients tell every weight which way to move.',
  minutes: '95–125 minutes',
  understand: [
    'how a prediction is computed, layer by layer (forward propagation)',
    'how a loss function measures prediction error',
    'how derivatives and gradients say which way each parameter should change',
    'how backpropagation sends gradients back through a network',
    'how automatic differentiation computes those gradients',
    'how one training update follows from all of these, on a network you train yourself',
  ],
};

/** Experiment 01's starting settings: a 3-input neuron, a 2-neuron layer, and a 2-2-1 network. */
export const L2_EXP01_DEFAULTS = {
  neuron: { x: [1, 0.5, -1], w: [0.6, -0.4, 0.3], b: 0.1 },
  layer: { x: [1, 0.5], W: [0.8, -0.5, 0.2, 0.9], b: [0, 0.1] },
  network: {
    x: [1, 0],
    hidden: { W: [0.8, -0.5, 0.2, 0.9], b: [0, 0.1] },
    output: { W: [1.2, -0.7], b: [0.05] },
  },
};

/**
 * Experiment 03's fixed settings (decision D4): a one-input sigmoid neuron on four examples, trained full batch.
 * The data are not separable, so the loss has a finite minimum (near w ≈ 0.602, b ≈ 0.086, loss ≈ 0.6038, checked
 * by tests/unit/level2-training.test.ts). The start w = −1.5, b = 1 is deliberately poor.
 */
export const L2_EXP03_DEFAULTS = {
  xs: [-2, -1, 0.5, 2],
  ys: [0, 1, 0, 1],
  w0: -1.5,
  b0: 1,
  lr: 1,
  learningRates: [0.1, 1, 10],
  epochs: 50,
  /** Part A's curve f(x) = (x − 1)² + 0.5 and its range. */
  parabola: { x0: -0.6, min: 1, range: [-1, 3] as [number, number] },
  /** Part D's learning rates on the parabola: slow, suitable, oscillating, diverging. */
  demoRates: [
    { lr: 0.1, label: 'Small (0.1)', kind: 'small' },
    { lr: 0.45, label: 'Suitable (0.45)', kind: 'good' },
    { lr: 0.9, label: 'Large (0.9)', kind: 'oscillate' },
    { lr: 1.05, label: 'Too large (1.05)', kind: 'diverge' },
  ] as const,
};

/**
 * Experiment 04's network (decision D4): 2-2-1, sigmoid hidden and output, binary cross-entropy, on the four XOR
 * examples, one update per example (batch size 1), examples in a fixed order. The starting weights are fixed so that
 * every learner inspects the same gradients. The aim is to see gradient propagation; XOR convergence is not
 * guaranteed or needed. Weights are in the engine's layout: W[i][j] joins input i to neuron j, row-major.
 */
/**
 * Experiment 05's starting values: the expression (x₁ + x₂)·x₃ of Parts A to C, f = x·y + x of Part D (x used twice),
 * and the finite-difference step of Part C.
 */
export const L2_EXP05_DEFAULTS = {
  product: { 'x₁': 2, 'x₂': -1, 'x₃': 3 },
  shared: { x: 2, y: 3 },
  h: 0.001,
};

export const L2_EXP04_DEFAULTS = {
  initialParams: {
    'L1.W': [0.6, -0.4, -0.3, 0.8],
    'L1.b': [0.1, -0.1],
    'L2.W': [0.9, -0.7],
    'L2.b': [0.05],
  },
  lr: 1,
  epochs: 10,
};

/** Experiment 02's starting settings. */
export const L2_EXP02_DEFAULTS = {
  single: { prediction: 0.3, target: 1 },
  batch: { predictions: [0.9, 0.2, 0.6, 0.4], targets: [1, 0, 1, 0] },
  bce: { p: 0.7, y: 1 },
  logit: 0.8,
};

export const LEVEL2_EXPERIMENTS: LessonExperiment[] = [
  {
    id: '01',
    title: 'Forward Propagation: From Input to Prediction',
    short: 'Follow the numbers from the inputs, through each layer, to a prediction.',
    description:
      'A network computes its prediction by passing numbers forward, one layer at a time. Start with one neuron, put neurons together into a layer, then follow a small network step by step.',
    minutes: '15–20 min',
    concept: 'Forward propagation',
    objectives: [
      'Compute a neuron’s output from several inputs, their weights and a bias.',
      'Explain how a layer of neurons turns one set of inputs into several activations.',
      'Trace a prediction through a 2-2-1 network, layer by layer and operation by operation.',
      'Relate each neuron’s weighted sum to the matrix form z = W a + b.',
    ],
    outcomes: [
      'what flows between layers',
      'how each value contributes to the prediction',
      'what the matrix form means',
    ],
    primer: {
      intro: 'You met neurons and layers in Level 1. Four terms make the step to a whole network precise.',
      terms: [
        {
          term: 'Forward propagation',
          meaning:
            'Computing the prediction: values flow from the inputs through each layer, in order, to the output.',
          role: 'input',
        },
        {
          term: 'Activation',
          meaning: 'A neuron’s output, a = f(z). The activations of one layer are the inputs of the next.',
          role: 'bias',
        },
        {
          term: 'Vector',
          meaning:
            'A list of numbers treated as one thing, such as a layer’s inputs (x₁, x₂) or its activations.',
        },
        {
          term: 'Matrix',
          meaning:
            'A table of numbers. A layer’s weights form a matrix: one row per neuron, one column per input.',
          role: 'weight',
        },
      ],
    },
    tour: [
      {
        target: 'neuron-controls',
        title: 'One neuron, three inputs',
        text: 'Each input has its own weight. The neuron adds up input × weight for every input, then adds the bias.',
        doThis: 'Change any input.',
        waitFor: 'input-changed',
      },
      {
        target: 'layer-view',
        title: 'A layer: neurons side by side',
        text: 'Both neurons receive the same inputs. Each has its own weights and bias, so each computes its own activation.',
        doThis: 'Change a weight of neuron 2.',
        waitFor: 'layer-weight-changed',
      },
      {
        target: 'network-stepper',
        title: 'Follow the prediction',
        text: 'Step through the network. Each step is one recorded step of the engine’s forward pass.',
        doThis: 'Press “Next step”.',
        waitFor: 'forward-step',
      },
      {
        target: 'network-detail',
        title: 'More or less detail',
        text: 'Step a whole layer at a time, or one operation at a time: multiply-and-add, add bias, activate.',
        doThis: 'Choose “Operation”.',
        waitFor: 'forward-detail:operation',
      },
      {
        target: 'matrix-view',
        title: 'The same thing as matrices',
        text: 'Optional: the per-neuron sums, written as one matrix product.',
        doThis: 'Open the matrix view.',
        waitFor: 'matrix-open',
      },
    ],
    challenges: [
      {
        id: 'zero-input',
        title: 'Switch an input off',
        prompt: 'In the network, set input x₂ to 0.',
        notice: 'Which weights stop mattering for this input? Watch their contributions.',
        doneOn: 'network-input-changed',
      },
      {
        id: 'twins',
        title: 'Identical neurons',
        prompt: 'In the layer, give both neurons the same weights and bias.',
        notice: 'They now compute exactly the same activation. A layer of copies adds nothing.',
        doneOn: 'layer-weight-changed',
      },
      {
        id: 'dominate',
        title: 'Who decides the prediction?',
        prompt: 'Change the output weights so that hidden neuron 2 contributes more than hidden neuron 1.',
        notice: 'The contribution is the hidden activation times its output weight.',
        doneOn: 'output-weight-changed',
      },
      {
        id: 'matrix',
        title: 'Check one row',
        prompt:
          'Open the matrix view and compare the first row of W a + b with hidden neuron 1’s weighted sum.',
        notice: 'They are the same number: the matrix form is shorthand for every neuron at once.',
        doneOn: 'matrix-open',
      },
    ],
    questions: [
      {
        id: 'f-input',
        kind: 'choice',
        prompt: 'In forward propagation, what does a hidden layer receive as its input?',
        options: [
          {
            text: 'The activations of the layer before it',
            correct: true,
            feedback:
              'Right. Each layer’s activations are the next layer’s inputs. The first layer receives the network’s inputs.',
          },
          {
            text: 'The final prediction',
            feedback:
              'No. The prediction is computed last, at the output layer. Nothing flows back to the hidden layer in forward propagation.',
          },
          {
            text: 'The target',
            feedback:
              'No. The target is only used afterwards, to measure the error. The forward pass never sees it.',
          },
        ],
      },
      {
        id: 'f-twins',
        kind: 'scenario',
        prompt:
          'Two neurons in the same layer receive the same inputs. When do they compute the same activation?',
        options: [
          {
            text: 'Only when their weights, biases and activation functions are the same',
            correct: true,
            feedback: 'Right. Same inputs, but each neuron combines them with its own weights and bias.',
          },
          {
            text: 'Always, because they receive the same inputs',
            feedback:
              'No. Each neuron has its own weights and bias, so the same inputs usually give different weighted sums.',
          },
          {
            text: 'Never, because neurons in a layer must differ',
            feedback:
              'No. Nothing forces them to differ. With identical weights and bias they compute identical values.',
          },
        ],
      },
      {
        id: 'f-matrix',
        kind: 'choice',
        prompt: 'A layer has 2 neurons and 3 inputs. In z = W a + b, what shape is W?',
        options: [
          {
            text: '2 rows × 3 columns: one row per neuron, one column per input',
            correct: true,
            feedback:
              'Right. Row i holds neuron i’s three weights, so row i times a gives neuron i’s weighted sum.',
          },
          {
            text: '3 rows × 2 columns',
            feedback:
              'That is the transposed layout. In the textbook form used here, rows are neurons and columns are inputs.',
          },
          {
            text: '2 rows × 2 columns',
            feedback: 'W needs one weight for every input of every neuron: 2 × 3 = 6 weights.',
          },
        ],
      },
    ],
  },
  {
    id: '02',
    title: 'Loss Functions: Measuring Prediction Error',
    short: 'Turn “how wrong is the prediction?” into one number.',
    description:
      'Training needs one number that says how wrong the predictions are. Compare predictions with targets, then build two loss functions, mean squared error and binary cross-entropy, and see what each one rewards and punishes.',
    minutes: '15–20 min',
    concept: 'Loss',
    objectives: [
      'Distinguish the error of one prediction from the loss that summarises errors.',
      'Calculate the mean squared error of a few predictions and explain the squaring and the averaging.',
      'Explain how binary cross-entropy treats confident correct and confident wrong probabilities.',
      'Follow a raw output (a logit) through the sigmoid to a probability and then to a loss.',
    ],
    outcomes: ['what a loss value means', 'when MSE and BCE disagree', 'why networks output logits'],
    primer: {
      intro: 'In Level 1 the loss was “how far off a prediction is”. Four terms make that exact.',
      terms: [
        {
          term: 'Error',
          meaning: 'The difference between target and prediction for one example: y − ŷ.',
          role: 'incorrect',
        },
        {
          term: 'Mean squared error (MSE)',
          meaning: 'Square each error, then take the average: one number for many predictions.',
        },
        {
          term: 'Probability',
          meaning: 'A number from 0 to 1 that says how likely the network thinks class 1 is.',
          role: 'input',
        },
        {
          term: 'Logit',
          meaning: 'A raw output before the sigmoid. Any number; the sigmoid turns it into a probability.',
          role: 'bias',
        },
      ],
    },
    tour: [
      {
        target: 'single-error',
        title: 'Prediction against target',
        text: 'The bar is the error: the gap between the prediction and the target.',
        doThis: 'Move the prediction.',
        waitFor: 'prediction-moved',
      },
      {
        target: 'mse-table',
        title: 'Many predictions, one number',
        text: 'Each row squares one error. MSE is the average of the squares.',
        doThis: 'Change one prediction.',
        waitFor: 'mse-changed',
      },
      {
        target: 'bce-controls',
        title: 'Cross-entropy for probabilities',
        text: 'BCE looks at the probability given to the right answer. The less likely the right answer, the larger the loss.',
        doThis: 'Switch the target.',
        waitFor: 'bce-target',
      },
      {
        target: 'logit-chain',
        title: 'From raw output to loss',
        text: 'Logit → sigmoid → probability → loss. Each box is one engine operation.',
        doThis: 'Move the logit.',
        waitFor: 'logit-moved',
      },
    ],
    challenges: [
      {
        id: 'zero',
        title: 'A perfect score',
        prompt: 'Make the MSE exactly 0.',
        notice: 'Only possible when every prediction equals its target.',
        doneOn: 'mse-zero',
      },
      {
        id: 'outlier',
        title: 'One bad prediction',
        prompt: 'Move one prediction far from its target and leave the rest.',
        notice: 'Doubling one error makes its square four times larger: MSE punishes big errors most.',
        doneOn: 'mse-changed',
      },
      {
        id: 'confident',
        title: 'Confident and wrong',
        prompt: 'With target 0, push the probability towards 1.',
        notice: 'BCE climbs steeply. Compare with MSE at the same probability in the comparison chart.',
        doneOn: 'bce-moved',
      },
      {
        id: 'edge',
        title: 'The edge of the scale',
        prompt: 'Set the logit to its largest value with target 0.',
        notice:
          'The probability rounds to 1, and the loss stops growing near 16.1: the engine clips probabilities to avoid log 0.',
        doneOn: 'logit-moved',
      },
    ],
    questions: [
      {
        id: 'l-square',
        kind: 'choice',
        prompt: 'Why does MSE square each error before averaging?',
        options: [
          {
            text: 'So that positive and negative errors cannot cancel out, and large errors count more',
            correct: true,
            feedback:
              'Right. Errors of +0.5 and −0.5 would average to 0. Their squares, 0.25 and 0.25, do not.',
          },
          {
            text: 'To make the loss smaller',
            feedback:
              'Not in general. Squaring makes errors above 1 larger and errors below 1 smaller. The point is the sign and the weighting.',
          },
          {
            text: 'Because predictions are probabilities',
            feedback:
              'No. MSE is used for any numbers. Squaring is about removing the sign and weighting large errors.',
          },
        ],
      },
      {
        id: 'l-bce',
        kind: 'scenario',
        prompt:
          'The target is 1. Network A predicts 0.6 and network B predicts 0.9. Which has the lower binary cross-entropy?',
        options: [
          {
            text: 'B, because it gives the right answer a higher probability',
            correct: true,
            feedback: 'Right. For target 1, BCE = −log p, which gets smaller as p gets closer to 1.',
          },
          {
            text: 'A, because 0.6 is less extreme',
            feedback:
              'No. BCE rewards confidence in the right answer. It punishes confidence only when the answer is wrong.',
          },
          { text: 'They are equal', feedback: 'No. Their probabilities differ, so −log p differs.' },
        ],
      },
      {
        id: 'l-logit',
        kind: 'choice',
        prompt: 'What is a logit?',
        options: [
          {
            text: 'The network’s raw output before the sigmoid: any real number',
            correct: true,
            feedback: 'Right. The sigmoid maps it into (0, 1). A logit of 0 gives probability 0.5.',
          },
          {
            text: 'A probability between 0 and 1',
            feedback: 'That is what the sigmoid produces from the logit.',
          },
          {
            text: 'The loss of one example',
            feedback: 'No. The loss comes after: logit → probability → loss.',
          },
        ],
      },
    ],
  },
  {
    id: '03',
    title: 'Derivatives and Gradient Descent: How Parameters Learn',
    short: 'Slopes, derivatives, and a real single-neuron training run.',
    description:
      'A loss says how wrong the predictions are. A derivative says which way to move a parameter to make it smaller, and gradient descent takes that step. Explore slopes, step downhill on a real loss landscape, then train a neuron and inspect every number of its update.',
    minutes: '20–25 min',
    concept: 'Gradient descent',
    objectives: [
      'Read a slope from a tangent line: positive, negative or zero.',
      'Explain a derivative as the local rate of change of a function, and a gradient as one partial derivative per parameter.',
      'Apply the update w ← w − η·∂L/∂w, telling the gradient apart from the update it produces.',
      'Predict how a small, a suitable and an excessive learning rate move a parameter.',
      'Follow one full-batch update of a real neuron: four predictions and losses, the averaged gradients, and one parameter update.',
    ],
    outcomes: [
      'what a derivative tells you',
      'how a gradient becomes an update',
      'what one training step really computes',
    ],
    primer: {
      intro: 'Loss tells you how wrong the network is. These four terms say what to do about it.',
      terms: [
        {
          term: 'Slope',
          meaning:
            'How steeply a curve rises or falls at a point: positive uphill, negative downhill, zero at the flat bottom.',
          role: 'input',
        },
        {
          term: 'Derivative',
          meaning: 'The slope of a function at one point: how fast its output changes as its input changes.',
          role: 'bias',
        },
        {
          term: 'Gradient',
          meaning:
            'For a function of several parameters, the list of its derivatives, one per parameter, such as (∂L/∂w, ∂L/∂b).',
          role: 'weight',
        },
        {
          term: 'Gradient descent',
          meaning:
            'Repeatedly moving every parameter a little against its derivative, so the loss goes down.',
        },
      ],
    },
    tour: [
      {
        target: 'slope-controls',
        title: 'A point on a curve',
        text: 'The straight line touching the curve at the point is the tangent. Its steepness is the slope.',
        doThis: 'Move the point.',
        waitFor: 'point-moved',
      },
      {
        target: 'landscape',
        title: 'The loss of a real neuron',
        text: 'Every point of this map is a choice of w and b; the shading is the loss there. The arrow points downhill.',
        doThis: 'Take one gradient descent step.',
        waitFor: 'gd-step',
      },
      {
        target: 'lr-demo',
        title: 'Step sizes',
        text: 'The same starting point, different learning rates. Watch where each run ends up.',
        doThis: 'Pick a different learning rate.',
        waitFor: 'lr-demo',
      },
      {
        target: 'train-neuron',
        title: 'Real training',
        text: 'Now the engine trains the neuron and records every operation.',
        doThis: 'Press “Train the neuron”.',
        waitFor: 'trained',
      },
      {
        target: 'one-update',
        title: 'One update, every number',
        text: 'Four examples are processed, their gradients averaged, and the parameters updated once.',
        doThis: 'Reveal the next stage.',
        waitFor: 'update-reveal',
      },
    ],
    challenges: [
      {
        id: 'flat',
        title: 'Find the flat spot',
        prompt: 'Move the point until the slope is zero.',
        notice:
          'That is the bottom of the curve: the minimum. A derivative of zero means no direction is downhill.',
        doneOn: 'slope-zero',
      },
      {
        id: 'walk',
        title: 'Walk downhill',
        prompt: 'Take five gradient descent steps on the landscape.',
        notice: 'The steps get shorter as the ground flattens, even with the same learning rate.',
        doneOn: 'gd-steps-5',
      },
      {
        id: 'overshoot',
        title: 'Too big a step',
        prompt: 'Choose the learning rate that diverges.',
        notice: 'Each step jumps past the minimum and lands higher than before.',
        doneOn: 'lr-demo:diverge',
      },
      {
        id: 'one-vs-four',
        title: 'One update or four?',
        prompt: 'Compare the full batch with updating after every example.',
        notice: 'Same four examples, but four separate updates instead of one averaged update.',
        doneOn: 'batch1-compared',
      },
      {
        id: 'big-lr',
        title: 'Train with learning rate 10',
        prompt: 'Train the real neuron with learning rate 10.',
        notice: 'Compare its loss curve with learning rate 1: it does not settle.',
        doneOn: 'trained:lr-10',
      },
    ],
    questions: [
      {
        id: 'g-vs-u',
        kind: 'choice',
        prompt: 'What is the difference between the gradient ∂L/∂w and the update applied to w?',
        options: [
          {
            text: 'The update is −η times the gradient: the gradient gives the direction uphill, and the update steps the other way, scaled by the learning rate',
            correct: true,
            feedback:
              'Right. The gradient is computed from the loss. The update is what gradient descent does with it: Δw = −η·∂L/∂w.',
          },
          {
            text: 'They are the same number',
            feedback:
              'No. Only with η = 1 and the sign reversed would they match in size. The update is always −η·∂L/∂w.',
          },
          {
            text: 'The update is the gradient plus the learning rate',
            feedback: 'No. The learning rate multiplies the gradient; it is not added to it.',
          },
        ],
      },
      {
        id: 'full-batch',
        kind: 'scenario',
        prompt:
          'A neuron is trained with full-batch gradient descent on 4 examples. How many times are its parameters updated in one epoch?',
        options: [
          {
            text: 'Once: the four examples’ gradients are averaged into one update',
            correct: true,
            feedback:
              'Right. All four examples are processed (four predictions, four losses, four gradients), then one update uses their average.',
          },
          {
            text: 'Four times, once per example',
            feedback:
              'That is training with batch size 1. With the full batch, the four gradients are averaged first.',
          },
          {
            text: 'It depends on the learning rate',
            feedback: 'No. The learning rate sets the size of each update, not how many there are.',
          },
        ],
      },
      {
        id: 'too-large',
        kind: 'scenario',
        prompt: 'With a very large learning rate, the loss jumps up and down and never settles. Why?',
        options: [
          {
            text: 'Each step moves so far that it passes the minimum and lands on the other side, often higher',
            correct: true,
            feedback:
              'Right. The gradient points the right way, but the step is too long for the shape of the loss.',
          },
          {
            text: 'The gradient points the wrong way',
            feedback:
              'No. The gradient is the same whatever the learning rate. Only the size of the step changes.',
          },
          {
            text: 'A large learning rate always converges faster',
            feedback: 'No. Beyond a certain size, gradient descent stops converging altogether.',
          },
        ],
      },
    ],
  },
  {
    id: '04',
    title: 'Backpropagation: How Errors Travel Through a Network',
    short: 'The chain rule, and gradients flowing back through a 2-2-1 network.',
    description:
      'A network’s loss depends on its first layer’s weights only through the layers after them. Backpropagation uses the chain rule to send the gradient back from the loss, layer by layer, so every weight and bias gets its own gradient. Here you follow that, one recorded operation at a time.',
    minutes: '20–25 min',
    concept: 'Backpropagation',
    objectives: [
      'Apply the chain rule to a composed function y = f(g(x)).',
      'Follow one neuron’s backward pass: from ∂L/∂a, through the activation to ∂L/∂z, to ∂L/∂w and ∂L/∂b.',
      'Trace the gradient backwards through a 2-2-1 network, from the output layer to the hidden layer.',
      'Explain any weight’s gradient as the incoming gradient times a local derivative.',
    ],
    outcomes: [
      'what the chain rule says',
      'why the backward pass starts at the loss',
      'where each weight’s gradient comes from',
    ],
    primer: {
      intro: 'In Experiment 03 the gradient arrived ready-made. Here is where it comes from.',
      terms: [
        {
          term: 'Chain rule',
          meaning:
            'For a function of a function, y = f(g(x)): dy/dx = (dy/dg) × (dg/dx). Multiply the rates along the chain.',
          role: 'weight',
        },
        {
          term: 'Local derivative',
          meaning:
            'The derivative of one single operation with respect to its own input, such as σ′(z) for a sigmoid.',
          role: 'bias',
        },
        {
          term: 'Incoming gradient',
          meaning:
            'The gradient of the loss arriving at an operation from the layer after it: ∂L/∂(its output).',
          role: 'incorrect',
        },
        {
          term: 'Backpropagation',
          meaning:
            'Computing every gradient from the loss backwards: incoming gradient × local derivative, layer by layer.',
        },
      ],
    },
    tour: [
      {
        target: 'chain-controls',
        title: 'Two rates, multiplied',
        text: 'y depends on x through g. The chain rule multiplies the two local rates.',
        doThis: 'Move x.',
        waitFor: 'chain-moved',
      },
      {
        target: 'neuron-backward',
        title: 'One neuron, backwards',
        text: 'Each box takes the gradient arriving from its right and multiplies it by its own local derivative.',
        doThis: 'Change the weight w.',
        waitFor: 'neuron-changed',
      },
      {
        target: 'net-train',
        title: 'A real network',
        text: 'The engine trains the 2-2-1 network and records every operation, forward and backward.',
        doThis: 'Press “Run the network”.',
        waitFor: 'trained',
      },
      {
        target: 'net-stepper',
        title: 'Step through one example',
        text: 'Forward first, then backward from the loss. The update is applied only when you ask for it.',
        doThis: 'Step forward to the end of the backward pass.',
        waitFor: 'backward-done',
      },
      {
        target: 'param-inspector',
        title: 'Where a weight’s gradient comes from',
        text: 'Pick any weight: its gradient is the incoming gradient times its input.',
        doThis: 'Choose a hidden-layer weight.',
        waitFor: 'param-picked:L1',
      },
    ],
    challenges: [
      {
        id: 'chain-zero',
        title: 'A broken link',
        prompt: 'In Part A, find an x where dy/dx is 0.',
        notice: 'If any link in the chain has rate 0, the whole product is 0.',
        doneOn: 'chain-zero',
      },
      {
        id: 'right-answer',
        title: 'Nothing to learn',
        prompt: 'In Part B, set w and b so the neuron’s prediction is almost exactly the target.',
        notice: 'All the gradients shrink towards 0: a right answer leaves nothing to correct.',
        doneOn: 'neuron-near-target',
      },
      {
        id: 'zero-input',
        title: 'A silent input',
        prompt: 'In Part C, inspect a hidden weight while example #1, x = (0, 0), is being processed.',
        notice:
          'Its gradient is exactly 0: the weight’s input is 0, so it did not affect this example’s loss.',
        doneOn: 'param-zero-input',
      },
      {
        id: 'replay',
        title: 'Replay before updating',
        prompt: 'Run an example’s backward pass, replay it, then apply its update.',
        notice: 'Replaying changes nothing: the record is fixed. The update happens only once.',
        doneOn: 'update-applied',
      },
    ],
    questions: [
      {
        id: 'b-chain',
        kind: 'choice',
        prompt: 'For y = f(g(x)), what does the chain rule say dy/dx is?',
        options: [
          {
            text: 'f′(g(x)) × g′(x): the rate of f at g, times the rate of g',
            correct: true,
            feedback: 'Right. The rates along the chain multiply.',
          },
          {
            text: 'f′(x) + g′(x)',
            feedback: 'No. Composed rates multiply, they do not add. And f′ is taken at g(x), not at x.',
          },
          {
            text: 'f′(x) × g′(x)',
            feedback: 'Almost: f′ must be evaluated at g(x), the value that f actually receives.',
          },
        ],
      },
      {
        id: 'b-order',
        kind: 'scenario',
        prompt: 'In the backward pass of a 2-2-1 network, which gradients are computed first?',
        options: [
          {
            text: 'The output layer’s, because the hidden layer’s gradients need the gradient arriving from the output layer',
            correct: true,
            feedback:
              'Right. The backward pass starts at the loss and moves towards the inputs. Each layer needs the incoming gradient from the layer after it.',
          },
          {
            text: 'The hidden layer’s, because it comes first in the network',
            feedback:
              'That is the order of the forward pass. Backwards, the hidden layer must wait for the gradient arriving from the output layer.',
          },
          {
            text: 'All at the same time',
            feedback:
              'No. Each layer’s gradients depend on the gradient from the layer after it, so they are computed in order.',
          },
        ],
      },
      {
        id: 'b-weight',
        kind: 'choice',
        prompt: 'A weight connects input aᵢ to neuron j. What is its gradient ∂L/∂w?',
        options: [
          {
            text: 'aᵢ × ∂L/∂zⱼ: the weight’s input times the gradient arriving at neuron j',
            correct: true,
            feedback: 'Right. The local derivative of z = … + w·aᵢ + … with respect to w is aᵢ.',
          },
          {
            text: 'w × ∂L/∂zⱼ',
            feedback:
              'No. That would be the gradient passed back to the input aᵢ, not the weight’s own gradient.',
          },
          {
            text: 'The same for every weight of the layer',
            feedback: 'No. Each weight’s gradient depends on its own input aᵢ.',
          },
        ],
      },
    ],
  },
  {
    id: '05',
    title: 'Automatic Differentiation: Inside the Computational Graph',
    short:
      'How the engine computes every gradient, and a final challenge: train a network and account for every number of one update.',
    description:
      'The engine never works out a formula for a gradient. It records every operation as a node of a computational graph while it computes the forward pass, then runs the graph in reverse, applying each operation’s local derivative. This is automatic differentiation. Here you watch it on small expressions, check it against a numerical estimate, and open the graph the engine recorded for one real training example. The final challenge brings Level 2 together: train a small network and take one of its updates apart.',
    minutes: '25–35 min',
    concept: 'Automatic differentiation',
    objectives: [
      'Read an expression as a computational graph of operations.',
      'Follow the forward pass through the graph, and then the reverse pass from the output back to every input.',
      'Explain why a value used in two places receives the sum of two gradient contributions.',
      'Check a gradient against a finite-difference estimate.',
      'Recognise the same graph in the record of a real training example.',
      'Train a small network and account for one update: prediction, loss, backward pass, gradients and the change to every parameter.',
    ],
    outcomes: [
      'what a computational graph is',
      'how reverse-mode automatic differentiation computes every gradient in one backward pass',
      'why gradients add up where a value is shared',
      'how one training update follows from one forward and one backward pass',
    ],
    primer: {
      intro:
        'Experiment 04 used the chain rule by hand, layer by layer. The engine does the same thing automatically, for any arrangement of operations.',
      terms: [
        {
          term: 'Computational graph',
          meaning:
            'The operations of a calculation drawn as connected nodes: each node takes the values on its incoming edges and produces one value.',
          role: 'weight',
        },
        {
          term: 'Automatic differentiation',
          meaning:
            'Computing exact derivatives by applying each operation’s own local derivative along the graph, instead of working out a formula.',
          role: 'bias',
        },
        {
          term: 'Reverse mode',
          meaning:
            'Automatic differentiation that starts at the output and works backwards. One pass gives the derivative of the output with respect to every input.',
          role: 'incorrect',
        },
        {
          term: 'Finite difference',
          meaning:
            'An estimate of a derivative from two nearby values: (f(x + h) − f(x − h)) / 2h. Useful as a check, but approximate.',
        },
      ],
    },
    tour: [
      {
        target: 'graph-inputs',
        title: 'A calculation as a graph',
        text: 'Every operation is a node; its inputs arrive along edges.',
        doThis: 'Change one of the inputs.',
        waitFor: 'graph-changed',
      },
      {
        target: 'graph-stepper',
        title: 'Forwards, then in reverse',
        text: 'The forward pass computes each node’s value. The reverse pass starts at the output and sends gradients back.',
        doThis: 'Step to the end of the reverse pass.',
        waitFor: 'reverse-done',
      },
      {
        target: 'graph-shared',
        title: 'A value used twice',
        text: 'x feeds two operations, so two gradient contributions arrive at it.',
        doThis: 'Change x or y.',
        waitFor: 'shared-changed',
      },
      {
        target: 'graph-modes',
        title: 'Why the engine works backwards',
        text: 'A loss is one number with many parameters. Working backwards gives every parameter’s gradient in one pass.',
        doThis: 'Choose another network.',
        waitFor: 'modes-network',
      },
      {
        target: 'real-graph',
        title: 'The engine’s own graph',
        text: 'One training example, as the engine recorded it: every step and where its values came from.',
        doThis: 'Pick a step of the graph.',
        waitFor: 'real-node-picked',
      },
    ],
    challenges: [
      {
        id: 'zero-path',
        title: 'A closed path',
        prompt: 'In Parts A to C, make the gradient of x₁ exactly 0 without changing x₁.',
        notice:
          'Set x₃ to 0. The gradient reaching x₁ passes through the multiply, whose local derivative for that input is x₃.',
        doneOn: 'grad-x1-zero',
      },
      {
        id: 'cancel',
        title: 'Two contributions that cancel',
        prompt: 'In Part D, make the gradient of x exactly 0 while both contributions are not 0.',
        notice: 'With y = −1 the two contributions are +1 and −1: they still both arrive, and add up to 0.',
        doneOn: 'shared-zero',
      },
      {
        id: 'rough-estimate',
        title: 'A rough estimate',
        prompt: 'In Part C, with the sigmoid expression, make the finite-difference step h large.',
        notice:
          'The estimate drifts away from the exact gradient: a finite difference is only an approximation. Automatic differentiation has no step size.',
        doneOn: 'fd-off',
      },
      {
        id: 'updated-weight',
        title: 'Where a weight came from',
        prompt: 'In Part F, open example 3 and pick the weight that its first multiply uses.',
        notice:
          'It is not the starting weight: its edge leads to example 2’s update, which changed it. The record links each value to the step that made it.',
        doneOn: 'source-update',
      },
      {
        id: 'final-follow',
        title: 'Final challenge: follow one update',
        prompt:
          'In Part G, train a network, then open each of the five stages of one update in the record: prediction, loss, backpropagation, gradients and update.',
        notice:
          'One update is one forward pass and one backward pass per example, then one change to every weight and bias. Every number came from the record.',
        doneOn: 'ch-complete',
      },
      {
        id: 'final-mean',
        title: 'Final challenge: a batch’s average',
        prompt: 'In Part G, with batch size 8, open the gradients of an update.',
        notice:
          'Each of the 8 examples has its own gradient; the update uses their mean ḡ. The check beside it recomputes that mean from the 8 recorded gradients.',
        doneOn: 'ch-mean',
      },
      {
        id: 'final-compare',
        title: 'Final challenge: before and after',
        prompt: 'In Part G, compare the decision after epoch 1 with the decision after a later epoch.',
        notice:
          'The boundary moves as the updates accumulate. Try η = 0.05 with batch size 40: with few, small updates the network may still be far from separating the clusters after 20 epochs.',
        doneOn: 'ch-compare',
      },
    ],
    questions: [
      {
        id: 'ad-reverse',
        kind: 'scenario',
        prompt:
          'A network has 10,000 weights and one loss. Why does the engine compute gradients backwards, from the loss?',
        options: [
          {
            text: 'One backward pass gives the gradient of the loss with respect to all 10,000 weights',
            correct: true,
            feedback:
              'Right. Reverse mode costs about one extra pass however many inputs there are. Working forwards would need one pass per weight.',
          },
          {
            text: 'Because the forward pass cannot be repeated',
            feedback: 'It can. The reason is cost: backwards, one pass covers every weight.',
          },
          {
            text: 'Because working backwards gives more exact gradients',
            feedback:
              'Both directions give exact derivatives. The difference is how many passes are needed: one backwards, one per weight forwards.',
          },
        ],
      },
      {
        id: 'ad-shared',
        kind: 'choice',
        prompt: 'A value v is used by two operations. What is ∂f/∂v?',
        options: [
          {
            text: 'The sum of the two contributions that arrive at v',
            correct: true,
            feedback:
              'Right. Changing v changes f along both paths, so the effects add. The engine adds the contributions as they arrive.',
          },
          {
            text: 'The larger of the two contributions',
            feedback: 'No. Both paths carry v’s effect on f, so both count, and they add.',
          },
          {
            text: 'Only the first contribution to arrive',
            feedback: 'No. The engine keeps adding contributions until every path has been followed back.',
          },
        ],
      },
      {
        id: 'ad-update',
        kind: 'choice',
        prompt:
          'With batch size 8, how does the engine turn the 8 examples’ gradients into one change of a weight w?',
        options: [
          {
            text: 'It averages them into ḡ, then w ← w − η·ḡ',
            correct: true,
            feedback: 'Right. One update per batch, using the mean of the batch’s gradients.',
          },
          {
            text: 'It applies the 8 gradients one after another',
            feedback:
              'That is training with batch size 1. With batch size 8 there is one update, using their mean.',
          },
          {
            text: 'It uses the largest of the 8 gradients',
            feedback: 'No. Every example counts equally: the update uses their mean.',
          },
        ],
      },
      {
        id: 'ad-fd',
        kind: 'choice',
        prompt: 'Why does the engine not compute gradients with finite differences?',
        options: [
          {
            text: 'They are approximate, depend on the step h, and need two extra evaluations for every single parameter',
            correct: true,
            feedback:
              'Right. They make a good check, which is how they are used in the engine’s tests, but automatic differentiation is exact and far cheaper.',
          },
          {
            text: 'They give the wrong sign',
            feedback: 'No. With a small h they are close to the exact value, sign included.',
          },
          {
            text: 'They only work for linear functions',
            feedback:
              'No. They estimate any smooth function’s derivative, but only approximately, and at a cost of two evaluations per parameter.',
          },
        ],
      },
    ],
  },
];

/** Experiments of later stages: listed on the landing page, not yet open. None remain since Stage 5. */
export const LEVEL2_PLANNED: {
  id: string;
  title: string;
  short: string;
  minutes: string;
  concept: string;
}[] = [];

export type Level2Id = '01' | '02' | '03' | '04' | '05';

/**
 * When each technical term may first appear in Level 2. Every Level 1 term is allowed. A term scheduled for a later
 * Level 2 experiment, or for a later level ('later'), fails `tests/unit/level2-vocabulary.test.ts`.
 */
export const LEVEL2_TERMS: { label: string; pattern: RegExp; from: Level2Id | 'later' }[] = [
  { label: 'slope', pattern: /\bslopes?\b/i, from: '03' },
  { label: 'derivative', pattern: /\bderivatives?\b/i, from: '03' },
  { label: 'gradient', pattern: /\bgradients?\b/i, from: '03' },
  { label: 'gradient descent', pattern: /\bgradient descent\b/i, from: '03' },
  { label: 'tangent', pattern: /\btangent\b/i, from: '03' },
  { label: 'loss landscape', pattern: /\bloss (landscape|surface)\b/i, from: '03' },
  { label: 'chain rule', pattern: /\bchain rule\b/i, from: '04' },
  { label: 'backpropagation', pattern: /\bback-?propagat/i, from: '04' },
  { label: 'automatic differentiation', pattern: /\b(automatic differentiation|autodiff)\b/i, from: '05' },
  { label: 'computational graph', pattern: /\bcomputational graph\b/i, from: '05' },
  { label: 'reverse mode', pattern: /\b(reverse|forward)[- ]mode\b/i, from: '05' },
  { label: 'finite difference', pattern: /\bfinite[- ]difference/i, from: '05' },
  { label: 'momentum', pattern: /\bmomentum\b/i, from: 'later' },
  { label: 'Adam / RMSprop', pattern: /\b(adam|rmsprop)\b/i, from: 'later' },
  { label: 'regularisation', pattern: /\bregulari[sz]/i, from: 'later' },
  { label: 'dropout', pattern: /\bdropout\b/i, from: 'later' },
  { label: 'overfitting', pattern: /\b(over|under)fit/i, from: 'later' },
  { label: 'convolution', pattern: /\bconvol/i, from: 'later' },
  { label: 'recurrent / LSTM / GRU', pattern: /\b(recurrent|LSTM|GRU)\b/, from: 'later' },
  { label: 'transformer / attention', pattern: /\b(transformer|attention)\b/i, from: 'later' },
  { label: 'softmax', pattern: /\bsoftmax\b/i, from: 'later' },
  { label: 'tensor', pattern: /\btensors?\b/i, from: 'later' },
];

export const level2ById = (id: string): LessonExperiment | undefined =>
  LEVEL2_EXPERIMENTS.find((e) => e.id === id);
