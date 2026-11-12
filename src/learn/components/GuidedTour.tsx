/**
 * The one guided tour used by every Level 1 experiment, configured by each experiment's `tour` steps
 * (src/experiments/level1.ts). It is optional and never starts by itself.
 *
 * Each step highlights its target element (outline, not an overlay, so nothing is hidden), says what to do, and
 * waits for that action: when the experiment emits the step's signal, the tour moves on. It never advances on a
 * timer. Previous, Next and Skip are always available, and a step indicator says where the learner is. The panel is
 * docked at the bottom of the viewport, and the page gains bottom padding while it is open, so the panel never
 * covers the visualisation.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TourStep } from '../../experiments/level1';
import { matches, useSignals } from '../signals';

export function GuidedTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [missing, setMissing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const finish = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const root = document.querySelector('.lv-root');
    root?.setAttribute('data-touring', 'true');
    return () => root?.removeAttribute('data-touring');
  }, []);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    setMissing(!el);
    if (!el) return;
    el.setAttribute('data-tour-active', 'true');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    return () => el.removeAttribute('data-tour-active');
  }, [step.target]);

  useEffect(() => {
    heading.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  useSignals((name) => {
    if (!step.waitFor || done[index] || !matches(step.waitFor, name)) return;
    setDone((d) => ({ ...d, [index]: true }));
    if (!last) setIndex(index + 1);
  });

  return (
    <div className="lv-tour" role="dialog" aria-modal="false" aria-labelledby="lv-tour-title">
      <div className="lv-tour-step" aria-live="polite">
        Guided tour · step {index + 1} of {steps.length}
      </div>
      <h2 id="lv-tour-title" ref={heading} tabIndex={-1}>
        {step.title}
      </h2>
      <p>{step.text}</p>
      {step.doThis && (
        <p className={done[index] ? 'lv-tour-done' : 'lv-tour-do'}>{done[index] ? 'Done.' : step.doThis}</p>
      )}
      {missing && (
        <p className="lv-small lv-muted">This part of the page is not shown yet. Press Next to continue.</p>
      )}
      <div className="lv-tour-nav">
        <div className="lv-row">
          <button
            type="button"
            className="lv-btn lv-btn-small"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0}
          >
            ← Previous
          </button>
          {last ? (
            <button type="button" className="lv-btn lv-btn-small lv-btn-primary" onClick={finish}>
              Finish tour
            </button>
          ) : (
            <button
              type="button"
              className="lv-btn lv-btn-small lv-btn-primary"
              onClick={() => setIndex(index + 1)}
            >
              Next →
            </button>
          )}
        </div>
        <button type="button" className="lv-btn lv-btn-small lv-btn-quiet" onClick={finish}>
          Skip tour
        </button>
      </div>
    </div>
  );
}

/** The visible, optional entry point. */
export function TourLauncher({ steps }: { steps: TourStep[] }) {
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    launcher.current?.focus();
  }, []);
  return (
    <>
      <button
        type="button"
        ref={launcher}
        className="lv-btn"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        data-control="tour:start"
      >
        ▶ Start guided tour
      </button>
      {open && <GuidedTour steps={steps} onClose={close} />}
    </>
  );
}
