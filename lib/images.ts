// The site's pictures through this server (app/img): fetched once from mc-heads.net (skins) or assets.mcasset.cloud
// (the game's textures, not ours to ship), kept on disk and in browsers.

export const bodyImage = (uuid: string) => `/img/body/${uuid}`;

export const headImage = (uuid: string) => `/img/head/${uuid}`;

/** A material's texture ("diamond_sword"): the item's, or the block's for one the game keeps there (the route finds it). */
export const itemTexture = (material: string) => `/img/item/${material}`;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MATERIAL = /^[a-z0-9_]{1,64}$/;

/** The outside address behind /img/<kind>/<id>, or null for one this server doesn't pass on. */
export function upstream(kind: string, id: string): string | null {
  if (kind === 'body' && UUID.test(id)) return `https://mc-heads.net/body/${id}/64`;
  if (kind === 'head' && UUID.test(id)) return `https://mc-heads.net/avatar/${id}/22`;
  if ((kind === 'item' || kind === 'block') && MATERIAL.test(id)) return `https://assets.mcasset.cloud/1.21.4/assets/minecraft/textures/${kind}/${id}.png`;
  return null;
}

