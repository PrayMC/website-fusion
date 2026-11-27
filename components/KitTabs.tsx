'use client';

import { ChevronLeftIcon, ChevronRightIcon, GlobeIcon, Loader2Icon, ShieldPlusIcon } from 'lucide-react';
import Link, { useLinkStatus } from 'next/link';
import { useEffect, useRef, useState } from 'react';
import ItemIcon from '@/components/ItemIcon';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Tab = { id: string; label: string; icon: string | null; href: string };

// a scroll in script slides unless the visitor asked for less motion (the stylesheet's rule doesn't reach it)
const glide = (): ScrollBehavior => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth');

/**
 * A tab's icon, a spinner while its board is on the way. data-pending also dims the board below (globals.css), so a
 * slow answer doesn't look like a click that did nothing.
 */
function TabIcon({ icon }: { icon: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2Icon className="animate-spin" data-pending /> : icon;
}

/** One row of kit tabs that scrolls sideways; < > page through it and switch off at either end. */
export default function KitTabs({ tabs, current, labels }: { tabs: Tab[]; current: string; labels: { kits: string; earlier: string; more: string } }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });
  const shown = useRef(false);

  // slides a tab to the middle of the row (as far as the row goes), so one cut off at an edge comes fully into view
  const center = (tab: HTMLElement | null, smooth: boolean) => {
    const el = wrap.current!;
    if (!tab) return;
    el.scrollTo({ left: tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2, behavior: smooth ? glide() : 'instant' });
  };

  // the chosen kit: in view at once on the first paint, sliding there after (a click, or Back to another kit)
  useEffect(() => {
    center(wrap.current!.querySelector('[aria-current="page"]'), shown.current);
    shown.current = true;
  }, [current]);

  useEffect(() => {
    const el = wrap.current!;
    const paint = () => setEnds({ start: el.scrollLeft <= 1, end: el.scrollLeft >= el.scrollWidth - el.clientWidth - 1 });

    paint();
    el.addEventListener('scroll', paint, { passive: true });
    addEventListener('resize', paint);
    return () => { el.removeEventListener('scroll', paint); removeEventListener('resize', paint); };
  }, []);

  const page = (direction: number) => wrap.current!.scrollBy({ left: direction * wrap.current!.clientWidth * 0.8, behavior: glide() });

  return (
    <div className="mt-8 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
      <Button variant="outline" size="icon" className="rounded-full" aria-label={labels.earlier} disabled={ends.start} onClick={() => page(-1)}>
        <ChevronLeftIcon />
      </Button>
      {/* relative: the tabs' offsetLeft is measured from this row */}
      <div className="relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" ref={wrap}>
        <nav className="flex gap-2" aria-label={labels.kits}>
          {tabs.map(tab => (
            <Link
              key={tab.id}
              className={cn(buttonVariants({ variant: tab.id === current ? 'default' : 'outline' }), 'w-32 shrink-0 justify-center rounded-full')}
              href={tab.href}
              aria-current={tab.id === current ? 'page' : undefined}
              scroll={false}
              // asked for on the click: prefetching every tab in view cost a server call each on every page view
              prefetch={false}
              // at once, not after the new board arrives
              onClick={e => center(e.currentTarget, true)}
            >
              <TabIcon icon={tab.icon ? <ItemIcon id={tab.icon} className="size-4" /> : tab.id === 'HCT' ? <ShieldPlusIcon /> : <GlobeIcon />} />
              {/* every tab the same width: a long kit name is cut short rather than widening its tab */}
              <span className="truncate">{tab.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <Button variant="outline" size="icon" className="rounded-full" aria-label={labels.more} disabled={ends.end} onClick={() => page(1)}>
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
