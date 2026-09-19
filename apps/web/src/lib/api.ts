import type { WishIndex, WishResponse, WishType } from '@nebo/shared';

export class LockedError extends Error { constructor() { super('locked'); } }
export class NotFoundError extends Error { constructor() { super('not found'); } }

const getJson = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (r.status === 401) throw new LockedError();
  if (r.status === 404) throw new NotFoundError();
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
};

export const fetchIndex = () => getJson<WishIndex>('/api/index');

// Кеш побажань у памʼяті: гортання миттєве, сусідів підтягуємо наперед.
const cache = new Map<string, Promise<WishResponse>>();
const key = (t: WishType, d: string) => `${t}/${d}`;

export const getWish = (t: WishType, d: string): Promise<WishResponse> => {
  const k = key(t, d);
  let p = cache.get(k);
  if (!p) {
    p = getJson<WishResponse>(`/api/wish/${t}/${d}`);
    p.catch(() => cache.delete(k)); // не кешуємо помилки
    cache.set(k, p);
  }
  return p;
};

export const prefetchWish = (t: WishType, d: string | null | undefined) => {
  if (d) void getWish(t, d).catch(() => {});
};
