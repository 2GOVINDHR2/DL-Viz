import { LEVEL1_ASSESSMENT, level1ById } from '../../experiments/level1';
import { KnowledgeCheck } from '../components/KnowledgeCheck';
import { href } from '../router';
import { mark } from '../status';

export function Assessment() {
  return (
    <article aria-labelledby="lv-as-h">
      <p className="lv-exp-kicker">Level 1 · Assessment</p>
      <h1 id="lv-as-h">Check what you have learned</h1>
      <p className="lv-lede">
        {LEVEL1_ASSESSMENT.length} questions covering all four experiments. Each answer explains why it is
        right or wrong. Nothing is graded or recorded.
      </p>
      <KnowledgeCheck
        questions={LEVEL1_ASSESSMENT.map((q) => ({ ...q, prompt: `${q.prompt}` }))}
        onComplete={() => mark('assessment', 'checked')}
      />
      <p className="lv-small lv-muted" style={{ marginTop: 'var(--lv-s4)' }}>
        Questions by experiment:{' '}
        {['01', '02', '03', '04']
          .map(
            (id) =>
              `${id} ${level1ById(id)?.title} (${LEVEL1_ASSESSMENT.filter((q) => q.from === id).length})`,
          )
          .join(' · ')}
      </p>
      <nav className="lv-pager" aria-label="Experiment sequence">
        <a className="lv-btn" href={href.experiment('04')}>
          ← 04 · Multilayer Perceptron
        </a>
        <a className="lv-btn lv-btn-primary" href={href.level1}>
          Back to Level 1 overview
        </a>
      </nav>
    </article>
  );
}
