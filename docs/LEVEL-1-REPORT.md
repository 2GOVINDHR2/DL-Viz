# Level 1 — implementation report

The deliverables of the Level 1 task (§18), in order. Related documents: `docs/PORT-VERIFICATION.md` (Phase 0), `docs/LEVEL-1-PLAN.md` (Phase 1), ADR-080 to ADR-086 in `docs/DECISIONS.md`, and the KG-L1 items in `docs/KNOWN-GAPS.md`.

## 1. What was implemented

- **Port (Phase 0).**
  - The existing repository was copied unchanged (`5f7ea6c`). Every engine suite passes.
  - `measure` and the reconstruction harness reproduce the context report's deterministic figures exactly. Timing figures were re-measured on this machine and recorded separately (`PORT-VERIFICATION.md`).
- **The learning interface (`src/learn/`).**
  - Pages: Home, Learning levels, the Level 1 landing page (ordered path, durations, main idea, a status per entry), an orientation on AI, ML and DL, four experiments, and a consolidated assessment.
- **One experiment shape for all four:**
  1. Introduction, with objectives and outcomes.
  2. Concept primer of 2–4 terms, with an interactive demonstration for Experiment 01.
  3. An optional guided tour.
  4. The main visualisation.
  5. Exploration challenges, ticked when tried.
  6. A knowledge check with explanatory feedback.
- **Experiment 01, Inside a Neuron.**
  - A left-to-right neuron with inputs, weights, bias, Σ, activation and output.
  - Controls for inputs, weights and bias, each showing its previous value.
  - Step, Sigmoid, ReLU and Tanh, each with a graph marking the current z.
  - A calculation breakdown (collapsed) with the engine's record, and the formula behind a disclosure.
- **Experiment 02, Perceptrons and Logic Gates.**
  - AND, OR and NOT (one input, on a number line), with a truth table and a decision boundary from the engine's grid.
  - Points are marked correct or incorrect by shape, symbol and dashing as well as colour.
  - A "show me one setting that works" button.
  - An XOR preview that counts attempts and the best score, and explains why 3 of 4 is the limit.
- **Experiment 03, Linear vs Nonlinear Transformations.**
  - Part 1: one linear layer moves points and grid lines (presets plus exact weights).
  - Part 2: two layers in a row, and the single layer that does the same, found and run by the engine.
  - Part 3: XOR with one straight line.
  - Part 4: a fixed 2-2-1 network whose hidden activation switches between linear and ReLU, with the network's decision and the hidden-layer view side by side.
- **Experiment 04, MLP: From Architecture to Training Trace.**
  - An architecture builder (1–3 hidden layers, 1–8 neurons, tanh, ReLU or sigmoid), drawn from the engine's model builder, with parameter counts.
  - The learning loop, labelled as an idea only.
  - The terms, each introduced at its point:
    - prediction and target;
    - loss, with an engine-computed example;
    - learning rate, with three real training runs compared;
    - epoch and batch, showing the grouping and, after training, the order the engine actually used.
  - Training settings, and real training in the engine worker.
  - A training overview: progress, loss per epoch marked at the cursor, the decision boundary at the cursor.
  - The trace explorer:
    - an epoch timeline and a position slider;
    - one epoch opened as batches → examples → stages, plus layers → operations with more detail;
    - step forward and back at the offered sizes, a "Watch" mode, Start and End;
    - a plain-language detail panel: where the cursor is, inputs, target, prediction, loss, values inside the network, and the parameter updates of the batch;
    - the recorded instruction itself at Operations detail;
    - parameter inspection with pin-and-compare, and a value history.
  - A "Runs so far" table compares outcomes. A changed setting marks the record as belonging to its run.
- **Design system:**
  - tokens in `src/learn/design/tokens.ts` and `learn.css`, in light and dark themes, with a theme switch;
  - one spacing scale and type scale, with monospace for values;
  - visible focus, a skip link, reduced-motion support, and touch-sized controls.

## 2. Application structure

```
src/main.tsx                Entry: Level 1 by default; workbench at ?mode= or #/workbench; Study Mode at #study
src/learn/                  The learning interface (new)
  LearnApp.tsx, Shell.tsx, router.ts, status.ts, signals.ts, format.ts, learn.css
  design/tokens.ts          Palette (ADR-083)
  engine/probe.ts           Engine probes and the step rule (ADR-081, ADR-082)
  components/               ExperimentLayout, ConceptPrimer, GuidedTour, ExplorationChallenges, KnowledgeCheck,
                            MathNote, ui (ValueSlider, Segmented, Disclosure, Term, EngineBadge, DemoBadge, RecordList)
  viz/                      NeuronDiagram, ActivationGraph, DecisionBoundary, TransformPlot, contour
  pages/                    Home, Levels, Level1Landing, Orientation, Assessment
  level1/                   Experiment01, Experiment02, Experiment03
  level1/exp04/             Experiment04, parts (builder, loop, loss, learning rate, epochs and batches),
                            TrainingOverview, TraceExplorer, hierarchy, store, engine
src/experiments/level1.ts   Level 1 as data: objectives, primers, tours, challenges, questions, vocabulary (ADR-084)
src/core/                   Unchanged
src/experiments/registry.ts Unchanged: all ten experiments retained
src/ui/, src/views/         The workbench, unchanged (ADR-080)
```

## 3. New and modified components

- **New:** everything under `src/learn/`, `src/experiments/level1.ts`, and `tests/support/colour.ts`.
- **New tests:**
  - unit: `tests/unit/level1-palette`, `level1-engine`, `level1-explorer`, `level1-vocabulary`;
  - e2e: `tests/e2e/level1.spec.ts`.
- **Modified:**
  - `src/main.tsx`: three entries, and the workbench stylesheet loads with the workbench.
  - `tests/e2e/a11y.spec.ts`: two tests open `/#/workbench` instead of `/`. Added: every Level 1 page in both themes, the tour, and Experiment 04 trained at each level of detail.
  - `tests/e2e/controls.spec.ts`: one test opens `/#/workbench`.
  - `tests/e2e/layout.spec.ts`: added test II, covering Level 1 at 1440, 1024, 768, 390 and 360 px.
  - `tests/e2e/capabilities.spec.ts`: reads the Level 1 screens; `CAPTURE=append` (ADR-086); creates `.tmp/`.
  - `playwright.config.ts`: finds this container's Chromium.
  - `reports/capability-inventory.json` and `docs/CAPABILITY-INVENTORY.md`: the Level 1 screens appended.
  - Docs: `DECISIONS.md` (ADR-080 to ADR-086), `KNOWN-GAPS.md`, `PROGRESS.md`, `README.md`.
- **Unchanged:** `src/core/`, `src/experiments/registry.ts` and every other experiment file, `src/ui/`, `src/views/`, `src/explain/`, `src/export/`, `src/study/`, `scripts/`, and every engine test.

## 4. How NPM was integrated into Experiment 04

The existing modules were reused. Nothing was rebuilt.

- **Worker and protocol:**
  - `src/ui/engine.worker.ts` and `src/ui/engineClient.ts` are used as they are;
  - `src/core/engine/host.ts` (`EngineHost`) answers every request;
  - `src/core/engine/protocol.ts` is unchanged.
- **Training:** `generate` → `TraceStore.generate` (`src/core/npm/store.ts`) runs `TrainingSession` with the `NpmEmitter` and records checkpointed segments. The header, length and generation time come back.
- **Epoch summaries:** `epochSummaries` → `src/core/npm/state.ts` `epochSummaries` (EVAL_END and EPOCH_END of each epoch).
- **Stepping:**
  - `advance` → `stepForward` and `stepBackward` (`src/core/npm/navigator.ts`), then `reconstructState` (`state.ts`) at the new cursor;
  - `jump` → `clampCursor`, then `reconstructState`.
  - Both read through `storeSource` (`source.ts`). A step never materialises more than two segments.
- **Hierarchy:** `range` for one epoch, grouped by `unitKey` (`src/core/npm/stats.ts`), the same keys the navigator uses (`src/learn/level1/exp04/hierarchy.ts`).
- **Other requests:**
  - `paramHistory`: one parameter's values at each update up to the cursor;
  - `compareRuns`: the learning-rate comparison, as real runs without traces.
- **Store:** `src/learn/level1/exp04/store.ts` holds only engine replies. Stale replies are discarded by sequence number.

No second trace system was built, and the trace format and the engine are unchanged.

## 5. Existing capability preserved

- `tests/e2e/capabilities.spec.ts` reads every workbench screen in both modes and both states, against `docs/CAPABILITY-INVENTORY.md`.
- All 2,090 baseline capabilities are still present, or are among the 472 already removed under ADR-070 to ADR-076. None was lost in this rebuild.
- The ten Level 1 screens were appended: 480 capabilities, for 2,570 over 30 screens.

## 6. Incomplete features and known limitations

The full list is KG-L1-1 to KG-L1-10 in `docs/KNOWN-GAPS.md`. The main ones:

- No learner has used Level 1. The study instruments are not yet aligned to it.
- The workbench (Levels 2+) is carried across, not redesigned. Its experiment-1 self-check defect and Fix Rounds 6 and 7 remain open there.
- Experiment 04 uses the four XOR examples only.
- Main-thread probe cost is measured in Node, not in the browser.
- Accessibility is checked automatically only.
- Only Chromium was run.

## 7. Test and build results

Run on 2026-11-12 in this container (Node 22.23.4, Chromium from `/opt/pw-browsers`):

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run format:check` | pass |
| `npm run build` | pass (the existing chunk-size warning remains) |
| `npm run test:unit` | 47 files, 586 tests, all pass: the 43 original files and 532 tests, untouched, plus 54 new Level 1 tests |
| `npm run test:gradcheck` / `test:parity` / `test:determinism` | 48 / 8 / 18, all pass; the committed reports are rewritten byte-identically |
| `npx playwright test --project=chromium` | 71 of 71 pass: the 64 existing tests, 5 new Level 1 tests, and new tests in `a11y` and `layout` |
| Automated accessibility (axe, WCAG 2.1 A/AA) | 97 screen states, 0 violations, 2,716 passing checks; 28 of these states are Level 1 (798 checks) |
| Layout | invariant I (the workbench) passes; test II (Level 1, five widths down to 360 px, Experiment 04 trained) passes with no horizontal scroll |
| Capability inventory | no baseline capability lost; 480 Level 1 capabilities appended (2,570 over 30 screens) |

**Which tests changed, and why:**

- `a11y.spec.ts` (two tests) and `controls.spec.ts` (one test) opened `/` to reach the workbench. `/` is now Level 1, so they open `/#/workbench`, which keeps the remembered-mode behaviour that `controls.spec.ts` checks. No assertion changed.
- `capabilities.spec.ts`:
  - It creates the git-ignored `.tmp/` it writes to. Without that it failed on the unmodified port.
  - It now also reads the Level 1 screens.
  - It gains `CAPTURE=append` (ADR-086).
- `layout.spec.ts` and `a11y.spec.ts` gained Level 1 tests.
- No test was deleted or skipped.

**Defects found by the new tests and fixed:**

- Two palette colours below 3:1: orange and grey on the page background.
- Range inputs overrunning their control by 2 px.
- Inline term buttons overrunning by 5 px.
- The word "layer" used in Experiments 01–02 before Experiment 03 introduces it.
- A working link inside an `aria-disabled` list item.

**The 18 UI-facing unit tests** still test the workbench, unchanged, because the workbench is kept (ADR-080). Their properties are tested again for Level 1:

- vocabulary: `level1-vocabulary`;
- values from the engine: `level1-engine` and `level1-vocabulary`;
- nothing from later in the run: `level1-explorer`;
- feedback from the current settings rather than the defaults: `level1-engine`.

**Not run here:** Firefox and WebKit, the 15-minute UI fuzzer (`test:fuzz`), and `npm run measure` after the Level 1 changes. `measure` ran in Phase 0, and the workbench it measures is unchanged.

## 8. How to run

```sh
npm ci
npm run dev          # http://localhost:5173 — Level 1; /?mode=expert — workbench; /#study — Study Mode
npm run build        # static site in dist/; no server and no network calls at run time
npm run test:unit && npm run test:gradcheck && npm run test:parity && npm run test:determinism
npx playwright test --project=chromium   # e2e, including Level 1, accessibility, layout and the capability inventory
```
