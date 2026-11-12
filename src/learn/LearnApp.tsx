/** The learning interface (ADR-080): Home, Learning levels, and Level 1 with its four experiments. */
import { useEffect } from 'react';
import { level1ById } from '../experiments/level1';
import { Experiment01 } from './level1/Experiment01';
import { Experiment02 } from './level1/Experiment02';
import { Experiment03 } from './level1/Experiment03';
import { Experiment04 } from './level1/exp04/Experiment04';
import { Assessment } from './pages/Assessment';
import { Home } from './pages/Home';
import { Level1Landing } from './pages/Level1Landing';
import { Levels } from './pages/Levels';
import { Orientation } from './pages/Orientation';
import { href, useRoute, type Route } from './router';
import { crumbs, Shell } from './Shell';
import './learn.css';

const EXPERIMENTS = {
  '01': Experiment01,
  '02': Experiment02,
  '03': Experiment03,
  '04': Experiment04,
} as const;

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case 'home':
      return <Home />;
    case 'levels':
      return <Levels />;
    case 'level':
      return <Level1Landing />;
    case 'orientation':
      return <Orientation />;
    case 'assessment':
      return <Assessment />;
    case 'experiment': {
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

export function LearnApp() {
  const route = useRoute();
  useEffect(() => {
    const last = crumbs(route).at(-1)?.label ?? '';
    const e = route.page === 'experiment' ? level1ById(route.id) : undefined;
    document.title = e ? `${e.id} ${e.title} · DL-VizLab` : `${last === 'Home' ? 'Learn' : last} · DL-VizLab`;
  }, [route]);
  return (
    <Shell route={route}>
      <Page route={route} />
    </Shell>
  );
}
