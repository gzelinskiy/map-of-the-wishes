import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeWish, parseWish, normalizeText, paragraphs } from './index.ts';

test('roundtrip preserves emoji and paragraphs', () => {
  const w = { type: 'night' as const, date: '2026-08-01', text: 'Добраніч 🥰\n\nДругий абзац) ❤️' };
  const back = parseWish(serializeWish(w));
  assert.deepEqual(back, w);
});

test('normalizeText', () => {
  assert.equal(normalizeText('﻿a  \r\n\r\n\r\n\r\nb\n'), 'a\n\nb');
});

test('parse without frontmatter uses fallback', () => {
  const w = parseWish('Привіт', { type: 'morning', date: '2026-06-26' });
  assert.equal(w.text, 'Привіт');
  assert.equal(w.type, 'morning');
});

test('paragraphs', () => {
  assert.deepEqual(paragraphs('a\n\n\nb\nc'), ['a', 'b\nc']);
});
