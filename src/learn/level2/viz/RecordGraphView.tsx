/**
 * One recorded training example as the engine's computational graph (Experiment 05, Part F). Nodes are the
 * example's recorded instructions and the parameter values they read; every edge is an `operands[].ref` from the
 * record (`exampleGraph`, src/learn/engine/graph.ts). Nothing is laid out from assumptions about the network: the
 * rows are the recorded phases and the order within a row is the recorded order.
 *
 * Rows: parameter values made before the example (top), the forward pass and loss left to right (middle), the
 * backward pass right to left (bottom), so the reverse direction reads as it runs. Edge styles: solid for the
 * forward pass, dotted for a forward value the backward pass reuses, dashed for gradients passed backwards.
 */
import type { KeyboardEvent } from 'react';
import type { Instruction } from '../../../core/npm/ir';
import type { ExampleGraph } from '../../engine/graph';
import { nodeName } from '../exp05/math';

type Row = 'source' | 'forward' | 'backward';

export function RecordGraphView({
  graph,
  selected,
  onPick,
  label,
}: {
  graph: ExampleGraph;
  selected: number | null;
  onPick: (id: number) => void;
  label: string;
}) {
  const forward = graph.steps.filter((i) => i.path.phase !== 'backward');
  const back = graph.steps.filter((i) => i.path.phase === 'backward');
  const cols = Math.max(forward.length, back.length);
  const colW = 124;
  const W = cols * colW + 40;
  const H = 370;
  const Y: Record<Row, number> = { source: 46, forward: 170, backward: 300 };
  const pos = new Map<number, { x: number; y: number; row: Row }>();
  const cx = (c: number): number => 20 + colW / 2 + c * colW;
  forward.forEach((i, c) => pos.set(i.id, { x: cx(c), y: Y.forward, row: 'forward' }));
  // The backward pass is drawn right to left: its first step under the loss.
  back.forEach((i, k) => pos.set(i.id, { x: cx(cols - 1 - k), y: Y.backward, row: 'backward' }));
  // A parameter value sits above the first step that reads it.
  graph.sources.forEach((s) => {
    const firstUse = graph.edges.filter((e) => e.from === s.id).map((e) => pos.get(e.to)!.x);
    pos.set(s.id, { x: Math.min(...firstUse), y: Y.source, row: 'source' });
  });

  const touches = (e: { from: number; to: number }): boolean =>
    selected !== null && (e.from === selected || e.to === selected);
  const style = (from: Row, to: Row): { stroke: string; dash?: string } =>
    to === 'backward' && from === 'backward'
      ? { stroke: 'var(--lv-incorrect)', dash: '6 4' }
      : to === 'backward'
        ? { stroke: 'var(--lv-muted)', dash: '2 4' }
        : { stroke: 'var(--lv-muted)' };

  const node = (i: Instruction) => {
    const p = pos.get(i.id)!;
    const isSel = i.id === selected;
    const pick = (): void => onPick(i.id);
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick();
      }
    };
    return (
      <g
        key={i.id}
        role="button"
        tabIndex={0}
        aria-pressed={isSel}
        aria-label={`Step #${i.id}, ${nodeName(i)} (${i.kind}${p.row === 'source' ? ', made before this example' : ''})`}
        data-record-node={i.id}
        onClick={pick}
        onKeyDown={key}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={p.x - 42}
          y={p.y - 18}
          width={84}
          height={36}
          rx={8}
          className={`lv-node ${p.row === 'source' ? 'lv-node-input' : p.row === 'forward' ? 'lv-node-hidden' : 'lv-node-out'}`}
          strokeWidth={isSel ? 5 : 2}
          strokeDasharray={p.row === 'source' ? '4 3' : undefined}
        />
        <text
          x={p.x}
          y={p.y + 5}
          textAnchor="middle"
          className="lv-svg-text"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          {nodeName(i)}
        </text>
        <text x={p.x} y={p.y + 32} textAnchor="middle" className="lv-svg-muted" style={{ fontSize: 10 }}>
          #{i.id}
        </text>
      </g>
    );
  };

  return (
    <figure style={{ margin: 0 }}>
      <div
        className="lv-table-wrap"
        tabIndex={-1}
        role="region"
        aria-label="The recorded graph (scrolls sideways on narrow screens)"
      >
        <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 720, display: 'block' }} aria-label={label}>
          <defs>
            <marker
              id="lv-rec-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--lv-muted)" />
            </marker>
          </defs>
          {(['source', 'forward', 'backward'] as Row[]).map((r) => (
            <text
              key={r}
              x={8}
              y={Y[r] - 30}
              className="lv-svg-muted"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {r === 'source'
                ? 'Parameter values read (made before this example)'
                : r === 'forward'
                  ? 'Forward pass and loss →'
                  : '← Backward pass (gradients)'}
            </text>
          ))}
          {graph.edges.map((e, k) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const st = style(a.row, b.row);
            const on = touches(e);
            // Same-row edges that skip columns, and edges between rows, bend so they do not run through nodes.
            const same = a.row === b.row;
            const bend = same ? (Math.abs(b.x - a.x) > colW + 1 ? (a.row === 'backward' ? 46 : -46) : 0) : 0;
            const x1 = a.x + (same ? Math.sign(b.x - a.x) * 42 : 0);
            const y1 = a.y + (same ? 0 : Math.sign(b.y - a.y) * 18);
            const x2 = b.x - (same ? Math.sign(b.x - a.x) * 44 : 0);
            const y2 = b.y - (same ? 0 : Math.sign(b.y - a.y) * 20);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 + bend;
            return (
              <path
                key={k}
                d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                fill="none"
                stroke={on ? (st.stroke === 'var(--lv-incorrect)' ? st.stroke : 'var(--lv-text)') : st.stroke}
                strokeWidth={on ? 2.6 : 1.3}
                strokeDasharray={st.dash}
                opacity={selected === null || on ? 0.95 : 0.22}
                markerEnd="url(#lv-rec-arrow)"
                data-edge={`${e.from}-${e.to}`}
              />
            );
          })}
          {graph.sources.map(node)}
          {graph.steps.map(node)}
        </svg>
      </div>
      <ul className="lv-legend">
        <li>
          <svg width="26" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="26" y2="3" stroke="var(--lv-muted)" strokeWidth="2" />
          </svg>
          forward: a value flows to the step that uses it
        </li>
        <li>
          <svg width="26" height="6" aria-hidden="true">
            <line
              x1="0"
              y1="3"
              x2="26"
              y2="3"
              stroke="var(--lv-muted)"
              strokeWidth="2"
              strokeDasharray="2 4"
            />
          </svg>
          a forward value the backward pass reuses
        </li>
        <li>
          <svg width="26" height="6" aria-hidden="true">
            <line
              x1="26"
              y1="3"
              x2="0"
              y2="3"
              stroke="var(--lv-incorrect)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          </svg>
          backward: a gradient passed on
        </li>
        <li>dashed box: a value made before this example</li>
      </ul>
    </figure>
  );
}
