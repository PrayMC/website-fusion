import assert from 'node:assert/strict';
import test from 'node:test';
import { pageNumber, pageWindow } from './pages.ts';

test('pageNumber reads ?page= as a whole page the API can parse', () => {
  assert.equal(pageNumber(undefined), 1);
  assert.equal(pageNumber('3'), 3);
  assert.equal(pageNumber('2.7'), 2);
  assert.equal(pageNumber('0'), 1);
  assert.equal(pageNumber('-4'), 1);
  assert.equal(pageNumber('abc'), 1);
  assert.equal(pageNumber('1e12'), 2 ** 31 - 1);
});

test('pageWindow keeps the ends and the pages near this one', () => {
  const draw = (page: number, pages: number) => pageWindow(page, pages).map(n => n ?? '…').join(' ');
  assert.equal(draw(1, 1), '1');
  assert.equal(draw(1, 3), '1 2 3');
  assert.equal(draw(1, 60), '1 2 3 … 60');
  assert.equal(draw(30, 60), '1 … 28 29 30 31 32 … 60');
  assert.equal(draw(60, 60), '1 … 58 59 60');
  // a lone hidden page is drawn rather than hidden behind a "…" of the same size
  assert.equal(draw(5, 7), '1 2 3 4 5 6 7');
  assert.equal(draw(5, 60), '1 2 3 4 5 6 7 … 60');
  assert.equal(draw(56, 60), '1 … 54 55 56 57 58 59 60');
});
