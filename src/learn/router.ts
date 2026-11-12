/**
 * A hash router for the learning interface. Routes are `#/…`, so the static build works from any sub-path and the
 * existing entry points keep their URLs: the workbench (`?mode=novice|expert` or `#/workbench`) and Study Mode
 * (`#study`).
 */
import { useEffect, useState } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'levels' }
  | { page: 'level'; level: 1 }
  | { page: 'orientation' }
  | { page: 'experiment'; id: string }
  | { page: 'assessment' }
  | { page: 'notFound'; path: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  if (path === '/' || path === '') return { page: 'home' };
  if (path === '/levels') return { page: 'levels' };
  if (path === '/level-1') return { page: 'level', level: 1 };
  if (path === '/level-1/orientation') return { page: 'orientation' };
  if (path === '/level-1/assessment') return { page: 'assessment' };
  const m = /^\/level-1\/experiment-(\d\d)$/.exec(path);
  if (m) return { page: 'experiment', id: m[1] };
  return { page: 'notFound', path };
}

export const href = {
  home: '#/',
  levels: '#/levels',
  level1: '#/level-1',
  orientation: '#/level-1/orientation',
  assessment: '#/level-1/assessment',
  experiment: (id: string) => `#/level-1/experiment-${id}`,
  /** The full workbench (Levels 2+ and expert inspection). A real navigation: it is a separate application. */
  workbench: '?mode=novice',
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => {
    const h = globalThis.location?.hash ?? '';
    return parseRoute(h.startsWith('#/') ? h : '');
  });
  useEffect(() => {
    const f = (): void => {
      const h = window.location.hash;
      // In-page anchors (`#primer`) are not routes: the page stays where it is.
      if (h && !h.startsWith('#/')) return;
      setRoute(parseRoute(h));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return route;
}
