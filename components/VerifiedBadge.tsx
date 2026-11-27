import { cn } from '@/lib/utils';

/**
 * The /verified check badge. size and color are for the preview card, which has no CSS. With a label it shows a tooltip
 * and is read out; without one it's decoration beside text that says it.
 */
export default function VerifiedBadge({ label, size, color, className }: { label?: string; size?: number; color?: string; className?: string }) {
  const mark = (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cn('text-win', className)} style={color ? { color } : undefined} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <path d="M3.5 12.5l5.5 5.5L20.5 6" fill="none" stroke="currentColor" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (!label) return mark;

  // up 1px: centered on the line box, it sat 1px below the middle of the capitals (the line keeps room for descenders)
  return (
    <span className="group relative inline-flex shrink-0 -translate-y-px self-center">
      {mark}
      {/* below the badge: above it, the top of a popup's scrolling body would cut it off */}
      <span aria-hidden="true" className="pointer-events-none absolute top-full left-1/2 z-10 mt-1.5 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs font-normal tracking-normal whitespace-nowrap text-popover-foreground shadow-float group-hover:block">
        {label}
      </span>
    </span>
  );
}
