import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import KitTabs from '@/components/KitTabs';
import Popups from '@/components/Popups';
import Tier from '@/components/Tier';
import TopBar from '@/components/TopBar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { buttonVariants } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import { getKits, getLeaderboard, getMatch, getProfile, usingSample } from '@/lib/api';
import { bodyImage } from '@/lib/images';
import { formatNumber, t, type Lang } from '@/lib/i18n';
import { number, tierName } from '@/lib/og';
import { pageNumber, pageWindow } from '@/lib/pages';
import { currentLang } from '@/lib/server-lang';
import { GLOBAL, type Entry, type Kit, type Leaderboard } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = { searchParams: Promise<{ kit?: string; page?: string; player?: string; match?: string }> };

const SERVER = process.env.NEXT_PUBLIC_SERVER_NAME || 'Fusion';

/**
 * The link preview: a shared ?player= or ?match= link gets that player's or match's title and card (app/og/...), any
 * other the site's (a #player= address never reaches the server).
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const head = await headers();
  // the address the link was shared under, so the card's URL works from wherever the chat app fetches it
  const base = new URL(`${head.get('x-forwarded-proto') ?? 'http'}://${head.get('x-forwarded-host') ?? head.get('host')}`);
  const page = (title: string, description: string, image: string): Metadata => ({
    metadataBase: base,
    title,
    description,
    openGraph: { title, description, siteName: SERVER, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  });

  try {
    if (typeof params.player === 'string') {
      const profile = await getProfile(params.player);
      if (profile) {
        const g = profile.global;
        return page(`${profile.name} · ${number(g.elo)} Elo · ${SERVER}`,
          [g.tier && tierName(g.tier), `${number(g.wins)}W ${number(g.losses)}L`, g.rank && `#${number(g.rank)} overall`].filter(Boolean).join(' · '), `/og/player/${profile.uuid}`);
      }
    } else if (typeof params.match === 'string') {
      const match = await getMatch(params.match);
      if (match) {
        const names = match.teams.map(team => team.players.map(p => p.name).join(', ')).join(' vs ');
        return page(`${match.hct ? 'HCT' : match.kit.name} #${match.id.toUpperCase()} · ${SERVER}`, names, `/og/match/${encodeURIComponent(match.id)}`);
      }
    }
  } catch (error) {
    console.error(error);
  }

  return page(`${SERVER} Leaderboard`, 'Elo, tiers and match history of every ranked player', '/og');
}

const HCT = 'HCT';

// the server's Discord, linked from the footer
const DISCORD_INVITE = 'https://discord.gg/aTCD3aXPND';

// Discord's logo, from Simple Icons (simpleicons.org, CC0): lucide has no brand logos
const DISCORD_LOGO = (
  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
);

// written out whole: Tailwind only builds the classes it finds spelled out in the source
const MEDAL = ['', 'medal-1', 'medal-2', 'medal-3'];

const href = (kit: string, page = 1) => `/?kit=${encodeURIComponent(kit)}${page > 1 ? `&page=${page}` : ''}`;

export default async function Home({ searchParams }: Props) {
  const lang = await currentLang();
  const params = await searchParams;

  // only the kits (kept up to an hour, lib/keep.ts) before the page goes out; the board follows as it arrives (Board)
  let kits: Kit[] = [];
  let hct = false;
  try {
    const kitList = await getKits();
    kits = kitList?.kits ?? [];
    hct = kitList?.hct ?? false;
  } catch (error) {
    console.error(error);
  }

  const wanted = params.kit ?? GLOBAL;
  const page = pageNumber(params.page);
  // a kit that isn't ranked (any more) shows the overall board, so its tab is the one marked
  const kit = wanted === GLOBAL || wanted === HCT || kits.some(k => k.id === wanted) ? wanted : GLOBAL;
  const tabs = [
    { id: GLOBAL, label: t(lang, 'allKits'), icon: null, href: href(GLOBAL) },
    ...kits.map(k => ({ id: k.id, label: k.name, icon: k.icon, href: href(k.id) })),
    // a server without the HCT queue (or before its first game) has nobody to show there
    ...(hct || kit === HCT ? [{ id: HCT, label: 'HCT', icon: null, href: href(HCT) }] : []),
  ];
  // a shared ?player= or ?match= (CopyLink), kept if Board sends the page on to another board's address
  const shared = new URLSearchParams();
  for (const key of ['player', 'match'] as const) if (typeof params[key] === 'string') shared.set(key, params[key]);

  return (
    <>
      {/* the first Tab stop: past the top bar and the kit tabs to the board's rows */}
      <a href="#board" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:bg-popover focus:px-3 focus:py-2 focus:text-sm focus:shadow-float">
        {t(lang, 'skipToBoard')}
      </a>
      <TopBar lang={lang} />
      <main className="relative isolate mx-auto max-w-5xl px-4 py-10 sm:py-16">
        {/* the one decorative touch (DESIGN.md): a soft blue, violet and amber bloom behind the title */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-70 blur-3xl dark:opacity-40 [background:radial-gradient(35%_55%_at_15%_35%,#007cf033,transparent),radial-gradient(30%_50%_at_50%_25%,#7928ca29,transparent),radial-gradient(30%_50%_at_85%_40%,#f9cb2833,transparent)]" />
        <h1 className="text-[32px] leading-10 font-semibold tracking-[-1.28px] sm:text-5xl sm:leading-[48px] sm:tracking-[-2.4px]">{t(lang, 'title')}</h1>

        <KitTabs tabs={tabs} current={kit} labels={{ kits: t(lang, 'kits'), earlier: t(lang, 'earlierKits'), more: t(lang, 'moreKits') }} />

        {/* keyed by board, so another kit or page shows the skeleton until its rows arrive; #board: the skip link's
            target, from which the next Tab reaches the first row */}
        <div id="board">
          <Suspense key={`${kit}:${page}`} fallback={<BoardSkeleton />}>
            <Board kit={kit} page={page} shared={shared.toString()} lang={lang} />
          </Suspense>
        </div>

        {usingSample && <p className="mt-8 text-center text-xs text-muted-foreground">{t(lang, 'sampleData')}</p>}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-6">
          <p className="text-xs text-muted-foreground">{t(lang, 'notAffiliated', { server: SERVER })}</p>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Discord"
            title="Discord"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            {DISCORD_LOGO}
          </a>
        </div>
      </footer>
      <Popups lang={lang} />
    </>
  );
}

/** The board's rows and pages, streamed in after the rest of the page. */
async function Board({ kit, page, shared, lang }: { kit: string; page: number; shared: string; lang: Lang }) {
  let board: Leaderboard | null;
  try {
    board = await getLeaderboard(kit, page);
  } catch (error) {
    console.error(error);
    return <div className="mt-4 grid gap-2" data-board><Note>{t(lang, 'unavailable')}</Note></div>;
  }
  // a kit no longer ranked or a page past the last: off to the real address, so the tab and page match. Never from the
  // overall board to itself: without one (a 404) the page says nobody is ranked
  const to = (k: string, p?: number) => href(k, p) + (shared ? `&${shared}` : '');
  if (!board && kit !== GLOBAL) redirect(to(GLOBAL));
  if (board && typeof board.page === 'number' && board.page !== page) redirect(to(kit, board.page));

  return (
    <>
      <div className="mt-4 grid gap-2" data-board>
        {board?.entries.length ? board.entries.map(entry => <Row key={entry.uuid} entry={entry} lang={lang} />) : <Note>{t(lang, 'noRanked')}</Note>}
      </div>
      {board && board.pages > 1 && <Pager board={board} lang={lang} />}
    </>
  );
}

// rows' shapes while the board is on its way, the height of real ones so nothing jumps when they arrive
const BoardSkeleton = () => (
  <div className="mt-4 grid gap-2" aria-busy="true">
    {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-[62px] animate-pulse rounded-xl border bg-card sm:h-[78px]" />)}
  </div>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">{children}</div>
);

// a banned player's name is struck through and their row's text faded; screen readers and the tooltip say so
const BANNED_TEXT = 'opacity-50';

function Row({ entry, lang }: { entry: Entry; lang: Lang }) {
  const games = entry.wins + entry.losses;
  return (
    // opens the profile popup (components/Popups.tsx), by uuid: two players can share an old name
    <a
      className="grid grid-cols-[1.75rem_1.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-accent sm:grid-cols-[2rem_1.75rem_minmax(0,1fr)_auto] sm:gap-4 sm:px-5"
      href={`#player=${entry.uuid}`}
      title={entry.banned ? t(lang, 'banned') : undefined}
    >
      <span className={cn('flex size-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums sm:size-8 sm:text-sm',
        MEDAL[entry.rank] ?? 'bg-muted text-muted-foreground')}>{entry.rank}</span>
      <img className="pixelated h-10 w-5 object-contain sm:h-14 sm:w-7" src={bodyImage(entry.uuid)} alt="" loading="lazy" />
      <span className={cn('grid min-w-0 gap-1', entry.banned && BANNED_TEXT)}>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn('truncate font-medium', entry.banned && 'line-through')} translate="no">
            {entry.name}
            {entry.banned && <span className="sr-only"> ({t(lang, 'banned')})</span>}
          </span>
          {entry.verified && <VerifiedBadge label={t(lang, 'verified')} className="size-3.5" />}
        </span>
        {/* the record stays in one piece, so a narrow row wraps between it and the tier, never inside it */}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <Tier tier={entry.tier} lang={lang} />
          <span className="whitespace-nowrap">
            {t(lang, 'record', { wins: formatNumber(lang, entry.wins), losses: formatNumber(lang, entry.losses) })}
            {' · '}{t(lang, 'winRate', { rate: games ? Math.round((entry.wins / games) * 100) : 0 })}
          </span>
        </span>
      </span>
      <span className={cn('text-right whitespace-nowrap tabular-nums', entry.banned && BANNED_TEXT)}>
        <span className="text-lg font-semibold tracking-[-0.4px] sm:text-xl">{formatNumber(lang, entry.elo)}</span>
        <span className="ml-1 text-xs text-muted-foreground">Elo</span>
      </span>
    </a>
  );
}

function Pager({ board, lang }: { board: Leaderboard; lang: Lang }) {
  const { kit, page, pages } = board;
  // an arrow with nowhere to go is plain text, so neither a click nor Enter reloads the same page
  const arrow = (to: number, label: string, icon: React.ReactNode) => (
    <PaginationItem>
      {to < 1 || to > pages
        ? <span className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'opacity-40')} aria-hidden="true">{icon}</span>
        : <PaginationLink href={href(kit, to)} aria-label={label}>{icon}</PaginationLink>}
    </PaginationItem>
  );

  return (
    <Pagination className="mt-6" aria-label={t(lang, 'pages')}>
      <PaginationContent>
        {arrow(page - 1, t(lang, 'prevPage'), <ChevronLeftIcon />)}
        {pageWindow(page, pages).map((n, i) => (
          <PaginationItem key={n ?? `gap-${i}`}>
            {n === null ? <PaginationEllipsis /> : <PaginationLink href={href(kit, n)} isActive={n === page}>{n}</PaginationLink>}
          </PaginationItem>
        ))}
        {arrow(page + 1, t(lang, 'nextPage'), <ChevronRightIcon />)}
      </PaginationContent>
    </Pagination>
  );
}
