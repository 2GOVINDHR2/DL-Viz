# Level 4, Stage 6: Experiment 06, Autoencoders (2026-11-27)

**Status:** implemented and open (`#/level-4/experiment-06`). All six Level 4 experiments are now open.

## Task
- **Data:** `barsAutoencode`, 24 noisy 5×5 bar images flattened to 25 values, with targets equal to the inputs.
- **Network:** 25 → 8 (tanh) → **2** (the latent code, linear) → 8 (tanh) → 25 (sigmoid), MSE loss, Adam η = 0.02, batch 8, 150 epochs. The loss falls from 0.216 to 0.063. The record holds 153 158 instructions.

## Parts
- **A, encoder.** Any image at any epoch: the 25 pixels, the 8 hidden values and the 2-number code.
- **B, latent space.**
  - A scatter plot of all 24 codes at any epoch, with a table. Classes are marked for the learner and stated to be unseen by the network.
  - **The distances are measured, not assumed:** the mean distance between codes of the same class is shown against that between classes. At the last epoch it is 4.77 against 6.56, and the page says "the classes are not clearly grouped".
  - No semantic meaning is claimed.
- **C, decoder.** The code, the 8 hidden values and the 25-pixel reconstruction.
- **D, reconstruction loss.**
  - Input, reconstruction, and their difference (worked out here).
  - The recorded loss, with "the mean of the squared differences, checked here".
  - The largest loss of the 24 images at the last epoch.
- **E, training.**
  - The loss curve, and the chosen image reconstructed at three epochs.
  - Codes of 1, 2, 3 and 4 numbers compared through `compareRuns`. Final losses: 0.080, 0.063, 0.029 and 0.051.
- **Also on the page:** primer, a 4-step tour, 3 challenges, 3 fixed questions, 1 live question (the recorded loss against the mean absolute difference and the sum of squares), and the explorer.

## Claim corrected by the data
- **The first draft of a challenge said** a larger code always gives a lower loss. The comparison shows a code of 4 ending worse than a code of 3.
- **The text now says** a 1-number code loses the most detail, and that a larger code can help but is not guaranteed to. The test asserts only that the 1-number code is worst.

## Tests
- **`tests/unit/level4-exp06.test.ts`, 7 tests.**
  - The run learns.
  - Image 1 is recomputed by hand from the recorded starting parameters through all four layers, and the loss = MSE.
  - The latent-space reader returns the recorded codes and losses.
  - `distances()` is checked on a hand example.
  - The live question is checked.
  - The 1-number code is the worst.
  - The page renders.
- **Vocabulary and explorer probes:** the run is trained, and its explorer is probed at 10 kinds plus the end of the run.
- **All unit tests:** 69 files, 806 of 806.
- **Browser, 1280 and 390 px:** every part works, with no console errors and no overflow.
- **Experiment 05's e2e spec** passes 5 of 5. Experiment 06's is delegated.
