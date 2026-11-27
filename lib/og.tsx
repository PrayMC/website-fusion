import { ImageResponse } from 'next/og';
import type { ReactNode } from 'react';
import { CARD_SECONDS } from './keep';

// Link preview cards, 1200x630 in the site's dark look, kept CARD_SECONDS. next/og's only font is Geist Regular (Latin,
// one weight), so they're in English, weighted by size and color, without other scripts.

/** The tier colors of the dark theme (--tier-* under .dark in app/globals.css), for the dark cards. */
export const TIER_COLORS: Record<string, string> = {
  STONE: '#d6dde6', COPPER: '#ff8a4c', IRON: '#dbe6f3', GOLD: '#ffd23f',
  DIAMOND: '#3ef0ff', EMERALD: '#39ff88', NETHERITE: '#b98cff', MASTER: '#ff4fd8',
};

export const tierName = (tier: string) => tier.charAt(0) + tier.slice(1).toLowerCase();

export const number = (n: number) => n.toLocaleString('en-US');

export const MUTED = '#a1a1a1';
export const BORDER = '#2e2e2e';
export const PANEL = 'rgba(23, 23, 23, 0.85)';
export const WIN = '#3fcf80';
export const LOSS = '#ff6a5f';

// text Geist can draw; a server name in Hangul would come out as boxes
const drawable = (text: string) => /^[\x20-\x7e]+$/.test(text);
const SERVER = process.env.NEXT_PUBLIC_SERVER_NAME || 'Fusion';
const ADDRESS = process.env.NEXT_PUBLIC_SERVER_ADDRESS ?? '';

// public/logo.svg (and app/icon.svg, the tab icon), inline: the card is drawn on the server, which has no page to load it from
const LOGO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="5 5 24 24"><defs><clipPath id="r"><circle cx="20.5" cy="17" r="7.5"/></clipPath></defs><circle cx="13.5" cy="17" r="7.5" fill="#2f8fff"/><circle cx="20.5" cy="17" r="7.5" fill="#8b4dff"/><circle cx="13.5" cy="17" r="7.5" fill="#f9cb28" clip-path="url(#r)"/></svg>')}`;

/** A rounded box of small muted label, a big value and maybe a line under it, as the cards list their numbers. */
export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4, padding: '18px 24px', border: `1px solid ${BORDER}`, borderRadius: 20, background: PANEL }}>
      <span style={{ fontSize: 20, color: MUTED, letterSpacing: 1.5 }}>{label.toUpperCase()}</span>
      <span style={{ fontSize: 48, letterSpacing: -1.5 }}>{value}</span>
      {sub && <span style={{ fontSize: 22, color: MUTED }}>{sub}</span>}
    </div>
  );
}

/** A small rounded tag (a tier, the match id, the arena). */
export function Pill({ children, color = MUTED }: { children: string; color?: string }) {
  return <span style={{ fontSize: 26, color, border: `2px solid ${color}55`, background: `${color}14`, borderRadius: 999, padding: '6px 22px' }}>{children}</span>;
}

/** A card of that kind: the brand on top, the content below it, on the dark page with the site's bloom. */
export function card(kind: keyof typeof CARD_SECONDS, content: ReactNode) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '48px 64px 56px', gap: 28,
          background: '#0a0a0a', color: '#ededed',
          backgroundImage: 'radial-gradient(circle at 10% 0%, rgba(0, 124, 240, 0.22), transparent 42%), radial-gradient(circle at 55% -15%, rgba(121, 40, 202, 0.2), transparent 45%), radial-gradient(circle at 100% 5%, rgba(249, 203, 40, 0.16), transparent 40%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28 }}>
          <img src={LOGO} width={44} height={44} alt="" />
          {drawable(SERVER) && <span>{SERVER}</span>}
          {drawable(ADDRESS) && <span style={{ marginLeft: 'auto', color: MUTED, fontSize: 26 }}>{ADDRESS}</span>}
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>{content}</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': `public, max-age=${CARD_SECONDS[kind]}` } },
  );
}
