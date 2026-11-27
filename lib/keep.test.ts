import assert from 'node:assert/strict';
import test from 'node:test';
import { cacheControl, keepSeconds, outlived, pictureSeconds } from './keep.ts';

test('keepSeconds lets the boards lag but shows new matches at once', () => {
  assert.equal(keepSeconds('/api/kits'), 3_510);
  assert.equal(keepSeconds('/api/leaderboard'), 210);
  assert.equal(keepSeconds('/api/search'), 210);
  assert.equal(keepSeconds('/api/players/Notch'), 0);
  assert.equal(keepSeconds('/api/matches/1234abcd'), 86_400);
  assert.equal(keepSeconds('/api/players/069a79f4-44e9-4726-a5be-fca90e38aaf5/matches'), 0);
  assert.equal(keepSeconds('/api/players/069a79f4-44e9-4726-a5be-fca90e38aaf5/elo'), 0);
  assert.equal(keepSeconds('/api/known/069a79f4-44e9-4726-a5be-fca90e38aaf5'), 0);
  assert.equal(keepSeconds('/api/nope'), 0);
});

test('pictureSeconds keeps textures a year, skins a day, a skin not seen yet a few minutes', () => {
  assert.equal(pictureSeconds('item'), 31_536_000);
  assert.equal(pictureSeconds('block'), 31_536_000);
  assert.equal(pictureSeconds('body'), 86_400);
  assert.equal(pictureSeconds('head', false), 300);
});

test('cacheControl lets the CDN keep good answers only', () => {
  assert.equal(cacheControl('/api/leaderboard', 200), 'public, s-maxage=210');
  assert.equal(cacheControl('/api/leaderboard', 500), null);
  assert.equal(cacheControl('/api/leaderboard', 502), null);
  assert.equal(cacheControl('/api/matches/1234abcd', 404), null);
  assert.equal(cacheControl('/api/players/Notch', 200), null);
});

test('outlived tells an answer kept past its time from a fresh one', () => {
  const now = Date.parse('Mon, 23 Nov 2026 10:10:00 GMT');
  assert.equal(outlived('Mon, 23 Nov 2026 10:07:00 GMT', 210, now), false); // 180 s old
  assert.equal(outlived('Mon, 23 Nov 2026 10:00:00 GMT', 210, now), true); // 600 s old
  assert.equal(outlived(null, 210, now), false);
});
