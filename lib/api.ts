import { CACHED_PAGES, keepSeconds, outlived } from './keep';
import { sample } from './sample';
import type { Kits, Leaderboard, MatchDetail, Profile } from './types';

// The backend's address (server-side only). "sample", or none in development, uses the sample players; production
// without it shows "can't load" rather than made-up rankings.
const configured = process.env.FUSION_API_URL?.replace(/\/+$/, ''); // "https://host/" would ask for //api/...
export const usingSample = configured === 'sample' || (!configured && process.env.NODE_ENV === 'development');

// a backend or database that hangs shouldn't hang the website with it
const TIMEOUT_MS = 5000;

// the commit this site was built from (Vercel sets it), sent along so it is part of each answer's key in Next's data
// cache: that cache outlives deployments, and new code must not read answers kept in the shape the old code asked for
const BUILD = process.env.VERCEL_GIT_COMMIT_SHA;

/** Fetches an API path ("/api/kits") from the backend, or from the sample players. */
export async function fetchApi(path: string, init: RequestInit = {}): Promise<Response> {
  if (usingSample) {
    const body = sample(path);
    return body === null ? Response.json({ error: 'not found' }, { status: 404 }) : Response.json(body);
  }
  if (!configured) throw new Error('FUSION_API_URL is not set');
  // the backend's API_TOKEN, so only this server can call it
  const headers: Record<string, string> = {};
  if (process.env.FUSION_API_TOKEN) headers.Authorization = `Bearer ${process.env.FUSION_API_TOKEN}`;
  if (BUILD) headers['X-Site-Build'] = BUILD;
  return fetch(configured + path, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

/** An API answer, kept in Next's data cache `seconds` (as lib/keep.ts allows, 0: not kept), or null for a 404. */
async function get<T>(path: string, seconds = keepSeconds(path.split('?')[0])): Promise<T | null> {
  let res = await fetchApi(path, seconds ? { next: { revalidate: seconds } } : { cache: 'no-store' });
  // Next hands back an answer past its time while it refreshes it in the background, and keeps handing it back while
  // the backend fails: one older than allowed is asked for again now, so an outage shows as one, not as an old board
  if (seconds && outlived(res.headers.get('date'), seconds)) {
    res = await fetchApi(path, { cache: 'no-store' });
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Fusion API answered ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

export const getKits = () => get<Kits>('/api/kits');

export const getProfile = (player: string) => get<Profile>(`/api/players/${encodeURIComponent(player)}`);

export const getMatch = (id: string) => get<MatchDetail>(`/api/matches/${encodeURIComponent(id)}`);

// pages past the first few aren't kept: any number may be asked for, and each would be kept under its own address
export const getLeaderboard = (kit: string, page: number) =>
  get<Leaderboard>(`/api/leaderboard?kit=${encodeURIComponent(kit)}&page=${page}`, page <= CACHED_PAGES ? undefined : 0);
