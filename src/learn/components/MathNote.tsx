/** A formula as support, collapsed by default and never the teaching mechanism (KaTeX, rendered to a string). */
import katex from 'katex';
import { useMemo, type ReactNode } from 'react';
import { Disclosure } from './ui';

export function Formula({ tex, label }: { tex: string; label: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: true, output: 'htmlAndMathml' }),
    [tex],
  );
  return (
    <div className="lv-katex" role="math" aria-label={label} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export function MathNote({
  summary = 'Show the formula',
  tex,
  label,
  children,
}: {
  summary?: string;
  tex: string;
  label: string;
  children?: ReactNode;
}) {
  return (
    <Disclosure summary={summary}>
      <Formula tex={tex} label={label} />
      {children}
    </Disclosure>
  );
}
