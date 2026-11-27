/** The learning interface (ADR-080): Home, Learning levels, and Level 1 with its four experiments. */
import { useEffect, type ReactElement } from 'react';
import { level1ById } from '../experiments/level1';
import { level2ById } from '../experiments/level2';
import { level3ById } from '../experiments/level3';
import { level4ById } from '../experiments/level4';
import { Experiment01 } from './level1/Experiment01';
import { Experiment02 } from './level1/Experiment02';
import { Experiment03 } from './level1/Experiment03';
import { Experiment04 } from './level1/exp04/Experiment04';
import { L2Experiment01 } from './level2/Experiment01';
import { L2Experiment02 } from './level2/Experiment02';
import { L2Experiment03 } from './level2/exp03/Experiment03';
import { L2Experiment04 } from './level2/exp04/Experiment04';
import { L2Experiment05 } from './level2/exp05/Experiment05';
import { LEVEL_2, LEVEL_3, LEVEL_4 } from './curriculum';
import { Level2Landing } from './pages/Level2Landing';
import { Level3Landing } from './pages/Level3Landing';
import { Level4Landing } from './pages/Level4Landing';
import { L4Experiment01 } from './level4/Experiment01';
import { L4Experiment02 } from './level4/Experiment02';
import { L3Experiment01 } from './level3/Experiment01';
import { L3Experiment02 } from './level3/Experiment02';
import { L3Experiment03 } from './level3/Experiment03';
import { L3Experiment04 } from './level3/Experiment04';
import { Assessment } from './pages/Assessment';
import { Home } from './pages/Home';
import { Level1Landing } from './pages/Level1Landing';
import { Levels } from './pages/Levels';
import { Orientation } from './pages/Orientation';
import { href, useRoute, type Route } from './router';
import { useRun } from './trace/store';
import { crumbs, Shell } from './Shell';
import './learn.css';

const EXPERIMENTS = {
  '01': Experiment01,
  '02': Experiment02,
  '03': Experiment03,
  '04': Experiment04,
} as const;
/** Level 3's experiments, added as each is built. */
const L3_EXPERIMENTS: Record<string, () => ReactElement> = {
  '01': L3Experiment01,
  '02': L3Experiment02,
  '03': L3Experiment03,
  '04': L3Experiment04,
};
const L4_EXPERIMENTS: Record<string, () => ReactElement> = {
  '01': L4Experiment01,
  '02': L4Experiment02,
};
const L2_EXPERIMENTS: Record<string, () => ReactElement> = {
  '01': L2Experiment01,
  '02': L2Experiment02,
  '03': L2Experiment03,
  '04': L2Experiment04,
  '05': L2Experiment05,
};

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case 'home':
      return <Home />;
    case 'levels':
      return <Levels />;
    case 'level':
      return route.level === 4 ? (
        <Level4Landing />
      ) : route.level === 3 ? (
        <Level3Landing />
      ) : route.level === 2 ? (
        <Level2Landing />
      ) : (
        <Level1Landing />
      );
    case 'orientation':
      return <Orientation />;
    case 'assessment':
      return <Assessment />;
    case 'experiment': {
      if (route.level === 4) {
        const C4 = L4_EXPERIMENTS[route.id];
        if (C4 && LEVEL_4.open.has(route.id)) return <C4 key={`l4-${route.id}`} />;
        return <NotFound />;
      }
      if (route.level === 3) {
        const C3 = L3_EXPERIMENTS[route.id];
        if (C3 && LEVEL_3.open.has(route.id)) return <C3 key={`l3-${route.id}`} />;
        return <NotFound />;
      }
      if (route.level === 2) {
        const C2 = L2_EXPERIMENTS[route.id];
        if (C2 && LEVEL_2.open.has(route.id)) return <C2 key={`l2-${route.id}`} />;
        return <NotFound />;
      }
      const C = EXPERIMENTS[route.id as keyof typeof EXPERIMENTS];
      // Keyed by id so leaving an experiment and coming back starts it from its own defaults.
      if (C && level1ById(route.id)) return <C key={route.id} />;
      return <NotFound />;
    }
    case 'notFound':
      return <NotFound />;
  }
}

function NotFound() {
  return (
    <div>
      <h1>Page not found</h1>
      <p>
        There is nothing at this address. <a href={href.level1}>Go to Level 1</a>.
      </p>
    </div>
  );
}

/**
 * Leaving an experiment page releases the shared trace store before the next page renders. Each page also releases it
 * when it unmounts, but React renders the next page first, so without this the next page would see, for one render,
 * the run of the page being left (a 40-example run once crashed Level 1's Experiment 04, which has 4 examples).
 */
function releaseRun(from: Route, to: Route): void {
  if (from.page === 'experiment' && JSON.stringify(from) !== JSON.stringify(to)) useRun.getState().dispose();
}

export function LearnApp() {
  const route = useRoute(releaseRun);
  useEffect(() => {
    const last = crumbs(route).at(-1)?.label ?? '';
    const e =
      route.page === 'experiment'
        ? route.level === 4
          ? level4ById(route.id)
          : route.level === 3
            ? level3ById(route.id)
            : route.level === 2
              ? level2ById(route.id)
              : level1ById(route.id)
        : undefined;
    document.title = e ? `${e.id} ${e.title} · DL-VizLab` : `${last === 'Home' ? 'Learn' : last} · DL-VizLab`;
  }, [route]);
  return (
    <Shell route={route}>
      <Page route={route} />
    </Shell>
  );
}
