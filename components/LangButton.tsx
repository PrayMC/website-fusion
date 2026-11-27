import { LanguagesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type Lang } from '@/lib/i18n';
import { LANG_NAMES } from '@/lib/langs';

/** The language menu's button, alike before the menu's code arrives (TopBar) and as its trigger after (LangMenu). */
export default function LangButton({ lang, ...props }: { lang: Lang } & React.ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground" aria-label={`${t(lang, 'language')}: ${LANG_NAMES[lang]}`} {...props}>
      <LanguagesIcon />
      <span className="hidden sm:inline">{LANG_NAMES[lang]}</span>
    </Button>
  );
}
