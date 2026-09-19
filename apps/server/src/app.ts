import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { isIsoDate, isWishType } from '@nebo/shared';
import type { Config } from './config.ts';
import type { WishStore } from './store.ts';
import type { KeyStore } from './auth.ts';

export const COOKIE = 'nebo';
const YEAR = 365 * 24 * 3600;

export const buildApp = async (cfg: Config, store: WishStore, keys: KeyStore): Promise<FastifyInstance> => {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test', trustProxy: true });

  await app.register(cookie, { secret: cfg.cookieSecret });
  await app.register(rateLimit, { global: false });

  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Content-Type-Options', 'nosniff');
  });

  const sessionKeyId = (raw: string | undefined): string | null => {
    if (!raw) return null;
    const u = app.unsignCookie(raw);
    return u.valid && u.value && keys.isActive(u.value) ? u.value : null;
  };

  app.get('/healthz', async () => ({ ok: true }));

  app.get<{ Querystring: { k?: string } }>(
    '/unlock',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      reply.header('Cache-Control', 'no-store');
      const id = keys.verify(req.query.k ?? '');
      if (!id) return reply.redirect('/locked?bad=1', 302);
      keys.touch(id);
      reply.setCookie(COOKIE, id, {
        signed: true, httpOnly: true, secure: cfg.secureCookie, sameSite: 'lax', path: '/', maxAge: YEAR,
      });
      return reply.redirect('/', 302);
    },
  );

  // усе під /api вимагає сесії
  await app.register(async (api) => {
    api.addHook('onRequest', async (req, reply) => {
      reply.header('Cache-Control', 'private, no-store');
      const id = sessionKeyId(req.cookies[COOKIE]);
      if (!id) return reply.code(401).send({ error: 'locked' });
      keys.touch(id);
    });

    api.get('/me', async () => ({ ok: true }));

    api.get('/index', async (req, reply) => {
      const idx = store.index();
      const etag = `"${idx.night.length}-${idx.morning.length}-${idx.night.at(-1)}-${idx.morning.at(-1)}-${idx.start}"`;
      if (req.headers['if-none-match'] === etag) return reply.code(304).send();
      reply.header('ETag', etag);
      return idx;
    });

    api.get<{ Params: { type: string; date: string } }>('/wish/:type/:date', async (req, reply) => {
      const { type, date } = req.params;
      if (!isWishType(type) || !isIsoDate(date)) return reply.code(400).send({ error: 'bad request' });
      const w = await store.getWithNeighbors(type, date);
      if (!w) return reply.code(404).send({ error: 'not found' });
      return w;
    });
  }, { prefix: '/api' });

  return app;
};
