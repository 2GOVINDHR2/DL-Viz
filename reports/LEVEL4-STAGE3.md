# Level 4, Stage 3: recurrent engine gate and Experiment 03 (2026-11-27)

**Status:** the recurrent engine support is gated and committed (ADR-102). Experiment 03 (vanilla RNN) is implemented and open (`#/level-4/experiment-03`).

## Engine (ADR-102)
- **New ops:** `timeStep`, `oneMinus` and `stopGradient`.
- **Extension layers:** `rnn` (with an optional truncation `window`), `lstm` and `gru`. Every time step is built from ordinary engine ops on the tape.
- **NPM:** sequence and gated-cell kinds, and `GRAD_SUM`, the explicit accumulation of a value's gradient contributions: a shared weight across time steps, or a hidden state feeding several gates.
  - `meta.step` and `meta.gate` are on every recurrent instruction.
  - The grammar is unchanged, and feed-forward traces are byte-identical.
- **Data:** a seeded `sequence` dataset (`sum` and `first` tasks), and `barsAutoencode` for Experiment 06.
- **Gate:** `tests/unit/level4-recurrent-gate.test.ts`, 16 tests; results in `reports/level4-recurrent-gate.json`.
  - every step and gate recomputed by hand, to 1e-12;
  - TF.js gradient parity: RNN 3.8e-8, LSTM 1.9e-8, GRU 2.6e-8;
  - `GRAD_SUM` exactly equal to the tape's gradient;
  - shared references;
  - truncation;
  - determinism, checkpoint replay, and grammar.
- **Gradcheck** (54 cases) also covers the new ops and whole RNN, LSTM and GRU layers.

## Experiment 03
- **Task:** 32 sequences of 5 values; the label is whether their sum is positive.
- **Network:** a recurrent layer of 4 hidden units, then dense(1, sigmoid), trained with Adam η = 0.05, batch 8, for 40 epochs. The loss falls from 0.57 to below 0.05, and every sequence is correct. The record holds 90 885 instructions.
- **Part A, unroll the network.** Any sequence at any epoch, one column per time step: xₜ and the 4 values of hₜ.
- **Part B, one time step.** It shows xₜ, hₜ₋₁ (h₀ = 0 at step 1, where the hₜ₋₁·U term is left out), xₜ·W, hₜ₋₁·U, their sum, z = sum + b, and hₜ = tanh(z). The sum and tanh are each "checked here". "Show in the record" jumps the explorer to the step's instruction.
- **Part C, shared weights.** "All 5 time steps use W from instruction #…; steps 2–5 use U from instruction #…", with U shown, and a disclosure listing every step's references.
- **Part D, prediction.** p = σ(h₅·V + c), the prediction, and the loss "checked here", beside the loss curve and accuracy.
- **Also on the page:** primer, a 4-step tour, 3 challenges, 3 fixed questions, 1 live question (h₂'s first value, against the value it would have without the previous hidden state), and the explorer with Level 4 wording on Level 3's Adam base.

## Defects found and fixed
- **Truncation semantics.** The first version still sent the gradient one step further than the window. The window now means "the operations of the last k time steps receive a gradient", and the gate test checks this exactly.
- **The explorer's parameter picker** named all three recurrent parameters "Biases of …", and described the matrix W as "one per neuron". It now names W, U and b (with the gate for LSTM and GRU) and describes their rows and columns.
- **Readability.** The pages showed `h_{t−1}`-style notation; they now use subscripts (hₜ₋₁).

## Tests
- **`tests/unit/level4-exp03.test.ts`, 8 tests.**
  - The run learns.
  - For 4 (epoch, sequence) pairs, every time step is recomputed by hand from the weights its instructions reference, in order, from the dataset's own sequence. The prediction and loss are checked too.
  - Every step uses the same recorded W and U, and the live question is checked.
- **`tests/unit/level4-vocabulary.test.ts`:** Experiment 03 is trained, and its explorer is probed at `SELECT_STEP`, `MATMUL`, `ADD`, `ACTIVATE`, the loss, `GRAD_ACTIVATE`, `GRAD_MATMUL_W`, `GRAD_SUM`, `GRAD_ACCUMULATE`, `OPTIMIZER_STATE`, `COMPUTE_UPDATE`, `APPLY_UPDATE` and the end of the run. Removing the RNN wording made it fail at the first `SELECT_STEP`, so it is not vacuous.
- **All unit tests:** 778 of 778. Gradcheck 54, parity 8, determinism 18.
- **Browser, 1280 and 390 px:** every part works, with no console errors and no overflow.
- **e2e:** `tests/e2e/level4-exp03.spec.ts`, delegated.
