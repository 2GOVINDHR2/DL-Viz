/**
 * Side-by-side training runs for Level 3 (ADR-099): several configurations trained by the engine in the worker
 * (`compareRuns`), each from the same starting weights. These runs keep no record; their losses are the engine's
 * evaluation after every epoch. Screens label them "trained by the engine · no record kept" and use a recorded run
 * (the shared trace store) wherever an update is looked inside.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComparedRun, DatasetSpec } from '../../../core/engine/protocol';
import type { TrainConfig } from '../../../core/engine/session';
import { createEngine } from '../../trace/engine';

export interface Compared {
  label: string;
  run: ComparedRun;
}

export function useCompare(): {
  runs: Compared[] | null;
  busy: boolean;
  error: string | null;
  compare: (
    items: { label: string; config: TrainConfig }[],
    dataset: DatasetSpec,
  ) => Promise<Compared[] | null>;
} {
  const [runs, setRuns] = useState<Compared[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(true);
  // Set on every mount: React's development mode mounts, unmounts and mounts again.
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const compare = useCallback(
    async (
      items: { label: string; config: TrainConfig }[],
      dataset: DatasetSpec,
    ): Promise<Compared[] | null> => {
      setBusy(true);
      setError(null);
      const eng = createEngine();
      try {
        const r = await eng.request<'compareRuns'>({
          op: 'compareRuns',
          configs: items.map((i) => i.config),
          dataset,
        });
        const out = r.runs.map((run, k) => ({ label: items[k].label, run }));
        if (live.current) setRuns(out);
        return out;
      } catch (e) {
        if (live.current) setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        eng.dispose();
        if (live.current) setBusy(false);
      }
    },
    [],
  );
  return { runs, busy, error, compare };
}

/** How many epochs ended with a higher loss than the epoch before (a sign of overshooting), from the run's losses. */
export const rises = (losses: number[]): number =>
  losses.slice(1).filter((v, i) => v > losses[i] + 1e-12).length;
