# Level 4, Stage 2: CNN experiments (2026-11-27)

**Status:** Experiments 01 and 02 are implemented and open (`#/level-4/experiment-01`, `-02`), and the Level 4 shell is in place (ADR-100, ADR-101).

## Experiment 01: from filters to feature maps (engine probes)
- **Part A, inspect a convolution.** A 5×5 image and a hand-chosen vertical-edge kernel. Step through the 9 positions, or click a feature-map cell. Each position shows the patch (outlined), the kernel, the products and their sum (worked out here), and the engine's output value with "✓ equals the sum". The engine's `CONV2D` record is in a disclosure.
- **Part B, stride and padding.** Stride ∈ {1, 2} and padding ∈ {0, 1} on a 6×6 input. The engine's feature map is shown beside the size formula: 4, 6, 2 and 3 along a side.
- **Part C, pooling.** Max or average pooling, 2×2, on a 4×4 map. Choosing an output cell outlines its block, marks the values that decided it (the maximum, or all four), and checks the engine's value.
- **Part D, feature extraction.** Vertical-edge and horizontal-edge kernels (chosen by hand) on vertical, horizontal, corner and uniform patterns. Strongest responses: 3/0, 0/3, both > 0, and 0/0. The kernels' weights add to 0, which the page states.
- **Also on the page:** primer, a 4-step tour, 3 challenges, 3 fixed questions, and 1 live question (the feature map's size for the learner's Part B settings).

## Experiment 02: CNN training
- **The network:** conv(4, 3×3, pad 1, ReLU) → max pool → conv(4, 3×3, pad 1, ReLU) → max pool → flatten → dense(3, softmax), with cross-entropy loss and SGD η = 0.1, batch 6, 30 epochs (180 updates).
- **The task:** 36 bar images, 8×8, of three classes. The loss falls from 0.961 to 0.044, and 100 % are correct after training. The record holds 46 026 instructions and takes about 0.3 s to generate.
- **Part A:** train and record; the loss curve with a table, and the accuracy.
- **Part B:** any image at any epoch. It shows the input, the four feature maps after ReLU, the pooled maps, the second layer's maps, the pooled 2×2 maps, logits and probabilities, the prediction, and the loss with "−ln p, checked here".
- **Part C:** the first layer's 4 kernels at the start and after the chosen epoch.
- **Part D:** every update of any first-layer kernel weight, with "Δ = −η·ḡ, checked here" and before → after.
- **Also on the page:** primer, a 4-step tour, 3 challenges, 3 fixed questions, 1 live question (the predicted class), and the trace explorer with Level 4 wording.

## Defects found and fixed
- **Experiment 01's "strongest response" challenge could never complete.** The maximum (3) occurs twice, the first time at position 1, so a check against `indexOf` with `k > 0` never fired. It now fires on any position, after a move, that holds the maximum. The unit test checks that such a position exists.
- **The explorer on a CNN** showed "→ ?" in its network summary, 64-value example labels, and a wrong description of kernel tensors. Fixed (ADR-101); dense networks are unchanged.
- **The explorer named CNN steps by their raw kind,** for example "conv2d". Level 4 wording was added.
- **A CSS class collision** (`lv-matrix`) was caught and renamed before any commit.

## Tests
- **`tests/unit/level4-exp01.test.ts`, 13 tests.**
  - Every probe is compared with an independent hand cross-correlation (all 4 stride/padding cases) and hand pooling (max, average).
  - The size formula is checked against the engine's shapes.
  - The edge kernels' responses, the live question and the page rendering are checked.
- **`tests/unit/level4-exp02.test.ts`, 8 tests.**
  - The run learns.
  - Image 1 of epoch 1 is recomputed by hand from the recorded starting parameters, at every layer (convolution with padding, ReLU, pool, conv, pool, flatten, dense, softmax, cross-entropy), to 1e-12.
  - The kernels at an epoch are read correctly.
  - Every update of 4 kernel weights satisfies Δ = −η·ḡ, after = before + Δ, and chains.
  - The batch gradient equals the mean of the six recorded `GRAD_CONV2D`.
  - The live question is checked, and a second run is identical.
- **`tests/unit/level4-vocabulary.test.ts`, 11 tests.**
  - The term schedule is checked, and it is not vacuous.
  - Experiment 02 is trained, and its page with the explorer is rendered at a `CONV2D`, `POOL`, `FLATTEN`, `COMPUTE_LOSS`, `GRAD_CONV2D`, `GRAD_POOL`, `GRAD_ACCUMULATE`, `COMPUTE_UPDATE` and `APPLY_UPDATE`, and at the end of the run. At each point the explorer must name the step with Level 4's words, and must not show "→ ?".
  - Replacing the wording made the test fail at the first `CONV2D`, so it is not vacuous.
- **All unit tests:** 64 files, 753 of 753 pass (Levels 1–3 included, after the shared explorer change).
- **Browser check, 1280 and 390 px:** all four parts of both pages work, with no console errors and no horizontal overflow.
- **e2e:** `tests/e2e/level4-exp01.spec.ts` and `level4-exp02.spec.ts`, delegated to a Sonnet agent.
