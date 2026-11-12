import { LEVEL1 } from '../../experiments/level1';
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
          <span className="lv-path-num lv-muted" aria-hidden="true">
            2+
          </span>
          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>Levels 2 and beyond</h2>
            <p className="lv-muted" style={{ marginBottom: 0 }}>
              In preparation. Their material (forward propagation, loss functions, gradient descent,
              backpropagation, convolutional networks and training diagnostics) is available now in the full
              workbench, which assumes you have finished Level 1.
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
