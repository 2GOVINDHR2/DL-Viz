import 'katex/dist/katex.min.css';
import { lazy, StrictMode, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LearnApp } from './learn/LearnApp';

/**
 * Three applications share this entry (ADR-080):
 *  - the learning interface (Level 1), the default;
 *  - the full workbench (Levels 2+ and expert inspection), at `?mode=novice|expert` or `#/workbench`;
 *  - Study Mode, at `#study`.
 * The workbench and Study Mode load on demand, each with the workbench's stylesheet.
 */
const Workbench = lazy(async () => {
  await import('./ui/styles.css');
  const m = await import('./ui/App');
  return { default: m.App };
});
const StudyApp = lazy(async () => {
  await import('./ui/styles.css');
  const m = await import('./study/ui/StudyApp');
  return { default: m.StudyApp };
});

type Which = 'learn' | 'workbench' | 'study';
export function whichApp(loc: { search: string; hash: string }): Which {
  if (loc.hash.startsWith('#study')) return 'study';
  if (new URLSearchParams(loc.search).has('mode') || loc.hash.startsWith('#/workbench')) return 'workbench';
  return 'learn';
}

function Root() {
  const [which, setWhich] = useState<Which>(() => whichApp(window.location));
  useEffect(() => {
    const f = (): void => setWhich(whichApp(window.location));
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const loading = <p style={{ padding: 16 }}>Loading…</p>;
  if (which === 'study')
    return (
      <Suspense fallback={loading}>
        <StudyApp />
      </Suspense>
    );
  if (which === 'workbench')
    return (
      <Suspense fallback={loading}>
        <Workbench />
      </Suspense>
    );
  return <LearnApp />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
