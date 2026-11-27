# Level 4: resume file

**If this session stops, a new session reads this file and continues from "Next action".** Every completed stage is committed and pushed to `claude/exciting-heisenberg-weq2n6`. Scope: Level 4 only. No Level 5, no Transformers, no global fine-tuning.

## Stages

| # | Stage | Status |
|---|---|---|
| 1 | Audit and capability gate (`reports/LEVEL4-AUDIT.md`) | done |
| 2 | CNN: Exp 01 (filters to feature maps), Exp 02 (CNN training) | done (`reports/LEVEL4-STAGE2.md`); e2e specs pass 7 + 6 |
| 3 | Recurrent engine gate, then Exp 03 (vanilla RNN) | done (`reports/LEVEL4-STAGE3.md`, ADR-102); e2e spec delegated: check that `tests/e2e/level4-exp03.spec.ts` exists and passes |
| 4 | Exp 04 (BPTT) | pending |
| 5 | Exp 05 (LSTM and GRU) | pending |
| 6 | Exp 06 (autoencoder) | pending |
| 7 | Level 4 integration | pending |
| 8 | Final regression and `reports/LEVEL4-FINAL-REPORT.md` | pending |

## Next action

**Stage 4: Experiment 04 (BPTT).**
- **Part A:** forward unrolling.
- **Part B:** backward step by step: GRAD_INIT, then ∂ℓ/∂hₜ and ∂ℓ/∂zₜ per step (GRAD_ACTIVATE operands and results), and U's per-step GRAD_MATMUL_W.
- **Part C:** U's contributions and their GRAD_SUM.
- **Part D:** full against truncated (rnn `window`) through compareRuns, plus a recorded truncated run with its STOP_GRADIENT.
- **Part E:** gradient size per time step from engine probes with U = s·I, for several s. Report what the record shows; do not claim it always vanishes.
- **Gradient clipping:** not implemented; say so.
