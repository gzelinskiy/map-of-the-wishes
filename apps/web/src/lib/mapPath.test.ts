import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMapLayout, nearestStop } from './mapPath.ts';

const daysRange = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = new Date(from + 'T00:00:00Z'); d <= new Date(to + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
};
const sample = [...daysRange('2026-06-26', '2026-09-19')];

test('empty input → empty layout', () => {
  const l = buildMapLayout([], 'night');
  assert.equal(l.stops.length, 0);
  assert.equal(l.hero, null);
});

test('every wish gets exactly one stop; hero is the newest', () => {
  const l = buildMapLayout(sample, 'morning');
  assert.equal(l.stops.length, sample.length);
  assert.equal(new Set(l.stops.map((s) => s.date)).size, sample.length);
  assert.equal(l.hero!.date, '2026-09-19');
  assert.equal(l.startDate, '2026-06-26');
});

test('months: newest first, counts add up, node = first wish of month', () => {
  const l = buildMapLayout(sample, 'night');
  assert.deepEqual(l.months.map((m) => m.key), ['2026-09', '2026-08', '2026-07', '2026-06']);
  assert.equal(l.months.reduce((a, m) => a + m.count, 0), sample.length);
  const aug = l.months.find((m) => m.key === '2026-08')!;
  assert.equal(aug.firstDate, '2026-08-01');
  assert.equal(aug.label, '31 ніч');
  const nodeStop = l.stops.find((s) => s.date === '2026-08-01')!;
  assert.deepEqual([nodeStop.x, nodeStop.y], [aug.x, aug.y]);
});

test('stops go top→bottom, all inside the map, no NaN', () => {
  const l = buildMapLayout(sample, 'night');
  let prev = -Infinity;
  for (const s of l.stops) {
    assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y));
    assert.ok(s.x > 0 && s.x < l.width, `x ${s.x}`);
    assert.ok(s.y >= prev - 6, `y not descending: ${s.y} after ${prev}`); // допуск на розкид
    assert.ok(s.y < l.height);
    prev = s.y;
  }
  assert.ok(l.hillsY < l.height);
});

test('deterministic for same input, different per type', () => {
  const a = buildMapLayout(sample, 'night'), b = buildMapLayout(sample, 'night'), c = buildMapLayout(sample, 'morning');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.stops.map((s) => s.x), c.stops.map((s) => s.x));
});

test('months alternate sides', () => {
  const l = buildMapLayout(sample, 'night');
  assert.deepEqual(l.months.map((m) => m.pill), ['right', 'left', 'right', 'left']);
});

test('edge cases: 1 wish, 2 wishes in different months', () => {
  const one = buildMapLayout(['2026-09-19'], 'night');
  assert.equal(one.stops.length, 1);
  assert.equal(one.months.length, 1);
  assert.equal(one.stops[0].isNode, true);
  assert.deepEqual([one.months[0].x, one.months[0].y], [250, 262]);
  const two = buildMapLayout(['2026-08-31', '2026-09-01'], 'morning');
  assert.equal(two.stops.length, 2);
  assert.equal(two.months.length, 2);
  assert.ok(two.months.every((m) => Number.isFinite(m.x) && Number.isFinite(m.y)));
});

test('gaps in data still produce one stop per existing date', () => {
  const l = buildMapLayout(['2026-07-01', '2026-07-05', '2026-09-19'], 'night');
  assert.equal(l.stops.length, 3);
  assert.equal(l.months.length, 2);
});

test('nearestStop', () => {
  const l = buildMapLayout(sample, 'night');
  const h = l.hero!;
  assert.equal(nearestStop(l, h.x + 3, h.y - 2)!.date, h.date);
  assert.equal(nearestStop(l, -100, -100), null);
});
