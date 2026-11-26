# Level 3, Experiment 02: Momentum, Smoothing the Update (2026-11-26)

**Status:** implemented and open (`#/level-3/experiment-02`).

## Features

- **Part A, plain steps against momentum.** The shared task at η = 0.5, trained by the engine (`compareRuns`) with plain gradient descent and with momentum at μ = 0.5 and 0.9. A log-scale chart and a table show the results: after 60 updates, plain 0.580, μ = 0.5 0.383, μ = 0.9 0.067.
- **Part B, the velocity update by update.** A recorded momentum run (μ ∈ {0, 0.5, 0.9}). For any parameter value and update it shows:
  - from the record: ḡ, the previous velocity (0 at the start), the new velocity (`OPTIMIZER_STATE`) and the step (`COMPUTE_UPDATE`), each with "checked here" (μ·v + ḡ, −η·v);
  - worked out here and labelled: the plain step −η·ḡ, and the ratio of the two steps.
  - A chart shows ḡ and v over all 60 updates, and a link opens the update in the explorer.
- **The rest of the page:** primer, a 4-step tour, 3 challenges (μ = 0 equals plain descent, speed builds up, same η with a better result), 3 fixed questions, and 1 live question (the recorded velocity).

## Tests

- **`tests/unit/level3-exp02.test.ts`, 6 tests**, and the vocabulary test, which now includes Experiment 02.
  - **The velocity rule over every update** of every fifth parameter value: v = μ·v + ḡ and Δ = −η·v exactly.
  - **Each recorded state** references the previous update's state.
  - **μ = 0** equals plain gradient descent.
  - **The build-up the challenge asks for** (a step over 2× the plain step) occurs for the default parameter.
  - **The comparison's ordering.**
  - **The live question's answer** is the recorded velocity.
- **Browser check (dev server, 1280 and 390 px):** no errors, no overflow.
- **e2e:** `tests/e2e/level3-exp02.spec.ts` is being written by a delegated agent. The Experiment 01 spec (6 tests) passes.
