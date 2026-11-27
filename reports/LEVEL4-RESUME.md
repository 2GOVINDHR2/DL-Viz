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
| 6 | Exp 06 (autoencoder) | done (`reports/LEVEL4-STAGE6.md`); e2e spec passes 7 of 7 |
| 7 | Level 4 integration | done: a11y, layout IV, capability inventory, screenshots, ADR-103; e2e mutation audit (157 of 250 live by mechanical mutants; 52 of 52 targeted mutants killed) |
| 8 | Final regression and `reports/LEVEL4-FINAL-REPORT.md` | done: clean build; unit 806/806, gradcheck 54/54, parity 8/8, determinism 18/18, e2e 175/175 |

## Next action

**None. Level 4 is complete** (`reports/LEVEL4-FINAL-REPORT.md`). Do not begin Level 5, Transformers or global fine-tuning without a new instruction from the user.
