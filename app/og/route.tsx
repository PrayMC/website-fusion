import { card, MUTED } from '@/lib/og';

/** The site's own preview card, for every link that names no player or match. */
export function GET() {
  return card('site',
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ fontSize: 120, letterSpacing: -5, lineHeight: 1 }}>Leaderboard</div>
      <div style={{ fontSize: 38, color: MUTED }}>Elo, tiers and match history of every ranked player</div>
    </div>,
  );
}
