'use client';

import { ChevronDownIcon, ShieldPlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import CopyLink from '@/components/CopyLink';
import EloChart from '@/components/EloChart';
import ItemIcon from '@/components/ItemIcon';
import Tier from '@/components/Tier';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { load, peek, type Loaded } from '@/lib/answers';
import { formatDate, formatNumber, t, type Lang } from '@/lib/i18n';
import { bodyImage, headImage, UUID } from '@/lib/images';
import { hashOf, type Open } from '@/lib/popup-hash';
import type { EloBoard, Item, MatchDetail, MatchSummary, Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

// The profile and match popups themselves, loaded only once one opens (components/Popups.tsx)

/** A JSON API path's answer once `path` is set (loading until then), kept a few seconds (lib/answers.ts). */
function useApi<T>(path: string | null) {
  const [state, setState] = useState<Loaded<T>>(() => (path && peek<T>(path)) || { status: 'loading' });

  useEffect(() => {
    if (!path) return;
    setState(peek<T>(path) ?? { status: 'loading' });
    // an answer for a path the popup has moved on from is dropped
    let current = true;
    load<T>(path).then(answer => { if (current) setState(answer); });
    return () => { current = false; };
  }, [path]);

  return state;
}

/** Both dialogs; they keep focus inside, lock the page's scroll and close on Escape or a click outside (the top one first). */
export default function PopupDialogs({ open, close, opener, lang }: {
  open: Open; close: (which: keyof Open) => void; opener: (which: keyof Open) => Element | null | undefined; lang: Lang;
}) {
  // closing a popup puts focus back where it was when it opened, if that's still on the page (a search hit isn't)
  const refocus = (which: keyof Open) => (event: Event) => {
    const element = opener(which);
    if (element instanceof HTMLElement && element.isConnected) {
      event.preventDefault();
      element.focus();
    }
  };

  return (
    <>
      <Dialog open={!!open.player} onOpenChange={isOpen => { if (!isOpen) close('player'); }}>
        {open.player && <ProfilePopup player={open.player} onCloseAutoFocus={refocus('player')} lang={lang} />}
      </Dialog>
      <Dialog open={!!open.match} onOpenChange={isOpen => { if (!isOpen) close('match'); }}>
        {open.match && <MatchPopup id={open.match} onCloseAutoFocus={refocus('match')} lang={lang} />}
      </Dialog>
    </>
  );
}

// a header row and a body that scrolls on its own, so the close button stays in view
const POPUP = 'flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0';
// a Geist Mono eyebrow (DESIGN.md) names the popup until there's more to say
const HEADING = 'font-mono text-xs font-medium text-muted-foreground uppercase';

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => <h3 className="mb-2 text-sm font-semibold tracking-[-0.28px]">{children}</h3>;

// w, l or d (no winner: the match hit its time limit)
const outcome = (won: boolean | null) => (won === null ? 'd' : won ? 'w' : 'l');
const OUTCOME_SHORT = { w: 'winShort', l: 'lossShort', d: 'drawShort' };
const OUTCOME = { w: 'victory', l: 'defeat', d: 'draw' };
const OUTCOME_TEXT = { w: 'text-win', l: 'text-loss', d: 'text-muted-foreground' };
const OUTCOME_CHIP = { w: 'bg-win/15 text-win', l: 'bg-loss/15 text-loss', d: 'bg-muted text-muted-foreground' };

const winRate = (wins: number, losses: number) => (wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0);

function ago(lang: Lang, at: number) {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 60) return t(lang, 'minutesAgo', { n: Math.max(minutes, 1) });
  if (minutes < 1440) return t(lang, 'hoursAgo', { n: Math.floor(minutes / 60) });
  return t(lang, 'daysAgo', { n: Math.floor(minutes / 1440) });
}

const duration = (lang: Lang, seconds: number) => t(lang, 'duration', { m: Math.floor(seconds / 60), s: seconds % 60 });

// ---- profile ----

function ProfilePopup({ player, onCloseAutoFocus, lang }: { player: string; onCloseAutoFocus: (event: Event) => void; lang: Lang }) {
  const profile = useApi<Profile>(`/api/players/${encodeURIComponent(player)}`);
  // rows and search open a profile by UUID, so its matches are asked for at the same time; by a name (a shared
  // link), once the profile says whose
  const uuid = UUID.test(player) ? player : profile.status === 'ready' ? profile.data.uuid : null;
  const matches = useApi<MatchSummary[]>(uuid && `/api/players/${uuid}/matches`);
  const elo = useApi<{ boards: EloBoard[] }>(uuid && `/api/players/${uuid}/elo`);

  return (
    <DialogContent className={cn(POPUP, 'sm:max-w-lg lg:max-w-4xl')} closeLabel={t(lang, 'closeProfile')} aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader className="flex-row items-center justify-between border-b px-4 py-2.5 pr-12 text-left sm:px-6">
        <DialogTitle className={HEADING}>{t(lang, 'profileHeading')}</DialogTitle>
        {profile.status === 'ready' && <CopyLink query={`player=${profile.data.uuid}`} lang={lang} />}
      </DialogHeader>
      <div className="overflow-y-auto px-4 py-5 sm:px-6">
        {profile.status === 'ready' ? <ProfileBody profile={profile.data} matches={matches} elo={elo} player={player} lang={lang} />
          : <Note>{t(lang, profile.status === 'loading' ? 'loading' : profile.status === 'missing' ? 'playerNotFound' : 'profileFailed')}</Note>}
      </div>
    </DialogContent>
  );
}

// player: the address's value for this profile, kept in match links so opening one doesn't reload the profile
function ProfileBody({ profile, matches, elo, player, lang }: {
  profile: Profile; matches: Loaded<MatchSummary[]>; elo: Loaded<{ boards: EloBoard[] }>; player: string; lang: Lang;
}) {
  const { global: g } = profile;
  const record = (wins: number, losses: number) => t(lang, 'record', { wins: formatNumber(lang, wins), losses: formatNumber(lang, losses) });
  const stat = (value: React.ReactNode, label: string) => (
    <div className="py-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
  // the kit whose Elo history is shown under its row; a row's click opens it, or closes it again
  const [openKit, setOpenKit] = useState<string | null>(null);

  // key: the kit's id, or HCT; the same as the board's id in the Elo history
  const kitRow = (key: string, icon: React.ReactNode, name: string, wins: number, losses: number, rating: number) => {
    const open = openKit === key;
    const board = elo.status === 'ready' ? elo.data.boards.find(b => b.id === key) : undefined;
    return (
      <div key={key}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpenKit(open ? null : key)}
          className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto_auto_1rem] items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
        >
          {icon}
          <span className="truncate">{name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{record(wins, losses)} · {winRate(wins, losses)}%</span>
          <span className="w-12 text-right font-semibold tabular-nums">{formatNumber(lang, rating)}</span>
          <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
        {open && (
          <div className="border-t px-3 py-3">
            {board ? <EloChart boards={[board]} lang={lang} />
              : <p className="text-sm text-muted-foreground">{t(lang, elo.status === 'loading' ? 'loading' : elo.status === 'ready' ? 'noEloHistory' : 'matchesFailed')}</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    // a wide screen puts the recent matches in a column of their own on the right, so the popup grows sideways, not down
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          <img className="pixelated h-24 w-12 object-contain" src={bodyImage(profile.uuid)} alt="" />
          <div className="grid gap-1.5">
            {/* banned: struck through and faded as on the board, and said in small type after it */}
            <div className="flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold tracking-[-0.96px]">
              <span className={cn(profile.banned && 'line-through opacity-50')} translate="no">{profile.name}</span>
              {profile.verified && <VerifiedBadge label={t(lang, 'verified')} className="size-5" />}
              {profile.banned && <span className="text-sm font-normal tracking-normal text-muted-foreground">{t(lang, 'bannedFromServer')}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Tier tier={g.tier} lang={lang} />
              {g.rank ? t(lang, 'rankOverall', { rank: formatNumber(lang, g.rank) }) : t(lang, 'unranked')}
            </div>
            <div className="tabular-nums">
              <span className="text-xl font-semibold tracking-[-0.4px]">{formatNumber(lang, g.elo)}</span>
              <span className="ml-1 text-xs text-muted-foreground">Elo</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x rounded-xl border">
          {stat(formatNumber(lang, g.wins), t(lang, 'wins'))}
          {stat(formatNumber(lang, g.losses), t(lang, 'losses'))}
          {stat(`${winRate(g.wins, g.losses)}%`, t(lang, 'winRateLabel'))}
          {stat((g.kills / Math.max(g.deaths, 1)).toFixed(2), t(lang, 'kd'))}
        </div>

        <section>
          <SectionTitle>{t(lang, 'byKit')}</SectionTitle>
          <div className="divide-y rounded-xl border">
            {profile.kits.map(kit => kitRow(kit.id, <ItemIcon id={kit.icon} />, kit.name, kit.wins, kit.losses, kit.elo))}
            {profile.hct && kitRow('HCT', <ShieldPlusIcon className="size-5" />, 'HCT', profile.hct.wins, profile.hct.losses, profile.hct.elo)}
            {!profile.kits.length && !profile.hct && <div className="px-3 py-2 text-sm text-muted-foreground">{t(lang, 'noRankedYet')}</div>}
          </div>
        </section>
      </div>

      <RecentMatches matches={matches} player={player} lang={lang} />
    </div>
  );
}

function RecentMatches({ matches, player, lang }: { matches: Loaded<MatchSummary[]>; player: string; lang: Lang }) {
  return (
    <section>
      <SectionTitle>{t(lang, 'recentMatches')}</SectionTitle>
      {matches.status !== 'ready' ? <Note>{t(lang, matches.status === 'loading' ? 'loading' : 'matchesFailed')}</Note>
        : !matches.data.length ? <Note>{t(lang, 'noMatches')}</Note>
        : (
          <div className="grid gap-2">
            {matches.data.map(m => (
              <a className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-accent" key={m.id} href={hashOf({ player, match: m.id })}>
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold', OUTCOME_CHIP[outcome(m.won)])}>
                  {t(lang, OUTCOME_SHORT[outcome(m.won)])}
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  {/* no opponents: an HCT test game against an empty team */}
                  <span className="truncate text-sm font-medium">
                    {!m.opponents.length ? t(lang, 'noOpponents') : m.hct ? t(lang, 'hctVs', { size: m.opponents.length, name: m.opponents[0] }) : t(lang, 'vs', { name: m.opponents.join(', ') })}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{[m.hct ? 'HCT' : m.kit.name, m.arena, duration(lang, m.duration)].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="grid shrink-0 justify-items-end gap-0.5 tabular-nums">
                  {/* no Elo change: a casual match, or a ranked or HCT one that ended without a winner */}
                  <span className={cn('text-sm font-semibold', m.eloChange === null ? 'text-muted-foreground' : m.eloChange >= 0 ? 'text-win' : 'text-loss')}>
                    {m.eloChange !== null ? `${m.eloChange >= 0 ? '+' : '−'}${Math.abs(m.eloChange)}` : t(lang, m.ranked || m.hct ? 'ranked' : 'casual')}
                  </span>
                  <span className="text-xs text-muted-foreground">{ago(lang, m.endedAt)}</span>
                </span>
              </a>
            ))}
          </div>
        )}
    </section>
  );
}

// ---- match ----

function MatchPopup({ id, onCloseAutoFocus, lang }: { id: string; onCloseAutoFocus: (event: Event) => void; lang: Lang }) {
  const match = useApi<MatchDetail>(`/api/matches/${encodeURIComponent(id)}`);
  const ready = match.status === 'ready' ? match.data : null;

  return (
    <DialogContent className={cn(POPUP, 'sm:max-w-3xl')} closeLabel={t(lang, 'closeMatch')} aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader className="border-b px-4 py-4 pr-12 text-left sm:px-6">
        {ready ? (
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted"><ItemIcon id={ready.kit.icon} className="size-7" /></span>
            <div className="grid gap-2">
              <DialogTitle className="tracking-[-0.4px]">
                {ready.hct ? 'HCT' : ready.kit.name} {ready.teams.length > 2
                  ? t(lang, 'ffa', { n: ready.teams.reduce((n, team) => n + team.players.length, 0) })
                  : t(lang, 'teamSize', { a: ready.teams[0]?.players.length ?? 0, b: ready.teams[1]?.players.length ?? 0 })}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="font-mono uppercase" translate="no">#{ready.id}</Badge>
                <Badge variant="secondary">{formatDate(lang, ready.startedAt, { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Badge>
                <Badge variant="secondary">{duration(lang, ready.duration)}</Badge>
                {ready.arena && <Badge variant="secondary">{ready.arena}</Badge>}
                <CopyLink query={`match=${encodeURIComponent(ready.id)}`} lang={lang} />
              </div>
            </div>
          </div>
        ) : <DialogTitle className={HEADING}>{t(lang, 'matchDetails')}</DialogTitle>}
      </DialogHeader>
      <div className="overflow-y-auto px-4 py-5 sm:px-6">
        {ready ? <MatchBody match={ready} lang={lang} />
          : <Note>{t(lang, match.status === 'loading' ? 'loading' : match.status === 'missing' ? 'matchNotFound' : 'matchFailed')}</Note>}
      </div>
    </DialogContent>
  );
}

function MatchBody({ match, lang }: { match: MatchDetail; lang: Lang }) {
  const teams = match.teams.map((team, index) => ({ ...team, index })).sort((a, b) => Number(b.won) - Number(a.won)); // winners first
  const [selected, setSelected] = useState(teams[0]?.players[0]?.uuid);
  const shown = match.teams.flatMap(team => team.players).find(p => p.uuid === selected);

  const eloLine = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
      {teams.flatMap(team => team.players).filter(p => p.elo).map(p => {
        const [before, after] = p.elo!;
        const change = after - before;
        return (
          <span key={p.uuid}>
            <span translate="no">{p.name}</span> <b className="font-semibold">{formatNumber(lang, before)} → {formatNumber(lang, after)}</b>{' '}
            <span className={change >= 0 ? 'text-win' : 'text-loss'}>{change >= 0 ? '+' : '−'}{Math.abs(change)}</span>
          </span>
        );
      })}
    </div>
  );
  const hasElo = match.teams.some(team => team.players.some(p => p.elo));

  return (
    <div className="grid gap-5">
      {hasElo && !match.hct && eloLine}
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map(team => (
          <div className="overflow-hidden rounded-xl border" key={team.index}>
            <div className={cn('flex justify-between border-b bg-muted/50 px-3 py-2 text-sm font-semibold', OUTCOME_TEXT[outcome(team.won)])}>
              {t(lang, OUTCOME[outcome(team.won)])}
              <span className="font-normal text-muted-foreground">{match.hct ? t(lang, 'team', { n: team.index + 1 }) : ''}</span>
            </div>
            {team.players.map(p => (
              <button
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent aria-pressed:bg-accent"
                key={p.uuid}
                aria-pressed={p.uuid === selected}
                onClick={() => setSelected(p.uuid)}
              >
                <img className="pixelated size-6 rounded-sm" src={headImage(p.uuid)} alt="" />
                <span className="grid min-w-0">
                  <span className="truncate text-sm font-medium" translate="no">{p.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{t(lang, 'hitsDamage', { hits: formatNumber(lang, p.hits), damage: formatNumber(lang, p.damage) })}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {hasElo && match.hct && <section><SectionTitle>{t(lang, 'eloChange')}</SectionTitle>{eloLine}</section>}

      {shown && (
        <section className="grid gap-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <SectionTitle>{t(lang, 'inventoryOf', { name: shown.name })}</SectionTitle>
            <span className="text-xs text-muted-foreground">{t(lang, 'pickPlayer')}</span>
          </div>
          {shown.inventory.length ? (
            <div className="overflow-x-auto">
              {/* a phone: armor and off hand in a row above the 9 columns, which then fit a 360px screen */}
              <div className="grid w-fit grid-cols-[auto_auto] gap-2 [grid-template-areas:'armor_offhand'_'main_main'] sm:grid-cols-[auto_auto_auto] sm:gap-3.5 sm:[grid-template-areas:'armor_main_offhand']">
                <div className="grid grid-flow-col content-start gap-[3px] [grid-area:armor] sm:grid-flow-row sm:gap-1">
                  {shown.armor.map((item, i) => <Slot key={i} item={item} />)}
                </div>
                <div className="grid content-start gap-1.5 [grid-area:main] sm:gap-2.5">
                  <Grid9>{shown.inventory.slice(9).map((item, i) => <Slot key={i} item={item} />)}</Grid9>
                  <Grid9>{shown.inventory.slice(0, 9).map((item, i) => <Slot key={i} item={item} />)}</Grid9>
                </div>
                <div className="self-start [grid-area:offhand] sm:self-end"><Slot item={shown.offhand} /></div>
              </div>
            </div>
          ) : <Note>{t(lang, 'noInventory')}</Note>}
        </section>
      )}
    </div>
  );
}

const Grid9 = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-[repeat(9,26px)] gap-[3px] sm:grid-cols-[repeat(9,38px)] sm:gap-1">{children}</div>
);

const prettyItem = (id: string) => id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const SLOT = 'relative grid size-[26px] place-items-center rounded-md bg-muted ring-1 ring-border sm:size-[38px]';

function Slot({ item }: { item: Item }) {
  if (!item) return <div className={SLOT} aria-hidden="true" />;
  return (
    <div className={SLOT} title={`${prettyItem(item.id)}${item.count > 1 ? ` ×${item.count}` : ''}`}>
      {/* enchanted items shimmer like the in-game glint */}
      <ItemIcon id={item.id} className={cn('size-[18px] sm:size-[26px]', item.enchanted && 'saturate-150 drop-shadow-[0_0_3px_#b98cff]')} />
      {item.count > 1 && <span className="absolute right-0.5 bottom-0 text-[9px] font-bold tabular-nums [text-shadow:0_0_3px_var(--muted)] sm:text-[11px]">{item.count}</span>}
    </div>
  );
}
