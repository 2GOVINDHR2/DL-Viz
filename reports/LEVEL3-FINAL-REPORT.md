# DL-VizLab: Level 2 completion and Level 3, overnight final report (2026-11-27)

Branch `claude/exciting-heisenberg-weq2n6`. All work is committed and pushed. The resume file (`reports/LEVEL3-RESUME.md`) is current.

## 1. Summary

| Item | Status |
|---|---|
| Level 2, Stage 6 (final challenge inside Experiment 05) | **complete.** The recorded forward steps were added (ADR-096); see `reports/LEVEL2-STAGE6-COMPLETION.md` |
| Level 3 curriculum, "Training Strategies and Generalization" | **4 of 4 experiments implemented, open and engine-backed** |
| Engine extensions | Adam, L2 weight decay, and a held-out split for the synthetic datasets (ADR-098). Each was gated before any UI used it |
| Trace format | **unchanged grammar.** No new instruction kind; only additive result slots and meta |
| Full regression | see §7 |

## 2. Level 3 curriculum (ADR-097, `docs/LEVEL-3-ARCHITECTURE.md`)

The order follows the update rule as it grows. Experiments 01–03 share one task: circles, 60 points, a 2-6-1 tanh network, the same starting weights and full batch. Any difference between their runs therefore comes from the training strategy.

| # | Experiment | What the learner does | Engine source | Report |
|---|---|---|---|---|
| 01 | Learning Rate and Training Dynamics | compares η ∈ {0.05, 0.5, 2, 8, 30} (too slow / useful / unstable / diverging); inspects a recorded update Δ = −η·ḡ, overshoots included | `compareRuns`; recorded run | `LEVEL3-EXP01.md` |
| 02 | Momentum | plain descent vs μ = 0.5 and 0.9; the velocity v ← μv + ḡ update by update, the build-up (step > 2× plain), and μ = 0 collapsing to plain descent | `OPTIMIZER_STATE {velocity}` | `LEVEL3-EXP02.md` |
| 03 | Adam | three optimisers at the same η; m, v, m̂, v̂, t and Δ per update, with bias correction at update 1 (m̂ = ḡ, step = η); per-parameter step sizes at any update | `OPTIMIZER_STATE {m, v, mHat, vHat}` (new) | `LEVEL3-EXP03.md` |
| 04 | Overfitting and Regularization | training vs held-out loss (24 noisy training points, 200 held-out); lowest held-out epoch; decision map at any epoch; λ ∈ {0, 0.003, 0.01, 0.03}; ḡ, λ·w and ḡ + λ·w inside an Adam update | held-out split and `GRAD_ACCUMULATE {decay, regularized}` (new) | `LEVEL3-EXP04.md` |

**Every experiment has:** a primer, a 4-step guided tour, 3 challenges, fixed knowledge-check questions, a live question built from the learner's own recorded run, and the shared trace explorer with Level 3 wording.

**Left out, and why (ADR-097):**
- **Learning-rate schedules:** the engine has one constant η.
- **Dropout, batch norm, augmentation and automated early stopping:** not supported and not needed. Experiment 04 shows where early stopping *would* stop, read from the recorded curve, and says so.

## 3. Engine and NPM changes (ADR-098)

- **Adam** (`src/core/optim/optim.ts`): Kingma & Ba with bias correction. It is recorded in the existing `OPTIMIZER_STATE` kind:
  - results m, v, mHat, vHat;
  - meta optimizer, β₁, β₂, ε, t;
  - operands: the incoming gradient and the previous m and v.

  `COMPUTE_UPDATE` reads mHat and vHat. Checkpoints carry the Adam state, so replay and segment reconstruction work.
- **L2 weight decay** (`optimizer.weightDecay`), on weights only:
  - `GRAD_ACCUMULATE` gains the results `decay` (λ·w) and `regularized` (ḡ + λ·w), the weight as an operand ("parameter (weight decay)"), and meta `weightDecay`.
  - The optimiser steps on `regularized`.
- **Held-out split** for synthetic datasets (`test: {n, seed}`; it must use another seed). `EVAL_END` records `testLoss` and `testAccuracy`, and `compareRuns` returns `testLosses`.
- **`validateOptimizer`** rejects invalid hyper-parameters.
- **Unchanged:**
  - the update grammar, `GRAD_ACCUMULATE OPTIMIZER_STATE? COMPUTE_UPDATE APPLY_UPDATE`;
  - every existing trace: momentum traces are byte-identical;
  - the workbench, which offers no Adam configuration.

## 4. Mathematical validation (`tests/unit/level3-optim-gate.test.ts`, `reports/level3-optim-gate.json`)

| Check | Max error |
|---|---|
| Adam vs an independent hand loop, 12 updates | 6.7 × 10⁻¹⁶ |
| Adam vs TF.js `tf.train.adam`, 30 updates | 8.7 × 10⁻⁶ (TF.js is float32) |
| Momentum vs hand loop, 12 updates | 2.8 × 10⁻¹⁶ |
| Weight decay: 12 updates by hand; regularised gradient vs finite difference of the penalised loss | 1.7 × 10⁻¹⁰; biases untouched |
| Replay and checkpoint-segment regeneration with Adam state | identical |
| Held-out loss vs hand evaluation of the final parameters; `compareRuns` vs the record | 10⁻⁹; equal |
| Grammar conformance for every new configuration | conforms |

**The per-experiment unit tests recompute each rule from recorded values,** over every update of many parameters:
- the momentum rule (exact);
- Adam's m, v, m̂, v̂ and Δ (10⁻¹²);
- λ·w and ḡ + λ·w (exact) with Adam on the regularised gradient (10⁻¹²).

**Every "checked here" mark on a page** is a recomputation from recorded values, never a replacement for them.

## 5. Interface integration (ADR-099)

- **Level 3 is a third `LevelDescriptor`.** It has its own routes (`#/level-3`, `#/level-3/experiment-01…04`), landing page, Levels-page card, navigation and breadcrumbs. Status is stored locally under `l3:`; there is no account or server progress.
- **Shared pieces** (`src/learn/level3/common`): an update-series reader, a comparison hook, a multi-run chart with tables, a page-owned recorded run, and explorer wording per optimiser.
- **Vocabulary:** terms are scheduled by experiment (`LEVEL3_TERMS`), and a test renders every page and fails on a term taught later.
- **Store release:** leaving a page releases the shared trace store.

**Defects found and fixed during integration:**
- **Key-value lists at 320 px:** a long label left the value column 0 px wide (`.lv-kv`). The label column is now capped at half the width. This was found by the new Level 3 layout test.
- **Experiment 04's chart title** showed the selected λ rather than the λ of the recorded run.
- **Experiment 03's draft claim** that "every step is about η" was contradicted by the record (steps 116× apart), and was corrected in the text, primer, question and test.

## 6. Accessibility and layout

- **Accessibility** (`tests/e2e/a11y.spec.ts`, axe WCAG 2.1 A/AA): every Level 3 page in light and dark themes, as opened, with every disclosure open, with the tour open, and with each experiment trained.
- **Layout** (`tests/e2e/layout.spec.ts`, test III): every Level 3 page, opened and trained, at 1440, 1024, 768, 390 and 320 px, with no horizontal scroll, escape or clipping. Output in `reports/layout-level3.json`.
- **Capability inventory:** the Level 3 screens (opened and trained) were appended to the baseline. The replaced "Levels 3 and beyond" card is recorded in `reports/capability-removed.json` (ADR-099).
- **Screenshots, desktop 1280 px and mobile 390 px:** `docs/screenshots/level3/` holds 22 images: the landing page, and each experiment's parts after real runs. No console errors and no overflow during capture.

## 7. Test results

RESULTS_PLACEHOLDER

## 8. Limitations and open items

- **Browsers:** Chromium only. Firefox and WebKit were **not** tested.
- **Workbench:** its explainers and views still describe only SGD and momentum. Adam and weight decay are available only through Level 3.
- **Negative assertions:** some e2e assertions check that something is absent (for example "Skip tour" removes the tour button, or an old update box disappears). They are covered by the positive assertions just before them, and were not given separate targeted mutants.
- **No Level 3 assessment page.** The brief asked for experiments, not an assessment.
- **Large comparisons:** a few seconds per comparison on desktop. Experiment 04's comparison trains four 300-epoch runs, which is slower on low-end phones.

## 9. Commits (this overnight run)

COMMITS_PLACEHOLDER

## 10. Recommended review steps

1. Read this report, then `docs/LEVEL-3-ARCHITECTURE.md` and ADR-097–099 in `docs/DECISIONS.md`.
2. `npm run dev`, then open `#/level-3`. Take each experiment's guided tour, and run each Part. In Experiment 04, train λ = 0, then λ = 0.01, and compare Part C.
3. Check the math gate: `npx vitest run tests/unit/level3-optim-gate.test.ts`.
4. Check the Level 3 e2e specs: `npx playwright test tests/e2e/level3-exp0 --project=chromium`.
5. Look through `docs/screenshots/level3/`, desktop and mobile.
6. Optionally, try Firefox and WebKit by hand. They were not tested overnight.
