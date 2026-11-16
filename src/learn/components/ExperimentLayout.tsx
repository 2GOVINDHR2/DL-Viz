/**
 * The common shape of every lesson experiment, in every level (Level 1 task §6; ADR-087), configured from the
 * experiment's data:
 * A Introduction · B Concept primer · C Guided tour (optional) · D Main visualisation · E Exploration ·
 * F Knowledge check. Experiments supply only the primer demonstration, the main visualisation and their live
 * questions.
 */
import { useEffect, type MouseEvent, type ReactNode } from 'react';
import type { LessonExperiment } from '../../experiments/level1';
import { LEVEL_1, type LevelDescriptor } from '../curriculum';
import { mark } from '../status';
import { ConceptPrimer } from './ConceptPrimer';
import { ExplorationChallenges } from './ExplorationChallenges';
import { TourLauncher } from './GuidedTour';
import { KnowledgeCheck, type LiveQuestion } from './KnowledgeCheck';

const SECTIONS = [
  ['intro', 'Introduction'],
  ['primer', 'Concepts'],
  ['experiment', 'Experiment'],
  ['explore', 'Explore'],
  ['check', 'Check'],
] as const;

export function ExperimentLayout({
  exp,
  level = LEVEL_1,
  primerDemo,
  liveQuestions = [],
  children,
}: {
  exp: LessonExperiment;
  /** The level the experiment belongs to; Level 1 when omitted. */
  level?: LevelDescriptor;
  primerDemo?: ReactNode;
  liveQuestions?: LiveQuestion[];
  children: ReactNode;
}) {
  const key = level.statusKey(exp.id);
  useEffect(() => mark(key, 'visited'), [key]);
  const k = level.experiments.findIndex((e) => e.id === exp.id);
  const prev = level.experiments[k - 1];
  const nextExp = level.experiments[k + 1];
  // A later experiment that is not open yet is not linked; the pager leads to the level's end point instead.
  const next = nextExp && level.open.has(nextExp.id) ? nextExp : undefined;
  const questions: LiveQuestion[] = [...exp.questions, ...liveQuestions];
  return (
    <article aria-labelledby="lv-exp-title">
      <header className="lv-exp-head" id="intro">
        <p className="lv-exp-kicker">
          Level {level.number} · Experiment {exp.id}
        </p>
        <h1 id="lv-exp-title">{exp.title}</h1>
        <div className="lv-exp-meta">
          <span className="lv-chip">⏱ {exp.minutes}</span>
          <span className="lv-chip">Main idea: {exp.concept}</span>
        </div>
        <p className="lv-lede">{exp.description}</p>
        <div className="lv-grid-2" style={{ marginTop: 'var(--lv-s5)' }}>
          <section aria-label="Learning objectives" className="lv-panel-quiet">
            <h2 className="lv-small" style={{ fontSize: '1rem' }}>
              In this experiment you will
            </h2>
            <ul className="lv-objectives">
              {exp.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </section>
          <section aria-label="What you will understand" className="lv-panel-quiet">
            <h2 className="lv-small" style={{ fontSize: '1rem' }}>
              Afterwards you will understand
            </h2>
            <ul className="lv-objectives">
              {exp.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </section>
        </div>
        <div className="lv-row" style={{ marginTop: 'var(--lv-s5)' }}>
          <a
            className="lv-btn lv-btn-primary"
            href="#primer"
            data-control="begin"
            onClick={(e) => jump(e, 'primer')}
          >
            Begin ↓
          </a>
          <TourLauncher steps={exp.tour} />
        </div>
      </header>

      <nav aria-label="On this page">
        <ol className="lv-onpage">
          {SECTIONS.map(([id, label], i) => (
            <li key={id}>
              <a href={`#${id}`} onClick={(e) => jump(e, id)}>
                {i + 1} · {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section className="lv-section" id="primer" aria-labelledby="lv-primer-h">
        <p className="lv-section-label">Before you start</p>
        <h2 id="lv-primer-h">Key ideas</h2>
        <ConceptPrimer intro={exp.primer.intro} terms={exp.primer.terms}>
          {primerDemo}
        </ConceptPrimer>
      </section>

      <section className="lv-section" id="experiment" aria-labelledby="lv-main-h">
        <p className="lv-section-label">Experiment</p>
        <h2 id="lv-main-h" className="lv-visually-hidden">
          The experiment
        </h2>
        {children}
      </section>

      <section className="lv-section" id="explore" aria-labelledby="lv-explore-h">
        <p className="lv-section-label">On your own</p>
        <h2 id="lv-explore-h">Explore</h2>
        <p className="lv-muted">No instructions. Try these and see what you discover.</p>
        <ExplorationChallenges challenges={exp.challenges} />
      </section>

      <section className="lv-section" id="check" aria-labelledby="lv-check-h">
        <p className="lv-section-label">Check your understanding</p>
        <h2 id="lv-check-h">Knowledge check</h2>
        <KnowledgeCheck questions={questions} onComplete={() => mark(key, 'checked')} />
      </section>

      <nav className="lv-pager" aria-label="Experiment sequence">
        {prev ? (
          <a className="lv-btn" href={level.experimentHref(prev.id)}>
            ← {prev.id} · {prev.title}
          </a>
        ) : (
          <a className="lv-btn" href={level.before.href}>
            ← {level.before.label}
          </a>
        )}
        {next ? (
          <a
            className="lv-btn lv-btn-primary"
            href={level.experimentHref(next.id)}
            data-control="next-experiment"
          >
            Next: {next.id} · {next.title} →
          </a>
        ) : (
          <a className="lv-btn lv-btn-primary" href={level.after.href} data-control="next-experiment">
            {level.after.label} →
          </a>
        )}
      </nav>
    </article>
  );
}

/** In-page links scroll without changing the hash, which the router owns. */
function jump(e: MouseEvent, id: string): void {
  e.preventDefault();
  const el = document.getElementById(id);
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  const focusable = el?.querySelector<HTMLElement>('h2, h1');
  if (focusable) {
    focusable.setAttribute('tabindex', '-1');
    focusable.focus({ preventScroll: true });
  }
}
