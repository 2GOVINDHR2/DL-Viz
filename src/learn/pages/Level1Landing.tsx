import { LEVEL1, LEVEL1_EXPERIMENTS } from '../../experiments/level1';
import { href } from '../router';
import { STATUS_TEXT, useStatus } from '../status';

function StatusText({ id }: { id: string }) {
  const s = useStatus(id);
  return (
    <span className="lv-status" data-status={s}>
      {STATUS_TEXT[s]}
    </span>
  );
}

export function Level1Landing() {
  const steps = [
    {
      id: 'orientation',
      num: '0',
      title: 'Orientation: AI, ML and DL',
      short: 'Where neural networks fit, in five minutes.',
      minutes: '5 min',
      concept: 'The big picture',
      link: href.orientation,
    },
    ...LEVEL1_EXPERIMENTS.map((e) => ({
      id: e.id,
      num: e.id,
      title: e.title,
      short: e.short,
      minutes: e.minutes,
      concept: e.concept,
      link: href.experiment(e.id),
    })),
    {
      id: 'assessment',
      num: '✓',
      title: 'Level 1 assessment',
      short: 'Eight short questions covering all four experiments.',
      minutes: '5 min',
      concept: 'Review',
      link: href.assessment,
    },
  ];
  return (
    <div>
      <section className="lv-hero" aria-labelledby="lv-l1-h" style={{ paddingTop: 'var(--lv-s3)' }}>
        <p className="lv-exp-kicker">Level 1 · Beginner</p>
        <h1 id="lv-l1-h">Neural Network Foundations</h1>
        <p>{LEVEL1.tagline}</p>
        <div className="lv-exp-meta">
          <span className="lv-chip">⏱ {LEVEL1.minutes}</span>
          <span className="lv-chip">No programming or advanced maths needed</span>
        </div>
        <a className="lv-btn lv-btn-primary" href={href.orientation} data-control="start-level">
          Start learning →
        </a>
      </section>
      <div className="lv-grid-main">
        <section aria-labelledby="lv-path-h">
          <h2 id="lv-path-h">Your path</h2>
          <ol className="lv-path">
            {steps.map((s) => (
              <li key={s.id} className="lv-path-item">
                <span className="lv-path-num" aria-hidden="true">
                  {s.num}
                </span>
                <div>
                  <h3>
                    <a href={s.link}>
                      {/^\d\d$/.test(s.num) && (
                        <span className="lv-visually-hidden">Experiment {s.num}: </span>
                      )}
                      {s.title}
                    </a>
                  </h3>
                  <p className="lv-muted" style={{ marginBottom: 0 }}>
                    {s.short}
                  </p>
                  <div className="lv-path-meta">
                    <span className="lv-chip">⏱ {s.minutes}</span>
                    <span className="lv-chip">{s.concept}</span>
                  </div>
                </div>
                <StatusText id={s.id} />
              </li>
            ))}
          </ol>
        </section>
        <aside aria-labelledby="lv-understand-h" className="lv-panel">
          <h2 id="lv-understand-h" style={{ fontSize: '1.1rem' }}>
            By the end you will understand
          </h2>
          <ul className="lv-objectives">
            {LEVEL1.understand.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s4)' }}>
            Status is kept only in this browser tab, so you can see where you have been. Nothing is sent
            anywhere.
          </p>
        </aside>
      </div>
    </div>
  );
}
