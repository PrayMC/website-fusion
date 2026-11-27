'use client';

import { useEffect, useRef, useState } from 'react';
import ItemIcon from '@/components/ItemIcon';
import { ShieldPlusIcon } from 'lucide-react';
import { formatDate, formatNumber, t, type Lang } from '@/lib/i18n';
import type { EloBoard } from '@/lib/types';
import { cn } from '@/lib/utils';

const HEIGHT = 160;
// the y-axis numbers on the left, the current Elo on the right (a 4-5 digit number either way), the dates below;
// left and right alike, so the plot sits centered in its card
const PAD = { top: 12, right: 48, bottom: 22, left: 48 };

// a clean step for about three gridlines over the range (10, 25, 50, 100, 250 ...)
function step(range: number) {
  const raw = Math.max(range, 1) / 3;
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2.5, 5, 10].map(m => m * power).find(s => s >= raw)!;
}

/**
 * A player's Elo over their matches, one board at a time. It steps by match, not by day (dates in the tooltip and at
 * the ends); hover or touch shows each, and a hidden table gives screen readers every point.
 */
export default function EloChart({ boards, lang }: { boards: EloBoard[]; lang: Lang }) {
  const [boardId, setBoardId] = useState(boards[0]?.id);
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current!;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const board = boards.find(b => b.id === boardId) ?? boards[0];
  if (!board) return null;

  const points = board.points;
  const elos = points.map(p => p.elo);
  const every = step(Math.max(...elos) - Math.min(...elos));
  const low = Math.floor(Math.min(...elos) / every) * every;
  const high = Math.max(Math.ceil(Math.max(...elos) / every) * every, low + every);
  const ticks = Array.from({ length: Math.round((high - low) / every) + 1 }, (_, i) => low + i * every);

  const plotWidth = Math.max(width - PAD.left - PAD.right, 1);
  const x = (i: number) => PAD.left + (points.length > 1 ? (i / (points.length - 1)) * plotWidth : plotWidth / 2);
  const y = (elo: number) => PAD.top + (1 - (elo - low) / (high - low)) * (HEIGHT - PAD.top - PAD.bottom);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.elo)}`).join('');
  const area = `${line}L${x(points.length - 1)},${y(low)}L${x(0)},${y(low)}Z`;
  const last = points.length - 1;
  const date = (at: number) => formatDate(lang, at, { month: 'short', day: 'numeric' });

  // the nearest match to the pointer, along x
  const pick = (clientX: number) => {
    const left = box.current!.getBoundingClientRect().left;
    const i = Math.round(((clientX - left - PAD.left) / plotWidth) * last);
    setHover(Math.min(Math.max(i, 0), last));
  };

  const shown = hover === null ? null : points[hover];
  const change = hover ? points[hover].elo - points[hover - 1].elo : null;

  return (
    <div className="grid gap-3">
      {boards.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t(lang, 'kits')}>
          {boards.map(b => (
            <button
              key={b.id}
              type="button"
              aria-pressed={b.id === board.id}
              onClick={() => { setBoardId(b.id); setHover(null); }}
              className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                b.id === board.id ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
            >
              {b.id === 'HCT' ? <ShieldPlusIcon className="size-3.5" /> : <ItemIcon id={b.icon} className="size-3.5" />}
              {b.name}
            </button>
          ))}
        </div>
      )}

      <div
        ref={box}
        // the svg is absolute, so its measured width never props the box (and the grid around it) open: a box that
        // grew while the window was wide (an iPad's app switcher) would otherwise never shrink back
        className="relative h-40 touch-pan-y"
        onPointerMove={e => pick(e.clientX)}
        onPointerDown={e => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={`${t(lang, 'eloHistory')}: ${board.name}`} className="absolute inset-0 overflow-visible">
            {ticks.map(tick => (
              <g key={tick}>
                <line x1={PAD.left} x2={PAD.left + plotWidth} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={1} />
                <text x={PAD.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                  {formatNumber(lang, tick)}
                </text>
              </g>
            ))}

            <path d={area} className="fill-[var(--chart-1)]" fillOpacity={0.1} />
            <path d={line} fill="none" className="stroke-[var(--chart-1)]" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {/* the current Elo, labelled at the line's end */}
            <circle cx={x(last)} cy={y(points[last].elo)} r={4} className="fill-[var(--chart-1)] stroke-card" strokeWidth={2} />
            <text x={x(last) + 8} y={y(points[last].elo)} dy="0.32em" className="fill-foreground text-xs font-semibold tabular-nums">
              {formatNumber(lang, points[last].elo)}
            </text>

            <text x={PAD.left} y={HEIGHT - 4} className="fill-muted-foreground text-[10px]">{date(points[0].at)}</text>
            <text x={PAD.left + plotWidth} y={HEIGHT - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{date(points[last].at)}</text>

            {shown && (
              <g>
                <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="stroke-muted-foreground" strokeWidth={1} />
                <circle cx={x(hover!)} cy={y(shown.elo)} r={4} className="fill-[var(--chart-1)] stroke-card" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}

        {shown && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-float"
            style={{ left: Math.min(Math.max(x(hover!) - 60, 0), Math.max(width - 120, 0)), width: 120 }}
          >
            <div className="text-muted-foreground">{date(shown.at)}</div>
            <div className="flex items-baseline justify-between gap-2 tabular-nums">
              <span className="flex items-center gap-1.5 font-semibold">
                <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-full bg-[var(--chart-1)]" />
                {formatNumber(lang, shown.elo)}
              </span>
              {change !== null && change !== 0 && (
                <span className={change > 0 ? 'text-win' : 'text-loss'}>{change > 0 ? '+' : '−'}{Math.abs(change)}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* every point, for screen readers */}
      <table className="sr-only">
        <caption>{`${t(lang, 'eloHistory')}: ${board.name}`}</caption>
        <tbody>
          {points.map((p, i) => <tr key={i}><td>{date(p.at)}</td><td>{p.elo}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
