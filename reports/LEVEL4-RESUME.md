# Level 4: resume file

**If this session stops, a new session reads this file and continues from "Next action".** Every completed stage is committed and pushed to `claude/exciting-heisenberg-weq2n6`. Scope: Level 4 only. No Level 5, no Transformers, no global fine-tuning.

## Stages

| # | Stage | Status |
|---|---|---|
| 1 | Audit and capability gate (`reports/LEVEL4-AUDIT.md`) | done |
| 2 | CNN: Exp 01 (filters to feature maps), Exp 02 (CNN training) | done (`reports/LEVEL4-STAGE2.md`); e2e specs pass 7 + 6 |
| 3 | Recurrent engine gate, then Exp 03 (vanilla RNN) | done (`reports/LEVEL4-STAGE3.md`, ADR-102); e2e spec passes 8 of 8 |
| 4 | Exp 04 (BPTT) | done (`reports/LEVEL4-STAGE4.md`); e2e spec delegated: check that `tests/e2e/level4-exp04.spec.ts` exists and passes |
| 5 | Exp 05 (LSTM and GRU) | pending |
| 6 | Exp 06 (autoencoder) | pending |
| 7 | Level 4 integration | pending |
| 8 | Final regression and `reports/LEVEL4-FINAL-REPORT.md` | pending |

## Next action

**Stage 5: Experiment 05 (LSTM and GRU).**
- **Recorded runs:** a recorded LSTM run and a recorded GRU run on the `first` task (hidden 3, T = 6, n = 16, 40 epochs; about 200k instructions each). Only one record exists at a time (`useOwnRun`), so Parts A–B use LSTM and Part C retrains as GRU.
- **Part A:** the LSTM cell at one time step: f, i, g, c, o and h from the record (`meta.gate`), with checks.
- **Part B:** gate inspection, showing how f and i shape c, and o shapes h.
- **Part C:** the GRU cell: z, r, n and h, with "no separate cell state".
- **Part D:** compareRuns of RNN, LSTM and GRU on `first` with T = 10. Parameter counts come from the model, together with losses and the gates' activation ranges.
