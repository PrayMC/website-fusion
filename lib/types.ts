// The shapes the Fusion backend's API returns (Fusion/backend/src)

export type Kit = { id: string; name: string; icon: string };

// hct: whether anyone is on the HCT board, so its tab is worth showing
export type Kits = { kits: Kit[]; hct: boolean };

// banned: on the server's ban list (/ban) now; verified: staff gave them the check badge (/verified)
export type Entry = { rank: number; uuid: string; name: string; elo: number; tier: string; wins: number; losses: number; banned: boolean; verified: boolean };

export type Leaderboard = { kit: string; page: number; pages: number; total: number; entries: Entry[] };

export type SearchHit = { uuid: string; name: string; elo: number };

export type Stats = { elo: number; tier: string; wins: number; losses: number; kills: number; deaths: number };

export type Profile = {
  uuid: string;
  name: string;
  banned: boolean; // on the server's ban list (/ban) now
  verified: boolean; // staff gave them the check badge (/verified)
  global: Stats & { rank: number | null }; // rank: null before the first ranked game
  kits: (Stats & { id: string; name: string; icon: string })[]; // ranked kits they have played, best first
  hct: (Stats & { rank: number | null }) | null; // null for someone who never joined HCT; kills and deaths stay 0
};

type MatchHeader = {
  id: string;
  kit: { id: string; name: string; icon: string };
  hct: boolean;
  ranked: boolean;
  arena: string | null; // null in logs that didn't record one
  endedAt: number; // epoch millis
  duration: number; // seconds
};

/** One of a player's recent matches, from their side. */
// won: null when the match ended without a winner (time limit)
export type MatchSummary = MatchHeader & { won: boolean | null; opponents: string[]; eloChange: number | null };

/** A post-match inventory slot; null is an empty slot. */
export type Item = { id: string; count: number; enchanted: boolean } | null;

export type MatchPlayer = {
  uuid: string;
  name: string;
  hits: number;
  damage: number; // health points dealt
  elo: [number, number] | null; // before, after
  armor: Item[]; // helmet first
  inventory: Item[]; // 36 slots, hotbar first
  offhand: Item; // also null in match logs from before it was stored
};

// teams: two, or one per player in a party FFA
export type MatchDetail = MatchHeader & { startedAt: number; teams: { won: boolean | null; players: MatchPlayer[] }[] };

/** A player's Elo over time on one board (a kit, or HCT): oldest first, epoch millis. */
export type EloBoard = { id: string; name: string; icon: string; points: { at: number; elo: number }[] };

export const GLOBAL = 'GLOBAL';
