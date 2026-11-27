# Level 4: resume file

**If this session stops, a new session reads this file and continues from "Next action".** Every completed stage is committed and pushed to `claude/exciting-heisenberg-weq2n6`. Scope: Level 4 only. No Level 5, no Transformers, no global fine-tuning.

## Stages

| # | Stage | Status |
|---|---|---|
| 1 | Audit and capability gate (`reports/LEVEL4-AUDIT.md`) | done |
| 2 | CNN: Exp 01 (filters to feature maps), Exp 02 (CNN training) | done (`reports/LEVEL4-STAGE2.md`); e2e specs pass 7 + 6 |
| 3 | Recurrent engine gate, then Exp 03 (vanilla RNN) | done (`reports/LEVEL4-STAGE3.md`, ADR-102); e2e spec passes 8 of 8 |
| 4 | Exp 04 (BPTT) | done (`reports/LEVEL4-STAGE4.md`); e2e spec passes 6 of 6 |
| 5 | Exp 05 (LSTM and GRU) | done (`reports/LEVEL4-STAGE5.md`); e2e spec passes 5 of 5 |
| 6 | Exp 06 (autoencoder) | done (`reports/LEVEL4-STAGE6.md`); e2e spec delegated: check that `tests/e2e/level4-exp06.spec.ts` exists and passes |
| 7 | Level 4 integration | pending |
| 8 | Final regression and `reports/LEVEL4-FINAL-REPORT.md` | pending |

## Next action

**Stage 7: Level 4 integration.**
1. Add Level 4 pages to `a11y.spec.ts` (both themes, opened and trained), with a new test.
2. Add them to `layout.spec.ts` as test IV (1440–320 px, opened and trained); add a `trainLevel4` helper to `tests/e2e/helpers.ts`.
3. Run the capability inventory with `CAPTURE=append`, and record the "Beyond Level 3" card (now "The full workbench") in `reports/capability-removed.json`.
4. Take screenshots to `docs/screenshots/level4`.
5. Run the mutation audit of the Level 4 e2e specs.

**Then Stage 8:** the full regression from a clean build, and `reports/LEVEL4-FINAL-REPORT.md`.
