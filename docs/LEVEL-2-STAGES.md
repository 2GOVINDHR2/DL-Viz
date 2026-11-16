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
