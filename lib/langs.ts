// The site's languages and how one is picked; no imports, so lib/langs.test.ts can run it

export const LANGS = ['en', 'ko', 'zh'] as const;
export type Lang = (typeof LANGS)[number];

/** The language nothing else picks: one the visitor's browser doesn't ask for, or none at all. */
export const DEFAULT_LANG: Lang = 'en';

/** Where the language picked in the top bar is kept, so the server renders the next page in it. */
export const LANG_COOKIE = 'lang';

/** Each language by its own name, as the language menu lists them. */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', ko: '한국어', zh: '中文(简体)' };

/** The locale numbers and dates are written in. */
export const LOCALES: Record<Lang, string> = { en: 'en-US', ko: 'ko-KR', zh: 'zh-CN' };

const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

/**
 * The language to show: the one picked in the top bar (its cookie), else the first of the browser's languages
 * (Accept-Language, best first by q) that the site has, else English.
 */
export function langFrom(picked: string | undefined, acceptLanguage: string | null): Lang {
  if (isLang(picked)) return picked;

  const asked = (acceptLanguage ?? '').split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';');
      const q = Number(params.find(p => p.trim().startsWith('q='))?.split('=')[1] ?? 1);
      return { lang: tag.split('-')[0], q: Number.isFinite(q) ? q : 0, index };
    })
    .filter(choice => choice.q > 0)
    // best first; a tie keeps the browser's order
    .sort((a, b) => b.q - a.q || a.index - b.index);

  return asked.map(choice => choice.lang).find(isLang) ?? DEFAULT_LANG;
}
