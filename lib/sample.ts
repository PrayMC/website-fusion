import { GLOBAL, type EloBoard, type Entry, type Item, type Kit, type Leaderboard, type MatchDetail, type MatchSummary, type Profile, type SearchHit, type Stats } from './types';

// Sample answers in the API's shapes, for FUSION_API_URL=sample or npm run dev without it (see lib/api.ts).
// Seeded and built once at start-up, so every request and every restart sees the same players and matches.

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KITS: Kit[] = [
  { id: 'NoDebuff', name: 'NoDebuff', icon: 'diamond_sword' },
  { id: 'Debuff', name: 'Debuff', icon: 'fermented_spider_eye' },
  { id: 'BuildUHC', name: 'BuildUHC', icon: 'lava_bucket' },
  { id: 'Gapple', name: 'Gapple', icon: 'golden_apple' },
  { id: 'Archer', name: 'Archer', icon: 'bow' },
  { id: 'Axe', name: 'Axe', icon: 'diamond_axe' },
];

// the plugin's default GAMEPLAY.RANKED.TIERS: an Elo up to the bound (inclusive) gets the tier, the last takes the rest
const TIERS: [string, number][] = [['STONE', 900], ['COPPER', 1000], ['IRON', 1100], ['GOLD', 1200], ['DIAMOND', 1300], ['EMERALD', 1400], ['NETHERITE', 1500], ['MASTER', Infinity]];
const tierOf = (elo: number) => TIERS.find(([, max]) => elo <= max)![0];

// a UUID-shaped id from the seeded numbers, like the plugin's player ids
const uuidFrom = (r: () => number) => [8, 4, 4, 4, 12].map(n => Array.from({ length: n }, () => Math.floor(r() * 16).toString(16)).join('')).join('-');

// stats by kit id, plus GLOBAL and (for HCT players) HCT
type Player = { uuid: string; name: string; stats: Record<string, Omit<Stats, 'tier'>> };

const players: Player[] = (() => {
  const r = rng(20261021);
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / Math.sqrt(0.5); };
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const pre = ['Frost', 'Night', 'Lunar', 'Crim', 'Vex', 'Blaze', 'Echo', 'Nova', 'Shadow', 'Kiwi', 'Mint', 'Ruby', 'Iron', 'Sky', 'Storm', 'Toast', 'Pixel', 'Zero', 'Hyun', 'Minjun', 'Jisoo', 'Haru', 'Dal', 'Byeol', 'Sora', 'Ghost', 'Pine', 'Coral', 'Mochi', 'Tofu'];
  const suf = ['', '_', 'x', 'Pvp', '99', 'King', 'KR', 'zz', '_ow', '07', 'Main', 'oo', '2k'];

  // Minecraft names are unique whatever their case, and profiles are looked up ignoring it
  const names: string[] = [];
  const taken = new Set<string>();
  while (names.length < 132) {
    let n = pick(pre) + pick(suf) + (r() < 0.3 ? Math.floor(r() * 100) : '');
    if (r() < 0.2) n = n.toLowerCase();
    if (n.length >= 3 && n.length <= 16 && !taken.has(n.toLowerCase())) {
      taken.add(n.toLowerCase());
      names.push(n);
    }
  }

  return names.map(name => {
    const skill = gauss();
    const stats: Player['stats'] = {};
    for (const kit of KITS) {
      if (r() < 0.22) continue;
      const games = 8 + Math.floor(r() * 170);
      const rate = Math.min(0.97, Math.max(0.08, 0.5 + skill * 0.13 + gauss() * 0.06));
      const wins = Math.round(games * rate);
      const losses = games - wins;
      stats[kit.id] = { elo: Math.round(1000 + skill * 240 + gauss() * 55), wins, losses, kills: wins + Math.floor(r() * wins * 0.4), deaths: losses + Math.floor(r() * losses * 0.4) };
    }
    const kits = Object.values(stats);
    const sum = (f: 'wins' | 'losses' | 'kills' | 'deaths') => kits.reduce((a, s) => a + s[f], 0);
    // GLOBAL averages every ranked kit, counting unplayed ones at the default 1000, with the plugin's integer division
    const globalElo = Math.trunc((kits.reduce((a, s) => a + s.elo, 0) + (KITS.length - kits.length) * 1000) / KITS.length);
    stats[GLOBAL] = { elo: globalElo, wins: sum('wins'), losses: sum('losses'), kills: sum('kills'), deaths: sum('deaths') };
    if (r() < 0.35) {
      const games = 4 + Math.floor(r() * 60), wins = Math.round(games * Math.min(0.9, Math.max(0.1, 0.5 + skill * 0.1 + gauss() * 0.08)));
      stats.HCT = { elo: Math.round(1000 + skill * 200 + gauss() * 45), wins, losses: games - wins, kills: 0, deaths: 0 };
    }
    return { uuid: uuidFrom(r), name, stats };
  });
})();

const leaderboardOrder = (kit: string) => players
  .filter(p => p.stats[kit] && p.stats[kit].wins + p.stats[kit].losses > 0)
  .sort((a, b) => b.stats[kit].elo - a.stats[kit].elo || a.name.localeCompare(b.name));

function leaderboard(kit: string, page: number): Leaderboard | null {
  if (kit !== GLOBAL && kit !== 'HCT' && !KITS.some(k => k.id === kit)) return null;

  const board = leaderboardOrder(kit);
  const pages = Math.max(1, Math.ceil(board.length / 50));
  page = Math.min(Math.max(1, page), pages);

  const entries: Entry[] = board.slice((page - 1) * 50, page * 50).map((p, i) => ({
    rank: (page - 1) * 50 + i + 1, uuid: p.uuid, name: p.name, elo: p.stats[kit].elo, tier: tierOf(p.stats[kit].elo),
    wins: p.stats[kit].wins, losses: p.stats[kit].losses, banned: BANNED.has(p.uuid), verified: VERIFIED.has(p.uuid),
  }));
  return { kit, page, pages, total: board.length, entries };
}

function search(q: string): SearchHit[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  return players
    .filter(p => p.name.toLowerCase().includes(term))
    .sort((a, b) => a.name.toLowerCase().indexOf(term) - b.name.toLowerCase().indexOf(term) || b.stats[GLOBAL].elo - a.stats[GLOBAL].elo)
    .slice(0, 10)
    .map(p => ({ uuid: p.uuid, name: p.name, elo: p.stats[GLOBAL].elo }));
}

// a few sample players on the ban list, so the site shows how a banned player looks
const BANNED = new Set(players.filter((_, i) => i % 23 === 5).map(p => p.uuid));
// and a few with the verified badge
const VERIFIED = new Set(players.filter((_, i) => i % 9 === 0).map(p => p.uuid));

function profile(nameOrUuid: string): Profile | null {
  const p = players.find(p => p.uuid === nameOrUuid) ?? players.find(p => p.name.toLowerCase() === nameOrUuid.toLowerCase());
  if (!p) return null;
  const withTier = (s: Omit<Stats, 'tier'>): Stats => ({ ...s, tier: tierOf(s.elo) });
  const ranked = (board: string) => { const rank = leaderboardOrder(board).indexOf(p); return { ...withTier(p.stats[board]), rank: rank < 0 ? null : rank + 1 }; };
  return {
    uuid: p.uuid, name: p.name, banned: BANNED.has(p.uuid), verified: VERIFIED.has(p.uuid),
    global: ranked(GLOBAL),
    kits: KITS.filter(k => p.stats[k.id]).sort((a, b) => p.stats[b.id].elo - p.stats[a.id].elo)
      .map(k => ({ ...withTier(p.stats[k.id]), id: k.id, name: k.name, icon: k.icon })),
    hct: p.stats.HCT ? ranked('HCT') : null,
  };
}

// ---- matches: built once, each listed for everyone who played in it, the ten newest per player ----

const matchesById = new Map<string, MatchDetail>();
const matchesByPlayer = new Map<string, MatchDetail[]>();
// a fixed clock, so match times and links stay the same across restarts
const NOW = Date.UTC(2026, 9, 21, 12);
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const ARENAS = ['Sakura', 'Desert Ruins', 'Nether Gate', 'Frost Keep', 'Colosseum', 'Mushroom Isle'];

function inventory(kit: string, won: boolean, r: () => number): Item[] {
  const inv: Item[] = Array(36).fill(null);
  const put = (slot: number, id: string, count = 1, enchanted = false) => { inv[slot] = { id, count, enchanted }; };
  const pots = won ? 4 + Math.floor(r() * 16) : Math.floor(r() * 3);
  switch (kit) {
    case 'NoDebuff': case 'Debuff': case 'HCT':
      put(0, 'diamond_sword', 1, true); put(1, 'ender_pearl', Math.max(1, Math.floor(r() * 16))); put(8, 'cooked_beef', 40 + Math.floor(r() * 24));
      if (kit === 'Debuff') put(2, 'fermented_spider_eye', 3);
      for (let i = 9; i < 36 && pots > i - 9; i++) put(i, 'splash_potion');
      break;
    case 'Gapple': put(0, 'diamond_sword', 1, true); put(1, 'golden_apple', won ? 8 + Math.floor(r() * 40) : 1); put(8, 'cooked_beef', 64); break;
    case 'BuildUHC': put(0, 'diamond_sword', 1, true); put(1, 'fishing_rod'); put(2, 'bow', 1, true); put(3, 'lava_bucket'); put(4, 'water_bucket'); put(5, 'golden_apple', Math.floor(r() * 6) + 1); put(9, 'arrow', 8 + Math.floor(r() * 24)); break;
    case 'Archer': put(0, 'bow', 1, true); put(1, 'cooked_beef', 64); put(9, 'arrow', 10 + Math.floor(r() * 54)); break;
    default: put(0, 'diamond_axe', 1, true); put(8, 'cooked_beef', 64);
  }
  return inv;
}

function playMatches(p: Player) {
  const r = rng(hash(p.uuid));
  const played = KITS.filter(k => p.stats[k.id]);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  let at = NOW - r() * 40 * 60_000;

  for (let i = 0; i < 10 && (played.length || p.stats.HCT); i++) {
    const hct = !!p.stats.HCT && (!played.length || r() < 0.2);
    const kit = hct ? { id: 'HCFTeamFight', name: 'HCF Team Fight', icon: 'beacon' } : pick(played);
    // opponents who play that kit (or HCT), so their own records back the match up
    const pool = players.filter(o => o !== p && o.stats[hct ? 'HCT' : kit.id]).sort(() => r() - 0.5);
    if (pool.length < (hct ? 9 : 1)) continue;
    // a party FFA: one team per player, never ranked
    const ffa = !hct && pool.length >= 5 && r() < 0.1;
    const teams = hct ? [[p, ...pool.slice(0, 4)], pool.slice(4, 9)] : ffa ? [p, ...pool.slice(0, 2 + Math.floor(r() * 4))].map(q => [q]) : [[p], [pool[0]]];
    const eloOf = (q: Player) => (hct ? q.stats.HCT : q.stats[kit.id])?.elo ?? 1000;
    const avg = (team: Player[]) => team.reduce((a, q) => a + eloOf(q), 0) / team.length;
    const won = r() < 1 / (1 + 10 ** ((avg(teams[1]) - avg(teams[0])) / 400));
    const draw = !hct && r() < 0.05; // hit the time limit: no winner, no Elo change
    const winner = draw ? -1 : ffa ? Math.floor(r() * teams.length) : won ? 0 : 1;
    const ranked = !ffa && (hct || r() < 0.75);
    const gain = Math.round(8 + r() * 16);
    const duration = hct ? 240 + Math.floor(r() * 660) : 35 + Math.floor(r() * 230);
    const id = Array.from({ length: 8 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(r() * 36)]).join(''); // like the plugin's match ids

    const match: MatchDetail = {
      id, kit, hct, ranked, arena: pick(ARENAS), endedAt: Math.round(at), startedAt: Math.round(at - duration * 1000), duration,
      teams: teams.map((team, side) => {
        const teamWon = winner < 0 ? null : side === winner;
        return {
          won: teamWon,
          players: team.map(q => {
            const hits = 18 + Math.floor(r() * (hct ? 260 : 120));
            const before = eloOf(q);
            return {
              uuid: q.uuid, name: q.name, hits, damage: Math.round(hits * (1.6 + r() * 2.4) * 10) / 10,
              elo: ranked && !draw ? [before, before + (teamWon ? gain : -gain)] as [number, number] : null,
              armor: ['helmet', 'chestplate', 'leggings', 'boots'].map(piece => ({ id: `diamond_${piece}`, count: 1, enchanted: true })),
              inventory: inventory(kit.id, !!teamWon, r),
              offhand: r() < 0.5 ? { id: 'golden_apple', count: 1 + Math.floor(r() * 8), enchanted: false } : null,
            };
          }),
        };
      }),
    };
    matchesById.set(id, match);
    for (const q of teams.flat()) {
      if (!matchesByPlayer.has(q.uuid)) matchesByPlayer.set(q.uuid, []);
      matchesByPlayer.get(q.uuid)!.push(match);
    }
    at -= (25 + r() * 900) * 60_000;
  }
}

players.forEach(playMatches);
// every match each played, oldest first, for their Elo history (eloHistory); the lists below keep the ten newest
const allMatchesOf = new Map([...matchesByPlayer].map(([uuid, list]) => [uuid, [...list].sort((a, b) => a.endedAt - b.endedAt)]));
matchesByPlayer.forEach((list, uuid) => matchesByPlayer.set(uuid, list.sort((a, b) => b.endedAt - a.endedAt).slice(0, 10)));

// like the backend's eloHistory (Fusion/backend/src/matches.ts): solo ranked per kit and HCT, the latest board first
function eloHistory(uuid: string): { boards: EloBoard[] } {
  const boards = new Map<string, EloBoard>();
  for (const m of allMatchesOf.get(uuid) ?? []) {
    const team = m.teams.find(t => t.players.some(q => q.uuid === uuid))!;
    const elo = team.players.find(q => q.uuid === uuid)!.elo;
    if (!elo || (!m.hct && team.players.length !== 1)) continue;
    const kit = m.hct ? { id: 'HCT', name: 'HCT', icon: 'beacon' } : m.kit;
    const board = boards.get(kit.id) ?? { ...kit, points: [] };
    if (board.points.at(-1)?.elo !== elo[0]) board.points.push({ at: m.startedAt, elo: elo[0] });
    board.points.push({ at: m.endedAt, elo: elo[1] });
    boards.delete(kit.id);
    boards.set(kit.id, board);
  }
  return { boards: [...boards.values()].reverse() };
}

// like the plugin: an unknown player simply has no matches
function recent(uuid: string): MatchSummary[] {
  return (matchesByPlayer.get(uuid) ?? []).map(({ teams, startedAt, ...header }) => {
    const side = teams.findIndex(team => team.players.some(q => q.uuid === uuid));
    const me = teams[side].players.find(q => q.uuid === uuid)!;
    // like MatchHistory.opponents: everyone on the other teams
    const opponents = teams.filter((_, i) => i !== side).flatMap(team => team.players.map(q => q.name));
    return { ...header, won: teams[side].won, opponents, eloChange: me.elo ? me.elo[1] - me.elo[0] : null };
  });
}

const match = (id: string): MatchDetail | null => matchesById.get(id) ?? null;

// Java's Integer.parseInt with a fallback, as the API reads ?page=: "2.5", "1e1" or 99999999999 give the fallback
function intOr(raw: string | null, fallback: number) {
  const n = raw !== null && /^[+-]?\d+$/.test(raw) ? Number(raw) : NaN;
  return Number.isInteger(n) && Math.abs(n) <= 2 ** 31 - 1 ? n : fallback;
}

/** Answers an API path ("/api/leaderboard?kit=GLOBAL&page=2") from the sample players, or null for a 404. */
export function sample(path: string): unknown {
  const url = new URL(path, 'http://sample');
  switch (url.pathname) {
    case '/api/kits': return { kits: KITS, hct: leaderboardOrder('HCT').length > 0 };
    case '/api/leaderboard': return leaderboard(url.searchParams.get('kit') ?? GLOBAL, intOr(url.searchParams.get('page'), 1));
    case '/api/search': return search(url.searchParams.get('q') ?? '');
    default: {
      // the same routes as the backend (Fusion/backend/src/index.ts): /api/players/<x>, /api/players/<uuid>/matches,
      // /api/matches/<id>, /api/known/<uuid>
      const [, , kind, ...rest] = url.pathname.split('/').map(decodeURIComponent);
      if (kind === 'players' && rest.length === 1 && rest[0]) return profile(rest[0]);
      if (kind === 'players' && rest.length === 2 && rest[1] === 'matches') return recent(rest[0]);
      if (kind === 'players' && rest.length === 2 && rest[1] === 'elo') return eloHistory(rest[0]);
      if (kind === 'matches' && rest.length === 1 && rest[0]) return match(rest[0]);
      if (kind === 'known' && rest.length === 1) return players.some(p => p.uuid === rest[0]) ? { known: true } : null;
      return null;
    }
  }
}
