# Level 3, Experiment 03: Adam, Adaptive Optimization (2026-11-27)

**Status:** implemented and open (`#/level-3/experiment-03`). It uses the engine's new Adam (ADR-098, gated in `tests/unit/level3-optim-gate.test.ts`).

## Features

- **Part A, three optimisers on one task.** Plain gradient descent, momentum (μ = 0.9) and Adam, all at η = 0.05 (engine runs). After 60 updates: 0.688, 0.626 and 0.090.
- **Part B, the moments update by update.** A recorded Adam run. For any parameter value and update it shows ḡ, t, m, v, m̂, v̂ and Δ, all from the record (`OPTIMIZER_STATE`, `COMPUTE_UPDATE`).
  - Each value has "checked here", recomputed with Adam's rule from the previous recorded values.
  - The step is shown as a multiple of η.
  - At update 1 the page explains bias correction: m̂ = ḡ, v̂ = ḡ², and the step is ±η.
  - A chart shows ḡ and m̂ over all 60 updates, and a link opens the update in the explorer.
- **Part C, a step for each parameter.** Every weight and bias at a chosen update: recorded ḡ, Δ and |Δ| ÷ η. The page reports what the record shows:
  - how far apart the gradients are;
  - the largest step, as a multiple of η;
  - how many parameter pairs have gradients more than 10× apart but steps less than 3× apart, which plain gradient descent could never produce.
- **The rest of the page:** primer, a 4-step tour, 3 challenges, 3 fixed questions, and 1 live question (the recorded m̂).

## A claim corrected by the data

- **The first draft said every parameter "moves by about η".** The record shows otherwise: at update 10 the steps are 116× apart, because parameters whose gradient keeps changing sign have a small m̂ relative to √v̂.
- **The text, primer and question now say** that steps do not grow with the gradient, are at most about η (the record's largest: 1.02·η at update 10), and shrink where the gradient changes sign.
- **The test checks exactly that,** at updates 1, 2, 10, 20 and 60.

## Tests

- **`tests/unit/level3-exp03.test.ts`, 6 tests:**
  - **Adam's rule** (m, v, m̂, v̂, Δ) over every update of every fifth parameter value, from the recorded ḡ, within 10⁻¹² relative, with each state linked to the previous one;
  - **update 1's bias correction** for all 25 values;
  - **Part C's claim** at five updates;
  - **the live question;**
  - **the comparison's ordering;**
  - **the page renders.**
- **The vocabulary test** includes Experiment 03.
- **Browser check (1280 and 390 px):** no errors, no overflow.
- **e2e:** delegated (`tests/e2e/level3-exp03.spec.ts`). The Experiment 02 spec passes 6 of 6.
