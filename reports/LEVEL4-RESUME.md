# Level 4: resume file

**If this session stops, a new session reads this file and continues from "Next action".** Every completed stage is committed and pushed to `claude/exciting-heisenberg-weq2n6`. Scope: Level 4 only. No Level 5, no Transformers, no global fine-tuning.

## Stages

| # | Stage | Status |
|---|---|---|
| 1 | Audit and capability gate (`reports/LEVEL4-AUDIT.md`) | done |
| 2 | CNN: Exp 01 (filters to feature maps), Exp 02 (CNN training) | pending |
| 3 | Recurrent engine gate, then Exp 03 (vanilla RNN) | pending |
| 4 | Exp 04 (BPTT) | pending |
| 5 | Exp 05 (LSTM and GRU) | pending |
| 6 | Exp 06 (autoencoder) | pending |
| 7 | Level 4 integration | pending |
| 8 | Final regression and `reports/LEVEL4-FINAL-REPORT.md` | pending |

## Next action

Stage 2. Add an optional `shape` to the `points` dataset spec and to the probe. Then build Level 4 infrastructure (`LEVEL_4` descriptor, routes, landing page, `src/experiments/level4.ts`) and Exp 01.
