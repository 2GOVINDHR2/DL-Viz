/** The Level 2 landing page: the ordered path, with experiments of later stages listed as in preparation. */
import { LEVEL2, LEVEL2_EXPERIMENTS, LEVEL2_PLANNED } from '../../experiments/level2';
import { LEVEL_2 } from '../curriculum';
import { href } from '../router';
import { STATUS_TEXT, useStatus } from '../status';

function StatusText({ id }: { id: string }) {
  const s = useStatus(LEVEL_2.statusKey(id));
  return (
    <span className="lv-status" data-status={s}>
      {STATUS_TEXT[s]}
    </span>
  );
}

export function Level2Landing() {
  const entries = [
    ...LEVEL2_EXPERIMENTS.map((e) => ({ ...e, open: LEVEL_2.open.has(e.id) })),
    ...LEVEL2_PLANNED.map((e) => ({ ...e, open: false })),
  ];
  const first = entries.find((e) => e.open);
  return (
    <div>
      <section className="lv-hero" aria-labelledby="lv-l2-h" style={{ paddingTop: 'var(--lv-s3)' }}>
        <p className="lv-exp-kicker">Level 2 · Beginner–Intermediate</p>
        <h1 id="lv-l2-h">How Neural Networks Learn</h1>
        <p>{LEVEL2.tagline}</p>
        <div className="lv-exp-meta">
          <span className="lv-chip">⏱ {LEVEL2.minutes}</span>
          <span className="lv-chip">Builds on Level 1</span>
        </div>
        {first && (
          <a
            className="lv-btn lv-btn-primary"
            href={LEVEL_2.experimentHref(first.id)}
            data-control="start-level-2"
          >
            Start Level 2 →
          </a>
        )}
      </section>
      <div className="lv-grid-main">
        <section aria-labelledby="lv-l2-path-h">
          <h2 id="lv-l2-path-h">Your path</h2>
          <ol className="lv-path">
            {entries.map((e) => (
              <li key={e.id} className="lv-path-item">
                <span className="lv-path-num" aria-hidden="true">
                  {e.id}
                </span>
                <div>
                  <h3>
                    {e.open ? (
                      <a href={LEVEL_2.experimentHref(e.id)}>
                        <span className="lv-visually-hidden">Experiment {e.id}: </span>
                        {e.title}
                      </a>
                    ) : (
                      <>
                        <span className="lv-visually-hidden">Experiment {e.id}: </span>
                        {e.title}
                      </>
                    )}
                  </h3>
                  <p className="lv-muted" style={{ marginBottom: 0 }}>
                    {e.short}
                  </p>
                  <div className="lv-path-meta">
                    <span className="lv-chip">⏱ {e.minutes}</span>
                    <span className="lv-chip">{e.concept}</span>
                  </div>
                </div>
                {e.open ? <StatusText id={e.id} /> : <span className="lv-status">In preparation</span>}
              </li>
            ))}
          </ol>
        </section>
        <aside aria-labelledby="lv-l2-understand-h" className="lv-panel">
          <h2 id="lv-l2-understand-h" style={{ fontSize: '1.1rem' }}>
            By the end you will understand
          </h2>
          <ul className="lv-objectives">
            {LEVEL2.understand.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s4)' }}>
            New to neural networks? Start with <a href={href.level1}>Level 1</a>.
          </p>
        </aside>
      </div>
    </div>
  );
}
