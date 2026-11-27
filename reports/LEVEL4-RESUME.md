# Level 4: resume file

**If this session stops, a new session reads this file and continues from "Next action".** Every completed stage is committed and pushed to `claude/exciting-heisenberg-weq2n6`. Scope: Level 4 only. No Level 5, no Transformers, no global fine-tuning.

## Stages

| # | Stage | Status |
|---|---|---|
| 1 | Audit and capability gate (`reports/LEVEL4-AUDIT.md`) | done |
| 2 | CNN: Exp 01 (filters to feature maps), Exp 02 (CNN training) | done (`reports/LEVEL4-STAGE2.md`); e2e specs pass 7 + 6 |
| 3 | Recurrent engine gate, then Exp 03 (vanilla RNN) | done (`reports/LEVEL4-STAGE3.md`, ADR-102); e2e spec passes 8 of 8 |
| 4 | Exp 04 (BPTT) | done (`reports/LEVEL4-STAGE4.md`); e2e spec passes 6 of 6 |
| 5 | Exp 05 (LSTM and GRU) | done (`reports/LEVEL4-STAGE5.md`); e2e spec delegated: check that `tests/e2e/level4-exp05.spec.ts` exists and passes |
| 6 | Exp 06 (autoencoder) | pending |
| 7 | Level 4 integration | pending |
| 8 | Final regression and `reports/LEVEL4-FINAL-REPORT.md` | pending |

## Next action

**Stage 6: Experiment 06 (autoencoder),** on `barsAutoencode`: n = 24, 4×4 or 6×6 images flattened, a dense encoder to a latent of 2 or 3, then a decoder with sigmoid, MSE loss.
- **A:** the encoder, input → latent.
- **B:** the latent values for all images, plotted when 2-D.
- **C:** the decoder, latent → reconstruction.
- **D:** the reconstruction loss, by hand against the record.
- **E:** training, with the loss curve and reconstructions at several epochs.

Say nothing about semantic meaning unless it is shown.
