import { href } from '../router';

export function Home() {
  return (
    <div>
      <section className="lv-hero" aria-labelledby="lv-home-h">
        <h1 id="lv-home-h">Learn how neural networks work by running them</h1>
        <p>
          DL-VizLab is a lab for deep learning. You change a network, it runs for real in your browser, and
          you look at what actually happened, step by step.
        </p>
        <div className="lv-row" style={{ marginTop: 'var(--lv-s5)' }}>
          <a className="lv-btn lv-btn-primary" href={href.level1} data-control="start-learning">
            Start learning: Level 1 →
          </a>
          <a className="lv-btn" href={href.levels}>
            See all learning levels
          </a>
        </div>
      </section>
      <section
        aria-labelledby="lv-how-h"
        className="lv-grid-2"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        <h2 id="lv-how-h" className="lv-visually-hidden">
          How it works
        </h2>
        <div className="lv-panel">
          <h3>Experiment</h3>
          <p className="lv-muted">
            Move a weight, change a layer, pick an activation. The network responds immediately.
          </p>
        </div>
        <div className="lv-panel">
          <h3>Real computation</h3>
          <p className="lv-muted">
            Nothing is animated by hand. Every value comes from the lab’s own neural-network engine, running
            on your device.
          </p>
        </div>
        <div className="lv-panel">
          <h3>Look back at every step</h3>
          <p className="lv-muted">
            A training run is recorded as it happens. You can step through that record forwards and backwards,
            from whole passes over the data down to single operations.
          </p>
        </div>
      </section>
    </div>
  );
}
