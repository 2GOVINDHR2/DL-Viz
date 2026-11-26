/**
 * A hash router for the learning interface. Routes are `#/…`, so the static build works from any sub-path and the
 * existing entry points keep their URLs: the workbench (`?mode=novice|expert` or `#/workbench`) and Study Mode
 * (`#study`).
 */
import { useEffect, useRef, useState } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'levels' }
  | { page: 'level'; level: 1 | 2 | 3 }
  | { page: 'orientation' }
  | { page: 'experiment'; level: 1 | 2 | 3; id: string }
  | { page: 'assessment' }
  | { page: 'notFound'; path: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  if (path === '/' || path === '') return { page: 'home' };
  if (path === '/levels') return { page: 'levels' };
  if (path === '/level-1') return { page: 'level', level: 1 };
  if (path === '/level-1/orientation') return { page: 'orientation' };
  if (path === '/level-1/assessment') return { page: 'assessment' };
  if (path === '/level-2') return { page: 'level', level: 2 };
  if (path === '/level-3') return { page: 'level', level: 3 };
  const m = /^\/level-([123])\/experiment-(\d\d)$/.exec(path);
  if (m) return { page: 'experiment', level: Number(m[1]) as 1 | 2 | 3, id: m[2] };
  return { page: 'notFound', path };
}

export const href = {
  home: '#/',
  levels: '#/levels',
  level1: '#/level-1',
  orientation: '#/level-1/orientation',
  assessment: '#/level-1/assessment',
  experiment: (id: string) => `#/level-1/experiment-${id}`,
  level2: '#/level-2',
  level2Experiment: (id: string) => `#/level-2/experiment-${id}`,
  level3: '#/level-3',
  level3Experiment: (id: string) => `#/level-3/experiment-${id}`,
  /** The full workbench (Levels 2+ and expert inspection). A real navigation: it is a separate application. */
  workbench: '?mode=novice',
};

/**
 * The current route. `onLeave` runs when the route is about to change, before the new page renders, so a page can
 * release shared state that the next page must not see (ADR-095).
 */
export function useRoute(onLeave?: (from: Route, to: Route) => void): Route {
  const [route, setRoute] = useState(() => {
    const h = globalThis.location?.hash ?? '';
    return parseRoute(h.startsWith('#/') ? h : '');
  });
  const current = useRef(route);
  const leave = useRef(onLeave);
  leave.current = onLeave;
  useEffect(() => {
    const f = (): void => {
      const h = window.location.hash;
      // In-page anchors (`#primer`) are not routes: the page stays where it is.
      if (h && !h.startsWith('#/')) return;
      const next = parseRoute(h);
      leave.current?.(current.current, next);
      current.current = next;
      setRoute(next);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return route;
}
