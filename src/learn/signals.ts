/**
 * Interaction signals: an experiment announces what the learner just did ("weight-zero", "activation:relu"), and the
 * guided tour and the exploration challenges listen. That lets a tour step advance on the action itself rather than
 * on a timer. Signals carry no values and change no state.
 */
import { useEffect, useRef } from 'react';

type Listener = (name: string) => void;
const listeners = new Set<Listener>();

export function signal(name: string): void {
  for (const l of [...listeners]) l(name);
}

export function useSignals(onSignal: Listener): void {
  const ref = useRef(onSignal);
  useEffect(() => {
    ref.current = onSignal;
  });
  useEffect(() => {
    const l: Listener = (n) => ref.current(n);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
}

/** True when `name` satisfies a pattern: exact, or a prefix ending in ':*'. */
export const matches = (pattern: string, name: string): boolean =>
  pattern.endsWith(':*') ? name.startsWith(pattern.slice(0, -1)) : pattern === name;
