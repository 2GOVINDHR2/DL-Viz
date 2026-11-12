/** Suggested open-ended challenges. A challenge is ticked once the learner has done the action it suggests. */
import { useState } from 'react';
import type { Challenge } from '../../experiments/level1';
import { matches, useSignals } from '../signals';

export function ExplorationChallenges({ challenges }: { challenges: Challenge[] }) {
  const [tried, setTried] = useState<Record<string, boolean>>({});
  useSignals((name) => {
    const hit = challenges.filter((c) => c.doneOn && !tried[c.id] && matches(c.doneOn, name));
    if (hit.length) setTried((t) => ({ ...t, ...Object.fromEntries(hit.map((c) => [c.id, true])) }));
  });
  return (
    <ul className="lv-challenges">
      {challenges.map((c) => (
        <li key={c.id} className="lv-challenge" data-done={tried[c.id] ? 'true' : 'false'}>
          <h3>{c.title}</h3>
          <p>{c.prompt}</p>
          <p className="lv-small lv-muted">
            <strong>Notice:</strong> {c.notice}
          </p>
          <p className="lv-challenge-state">{tried[c.id] ? 'Tried' : 'Not tried yet'}</p>
        </li>
      ))}
    </ul>
  );
}
