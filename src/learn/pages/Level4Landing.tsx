/** The Level 4 landing page: the ordered path; experiments not built yet are listed as in preparation. */
import { LEVEL4, LEVEL4_EXPERIMENTS } from '../../experiments/level4';
import { LEVEL_4 } from '../curriculum';
import { href } from '../router';
import { STATUS_TEXT, useStatus } from '../status';

function StatusText({ id }: { id: string }) {
  const s = useStatus(LEVEL_4.statusKey(id));
  return (
    <span className="lv-status" data-status={s}>
      {STATUS_TEXT[s]}
    </span>
  );
}

export function Level4Landing() {
  const entries = LEVEL4_EXPERIMENTS.map((e) => ({ ...e, open: LEVEL_4.open.has(e.id) }));
  const first = entries.find((e) => e.open);
  return (
    <div>
      <section className="lv-hero" aria-labelledby="lv-l4-h" style={{ paddingTop: 'var(--lv-s3)' }}>
        <p className="lv-exp-kicker">Level 4 · Advanced</p>
        <h1 id="lv-l4-h">Deep Learning Architectures</h1>
        <p>{LEVEL4.tagline}</p>
        <div className="lv-exp-meta">
          <span className="lv-chip">⏱ {LEVEL4.minutes}</span>
          <span className="lv-chip">Builds on Levels 2 and 3</span>
        </div>
        {first && (
          <a
            className="lv-btn lv-btn-primary"
            href={LEVEL_4.experimentHref(first.id)}
            data-control="start-level-4"
          >
            Start Level 4 →
          </a>
        )}
      </section>
      <div className="lv-grid-main">
        <section aria-labelledby="lv-l4-path-h">
          <h2 id="lv-l4-path-h">Your path</h2>
          <ol className="lv-path">
            {entries.map((e) => (
              <li key={e.id} className="lv-path-item">
                <span className="lv-path-num" aria-hidden="true">
                  {e.id}
                </span>
                <div>
                  <h3>
                    {e.open ? (
                      <a href={LEVEL_4.experimentHref(e.id)}>
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
        <aside aria-labelledby="lv-l4-understand-h" className="lv-panel">
          <h2 id="lv-l4-understand-h" style={{ fontSize: '1.1rem' }}>
            By the end you will understand
          </h2>
          <ul className="lv-objectives">
            {LEVEL4.understand.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s4)' }}>
            Level 4 builds on backpropagation (<a href={href.level2}>Level 2</a>) and on training with
            gradient descent and Adam (<a href={href.level3}>Level 3</a>).
          </p>
        </aside>
      </div>
    </div>
  );
}
