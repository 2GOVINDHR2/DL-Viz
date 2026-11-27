# DL-VizLab: Level 4, "Deep Learning Architectures", final report (2026-11-27)

Branch `claude/exciting-heisenberg-weq2n6`. All work is committed and pushed. The resume file (`reports/LEVEL4-RESUME.md`) is current. Scope was Level 4 only. No Level 5, no Transformers or attention, and no global fine-tuning were started.

## 1. Summary

| Item | Status |
|---|---|
| Level 4 curriculum | **6 of 6 experiments implemented, open and engine-backed** (`#/level-4`, `#/level-4/experiment-01` … `-06`) |
| Engine extensions (ADR-102) | `timeStep`, `oneMinus` and `stopGradient` ops; `rnn` (with truncation window), `lstm` and `gru` extension layers; seeded `sequence` and `barsAutoencode` datasets. Each was gated before any UI used it |
| NPM trace (ADR-102) | sequence and gated-cell kinds, plus `GRAD_SUM`, which makes gradient accumulation explicit. `meta.step` and `meta.gate` are on every recurrent instruction. The grammar is unchanged, and feed-forward traces are byte-identical (trace-hash test) |
| Full regression from a clean build | **see §7** |
| Hollow-assertion audit of the Level 4 e2e specs | 157 of 250 assertions live by mechanical mutants; **52 of 52 targeted mutants killed at their own line; no hollow assertion found** |

## 2. Experiments (ADR-100, ADR-101, ADR-103)

| # | Experiment | Parts | Engine source |
|---|---|---|---|
| 01 | CNN: from filters to feature maps | A: a 5×5 image and a hand-chosen edge kernel, the 9 positions, products and sum against the engine's value. B: stride ∈ {1, 2} and padding ∈ {0, 1}; the engine's map size against ⌊(n + 2p − k)/s⌋ + 1 (4, 6, 2, 3). C: max and average pooling, every output cell checked. D: vertical and horizontal edge kernels on four patterns | engine probes (`CONV2D`, `POOL`) |
| 02 | CNN training | conv(4, 3×3) → pool → conv(4, 3×3) → pool → dense(3, softmax) on 36 bar images (8×8, 3 classes), SGD η = 0.1, 30 epochs. Loss 0.961 → 0.044, 100 % correct. A: train and record. B: input, feature maps, pooled maps, logits, probabilities, prediction, and loss (−ln p, checked here). C: the first layer's kernels at the start and at any epoch. D: every update of a kernel weight, Δ = −η·ḡ checked here | recorded run (46 026 instructions) |
| 03 | Recurrent networks | a 4-unit recurrent layer on "is the sum of 5 values positive", Adam, 40 epochs. A: unrolled table. B: one time step (xₜ·W, hₜ₋₁·U, their sum, z, tanh, each checked here; h₀ = 0 at t = 1). C: the same W and U at every step, shown by instruction references. D: the last hidden state to a prediction and loss | recorded run (90 885 instructions) |
| 04 | Backpropagation through time | the "first value" task, so the gradient must cross every step. A: forward unrolled. B: backward from t = 5 to t = 1 (∂ℓ/∂zₜ = ∂ℓ/∂hₜ ⊙ (1 − hₜ²) checked here, U's contribution, the gradient sent back). C: U's four contributions and its recorded `GRAD_SUM`. D: full vs truncated windows 1, 2, 3 (final losses 0.0007, 0.504, 0.160, 0.079), with a probe showing which steps each window reaches. E: probes with U = s·I where the gradient vanishes, roughly keeps its size, or explodes, depending on the weights and the input (stated so; no general claim) | recorded run (136 325 instructions), `compareRuns`, probes |
| 05 | LSTM and GRU | A: an LSTM state-transition table. B: f, i, g, cₜ, o, hₜ from the record, each relation checked here; kept / written / shown per unit; the cell-state gradient path (× f only). C: the GRU's z, r, n, hₜ, with no separate cell state. D: parameter counts (plain 29, LSTM 101, GRU 77) and a comparison over three seeds; **the page states that no architecture wins every time** | recorded runs (LSTM 205 854, GRU 163 931 instructions), `compareRuns` |
| 06 | Autoencoders | 25 → 8 → **2** → 8 → 25 on 24 noisy 5×5 bars, MSE, Adam, 150 epochs (loss 0.216 → 0.063). A: encoder. B: the latent space, with within- and between-class distances measured from the record (4.77 vs 6.56 at the last epoch: "the classes are not clearly grouped"); **no semantic meaning is claimed**. C: decoder. D: the reconstruction loss checked as the mean squared difference; the worst image. E: training, and codes of 1–4 numbers compared (0.080, 0.063, 0.029, 0.051: the 1-number code is worst; no monotonic claim) | recorded run (153 158 instructions), `compareRuns` |

**Every experiment has:** a primer, a 4-step tour, 3 challenges, fixed knowledge-check questions, a live question answered from the learner's own recorded run, and the shared trace explorer with Level 4 wording.

**Honesty constraints met in the text:**
- The kernels in Experiment 01 are labelled as chosen by hand. Experiment 02's kernels are the trained ones.
- Gradient clipping is not implemented, and Experiment 04 says so.
- No universal ranking of RNN, LSTM and GRU is claimed.
- No meaning is claimed for the latent space.

## 3. Engine changes (ADR-102)

- **Ops** (`src/core/autodiff/ops.ts`), each with forward and backward tests and gradchecks:
  - `timeStep(x, t)` selects one time step;
  - `oneMinus(x)`;
  - `stopGradient(x)`, used by truncation.
- **Extension layers** (`src/core/layers/recurrent.ts`). Every time step is built from ordinary engine ops on the tape, and the gradients come from the engine's autodiff only.
  - `rnn` has W, U and b, plus an optional `window`. With a window of k, only the last k steps receive a gradient: `stopGradient` is applied to h entering step t when t ≤ T − k + 1.
  - `lstm` has Wf/Uf/bf, Wi/Ui/bi, Wg/Ug/bg and Wo/Uo/bo.
  - `gru` has Wz/Uz/bz, Wr/Ur/br and Wn/Un/bn.
  - h₀ = c₀ = 0, so the recurrent terms at step 1 are omitted.
- **Datasets** (`src/core/engine/datasets.ts`):
  - `sequence` (tasks `sum` and `first`; seeded; held-out split);
  - `barsAutoencode`;
  - `points` gained an optional `shape`, used by the probes.
- **Validation** (`tests/unit/level4-recurrent-gate.test.ts`, `reports/level4-recurrent-gate.json`):
  - every step and gate recomputed by hand to 1e-12;
  - gradient parity with TF.js: RNN 3.8e-8, LSTM 1.9e-8, GRU 2.6e-8;
  - `GRAD_SUM` bit-identical to the tape's gradient;
  - truncation reach, determinism, checkpoint replay and grammar.

## 4. NPM trace changes (ADR-102)

- **New kinds:** `SELECT_STEP` / `GRAD_SELECT_STEP`, `MULTIPLY` / `GRAD_MULTIPLY`, `ONE_MINUS` / `GRAD_ONE_MINUS`, `STOP_GRADIENT`, and `GRAD_SUM`. `ADD` is a passthrough. Each has an explainer, a learner gloss and a schema entry (`src/core/npm/schema.json`, regenerated).
- **`GRAD_SUM`:**
  - The emitter tracks every gradient contribution to a value. When there is more than one, it emits `GRAD_SUM` with `meta.param`, `meta.shared` and `meta.uses`. Examples are a shared weight used at every time step, or a hidden state feeding four gates.
  - The contributions are added in the tape's order, so the sum is bit-identical to the tape's gradient.
- **Explicit time steps:** `meta.step` and `meta.gate` on every recurrent instruction, so each time step and gate can be queried.
- **Hierarchy:** the Epoch → Batch → Sample → Phase → Layer → Operation hierarchy is unchanged.
- **Feed-forward traces:** byte-identical to before (trace-hash determinism test).
- **Explorer** (ADR-101, ADR-103):
  - kernels drawn as grids;
  - a layer-by-layer network summary for non-dense networks;
  - recurrent parameters named by role;
  - long inputs truncated, and long example labels shortened;
  - Level 4 wording, tested on real runs by `tests/unit/level4-vocabulary.test.ts`, whose non-vacuity was verified by reverting the wording.

## 5. Interface integration

- **Shell:**
  - the `LEVEL_4` descriptor in `src/learn/curriculum.ts`, with all of 01–06 open (Level 3's open set is unchanged);
  - routes, the Level 4 landing page, the Level 4 card on the Levels page, and the "full workbench" card.
- **Shared helpers** (`src/learn/level4/common/`):
  - `MatrixGrid` (`lv-mgrid`);
  - record readers for CNN, RNN, BPTT, gated and autoencoder runs;
  - the latent plot;
  - Level 4 wording.
- **Accessibility and layout:**
  - Level 4 pages are in `a11y.spec.ts`, in both themes, opened and trained.
  - They are in `layout.spec.ts` test IV, at 1440–320 px, opened and trained.
  - Phone overflow fixed in Exp 03 and Exp 04 (ADR-103).
- **Capability inventory and screenshots:**
  - the capability inventory has the Level 4 screens appended (`docs/CAPABILITY-INVENTORY.md`);
  - 32 screenshots, desktop and mobile, are in `docs/screenshots/level4/`.

## 6. Performance (Node, median of 3)

| Run | Instructions | Generate | Trace size |
|---|---|---|---|
| 02 CNN | 46 026 | 252 ms | 28.9 MB |
| 03 RNN | 90 885 | 351 ms | 22.4 MB |
| 04 BPTT | 136 325 | 530 ms | 33.7 MB |
| 05 LSTM | 205 854 | 1 138 ms | 50.6 MB |
| 05 GRU | 163 931 | 889 ms | 40.1 MB |
| 06 Autoencoder | 153 158 | 913 ms | 66.3 MB (checkpoints 5.1 MB) |

Every run is small enough to train and record in the browser within a few seconds on a desktop.

## 7. Test results (Stage 8, from a clean build)

RESULTS_PLACEHOLDER

## 8. Limitations

- **Cross-runtime numerics (ADR-103).** `Math.tanh`, `Math.exp` and `Math.log` differ in the last bit between Node's V8 and Chromium's V8.
  - The engine is deterministic within one runtime.
  - A run near an unstable point can amplify the difference. In Experiment 05's comparison, the plain recurrent layer on seed 1 ends at 0.120 in Node and 0.869 in Chromium.
  - Tests therefore do not assert that result across runtimes, and the page makes no claim that depends on it.
- **No gradient clipping.** Experiment 04 shows vanishing and exploding gradients but does not offer clipping, and says so.
- **One recorded run at a time.** The trace store holds one record, so Experiment 05 Part C retrains as a GRU and replaces the LSTM record, and the page says so.
- **Browsers.** Chromium only. Firefox and WebKit were **not** tested.
- **Mutation audit.**
  - 21 assertions got no result from the mechanical mutants, even after re-runs with 2 workers and then 1. Most are shared waits for training to finish (`train` helpers) and the tour's step checks.
  - Every later assertion in the same tests depends on those waits.
  - The negative assertions (something is absent) survive blanking by construction, as for Level 3.
  - None of these were given separate targeted mutants.

## 9. Deferred (not in scope)

- Level 5 and anything Transformer-related, including attention, positional encoding and LLMs, as the brief requires.
- Global fine-tuning of Levels 1–4.
- Gradient clipping, convolutional or recurrent layers in the workbench, and dropout or batch normalisation.
- Dashboards, accounts, cloud progress tracking and learner analytics, as the brief requires.

## 10. Commits (Level 4)

COMMITS_PLACEHOLDER

## 11. Repository status

REPO_PLACEHOLDER
