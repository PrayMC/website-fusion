// The popups' API answers, kept a few seconds in the browser (POPUP_SECONDS, lib/keep.ts): a popup reopened or reached
// by Back shows at once, and a match played since shows when it's opened again a little later

import { POPUP_SECONDS } from './keep';

export type Loaded<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'missing' } | { status: 'failed' };

const KEEP_MS = POPUP_SECONDS * 1000;

type Kept = { at: number; answer: Promise<Loaded<unknown>>; value?: Loaded<unknown> };
const kept = new Map<string, Kept>();

const fresh = (entry: Kept | undefined) => entry && Date.now() - entry.at < KEEP_MS;

/** The answer for an API path: the one still kept, else a new request (one at a time per path). */
export function load<T>(path: string): Promise<Loaded<T>> {
  const entry = kept.get(path);
  if (fresh(entry)) return entry!.answer as Promise<Loaded<T>>;

  // what ran out goes, so the map holds only the paths still kept
  for (const [key, old] of kept) if (!fresh(old)) kept.delete(key);

  const next: Kept = {
    at: Date.now(),
    answer: fetch(path)
      .then(async (res): Promise<Loaded<unknown>> => (res.ok ? { status: 'ready', data: await res.json() } : { status: res.status === 404 ? 'missing' : 'failed' }))
      .catch((): Loaded<unknown> => ({ status: 'failed' })),
  };
  next.answer.then(value => {
    next.value = value;
    // a failure isn't kept: opening it again asks again
    if (value.status === 'failed' && kept.get(path) === next) kept.delete(path);
  });
  kept.set(path, next);
  return next.answer as Promise<Loaded<T>>;
}

/** The kept answer if it already arrived, for a popup to show it on its first paint rather than "loading". */
export function peek<T>(path: string): Loaded<T> | undefined {
  const entry = kept.get(path);
  return fresh(entry) ? (entry!.value as Loaded<T> | undefined) : undefined;
}
