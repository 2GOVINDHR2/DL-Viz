# Level 3, Experiment 04: Overfitting and Regularization (2026-11-27)

**Status:** implemented and open (`#/level-3/experiment-04`). It uses the engine's held-out split and L2 weight decay (ADR-098, gated in `tests/unit/level3-optim-gate.test.ts`).

## Task

- **Data:** 24 noisy XOR-cluster points (seed 5, noise 0.55), plus 200 held-out points from the same source with another seed (77). The engine checks the held-out points after every epoch and never trains on them.
- **Network and training:** 2-32-1 tanh, Adam η = 0.03, full batch, 300 epochs. The network is deliberately larger than the data justifies.

## Features

- **Part A, training loss is not the goal.** A recorded run with a chosen λ (default 0).
  - **The curves:** training and held-out loss after every epoch, read from the record's `EVAL_END` (`loss`, `testLoss`) through `epochSummaries`.
  - **The epoch slider:** shows both losses and accuracies, plus the recorded decision map (the `EVAL_END` boundary grid) for the chosen epoch, with the 24 training points.
  - **The lowest held-out loss** is read from the curve and is the slider's default.
  - **With λ = 0,** training loss falls to 0.0004 by epoch 300. Held-out loss is lowest at epoch 31 (0.183) and rises to 0.517.
- **Part B, four values of λ.** λ ∈ {0, 0.003, 0.01, 0.03} through `compareRuns`, which now includes held-out losses. The page shows a chart of held-out curves and a table:

  | λ | Training loss at end | Held-out loss at end | Lowest held-out |
  |---|---|---|---|
  | 0 | 0.0004 | 0.517 | 0.183 (epoch 31) |
  | 0.003 | 0.029 | 0.259 | 0.182 (epoch 32) |
  | 0.01 | 0.091 | 0.227 | 0.198 (epoch 35) |
  | 0.03 | 0.233 | 0.303 | 0.284 (epoch 45) |

  λ = 0.03 is too strong: the network underfits.
- **Part C, weight decay inside an update.** After a recorded run with λ > 0, it shows the first 100 updates of one weight. For each update: w, ḡ, λ·w, ḡ + λ·w (both from `GRAD_ACCUMULATE`), Adam's Δ, and w after.
  - λ·w and ḡ + λ·w are each "checked here" against the recorded values.
  - Biases are stated, and tested, not to be decayed.
- **The rest of the page:**
  - primer and 4-step tour;
  - 3 challenges: find the lowest held-out loss, find the λ with the lowest final held-out loss, find the λ that is too strong;
  - fixed questions and 1 live question (the recorded ḡ + λ·w);
  - the trace explorer with Level 3 wording (decay on).

## Decisions

- **No early stopping in the engine (ADR-097).** The page marks where it *would* stop by reading the recorded held-out curve, and says so ("read from the curve").
- **The chart title shows the λ of the recorded run,** not the λ currently selected. This was fixed during the visual check: changing the control without retraining had mislabelled the chart.
- **The comparison is not recorded** ("Trained by the engine · no record kept"). The unit test checks that its λ = 0 held-out losses equal the recorded run's, value for value.

## Tests

- **`tests/unit/level3-exp04.test.ts`, 10 tests:**
  - **The record:** every epoch has both losses, and the overfitting claim holds (training loss < 0.05; held-out lowest between epoch 6 and 150, then ending above 2× its lowest). `lowest()` is also tested.
  - **Weight decay:** for every weight, at each of 40 updates, `decay` = λ·w and `regularized` = ḡ + λ·w exactly. Adam's m and Δ, recomputed from `regularized`, match within 10⁻¹⁴/10⁻¹², and after = before + Δ.
  - **Biases** have no decay.
  - **The `GRAD_ACCUMULATE` instruction** has the weight as an operand and λ in its meta.
  - **The live question's** answer is the recorded value.
  - **The comparison:** λ = 0.01 ends lower on held-out loss than λ = 0, and λ = 0.03 has the highest training loss. Its λ = 0 losses equal the record's.
  - **The page renders.**
- **The vocabulary test** includes Experiment 04.
- **Browser check (1280 px, dev server):** Parts A, B and C ran with no console errors (`l3e4.cjs`).
- **e2e:** `tests/e2e/level3-exp04.spec.ts`, delegated to a Sonnet agent.
