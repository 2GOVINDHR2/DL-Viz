# Level 1 — plan (Phase 1)

Written after the Phase 0 port was verified (see `docs/PORT-VERIFICATION.md`) and before interface work began.

## What exists

- **The engine and the NPM** (`src/core/`), unchanged. The pieces Level 1 relies on:
  - `TraceStore.generate` (`npm/store.ts`): runs a `TrainConfig` on a dataset and records the run as a checkpointed trace;
  - `storeSource` (`npm/source.ts`): one read interface over that trace;
  - `stepForward` / `stepBackward` / `unitBounds` (`npm/navigator.ts`): granularity-aware stepping in both directions, never materialising more than two segments;
  - `reconstructState` / `epochSummaries` (`npm/state.ts`): the visible state at a cursor, and one record per epoch;
  - `EngineHost` (`engine/host.ts`) behind the existing web worker (`src/ui/engine.worker.ts`), with the `generate`, `range`, `advance`, `jump`, `epochSummaries`, `paramHistory` and `compareRuns` requests.
- **Experiment definitions** (`src/experiments/registry.ts`): ten experiments, all retained. The AND truth table and starting-weights mechanism of experiment 1 (`points` dataset plus `initialParams`), the step-function data of experiment 2 and the XOR configuration of experiment 7 are what Level 1 draws on.
- **The existing interface** (`src/ui/`, `src/views/`): a capable workbench with a guided path. It is what the capability inventory, the `perf` measurements and 17 e2e specs were written against.

## Constraints found in the audit

1. **The engine has no step activation.** Activations are linear, sigmoid, tanh, ReLU and softmax. A step function cannot be trained by gradients, so the core never needed it. Adding one would change the core. Instead, for Step the engine computes z (a linear output unit), and the interface applies the threshold "z ≥ 0 → 1". The screen labels this. (ADR-081)
2. **Experiments 01–03 do not train.** They still read every value from a real engine run. Each change runs the engine once over the examples, with learning rate 0, and the values are read from that run's trace. (ADR-082)
3. **Replacing the workbench would remove capabilities.** The task forbids that, and so does `capabilities.spec.ts`. The workbench stays reachable as the Levels 2+ and expert surface. Level 1 is built as a new interface beside it. (ADR-080)

## What Level 1 needs, and what will be built

| Need | Built as |
|---|---|
| Navigation: Home, Learning Levels, Level 1 | A hash router and a shell in `src/learn/`; the workbench and Study Mode keep their URLs |
| Design system | `src/learn/design/tokens.ts` as the one source of the palette; `learn.css` uses it; a palette test (contrast, CVD, lightness) |
| Common experiment shape A–F | `ExperimentLayout`, configured from data (`src/experiments/level1.ts`) |
| Concept primer, guided tour, challenges, knowledge check | Four reusable components; one `GuidedTour`, configured per experiment |
| Exp 01 neuron | `NeuronDiagram` and `ActivationGraph`, reading from engine probes |
| Exp 02 perceptron and gates | `TruthTable` and `DecisionBoundary` (engine grid, contour by marching squares) |
| Exp 03 linear vs nonlinear | `TransformView` (points and grid lines transformed by the engine), the composed-layers demonstration, XOR with and without ReLU |
| Exp 04 MLP | `ArchitectureBuilder` → `TrainConfig`; worker `generate`; `TrainingOverview`; `TraceExplorer` (epoch → batch → phase → layer → operation), built on `advance` / `jump` / `range` |
| Knowledge-check feedback true for any settings | Conceptual questions whose feedback holds for any settings, plus one "predict" question per experiment. Its answer is computed from the learner's current settings by the engine. |
| Research readiness | Fixed defaults; the same content for everyone; `?l1-seed=` can pin Experiment 04's seed for a study session. No accounts, no analytics. |

## Out of scope here

The Levels 2+ interface (the workbench serves it for now), backpropagation mathematics, and any engine or trace-format change.
