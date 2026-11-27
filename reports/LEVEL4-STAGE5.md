# Level 4, Stage 5: Experiment 05, LSTM and GRU (2026-11-27)

**Status:** implemented and open (`#/level-4/experiment-05`).

## Task
- **Recorded runs:** an LSTM run and a GRU run, each with 3 hidden units, on the first-value task: 16 sequences of 6 values, Adam η = 0.05, batch 8, 40 epochs.
  - LSTM: loss 0.673 → 0.0095; 205 854 instructions.
  - GRU: loss 0.711 → 0.0017; 163 931 instructions.
  - Only one record is kept at a time (the shared store), so Part C retrains as GRU and says so.
- **Comparison:** plain recurrent, LSTM and GRU layers with 4 hidden units on the 10-step version (32 sequences, 80 epochs), for seeds 1, 2 and 3.

## Parts
- **A, the LSTM cell.** A state-transition table over all 6 time steps: xₜ, the mean of f, i and o, cₜ and hₜ.
- **B, what the gates do.**
  - One time step from the record: f, i, g, cₜ ("f ⊙ cₜ₋₁ + i ⊙ g, checked here"; at step 1, c₀ = 0), o and hₜ ("o ⊙ tanh(cₜ), checked here").
  - A table, unit by unit, of what is kept, written and shown.
  - The gradient passed back along the cell state from the recorded `GRAD_MULTIPLY` of f ⊙ cₜ₋₁: on that path it is multiplied only by f.
- **C, the GRU cell.** z, r ("—" at step 1, since h₀ = 0), n, and hₜ ("(1 − z) ⊙ n + z ⊙ hₜ₋₁, checked here"). "Cell state: none".
- **D, compared.** Parameter counts from the models (plain 29, LSTM 101, GRU 77), the loss curves and final losses for the chosen seed. The page states that no architecture wins every time, and the challenge asks for two seeds.
- **Also on the page:** a summary of the recorded run, primer, a 4-step tour, 3 challenges, 3 fixed questions, 1 live question (cₜ, against the values without forgetting and without writing), and the explorer with gated-cell wording.

## Finding: last-bit differences between JavaScript engines
- **Symptom.** In the browser, the comparison's plain recurrent layer (seed 1) ended at 0.869. Node, running the same configuration, gives 0.1197. The LSTM and GRU agree to 4 decimals.
- **Cause.** `Math.tanh`, `Math.exp` and `Math.log` give bit-different results in Node's V8 (12.4) and Chromium's V8 (153): a hash over 60 000 values differs.
  - The engine is deterministic within one runtime; the determinism and replay tests run in one runtime.
  - A plain recurrent layer training near an unstable plateau amplifies the last-bit differences over 80 epochs.
- **Consequences.** The unit tests do not assert the plain layer's comparison result. The page claims no fixed ranking. The final report lists this as a limitation.

## Tests
- **`tests/unit/level4-exp05.test.ts`, 8 tests.**
  - Both runs learn.
  - Every LSTM step of two sequences is recomputed by hand from the weights each gate's instructions reference: the four gates, cₜ and hₜ.
  - The cell-state gradient path is exactly upstream ⊙ f, checked at all 5 steps.
  - Every GRU step is recomputed by hand: z, r (from step 2), n, 1 − z and hₜ.
  - The parameter counts are checked.
  - Both gated layers learn the 10-step task.
  - The live question is checked, and the page renders.
- **Vocabulary and explorer probes:** the LSTM run is trained, and its explorer is probed at 10 kinds plus the end of the run.
- **All unit tests:** 68 files, 798 of 798.
- **Browser, 1280 and 390 px:** all four parts work, with no console errors and no overflow.
- **e2e:** `tests/e2e/level4-exp05.spec.ts`, delegated.

## Also fixed
- A Python edit had added `'05'` to Level 3's open set as well as Level 4's, because the two strings matched. It was caught by the vocabulary test before any commit, and corrected.
