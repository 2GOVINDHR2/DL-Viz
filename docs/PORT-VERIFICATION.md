# Port verification (Phase 0)

The new repository was created by copying `2GOVINDHR2/viz` at commit `a894d57`. Everything was copied except `node_modules`, `.git` and build or test output. That includes `src/ui/` and `src/views/`, for the reason given in ADR-080. The copy is commit `5f7ea6c` ("Port DL-VizLab verbatim"). Every later change is a diff against it.

## Commands and results (2026-11-12, this container, Node 22.23.4, Chromium from `/opt/pw-browsers`)

| Command | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 warnings) |
| `npm run test:unit` | 43 files, 532 tests, all pass |
| `npm run test:gradcheck` | 48 tests pass; worst relative deviation 1.18 × 10⁻⁶ (tolerance 10⁻⁵), `reports/gradcheck.json` rewritten byte-identical |
| `npm run test:parity` | 8 architectures pass; worst parameter deviation 1.25 × 10⁻⁶, `reports/parity.json` byte-identical |
| `npm run test:determinism` | 18 tests pass; `reports/trace-hash.json` byte-identical |
| `npm run measure` | exit 0; see below |
| `scripts/measure-reconstruction.ts` | 12 configurations, 10,008 positions, 16,440,773 values, all bit-identical; memory reduction ÷29.9 to ÷96.3 |
| `npx playwright test --project=chromium` (all 17 specs) | 63 of 64 passed. The one failure was `capabilities.spec.ts`, which writes to `.tmp/`. That directory is git-ignored, so it was never copied. The spec now creates it, and it passes (64 of 64). |

**Not included in the original `test:unit` count.** `tests/unit/study.test.ts` needs the Python analysis requirements (`pip install -r analysis/requirements.txt`). With them installed it passes. Without them, one test fails on `import matplotlib`. CI installs them.

## The context report's §6 figures

**Deterministic figures.** These are reproduced exactly. The suites and scripts that produce them rewrote their committed outputs with no difference:

- single-neuron run: 3,422 instructions;
- CNN, two epochs: 3,708 instructions, 27,416,808 bytes (27.42 MB), trace hash `ce0390f4810d756c`;
- gradient check: 35 operation cases and 9 whole-model cases, worst 1.18 × 10⁻⁶;
- parity: 8 architectures, within 1.25 × 10⁻⁶;
- reconstruction: 12 configurations, 10,008 positions, 16,440,773 values, bit-identical, ÷29.9 to ÷96.3.

**Timing and memory figures.** These depend on the machine. Re-measured here:

| Figure | Committed (paper) | This container |
|---|---|---|
| Stepping frame rate | 59.9–60.3 fps | 60.1–60.2 fps |
| CNN auto-run, layer granularity | 57.2 fps | 60.2 fps |
| CNN trace generation in the worker | 6.0 s | 4.4 s |
| Peak renderer resident memory | 519–543 MB | 558 MB |

The committed `reports/` files are the paper's measurements, and they were left as they were. A re-measurement on different hardware is not a correction. The re-measured peak memory is again over the ~500 MB budget, which agrees with the context report: the budget is missed and the cause is the allocator's high-water mark.

## Small changes made during the port (both test-infrastructure only)

- `tests/e2e/capabilities.spec.ts`: creates `.tmp/` before writing to it.
- `playwright.config.ts`: also looks for Chromium at `/opt/pw-browsers/chromium`, the path in this container.

Neither changes an assertion.
