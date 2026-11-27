import { upstream } from './images.ts';
import { pictureSeconds } from './keep.ts';

// What serving /img/<kind>/<id> needs from outside: lib/pictures.test.ts passes fakes, app/img/[...path]/route.ts the
// real backend and fetch
export type PictureSources = {
  /** The backend's /api/known/<uuid>: 200 for a player the server has seen, 404 otherwise. */
  askBackend: (path: string) => Promise<Response>;
  /** A picture from its outside host, kept maxAge seconds on this server's disk. */
  fetchPicture: (url: string, maxAge: number) => Promise<Response>;
};

// a "no such picture" the browser keeps too, so it doesn't ask again on every popup
const missing = (maxAge: number) => new Response(null, { status: 404, headers: { 'Cache-Control': `public, max-age=${maxAge}` } });

/**
 * Serves /img/<body|head|item|block>/<uuid or material>: the picture from its outside host, cached here and in the
 * browser. Each call makes a server of its own, with its own memory of known players and block textures.
 */
export function pictures({ askBackend, fetchPicture }: PictureSources) {
  // a known player stays known (players don't leave the players table), so each is asked about once per process;
  // only real players get in, so this stays as small as the server's player count
  const knownPlayers = new Set<string>();

  // materials whose texture the game keeps under block/ (a beacon, planks), learned from a 404 under item/: asked for
  // there directly after, so the 404, which isn't cached, isn't fetched again. Only real blocks get in
  const blockTextures = new Set<string>();

  async function isKnown(uuid: string) {
    if (knownPlayers.has(uuid)) return true;
    const res = await askBackend(`/api/known/${uuid}`);
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`Fusion API answered ${res.status} for /api/known`);
    knownPlayers.add(uuid);
    return true;
  }

  return async function serve(kind: string, id: string): Promise<Response> {
    if (!upstream(kind, id)) {
      return new Response(null, { status: 404 });
    }

    const maxAge = pictureSeconds(kind);

    try {
      // skins only for players the server has seen: for any made-up UUID the host draws a default skin, and keeping
      // those would fill this server's disk without end. A player who joins later gets theirs soon after (lib/keep.ts)
      if ((kind === 'body' || kind === 'head') && !(await isKnown(id.toLowerCase()))) {
        return missing(pictureSeconds(kind, false));
      }

      // an item's texture, else its block's, so the browser asks once for either
      const asBlock = kind === 'item' && blockTextures.has(id);
      let res = await fetchPicture(upstream(asBlock ? 'block' : kind, id)!, maxAge);

      if (res.status === 404 && kind === 'item' && !asBlock) {
        res = await fetchPicture(upstream('block', id)!, maxAge);
        if (res.ok) blockTextures.add(id);
      }

      if (res.status === 404) {
        return missing(maxAge);
      }

      if (!res.ok) {
        return new Response(null, { status: 502 });
      }

      return new Response(res.body, {
        headers: { 'Content-Type': res.headers.get('content-type') ?? 'image/png', 'Cache-Control': `public, max-age=${maxAge}` },
      });
    } catch {
      return new Response(null, { status: 502 });
    }
  };
}
