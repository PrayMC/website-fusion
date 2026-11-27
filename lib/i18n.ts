import en from '@/messages/en.json';
import ko from '@/messages/ko.json';
import zh from '@/messages/zh.json';
import { DEFAULT_LANG, LOCALES, type Lang } from '@/lib/langs';

export type { Lang } from '@/lib/langs';

const messages: Record<Lang, unknown> = { en, ko, zh };

const lookup = (lang: Lang, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[lang]);

/**
 * Looks up a dotted key ("tiers.GOLD") and fills its {placeholders}. A key a language lacks comes from English; one
 * English lacks too comes back as the key.
 */
export function t(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const found = lookup(lang, key) ?? lookup(DEFAULT_LANG, key);
  const text = typeof found === 'string' ? found : key.split('.').pop()!;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

export const formatNumber = (lang: Lang, n: number) => n.toLocaleString(LOCALES[lang]);

export const formatDate = (lang: Lang, at: number, options: Intl.DateTimeFormatOptions) => new Date(at).toLocaleString(LOCALES[lang], options);
