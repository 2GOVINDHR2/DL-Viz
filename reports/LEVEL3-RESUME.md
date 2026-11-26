# Level 3 overnight run: resume file

**If this session stops, a new session reads this file and continues from "Next action".** Every completed stage is committed and pushed to `claude/exciting-heisenberg-weq2n6`.

## Stages

| # | Stage | Status |
|---|---|---|
| 1 | Baseline audit (`reports/LEVEL3-BASELINE.md`) | done |
| 2 | Level 2 Stage 6: forward steps in the challenge | done (`reports/LEVEL2-STAGE6-COMPLETION.md`) |
| 3 | Level 3 plan (`docs/LEVEL-3-ARCHITECTURE.md`) and engine gates (Adam, weight decay, held-out split) | pending |
| 4 | Level 3 Experiment 01: learning rate | pending |
| 5 | Level 3 Experiment 02: momentum | pending |
| 6 | Level 3 Experiment 03: Adam | pending |
| 7 | Level 3 Experiment 04: overfitting and regularisation | pending |
| 8 | Level 3 integration, full regression, final report | pending |

## Next action

Stage 3: write `docs/LEVEL-3-ARCHITECTURE.md` (plan and ADR-097), then the engine gates: Adam in `src/core/optim/optim.ts` and the emitter; L2 weight decay with SGD; a held-out split for synthetic datasets. Each with an independent test first.
