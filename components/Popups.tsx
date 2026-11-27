'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/i18n';
import { hashOf, openPopups, parseHash, readHash, type Open } from '@/lib/popup-hash';

// the dialogs' code (Radix Dialog, the profile and match views) comes once a popup opens, or a row is pointed at,
// not with the page: most visits read the board and open nothing
const loadDialogs = () => import('@/components/PopupDialogs');
const PopupDialogs = dynamic(loadDialogs, { ssr: false });

/** Follows the address (lib/popup-hash.ts) and opens the profile and match popups it names. */
export default function Popups({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState<Open>({ player: null, match: null });
  // what had focus when each popup opened (a row, a match link), for closing it to put focus back there: the popups
  // open from the address, not from a Radix trigger, so Radix has nothing to return focus to
  const openers = useRef<Partial<Record<keyof Open, Element | null>>>({});
  const shown = useRef(open);
  shown.current = open;

  useEffect(() => {
    // a shared link (?player=, ?match=, see CopyLink) opens as the popups' own address does, then reads as one
    const search = new URLSearchParams(location.search);
    const shared = { player: search.get('player'), match: search.get('match') };
    if (shared.player || shared.match) {
      search.delete('player');
      search.delete('match');
      history.replaceState(history.state, '', location.pathname + (search.size ? `?${search}` : '') + hashOf(shared));
    }
    setOpen(readHash());
    const onHash = () => {
      const next = readHash();
      for (const key of ['player', 'match'] as const) if (next[key] && !shown.current[key]) openers.current[key] = document.activeElement;
      setOpen(next);
    };
    // row and match links open through openPopups (a plain click only; ctrl or middle click still opens a new tab)
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest?.('a[href^="#player="], a[href^="#match="]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openPopups(parseHash(link.getAttribute('href')!));
    };
    // pointing at a player's row fetches the dialogs' code (a static file) ahead of the click; their data waits for the
    // click itself, as sweeping the pointer down the board asked the backend about every row it crossed
    const onPoint = (e: PointerEvent) => {
      if ((e.target as Element).closest?.('a[href^="#player="]')) loadDialogs();
    };
    addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onPoint);
    return () => {
      removeEventListener('hashchange', onHash);
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onPoint);
    };
  }, []);

  // a popup this page opened steps back through history; one from a shared link swaps the address in place
  const close = (which: keyof Open) => {
    if (history.state?.popup) {
      history.back();
      return;
    }
    const next = { ...open, [which]: null };
    history.replaceState({ ...history.state, popup: undefined }, '', location.pathname + location.search + hashOf(next));
    setOpen(next);
  };

  return open.player || open.match ? <PopupDialogs open={open} close={close} opener={which => openers.current[which]} lang={lang} /> : null;
}
