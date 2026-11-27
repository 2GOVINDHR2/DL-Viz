/**
 * Level 3 — Training Strategies and Generalization, as data (ADR-097): the level's metadata, the fixed tasks its
 * experiments train on, every experiment's objectives, primer, tour, challenges and fixed questions, and the
 * vocabulary schedule. Screens live in src/learn/level3.
 *
 * The tasks were chosen from recorded sweeps (docs/LEVEL-3-ARCHITECTURE.md):
 *  - Experiments 01–03 share one task: two concentric circles (60 points), a 2-6-1 tanh network, full batch, 60
 *    epochs. With SGD, η = 0.05 barely moves, η = 2 learns, η = 8 is unstable and η = 30 gets stuck; momentum and
 *    Adam reach a low loss where plain SGD at the same rate does not.
 *  - Experiment 04: noisy XOR clusters, 24 training points and 200 held-out points, a 2-32-1 tanh network trained with
 *    Adam for 300 epochs: without weight decay the training loss reaches ~0 while the held-out loss turns upward.
 */
import type { DatasetSpec } from '../core/engine/protocol';
import type { TrainConfig } from '../core/engine/session';
import type { OptimizerConfig } from '../core/optim/optim';
import type { LessonExperiment } from './level1';

export const LEVEL3 = {
  title: 'Level 3 — Training Strategies and Generalization',
  tagline:
    'Choose how a network learns: the size of its steps, momentum, adaptive steps with Adam, and how to keep a network that learns its training data from failing on new data.',
  minutes: '80–105 minutes',
  understand: [
    'how the learning rate decides whether training crawls, learns or falls apart',
    'how momentum gives the update a memory of earlier gradients',
    'how Adam sizes the step of every parameter separately',
    'why a low training loss does not guarantee good predictions on new data, and how weight decay helps',
  ],
};

/** The shared task of Experiments 01–03. */
export const L3_TASK = {
  dataset: { kind: 'circles', n: 60, seed: 1 } as DatasetSpec,
  epochs: 60,
  description: 'two circles of 60 points, a 2-6-1 tanh network, every update over all 60 points',
};

export function l3TaskConfig(optimizer: OptimizerConfig, epochs = L3_TASK.epochs): TrainConfig {
  return {
    seed: 3,
    epochs,
    batchSize: 60,
    shuffle: false,
    loss: 'bce',
    optimizer,
    boundaryGrid: 0,
    model: {
      inputShape: [2],
      layers: [
        { type: 'dense', units: 6, activation: 'tanh' },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
    },
  };
}

/** Experiment 04's task: few noisy training points, many held-out points, a network with room to memorise. */
export const L3_OVERFIT = {
  dataset: { kind: 'xorClusters', n: 24, seed: 5, noise: 0.55, test: { n: 200, seed: 77 } } as DatasetSpec,
  epochs: 300,
  lr: 0.03,
  decays: [0, 0.003, 0.01, 0.03],
};

export function l3OverfitConfig(weightDecay: number, epochs = L3_OVERFIT.epochs): TrainConfig {
  return {
    seed: 3,
    epochs,
    batchSize: 24,
    shuffle: false,
    loss: 'bce',
    optimizer: { type: 'adam', lr: L3_OVERFIT.lr, beta1: 0.9, beta2: 0.999, epsilon: 1e-8, weightDecay },
    boundaryGrid: 24,
    model: {
      inputShape: [2],
      layers: [
        { type: 'dense', units: 32, activation: 'tanh' },
        { type: 'dense', units: 1, activation: 'sigmoid' },
      ],
    },
  };
}

export const ADAM_DEFAULTS = { beta1: 0.9, beta2: 0.999, epsilon: 1e-8 };

export const LEVEL3_EXPERIMENTS: LessonExperiment[] = [
  {
    id: '01',
    title: 'Learning Rate and Training Dynamics',
    short: 'Too small, useful, too large: the same network trained with different step sizes.',
    description:
      'Gradient descent moves every parameter by −η·ḡ. The gradient gives the direction; the learning rate η decides how far to go. Here the same network, from the same starting weights, is trained with several learning rates, and you look inside the updates to see why some crawl, some learn and some fall apart.',
    minutes: '15–20 min',
    concept: 'Learning rate',
    objectives: [
      'Compare real training runs that differ only in the learning rate.',
      'Recognise slow progress, useful progress and instability in a loss curve.',
      'Explain instability as steps that overshoot: the update is larger than the slope can support.',
      'Read one update of a recorded run: gradient, step and the parameter before and after.',
    ],
    outcomes: [
      'what the learning rate controls',
      'why too small and too large are both bad',
      'how to read a loss curve',
    ],
    primer: {
      intro:
        'In Level 2 every update was Δ = −η·ḡ, and η was fixed for you. Now it is yours to choose, on a network that has to learn a real shape.',
      terms: [
        {
          term: 'Learning rate η',
          meaning: 'The number that scales every step: Δ = −η·ḡ. Twice the learning rate, twice the step.',
          role: 'weight',
        },
        {
          term: 'Training dynamics',
          meaning: 'How the loss and the parameters change from update to update during training.',
          role: 'bias',
        },
        {
          term: 'Overshooting',
          meaning:
            'A step so large that it jumps past the lower ground and lands higher up the other side; the loss rises.',
          role: 'incorrect',
        },
        {
          term: 'Divergence',
          meaning:
            'Training that gets worse and worse, or gets stuck far from any good answer, because the steps are far too large.',
        },
      ],
    },
    tour: [
      {
        target: 'lr-choose',
        title: 'Same network, different η',
        text: 'Every run starts from the same weights. Only the learning rate differs.',
        doThis: 'Train the learning rates.',
        waitFor: 'lr-compared',
      },
      {
        target: 'lr-curves',
        title: 'Read the curves',
        text: 'A flat line is too slow; a curve that jumps up is overshooting.',
        doThis: 'Look at the curves, then train one run to look inside.',
        waitFor: 'trained',
      },
      {
        target: 'lr-update',
        title: 'One update, from the record',
        text: 'The step is the learning rate times the gradient.',
        doThis: 'Choose another update.',
        waitFor: 'lr-update-picked',
      },
      {
        target: 'lr-path',
        title: 'A weight’s path',
        text: 'Small rates creep; large rates jump back and forth.',
        doThis: 'Train a run with another learning rate.',
        waitFor: 'lr-run-changed',
      },
    ],
    challenges: [
      {
        id: 'lr-best',
        title: 'The useful middle',
        prompt: 'In Part A, find the learning rate whose run ends with the lowest loss.',
        notice: 'Bigger is better only up to a point: past it, the steps overshoot.',
        doneOn: 'lr-compared',
      },
      {
        id: 'lr-overshoot',
        title: 'Catch an overshoot',
        prompt: 'In Part B, with η = 8, find an update after which the loss went up.',
        notice: 'The step followed the gradient, but it was so long that it landed higher than it started.',
        doneOn: 'lr-rise-found',
      },
      {
        id: 'lr-tiny',
        title: 'Too careful',
        prompt: 'In Part B, with η = 0.05, compare the first and the last update’s step.',
        notice: 'Every step is tiny: after 60 updates the network has hardly changed.',
        doneOn: 'lr-small-seen',
      },
    ],
    questions: [
      {
        id: 'lr-double',
        kind: 'choice',
        prompt:
          'At one update the mean gradient of a weight is ḡ = 0.2. With η = 0.5 the step is −0.1. What is it with η = 1?',
        options: [
          { text: '−0.2', correct: true, feedback: 'Right. Δ = −η·ḡ: doubling η doubles the step.' },
          { text: '−0.1', feedback: 'No. The step is proportional to η.' },
          { text: '−0.05', feedback: 'No. A larger η makes a larger step, not a smaller one.' },
        ],
      },
      {
        id: 'lr-rise',
        kind: 'scenario',
        prompt:
          'A loss curve goes down, then up, then down again in big jumps. What is the most likely cause?',
        options: [
          {
            text: 'The learning rate is too large: steps overshoot the lower ground',
            correct: true,
            feedback: 'Right. A smaller η would take steps the slope can support.',
          },
          {
            text: 'The learning rate is too small',
            feedback: 'Too small gives a slow, smooth descent, not jumps.',
          },
          {
            text: 'The network has too few neurons',
            feedback: 'That limits how low the loss can go, not how smoothly it falls.',
          },
        ],
      },
      {
        id: 'lr-why-small',
        kind: 'choice',
        prompt: 'Why not always use a tiny learning rate to be safe?',
        options: [
          {
            text: 'Training would need far more updates to get anywhere',
            correct: true,
            feedback: 'Right. Safe but slow: with η = 0.05 the loss barely moved in 60 updates.',
          },
          {
            text: 'Tiny learning rates make the gradient wrong',
            feedback: 'The gradient does not depend on η; only the step does.',
          },
          { text: 'Tiny learning rates always diverge', feedback: 'No. They are stable, just slow.' },
        ],
      },
    ],
  },
  {
    id: '02',
    title: 'Momentum: Smoothing the Update',
    short: 'Give the update a memory: velocity built from earlier gradients.',
    description:
      'Plain gradient descent forgets: each step uses only the current gradient. Momentum keeps a velocity, a running sum of recent gradients that fades by a factor μ each update. Steps in a consistent direction build up speed; back-and-forth wobbles cancel. Here you compare it with plain gradient descent on the same task and follow the velocity update by update.',
    minutes: '20–25 min',
    concept: 'Momentum',
    objectives: [
      'State the momentum update: v ← μ·v + ḡ, Δ = −η·v.',
      'Follow the velocity over several recorded updates.',
      'Compare a momentum step with the plain gradient-descent step −η·ḡ for the same gradient.',
      'Explain why momentum learns faster on this task with the same learning rate.',
    ],
    outcomes: ['what the velocity remembers', 'how μ controls the memory', 'when momentum helps'],
    primer: {
      intro: 'Same task, same starting weights as Experiment 01. Only the update rule changes.',
      terms: [
        {
          term: 'Momentum',
          meaning: 'An update that adds a fading memory of earlier gradients to the current one.',
          role: 'weight',
        },
        {
          term: 'Velocity v',
          meaning: 'The optimiser’s memory for one parameter: v ← μ·v + ḡ. The step is Δ = −η·v.',
          role: 'bias',
        },
        {
          term: 'Momentum coefficient μ',
          meaning:
            'How much of the old velocity is kept each update (0 = none: plain gradient descent; 0.9 = most of it).',
          role: 'incorrect',
        },
        {
          term: 'Optimiser state',
          meaning:
            'Numbers the optimiser keeps between updates, besides the parameters themselves. Plain gradient descent has none.',
        },
      ],
    },
    tour: [
      {
        target: 'mo-compare',
        title: 'Plain steps against momentum',
        text: 'The same learning rate, with and without momentum.',
        doThis: 'Train the comparison.',
        waitFor: 'mo-compared',
      },
      {
        target: 'mo-run',
        title: 'A recorded momentum run',
        text: 'The engine records the velocity of every parameter at every update.',
        doThis: 'Train the momentum run.',
        waitFor: 'trained',
      },
      {
        target: 'mo-table',
        title: 'The velocity, update by update',
        text: 'Each row: the gradient, the velocity it joins, and the step.',
        doThis: 'Pick another parameter.',
        waitFor: 'mo-param-picked',
      },
      {
        target: 'mo-chart',
        title: 'Gradient and velocity over time',
        text: 'The velocity follows the gradient, but smoothed and larger when the gradient keeps its sign.',
        doThis: 'Change μ and train again.',
        waitFor: 'mo-mu-changed',
      },
    ],
    challenges: [
      {
        id: 'mo-zero',
        title: 'Momentum without memory',
        prompt: 'In Part B, set μ = 0 and train. Compare each step with −η·ḡ.',
        notice: 'With μ = 0 the velocity is just the gradient: momentum becomes plain gradient descent.',
        doneOn: 'mo-zero-seen',
      },
      {
        id: 'mo-build',
        title: 'Speed builds up',
        prompt: 'In Part B, find an update where the momentum step is more than twice the plain step −η·ḡ.',
        notice:
          'When the gradient keeps its sign, the velocity adds up past steps: up to 1/(1−μ) times the gradient.',
        doneOn: 'mo-build-seen',
      },
      {
        id: 'mo-faster',
        title: 'Same η, better result',
        prompt: 'In Part A, compare the final loss of plain gradient descent and momentum.',
        notice: 'With the same η, momentum reaches a much lower loss in the same 60 updates.',
        doneOn: 'mo-compared',
      },
    ],
    questions: [
      {
        id: 'mo-rule',
        kind: 'choice',
        prompt:
          'With μ = 0.9, the previous velocity is v = 0.5 and the new mean gradient is ḡ = 0.1. What is the new velocity?',
        options: [
          { text: '0.55', correct: true, feedback: 'Right. v ← μ·v + ḡ = 0.9 × 0.5 + 0.1 = 0.55.' },
          { text: '0.6', feedback: 'That forgets μ: the old velocity is first multiplied by 0.9.' },
          { text: '0.1', feedback: 'That is plain gradient descent: no memory of the old velocity.' },
        ],
      },
      {
        id: 'mo-wobble',
        kind: 'scenario',
        prompt:
          'A parameter’s gradient flips sign every update (+, −, +, −). What does momentum do to its steps?',
        options: [
          {
            text: 'Makes them smaller: the opposite signs partly cancel in the velocity',
            correct: true,
            feedback: 'Right. Momentum damps wobbles and speeds up consistent directions.',
          },
          {
            text: 'Makes them larger',
            feedback: 'Only consistent gradients add up; alternating ones cancel.',
          },
          {
            text: 'Nothing: momentum only changes the learning rate',
            feedback: 'η is unchanged; the velocity changes what η multiplies.',
          },
        ],
      },
      {
        id: 'mo-state',
        kind: 'choice',
        prompt: 'What extra does momentum keep between updates, compared with plain gradient descent?',
        options: [
          {
            text: 'One velocity for every parameter',
            correct: true,
            feedback: 'Right. It is the optimiser’s state.',
          },
          { text: 'A second learning rate', feedback: 'No. η is the same single number.' },
          {
            text: 'A copy of the training data',
            feedback: 'No. Only one velocity value per parameter value.',
          },
        ],
      },
    ],
  },
  {
    id: '03',
    title: 'Adam: Adaptive Optimization',
    short: 'Two running averages and a step sized for each parameter separately.',
    description:
      'Adam keeps two running averages for every parameter: m, of the gradient (like momentum), and v, of the squared gradient (how large gradients have been). It corrects both for starting at zero, then divides one by the square root of the other: a parameter’s step no longer grows with the size of its gradient, and stays at most about η. Here every one of those numbers is read from the engine’s record.',
    minutes: '20–25 min',
    concept: 'Adam',
    objectives: [
      'State Adam’s update: m, v, the bias corrections m̂ and v̂, and Δ = −η·m̂/(√v̂ + ε).',
      'Explain why the first updates need bias correction.',
      'Compare the step sizes Adam gives to parameters whose gradients differ in size.',
      'Compare Adam with plain gradient descent and momentum on the same task.',
    ],
    outcomes: ['what m and v estimate', 'why bias correction is needed', 'what “adaptive” means'],
    primer: {
      intro: 'Adam combines momentum’s memory with a separate step size for every parameter.',
      terms: [
        {
          term: 'First moment m',
          meaning: 'A running average of the gradient: m ← β₁·m + (1−β₁)·ḡ, with β₁ = 0.9.',
          role: 'weight',
        },
        {
          term: 'Second moment v',
          meaning:
            'A running average of the squared gradient: v ← β₂·v + (1−β₂)·ḡ², with β₂ = 0.999. √v is a typical gradient size.',
          role: 'bias',
        },
        {
          term: 'Bias correction',
          meaning:
            'm and v start at 0, so early on they are too small. Dividing by 1−β₁ᵗ and 1−β₂ᵗ at update t fixes that: m̂ and v̂.',
          role: 'incorrect',
        },
        {
          term: 'Adaptive step',
          meaning:
            'Δ = −η·m̂/(√v̂ + ε): the average gradient is divided by its own typical size, so a step is at most about η, whatever the scale of the gradient, and smaller when the gradient keeps changing sign.',
        },
      ],
    },
    tour: [
      {
        target: 'ad-compare',
        title: 'Three optimisers, one task',
        text: 'Plain gradient descent, momentum and Adam from the same weights.',
        doThis: 'Train the comparison.',
        waitFor: 'ad-compared',
      },
      {
        target: 'ad-run',
        title: 'A recorded Adam run',
        text: 'The engine records m, v, m̂ and v̂ for every parameter at every update.',
        doThis: 'Train the Adam run.',
        waitFor: 'trained',
      },
      {
        target: 'ad-table',
        title: 'The moments, update by update',
        text: 'At update 1, m̂ equals the gradient exactly: that is what bias correction is for.',
        doThis: 'Pick another parameter.',
        waitFor: 'ad-param-picked',
      },
      {
        target: 'ad-adaptive',
        title: 'A step for each parameter',
        text: 'Steps do not follow the size of the gradient: a tiny gradient can get as large a step as a big one.',
        doThis: 'Choose another update.',
        waitFor: 'ad-update-picked',
      },
    ],
    challenges: [
      {
        id: 'ad-first',
        title: 'The first step',
        prompt: 'In Part B, look at update 1: compare m with m̂, and the step’s size with η.',
        notice: 'm is only 0.1·ḡ, but m̂ = ḡ; and the first step is ±η for every parameter (up to ε).',
        doneOn: 'ad-first-seen',
      },
      {
        id: 'ad-scale',
        title: 'Same step, different gradients',
        prompt:
          'In Part C, find two parameters whose gradients differ by more than 10× but whose steps differ by less than 3×.',
        notice: 'Dividing by √v̂ removes the gradient’s scale: that is the “adaptive” in Adam.',
        doneOn: 'ad-scale-seen',
      },
      {
        id: 'ad-compare',
        title: 'Three optimisers',
        prompt: 'In Part A, compare the final losses of the three optimisers.',
        notice: 'Adam with η = 0.05 does far better than plain gradient descent with the same η.',
        doneOn: 'ad-compared',
      },
    ],
    questions: [
      {
        id: 'ad-correct',
        kind: 'choice',
        prompt: 'At update 1, with β₁ = 0.9 and gradient ḡ = 0.4: m = 0.04. What is m̂ = m/(1−β₁¹)?',
        options: [
          {
            text: '0.4',
            correct: true,
            feedback: 'Right. m̂ = 0.04 / 0.1 = 0.4: the correction undoes the start at zero.',
          },
          { text: '0.04', feedback: 'That is m before the correction.' },
          { text: '0.036', feedback: 'No. Divide by 1 − 0.9 = 0.1.' },
        ],
      },
      {
        id: 'ad-adaptive',
        kind: 'scenario',
        prompt:
          'One weight always has gradients near 0.001, another near 1. With Adam, how do their steps compare?',
        options: [
          {
            text: 'Both at most about η: each gradient is divided by its own typical size, so the step does not grow with the gradient',
            correct: true,
            feedback:
              'Right. Plain gradient descent would move the second one 1000 times further; with Adam both steps are bounded by about η.',
          },
          { text: 'The second moves 1000 times further', feedback: 'That is plain gradient descent.' },
          {
            text: 'The first moves 1000 times further',
            feedback: 'No. Dividing by √v̂ makes them similar, not reversed.',
          },
        ],
      },
      {
        id: 'ad-state',
        kind: 'choice',
        prompt: 'How many numbers does Adam keep for every parameter value, besides the value itself?',
        options: [
          {
            text: 'Two: m and v (and one step count for all)',
            correct: true,
            feedback: 'Right. Momentum keeps one; Adam keeps two.',
          },
          { text: 'One, like momentum', feedback: 'Adam keeps two running averages: m and v.' },
          { text: 'None', feedback: 'That is plain gradient descent.' },
        ],
      },
    ],
  },
  {
    id: '04',
    title: 'Overfitting and Regularization',
    short: 'Training loss is not the goal: held-out data, overfitting and L2 weight decay.',
    description:
      'A network is trained on some examples but used on new ones. Here a network with plenty of neurons is trained on 24 noisy points and checked after every epoch on 200 points it never trains on. Its training loss falls almost to zero while its loss on the new points turns upward: it has learned the noise. Weight decay adds a penalty for large weights, and you see what that changes in the update and in the result.',
    minutes: '25–35 min',
    concept: 'Generalization',
    objectives: [
      'Distinguish training loss from held-out (validation) loss.',
      'Recognise overfitting in the two curves and read where the held-out loss was lowest.',
      'State L2 weight decay: the loss gains (λ/2)·‖W‖², so every weight’s gradient gains λ·w.',
      'Compare runs with different λ, including one that is too strong.',
    ],
    outcomes: [
      'what overfitting looks like',
      'why held-out data is needed',
      'how weight decay changes each update',
    ],
    primer: {
      intro: 'Everything so far measured the loss on the data the network trains on. Now that is not enough.',
      terms: [
        {
          term: 'Held-out (validation) data',
          meaning:
            'Examples kept aside and never used for updates; their loss shows how the network does on new data.',
          role: 'weight',
        },
        {
          term: 'Generalization',
          meaning: 'Doing well on new examples from the same source, not only on the training examples.',
          role: 'bias',
        },
        {
          term: 'Overfitting',
          meaning:
            'Fitting the training examples, noise included, so closely that new examples are predicted worse.',
          role: 'incorrect',
        },
        {
          term: 'Regularization (L2 weight decay)',
          meaning:
            'Adding (λ/2)·‖W‖² to the loss. Its gradient adds λ·w to every weight’s gradient, pulling weights towards 0 at every update.',
        },
      ],
    },
    tour: [
      {
        target: 'of-train',
        title: 'Train, and check on new data',
        text: 'The engine evaluates 200 held-out points after every epoch, without training on them.',
        doThis: 'Train the network without weight decay.',
        waitFor: 'trained',
      },
      {
        target: 'of-curves',
        title: 'Two curves part ways',
        text: 'Training loss keeps falling; held-out loss turns upward.',
        doThis: 'Move the epoch marker to the lowest held-out loss.',
        waitFor: 'of-epoch-moved',
      },
      {
        target: 'of-compare',
        title: 'Different amounts of weight decay',
        text: 'The same network with λ from 0 to 0.03.',
        doThis: 'Train the comparison.',
        waitFor: 'of-compared',
      },
      {
        target: 'of-update',
        title: 'Weight decay inside an update',
        text: 'Each weight’s gradient gains λ·w before the optimiser uses it.',
        doThis: 'Train a run with weight decay.',
        waitFor: 'of-decay-run',
      },
    ],
    challenges: [
      {
        id: 'of-best',
        title: 'Where to stop',
        prompt: 'In Part A, find the epoch with the lowest held-out loss.',
        notice: 'Training on after it made the network better on its 24 points and worse on new ones.',
        doneOn: 'of-best-found',
      },
      {
        id: 'of-lambda',
        title: 'The right amount',
        prompt: 'In Part B, find the λ with the lowest held-out loss at the end.',
        notice: 'A moderate λ keeps the network from memorising the noise.',
        doneOn: 'of-compared',
      },
      {
        id: 'of-strong',
        title: 'Too much of a good thing',
        prompt: 'In Part B, compare the training loss of λ = 0.03 with the others.',
        notice:
          'A strong penalty keeps the weights so small that the network cannot even fit its training data: underfitting.',
        doneOn: 'of-compared',
      },
    ],
    questions: [
      {
        id: 'of-sign',
        kind: 'scenario',
        prompt: 'Training loss falls steadily; held-out loss falls, then rises. What is happening?',
        options: [
          {
            text: 'Overfitting: the network is learning details of the training points that do not hold for new ones',
            correct: true,
            feedback: 'Right. The best network for new data was the one at the lowest held-out loss.',
          },
          {
            text: 'The learning rate is too large',
            feedback: 'Overshooting makes the training loss jump too, not fall steadily.',
          },
          {
            text: 'The held-out data are wrong',
            feedback: 'They come from the same source; the network is what changed.',
          },
        ],
      },
      {
        id: 'of-decay',
        kind: 'choice',
        prompt:
          'With weight decay λ = 0.01, a weight w = 2 has mean gradient ḡ = 0.05. What gradient does the optimiser receive?',
        options: [
          { text: '0.07', correct: true, feedback: 'Right. ḡ + λ·w = 0.05 + 0.01 × 2 = 0.07.' },
          { text: '0.05', feedback: 'That ignores the penalty.' },
          { text: '0.03', feedback: 'The penalty adds λ·w; it does not subtract it.' },
        ],
      },
      {
        id: 'of-why-heldout',
        kind: 'choice',
        prompt: 'Why must the held-out points never be used for updates?',
        options: [
          {
            text: 'Otherwise their loss would no longer show how the network does on data it has not seen',
            correct: true,
            feedback: 'Right. They are a test only as long as the network has not learned from them.',
          },
          {
            text: 'They would make training slower',
            feedback: 'Speed is not the reason; honesty of the measurement is.',
          },
          {
            text: 'The engine cannot compute their gradient',
            feedback: 'It could; it deliberately does not.',
          },
        ],
      },
    ],
  },
];

export type Level3Id = '01' | '02' | '03' | '04';
export const level3ById = (id: string): LessonExperiment | undefined =>
  LEVEL3_EXPERIMENTS.find((e) => e.id === id);

/**
 * When each technical term may first appear in Level 3. Every Level 1 and Level 2 term is allowed. A term scheduled
 * for a later Level 3 experiment, or for a later level, must not appear earlier.
 */
export const LEVEL3_TERMS: { label: string; pattern: RegExp; from: Level3Id | 'later' }[] = [
  { label: 'momentum', pattern: /\bmomentum\b/i, from: '02' },
  { label: 'velocity', pattern: /\bvelocit/i, from: '02' },
  { label: 'Adam', pattern: /\badam\b/i, from: '03' },
  { label: 'moment estimate', pattern: /\b(first|second) moment\b/i, from: '03' },
  { label: 'bias correction', pattern: /\bbias correct/i, from: '03' },
  { label: 'overfitting', pattern: /\b(over|under)fit/i, from: '04' },
  { label: 'regularisation', pattern: /\bregulari[sz]/i, from: '04' },
  { label: 'weight decay', pattern: /\bweight decay\b/i, from: '04' },
  { label: 'generalisation', pattern: /\bgenerali[sz]/i, from: '04' },
  { label: 'held-out / validation', pattern: /\b(held-out|validation)\b/i, from: '04' },
  { label: 'dropout', pattern: /\bdropout\b/i, from: 'later' },
  { label: 'batch normalisation', pattern: /\bbatch[- ]?norm/i, from: 'later' },
  { label: 'learning-rate schedule', pattern: /\b(schedule|warm-?up|decay schedule)\b/i, from: 'later' },
  { label: 'RMSprop', pattern: /\brmsprop\b/i, from: 'later' },
  { label: 'convolution', pattern: /\bconvol/i, from: 'later' },
  { label: 'recurrent / LSTM / GRU', pattern: /\b(recurrent|LSTM|GRU)\b/, from: 'later' },
  { label: 'transformer / attention', pattern: /\b(transformer|attention)\b/i, from: 'later' },
  { label: 'tensor', pattern: /\btensors?\b/i, from: 'later' },
];
