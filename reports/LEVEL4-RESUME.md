# Level 4: resume file

**If this session stops, a new session reads this file and continues from "Next action".** Every completed stage is committed and pushed to `claude/exciting-heisenberg-weq2n6`. Scope: Level 4 only. No Level 5, no Transformers, no global fine-tuning.

## Stages

| # | Stage | Status |
|---|---|---|
| 1 | Audit and capability gate (`reports/LEVEL4-AUDIT.md`) | done |
| 2 | CNN: Exp 01 (filters to feature maps), Exp 02 (CNN training) | done (`reports/LEVEL4-STAGE2.md`); e2e specs delegated: check that `tests/e2e/level4-exp01.spec.ts` and `-exp02` exist and pass |
| 3 | Recurrent engine gate, then Exp 03 (vanilla RNN) | pending |
| 4 | Exp 04 (BPTT) | pending |
| 5 | Exp 05 (LSTM and GRU) | pending |
| 6 | Exp 06 (autoencoder) | pending |
| 7 | Level 4 integration | pending |
| 8 | Final regression and `reports/LEVEL4-FINAL-REPORT.md` | pending |

## Next action

**Stage 3: the recurrent engine gate.** Follow `reports/LEVEL4-AUDIT.md` items 1–4, 6 and 7.

1. **New ops:** `timeStep` (attr t) and `oneMinus`, with mappings to new kinds `SELECT_STEP`, `GRAD_SELECT_STEP`, `ONE_MINUS` and `GRAD_ONE_MINUS`.
2. **Elementwise mappings:** `ADD`, `GRAD_ADD`, `MULTIPLY` and `GRAD_MULTIPLY`.
3. **`GRAD_SUM` in the emitter,** for any value with more than one gradient contribution.
4. **`EntryMeta.step` and `EntryMeta.gate`,** copied to the instruction meta.
5. **Extension layers** `rnn`, `lstm` and `gru`, plus a sequence dataset.
6. **The gate tests:**
   - gradcheck for the new ops and layers;
   - TF.js parity of the cells;
   - `GRAD_SUM` equals the tape's total gradient;
   - grammar conformance and reconstruction;
   - determinism;
   - existing traces unchanged (`reports/trace-hash.json`).

Then build Exp 03.
