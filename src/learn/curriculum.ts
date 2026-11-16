/**
 * A level as the shared pages see it (ADR-087): its experiments in order, where each lives, which are open, and the
 * keys its session status uses. The experiment layout, the router and the landing pages read this, so Level 2
 * reuses Level 1's pages without copying them. Level 1's URLs and status keys are unchanged.
 */
import { LEVEL1_EXPERIMENTS, type LessonExperiment } from '../experiments/level1';
import { LEVEL2_EXPERIMENTS } from '../experiments/level2';
import { href } from './router';

export interface LevelDescriptor {
  number: 1 | 2;
  experiments: LessonExperiment[];
  /** Experiments that can be opened; the rest are listed as in preparation. */
  open: ReadonlySet<string>;
  experimentHref(id: string): string;
  /** Session-status key of an experiment. Level 1 keeps its plain ids. */
  statusKey(id: string): string;
  /** Where "previous" leads from the first experiment, and "next" from the last open one. */
  before: { label: string; href: string };
  after: { label: string; href: string };
}

export const LEVEL_1: LevelDescriptor = {
  number: 1,
  experiments: LEVEL1_EXPERIMENTS,
  open: new Set(LEVEL1_EXPERIMENTS.map((e) => e.id)),
  experimentHref: href.experiment,
  statusKey: (id) => id,
  before: { label: 'Orientation', href: href.orientation },
  after: { label: 'Level 1 assessment', href: href.assessment },
};

export const LEVEL_2: LevelDescriptor = {
  number: 2,
  experiments: LEVEL2_EXPERIMENTS,
  // Stage 2 of the Level 2 plan: Experiments 01 and 02. The others open as their stages are reviewed.
  open: new Set(['01', '02']),
  experimentHref: href.level2Experiment,
  statusKey: (id) => `l2:${id}`,
  before: { label: 'Level 2 overview', href: href.level2 },
  after: { label: 'Level 2 overview', href: href.level2 },
};

export const levelOf = (n: 1 | 2): LevelDescriptor => (n === 1 ? LEVEL_1 : LEVEL_2);
