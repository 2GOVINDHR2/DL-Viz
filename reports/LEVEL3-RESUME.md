# Level 3 overnight run: resume file

**If this session stops, a new session reads this file and continues from "Next action".** Every completed stage is committed and pushed to `claude/exciting-heisenberg-weq2n6`.

## Stages

| # | Stage | Status |
|---|---|---|
| 1 | Baseline audit (`reports/LEVEL3-BASELINE.md`) | done |
| 2 | Level 2 Stage 6: forward steps in the challenge | done (`reports/LEVEL2-STAGE6-COMPLETION.md`) |
| 3 | Level 3 plan (`docs/LEVEL-3-ARCHITECTURE.md`) and engine gates (Adam, weight decay, held-out split) | done (ADR-097, ADR-098; `reports/level3-optim-gate.json`) |
| 4 | Level 3 Experiment 01: learning rate | done (`reports/LEVEL3-EXP01.md`); its e2e spec `tests/e2e/level3-exp01.spec.ts` passes 6 of 6 |
| 5 | Level 3 Experiment 02: momentum | done (`reports/LEVEL3-EXP02.md`); e2e spec `tests/e2e/level3-exp02.spec.ts` passes 6 of 6 |
| 6 | Level 3 Experiment 03: Adam | done (`reports/LEVEL3-EXP03.md`); e2e spec delegated: check that `tests/e2e/level3-exp03.spec.ts` exists and passes |
| 7 | Level 3 Experiment 04: overfitting and regularisation | pending |
| 8 | Level 3 integration, full regression, final report | pending |

## Next action

Stage 7: Experiment 04, overfitting and regularisation (`src/learn/level3/Experiment04.tsx`).
- Part A: a recorded run with λ = 0; its training and held-out curves from the epoch summaries (`evalLoss`, `testLoss`); a marker at the lowest held-out loss; decision maps.
- Part B: λ ∈ {0, 0.003, 0.01, 0.03} through `compareRuns`, using `testLosses`.
- Part C: a recorded run with λ = 0.01, showing a weight's ḡ, λ·w, ḡ + λ·w and the Adam step.
