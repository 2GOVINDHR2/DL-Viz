/** The concept primer: the few terms an experiment needs, before the main visualisation, visually set apart. */
import type { ReactNode } from 'react';
import type { PrimerTerm } from '../../experiments/level1';

export function ConceptPrimer({
  intro,
  terms,
  children,
}: {
  intro: string;
  terms: PrimerTerm[];
  children?: ReactNode;
}) {
  return (
    <div className="lv-primer">
      <p>{intro}</p>
      <dl className="lv-terms">
        {terms.map((t) => (
          <div key={t.term} className={`lv-term-card${t.role ? ` lv-role-${t.role}` : ''}`}>
            <dt>{t.term}</dt>
            <dd>{t.meaning}</dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}
