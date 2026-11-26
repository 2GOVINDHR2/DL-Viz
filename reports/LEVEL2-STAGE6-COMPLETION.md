# Level 2, Stage 6: completion report (2026-11-26)

**Status: complete.** The final challenge sits inside Experiment 05 (Part G). It has been checked against every item in the overnight brief:

| Brief item | Where in Part G | Source |
|---|---|---|
| Configure a small MLP | 2-h-1: h ∈ {2, 3, 4}, tanh/sigmoid/ReLU hidden, η ∈ {0.05, 0.5, 2}, batch ∈ {1, 8, 40} | `challengeConfig`; all 81 configurations trained in the Stage 6 gate |
| Execute actual training | the worker, through the shared trace store | `useRun.train` → `TraceStore.generate` |
| Prediction | stage 1 | the example's last `ACTIVATE` |
| Forward propagation | stage 1, the six recorded forward steps (**added tonight**, ADR-096) | `MATMUL`, `ADD_BIAS`, `ACTIVATE` per layer |
| Loss | stage 2, and the batch mean | `COMPUTE_LOSS`, `LOSS_REDUCE` |
| Backpropagation | stage 3, the 8 backward steps | `GRAD_*` |
| Gradients | stage 4: this example's gradient and the batch mean ḡ, with "checked here" | `GRAD_MATMUL_W`, `GRAD_BIAS`, `GRAD_ACCUMULATE` |
| Parameter updates | stage 5: before, Δ = −η·ḡ, after, with "checked here" | `APPLY_UPDATE` operand, `COMPUTE_UPDATE`, `APPLY_UPDATE` |
| The actual NPM trace | each stage links to its instruction in the shared explorer, which is embedded below | `TraceExplorer` |

## Tests (this change)

- **Unit:** the Stage 6 gate now also checks the six forward steps and the hand weighted sum. **55 files, 675 of 675 pass.**
- **e2e:** a new challenge test (6 forward steps; the last equals ŷ). **Level 1 and Level 2 specs plus `a11y` and `layout`: 53 of 53 pass**; `capabilities` and `level2-challenge`: 10 of 10 pass.
- **Mutation:** the new test's 4 assertions are 3 live by mechanical mutants and 1 by a targeted mutant. Level 2 e2e assertions total 203, 0 hollow.

## Files

- `src/learn/level2/exp05/{challenge.ts, Challenge.tsx}`
- `tests/unit/level2-challenge-gate.test.ts`
- `tests/e2e/level2-challenge.spec.ts`
- `reports/capability-removed.json` (the rename, ADR-096)
- `scripts/mutation/targeted.json`
- `reports/mutation-*.json`
- `docs/DECISIONS.md`
