import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatShort, plural, countLabel, groupByMonth, effectiveNightDate, isIsoDate } from './index.ts';

test('formatDate / formatShort', () => {
  assert.equal(formatDate('2026-09-19'), '19 вересня');
  assert.equal(formatShort('2026-09-19'), '19 вер');
  assert.equal(formatDate('2026-06-05'), '5 червня');
});

test('plural', () => {
  assert.equal(countLabel('night', 1), '1 ніч');
  assert.equal(countLabel('night', 3), '3 ночі');
  assert.equal(countLabel('night', 11), '11 ночей');
  assert.equal(countLabel('night', 31), '31 ніч');
  assert.equal(countLabel('morning', 22), '22 ранки');
  assert.equal(plural(12, 'a', 'b', 'c'), 'c');
});

test('groupByMonth: newest month first, dates ascending', () => {
  const g = groupByMonth(['2026-06-26', '2026-07-01', '2026-07-02', '2026-09-01']);
  assert.deepEqual(g.map((x) => x.key), ['2026-09', '2026-07', '2026-06']);
  assert.deepEqual(g[1].dates, ['2026-07-01', '2026-07-02']);
  assert.equal(g[0].name, 'Вересень');
});

test('effectiveNightDate rolls back after midnight (Kyiv)', () => {
  // 2026-09-20 01:30 Kyiv (UTC+3) = 2026-09-19 22:30Z
  assert.equal(effectiveNightDate(new Date('2026-09-19T22:30:00Z')), '2026-09-19');
  // 2026-09-19 23:30 Kyiv
  assert.equal(effectiveNightDate(new Date('2026-09-19T20:30:00Z')), '2026-09-19');
  // 2026-09-20 08:00 Kyiv
  assert.equal(effectiveNightDate(new Date('2026-09-20T05:00:00Z')), '2026-09-20');
});

test('isIsoDate', () => {
  assert.ok(isIsoDate('2026-02-28'));
  assert.ok(!isIsoDate('2026-02-30'));
  assert.ok(!isIsoDate('26-1-1'));
});
