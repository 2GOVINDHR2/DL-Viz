import { LEVEL1 } from '../../experiments/level1';
import { LEVEL2 } from '../../experiments/level2';
import { LEVEL3, LEVEL3_EXPERIMENTS } from '../../experiments/level3';
import { href } from '../router';

export function Levels() {
  return (
    <div>
      <h1>Learning levels</h1>
      <p className="lv-lede lv-muted">
        Each level builds on the one before. Start at Level 1 if you are new to neural networks.
      </p>
      <ol className="lv-path" style={{ marginTop: 'var(--lv-s5)' }}>
        <li className="lv-path-item">
          <span className="lv-path-num" aria-hidden="true">
            1
          </span>
          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>
              <a href={href.level1}>{LEVEL1.title}</a>
            </h2>
            <p className="lv-muted" style={{ marginBottom: 0 }}>
              {LEVEL1.tagline}
            </p>
            <div className="lv-path-meta">
              <span className="lv-chip">⏱ {LEVEL1.minutes}</span>
              <span className="lv-chip">4 experiments</span>
              <span className="lv-chip">No background needed</span>
            </div>
          </div>
          <a className="lv-btn lv-btn-primary" href={href.level1}>
            Open
          </a>
        </li>
        <li className="lv-path-item">
          <span className="lv-path-num" aria-hidden="true">
            2
          </span>
          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>
              <a href={href.level2}>{LEVEL2.title}</a>
            </h2>
            <p className="lv-muted" style={{ marginBottom: 0 }}>
              {LEVEL2.tagline}
            </p>
            <div className="lv-path-meta">
              <span className="lv-chip">⏱ {LEVEL2.minutes}</span>
              <span className="lv-chip">5 experiments</span>
              <span className="lv-chip">Builds on Level 1</span>
            </div>
          </div>
          <a className="lv-btn lv-btn-primary" href={href.level2} data-control="open-level-2">
            Open
          </a>
        </li>
        <li className="lv-path-item">
          <span className="lv-path-num" aria-hidden="true">
            3
          </span>
          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>
              <a href={href.level3}>{LEVEL3.title}</a>
            </h2>
            <p className="lv-muted" style={{ marginBottom: 0 }}>
              {LEVEL3.tagline}
            </p>
            <div className="lv-path-meta">
              <span className="lv-chip">⏱ {LEVEL3.minutes}</span>
              <span className="lv-chip">{LEVEL3_EXPERIMENTS.length} experiments</span>
              <span className="lv-chip">Builds on Level 2</span>
            </div>
          </div>
          <a className="lv-btn lv-btn-primary" href={href.level3} data-control="open-level-3">
            Open
          </a>
        </li>
        <li className="lv-path-item">
          <span className="lv-path-num lv-muted" aria-hidden="true">
            4+
          </span>
          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>Beyond Level 3</h2>
            <p className="lv-muted" style={{ marginBottom: 0 }}>
              In preparation. Convolutional networks and training diagnostics are available now in the full
              workbench, which also offers expert inspection of every experiment.
            </p>
          </div>
          <a className="lv-btn" href={href.workbench} data-control="open-workbench">
            Open the workbench
          </a>
        </li>
      </ol>
    </div>
  );
}
