import { fetchApi } from '@/lib/api';
import { pictures } from '@/lib/pictures';

// a slow outside host shouldn't hold the page's pictures for long
const TIMEOUT_MS = 5000;

const serve = pictures({
  askBackend: path => fetchApi(path, { cache: 'no-store' }),
  // Next's data cache keeps the answer on this server's disk, so a picture leaves for the outside host once per maxAge
  fetchPicture: (url, maxAge) => fetch(url, { next: { revalidate: maxAge }, signal: AbortSignal.timeout(TIMEOUT_MS) }),
});

/** /img/<body|head|item|block>/<uuid or material>: see lib/pictures.ts. */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const [kind = '', id = '', ...rest] = (await params).path;
  return rest.length ? new Response(null, { status: 404 }) : serve(kind, id);
}
