# Level 3, Experiment 01: Learning Rate and Training Dynamics (2026-11-26)

**Status:** implemented and open (`#/level-3/experiment-01`).

## Features

- **Part A, the same network with different learning rates.**
  - The shared task (two circles, 60 points, a 2-6-1 tanh network, full batch, 60 epochs) is trained by the engine at η ∈ {0.05, 0.5, 2, 8, 30}, from the same starting weights. These runs use `compareRuns`, so no record is kept.
  - A log-scale loss chart shows the runs, with a table alternative.
  - Per run, the page shows the loss after epoch 1 and epoch 60, the epochs where the loss rose, and a verdict read from the curve: barely moved, learned slowly, learned, unstable, got worse.
- **Part B, inside one run.**
  - One recorded run at a chosen η. Any of the 25 parameter values can be followed through all 60 updates: the batch loss and the value per update (charts), plus an update inspector.
  - The inspector shows loss before and after, ḡ, η, the recorded Δ with "checked here: −η·ḡ", and before → after. It marks an overshooting step.
  - A link opens the step in the shared trace explorer.
- **The rest of the page:** primer (4 terms), tour (4 steps), 3 challenges, 3 fixed questions, and 1 live question (the recorded step).

## Shared Level 3 infrastructure built with it

- `src/experiments/level3.ts`: the level's data, both tasks, all four experiments' definitions, `LEVEL3_TERMS`.
- Curriculum, router, shell, breadcrumbs, the main navigation, the Level 3 landing page, and a Level 3 card on the levels page.
- `src/learn/level3/common`:
  - `readUpdateSeries` and `parameterChoices`;
  - `useCompare` and `rises`;
  - `RunsChart`;
  - `RecordedRun`;
  - `useOwnRun`, which shows only a run of the page's own configuration;
  - `level3Wording`, which names each optimiser term only from the experiment that teaches it.

## Defects found while building, and fixed

- **`useCompare` dropped its results in React's development mode.** The mount, unmount and mount sequence cleared its "mounted" flag and nothing set it again. It now sets the flag on every mount.
- **Challenge signals were raised during rendering** (a React warning). They now fire from an effect.
- **The value chart assumed values ≥ 0,** so a bias that went to −7.9 ran off the chart. A linear axis now spans the data.

## Tests

`tests/unit/level3-exp01.test.ts` (8 tests) and `tests/unit/level3-vocabulary.test.ts` (5 tests): **13 of 13 pass.**
- **The reader, over all 60 updates of 5 parameter values:** "before" is exactly what each `APPLY_UPDATE` read, Δ = −η·ḡ exactly, and after = before + Δ.
- **The first loss** equals the starting network's loss on all 60 points, by hand, to 10⁻¹².
- **`compareRuns`** gives exactly the recorded run's losses.
- **The five verdicts** read from real curves are as expected.
- **The live question's answer** is the recorded step.
- **Vocabulary:** no term taught later appears on the page.
- **e2e:** `tests/e2e/level3-exp01.spec.ts` is being written by a delegated agent.

## Files

- `src/experiments/level3.ts`
- `src/learn/level3/{Experiment01.tsx, common/*}`
- `src/learn/pages/{Level3Landing.tsx, Levels.tsx}`
- `src/learn/{router.ts, curriculum.ts, Shell.tsx, LearnApp.tsx}`
- `tests/unit/level3-{exp01,vocabulary}.test.ts`
