/**
 * Experiment 04's run state. It holds only what the engine reported (the trace header, the epoch summaries, the
 * cursor and the state reconstructed at it, one epoch of instructions for the hierarchy view), plus which run
 * produced them. Nothing here computes a network value.
 *
 * Separation of concerns (task §10): the architecture and training settings live in the experiment component;
 * `train` turns them into a real engine run; navigation goes through the engine's `advance` and `jump`
 * (src/core/npm/navigator.ts and state.ts), so stepping never materialises more than two segments; the views read
 * from this store.
 */
import { create } from 'zustand';
import type { EpochSummary } from '../../../core/engine/protocol';
import type { TrainConfig } from '../../../core/engine/session';
import type { Instruction, TraceHeader } from '../../../core/npm/ir';
import type { Granularity } from '../../../core/npm/stats';
import type { ExecState } from '../../../core/npm/state';
import type { Tensor } from '../../../core/tensor/tensor';
import type { DatasetSpec } from '../../../core/engine/protocol';
import type { EngineClient } from '../../../ui/engineClient';
import { signal } from '../../signals';
import { createEngine } from './engine';

/** One epoch's instructions are read at a time for the hierarchy; Level 1's networks stay far below this. */
export const EPOCH_READ_LIMIT = 6000;
export const DATASET: DatasetSpec = { kind: 'xor' };

export interface RunSummary {
  run: number;
  label: string;
  config: TrainConfig;
  finalLoss: number;
  finalAccuracy: number | null;
  instructions: number;
}

export interface Pinned {
  cursor: number;
  where: string;
  params: Record<string, Tensor>;
}

export interface RunState {
  status: 'idle' | 'training' | 'ready' | 'error';
  error: string | null;
  run: number;
  config: TrainConfig | null;
  header: TraceHeader | null;
  length: number;
  generationMs: number;
  epochs: EpochSummary[];
  cursor: number;
  exec: ExecState | null;
  operands: Record<string, Tensor>;
  moving: boolean;
  epochView: { epoch: number; instructions: Instruction[] } | null;
  epochViewError: string | null;
  runs: RunSummary[];
  pinned: Pinned | null;
  train(config: TrainConfig, label: string): Promise<void>;
  step(direction: 1 | -1, g: Granularity): Promise<void>;
  jump(id: number): Promise<void>;
  showEpoch(epoch: number): Promise<void>;
  /** Values of one parameter at the start and after every update up to the cursor (the engine's paramHistory). */
  history(name: string): Promise<number[][]>;
  pin(where: string): void;
  unpin(): void;
  dispose(): void;
}

let engine: EngineClient | null = null;
const getEngine = (): EngineClient => (engine ??= createEngine());
let moveSeq = 0;

const initial = {
  status: 'idle' as const,
  error: null,
  run: 0,
  config: null,
  header: null,
  length: 0,
  generationMs: 0,
  epochs: [],
  cursor: -1,
  exec: null,
  operands: {},
  moving: false,
  epochView: null,
  epochViewError: null,
  runs: [],
  pinned: null,
};

export const useRun = create<RunState>((set, get) => {
  const applyMove = async (
    p: Promise<{ cursor: number; state: ExecState; operands: Record<string, Tensor> }>,
  ): Promise<void> => {
    const seq = ++moveSeq;
    set({ moving: true });
    try {
      const m = await p;
      if (seq !== moveSeq) return;
      set({ cursor: m.cursor, exec: m.state, operands: m.operands, moving: false });
      const e = m.state.path?.epoch;
      if (e !== null && e !== undefined && get().epochView?.epoch !== e) void get().showEpoch(e);
    } catch (err) {
      if (seq !== moveSeq) return;
      set({
        moving: false,
        status: 'error',
        error: `Moving through the record failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };
  return {
    ...initial,
    async train(config, label) {
      const run = get().run + 1;
      set({ status: 'training', error: null, run, pinned: null, epochView: null, epochViewError: null });
      try {
        const eng = getEngine();
        const g = await eng.request<'generate'>({ op: 'generate', config, dataset: DATASET });
        const { summaries } = await eng.request<'epochSummaries'>({ op: 'epochSummaries' });
        const m = await eng.request<'move'>({ op: 'jump', cursor: -1 });
        const last = summaries[summaries.length - 1];
        set({
          status: 'ready',
          config,
          header: g.header,
          length: g.length,
          generationMs: g.generationMs,
          epochs: summaries,
          cursor: m.cursor,
          exec: m.state,
          operands: m.operands,
          runs: [
            ...get().runs,
            {
              run,
              label,
              config,
              finalLoss: last?.evalLoss ?? NaN,
              finalAccuracy: last?.evalAccuracy ?? null,
              instructions: g.length,
            },
          ].slice(-6),
        });
        await get().showEpoch(0);
        signal('trained');
        const hidden = config.model.layers.slice(0, -1);
        signal(
          `trained:units-${hidden.length === 1 && hidden[0].type === 'dense' ? hidden[0].units : 'many'}`,
        );
        signal(`trained:lr-${config.optimizer.lr}`);
        signal(`trained:batch-${config.batchSize}`);
      } catch (err) {
        set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    },
    async step(direction, granularity) {
      const s = get();
      if (s.status !== 'ready') return;
      signal('stepped');
      await applyMove(
        getEngine().request<'move'>({
          op: 'advance',
          cursor: s.cursor,
          granularity,
          direction,
          breakpoints: [],
        }),
      );
    },
    async jump(id) {
      if (get().status !== 'ready') return;
      await applyMove(getEngine().request<'move'>({ op: 'jump', cursor: id }));
    },
    async showEpoch(epoch) {
      const h = get().header;
      if (!h) return;
      const from = h.epochStarts[epoch];
      const to = h.epochStarts[epoch + 1];
      if (from === undefined || to === undefined) return;
      if (to - from > EPOCH_READ_LIMIT) {
        set({
          epochView: null,
          epochViewError: `This epoch has ${to - from} instructions, too many to list at once. Use the step buttons instead.`,
        });
        return;
      }
      try {
        const { instructions } = await getEngine().request<'range'>({ op: 'range', from, to });
        set({ epochView: { epoch, instructions }, epochViewError: null });
      } catch (err) {
        set({ epochViewError: err instanceof Error ? err.message : String(err) });
      }
    },
    async history(name) {
      const r = await getEngine().request<'paramHistory'>({
        op: 'paramHistory',
        params: [name],
        cursor: get().cursor,
      });
      return r.points.map((p) => p.values);
    },
    pin(where) {
      const exec = get().exec;
      if (!exec) return;
      set({
        pinned: {
          cursor: get().cursor,
          where,
          params: Object.fromEntries(Object.entries(exec.params).map(([k, v]) => [k, v.value])),
        },
      });
      signal('pinned');
    },
    unpin() {
      set({ pinned: null });
    },
    dispose() {
      engine?.dispose();
      engine = null;
      moveSeq++;
      set({ ...initial });
    },
  };
});
