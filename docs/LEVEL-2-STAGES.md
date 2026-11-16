# Level 2 — stage reports

Each stage of the Level 2 plan (`docs/LEVEL-2-ARCHITECTURE.md`) ends with a report here, and work stops for review.

## Stage 2 — Experiments 01 and 02 (2026-11-16)

**Decisions applied:** D1 (textbook matrix layout, ADR-089), D3 (expressions on the engine's tape, ADR-088) and D5 (a Level 2 card on the levels page, ADR-087). D2 and D4 concern later stages and are not used yet.

### Implemented

- **Shared groundwork (ADR-087):**
  - a level descriptor (`src/learn/curriculum.ts`), with `ExperimentLayout`, the router, breadcrumbs and navigation made level-aware;
  - a Level 2 landing page: 01–02 open, 03–05 listed as "in preparation" and not linked;
  - a Level 2 card on the Learning levels page.
  - Level 1's URLs, status keys and pages are unchanged.
- **Experiment 01, Forward Propagation:**
  - Part A: one neuron with three inputs; each input's contribution comes from an engine probe example that keeps only that input.
  - Part B: a layer of two neurons on the same inputs.
  - Part C: a 2-2-1 network stepped through its recorded forward instructions, by layer (3 steps) or by operation (7). Values not yet computed show "·". The contributions of each hidden neuron to the output come from the engine.
  - Part D (optional): the matrix form in the textbook layout, each row expanded into its neuron's sum.
  - The concept primer, a 5-step tour, 4 challenges, 3 fixed questions and 1 live question (which hidden neuron contributes more, from the engine at the current settings).
- **Experiment 02, Loss Functions:**
  - Part A: prediction against target, with the error and its square.
  - Part B: MSE over four editable predictions: error, square, sum and mean, every value from the engine's ops.
  - Part C: BCE, with a curve over p ∈ [0.01, 0.99] for either target.
  - Part D: BCE against squared error on the same chart.
  - Part E: logit → sigmoid → probability → BCE, with a note on the engine's probability clipping.
  - The concept primer, a 4-step tour, 4 challenges, 3 fixed questions and 1 live question (the MSE of the current predictions, with distractors that are the engine's sum and its unsquared mean).

### Where the values come from

| Values | Source |
|---|---|
| Experiment 01 | engine probes (`src/learn/engine/probe.ts`): real runs recorded as NPM traces with learning rate 0. Part C's steps are that trace's instructions. |
| Experiment 02 | the engine's own ops on a real autodiff tape (`src/learn/engine/expr.ts`). These are not training runs, so they make no trace and the screens say "computed by the engine's … operation". |

The interface computes no network or loss value. Experiment 01's matrix rows list their operands, ending in the engine's z.

### Files

- **New:**
  - `src/experiments/level2.ts`, `src/learn/curriculum.ts`, `src/learn/engine/expr.ts`;
  - `src/learn/level2/Experiment01.tsx`, `src/learn/level2/Experiment02.tsx`;
  - `src/learn/level2/viz/ForwardDiagram.tsx`, `src/learn/level2/viz/FunctionChart.tsx`;
  - `src/learn/pages/Level2Landing.tsx`;
  - `tests/unit/level2-math.test.ts`, `tests/unit/level2-vocabulary.test.ts`, `tests/e2e/level2.spec.ts`.
- **Modified:**
  - `src/experiments/level1.ts` (adds the `LessonExperiment` type only);
  - `src/learn/components/ExperimentLayout.tsx`, `router.ts`, `Shell.tsx`, `LearnApp.tsx`, `pages/Levels.tsx`;
  - `tests/e2e/a11y.spec.ts` and `layout.spec.ts`: Level 2 pages added to the learning-interface lists;
  - `docs/DECISIONS.md` (ADR-087 to ADR-089);
  - `docs/VALIDATION-REPORT.md` and `reports/a11y.json`, regenerated.

### Reused from Level 1, unchanged

`ConceptPrimer`, `GuidedTour`, `ExplorationChallenges`, `KnowledgeCheck` (live questions), `MathNote`/`Formula`, `ValueSlider`, `Segmented`, `Disclosure`, `Term`, `EngineBadge`, `RecordList`, `NeuronDiagram`, `probe`, the signals, the formatting, and the design tokens and stylesheet. No CSS was added.

### Tests

| Suite | Result |
|---|---|
| typecheck, lint, format | pass |
| `test:unit` | 49 files, 601 tests, all pass: 586 before, plus 15 new |
| gradcheck / parity / determinism | 48 / 8 / 18, all pass |
| build | pass |
| e2e (Chromium, 3 workers) | 73 of 74. The failure is `perf-cnn` (workbench): peak renderer memory 830 MB against its 700 MB guard under parallel load. Run alone it passes. Level 2 code does not load in the workbench. |
| Level 2 e2e | 3 of 3: navigation and gating; Experiment 01's stepping and prediction against a hand computation; Experiment 02's MSE, the live question and the clipping note |
| Accessibility (axe) | 103 screen states, 0 violations; 6 of them are Level 2 (172 passing checks) |
| Layout (Level 1 + 2, 1440 to 360 px) | 0 violations |

**What the new unit tests check:**

- **Math (`level2-math`):**
  - every displayed value against formulas written independently in the test;
  - Experiment 01's recorded forward steps against the network computed by hand, for three settings and activations;
  - the contributions summing to the output's z;
  - the textbook rows reproducing each recorded z;
  - MSE, its sum and its unsquared mean;
  - BCE at 99 probabilities for both targets;
  - squared error never exceeding 1, a claim the page makes;
  - the logit chain, and the clipped maximum of 16.118;
  - live questions that follow non-default settings;
  - routes, and status keys that leave Level 1 unchanged.
- **Vocabulary (`level2-vocabulary`):** no Level 2 page uses a term taught later (such as gradient, derivative or chain rule) or one belonging to a later level; a guard checks that the check is not vacuous.

### Known limitations

- **Part C of Experiment 01 steps through a probe run's recorded forward instructions**, not through the navigator. The probe trace lives on the main thread, and its forward pass is seven instructions. Experiments 03 and 04 will step real training traces through the navigator, as Level 1's Experiment 04 does.
- **Experiment 02's values are engine ops but not traced (ADR-088).** The screens say so.
- **Some charts cut off at the top.** BCE is drawn up to 5 and continues above; the chart says so and gives the value as text.
- **The capability inventory does not include Level 2 yet.** It is planned for Stage 6, with the full Level 2 screen set.
- **No learner has used Level 2.** The timings are design targets.

### For review before Stage 3

1. Is the depth of Experiment 01, Part D (matrix view, optional) right, or should it move entirely behind the disclosure, including its introduction?
2. Is the BCE chart's vertical limit of 5 acceptable? It keeps squared error readable in Part D.
3. Stage 3 will move the trace explorer and run store into `src/learn/trace/` for reuse (docs/LEVEL-2-ARCHITECTURE.md §2). Level 1 must stay unchanged, apart from import paths.

## Stage 3 — Experiment 03 and the shared trace explorer (2026-11-16)

**Review decisions applied:**

- **D1:** Experiment 01 unchanged.
- **D2:** the BCE chart cap is now visible (ADR-091).
- **D3:** the shared explorer, with per-level wording (ADR-090).
- **D4:** the one-input sigmoid neuron on four examples, trained full batch (ADR-091).

### 1. Implemented

- **Experiment 02, chart cap only.**
  - A capped axis is marked by a dashed line and the label "axis capped at 5".
  - Points above the cap are never drawn at a false height: the curve breaks, and a current value above the cap is marked ▲ with its exact value.
  - The comparison text says the cap is for readability, not a limit of the loss.
  - In Experiment 02 no value reaches 5, because p ∈ [0.01, 0.99] keeps BCE ≤ 4.61. The marking is there for honesty, not need.
- **Shared trace explorer** (`src/learn/trace/`), with `wording.ts`. Level 1 keeps its original text by default, and Level 2 passes `LEVEL2_WORDING`.
- **Experiment 03, Derivatives and Gradient Descent:**
  - Part A: slope, and the tangent on f(x) = (x − 1)² + 0.5. The direction is also written as text (↗ ↘ →).
  - Part B: a rise-over-run table converging to the engine's derivative. Then partial derivatives and the gradient of the real neuron's loss L(w, b).
  - Part C: gradient descent on the loss landscape (engine grid, contours, the downhill arrow, the path). The panel shows the current values, the gradient, η, the update −η·g and the new values as five separate lines.
  - Part D: η = 0.1, 0.45, 0.9 and 1.05 on the parabola, with a verdict derived from the steps (slow, fast, overshooting but converging, diverging).
  - Part E: real training (§5 below).
  - The primer (slope, derivative, gradient, gradient descent), a 5-step tour, 5 challenges, 3 fixed questions and 2 live ones (which way to move x at the current point; whether w went up or down in your run's first update).

### 2. Files

- **New:**
  - `src/learn/trace/wording.ts`;
  - `src/learn/level2/exp03/{math.ts, update.ts, PartsAD.tsx, Training.tsx, Experiment03.tsx}`;
  - `src/learn/level2/viz/{SlopePlot.tsx, LandscapeMap.tsx}`;
  - `tests/unit/level2-training.test.ts`, `tests/e2e/level2-exp03.spec.ts`;
  - `docs/screenshots/level2/exp03-*.jpg`.
- **Moved, imports only (`97dc402`):** `src/learn/trace/{store.ts, hierarchy.ts, engine.ts, TraceExplorer.tsx, TrainingOverview.tsx}`.
- **Modified:**
  - `src/learn/trace/{TraceExplorer.tsx, hierarchy.ts, store.ts}`: the wording context; the header's example count and input size; `read`; the dataset parameter; `renderCurrentRunState`.
  - `src/learn/engine/expr.ts`: `withGradient`.
  - `src/learn/level2/viz/FunctionChart.tsx`: the cap marking.
  - `src/learn/level2/Experiment02.tsx`: `capNote` and the readability note.
  - `src/experiments/level2.ts`: the Experiment 03 definition and `L2_EXP03_DEFAULTS`.
  - `src/learn/curriculum.ts`: 03 opened.
  - `src/learn/LearnApp.tsx`.
  - Tests: `tests/unit/level1-vocabulary.test.ts` (the defect fix in §4), `tests/unit/level2-math.test.ts` (03 is now open), `tests/unit/level2-vocabulary.test.ts`, `tests/e2e/{level2, a11y, layout}.spec.ts`.
  - `docs/DECISIONS.md` (ADR-090, ADR-091).

### 3. The shared explorer refactor

1. **Inspected, and found tied to Level 1:**
   - its words: "adjustment signal", phase labels and explanations, the batch-update label, the update table's caption and note, and the per-kind words;
   - the XOR dataset in the store;
   - a fixed count of 4 examples in the batch count;
   - "Network 2 → …" and "(… hidden)" in the run summary;
   - the XOR points in `TrainingOverview`.
2. **Moved** the five files to `src/learn/trace/`, committed alone with only import paths changed.
3. **Configured, not replaced:**
   - a `TraceWording` context, whose default is `LEVEL1_WORDING`, the original strings;
   - `epochTree(…, words = LEVEL1_WORDING)`;
   - the store's `train(config, label, dataset = XOR)` and `read(from, to)`;
   - the batch count from `header.dataset.n`;
   - the run summary from `header.model.inputShape` and the number of layers.
4. **Unchanged:** the NPM format, the engine and the navigator.

### 4. Level 1 compatibility

- **Byte comparison.** Level 1's Experiment 04 page, and the explorer plus training overview at six cursor positions of a real run, were rendered from the pre-refactor commit and from the new code.
  - The outputs, 335,979 bytes each, differ only in the measured generation time printed in the run summary (13 ms against 14 ms).
  - The comparison was checked to contain the explorer ("The record of run" ×6, "Adjustment signal" ×3, "Backward: work out how to adjust" ×3).
- **A test defect, found and fixed.** The first comparison came out empty. That showed Level 1's vocabulary test had never rendered the explorer: it assigned `getInitialState` on the zustand hook, which zustand 5 ignores. The store now provides `renderCurrentRunState()`. The test uses it and asserts that the explorer rendered, and it passes, so its original conclusion holds.
- **Suites.** All Level 1 suites pass: unit, e2e, accessibility, layout and capabilities (§9).

### 5. How the single-neuron training works

- `neuronConfig(η)`:
  - one input, `dense(1, sigmoid)`, BCE, SGD;
  - batch size 4 (the full batch), no shuffling, 50 epochs;
  - starting values w = −1.5 and b = 1 through `initialParams`;
  - the dataset x = (−2, −1, 0.5, 2), y = (0, 1, 0, 1).
- "Train the neuron" calls the shared store's `train`. It sends `generate` to the engine worker (the existing `EngineHost`), which runs `TrainingSession` and records the NPM trace through `TraceStore`.
- The data are not separable, so the loss has a finite minimum: w ≈ 0.602, b ≈ 0.086, loss ≈ 0.6038 (tested).
- The learning rates 0.1, 1 and 10 behave as slow, converging, and not settling. All three are tested on the real run.

### 6. How the four-example full-batch update is shown

- **Read from the record.** `oneUpdate` reads the prologue, epoch 1 and epoch 2 from the trace (`read`, within the epoch read limit). Every value keeps the id of its instruction (hover a number for "recorded step #n").
- **Eight stages, revealed one at a time:**
  1. the starting w and b;
  2. four forward passes (z and p);
  3. four losses and their mean;
  4. four per-example gradients ∂Lᵢ/∂w and ∂Lᵢ/∂b, "nothing updated yet";
  5. their average g;
  6. η and −η·g;
  7. the update w + Δw;
  8. the next epoch's predictions and losses beside the old ones.
- **The difference from four updates is shown three ways:**
  - the record's own counts, "4 examples processed and 1 parameter update in epoch 1";
  - the wording of stages 4 and 7;
  - a separate real run with batch size 1, whose epoch has 4 updates, listed (w: −1.5 → 0.4640 → −0.1457 → −0.4633 → 0.9725).

### 7. NPM integration

- The shared explorer opens the same run with Level 2 wording:
  - the backward phase is "Backward: compute the gradients";
  - the update group is "Update the parameters (one update for the whole batch)";
  - the ∂L/∂z column is "Gradient ∂L/∂z";
  - instruction kinds are named in terms of gradients (GRAD_ACCUMULATE "average the gradients over the batch", COMPUTE_UPDATE "multiply the gradient by the learning rate: −η·g").
- Detail is revealed progressively (stages, then layers, then operations), and stepping uses the navigator.
- Parts A–D are demonstrations and say so ("Demonstration computed by the engine · not a training run"). Part E says "Recorded training run".

### 8. Mathematical validation

`tests/unit/level2-training.test.ts` has 18 tests. Expected values are written in the test as formulas, independently of the engine, and agree to within 10⁻¹².

- **For each η ∈ {0.1, 1, 10}:** every z, p, loss and per-example gradient; the batch loss; the averaged gradient; −η·g; the new w and b; and the next epoch's four predictions and losses.
- **Batch size 1:** the four sequential updates.
- **The trace:**
  - the averaged gradient is the mean of the recorded per-example gradients;
  - APPLY_UPDATE = INIT_PARAM + COMPUTE_UPDATE;
  - instruction ids appear in execution order;
  - the store's trace equals the engine's directly generated trace, instruction for instruction;
  - the explorer's wording follows the level.
- **The learning-rate behaviour above, and the minimum.**
- **Parts A–D:**
  - f and f′ against the formulas;
  - L, ∂L/∂w and ∂L/∂b against the formulas;
  - Δ = −η·g;
  - **Part C's k steps equal k epochs of real training**;
  - the grid's lowest cell lies beside the real minimum;
  - Part D's iterates against (1 − 2η)ᵏ.
- **Live questions** follow the current point and the run's recorded update.

### 9. Test results

| Suite | Result |
|---|---|
| typecheck, lint, format | pass |
| `test:unit` | 50 files, 621 tests, all pass (601 before, plus 18 in `level2-training`, plus 2 in `level2-vocabulary`) |
| gradcheck / parity / determinism | 48 / 8 / 18, all pass |
| build | pass |
| e2e (Chromium, 2 workers) | 80 of 81 pass |
| Level 1 (unit and e2e), unchanged apart from import paths and the vocabulary-test fix | all pass; the 5 Level 1 e2e tests and `capabilities` (no baseline capability lost) pass |
| Level 2 e2e | `level2.spec` 3 of 3; `level2-exp03.spec` 7 of 7 |
| Accessibility (axe) | 107 screen states, 0 violations; 10 of them are Level 2 (302 passing checks), including Experiment 03 trained with every stage shown and the explorer at operations detail, in both themes |
| Layout (Levels 1 and 2, 1440 to 360 px, Experiment 03 also trained) | 0 violations |

**The one e2e failure is `perf-cnn`**, a workbench test of the CNN that Stage 3 does not touch. Under 2 parallel workers the renderer's peak memory reached 762 MB against the test's 700 MB guard.

- **Run alone it passes**, twice in a row.
- **It predates this stage:** the Stage 2 run failed the same way (830 MB with 3 workers).
- **It is load-dependent, not a regression.** The guard measures the renderer's peak resident memory, which concurrent browser tests inflate.

### 10. Screenshots

`docs/screenshots/level2/` holds Parts A, C, D and E (the update) and the explorer, at 1280 px (desktop) and 390 px (mobile, at 2× scale). In the mobile captures the site header can appear mid-image: element screenshots scroll the page, and the header is sticky.

### 11. Known limitations and unresolved issues

- **On a phone, the update tables scroll sideways** inside their own box (the page does not). They are now focusable, labelled regions, so they can be scrolled from the keyboard. Axe only audits at desktop width, where these tables do not scroll.
- **Part B's rise-over-run table** divides two engine values for display. It is labelled as worked out here, and the derivative itself is the engine's.
- **η = 10 in Part C** can step off the map. A status line says so, and the numbers stay in the panel.
- **The batch-size-1 comparison** reports w only, not b.
- **The capability inventory** still covers Level 1 and the workbench only; Level 2 is planned for Stage 6.
- **No learner has used Level 2.**

### 12. Models used

- **This session (Opus):** the audit, the refactor plan and its byte comparison, finding the test defect, the data and learning-rate sweeps, the Experiment 03 design and implementation (math, `oneUpdate`, components), the unit tests, the review of the delegated work, and the documentation.
- **Delegated to a Sonnet agent:** `tests/e2e/level2-exp03.spec.ts` (7 tests), given exact selectors and the formulas to compute expected values by hand. Its report named 4 selector refinements, all on the test side, and no application defect. I reviewed the spec: it imports no application code, computes the update independently, and checks real back-and-forth navigation.
- **No agent changed the engine, the NPM, or any application file.**
- **Deviation from the allocation policy:** I implemented the Experiment 03 components in this session rather than delegating them to Sonnet. They were tightly coupled to the engine-integration decisions being made at the same time, and splitting them would have meant handing an agent unreviewed engine APIs.
