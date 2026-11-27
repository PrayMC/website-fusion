import assert from 'node:assert/strict';
import test from 'node:test';
import { upstream } from './images.ts';

const UUID = '35edb893-5f18-58de-e4d1-384d59288c5b';

test('the image route passes on only the pictures the site shows', () => {
  assert.equal(upstream('body', UUID), `https://mc-heads.net/body/${UUID}/64`);
  assert.equal(upstream('head', UUID), `https://mc-heads.net/avatar/${UUID}/22`);
  assert.equal(upstream('item', 'diamond_sword'), 'https://assets.mcasset.cloud/1.21.4/assets/minecraft/textures/item/diamond_sword.png');
  assert.equal(upstream('block', 'beacon'), 'https://assets.mcasset.cloud/1.21.4/assets/minecraft/textures/block/beacon.png');

  // anything else would make this server fetch whatever a visitor names
  assert.equal(upstream('body', 'Notch'), null);
  assert.equal(upstream('item', '../../../evil'), null);
  assert.equal(upstream('item', 'Diamond_Sword'), null);
  assert.equal(upstream('skin', UUID), null);
});
