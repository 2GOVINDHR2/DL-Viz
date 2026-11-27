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

All runs were made on this machine (Linux, Chromium only), from a clean `dist` build.

| Check | Result |
|---|---|
| Typecheck (`tsc -b`) | clean |
| Lint (`eslint`, 0 warnings allowed) | clean |
| Format (`prettier --check .`) | clean |
| Unit (`tests/unit`) | **61 files, 721 of 721 pass** (final run), including 46 Level 3 tests in 6 files |
| Gradcheck / parity (TF.js) / determinism | 48 / 8 / 18, all pass |
| Level 3 engine gate | all pass (§4) |
| Build (`npm run build`) | passes (the usual chunk-size warning) |
| **Full Chromium e2e, 134 tests** | **132 passed, 2 failed on the first run.** Both were then fixed or re-checked, see below |
| Level 1 / Level 2 regression | all their e2e specs, unit tests, a11y and layout checks pass in the full run |
| Level 3 e2e specs | Exp01 6, Exp02 6, Exp03 5, Exp04 5. All pass, including Exp03 Part C repeated 5× after the fix |
| Accessibility (axe, WCAG 2.1 A/AA) | **135 screens, 0 violations**, of which 20 are Level 3 screens (both themes) |
| Layout | Level 1, Level 2 and Level 3 tests pass. Level 3: 0 violations at 1440–320 px |
| Capability inventory | passes against the baseline with the Level 3 screens appended |
| e2e mutation audit, Level 3 (`reports/mutation-e2e-level3.json`, `reports/mutation-targeted.json`) | 121 assertions: 67 live by mechanical mutants and 41 by targeted mutants (35 new). The other 13 are 8 negative assertions and 5 shared-helper waits, not mutated separately. **One hollow assertion was found and fixed** (Exp01: a negative loss lost its sign when parsed) |

**The two first-run failures:**
1. **`level3-exp03` Part C (a real app defect, fixed).** After the update slider moved, the paragraph named the new update while still showing the previous update's values, until the new one had been read. The rows are now stored with their own update number, and the text uses it.
2. **`perf-cnn` (environment).** Peak renderer memory was 734 MB against the 700 MB regression guard. This is the existing workbench CNN, not Level 3 code. It ran after ~125 other tests in the same browser; **run on its own, it passes.** It is noted here, not hidden.

## 8. Limitations and open items

- **Browsers:** Chromium only. Firefox and WebKit were **not** tested.
- **Workbench:** its explainers and views still describe only SGD and momentum. Adam and weight decay are available only through Level 3.
- **Negative assertions:** some e2e assertions check that something is absent (for example "Skip tour" removes the tour button, or an old update box disappears). They are covered by the positive assertions just before them, and were not given separate targeted mutants.
- **No Level 3 assessment page.** The brief asked for experiments, not an assessment.
- **Large comparisons:** a few seconds per comparison on desktop. Experiment 04's comparison trains four 300-epoch runs, which is slower on low-end phones.

## 9. Commits (this overnight run)

- `9d75cb6` Level 3 e2e mutation audit; fix a hollow assertion in the Experiment 01 spec
- `031ad6b` Level 3 targeted e2e mutants; final report draft (results pending)
- `a313765` Level 3 screenshots (desktop and mobile); regenerated validation report and NPM spec tables
- `11205f3` Level 3 integration: Exp04 e2e spec, Level 3 in a11y/layout/capability checks; fix narrow key-value layout
- `9d07a9f` Level 3 Experiment 04: overfitting and regularization; ADR-099
- `18bef57` Level 3 Experiment 03 e2e spec
- `936cac9` Level 3 Experiment 03: Adam; Experiment 02 e2e spec
- `a9cb352` Level 3 Experiment 02: momentum; Experiment 01 e2e spec
- `6b1035f` Level 3 Experiment 01: learning rate and training dynamics, and Level 3 infrastructure
- `e5b597c` Level 3 gate: Adam, L2 weight decay and a held-out split in the engine
- `94d6e81` Level 2 Stage 6 completed: recorded forward steps in the final challenge
- `114470f` Level 3 overnight run: baseline audit and resume file
- (this report and the Part C fix: the final commit)

## 10. Recommended review steps

1. Read this report, then `docs/LEVEL-3-ARCHITECTURE.md` and ADR-097–099 in `docs/DECISIONS.md`.
2. `npm run dev`, then open `#/level-3`. Take each experiment's guided tour, and run each Part. In Experiment 04, train λ = 0, then λ = 0.01, and compare Part C.
3. Check the math gate: `npx vitest run tests/unit/level3-optim-gate.test.ts`.
4. Check the Level 3 e2e specs: `npx playwright test tests/e2e/level3-exp0 --project=chromium`.
5. Look through `docs/screenshots/level3/`, desktop and mobile.
6. Optionally, try Firefox and WebKit by hand. They were not tested overnight.

## 11. Follow-up after review (2026-11-27)

Two items left open in the first version of this report were completed:

1. **The explorer's wording is now checked on real Level 3 runs.**
   - `tests/unit/level3-vocabulary.test.ts` trains each experiment's own recorded run. It renders the page with its trace explorer at seven points: the forward pass, the backward pass, every update kind (GRAD_ACCUMULATE, OPTIMIZER_STATE, COMPUTE_UPDATE, APPLY_UPDATE), and the end of the run.
   - **This found a defect, now fixed.** The explorer in Experiments 02–04 used Level 2's plain-gradient-descent wording ("Update: w ← w − η·g", "The step is −η·g", "new value = old value − η·g"), which is wrong for momentum, Adam and weight decay.
   - `level3Wording` now names the step Δ and states each optimiser's rule; Experiment 01 (plain η) is unchanged. The test fails for Experiments 02, 03 and 04 without the fix (commit `6390e39`).
2. **A full regression was run after all fixes, from a clean `dist` build.** typecheck, lint and format are clean. Unit tests pass 721 of 721, gradcheck 48, parity 8, determinism 18. The **full Chromium e2e suite passed 133 of 134.**
   - **The single failure is `perf-cnn`'s memory guard:** peak renderer memory was 791 MB against a 700 MB guard in the existing workbench CNN, not Level 3 code. It ran after ~125 other tests in the same browser.
   - **Run on its own immediately afterwards, it passes.** It also failed the same way in the first full run, so it depends on suite order and the machine. It has not been fixed and is left for a decision: raise the guard, or run perf specs in a fresh browser.

## 12. The `perf-cnn` memory failure: diagnosis and fix (2026-11-27)

**Symptom.** In the full Chromium suite, `perf-cnn` failed its peak-memory guard twice, at 734 MB and 791 MB against a 700 MB limit. Run on its own, it passed.

**Diagnosis.** The cause was the measurement, not the CNN page.
- **The probe measured the whole machine.** It read the largest `--type=renderer` resident set from `ps` across the whole machine, not just this test's tab.
- **Other tests run in parallel.** The suite uses 2 Playwright workers. While `perf-cnn` ran (test 125 of 134), the other worker was running the Level 3 layout test, which trains every Level 3 experiment, Experiment 04's 300-epoch record included.
- **That tab is large enough on its own.** Measured with nothing else running, it peaks at **679 MB**, and in the suite it runs after many other tests in the same worker.
- **The worker's browser was shared.** `perf-cnn` also ran in a browser process shared with the earlier tests of its worker. Anything those tests left in that browser counted towards its peak too.
- **Controlled reproduction.** `perf-cnn` and the Level 3 layout test were run together with 2 workers, twice. This test's own renderers peaked at 561 and 533 MB, while the largest renderer on the machine was 619 and 554 MB.
- **The original 791 MB process can't be named now.** The old probe recorded no process ids. Both possible causes, another worker's renderer and accumulation in the shared browser, are removed by the change below.

**Change** (`tests/e2e/perf-cnn.spec.ts`, commit `19ab16f`):
1. **The test launches its own browser process,** with the project's launch options, base URL and viewport. Nothing an earlier test did is in it, and it is closed at the end.
2. **Peak memory counts only this browser's renderer processes.** Their ids come from the DevTools protocol (`SystemInfo.getProcessInfo`) and are refreshed every 250 ms.
3. **Each sample is one `ps` snapshot.** A first version used two separate calls, which caught different spikes.
4. **The machine-wide peak is still recorded** (`peakAnyRendererRssMB`, an annotation and a log line), for diagnostics only. It is never asserted.

**The guard is unchanged.** It is still `peakRendererRssMB < 700`, alongside the worker's live heap + array buffers after GC (< 500 MB) and the worst frame during generation (< 250 ms). The measurements below show the threshold is valid: the isolated peak sits at 529–580 MB, 120–170 MB under the guard.

**Isolated runs** (`--repeat-each=10 --workers=1`, a fresh browser each time): **10 of 10 pass.**

| Run | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Own renderer peak (MB) | 553 | 540 | 545 | 529 | 571 | 563 | 532 | 580 | 564 | 551 |

Min 529, max 580, mean 553 MB. The three single runs while the probe was being finalised gave 554, 528 and 548 MB.

**Final full-suite result.** After a clean `dist` build, `npx playwright test --project=chromium` gave **134 passed, 0 failed (8.8 min, 2 workers).** `perf-cnn` ran as test 125 with an own-renderer peak of 577 MB.

**Final status of Level 3 regression:**
- typecheck, lint and format: clean;
- unit: 721 of 721;
- gradcheck, parity and determinism: 48, 8 and 18;
- full Chromium e2e: **134 of 134.**
