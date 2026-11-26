/** The Level 3 landing page: the ordered path; experiments not built yet are listed as in preparation. */
import { LEVEL3, LEVEL3_EXPERIMENTS } from '../../experiments/level3';
import { LEVEL_3 } from '../curriculum';
import { href } from '../router';
import { STATUS_TEXT, useStatus } from '../status';

function StatusText({ id }: { id: string }) {
  const s = useStatus(LEVEL_3.statusKey(id));
  return (
    <span className="lv-status" data-status={s}>
      {STATUS_TEXT[s]}
    </span>
  );
}

export function Level3Landing() {
  const entries = LEVEL3_EXPERIMENTS.map((e) => ({ ...e, open: LEVEL_3.open.has(e.id) }));
  const first = entries.find((e) => e.open);
  return (
    <div>
      <section className="lv-hero" aria-labelledby="lv-l3-h" style={{ paddingTop: 'var(--lv-s3)' }}>
        <p className="lv-exp-kicker">Level 3 · Intermediate</p>
        <h1 id="lv-l3-h">Training Strategies and Generalization</h1>
        <p>{LEVEL3.tagline}</p>
        <div className="lv-exp-meta">
          <span className="lv-chip">⏱ {LEVEL3.minutes}</span>
          <span className="lv-chip">Builds on Level 2</span>
        </div>
        {first && (
          <a
            className="lv-btn lv-btn-primary"
            href={LEVEL_3.experimentHref(first.id)}
            data-control="start-level-3"
          >
            Start Level 3 →
          </a>
        )}
      </section>
      <div className="lv-grid-main">
        <section aria-labelledby="lv-l3-path-h">
          <h2 id="lv-l3-path-h">Your path</h2>
          <ol className="lv-path">
            {entries.map((e) => (
              <li key={e.id} className="lv-path-item">
                <span className="lv-path-num" aria-hidden="true">
                  {e.id}
                </span>
                <div>
                  <h3>
                    {e.open ? (
                      <a href={LEVEL_3.experimentHref(e.id)}>
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
        <aside aria-labelledby="lv-l3-understand-h" className="lv-panel">
          <h2 id="lv-l3-understand-h" style={{ fontSize: '1.1rem' }}>
            By the end you will understand
          </h2>
          <ul className="lv-objectives">
            {LEVEL3.understand.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s4)' }}>
            Level 3 builds on gradients and backpropagation. To review them, see{' '}
            <a href={href.level2}>Level 2</a>.
          </p>
        </aside>
      </div>
    </div>
  );
}
