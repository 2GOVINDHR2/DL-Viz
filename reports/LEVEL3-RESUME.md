# Level 3 overnight run: resume file

**If this session stops, a new session reads this file and continues from "Next action".** Every completed stage is committed and pushed to `claude/exciting-heisenberg-weq2n6`.

## Stages

| # | Stage | Status |
|---|---|---|
| 1 | Baseline audit (`reports/LEVEL3-BASELINE.md`) | done |
| 2 | Level 2 Stage 6: forward steps in the challenge | done (`reports/LEVEL2-STAGE6-COMPLETION.md`) |
| 3 | Level 3 plan (`docs/LEVEL-3-ARCHITECTURE.md`) and engine gates (Adam, weight decay, held-out split) | done (ADR-097, ADR-098; `reports/level3-optim-gate.json`) |
| 4 | Level 3 Experiment 01: learning rate | done (`reports/LEVEL3-EXP01.md`); its e2e spec was delegated: check that `tests/e2e/level3-exp01.spec.ts` exists and passes |
| 5 | Level 3 Experiment 02: momentum | pending |
| 6 | Level 3 Experiment 03: Adam | pending |
| 7 | Level 3 Experiment 04: overfitting and regularisation | pending |
| 8 | Level 3 integration, full regression, final report | pending |

## Next action

Stage 5: Experiment 02, momentum (`src/learn/level3/Experiment02.tsx`).
- Part A: SGD against momentum at η = 0.5 (μ = 0, 0.5, 0.9) with `useCompare`.
- Part B: a recorded momentum run through `RecordedRun`, showing ḡ, the previous v, v, Δ and the plain step −η·ḡ.
- Then add it to `L3_EXPERIMENTS` in `LearnApp`, `LEVEL_3.open` and the vocabulary test's `PAGES`.
