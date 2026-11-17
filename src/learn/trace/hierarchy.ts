/**
 * The execution hierarchy of one epoch, built from its recorded instructions with the NPM's own unit keys
 * (src/core/npm/stats.ts `unitKey`): batch → example → stage (phase) → layer → operation. Grouping is by consecutive
 * equal keys, exactly as the navigator steps, so selecting a node and stepping by its granularity land in the same
 * place. Labels are plain language. Every number in a label is read from an instruction.
 */
import type { Instruction, TraceHeader } from '../../core/npm/ir';
import { type Granularity, unitKey } from '../../core/npm/stats';
import { fmt } from '../format';
import { LEVEL1_WORDING, type TraceWording } from './wording';

export interface TreeNode {
  key: string;
  granularity: Granularity;
  label: string;
  /** Short tag shown beside the label (the stage name). */
  tag?: string;
  first: number;
  last: number;
  children: TreeNode[];
}

/** How deep the explorer shows the hierarchy: the beginner view stops at stages. */
export type Detail = 'stages' | 'layers' | 'operations';

const LEVELS: Granularity[] = ['batch', 'sample', 'phase', 'layer', 'operation'];
const DEPTH: Record<Detail, number> = { stages: 3, layers: 4, operations: 5 };

/** Level 1's phase words; the explorer passes its level's own (src/learn/trace/wording.ts). */
export const PHASE_WORDS: Record<string, { tag: string; label: string }> = LEVEL1_WORDING.phases;

export function layerWords(header: TraceHeader | null, layer: string | null): string {
  if (!layer) return 'Whole network';
  if (layer === 'loss') return 'Loss';
  const names = header?.model.layers.map((l) => l.name) ?? [];
  const k = names.indexOf(layer);
  if (k < 0) return layer;
  return k === names.length - 1 ? `Output layer (${layer})` : `Hidden layer ${k + 1} (${layer})`;
}

function group(ins: Instruction[], g: Granularity): Instruction[][] {
  const out: Instruction[][] = [];
  let key: string | null = null;
  for (const i of ins) {
    const k = unitKey(i, g);
    if (k !== key) {
      out.push([]);
      key = k;
    }
    out[out.length - 1].push(i);
  }
  return out;
}

function label(
  header: TraceHeader | null,
  g: Granularity,
  ins: Instruction[],
  batchesPerEpoch: number,
  words: TraceWording,
): Pick<TreeNode, 'label' | 'tag'> {
  const head = ins[0];
  const p = head.path;
  switch (g) {
    case 'batch': {
      if (p.batch === null) {
        if (ins.some((i) => i.kind === 'EVAL_END'))
          return { label: 'End of epoch: test every example', tag: 'check' };
        return { label: 'Start of epoch: choose the order of the examples', tag: 'control' };
      }
      const begin = ins.find((i) => i.kind === 'BATCH_BEGIN');
      const idx = begin
        ? Array.from(begin.results.indices.data)
            .map((v) => `#${v + 1}`)
            .join(', ')
        : '';
      return {
        label: words.batchLabel
          ? words.batchLabel(p.batch, batchesPerEpoch, idx)
          : `Batch ${p.batch + 1} of ${batchesPerEpoch}${idx ? ` · examples ${idx}` : ''}`,
      };
    }
    case 'sample': {
      if (p.sample === null) {
        if (ins.some((i) => i.kind === 'APPLY_UPDATE')) return { label: words.updateGroup, tag: 'update' };
        if (ins.some((i) => i.kind === 'BATCH_BEGIN')) return { label: 'Batch begins', tag: 'control' };
        return { label: words.phases[p.phase]?.label ?? p.phase, tag: words.phases[p.phase]?.tag };
      }
      const load = ins.find((i) => i.kind === 'LOAD_INPUT');
      if (!load) return { label: `Example ${p.sample + 1}` };
      const x = Array.from(load.results.x.data)
        .map((v) => fmt(v, 0))
        .join(', ');
      const y = Array.from(load.results.y.data)
        .map((v) => fmt(v, 0))
        .join(', ');
      return { label: `Example #${Number(load.meta.datasetIndex) + 1}: inputs (${x}), target ${y}` };
    }
    case 'phase':
      return { label: words.phases[p.phase]?.label ?? p.phase, tag: words.phases[p.phase]?.tag };
    case 'layer':
      return { label: layerWords(header, p.layer) };
    case 'operation':
      return { label: `${head.kind}`, tag: `#${head.id}` };
    default:
      return { label: g };
  }
}

/** The tree of one epoch's instructions, to the depth `detail` allows. */
export function epochTree(
  ins: Instruction[],
  header: TraceHeader | null,
  detail: Detail,
  words: TraceWording = LEVEL1_WORDING,
): TreeNode[] {
  const depth = DEPTH[detail];
  const n = header ? Math.max(1, ...ins.map((i) => (i.path.batch ?? -1) + 1)) : 1;
  const build = (list: Instruction[], level: number): TreeNode[] => {
    const g = LEVELS[level];
    return group(list, g).map((part) => {
      const node: TreeNode = {
        key: unitKey(part[0], g) + `@${part[0].id}`,
        granularity: g,
        ...label(header, g, part, n, words),
        first: part[0].id,
        last: part[part.length - 1].id,
        children: [],
      };
      // A unit of one instruction, or one that is just bookkeeping, is not split further.
      if (level + 1 < depth && part.length > 1) node.children = build(part, level + 1);
      return node;
    });
  };
  return build(ins, 0);
}

/** Path of nodes (outermost first) that contain the cursor. */
export function nodesAt(tree: TreeNode[], cursor: number): TreeNode[] {
  const out: TreeNode[] = [];
  let level = tree;
  for (;;) {
    const hit = level.find((n) => n.first <= cursor && cursor <= n.last);
    if (!hit) return out;
    out.push(hit);
    level = hit.children;
  }
}
