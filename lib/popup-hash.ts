// The popups follow the address (#player=, #match=, or both), so Back closes the top one and a shared link opens it.
// Apart from the popups, so the search can open one without loading them.

export type Open = { player: string | null; match: string | null };

export const parseHash = (hash: string): Open => {
  const params = new URLSearchParams(hash.slice(1));
  return { player: params.get('player'), match: params.get('match') };
};

export const readHash = () => parseHash(location.hash);

export const hashOf = (open: Open) => {
  const params = new URLSearchParams();
  if (open.player) params.set('player', open.player);
  if (open.match) params.set('match', open.match);
  return params.size ? `#${params}` : '';
};

/**
 * Opens popups with a history entry marked as this page's own, so closing them can step back instead of leaving a
 * Back press that does nothing. Next's own history state is kept, or its router would reload the page on Back.
 */
export function openPopups(next: Open) {
  history.pushState({ ...history.state, popup: true }, '', location.pathname + location.search + hashOf(next));
  dispatchEvent(new HashChangeEvent('hashchange'));
}
