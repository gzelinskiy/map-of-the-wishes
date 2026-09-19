import test from 'node:test';
import assert from 'node:assert/strict';
import { skyWidth, mapSkyBox } from './viewport.ts';

test('phones keep the original 390-unit sky', () => {
  assert.equal(skyWidth(390, 844), 390);
  assert.equal(skyWidth(360, 740), 390);   // raw 410
  assert.equal(skyWidth(430, 932), 390);   // raw 389
  assert.equal(skyWidth(375, 667), 390);   // iPhone SE: коротший екран, але той самий світ
});

test('wide screens get a proportionally wider sky, quantised to 64', () => {
  assert.equal(skyWidth(1965, 1303), 1280); // raw 1273
  assert.equal(skyWidth(1440, 900), 1408);  // raw 1350
  assert.equal(skyWidth(768, 1024), 640);   // raw 633
  assert.ok(skyWidth(844, 390) > 1000);
  assert.equal(skyWidth(1920, 1080) % 64, 0);
});

test('resizing by a few px does not change the sky', () => {
  assert.equal(skyWidth(1965, 1303), skyWidth(1961, 1300));
  assert.equal(skyWidth(390, 844), skyWidth(390, 780)); // тулбар мобільного браузера
});

test('degenerate viewport does not blow up', () => {
  assert.ok(Number.isFinite(skyWidth(0, 0)));
  assert.ok(Number.isFinite(skyWidth(800, 0)));
});

test('map sky: phone = plain column, desktop = centred column', () => {
  assert.deepEqual(mapSkyBox(390), { Wu: 390, xOff: 0 });
  assert.deepEqual(mapSkyBox(480), { Wu: 390, xOff: 0 });
  const d = mapSkyBox(1965);
  assert.equal(d.Wu % 64, 0);
  assert.ok(d.Wu >= 1596);                 // 390·1965/480
  assert.equal(d.xOff, (d.Wu - 390) / 2);  // колонка по центру
  assert.ok(d.xOff > 0);
});
