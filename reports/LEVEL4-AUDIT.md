# Level 4 audit and capability gate (2026-11-27)

The code was read at commit `522e883` on `claude/exciting-heisenberg-weq2n6`. The working tree was clean, and Levels 1–3 were complete with 134/134 Chromium e2e passing.

## Reusable as is

| Capability | Where | Level 4 use |
|---|---|---|
| `conv2d`, `maxPool2d`, `avgPool2d` ops (forward, backward, gradcheck, TF.js parity) | `src/core/tensor/ops.ts`, `src/core/autodiff/ops.ts` | Exp 01, 02 |
| Conv/pool/flatten/dense layers; `CONV2D`, `POOL`, `FLATTEN`, `GRAD_CONV2D`, `GRAD_POOL` instruction kinds | `layers/model.ts`, `npm/kinds.ts` | Exp 01, 02 |
| `bars` dataset (n tiny single-channel images of horizontal, vertical and diagonal bars; seeded) | `engine/datasets.ts` | Exp 02 (classification), Exp 06 (autoencoder input) |
| Elementwise ops `add`, `sub`, `mul`, `sigmoid`, `tanh`, `matmul`, `addBias` with gradient rules | `autodiff/ops.ts` | recurrent cells |
| The tape sums the gradients of a Var used more than once | `autodiff/tape.ts` `backward` | shared recurrent weights (BPTT) |
| Extension layers (`registerLayer`): own params, own forward on the tape | `layers/extensions.ts` (registered by nothing yet) | RNN, LSTM, GRU layers |
| Engine probes (a real run with η = 0, values read from the trace) | `src/learn/engine/probe.ts` | Exp 01 (convolution, pooling), cell inspection |
| Trace store, checkpoints, reconstruction, explorer, `compareRuns`, held-out split, SGD/momentum/Adam | `npm/*`, `engine/host.ts` | all |
| Learn shell, `LevelDescriptor`, `ExperimentLayout`, tours, challenges, knowledge checks, `useRun`, `useCompare`, `RunsChart`, `readUpdateSeries` | `src/learn` | all |

## Missing, and the smallest change for each

1. **Selecting a time step.** No op takes `x_t` out of a `[N, T, F]` sequence. A new op, `timeStep` (attr `t`), has the kind `SELECT_STEP` and the backward kind `GRAD_SELECT_STEP`.
2. **Elementwise ops have no NPM mapping.** `add`, `mul` and `sub` are registered ops but emit no instruction. They need mappings to new kinds `ADD` / `GRAD_ADD` and `MULTIPLY` / `GRAD_MULTIPLY`. The GRU's `1 − z` needs a unary op `oneMinus`, with kinds `ONE_MINUS` / `GRAD_ONE_MINUS`. No constant leaf is needed, because the emitter cannot reference constants.
3. **Shared values in the trace.** When one Var feeds several ops (Wₕ at every step, `h_t` into four LSTM gates), the tape sums the gradient contributions. The emitter, however, keeps only the last contribution as that Var's gradient.
   - **The fix is a new kind `GRAD_SUM`** (backward). Its operands are every contribution, and its result is their sum, added in the tape's order so the value is bit-identical. It is emitted only when a value has more than one contribution, so **every existing trace stays byte-identical**.
   - **For a parameter, `GRAD_SUM` is the per-sample shared-weight accumulation,** which the BPTT experiment shows directly.
4. **Time step and gate in the trace.** The tape entry meta gains `step` and `gate`, and the emitter copies them into the instruction meta (`meta.step`, `meta.gate`) of the forward and backward instructions. The nest path (Epoch → Batch → Sample → Phase → Layer) is kept. The time step is queryable metadata within the layer.
5. **Truncated BPTT.** A new op `stopGradient`, with the kind `STOP_GRADIENT`, is the identity forward and gives no gradient backward. The RNN layer applies it to `h_{t−1}` before the truncation window, so the excluded dependencies are visible in the trace.
6. **Recurrent layers.** Extension layers `rnn`, `lstm` and `gru` are built only from the ops above. The initial state is 0: the step-1 terms that multiply `h₀` or `c₀` are omitted, which is mathematically identical, so no constant leaf is needed.
7. **Sequence data.** A seeded synthetic sequence dataset is needed, with a `[T, 1]` input and a binary target.
8. **Autoencoder data.** A dataset whose targets equal its inputs: the `bars` images, flattened.
9. **Shaped probe inputs.** The `points` dataset gains an optional `shape`, so a probe can run a convolution on a `[1, H, W]` input.
10. **Gradient clipping** (decided at Stage 4). Global-norm clipping as an optimiser option, recorded on `GRAD_ACCUMULATE` as weight decay is, if Exp 04 needs it.

**Can recurrence use the existing tensor and autodiff ops?** Yes, for the arithmetic: every cell is matmul, add, addBias, sigmoid, tanh and mul. A time-step selector, `oneMinus` and `stopGradient` are new ops, small and each gradchecked. The real gap is the trace: the elementwise mappings, the shared-value accumulation, and time-step metadata.

## Implementation sequence

1. **Stage 2 (CNN):** shaped probe inputs, then Exp 01 (probes) and Exp 02 (`bars`, a small two-conv CNN, real training). No other engine change.
2. **Stage 3 gate:** items 1–4, 6 and 7, with gradcheck, determinism, TF.js parity of the RNN/LSTM/GRU cells, grammar conformance, reconstruction, and the existing traces unchanged. Then Exp 03.
3. **Stage 4:** `stopGradient` (item 5), clipping if needed (item 10), and Exp 04.
4. **Stage 5:** Exp 05, LSTM and GRU.
5. **Stage 6:** item 8 and Exp 06, the autoencoder.
6. **Stages 7–8:** integration, regression and the final report.
