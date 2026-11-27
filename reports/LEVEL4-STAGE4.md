# Level 4, Stage 4: Experiment 04, Backpropagation Through Time (2026-11-27)

**Status:** implemented and open (`#/level-4/experiment-04`).

## Task
- **Data:** 32 sequences of 5 values; the label is whether the **first** value is positive. The answer comes at the start and the prediction after the last step, so the gradient must travel back through every time step.
- **Network:** a recurrent layer of 4 hidden units, then dense(1, sigmoid), trained with Adam η = 0.05, batch 8, for 60 epochs. With full BPTT the loss falls to below 0.01, and every sequence is correct.

## Parts
- **A, forward unrolled.** Any sequence at any epoch: xₜ, hₜ, the label and the prediction.
- **B, backward through time.** It steps from t = 5 back to t = 1, starting at the loss (GRAD_INIT). At each step it shows:
  - ∂ℓ/∂hₜ, the upstream operand of `GRAD_ACTIVATE`;
  - ∂ℓ/∂zₜ, with "∂ℓ/∂hₜ ⊙ (1 − hₜ²) checked here";
  - its size;
  - this step's contribution to U, as a 4×4 grid (none at t = 1, where U was not used);
  - the gradient sent back to hₜ₋₁.
- **C, one weight with several contributions.** The single U (its recorded value #), its uses at time steps 2–5, each use's recorded contribution to a chosen entry, the running sum, and U's recorded `GRAD_SUM` with "the sum of the contributions, checked here".
- **D, full against truncated.** `compareRuns` with windows full, 1, 2 and 3. Final losses: 0.0007, 0.5039, 0.1604 and 0.0788. An engine probe shows, for each window, which time steps' U receives a contribution and where the chain is cut.
- **E, gradients that shrink or grow.**
  - **Probes:** an 8-step probe with U = s·I (s ∈ {0.5, 1, 1.5, 2}) and x₁ ∈ {0.5, 0.01}, showing ‖∂ℓ/∂zₜ‖ per step and the ratio between step 1 and step 8.
    - U = 0.5·I vanishes (0.0065).
    - U = 2·I with x₁ = 0.01 explodes (106).
    - U = 2·I with x₁ = 0.5 saturates tanh and vanishes instead (0.005).
    - The page says the outcome depends on the weights and inputs.
  - **The recorded run:** the per-step sizes for the sequence shown.
  - **Gradient clipping is not implemented in the engine,** and the page says so instead of imitating it.
- **Also on the page:** primer, a 4-step tour, 3 challenges, 3 fixed questions, 1 live question (U's gradient as the sum of the shown contributions), and the explorer.

## Defects found and fixed
- **Mobile overflow:** a 355 px horizontal overflow, caused by the eight-column Part E table. That table and the Part D table are now in scroll regions; overflow is 0.

## Tests
- **`tests/unit/level4-exp04.test.ts`, 10 tests.**
  - Full BPTT learns.
  - For two (epoch, sequence) pairs, every backward step is recomputed by hand from recorded forward values and weights:
    - ∂ℓ/∂zₜ, U's contribution hₜ₋₁ᵀ·∂ℓ/∂zₜ, and the gradient sent back ∂ℓ/∂zₜ·Uᵀ;
    - the chain, where what step t sent is exactly what arrives at t − 1;
    - ∂ℓ/∂h₅ from the output layer;
    - U's `GRAD_SUM` equal to the sum of its 4 contributions;
    - the live question.
  - Truncation reach for windows 1–3 and full; the comparison is ordered full < window 3 < window 2 < window 1.
  - Probe behaviour: vanishing, exploding, saturated, and roughly constant.
  - The page renders.
- **Vocabulary and explorer probes:** Experiment 04 is trained, and its explorer is probed at 11 instruction kinds plus the end of the run.
- **All unit tests:** 67 files, 789 of 789.
- **Browser, 1280 and 390 px:** every part works, with no console errors and, after the fix, no overflow.
- **Experiment 03's e2e spec** (`tests/e2e/level4-exp03.spec.ts`) passes 8 of 8.
- **e2e:** `tests/e2e/level4-exp04.spec.ts`, delegated.
