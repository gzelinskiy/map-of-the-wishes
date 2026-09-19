import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUserDate, parseTypeToken, addDays } from './index.ts';

const today = '2026-09-19';
test('parseUserDate', () => {
  assert.equal(parseUserDate('2026-09-01', today), '2026-09-01');
  assert.equal(parseUserDate('01.09.2026', today), '2026-09-01');
  assert.equal(parseUserDate('1.9', today), '2026-09-01');
  assert.equal(parseUserDate('вчора', today), '2026-09-18');
  assert.equal(parseUserDate('31.02', today), null);
  assert.equal(parseUserDate('abc', today), null);
  assert.equal(parseUserDate('5.7.26', today), '2026-07-05');
});
test('parseTypeToken', () => {
  assert.equal(parseTypeToken('gn'), 'night');
  assert.equal(parseTypeToken('/GM'), 'morning');
  assert.equal(parseTypeToken('х'), null);
});
test('addDays crosses month', () => assert.equal(addDays('2026-09-01', -1), '2026-08-31'));
