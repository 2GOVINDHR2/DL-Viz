# Level 3 baseline audit (2026-11-26)

Read from the code at commit `0b65b12` on `claude/exciting-heisenberg-weq2n6`. The working tree was clean.

## Level 2

| Item | State |
|---|---|
| Experiments 01–05 | implemented, routed and open (`LEVEL_2.open` = 01–05; nothing in preparation) |
| Stage 6 final challenge (Experiment 05, Part G) | implemented and committed (`6c46dbd` gate, `0b65b12` page and review): configure a 2-h-1 MLP, train it in the worker, see before/after, and take one update apart (prediction, loss, backward, gradients, update), linked to the shared trace explorer |
| Gap against the overnight brief | the brief lists **forward propagation** separately. Part G's first stage shows x → ŷ only, not the recorded forward steps. To be completed first. |
| Level 2 assessment page | planned in Stage 1, not built; outside this brief |
| Last full results | 675 unit, 109 Chromium e2e, 115 a11y screens with 0 violations, 0 layout violations, 199 Level 2 e2e assertions with 0 hollow |

## Engine, read from `src/core`

| Capability | Where | Status |
|---|---|---|
| SGD | `optim/optim.ts` | yes |
| Momentum | `optim/optim.ts`; accumulator form v ← μv + ḡ, Δ = −ηv | yes; recorded as `OPTIMIZER_STATE {velocity}` with the previous velocity as an operand |
| Adam | — | **no** |
| Weight decay / L2 regularisation | — | **no** |
| Learning-rate schedule | — | **no**: the optimizer has one constant `lr` |
| Train / held-out evaluation | `engine/session.ts` `evaluate()`; `data.test` | the held-out split exists only for the `asset` dataset (MNIST). `EVAL_END` records `testLoss` and `testAccuracy` when a test split exists. The synthetic datasets (`gaussians`, `xorClusters`, `points` …) have no test split. |
| Trace format | `npm/ir.ts`, `npm/grammar.ts` | the update grammar is `GRAD_ACCUMULATE OPTIMIZER_STATE? COMPUTE_UPDATE APPLY_UPDATE`. Result slots are not validated against a fixed list, so adding optional slots does not break validation. |
| Independent oracle | `tests/parity` with `@tensorflow/tfjs` installed | parity covers SGD and momentum; it can be extended to Adam |
| Learning interface | `src/learn` | the curriculum's `LevelDescriptor.number` is `1 \| 2`; the router knows Levels 1 and 2. The levels page shows a "Levels 3 and beyond" card that points to the workbench. |

## Consequences for Level 3

1. **Experiment 01 (learning rate)** needs no engine change: real runs at several η with SGD. A schedule is not supported cleanly, so it is left out.
2. **Experiment 02 (momentum)** needs no engine change: `OPTIMIZER_STATE` records the velocity.
3. **Experiment 03 (Adam)** needs an engine extension. Adam goes in `optim.ts` and is recorded in the existing `OPTIMIZER_STATE` kind with new result slots (m, v, m̂, v̂). It is checked against hand calculations and TF.js `tf.train.adam` over several updates.
4. **Experiment 04 (overfitting and regularisation)** needs two small extensions:
   - a held-out split for the synthetic datasets, using the existing `data.test` path;
   - L2 weight decay with SGD, recorded on `COMPUTE_UPDATE` as an extra result (λw) and an operand (the parameter).
