/**
 * A recorded run owned by one Level 3 page (ADR-099). The trace store is shared by every page that trains, so a page
 * shows a run only if its configuration is one the page trained (the lesson of ADR-093, defect 6), and reads its
 * header, epoch summaries and read access from the store.
 */
import { useEffect } from 'react';
import type { DatasetSpec } from '../../../core/engine/protocol';
import type { TrainConfig } from '../../../core/engine/session';
import { useRun } from '../../trace/store';

export function useOwnRun(isOurs: (config: TrainConfig) => boolean) {
  const status = useRun((s) => s.status);
  const error = useRun((s) => s.error);
  const header = useRun((s) => s.header);
  const config = useRun((s) => s.config);
  const epochs = useRun((s) => s.epochs);
  const read = useRun((s) => s.read);
  const jump = useRun((s) => s.jump);
  const train = useRun((s) => s.train);
  const dispose = useRun((s) => s.dispose);
  useEffect(() => () => dispose(), [dispose]);
  const ours = config !== null && header !== null && isOurs(config);
  return {
    status,
    error: ours ? error : null,
    header: ours ? header : null,
    config: ours ? config : null,
    epochs: ours ? epochs : [],
    ready: status === 'ready' && ours,
    training: status === 'training',
    read,
    jump,
    train: (c: TrainConfig, label: string, dataset: DatasetSpec) => train(c, label, dataset),
  };
}

export const sameConfig = (a: TrainConfig, b: TrainConfig): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
