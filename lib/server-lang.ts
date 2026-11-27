import { cookies, headers } from 'next/headers';
import { LANG_COOKIE, langFrom, type Lang } from '@/lib/langs';

/** The language this request is rendered in: the one picked in the top bar, else the browser's (lib/langs.ts). */
export async function currentLang(): Promise<Lang> {
  return langFrom((await cookies()).get(LANG_COOKIE)?.value, (await headers()).get('accept-language'));
}
