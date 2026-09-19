import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
process.env.NODE_ENV = 'test';
import { buildApp } from './app.ts';
import { WishStore } from './store.ts';
import { KeyStore } from './auth.ts';
import { loadConfig } from './config.ts';

const setup = async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'nebo-'));
  const cfg = loadConfig({ COOKIE_SECRET: 'x'.repeat(32), DATA_DIR: dir, PUBLIC_URL: 'https://example.test' });
  const store = new WishStore(dir);
  const keys = new KeyStore(dir);
  await store.load(); await keys.load();
  await store.set('night', '2026-08-01', 'Добраніч 🥰\n\nДругий абзац');
  await store.set('night', '2026-08-02', 'Ніч 2');
  await store.set('morning', '2026-08-02', 'Ранок 2');
  const app = await buildApp(cfg, store, keys);
  return { app, store, keys, dir, done: async () => { await app.close(); await rm(dir, { recursive: true }); } };
};

const cookieOf = (res: { headers: Record<string, any> }) => String(res.headers['set-cookie']).split(';')[0];

test('api is locked without session', async () => {
  const { app, done } = await setup();
  for (const url of ['/api/index', '/api/me', '/api/wish/night/2026-08-01']) {
    assert.equal((await app.inject(url)).statusCode, 401, url);
  }
  assert.equal((await app.inject('/healthz')).statusCode, 200);
  await done();
});

test('unlock: bad key → redirect to /locked, no cookie', async () => {
  const { app, done } = await setup();
  const r = await app.inject('/unlock?k=' + 'a'.repeat(43));
  assert.equal(r.statusCode, 302);
  assert.match(String(r.headers.location), /^\/locked/);
  assert.equal(r.headers['set-cookie'], undefined);
  await done();
});

test('unlock → cookie → api works; revoke kills the session immediately', async () => {
  const { app, keys, done } = await setup();
  const { id, key } = await keys.create('test');
  const r = await app.inject('/unlock?k=' + key);
  assert.equal(r.statusCode, 302);
  assert.equal(r.headers.location, '/');
  const sc = String(r.headers['set-cookie']);
  assert.match(sc, /HttpOnly/i); assert.match(sc, /Secure/i); assert.match(sc, /SameSite=Lax/i); assert.match(sc, /Max-Age=31536000/);
  const cookie = cookieOf(r);

  const idx = await app.inject({ url: '/api/index', headers: { cookie } });
  assert.equal(idx.statusCode, 200);
  assert.deepEqual(idx.json(), { start: '2026-08-01', night: ['2026-08-01', '2026-08-02'], morning: ['2026-08-02'] });
  assert.equal(idx.headers['x-robots-tag'], 'noindex, nofollow, noarchive');

  const etag = String(idx.headers.etag);
  assert.equal((await app.inject({ url: '/api/index', headers: { cookie, 'if-none-match': etag } })).statusCode, 304);

  await keys.revoke(id);
  assert.equal((await app.inject({ url: '/api/me', headers: { cookie } })).statusCode, 401);
  assert.equal((await app.inject('/unlock?k=' + key)).headers['set-cookie'], undefined);
  await done();
});

test('forged cookie is rejected', async () => {
  const { app, keys, done } = await setup();
  const { id } = await keys.create('t');
  assert.equal((await app.inject({ url: '/api/me', headers: { cookie: `nebo=${id}` } })).statusCode, 401);
  assert.equal((await app.inject({ url: '/api/me', headers: { cookie: `nebo=${id}.forged` } })).statusCode, 401);
  await done();
});

test('wish endpoint: neighbors, counterpart, validation', async () => {
  const { app, keys, done } = await setup();
  const { key } = await keys.create('t');
  const cookie = cookieOf(await app.inject('/unlock?k=' + key));
  const g = (u: string) => app.inject({ url: u, headers: { cookie } });

  const a = (await g('/api/wish/night/2026-08-01')).json();
  assert.equal(a.text, 'Добраніч 🥰\n\nДругий абзац');
  assert.deepEqual([a.prev, a.next, a.counterpart], [null, '2026-08-02', false]);
  const b = (await g('/api/wish/night/2026-08-02')).json();
  assert.deepEqual([b.prev, b.next, b.counterpart], ['2026-08-01', null, true]);

  assert.equal((await g('/api/wish/night/2026-08-09')).statusCode, 404);
  assert.equal((await g('/api/wish/dawn/2026-08-01')).statusCode, 400);
  assert.equal((await g('/api/wish/night/..%2F..%2Fetc')).statusCode, 400);
  await done();
});

test('unlock is rate limited', async () => {
  const { app, done } = await setup();
  let last = 0;
  for (let i = 0; i < 12; i++) last = (await app.inject('/unlock?k=' + 'b'.repeat(43))).statusCode;
  assert.equal(last, 429);
  await done();
});

test('store: set/delete keep index sorted; files are plain md with frontmatter', async () => {
  const { store, dir, done } = await setup();
  assert.equal(await store.set('night', '2026-07-31', 'x'), false);
  assert.equal(await store.set('night', '2026-07-31', 'y'), true);
  assert.deepEqual(store.index().night, ['2026-07-31', '2026-08-01', '2026-08-02']);
  assert.match(await readFile(path.join(dir, 'wishes/night/2026-07-31.md'), 'utf8'), /^---\ndate: 2026-07-31\ntype: night\nupdatedAt: .+\n---\ny\n$/);
  assert.equal(await store.delete('night', '2026-07-31'), true);
  assert.equal(await store.delete('night', '2026-07-31'), false);
  assert.equal(store.index().start, '2026-08-01');
  await assert.rejects(() => store.get('night', '../x' as any));
  await done();
});

test('keys.json stores only hashes', async () => {
  const { keys, dir, done } = await setup();
  const { key } = await keys.create('t');
  const raw = await readFile(path.join(dir, 'access/keys.json'), 'utf8');
  assert.ok(!raw.includes(key));
  await done();
});

test('failed keys.json write in touch() does not crash the process and later saves still work', async () => {
  const { keys, dir, done } = await setup();
  const { id, key } = await keys.create('t');
  const { chmod } = await import('node:fs/promises');
  await chmod(path.join(dir, 'access'), 0o500); // read-only → writeFile падає
  keys.verify(key);
  keys.touch(id); // не має кинути unhandled rejection
  await new Promise((r) => setTimeout(r, 100));
  await chmod(path.join(dir, 'access'), 0o700);
  assert.ok((await keys.create('after')).id); // ланцюжок збереження не зламаний
  await done();
});

test('key created by another process (CLI) is picked up without restart', async () => {
  const { app, dir, done } = await setup();
  const other = new KeyStore(dir); // окремий екземпляр = інший процес
  await other.load();
  const { key } = await other.create('cli');
  const r = await app.inject('/unlock?k=' + key);
  assert.equal(r.statusCode, 302);
  assert.equal(r.headers.location, '/');
  assert.ok(r.headers['set-cookie']);
  await done();
});
