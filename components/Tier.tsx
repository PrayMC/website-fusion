import { Badge } from '@/components/ui/badge';
import { t, type Lang } from '@/lib/i18n';

// a soft neon glow in the tier's own color, brighter on the dark theme; the border takes the color faintly too
const NEON = '[text-shadow:0_0_6px_color-mix(in_srgb,currentColor_35%,transparent)] dark:[text-shadow:0_0_8px_color-mix(in_srgb,currentColor_75%,transparent)] border-current/30';

/** A tier name in its color (--tier-<tier> in globals.css); tiers added in config.yml fall back to gray. */
export default function Tier({ tier, lang }: { tier: string; lang: Lang }) {
  // no tier table in config.yml: no tiers to show
  if (!tier) return null;
  return (
    <Badge variant="outline" className={`font-semibold ${NEON}`} style={{ color: `var(--tier-${tier.toLowerCase()}, var(--muted-foreground))` }}>
      {t(lang, `tiers.${tier}`)}
    </Badge>
  );
}
