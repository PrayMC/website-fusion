import VerifiedBadge from '@/components/VerifiedBadge';
import { getProfile } from '@/lib/api';
import { UUID } from '@/lib/images';
import { card, LOSS, MUTED, WIN, number, Pill, Stat, TIER_COLORS, tierName } from '@/lib/og';

/** A player's preview card: their skin, name, tier and rank, and their Elo, record, win rate and K/D. */
export async function GET(_: Request, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const profile = UUID.test(uuid) ? await getProfile(uuid).catch(() => null) : null;

  if (!profile) {
    return new Response(null, { status: 404 });
  }

  const g = profile.global;
  const games = g.wins + g.losses;
  const tier = TIER_COLORS[g.tier] ?? MUTED;

  return card('player',
    <div style={{ display: 'flex', alignItems: 'center', gap: 56, width: '100%' }}>
      {/* the skin in a glow of the tier's color, no frame; a known player (they have a profile), so the host is asked directly */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 250, height: 400, backgroundImage: `radial-gradient(120px 195px at 50% 50%, ${tier}33, transparent)` }}>
        <img src={`https://mc-heads.net/body/${profile.uuid}/300`} width={165} height={330} alt="" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 22 }}>
        {/* a name up to Minecraft's 16 characters still fits beside the skin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: profile.name.length > 11 ? 68 : 92, letterSpacing: -3, lineHeight: 1, textDecoration: profile.banned ? 'line-through' : 'none', opacity: profile.banned ? 0.5 : 1 }}>
            {profile.name}
          </div>
          {profile.verified && <VerifiedBadge size={profile.name.length > 11 ? 44 : 56} color={WIN} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {g.tier && <Pill color={tier}>{tierName(g.tier)}</Pill>}
          {g.rank && <Pill>{`#${number(g.rank)} overall`}</Pill>}
          {profile.banned && <Pill color={LOSS}>Banned</Pill>}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          <Stat label="Elo" value={number(g.elo)} />
          <Stat label="Win rate" value={`${games ? Math.round((g.wins / games) * 100) : 0}%`} sub={`${number(g.wins)}W ${number(g.losses)}L`} />
          <Stat label="K/D" value={(g.kills / Math.max(g.deaths, 1)).toFixed(2)} />
        </div>
      </div>
    </div>,
  );
}
