/**
 * Level 4 — Deep Learning Architectures, as data (ADR-100): the level's metadata, the fixed tasks its experiments
 * train on, every experiment's objectives, primer, tour, challenges and fixed questions, and the vocabulary schedule.
 * Screens live in src/learn/level4.
 *
 * Tasks (chosen from recorded sweeps, reports/LEVEL4-*.md):
 *  - Experiment 01 trains nothing: every convolution and pooling result is an engine probe (a real run with η = 0).
 *    Its kernels are chosen by hand and are labelled so.
 *  - Experiment 02: 36 noisy 8×8 bar images (horizontal, vertical, diagonal), a CNN
 *    conv(4, 3×3, pad 1, ReLU) → max-pool 2 → conv(4, 3×3, pad 1, ReLU) → max-pool 2 → flatten → dense(3, softmax),
 *    plain gradient descent η = 0.1, batch 6, 30 epochs: the loss falls from ≈0.96 to ≈0.04.
 */
import type { DatasetSpec } from '../core/engine/protocol';
import type { TrainConfig } from '../core/engine/session';
import type { LessonExperiment } from './level1';

export const LEVEL4 = {
  title: 'Level 4 — Deep Learning Architectures',
  tagline:
    'Look inside the architectures deep learning is built from: convolutional networks for images, recurrent networks and their gated forms for sequences, and autoencoders that learn compact representations.',
  minutes: '140–180 minutes',
  understand: [
    'how a convolution turns an image into feature maps, and how a CNN learns its filters',
    'how a recurrent network carries a hidden state from one time step to the next',
    'how gradients flow backward through time, and why they can vanish or explode',
    'how LSTM and GRU gates control what is kept and what is forgotten',
    'how an autoencoder squeezes its input into a small latent code and rebuilds it',
  ],
};

/** Experiment 02's task: small bar images, three classes. */
export const L4_CNN = {
  dataset: { kind: 'bars', n: 36, size: 8, seed: 4 } as DatasetSpec,
  classes: ['horizontal', 'vertical', 'diagonal'],
  epochs: 30,
  lr: 0.1,
  batchSize: 6,
};

export function l4CnnConfig(epochs = L4_CNN.epochs): TrainConfig {
  return {
    seed: 1,
    epochs,
    batchSize: L4_CNN.batchSize,
    shuffle: false,
    loss: 'cce',
    optimizer: { type: 'sgd', lr: L4_CNN.lr },
    boundaryGrid: 0,
    model: {
      inputShape: [1, 8, 8],
      layers: [
        { type: 'conv2d', filters: 4, kernel: 3, padding: 1, activation: 'relu' },
        { type: 'pool', mode: 'max', size: 2 },
        { type: 'conv2d', filters: 4, kernel: 3, padding: 1, activation: 'relu' },
        { type: 'pool', mode: 'max', size: 2 },
        { type: 'flatten' },
        { type: 'dense', units: 3, activation: 'softmax' },
      ],
    },
  };
}

/** Experiment 03's task: is the sum of five values positive? A recurrent layer of 4 hidden units reads them in order. */
export const L4_RNN = {
  dataset: { kind: 'sequence', task: 'sum', n: 32, steps: 5, seed: 2 } as DatasetSpec,
  steps: 5,
  hidden: 4,
  epochs: 40,
  lr: 0.05,
  batchSize: 8,
};

export function l4RnnConfig(epochs = L4_RNN.epochs): TrainConfig {
  return {
    seed: 1,
    epochs,
    batchSize: L4_RNN.batchSize,
    shuffle: false,
    loss: 'bce',
    optimizer: { type: 'adam', lr: L4_RNN.lr, beta1: 0.9, beta2: 0.999, epsilon: 1e-8 },
    boundaryGrid: 0,
    model: {
      inputShape: [L4_RNN.steps, 1],
      layers: [
        { type: 'extension', kind: 'rnn', options: { hidden: L4_RNN.hidden } },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
    },
  };
}

const later = (
  id: string,
  title: string,
  short: string,
  minutes: string,
  concept: string,
): LessonExperiment => ({
  id,
  title,
  short,
  description: short,
  minutes,
  concept,
  objectives: [],
  outcomes: [],
  primer: { intro: '', terms: [] },
  tour: [],
  challenges: [],
  questions: [],
});

export const LEVEL4_EXPERIMENTS: LessonExperiment[] = [
  {
    id: '01',
    title: 'Convolutional Neural Networks: From Filters to Feature Maps',
    short: 'Slide a small filter across an image, one position at a time, and watch a feature map appear.',
    description:
      'A convolutional layer does not connect every input to every neuron. It slides one small grid of weights (a kernel) across the image and, at every position, multiplies and sums. Here you step through a real convolution computed by the engine, change its stride and padding, pool its result, and see which simple patterns different kernels respond to.',
    minutes: '20–25 min',
    concept: 'Convolution',
    objectives: [
      'Step through a convolution: kernel position, input patch, products, sum, output cell.',
      'Predict the size of a feature map from the input size, kernel, stride and padding.',
      'Explain what max pooling and average pooling keep.',
      'Recognise which simple patterns an edge kernel responds to.',
      'Explain how a convolutional layer differs from a fully connected one.',
    ],
    outcomes: ['what a kernel does', 'how stride and padding set the output size', 'what pooling is for'],
    primer: {
      intro:
        'A dense layer gives every neuron its own weight for every input pixel. A convolutional layer instead reuses one small set of weights everywhere in the image.',
      terms: [
        {
          term: 'Kernel (filter)',
          meaning: 'A small grid of weights, for example 3×3, that is slid across the image.',
          role: 'weight',
        },
        {
          term: 'Convolution',
          meaning:
            'At each position, multiply the kernel by the patch of input under it, element by element, and add up the products. The sum is one output value.',
        },
        {
          term: 'Feature map',
          meaning: 'The grid of all those sums: how strongly the kernel’s pattern appears at each position.',
          role: 'correct',
        },
        {
          term: 'Stride and padding',
          meaning:
            'Stride is how far the kernel moves between positions. Padding adds a border of zeros around the input. Together with the kernel size they set the size of the feature map.',
        },
        {
          term: 'Pooling',
          meaning:
            'Shrinking a feature map by summarising each small block, by its largest value (max pooling) or its average (average pooling).',
        },
        {
          term: 'Receptive field',
          meaning:
            'The part of the input that one output value depends on: here, the patch under the kernel.',
          role: 'input',
        },
      ],
    },
    tour: [
      {
        target: 'cv-step',
        title: 'One position at a time',
        text: 'The kernel sits on a 3×3 patch. Each input value is multiplied by the kernel value on top of it, and the nine products are added.',
        doThis: 'Move the kernel to the next position.',
        waitFor: 'cv-moved',
      },
      {
        target: 'cv-shape',
        title: 'Stride and padding',
        text: 'A larger stride skips positions; padding adds a border so the kernel can sit on the edges.',
        doThis: 'Change the stride or the padding.',
        waitFor: 'cv-shape-changed',
      },
      {
        target: 'cv-pool',
        title: 'Pooling',
        text: 'Each output cell summarises one 2×2 block of the feature map.',
        doThis: 'Pick an output cell of the pooled map.',
        waitFor: 'cv-pool-picked',
      },
      {
        target: 'cv-filters',
        title: 'What a kernel detects',
        text: 'The same kernel gives a large value where its pattern appears and a small one elsewhere.',
        doThis: 'Choose another input pattern.',
        waitFor: 'cv-pattern-picked',
      },
    ],
    challenges: [
      {
        id: 'cv-max',
        title: 'Find the strongest response',
        prompt: 'In Part A, step the kernel to the position with the largest output value.',
        notice: 'It is where the input under the kernel looks most like the kernel itself.',
        doneOn: 'cv-max-found',
      },
      {
        id: 'cv-same',
        title: 'Keep the size',
        prompt: 'In Part B, find the stride and padding that give an output as large as the input.',
        notice:
          'With a 3×3 kernel, stride 1 and padding 1 keep the size: the border lets the kernel visit every pixel.',
        doneOn: 'cv-same-found',
      },
      {
        id: 'cv-uniform',
        title: 'Nothing to see',
        prompt: 'In Part D, give the edge kernels a uniform patch.',
        notice:
          'An edge kernel’s weights add up to 0, so on a uniform patch the products cancel: no edge, no response.',
        doneOn: 'cv-uniform-seen',
      },
    ],
    questions: [
      {
        id: 'cv-size',
        kind: 'predict',
        prompt: 'A 6×6 input, a 3×3 kernel, stride 1, no padding. How large is the feature map?',
        options: [
          { text: '4×4', correct: true, feedback: 'Right. (6 − 3)/1 + 1 = 4 positions in each direction.' },
          { text: '6×6', feedback: 'That needs padding 1. Without it the kernel cannot sit on the border.' },
          {
            text: '3×3',
            feedback: 'That would need a 4×4 kernel. A 3×3 kernel fits in 4 positions along each side.',
          },
        ],
      },
      {
        id: 'cv-weights',
        kind: 'choice',
        prompt:
          'A layer maps a 1×8×8 image to 4 feature maps with 3×3 kernels. How many weights does it have, biases aside?',
        options: [
          {
            text: '36: four kernels of 3×3, reused at every position',
            correct: true,
            feedback: 'Right. A dense layer from 64 inputs to 4×8×8 outputs would need 16 384.',
          },
          { text: '256', feedback: 'That counts one weight per output value; the kernels are shared.' },
          { text: '16 384', feedback: 'That is a dense layer. Convolution reuses each kernel everywhere.' },
        ],
      },
      {
        id: 'cv-maxpool',
        kind: 'choice',
        prompt: 'Max pooling 2×2 on the block [1, 5; 2, 0]. What is the output?',
        options: [
          { text: '5', correct: true, feedback: 'Right. Max pooling keeps the largest value of the block.' },
          { text: '2', feedback: 'That is the average; max pooling keeps the largest.' },
          { text: '8', feedback: 'That is the sum; pooling keeps one value, the largest.' },
        ],
      },
    ],
  },
  {
    id: '02',
    title: 'CNN Training: From Image to Prediction',
    short:
      'Train a small CNN on bar images, then follow one image through every layer and watch its kernels learn.',
    description:
      'A small convolutional network learns to tell horizontal, vertical and diagonal bars apart. You train it in the engine and then follow one image through the recorded run: the feature maps of both convolutional layers, the pooled maps, the flattened vector, the class probabilities and the loss. Finally you see how gradient descent changed the kernels.',
    minutes: '25–30 min',
    concept: 'CNN training',
    objectives: [
      'Follow an image through a CNN: convolution, ReLU, pooling, flattening, dense layer, softmax.',
      'Read the class probabilities and the loss of one prediction from the record.',
      'Compare the kernels before and after training.',
      'Read one update of a kernel weight: its gradient, the step and the value before and after.',
    ],
    outcomes: [
      'how a CNN turns an image into a prediction',
      'that kernels are learned, not designed',
      'that a kernel weight is updated like any other weight',
    ],
    primer: {
      intro:
        'In Experiment 01 the kernels were chosen by hand. In a CNN they start random and are learned by gradient descent, exactly like the weights of a dense layer.',
      terms: [
        {
          term: 'Convolutional layer',
          meaning:
            'A layer of several kernels; each gives its own feature map, which then goes through an activation.',
          role: 'weight',
        },
        {
          term: 'Flatten',
          meaning: 'Laying the last feature maps out as one long vector, so a dense layer can read them.',
        },
        {
          term: 'Logits and softmax',
          meaning:
            'The dense layer’s raw scores for each class are the logits; softmax turns them into probabilities that add up to 1.',
          role: 'correct',
        },
        {
          term: 'Cross-entropy',
          meaning: 'The loss for classes: −log of the probability given to the correct class.',
          role: 'incorrect',
        },
      ],
    },
    tour: [
      {
        target: 'cn-train',
        title: 'Train the CNN',
        text: 'The engine trains the network on 36 bar images and records every step.',
        doThis: 'Train and record.',
        waitFor: 'trained',
      },
      {
        target: 'cn-forward',
        title: 'Follow one image',
        text: 'Each kernel of the first layer gives a feature map; pooling halves it; the second layer combines them.',
        doThis: 'Choose another image.',
        waitFor: 'cn-example-picked',
      },
      {
        target: 'cn-kernels',
        title: 'Learned kernels',
        text: 'The kernels started random. Training changed them so that their feature maps separate the classes.',
        doThis: 'Choose another epoch.',
        waitFor: 'cn-epoch-picked',
      },
      {
        target: 'cn-update',
        title: 'One update of a kernel weight',
        text: 'A kernel weight is updated like any weight: Δ = −η·ḡ.',
        doThis: 'Choose another update.',
        waitFor: 'cn-update-picked',
      },
    ],
    challenges: [
      {
        id: 'cn-wrong',
        title: 'An early mistake',
        prompt: 'In Part B, at epoch 1, find an image the network classified wrongly.',
        notice:
          'Before training, the probabilities are close to ⅓ each; the largest is often the wrong class.',
        doneOn: 'cn-wrong-found',
      },
      {
        id: 'cn-sure',
        title: 'Confident at the end',
        prompt: 'In Part B, at the last epoch, look at the probability of the correct class.',
        notice: 'After training it is close to 1, and the loss −log p is close to 0.',
        doneOn: 'cn-sure-seen',
      },
      {
        id: 'cn-changed',
        title: 'Kernels move',
        prompt: 'In Part C, compare a kernel at epoch 1 and at the last epoch.',
        notice: 'Every kernel value changed: the network learned which patterns to look for.',
        doneOn: 'cn-epoch-picked',
      },
    ],
    questions: [
      {
        id: 'cn-flatten',
        kind: 'predict',
        prompt:
          'The last pooling layer gives 4 feature maps of 2×2. How many inputs does the dense layer receive after flattening?',
        options: [
          { text: '16', correct: true, feedback: 'Right. 4 × 2 × 2 = 16 values in one vector.' },
          { text: '4', feedback: 'Each map has 4 values, and there are 4 maps.' },
          { text: '8', feedback: '4 maps of 2×2 is 16 values.' },
        ],
      },
      {
        id: 'cn-loss',
        kind: 'choice',
        prompt: 'The network gives the correct class probability 0.5. What is the cross-entropy loss?',
        options: [
          {
            text: '≈ 0.69 (−ln 0.5)',
            correct: true,
            feedback: 'Right. A probability of 1 would give loss 0.',
          },
          { text: '0.5', feedback: 'The loss is −log p, not 1 − p.' },
          { text: '0', feedback: 'Only a probability of 1 gives loss 0.' },
        ],
      },
      {
        id: 'cn-kernel-grad',
        kind: 'choice',
        prompt: 'Why does one kernel weight get a gradient from every position of the image?',
        options: [
          {
            text: 'The same weight is used at every position, so every position’s effect on the loss adds up',
            correct: true,
            feedback: 'Right. A shared weight collects the gradient of all its uses.',
          },
          {
            text: 'Each position has its own copy of the weight',
            feedback: 'No: there is one kernel, reused.',
          },
          {
            text: 'Only the centre position matters',
            feedback: 'Every position the kernel visits contributes.',
          },
        ],
      },
    ],
  },
  {
    id: '03',
    title: 'Recurrent Neural Networks: Learning from Sequences',
    short: 'Read a sequence one step at a time, carrying a hidden state forward.',
    description:
      'Some inputs are sequences: the order matters, and the length can vary. A recurrent network reads one element at a time and keeps a hidden state, a small vector that summarises what it has read so far. Here a recurrent layer learns whether five numbers add up to more than zero, and you follow its hidden state from one time step to the next, in the engine’s record.',
    minutes: '20–25 min',
    concept: 'Recurrence',
    objectives: [
      'Unroll a recurrent layer into one copy per time step and read its inputs and hidden states.',
      'Compute a hidden state from the input, the previous hidden state and the weights.',
      'Recognise that the same weights are used at every time step.',
      'Explain how the final hidden state becomes the prediction.',
    ],
    outcomes: [
      'what a hidden state is',
      'why the same weights serve every time step',
      'how a recurrent network turns a sequence into one prediction',
    ],
    primer: {
      intro:
        'A dense network reads all its inputs at once. A recurrent network reads a sequence one element at a time, and carries what it has read so far in its hidden state.',
      terms: [
        {
          term: 'Sequence and time step',
          meaning: 'An ordered list of inputs x₁, x₂, …; position t in the list is time step t.',
          role: 'input',
        },
        {
          term: 'Hidden state hₜ',
          meaning: 'A small vector the layer updates at every time step: its summary of the sequence so far.',
          role: 'correct',
        },
        {
          term: 'Recurrent connection',
          meaning:
            'The previous hidden state hₜ₋₁ is an input of the next step: hₜ = tanh(xₜ·W + hₜ₋₁·U + b).',
          role: 'weight',
        },
        {
          term: 'Unrolling',
          meaning:
            'Drawing the layer once per time step, left to right, so that each copy shows one step’s computation.',
        },
        {
          term: 'Shared weights',
          meaning: 'W, U and b are the same at every time step: one set of weights, used again and again.',
          role: 'bias',
        },
      ],
    },
    tour: [
      {
        target: 'rn-train',
        title: 'Train the network',
        text: 'The engine trains a recurrent layer of 4 hidden units on 32 sequences of five numbers.',
        doThis: 'Train and record.',
        waitFor: 'trained',
      },
      {
        target: 'rn-unroll',
        title: 'Unrolled in time',
        text: 'One column per time step: the input, the hidden state before and the hidden state after.',
        doThis: 'Choose another sequence.',
        waitFor: 'rn-example-picked',
      },
      {
        target: 'rn-step',
        title: 'One time step',
        text: 'The new hidden state mixes the current input and the previous hidden state.',
        doThis: 'Move to another time step.',
        waitFor: 'rn-step-moved',
      },
      {
        target: 'rn-shared',
        title: 'Shared weights',
        text: 'Every time step multiplies by the same W and the same U: the same recorded values.',
        doThis: 'Look at the table, then read the prediction below.',
        waitFor: 'rn-shared-seen',
      },
    ],
    challenges: [
      {
        id: 'rn-all',
        title: 'Follow the memory',
        prompt: 'In Part B, visit all five time steps of one sequence.',
        notice: 'Each hidden state depends on the one before: they can only be computed in order.',
        doneOn: 'rn-all-steps',
      },
      {
        id: 'rn-wrong',
        title: 'Before it learned',
        prompt: 'In Part D, at epoch 1, find a sequence whose prediction is wrong.',
        notice: 'Untrained, the final hidden state carries no useful summary yet.',
        doneOn: 'rn-wrong-found',
      },
      {
        id: 'rn-same',
        title: 'One U for all',
        prompt: 'In Part C, check which recorded value each time step’s U refers to.',
        notice: 'It is the same at every step: the layer has one U, however long the sequence.',
        doneOn: 'rn-shared-seen',
      },
    ],
    questions: [
      {
        id: 'rn-depends',
        kind: 'choice',
        prompt: 'What does the hidden state h₃ depend on?',
        options: [
          {
            text: 'x₃ and h₂, and through h₂ on x₁ and x₂',
            correct: true,
            feedback: 'Right. h₃ = tanh(x₃·W + h₂·U + b), and h₂ already summarises x₁ and x₂.',
          },
          { text: 'Only x₃', feedback: 'That would be a dense layer applied to each step separately.' },
          { text: 'x₁, x₂, x₃ through separate weights each', feedback: 'There are no separate weights per step.' },
        ],
      },
      {
        id: 'rn-count',
        kind: 'predict',
        prompt:
          'This layer has 1 input feature and 4 hidden units: W is 1×4, U is 4×4, b has 4 values. How many parameters would it have for sequences of 50 steps?',
        options: [
          { text: '24', correct: true, feedback: 'Right. The same 24 parameters serve every time step.' },
          { text: '1 200', feedback: 'That would be 24 per step; the weights are shared.' },
          { text: '120', feedback: 'The count does not depend on the length.' },
        ],
      },
      {
        id: 'rn-order',
        kind: 'scenario',
        prompt: 'Why can the five hidden states not all be computed at the same moment?',
        options: [
          {
            text: 'Each one needs the previous hidden state',
            correct: true,
            feedback: 'Right. The recurrent connection forces the order h₁, h₂, h₃, …',
          },
          { text: 'The engine is slow', feedback: 'It is the computation itself that needs the order.' },
          { text: 'The inputs arrive one per second', feedback: 'The whole sequence is available; hₜ still needs hₜ₋₁.' },
        ],
      },
    ],
  },
  later(
    '04',
    'Backpropagation Through Time: How Recurrent Networks Learn',
    'Unroll the network over time and follow the gradient backward, step by step.',
    '25–30 min',
    'BPTT',
  ),
  later(
    '05',
    'LSTM and GRU: Gated Recurrent Architectures',
    'Gates that decide what to keep, what to forget and what to output.',
    '25–30 min',
    'Gated recurrence',
  ),
  later(
    '06',
    'Autoencoders: Learning Latent Representations',
    'Squeeze an input into a few numbers and rebuild it from them.',
    '20–25 min',
    'Representation learning',
  ),
];

export type Level4Id = '01' | '02' | '03' | '04' | '05' | '06';
export const level4ById = (id: string): LessonExperiment | undefined =>
  LEVEL4_EXPERIMENTS.find((e) => e.id === id);

/**
 * When each technical term may first appear in Level 4. Every term of Levels 1–3 is allowed. A term scheduled for a
 * later Level 4 experiment, or for a later level, must not appear earlier.
 */
export const LEVEL4_TERMS: { label: string; pattern: RegExp; from: Level4Id | 'later' }[] = [
  { label: 'recurrent', pattern: /\brecurren/i, from: '03' },
  { label: 'hidden state', pattern: /\bhidden states?\b/i, from: '03' },
  { label: 'time step', pattern: /\btime steps?\b/i, from: '03' },
  { label: 'BPTT', pattern: /\b(BPTT|through time)\b/i, from: '04' },
  { label: 'truncation', pattern: /\btruncat/i, from: '04' },
  { label: 'vanishing / exploding gradient', pattern: /\b(vanish|explod)/i, from: '04' },
  { label: 'gradient clipping', pattern: /\bclipp/i, from: '04' },
  { label: 'LSTM', pattern: /\bLSTM\b/, from: '05' },
  { label: 'GRU', pattern: /\bGRU\b/, from: '05' },
  { label: 'cell state', pattern: /\bcell state\b/i, from: '05' },
  { label: 'named gate', pattern: /\b(forget|update|reset) gate\b/i, from: '05' },
  { label: 'autoencoder', pattern: /\bautoencod/i, from: '06' },
  { label: 'latent', pattern: /\blatent\b/i, from: '06' },
  { label: 'encoder / decoder', pattern: /\b(en|de)coder\b/i, from: '06' },
  { label: 'transformer / attention', pattern: /\b(transformer|attention)\b/i, from: 'later' },
  { label: 'positional encoding', pattern: /\bpositional encoding\b/i, from: 'later' },
  { label: 'language model', pattern: /\b(LLM|language model)\b/i, from: 'later' },
];
