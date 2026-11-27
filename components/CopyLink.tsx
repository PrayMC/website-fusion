'use client';

import { CheckIcon, LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t, type Lang } from '@/lib/i18n';

/**
 * Copies a link to a player or match that a chat app can preview: ?player= and ?match= reach the server, which gives
 * them a card (app/page.tsx generateMetadata), where the popups' own #player= address never leaves the browser.
 */
export default function CopyLink({ query, lang }: { query: string; lang: Lang }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/?${query}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no clipboard (an insecure page, or refused): nothing to show
    }
  };

  return (
    <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={copy} aria-live="polite">
      {copied ? <CheckIcon /> : <LinkIcon />}
      {t(lang, copied ? 'linkCopied' : 'copyLink')}
    </Button>
  );
}
