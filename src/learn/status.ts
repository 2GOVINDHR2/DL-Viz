/**
 * Session-local status for the Level 1 path: which pages were opened and whose knowledge check was answered. It
 * lives in sessionStorage, so it lasts for the browser tab only. It is not a progress record and nothing leaves
 * the browser.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'dl-vizlab.level1.session.v1';
export type Status = 'new' | 'visited' | 'checked';
type State = Record<string, Status>;

let state: State = read();
const subs = new Set<() => void>();

function read(): State {
  try {
    return JSON.parse(globalThis.sessionStorage?.getItem(KEY) ?? '{}') as State;
  } catch {
    return {};
  }
}

function write(next: State): void {
  state = next;
  try {
    globalThis.sessionStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private windows); the status then lasts for this page only.
  }
  for (const s of subs) s();
}

const RANK: Record<Status, number> = { new: 0, visited: 1, checked: 2 };

export function mark(id: string, s: Exclude<Status, 'new'>): void {
  if (RANK[s] > RANK[state[id] ?? 'new']) write({ ...state, [id]: s });
}

export function useStatus(id: string): Status {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state[id] ?? 'new',
    () => 'new',
  );
}

export const STATUS_TEXT: Record<Status, string> = {
  new: 'Not started',
  visited: 'Opened',
  checked: 'Check answered',
};
