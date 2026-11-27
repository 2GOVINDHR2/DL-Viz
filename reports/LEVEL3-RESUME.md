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
| 6 | Level 3 Experiment 03: Adam | done (`reports/LEVEL3-EXP03.md`); e2e spec `tests/e2e/level3-exp03.spec.ts` passes 5 of 5 |
| 7 | Level 3 Experiment 04: overfitting and regularisation | done (`reports/LEVEL3-EXP04.md`, ADR-099); e2e spec delegated: check that `tests/e2e/level3-exp04.spec.ts` exists and passes |
| 8 | Level 3 integration, full regression, final report | pending |

## Next action

Stage 8: integration and validation.
1. Capability inventory: append the Level 3 capabilities. Record the replaced "Levels 3 and beyond" Levels-page entry in `reports/capability-removed.json`. Check the e2e specs that expect the old Levels card.
2. Add `/#/level-3` and the four experiments, trained, to `a11y.spec.ts` (both themes) and `layout.spec.ts` (down to 320 px).
3. Mutation audit of the Level 3 e2e specs.
4. Full regression from clean: typecheck, lint, format, unit, gradcheck/parity/determinism, build, full Chromium e2e, `npm run report`.
5. Screenshots, desktop and mobile, to `docs/screenshots/level3`.
6. `reports/LEVEL3-FINAL-REPORT.md`.
