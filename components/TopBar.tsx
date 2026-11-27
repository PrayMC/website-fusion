'use client';

import { MoonIcon, SearchIcon, SunIcon } from 'lucide-react';
import ItemIcon from '@/components/ItemIcon';
import LangButton from '@/components/LangButton';
import { useEffect, useRef, useState } from 'react';
import { openPopups } from '@/lib/popup-hash';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { headImage } from '@/lib/images';
import { formatNumber, t, type Lang } from '@/lib/i18n';
import { THEME_COLORS, THEME_KEY } from '@/lib/theme';
import type { MatchDetail, SearchHit } from '@/lib/types';

export default function TopBar({ lang }: { lang: Lang }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        {/* back to the top of this board, keeping its kit and page */}
        <button
          type="button"
          className="flex min-w-0 items-center gap-2.5 rounded-md text-left"
          title={t(lang, 'toTop')}
          onClick={() => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}
        >
          <img className="size-8 rounded-md" src="/logo.svg" alt="" />
          <span className="grid leading-tight">
            <span className="font-semibold">{process.env.NEXT_PUBLIC_SERVER_NAME || 'Fusion'}</span>
            {process.env.NEXT_PUBLIC_SERVER_ADDRESS && <span className="hidden text-xs text-muted-foreground sm:block">{process.env.NEXT_PUBLIC_SERVER_ADDRESS}</span>}
          </span>
          <span className="sr-only">{t(lang, 'toTop')}</span>
        </button>
        <div className="ml-auto flex items-center gap-2 sm:order-last sm:ml-0">
          <LangPicker lang={lang} />
          <ThemeToggle lang={lang} />
        </div>
        {/* the whole second row on a phone, beside the brand on a wider screen */}
        <Search lang={lang} />
      </div>
    </header>
  );
}

type Hit = { player: SearchHit } | { match: MatchDetail };

// a match id as the plugin makes them: 8 lower case letters and digits, shown as #1234ABCD
const MATCH_ID = /^#?([a-z0-9]{8})$/i;

/** Players by name, and the match a term names when it reads as a match id (first: an 8-letter name can be both). */
async function search(term: string, signal?: AbortSignal): Promise<Hit[]> {
  const id = MATCH_ID.exec(term)?.[1].toLowerCase();
  const [match, players] = await Promise.all([
    id ? fetch(`/api/matches/${id}`, { signal }).then(res => (res.ok ? res.json() as Promise<MatchDetail> : null)) : null,
    term.startsWith('#') ? [] : fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal }).then(res => (res.ok ? res.json() as Promise<SearchHit[]> : [])),
  ]);
  return [...(match ? [{ match }] : []), ...players.map(player => ({ player }))];
}

const keyOf = (hit: Hit) => ('match' in hit ? `match:${hit.match.id}` : hit.player.uuid);

function Search({ lang }: { lang: Lang }) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null); // the answer for what the box holds now, null until it arrives
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const cancelPending = useRef(() => {});
  // what the box holds now, for an answer that arrives after the text moved on
  const latest = useRef(query);
  latest.current = query;

  useEffect(() => {
    // the old list belongs to the old text, so Enter can't open a player the box no longer matches
    setHits(null);
    const term = query.trim();
    // one letter matches most names and costs a request for little; Enter still searches it (submit)
    if (term.length < 2) return;

    // waits for a pause in typing; the abort drops answers to text the box no longer holds
    const controller = new AbortController();
    const timer = setTimeout(() => {
      search(term, controller.signal)
        .then(found => { setHits(found); setActive(0); setOpen(true); })
        .catch(() => {});
    }, 300);
    const cancel = () => { clearTimeout(timer); controller.abort(); };
    cancelPending.current = cancel;
    return cancel;
  }, [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // a player by uuid, as two players can share an old name; the search still waiting on the typing is dropped, or it
  // would reopen the list over the popup
  const choose = (hit: Hit) => {
    cancelPending.current();
    openPopups('match' in hit ? { player: null, match: hit.match.id } : { player: hit.player.uuid, match: null });
    setOpen(false);
  };

  const submit = async () => {
    if (hits) {
      if (hits[active]) choose(hits[active]);
      return;
    }
    // Enter before the list arrived: search now and open the best match
    const term = query.trim();
    if (!term) return;
    const found = await search(term).catch(() => []);
    // typed on while it was on its way: this answer belongs to old text
    if (latest.current.trim() !== term) return;
    setHits(found);
    setActive(0);
    if (found[0]) choose(found[0]);
    else setOpen(true);
  };

  const shown = open && hits;

  return (
    <div className="relative order-last w-full sm:order-none sm:ml-auto sm:w-72" ref={box}>
      <form role="search" onSubmit={e => { e.preventDefault(); submit(); }}>
        <Input
          type="search"
          role="combobox"
          className="bg-card pr-10"
          aria-expanded={!!shown}
          aria-controls="player-search-list"
          aria-autocomplete="list"
          aria-activedescendant={shown && hits.length ? `player-search-${active}` : undefined}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (hits) setOpen(true); }}
          onKeyDown={e => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            if (!hits?.length) return;
            e.preventDefault();
            if (!open) { setOpen(true); return; }
            setActive(i => (i + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length);
          }}
          onKeyUp={e => { if (e.key === 'Escape') setOpen(false); }}
          placeholder={t(lang, 'searchPlaceholder')}
          aria-label={t(lang, 'searchPlayers')}
          name="q"
          enterKeyHint="search"
          autoComplete="off"
          // player names and match ids: a phone's keyboard would capitalize and "correct" them
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button type="submit" variant="ghost" size="icon-sm" className="absolute top-1/2 right-0.5 -translate-y-1/2" aria-label={t(lang, 'search')}>
          <SearchIcon />
        </Button>
      </form>
      {shown && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 grid gap-0.5 rounded-md border bg-popover p-1 text-popover-foreground shadow-float" role="listbox" id="player-search-list">
          {hits.length ? hits.map((hit, i) => (
            <button
              key={keyOf(hit)}
              id={`player-search-${i}`}
              role="option"
              aria-selected={i === active}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent aria-selected:bg-accent"
              onClick={() => choose(hit)}
            >
              {'match' in hit ? (
                <>
                  <ItemIcon id={hit.match.kit.icon} className="size-5" />
                  <span className="truncate font-mono" translate="no">#{hit.match.id.toUpperCase()}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{hit.match.kit.name}</span>
                </>
              ) : (
                <>
                  <img className="pixelated size-5 rounded-sm" src={headImage(hit.player.uuid)} alt="" />
                  <span className="truncate" translate="no">{hit.player.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatNumber(lang, hit.player.elo)} Elo</span>
                </>
              )}
            </button>
          )) : <div className="px-2 py-2 text-sm text-muted-foreground">{t(lang, 'noResult', { name: query.trim() })}</div>}
        </div>
      )}
      {/* the list isn't announced as it opens: say how many it holds, once per answer (the typing waits 300 ms) */}
      <div className="sr-only" aria-live="polite">
        {shown ? (hits.length ? t(lang, 'searchResults', { n: hits.length }) : t(lang, 'noResult', { name: query.trim() })) : ''}
      </div>
    </div>
  );
}

const loadLangMenu = () => import('@/components/LangMenu');
type LangMenuType = Awaited<ReturnType<typeof loadLangMenu>>['default'];

/**
 * The language button, the menu's code fetched when it's pointed at (the menu then takes its place, so the press lands
 * on it) or pressed (the menu opens as it arrives, taking focus). A keyboard's focus only fetches it: swapping the
 * button under the focus would drop it.
 */
function LangPicker({ lang }: { lang: Lang }) {
  const [menu, setMenu] = useState<{ Menu: LangMenuType; open: boolean } | null>(null);

  if (menu) return <menu.Menu lang={lang} defaultOpen={menu.open} />;

  // a press that lands before the pointing's swap (a touch does both at once) still opens it
  const show = (open: boolean) => loadLangMenu().then(mod => setMenu(now => ({ Menu: mod.default, open: open || !!now?.open }))).catch(() => {});
  return <LangButton lang={lang} onPointerEnter={() => show(false)} onFocus={() => { loadLangMenu().catch(() => {}); }} onClick={() => show(true)} />;
}

// the whole page changes theme at once: without this, anything with a color transition (buttons, rows) fades over
// while the rest snaps
function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.classList.toggle('dark', dark);
  // the browser's bars too (app/layout.tsx made the meta, unless storage was blocked there)
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.head.appendChild(document.createElement('meta'));
    meta.name = 'theme-color';
  }
  meta.content = dark ? THEME_COLORS.dark : THEME_COLORS.light;
  getComputedStyle(root).color; // paints the new colors with transitions off
  requestAnimationFrame(() => root.classList.remove('theme-switching'));
}

/** The theme button (sun or moon): the icon follows the .dark class set before first paint, the pressed state after hydration */
function ThemeToggle({ lang }: { lang: Lang }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));

    // without a saved choice the site follows the device's setting as it changes
    const media = matchMedia('(prefers-color-scheme: dark)');
    const follow = () => {
      let saved = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch {}
      if (saved) return;
      applyTheme(media.matches);
      setDark(media.matches);
    };
    media.addEventListener('change', follow);
    return () => media.removeEventListener('change', follow);
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch {}
    setDark(next);
  };

  return (
    <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={t(lang, 'darkMode')} aria-pressed={dark} title={t(lang, 'darkMode')} onClick={toggle}>
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  );
}
