import { useEffect } from 'react';
import { href } from '../router';
import { mark } from '../status';

export function Orientation() {
  useEffect(() => mark('orientation', 'visited'), []);
  return (
    <article aria-labelledby="lv-or-h">
      <p className="lv-exp-kicker">Level 1 · Orientation</p>
      <h1 id="lv-or-h">AI, machine learning and deep learning</h1>
      <p className="lv-lede">Three names you will hear. Each one sits inside the one before it.</p>
      <div className="lv-grid-main" style={{ marginTop: 'var(--lv-s5)' }}>
        <div className="lv-viz">
          <figure style={{ margin: 0 }}>
            <svg viewBox="0 0 420 300" role="img" aria-labelledby="lv-or-fig">
              <title id="lv-or-fig">
                Three nested regions: deep learning sits inside machine learning, which sits inside artificial
                intelligence.
              </title>
              <rect x="6" y="6" width="408" height="288" rx="18" className="lv-stage" />
              <text x="24" y="36" className="lv-svg-text" style={{ fontWeight: 700 }}>
                Artificial intelligence
              </text>
              <rect
                x="50"
                y="56"
                width="340"
                height="220"
                rx="16"
                fill="none"
                stroke="var(--lv-input)"
                strokeWidth="2.5"
              />
              <text x="68" y="84" className="lv-svg-text" style={{ fontWeight: 700 }}>
                Machine learning
              </text>
              <rect
                x="96"
                y="106"
                width="270"
                height="150"
                rx="14"
                fill="none"
                stroke="var(--lv-weight)"
                strokeWidth="2.5"
                strokeDasharray="7 4"
              />
              <text x="114" y="134" className="lv-svg-text" style={{ fontWeight: 700 }}>
                Deep learning
              </text>
              <text x="114" y="160" className="lv-svg-muted">
                neural networks with
              </text>
              <text x="114" y="178" className="lv-svg-muted">
                several layers
              </text>
              <g transform="translate(270 150)" aria-hidden="true">
                <circle cx="0" cy="10" r="7" fill="none" stroke="var(--lv-input)" strokeWidth="2" />
                <circle cx="0" cy="50" r="7" fill="none" stroke="var(--lv-input)" strokeWidth="2" />
                <circle cx="40" cy="0" r="7" fill="none" stroke="var(--lv-weight)" strokeWidth="2" />
                <circle cx="40" cy="30" r="7" fill="none" stroke="var(--lv-weight)" strokeWidth="2" />
                <circle cx="40" cy="60" r="7" fill="none" stroke="var(--lv-weight)" strokeWidth="2" />
                <circle cx="78" cy="30" r="7" fill="none" stroke="var(--lv-text)" strokeWidth="2" />
                {[10, 50].flatMap((y1) =>
                  [0, 30, 60].map((y2) => (
                    <line key={`${y1}-${y2}`} x1="7" y1={y1} x2="33" y2={y2} stroke="var(--lv-border)" />
                  )),
                )}
                {[0, 30, 60].map((y) => (
                  <line key={y} x1="47" y1={y} x2="71" y2="30" stroke="var(--lv-border)" />
                ))}
              </g>
            </svg>
          </figure>
        </div>
        <dl className="lv-stack" style={{ margin: 0 }}>
          <div>
            <dt>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Artificial intelligence (AI)</h2>
            </dt>
            <dd style={{ margin: 0 }}>
              Any computer system that does something we would call intelligent, such as playing chess or
              recognising speech.
            </dd>
          </div>
          <div>
            <dt>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Machine learning (ML)</h2>
            </dt>
            <dd style={{ margin: 0 }}>
              AI that is not given the rules. It finds them from examples. Show it many labelled photos and it
              learns to tell cats from dogs.
            </dd>
          </div>
          <div>
            <dt>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Deep learning (DL)</h2>
            </dt>
            <dd style={{ margin: 0 }}>
              Machine learning with <strong>neural networks</strong>: many small, simple units (artificial
              neurons) connected in layers. “Deep” means many layers.
            </dd>
          </div>
        </dl>
      </div>
      <section className="lv-section" aria-labelledby="lv-or-lab">
        <h2 id="lv-or-lab">How this lab works</h2>
        <div className="lv-callout">
          <p>
            Each experiment runs a real neural network inside your browser. When you see the label{' '}
            <span className="lv-badge-engine">Computed by the engine</span>, that number was calculated by the
            lab’s engine and read back from a record of the run. It was not drawn or made up for the lesson.
          </p>
          <p>
            Occasionally a picture explains an idea with simplified arithmetic instead. Those are always
            labelled <span className="lv-badge-demo">Illustration, not engine output</span>.
          </p>
        </div>
      </section>
      <nav className="lv-pager" aria-label="Experiment sequence">
        <a className="lv-btn" href={href.level1}>
          ← Level 1 overview
        </a>
        <a className="lv-btn lv-btn-primary" href={href.experiment('01')} data-control="next-experiment">
          Start Experiment 01 · Inside a Neuron →
        </a>
      </nav>
    </article>
  );
}
