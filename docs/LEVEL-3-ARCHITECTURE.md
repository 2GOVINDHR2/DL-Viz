# Level 3 — Training Strategies and Generalization: architecture and plan

**Builds on Level 2:** the forward pass, the loss, gradients, gradient descent, backpropagation and the computational graph. Level 2 asked "where does a gradient come from?". Level 3 asks "what should we do with it, and does the result hold up on new data?".

## Curriculum (ADR-097)

| # | Experiment | Question | Engine source |
|---|---|---|---|
| 01 | Learning Rate and Training Dynamics | How does η change real training: too slow, useful, unstable? | `compareRuns` for side-by-side curves (no record kept); one recorded run per chosen η for inspection |
| 02 | Momentum: Smoothing the Update | What does the optimiser's velocity add to plain gradient descent? | recorded runs; `OPTIMIZER_STATE {velocity}` |
| 03 | Adam: Adaptive Optimization | How do moment estimates, bias correction and per-parameter step sizes work? | recorded runs; `OPTIMIZER_STATE {m, v, m̂, v̂}` (new, ADR-098) |
| 04 | Overfitting and Regularization | Does lower training loss mean a better model? What does L2 weight decay change? | recorded runs on a dataset with a held-out split (new); `GRAD_ACCUMULATE {decay, regularized}` (new) |

**Ordering.** The order follows the update rule as it grows:

1. Δ = −η·ḡ (the size of the step);
2. Δ = −η·v (memory of past steps);
3. Δ = −η·m̂/(√v̂ + ε) (a step adapted to each parameter);
4. then the question every optimiser leaves open: training loss is not the goal.

**Shared task for Experiments 01–03.** All three use the same small 2-input classification task and the same network and starting weights. Differences between the curves therefore come from the training strategy alone.

**Left out, and why:**
- **Learning-rate schedules:** the engine has one constant η per run, and adding schedules is not needed for any of the four questions.
- **Dropout, batch normalisation, data augmentation, early-stopping automation:** they are not supported, and are not needed for a first, faithful account of generalisation. Experiment 04 shows where early stopping *would* stop, from the recorded curves; that is a reading, not a feature.

## Engine extensions (ADR-098), each gated before any screen (`tests/unit/level3-optim-gate.test.ts`)

- **Adam** in `src/core/optim/optim.ts`, as Kingma & Ba (2015) and TF.js `tf.train.adam`.
  - It is recorded in the existing `OPTIMIZER_STATE` kind with new result slots `m, v, mHat, vHat` and meta `optimizer: 'adam', beta1, beta2, epsilon, t`.
  - `COMPUTE_UPDATE` reads `mHat` and `vHat` as operands.
- **L2 weight decay** (`optimizer.weightDecay = λ`, for weights only, every optimiser).
  - The session adds λ·w to a weight's mean gradient before the optimiser.
  - `GRAD_ACCUMULATE` records `decay = λ·w` and `regularized = ḡ + λ·w`, with the decayed parameter as an operand; the next step reads `regularized`.
- **A held-out split** for synthetic datasets (`test: { n, seed }`): n more points from the same generator. It reuses the existing `data.test` path, so `EVAL_END` records `testLoss` and `testAccuracy`.
- **`compareRuns`** also returns `testLosses`.

**Compatibility:**
- No new instruction kind, and no change to the grammar.
- Existing traces are byte-identical: momentum's `OPTIMIZER_STATE` meta is unchanged, and the new slots appear only when Adam or weight decay is used.
- All existing unit, gradcheck, parity and determinism tests pass unchanged.

## Interface

- **Same patterns as Levels 1 and 2:** `LevelDescriptor` (number 3), routes `#/level-3` and `#/level-3/experiment-NN`, `ExperimentLayout`, primer, tour, challenges and knowledge checks, and the shared trace explorer.
- **Its own vocabulary schedule** (`LEVEL3_TERMS`).
- **The levels page** gets a Level 3 card. The workbench link stays for expert inspection and convolutional networks.

## Validation per experiment

- **Gate:** hand calculations, TF.js and finite differences, as above.
- **Unit:** each experiment's displayed values against the record, over several updates.
- **Vocabulary.**
- **e2e:** values on the page checked by hand relations.
- **a11y and layout:** both themes, 1440 to 360 px.
- **Capability inventory.**
- **Mutation audit** of the new e2e assertions.
