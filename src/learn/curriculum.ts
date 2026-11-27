/**
 * A level as the shared pages see it (ADR-087): its experiments in order, where each lives, which are open, and the
 * keys its session status uses. The experiment layout, the router and the landing pages read this, so Level 2
 * reuses Level 1's pages without copying them. Level 1's URLs and status keys are unchanged.
 */
import { LEVEL1_EXPERIMENTS, type LessonExperiment } from '../experiments/level1';
import { LEVEL2_EXPERIMENTS } from '../experiments/level2';
import { LEVEL3_EXPERIMENTS } from '../experiments/level3';
import { LEVEL4_EXPERIMENTS } from '../experiments/level4';
import { href } from './router';

export interface LevelDescriptor {
  number: 1 | 2 | 3 | 4;
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
  // Stages 2–5 of the Level 2 plan: Experiments 01–05. The final challenge (Stage 6) is added to Experiment 05.
  open: new Set(['01', '02', '03', '04', '05']),
  experimentHref: href.level2Experiment,
  statusKey: (id) => `l2:${id}`,
  before: { label: 'Level 2 overview', href: href.level2 },
  after: { label: 'Level 2 overview', href: href.level2 },
};

export const LEVEL_3: LevelDescriptor = {
  number: 3,
  experiments: LEVEL3_EXPERIMENTS,
  // Opened as each experiment is built (the overnight Level 3 run; reports/LEVEL3-RESUME.md).
  open: new Set<string>(['01', '02', '03', '04']),
  experimentHref: href.level3Experiment,
  statusKey: (id) => `l3:${id}`,
  before: { label: 'Level 3 overview', href: href.level3 },
  after: { label: 'Level 3 overview', href: href.level3 },
};

export const LEVEL_4: LevelDescriptor = {
  number: 4,
  experiments: LEVEL4_EXPERIMENTS,
  // Opened as each experiment is built (reports/LEVEL4-RESUME.md).
  open: new Set<string>(['01', '02', '03', '04', '05', '06']),
  experimentHref: href.level4Experiment,
  statusKey: (id) => `l4:${id}`,
  before: { label: 'Level 4 overview', href: href.level4 },
  after: { label: 'Level 4 overview', href: href.level4 },
};

export const levelOf = (n: 1 | 2 | 3 | 4): LevelDescriptor =>
  n === 1 ? LEVEL_1 : n === 2 ? LEVEL_2 : n === 3 ? LEVEL_3 : LEVEL_4;
