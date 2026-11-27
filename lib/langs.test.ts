import assert from 'node:assert/strict';
import test from 'node:test';
import { langFrom } from './langs.ts';

test('the language picked in the top bar wins over the browser', () => {
  assert.equal(langFrom('zh', 'ko-KR,ko;q=0.9'), 'zh');
  // a cookie for a language the site no longer has falls through
  assert.equal(langFrom('fr', 'ko-KR'), 'ko');
});

test("the browser's first language the site has, else English", () => {
  assert.equal(langFrom(undefined, 'ko-KR,ko;q=0.9,en-US;q=0.8'), 'ko');
  assert.equal(langFrom(undefined, 'zh-TW,zh;q=0.9'), 'zh');
  assert.equal(langFrom(undefined, 'fr-FR,fr;q=0.9,ko;q=0.5'), 'ko');
  assert.equal(langFrom(undefined, 'en;q=0.5,zh;q=0.8'), 'zh');
  assert.equal(langFrom(undefined, 'fr-FR,de;q=0.9'), 'en');
  assert.equal(langFrom(undefined, 'ko;q=0'), 'en');
  assert.equal(langFrom(undefined, null), 'en');
});
