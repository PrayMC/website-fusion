import { getMatch } from '@/lib/api';
import { BORDER, card, LOSS, MUTED, PANEL, Pill, WIN } from '@/lib/og';
import type { MatchPlayer } from '@/lib/types';

// as many players a side as fit the card
const MAX_NAMES = 4;

/** A match's preview card: the kit and size, its id, length and arena, and each side's players with their Elo change. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id).catch(() => null);

  if (!match) {
    return new Response(null, { status: 404 });
  }

  const size = match.teams.length > 2
    ? `${match.teams.reduce((n, team) => n + team.players.length, 0)}-player FFA`
    : `${match.teams[0]?.players.length ?? 0}v${match.teams[1]?.players.length ?? 0}`;
  // winners first; an FFA shows the winner against everyone else
  const sides = match.teams.length > 2
    ? [match.teams.filter(team => team.won), match.teams.filter(team => !team.won)].map(group => ({ won: group[0]?.won ?? null, players: group.flatMap(team => team.players) }))
    : [...match.teams].sort((a, b) => Number(b.won) - Number(a.won));
  const result = (won: boolean | null) => (won === null ? ['Draw', MUTED] : won ? ['Victory', WIN] : ['Defeat', LOSS]);

  const player = (p: MatchPlayer) => {
    const change = p.elo && p.elo[1] - p.elo[0];
    return (
      <div key={p.uuid} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src={`https://mc-heads.net/avatar/${p.uuid}/40`} width={40} height={40} style={{ borderRadius: 8 }} alt="" />
        <span style={{ fontSize: 32 }}>{p.name}</span>
        {change !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 30, color: change >= 0 ? WIN : LOSS }}>{`${change >= 0 ? '+' : '−'}${Math.abs(change)}`}</span>
        )}
      </div>
    );
  };

  return card('match',
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 22 }}>
      <div style={{ fontSize: 68, letterSpacing: -2, lineHeight: 1 }}>{`${match.hct ? 'HCT' : match.kit.name} ${size}`}</div>
      <div style={{ display: 'flex', gap: 14 }}>
        <Pill>{`#${match.id.toUpperCase()}`}</Pill>
        <Pill>{`${Math.floor(match.duration / 60)}m ${match.duration % 60}s`}</Pill>
        {match.arena && <Pill>{match.arena}</Pill>}
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 6 }}>
        {sides.slice(0, 2).map((side, index) => {
          const [label, color] = result(side.won);
          return (
            <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, border: `1px solid ${BORDER}`, borderTop: `4px solid ${color}`, borderRadius: 20, background: PANEL, padding: '20px 28px 24px' }}>
              <span style={{ fontSize: 24, color, letterSpacing: 1.5 }}>{label.toUpperCase()}</span>
              {side.players.slice(0, MAX_NAMES).map(player)}
              {side.players.length > MAX_NAMES && <span style={{ fontSize: 26, color: MUTED }}>{`+${side.players.length - MAX_NAMES} more`}</span>}
            </div>
          );
        })}
      </div>
    </div>,
  );
}
