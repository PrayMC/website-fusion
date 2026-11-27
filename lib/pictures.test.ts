import assert from 'node:assert/strict';
import test from 'node:test';
import { pictures } from './pictures.ts';

const KNOWN = '35edb893-5f18-58de-e4d1-384d59288c5b';
const STRANGER = '00000000-0000-0000-0000-000000000001';

// a backend that knows one player, and outside hosts with item/ textures for swords only and block/ ones for beacons;
// every call is written down
function fakes() {
  const backend: string[] = [];
  const outside: string[] = [];
  const serve = pictures({
    askBackend: async path => {
      backend.push(path);
      return new Response(null, { status: path.endsWith(KNOWN) ? 200 : 404 });
    },
    fetchPicture: async url => {
      outside.push(url);
      const found = url.includes('mc-heads.net') || url.endsWith('/item/diamond_sword.png') || url.endsWith('/block/beacon.png');
      return new Response(found ? 'png' : null, { status: found ? 200 : 404 });
    },
  });
  return { serve, backend, outside };
}

test('a skin is fetched only for a player the server has seen', async () => {
  const { serve, backend, outside } = fakes();

  assert.equal((await serve('body', STRANGER)).status, 404);
  assert.equal((await serve('body', STRANGER)).status, 404);
  // a stranger is asked about every time (a no isn't kept, they may join), and never fetched
  assert.equal(backend.length, 2);
  assert.deepEqual(outside, []);

  assert.equal((await serve('body', KNOWN)).status, 200);
  assert.equal((await serve('head', KNOWN)).status, 200);
  // a yes is kept: the backend is asked once
  assert.equal(backend.length, 3);
  assert.equal(outside.length, 2);
});

test("an item's texture falls back to its block's, then is asked for there directly", async () => {
  const { serve, outside } = fakes();

  assert.equal((await serve('item', 'beacon')).status, 200);
  assert.deepEqual(outside.map(url => url.split('/textures/')[1]), ['item/beacon.png', 'block/beacon.png']);

  assert.equal((await serve('item', 'beacon')).status, 200);
  assert.deepEqual(outside.map(url => url.split('/textures/')[1]).slice(2), ['block/beacon.png']);
});

test('a texture missing for good is a 404 the browser keeps; anything else is never fetched', async () => {
  const { serve, backend, outside } = fakes();

  const res = await serve('item', 'no_such_thing');
  assert.equal(res.status, 404);
  assert.match(res.headers.get('cache-control') ?? '', /max-age=31536000/);

  outside.length = 0;
  for (const [kind, id] of [['item', '../evil'], ['body', 'Notch'], ['skin', KNOWN]]) {
    assert.equal((await serve(kind, id)).status, 404);
  }
  assert.deepEqual(outside, []);
  assert.deepEqual(backend, []);
});
