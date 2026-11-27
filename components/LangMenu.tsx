'use client';

import { useRouter } from 'next/navigation';
import LangButton from '@/components/LangButton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Lang } from '@/lib/i18n';
import { LANG_COOKIE, LANG_NAMES, LANGS } from '@/lib/langs';

/**
 * The site's languages; the one picked is kept a year in a cookie, so the server renders every page in it, and the
 * page is rendered again in it at once. Until one is picked the browser's language is used (lib/langs.ts). Loaded
 * only once the button is pointed at or pressed (TopBar): Radix's menu is a sixth of the page's script.
 */
export default function LangMenu({ lang, defaultOpen }: { lang: Lang; defaultOpen?: boolean }) {
  const router = useRouter();

  const pick = (next: string) => {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>
        <LangButton lang={lang} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={lang} onValueChange={pick}>
          {/* each name in its own language, so a screen reader reads it right */}
          {LANGS.map(option => <DropdownMenuRadioItem key={option} value={option} lang={option}>{LANG_NAMES[option]}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
