import { fetchApi } from '@/lib/api';
import { cacheControl } from '@/lib/keep';

// Browser calls (search, profiles, matches). Browsers only ever talk to this server; the call goes on to the
// backend with its token (or to the sample players, see lib/api.ts).
export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const res = await fetchApi(url.pathname + url.search, { cache: 'no-store' });
    const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' };
    // Vercel's CDN answers the same request again itself for as long as lib/keep.ts allows
    const cache = cacheControl(url.pathname, res.status);
    if (cache) headers['Cache-Control'] = cache;
    return new Response(res.body, { status: res.status, headers });
  } catch {
    // the backend is down or too slow, or FUSION_API_URL is missing; the popups show "couldn't load"
    return Response.json({ error: 'backend unreachable' }, { status: 502 });
  }
}
