// Every cache time on the site, in seconds: how late each kind of data may show, split across Hyperdrive, Next's data
// cache or the CDN, and the browser's router cache. Change them only here. No imports: next.config.ts reads this.

// what may lag, and by how much
const BOARD_LAG = 300; // boards and search
const KIT_LAG = 3_600; // the kit list, edited rarely, by an admin
// a player's profile, match list and Elo history: at once (not kept on the server; the browser and Hyperdrive below)

// what never changes once it's there
const MATCH = 86_400; // a match log, and its preview card
const TEXTURE = 31_536_000; // a fixed game version's item and block textures
const SKIN = 86_400; // a skin, which the player can change on Mojang's side
const UNKNOWN_SKIN = 300; // no skin yet for a player the server hasn't seen: they may join any moment

// the caches on the way
const HYPERDRIVE = 60; // its default max age
/** How long a page already seen shows again at once on its tab (next.config.ts staleTimes). */
export const ROUTER_SECONDS = 30;
/** How long the browser keeps a popup's answer (lib/answers.ts), so one reopened or reached by Back shows at once. */
export const POPUP_SECONDS = 10;

/** Preview cards (lib/og.tsx): a player's shows their Elo, so it follows the profile but for the cost of drawing it. */
export const CARD_SECONDS = { player: 60, match: MATCH, site: 3_600 };

// 0 (not kept) for a budget the other caches already use up
const serverShare = (lag: number) => Math.max(0, lag - HYPERDRIVE - ROUTER_SECONDS);

/** Whether an answer dated `date` (its Date header) is older than `seconds` allow; an undated one never is. */
export const outlived = (date: string | null, seconds: number, now = Date.now()) => now - Date.parse(date ?? '') > seconds * 1000;

/** Board pages kept in the data cache (lib/api.ts): the first few, which most visits read. */
export const CACHED_PAGES = 20;

/**
 * How many seconds the server and the CDN may reuse an API answer for a path ("/api/leaderboard", no query), 0 for
 * never. Only 200 answers are kept, so a match not found yet is asked again.
 */
export function keepSeconds(path: string): number {
  if (/^\/api\/matches\/[^/]+$/.test(path)) return MATCH;
  if (path === '/api/kits') return serverShare(KIT_LAG);
  if (/^\/api\/(leaderboard|search)$/.test(path)) return serverShare(BOARD_LAG);
  return 0;
}

/** The Cache-Control for an /api answer on Vercel's CDN, null to keep it nowhere: an error or a 404 is never kept. */
export function cacheControl(path: string, status: number): string | null {
  const seconds = status === 200 ? keepSeconds(path) : 0;
  return seconds ? `public, s-maxage=${seconds}` : null;
}

/** How long a picture of this kind (lib/pictures.ts) is kept, here and in browsers; `known`: the player has been seen. */
export const pictureSeconds = (kind: string, known = true) =>
  kind === 'item' || kind === 'block' ? TEXTURE : known ? SKIN : UNKNOWN_SKIN;
