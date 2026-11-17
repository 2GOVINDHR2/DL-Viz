/**
 * The NPM trace explorer for beginners (task §10, Part 4).
 *
 * It exposes the six-level hierarchy progressively: epochs first (a timeline); one epoch opens into its batches,
 * examples and stages; "Layers" and "Operations" detail add the two deepest levels. Stepping uses the engine's
 * granularity-aware navigator in both directions (`advance`), and selecting a node jumps to it (`jump`). The state
 * shown is the engine's reconstruction at the cursor (src/core/npm/state.ts), so stepping never holds more than two
 * segments of the trace. This is not a second trace system: it is a view over the existing one.
 */
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useEffect, useMemo, useState } from 'react';
import type { Granularity } from '../../core/npm/stats';
import type { Tensor } from '../../core/tensor/tensor';
import { Disclosure, EngineBadge, ErrorNote, Segmented } from '../components/ui';
import { fmt } from '../format';
import { signal } from '../signals';
import { epochTree, layerWords, type Detail, type TreeNode } from './hierarchy';
import { useRun } from './store';
import { useTraceWording } from './wording';

const STEP_WORDS: Record<Granularity, string> = {
  epoch: 'Epoch',
  batch: 'Batch',
  sample: 'Example',
  phase: 'Stage',
  layer: 'Layer',
  operation: 'Operation',
};
const OFFERED: Record<Detail, Granularity[]> = {
  stages: ['epoch', 'batch', 'sample', 'phase'],
  layers: ['epoch', 'batch', 'sample', 'phase', 'layer'],
  operations: ['epoch', 'batch', 'sample', 'phase', 'layer', 'operation'],
};

const vec = (t: Tensor | undefined, d = 3, max = Infinity): string => {
  if (!t) return '—';
  const v = Array.from(t.data.slice(0, max)).map((x) => fmt(x, d));
  return t.size > max ? `${v.join(', ')}, …` : v.join(', ');
};

function Timeline() {
  const epochs = useRun((s) => s.epochs);
  const header = useRun((s) => s.header);
  const exec = useRun((s) => s.exec);
  const jump = useRun((s) => s.jump);
  const cursor = useRun((s) => s.cursor);
  const length = useRun((s) => s.length);
  if (!header) return null;
  const cur = exec?.path?.epoch ?? null;
  const max = Math.max(...epochs.map((e) => e.meanLoss).filter(Number.isFinite)) || 1;
  return (
    <div data-tour="trace-epochs">
      <div className="lv-row" style={{ justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0 }}>Epochs</h4>
        <span className="lv-small lv-muted">
          Bar height: the epoch’s average loss. Select one to open it.
        </span>
      </div>
      <div className="lv-epochs" role="group" aria-label="Epochs of the run">
        {epochs.map((e) => (
          <button
            key={e.epoch}
            type="button"
            className="lv-epoch-bar"
            style={{
              height: `${Math.max(8, (100 * (Number.isFinite(e.meanLoss) ? e.meanLoss : max)) / max)}%`,
            }}
            aria-pressed={cur === e.epoch}
            data-done={exec && exec.completedEpochs > e.epoch ? 'true' : 'false'}
            aria-label={`Epoch ${e.epoch + 1}: average loss ${fmt(e.meanLoss, 3)}`}
            title={`Epoch ${e.epoch + 1}: loss ${fmt(e.meanLoss, 3)}`}
            onClick={() => {
              void jump(header.epochStarts[e.epoch]);
              signal('epoch-selected');
            }}
            data-control="trace:epoch"
          />
        ))}
      </div>
      <label className="lv-small lv-row" style={{ marginTop: 'var(--lv-s2)' }}>
        <span>Position in the record</span>
        <input
          type="range"
          min={-1}
          max={length - 1}
          value={cursor}
          onChange={(e) => void jump(Number(e.target.value))}
          style={{ flex: 1, minWidth: 160 }}
          aria-valuetext={`instruction ${cursor + 1} of ${length}`}
          data-control="trace:position"
        />
        <span className="lv-mono">
          {cursor + 1} / {length}
        </span>
      </label>
    </div>
  );
}

function Stepper({ detail }: { detail: Detail }) {
  const step = useRun((s) => s.step);
  const jump = useRun((s) => s.jump);
  const cursor = useRun((s) => s.cursor);
  const length = useRun((s) => s.length);
  const header = useRun((s) => s.header);
  const moving = useRun((s) => s.moving);
  const [g, setG] = useState<Granularity>('phase');
  const [playing, setPlaying] = useState(false);
  const offered = OFFERED[detail];
  const size = offered.includes(g) ? g : 'phase';
  const atEnd = cursor >= length - 1;
  useEffect(() => {
    if (!playing || moving) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => void step(1, size), 650);
    return () => window.clearTimeout(t);
  }, [playing, moving, cursor, atEnd, size, step]);
  return (
    <div className="lv-stack" data-tour="trace-stepper">
      <Segmented
        legend="Step size"
        options={offered.map((v) => ({ value: v, label: STEP_WORDS[v] }))}
        value={size}
        onChange={setG}
        control="trace:size"
      />
      <div className="lv-stepper">
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => void jump(-1)}
          disabled={cursor < 0}
          data-control="trace:start"
          aria-label="Go to the start of the run"
        >
          ⏮ Start
        </button>
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => void step(-1, size)}
          disabled={cursor < 0}
          data-control="trace:back"
        >
          ◀ Previous {STEP_WORDS[size].toLowerCase()}
        </button>
        <button
          type="button"
          className="lv-btn lv-btn-small lv-btn-primary"
          onClick={() => void step(1, size)}
          disabled={atEnd}
          data-control="trace:next"
        >
          Next {STEP_WORDS[size].toLowerCase()} ▶
        </button>
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => setPlaying(!playing)}
          disabled={atEnd}
          aria-pressed={playing}
          data-control="trace:play"
        >
          {playing ? '❚❚ Pause' : '▶▶ Watch'}
        </button>
        <button
          type="button"
          className="lv-btn lv-btn-small"
          onClick={() => header && void jump(length - 1)}
          disabled={atEnd}
          data-control="trace:end"
          aria-label="Go to the end of the run"
        >
          End ⏭
        </button>
      </div>
      <p className="lv-small lv-muted" style={{ margin: 0 }}>
        “Watch” steps through the record one {STEP_WORDS[size].toLowerCase()} at a time. Each frame is a
        recorded state of the run, not an animation.
      </p>
    </div>
  );
}

function Tree({
  nodes,
  cursor,
  onPick,
  depth = 0,
}: {
  nodes: TreeNode[];
  cursor: number;
  onPick: (n: TreeNode) => void;
  depth?: number;
}) {
  const words = useTraceWording();
  return (
    <ul className="lv-tree" aria-label={depth === 0 ? 'The epoch, step by step' : undefined}>
      {nodes.map((n) => {
        const inside = n.first <= cursor && cursor <= n.last;
        const here =
          inside &&
          (n.children.length === 0 || !n.children.some((c) => c.first <= cursor && cursor <= c.last));
        return (
          <li key={n.key} className="lv-tree-item">
            <button
              type="button"
              onClick={() => onPick(n)}
              aria-current={here ? 'step' : undefined}
              data-past={n.last <= cursor ? 'true' : 'false'}
              data-control={`trace:node:${n.granularity}`}
            >
              <span className="lv-tree-dot" aria-hidden="true" />
              <span>{n.granularity === 'operation' ? words.kind(n.label) : n.label}</span>
              {n.tag && <span className="lv-phase-tag">{n.tag}</span>}
              {n.last <= cursor && <span className="lv-visually-hidden">(done)</span>}
            </button>
            {n.children.length > 0 && inside && (
              <Tree nodes={n.children} cursor={cursor} onPick={onPick} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Hierarchy({ detail }: { detail: Detail }) {
  const words = useTraceWording();
  const view = useRun((s) => s.epochView);
  const err = useRun((s) => s.epochViewError);
  const header = useRun((s) => s.header);
  const cursor = useRun((s) => s.cursor);
  const jump = useRun((s) => s.jump);
  const epochs = useRun((s) => s.epochs.length);
  const tree = useMemo(
    () => (view ? epochTree(view.instructions, header, detail, words) : []),
    [view, header, detail, words],
  );
  if (err) return <ErrorNote title="This epoch cannot be listed.">{err}</ErrorNote>;
  if (!view || !header) return <p className="lv-muted">Select an epoch, or step forward, to open it.</p>;
  const before = cursor < header.epochStarts[0];
  return (
    <div>
      <h4>
        Inside epoch {view.epoch + 1} of {epochs}
      </h4>
      {before && (
        <p className="lv-small lv-muted">
          The cursor is before the first epoch: only the starting values exist so far.
        </p>
      )}
      <Tree nodes={tree} cursor={cursor} onPick={(n) => void jump(n.last)} />
      <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s2)' }}>
        Selecting a step moves the cursor to the end of that step: everything up to it has executed.
      </p>
    </div>
  );
}

function Matrix({ t, label }: { t: Tensor; label: string }) {
  const [r, c] = t.shape.length === 2 ? t.shape : [1, t.size];
  return (
    <table className="lv-matrix">
      <caption className="lv-visually-hidden">{label}</caption>
      <tbody>
        {Array.from({ length: r }, (_, i) => (
          <tr key={i}>
            {Array.from({ length: c }, (_, j) => (
              <td key={j}>{fmt(t.data[i * c + j], 3)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function History({ name }: { name: string }) {
  const cursor = useRun((s) => s.cursor);
  const run = useRun((s) => s.run);
  const history = useRun((s) => s.history);
  const [pts, setPts] = useState<{ cursor: number; values: number[][] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setPts(null), [name, run]);
  const load = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setPts({ cursor, values: await history(name) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const W = 360;
  const H = 120;
  let paths: string[] = [];
  if (pts && pts.values.length) {
    const flat = pts.values.flat();
    const lo = Math.min(...flat);
    const hi = Math.max(...flat);
    const sx = scaleLinear()
      .domain([0, Math.max(1, pts.values.length - 1)])
      .range([6, W - 6]);
    const sy = scaleLinear()
      .domain([lo - 0.05 * (hi - lo || 1), hi + 0.05 * (hi - lo || 1)])
      .range([H - 6, 6]);
    paths = pts.values[0].map(
      (_, k) =>
        line<number[]>()
          .x((_, i) => sx(i))
          .y((v) => sy(v[k]))(pts.values) ?? '',
    );
  }
  return (
    <div>
      <button
        type="button"
        className="lv-btn lv-btn-small"
        onClick={() => void load()}
        disabled={busy}
        data-control="trace:history"
      >
        {busy
          ? 'Reading the record…'
          : pts
            ? 'Update to the current point'
            : `Show how ${name} changed up to here`}
      </button>
      {error && <ErrorNote title="The history could not be read.">{error}</ErrorNote>}
      {pts && (
        <figure style={{ margin: 'var(--lv-s2) 0 0' }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${name}: ${pts.values.length} recorded values, from the start to instruction ${pts.cursor + 1}. Each line is one value.`}
          >
            <rect width={W} height={H} rx={6} fill="var(--lv-surface-2)" />
            {paths.map((d, k) => (
              <path key={k} d={d} fill="none" stroke="var(--lv-weight)" strokeWidth={1.5} opacity={0.8} />
            ))}
          </svg>
          <figcaption className="lv-small lv-muted">
            Each line is one value of {name}, after the start and after every update up to the cursor (
            {pts.values.length} points).
          </figcaption>
        </figure>
      )}
    </div>
  );
}

function ParameterInspector() {
  const exec = useRun((s) => s.exec);
  const header = useRun((s) => s.header);
  const pinned = useRun((s) => s.pinned);
  const pin = useRun((s) => s.pin);
  const unpin = useRun((s) => s.unpin);
  const names = header?.model.params.map((p) => p.name) ?? [];
  const [name, setName] = useState(names[0] ?? '');
  const sel = names.includes(name) ? name : names[0];
  if (!exec || !header || !sel) return null;
  const cur = exec.params[sel];
  const p = header.model.params.find((q) => q.name === sel)!;
  const was = pinned?.params[sel];
  return (
    <div className="lv-stack">
      <label className="lv-row">
        <span className="lv-control-label">Parameter</span>
        <select
          className="lv-select"
          value={sel}
          onChange={(e) => setName(e.target.value)}
          data-control="trace:param"
        >
          {names.map((n) => {
            const q = header.model.params.find((x) => x.name === n)!;
            return (
              <option key={n} value={n}>
                {q.role === 'weight' ? 'Weights' : 'Biases'} of {layerWords(header, q.layer).toLowerCase()}
              </option>
            );
          })}
        </select>
      </label>
      {cur ? (
        <>
          <p className="lv-small lv-muted" style={{ margin: 0 }}>
            {p.role === 'weight'
              ? `Rows: inputs to the layer (${p.shape[0]}); columns: its neurons (${p.shape[1]}).`
              : `One per neuron (${p.shape[0]}).`}{' '}
            Set by instruction #{cur.producedBy}.
          </p>
          <div className="lv-row" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="lv-small" style={{ margin: '0 0 4px' }}>
                Now
              </p>
              <Matrix t={cur.value} label={`${sel} now`} />
            </div>
            {was && (
              <>
                <div>
                  <p className="lv-small" style={{ margin: '0 0 4px' }}>
                    Pinned ({pinned.where})
                  </p>
                  <Matrix t={was} label={`${sel} when pinned`} />
                </div>
                <div>
                  <p className="lv-small" style={{ margin: '0 0 4px' }}>
                    Change (now − pinned)
                  </p>
                  <table className="lv-matrix">
                    <tbody>
                      {Array.from({ length: p.shape.length === 2 ? p.shape[0] : 1 }, (_, i) => {
                        const c = p.shape.length === 2 ? p.shape[1] : p.shape[0];
                        return (
                          <tr key={i}>
                            {Array.from({ length: c }, (_, j) => {
                              const d = cur.value.data[i * c + j] - was.data[i * c + j];
                              return (
                                <td
                                  key={j}
                                  className={d > 0 ? 'lv-delta-up' : d < 0 ? 'lv-delta-down' : undefined}
                                >
                                  {fmt(d, 3)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div className="lv-row">
            {pinned ? (
              <button
                type="button"
                className="lv-btn lv-btn-small"
                onClick={unpin}
                data-control="trace:unpin"
              >
                Unpin
              </button>
            ) : (
              <button
                type="button"
                className="lv-btn lv-btn-small"
                onClick={() => pin(`instruction ${exec.cursor + 1}`)}
                data-control="trace:pin"
              >
                📌 Pin these values to compare
              </button>
            )}
            {pinned && (
              <span className="lv-small lv-muted">
                The change is the difference of two recorded values, worked out for display.
              </span>
            )}
          </div>
          <History name={sel} />
        </>
      ) : (
        <p className="lv-muted">Not set yet at this point.</p>
      )}
    </div>
  );
}

function DetailPanel({ detail }: { detail: Detail }) {
  const words = useTraceWording();
  const exec = useRun((s) => s.exec);
  const header = useRun((s) => s.header);
  const operands = useRun((s) => s.operands);
  const config = useRun((s) => s.config);
  if (!exec || !header) return null;
  if (exec.cursor < 0 || !exec.path)
    return (
      <div className="lv-panel">
        <h4>Before the run</h4>
        <p className="lv-muted">
          Nothing has executed yet. Press Next to execute the first step: setting the starting values.
        </p>
      </div>
    );
  const path = exec.path;
  const last = header.model.layers[header.model.layers.length - 1].name;
  const sample = exec.sample && path.sample !== null ? exec.sample : null;
  const prediction = sample?.layers[last]?.a;
  const batches = config ? Math.ceil(header.dataset.n / config.batchSize) : null;
  const where = [
    path.epoch !== null ? `Epoch ${path.epoch + 1} of ${header.epochStarts.length - 1}` : 'Before training',
    path.batch !== null
      ? words.batchLabel
        ? words.batchLabel(path.batch, batches, '')
        : `Batch ${path.batch + 1}${batches ? ` of ${batches}` : ''}`
      : null,
    sample ? `Example #${sample.datasetIndex + 1}` : null,
    words.phases[path.phase]?.tag ? `${words.phases[path.phase].tag} stage` : null,
    path.layer && path.layer !== 'loss' ? layerWords(header, path.layer) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const updates = Object.entries(exec.updates).filter(([, u]) => u.after);
  const cur = exec.current!;
  return (
    <div className="lv-panel lv-stack" aria-live="polite" aria-atomic="false">
      <div>
        <p className="lv-where" style={{ margin: 0 }}>
          {where}
        </p>
        <p className="lv-small lv-muted" style={{ margin: '4px 0 0' }}>
          Last step executed: {words.kind(cur.kind)} (instruction #{cur.id})
        </p>
      </div>
      <p style={{ margin: 0 }}>{words.phaseExplain[path.phase]}</p>
      {sample && (
        <dl className="lv-kv">
          <dt>Inputs</dt>
          <dd>({vec(sample.x, 0)})</dd>
          <dt>Target</dt>
          <dd>{vec(sample.y, 0)}</dd>
          <dt>Prediction</dt>
          <dd>
            {prediction
              ? `${vec(prediction)} → answer ${prediction.data[0] >= 0.5 ? 1 : 0}`
              : 'not computed yet'}
          </dd>
          <dt>Loss</dt>
          <dd>{sample.loss !== undefined ? fmt(sample.loss, 4) : 'not computed yet'}</dd>
        </dl>
      )}
      {sample && Object.keys(sample.layers).length > 0 && (
        <Disclosure summary="Values inside the network for this example" defaultOpen={detail !== 'stages'}>
          <div className="lv-table-wrap">
            <table className="lv-table lv-small">
              <thead>
                <tr>
                  <th scope="col">Layer</th>
                  <th scope="col">Output values (activations)</th>
                  <th scope="col">{words.signalColumn}</th>
                </tr>
              </thead>
              <tbody>
                {header.model.layers.map((l) => {
                  const s = sample.layers[l.name];
                  if (!s) return null;
                  return (
                    <tr key={l.name}>
                      <td>{layerWords(header, l.name)}</td>
                      <td className="num">{vec(s.a)}</td>
                      <td className="num">{s.gradZ ? vec(s.gradZ) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="lv-small lv-muted">{words.signalExplain}</p>
        </Disclosure>
      )}
      {updates.length > 0 && (
        <div className="lv-table-wrap">
          <table className="lv-table lv-small">
            <caption>{words.updatesCaption}</caption>
            <thead>
              <tr>
                <th scope="col">Parameter</th>
                <th scope="col">Before</th>
                <th scope="col">Step applied</th>
                <th scope="col">After</th>
              </tr>
            </thead>
            <tbody>
              {updates.map(([n, u]) => (
                <tr key={n}>
                  <td>{n}</td>
                  <td className="num">{vec(u.before, 3, 4)}</td>
                  <td className="num">{vec(u.delta, 4, 4)}</td>
                  <td className="num">{vec(u.after, 3, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="lv-small lv-muted">{words.updatesNote}</p>
        </div>
      )}
      {exec.batchLoss !== undefined && path.batch !== null && (
        <p className="lv-small" style={{ margin: 0 }}>
          {words.batchLoss ?? 'Average loss of this batch'}:{' '}
          <span className="lv-mono">{fmt(exec.batchLoss, 4)}</span>
        </p>
      )}
      {detail === 'operations' && (
        <Disclosure summary={`The recorded instruction #${cur.id}: ${cur.kind}`} defaultOpen>
          <dl className="lv-kv">
            <dt>Kind</dt>
            <dd>
              {cur.kind} · {words.kind(cur.kind)}
            </dd>
            <dt>Formula</dt>
            <dd>{cur.symbolic || '—'}</dd>
            <dt>Position</dt>
            <dd>
              epoch {cur.path.epoch ?? '—'} · batch {cur.path.batch ?? '—'} · example {cur.path.sample ?? '—'}{' '}
              · {cur.path.phase} · {cur.path.layer ?? '—'}
            </dd>
            {cur.operands.map((o) => (
              <div key={`${o.ref}.${o.slot}`} style={{ display: 'contents' }}>
                <dt>Uses: {o.role}</dt>
                <dd>
                  #{o.ref}.{o.slot} ={' '}
                  {operands[`${o.ref}.${o.slot}`] ? vec(operands[`${o.ref}.${o.slot}`], 3, 4) : '…'}
                </dd>
              </div>
            ))}
            {Object.entries(cur.results).map(([k, t]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt>Result: {k}</dt>
                <dd>{vec(t, 4, 6)}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      )}
    </div>
  );
}

export function TraceExplorer({ stale }: { stale: boolean }) {
  const header = useRun((s) => s.header);
  const run = useRun((s) => s.run);
  const config = useRun((s) => s.config);
  const generationMs = useRun((s) => s.generationMs);
  const exec = useRun((s) => s.exec);
  const [detail, setDetail] = useState<Detail>('stages');
  if (!header || !config) return null;
  const arch = config.model.layers.map((l) => (l.type === 'dense' ? l.units : '?')).join(' → ');
  const act = config.model.layers[0].type === 'dense' ? config.model.layers[0].activation : '';
  return (
    <section aria-label="Trace explorer" className="lv-stack">
      <div className="lv-viz-title">
        <h3 style={{ margin: 0 }}>The record of run {run}</h3>
        <EngineBadge instructions={header.length} text="A real recorded run" />
      </div>
      <p className="lv-small lv-muted" style={{ marginTop: 0 }}>
        Network {header.model.inputShape[0]} → {arch} ({act}{' '}
        {config.model.layers.length > 1 ? 'hidden' : 'output'}) · learning rate {config.optimizer.lr} · batch
        size {config.batchSize} · {config.epochs} epochs · seed {config.seed} · recorded in{' '}
        {fmt(generationMs, 0)} ms. Every operation the engine performed is in this record, with its values.
      </p>
      {stale && (
        <div className="lv-callout" role="status">
          You have changed the settings since this run. This record is still of run {run}, with the settings
          above. Train again to record the new settings.
        </div>
      )}
      <Timeline />
      <div className="lv-row" style={{ justifyContent: 'space-between' }}>
        <Segmented
          legend="Detail"
          options={[
            { value: 'stages', label: 'Stages' },
            { value: 'layers', label: 'Layers' },
            { value: 'operations', label: 'Operations' },
          ]}
          value={detail}
          onChange={(d) => {
            setDetail(d);
            signal(`detail:${d === 'operations' ? 'operation' : d}`);
          }}
          control="trace:detail"
        />
      </div>
      <Stepper detail={detail} />
      <div className="lv-explorer">
        <div className="lv-panel lv-explorer-tree">
          <Hierarchy detail={detail} />
        </div>
        <div className="lv-stack">
          <DetailPanel detail={detail} />
          {exec && exec.cursor >= 0 && (
            <Disclosure summary="Inspect and compare parameters">
              <ParameterInspector />
            </Disclosure>
          )}
        </div>
      </div>
    </section>
  );
}
