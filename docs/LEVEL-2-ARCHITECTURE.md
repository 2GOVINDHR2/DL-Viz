# Level 2 — Stage 1: repository audit and architecture

Status: **for review. No Level 2 code has been written.** This document is the Stage 1 deliverable of the Level 2 specification ("How Neural Networks Learn"). Stage 2 starts only after the decisions in §7 are settled.

## 1. Repository audit

### Stack and structure (verified)

- React 19, TypeScript strict, Vite 8, Zustand. D3 is used for scales and shapes only, and KaTeX for formulas. Vitest runs the unit tests and Playwright with axe the e2e tests.
- The runtime dependencies are the seven listed in the context report. Level 2 needs no new one.
- Three applications share one entry (`src/main.tsx`, ADR-080):

  | Application | Where | URL |
  |---|---|---|
  | The learning interface | `src/learn/` | default, hash routes `#/…` |
  | The workbench (Levels 2+ and expert inspection) | `src/ui/` and `src/views/` | `?mode=` or `#/workbench` |
  | Study Mode | — | `#study` |

- **Static hosting:** relative base and hash routes. Vercel and GitHub Pages are configured, and a build served from a sub-path was verified.

### The engine (inspected and run, not assumed)

| Capability Level 2 needs | Where it is | Status |
|---|---|---|
| Tensor ops, float64 | `src/core/tensor/` | present |
| Reverse-mode autodiff on an explicit tape | `src/core/autodiff/tape.ts` | present. `Tape.apply` records each op with its inputs, attributes and saved values. `backward(tape, root, seed, onStep)` walks the tape in reverse, and `onStep` reports per entry the **incoming gradient** (`gradOutput`) and **each input's contribution** (`gradInputs`). |
| Gradient accumulation for a value used more than once | `tape.ts`, `backward` | present: `grads.set(v.id, prev ? add(prev, g) : g)` |
| Scalar expression graphs, e.g. `(x₁ + x₂) · x₃` | ops `add`, `sub`, `mul`, `div`, `neg`, `exp`, `log`, `square`, `sigmoid`, `tanh`, `relu` | present: any composition of registered ops can be built on a `Tape` |
| Local derivative of one op | each op's registered `backward` rule (`registry.ts`) | present: calling the rule with an incoming gradient of 1 gives the local derivative, from the engine's own code |
| MSE and BCE | `mseLoss` (the mean over elements); `bceLoss` (a probability, clipped to [10⁻⁷, 1 − 10⁻⁷] as Keras and TF.js do) | present. There is **no fused logit-BCE**, so logit → sigmoid → probability → BCE is two real ops. |
| SGD training, per-sample with batch-mean gradients | `src/core/engine/session.ts` | present. Only `sgd` and `momentum` exist; Level 2 uses SGD only. |
| Finite-difference validation | `tests/gradcheck/` | present: 35 op cases and 9 whole-model cases, including **MLP 2-4-1 (tanh, sigmoid, BCE)** and a deep 2-4-4-4-1 sigmoid stack, worst relative error 1.18 × 10⁻⁶ |
| Agreement with an independent framework | `tests/parity/` | present: 8 architectures against TF.js |

### The NPM (inspected)

- **Instruction kinds (`src/core/npm/kinds.ts`).** Each tape op maps to instruction kinds:
  - forward: `MATMUL`, `ADD_BIAS`, `ACTIVATE`;
  - loss: `COMPUTE_LOSS`, `LOSS_REDUCE`;
  - backward: `GRAD_INIT` (∂L/∂output), `GRAD_ACTIVATE` (∂L/∂z), `GRAD_MATMUL_W` (∂L/∂W), `GRAD_MATMUL_X` (∂L/∂a of the previous layer, which is **propagation through the hidden layer**), `GRAD_BIAS`;
  - update: `GRAD_ACCUMULATE` (the batch mean, which is **accumulation across examples**), `COMPUTE_UPDATE` (−η·g), `APPLY_UPDATE`.
- **Operands.** Every instruction lists which earlier instruction produced each of its operands (`operands[].ref`). The trace is therefore itself a serialised dataflow graph.
- **State at the cursor (`state.ts`).** It gives per layer `u`, `z`, `a`, `gradA`, `gradZ`, `gradW`, `gradB`, `gradIn`, plus every parameter's update (`grad`, `delta`, `before`, `after`). The visualisation can consume these directly.
- **Granularity.** Values are tensors per layer, not one instruction per neuron. A single weight's gradient is one element of `GRAD_MATMUL_W`.

### Level 1 interface (`src/learn/`, built in the previous round)

| Reusable as is | Tied to Level 1 (needs generalising) |
|---|---|
| `ConceptPrimer`, `GuidedTour` + `TourLauncher` (signal-driven), `ExplorationChallenges`, `KnowledgeCheck` (live questions), `MathNote`/`Formula`, `ui.tsx` (`ValueSlider` with its previous value, `Segmented`, `Disclosure`, `Term`, `EngineBadge`, `DemoBadge`, `ErrorNote`, `RecordList`), `signals.ts`, `format.ts`, design tokens and `learn.css` | `ExperimentLayout` (imports `LEVEL1_EXPERIMENTS`, prints "Level 1", links with `href.experiment`) |
| `engine/probe.ts` (`runProbe`, `probe`, `probeGrid`, `stepRule`) | `router.ts` (only `/level-1/…`) |
| Visualisations: `NeuronDiagram`, `ActivationGraph`, `DecisionBoundary`, `TransformPlot`, `contour` | `status.ts` keys (`'01'` would collide between levels) |
| Experiment 04's `hierarchy.ts`, `TraceExplorer`, `TrainingOverview`, `engine.ts` (in-process engine for tests) | Experiment 04's `store.ts` (hard-codes the XOR dataset); the explorer's wording ("adjustment signal", deliberately avoiding "gradient" in Level 1); `TrainingOverview` (draws the XOR points) |
| Tests: `level1-palette`, `level1-engine`, `level1-explorer`, `level1-vocabulary`, `e2e/level1.spec.ts` | `LEVEL1_TERMS` (Level 1's vocabulary schedule, where "gradient", "derivative" and "chain rule" are marked *later*) |

### The workbench's Level 2 material (reference, not reused as UI)

The registry experiments 3–6 cover similar ground:

| Experiment | Model and data |
|---|---|
| 3 forward propagation | 2-3-1, Gaussians |
| 4 loss | sigmoid neuron, BCE |
| 5 gradient descent | the line y = w·x + b, with a full loss surface |
| 6 back-propagation | 2-3-1 sigmoid |

Their configurations are verified, and reusing them as data keeps Level 2 consistent with the report's claims. The registry is not edited (as in ADR-084).

## 2. Architecture proposal

```
src/experiments/level2.ts        Level 2 as data: metadata, objectives, primers, tours, challenges, fixed questions,
                                 LEVEL2_TERMS, every default setting (fixed, nothing randomised)
src/learn/curriculum.ts          NEW, small: a level descriptor (id, title, experiments, routes), so the layout, router,
                                 landing page and status work for any level
src/learn/engine/
  probe.ts                       reused unchanged
  graph.ts                       NEW: runs an expression on a real Tape and reads back nodes, edges, values and, via
                                 backward's onStep, each node's incoming gradient, local contributions and
                                 accumulation. A reader of the engine's tape, not a second autodiff.
  numeric.ts                     NEW: central finite differences built only from engine forward evaluations, always
                                 labelled as a check
src/learn/trace/                 MOVED from level1/exp04 (shared): store (dataset and wording as parameters),
                                 hierarchy, TraceExplorer, TrainingOverview, engine
src/learn/level2/
  Experiment01.tsx … Experiment05.tsx   each a thin composition, as in Level 1
  viz/ LayerDiagram, MatrixView, LossCurves, SlopePlot, DescentPlot, BackpropDiagram, ComputationalGraph
  challenge/ the integrated challenge (inside Experiment 05)
```

**Separation**, as the specification asks:

| Concern | Where it lives |
|---|---|
| Content | `level2.ts` |
| Visualisation | `viz/` |
| Calculations | the engine |
| Execution | `TrainingSession` in the worker |
| Autodiff | `Tape` / `backward`, read by `graph.ts` |
| Trace inspection | `src/learn/trace/` |

**Routes:** `#/level-2`, `#/level-2/experiment-01` … `05`, `#/level-2/assessment`. Level 1's URLs are unchanged.

## 3. Reuse plan

- **Unchanged:** every component in the left column of the table in §1.
- **Generalised, keeping Level 1's behaviour and tests:**
  - `ExperimentLayout` takes a level descriptor, not `LEVEL1_EXPERIMENTS`;
  - `router.ts` and `status.ts` gain level-aware keys (`l1:01`, `l2:03`);
  - the trace store takes the dataset with the configuration;
  - the explorer takes a wording set: Level 1 keeps "adjustment signal", Level 2 says "gradient ∂L/∂z".
- **The test for that refactor:** all Level 1 unit and e2e tests pass without being edited, apart from import paths.

## 4. Experiment plan, with where every number comes from

| Exp. | Part | What is shown | Source of the values |
|---|---|---|---|
| 01 Forward propagation | A neuron with n inputs | z = Σwᵢxᵢ + b, a = f(z) | probe (reuses `NeuronDiagram`) |
| | B layer | 2 neurons on the same inputs | probe, `dense(2, f)` |
| | C 2-2-1 MLP, step by step | values per layer and per neuron | NPM trace of a probe run (`MATMUL`, `ADD_BIAS`, `ACTIVATE`) stepped with the navigator at layer and operation granularity |
| | D matrix view (optional) | z⁽ˡ⁾ = W⁽ˡ⁾a⁽ˡ⁻¹⁾ + b⁽ˡ⁾ beside the per-neuron sums | the same probe; see decision D1 on orientation |
| 02 Loss | A, B prediction against target, MSE over n examples | error, square, mean | `Tape` with `mseLoss` (engine op) |
| | C BCE | −[y log p + (1 − y) log(1 − p)] | `Tape` with `bceLoss`, clipping explained |
| | D comparison | both curves over p ∈ (0, 1) | engine ops at each p |
| | E logit → sigmoid → p → loss | the chain | `Tape`: `sigmoid` then `bceLoss` |
| 03 Derivatives and gradient descent | A, B slope, derivative, tangent | L(w) of a one-weight neuron and dL/dw | `Tape` + `backward` (engine autodiff); the tangent line is drawn from that value |
| | C update rule | w ← w − η·dL/dw | the engine's `COMPUTE_UPDATE` and `APPLY_UPDATE` |
| | D learning rates | small, good, too large | real training runs (`compareRuns`, or a trace each) |
| | E single-neuron training | initial w, b → forward → prediction → loss → gradients → update → new prediction and loss | a real NPM trace from `TrainingSession` in the worker, stepped instruction by instruction |
| 04 Backpropagation | A chain rule | y = f(g(x)) | `Tape` + `backward`; local derivatives from the op rules |
| | B one neuron backward | ∂L/∂a → ∂L/∂z → ∂L/∂w, ∂L/∂b | trace: `GRAD_INIT`, `GRAD_ACTIVATE`, `GRAD_MATMUL_W`, `GRAD_BIAS` |
| | C 2-2-1 MLP backward | gradients flowing back; select a weight to see its incoming gradient × local derivative = its gradient | trace (`GRAD_*`), after the **Stage 4 gate** (§5) |
| 05 Automatic differentiation | A–D graph, forward, reverse, accumulation | (x₁ + x₂)·x₃; a value used twice | `graph.ts` over a real `Tape` |
| | E forward vs reverse mode | conceptual comparison | **illustration only** (decision D2) |
| | F the engine's real graph | one training example's dataflow | read from NPM operands (`operands[].ref`), which needs no engine change |
| | Challenge | 2-2-1 (or 2-3-1) MLP: inspect, forward, loss, backward, gradients, update, before and after, trace | real training (worker) and the shared explorer |

## 5. Pre-assessment for the Stage 4 gate (to be demonstrated, not assumed)

- **Existing evidence:**
  - The gradcheck suite already passes for whole MLPs, including 2-4-1 and a deep sigmoid stack.
  - The trace already holds per-layer `GRAD_MATMUL_W`, `GRAD_BIAS` and `GRAD_MATMUL_X`.
  - The backpropagation experiment in the workbench is built on them.
- **Stage 4 will still:**
  - run the chosen 2-2-1 network forward and backward;
  - compare every weight and bias gradient with central finite differences;
  - check that the trace's `GRAD_*` values equal `backward`'s;
  - check that the per-weight decomposition (incoming gradient × local derivative) equals the recorded gradient element;
  - check the batch accumulation.
- **Expected outcome:** no engine change needed. If any check fails, Stage 4 stops and reports.

## 6. Risks and gaps

1. **Matrix orientation.** The engine computes rows: `u = a·W` with `W` of shape [inputs, neurons] (NPM-SPEC §5). The specification writes `z = W a + b`. See D1.
2. **No forward-mode autodiff in the engine.** Showing forward mode with real values would need a second autodiff implementation, which the specification forbids. See D2.
3. **Expression graphs are not NPM records.** NPM records training runs. A free-standing `(x₁ + x₂)·x₃` evaluated on the engine's `Tape` is real engine autodiff but produces no trace. See D3.
4. **The refactor touches Level 1.** Moving the explorer and generalising the layout could regress Level 1. Mitigation: Level 1's unit, e2e, accessibility, layout and capability suites must pass unedited after the move.
5. **Vocabulary.** Level 1 deliberately avoided "gradient". Level 2 introduces it, with "derivative", "chain rule", "partial derivative" and "autodiff", each at its experiment. A `LEVEL2_TERMS` schedule and test, as in Level 1.
6. **BCE clipping.** At p = 0 or 1 the engine's BCE saturates at −ln 10⁻⁷ ≈ 16.1 and its gradient is 0. The interface must say so rather than show ∞.
7. **Single-weight gradients are elements of layer tensors.** The decomposition shown per weight multiplies two recorded values for display. A test asserts that it equals the recorded `GRAD_MATMUL_W` element.
8. **ADR numbers.** Level 2 continues at ADR-087. The old repository's Fix Round 6 branch also used ADR-080 to ADR-083, so a later merge would need renumbering (already flagged).
9. **The CI failures in the workbench predate this work.** The layout widths, CNN performance budget and Firefox heap failures were also failing in the old repository's CI. Level 2 will not touch them; it is reported, not fixed.
10. **Time budget (85–110 min) is an unmeasured design target.** As in Level 1, no learner has used either level.

## 7. Decisions needed before Stage 2

- **D1 — Matrix notation.**
  - Recommended: show the textbook form z = W a + b, displaying W as the engine's matrix transposed, with one line saying the engine stores it the other way round (rows = inputs). Transposing is a layout choice; no value changes.
  - Alternative: teach the engine's row form z = a W + b, which matches the trace but not most textbooks.
- **D2 — Forward vs reverse mode (Experiment 05, Part E).**
  - Recommended: a conceptual comparison labelled as an illustration. Its one quantitative point is a real engine fact: reverse mode gives every parameter's gradient from one backward pass, which the engine shows by counting.
  - Alternative: a small forward-mode (dual-number) extension to the engine. Not recommended: it adds a second differentiation path to the core for one illustration.
- **D3 — Expression graphs (Experiment 05, Parts A–D; Experiment 04, Part A).**
  - Recommended: evaluate them on the engine's real `Tape` and `backward`, labelled "computed by the engine's autodiff", with no NPM record. NPM stays a record of training runs, and the network graph (Part F, challenge) comes from the trace.
  - Alternative: extend NPM with an "expression" trace kind. Not recommended: it changes the trace format for a teaching convenience.
- **D4 — Datasets and models.** Proposed, each fixed and seeded:
  - Experiment 03: a one-input sigmoid neuron on four examples, full batch, so one step is one update and every value is visible;
  - Experiment 04: a 2-2-1 sigmoid network on XOR (four examples, batch 1, so each backward pass is its own update);
  - the challenge: a 2-3-1 network (tanh, sigmoid) on registry experiment 3's two Gaussian clusters.
- **D5 — Workbench entry.** The Levels page currently sends "Levels 2 and beyond" to the workbench. Proposed: Level 2 gets its own card; the workbench link stays for Level 3+ material and expert inspection.

## 8. Stage plan

| Stage | Content | Gate |
|---|---|---|
| 2 | Generalisation refactor (§3); Experiments 01–02; `LEVEL2_TERMS`; tests | all Level 1 suites unedited and green; Level 2 math tests |
| 3 | Experiment 03 with real single-neuron training | displayed values equal the trace's; updates equal −η·g |
| 4 | Capability gate (§5), then Experiment 04 | the gate's report |
| 5 | `graph.ts` and Experiment 05, Parts A–F | accumulation and gradients against `backward` and finite differences |
| 6 | The challenge, the Level 2 landing page and assessment, the full e2e, accessibility, layout and capability runs, the report | Level 1 regression-free |
