/**
 * A recorded training run for Level 3 (ADR-099): train it through the shared trace store, choose one parameter value,
 * and read its update series from the record (`readUpdateSeries`). The page supplies what to show about each update;
 * this frame provides the run, the parameter choice, the loss and value charts, an update selector and the shared
 * trace explorer, with every number read from the record.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TraceHeader } from '../../../core/npm/ir';
import type { DatasetSpec } from '../../../core/engine/protocol';
import type { TrainConfig } from '../../../core/engine/session';
import { EngineBadge, ErrorNote } from '../../components/ui';
import { signal } from '../../signals';
import { TraceExplorer } from '../../trace/TraceExplorer';
import { TraceWordingProvider, type TraceWording } from '../../trace/wording';
import { RunsChart } from './RunsChart';
import { parameterChoices, readUpdateSeries, type UpdateRecord } from './updates';
import { sameConfig, useOwnRun } from './ownRun';

export interface RunContext {
  series: UpdateRecord[];
  /** The update shown (0-based index into series). */
  n: number;
  setN: (n: number) => void;
  choiceLabel: string;
  header: TraceHeader;
  jump: (id: number) => Promise<void>;
}

export function RecordedRun({
  prefix,
  signals,
  config,
  label,
  dataset,
  wording,
  trainText,
  tour,
  defaultChoice = 0,
  children,
  onSeries,
}: {
  /** Control-id prefix, e.g. "b" gives b:train, b:param, b:update. */
  prefix: string;
  /** Signal prefix for the tour and challenges, e.g. "lr" gives lr-param-picked and lr-update-picked. */
  signals: string;
  config: TrainConfig;
  label: string;
  dataset: DatasetSpec;
  wording: TraceWording;
  trainText: string;
  tour: { run: string; chart: string; update: string };
  defaultChoice?: number;
  children: (ctx: RunContext) => ReactNode;
  onSeries?: (s: UpdateRecord[] | null, choiceLabel: string) => void;
}) {
  const run = useOwnRun((c) => sameConfig(c, config));
  const [choice, setChoice] = useState(defaultChoice);
  const [series, setSeries] = useState<UpdateRecord[] | null>(null);
  const [n, setN] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const choices = useMemo(() => (run.header ? parameterChoices(run.header) : []), [run.header]);
  const picked = choices[Math.min(choice, choices.length - 1)];
  const { ready, header, read } = run;

  useEffect(() => {
    if (!ready || !header || !picked) return;
    let live = true;
    setLoadError(null);
    readUpdateSeries(read, header, picked.param, picked.k)
      .then((s) => {
        if (!live) return;
        setSeries(s);
        setN((v) => Math.min(v, s.length - 1));
      })
      .catch((e: unknown) => live && setLoadError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [ready, header, read, picked]);

  useEffect(() => {
    onSeries?.(ready ? series : null, picked?.label ?? '');
  }, [ready, series, picked, onSeries]);

  return (
    <div className="lv-stack">
      <div className="lv-row" data-tour={tour.run}>
        <button
          type="button"
          className="lv-btn lv-btn-primary"
          onClick={() => {
            setSeries(null);
            setN(0);
            void run.train(config, label, dataset);
          }}
          disabled={run.training}
          data-control={`${prefix}:train`}
        >
          {run.training ? 'Training…' : ready ? 'Train and record again' : trainText}
        </button>
        <span className="lv-small lv-muted">{label}</span>
      </div>
      {run.status === 'error' && run.error && (
        <ErrorNote title="The run did not complete.">
          <p>{run.error}</p>
        </ErrorNote>
      )}
      {loadError && <ErrorNote title="Part of the record could not be read.">{loadError}</ErrorNote>}
      {ready && header && (
        <>
          <label className="lv-row lv-small">
            <span className="lv-control-label">Parameter</span>
            <select
              className="lv-select"
              value={choice}
              onChange={(e) => {
                setChoice(Number(e.target.value));
                signal(`${signals}-param-picked`);
              }}
              data-control={`${prefix}:param`}
            >
              {choices.map((c, i) => (
                <option key={`${c.param}-${c.k}`} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {series && series.length > 0 ? (
            <>
              <div className="lv-viz" data-tour={tour.chart}>
                <div className="lv-viz-title">
                  <span>
                    {series.length} recorded updates · {picked.label}
                  </span>
                  <EngineBadge text="Recorded training run" instructions={header.length} />
                </div>
                <div className="lv-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <RunsChart
                      title="Loss of the batch before each update"
                      series={[{ label: 'loss', values: series.map((u) => u.loss) }]}
                      xLabel="update"
                      marker={n}
                      log
                      height={190}
                    />
                  </div>
                  <div style={{ flex: '1 1 300px' }}>
                    <RunsChart
                      title={`Value of the ${picked.label} after each update`}
                      series={[{ label: 'value', values: series.map((u) => u.after) }]}
                      xLabel="update"
                      marker={n}
                      height={190}
                    />
                  </div>
                </div>
              </div>
              <section className="lv-panel" aria-label="One recorded update" data-tour={tour.update}>
                <label className="lv-row lv-small">
                  <span className="lv-control-label">Update</span>
                  <input
                    type="range"
                    min={1}
                    max={series.length}
                    value={n + 1}
                    onChange={(e) => {
                      setN(Number(e.target.value) - 1);
                      signal(`${signals}-update-picked`);
                    }}
                    aria-label="Update number"
                    data-control={`${prefix}:update`}
                    style={{ flex: '1 1 200px' }}
                  />
                  <span className="lv-mono" data-value="update-number">
                    {n + 1} of {series.length}
                  </span>
                </label>
                {children({ series, n, setN, choiceLabel: picked.label, header, jump: run.jump })}
              </section>
            </>
          ) : (
            <p className="lv-small lv-muted">Reading the updates from the record…</p>
          )}
          <TraceWordingProvider value={wording}>
            <TraceExplorer stale={false} />
          </TraceWordingProvider>
        </>
      )}
    </div>
  );
}
