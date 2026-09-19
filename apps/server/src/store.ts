import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  isIsoDate, isWishType, parseWish, serializeWish,
  type Wish, type WishIndex, type WishResponse, type WishType,
} from '@nebo/shared';

/** Файлове сховище: data/wishes/{type}/YYYY-MM-DD.md. Індекс дат тримаємо в памʼяті. */
export class WishStore {
  private dates: Record<WishType, string[]> = { night: [], morning: [] };
  constructor(private root: string) {}

  private dir = (t: WishType) => path.join(this.root, 'wishes', t);
  private file = (t: WishType, d: string) => path.join(this.dir(t), `${d}.md`);

  private assert(t: WishType, d: string) {
    if (!isWishType(t) || !isIsoDate(d)) throw new Error('bad wish key');
  }

  async load(): Promise<void> {
    for (const t of ['night', 'morning'] as const) {
      await mkdir(this.dir(t), { recursive: true });
      this.dates[t] = (await readdir(this.dir(t)))
        .filter((f) => f.endsWith('.md') && isIsoDate(f.slice(0, -3)))
        .map((f) => f.slice(0, -3))
        .sort();
    }
  }

  index(): WishIndex {
    const all = [...this.dates.night, ...this.dates.morning].sort();
    return { start: all[0] ?? null, night: [...this.dates.night], morning: [...this.dates.morning] };
  }

  has(t: WishType, d: string): boolean {
    return this.dates[t].includes(d);
  }

  async get(t: WishType, d: string): Promise<Wish | null> {
    this.assert(t, d);
    if (!this.has(t, d)) return null;
    try {
      return parseWish(await readFile(this.file(t, d), 'utf8'), { type: t, date: d });
    } catch (e: any) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  async getWithNeighbors(t: WishType, d: string): Promise<WishResponse | null> {
    const w = await this.get(t, d);
    if (!w) return null;
    const list = this.dates[t];
    const i = list.indexOf(d);
    const other: WishType = t === 'night' ? 'morning' : 'night';
    return {
      ...w,
      prev: list[i - 1] ?? null,
      next: list[i + 1] ?? null,
      counterpart: this.has(other, d),
    };
  }

  /** Атомарний запис (tmp + rename). Повертає true, якщо перезаписано існуюче. */
  async set(t: WishType, d: string, text: string): Promise<boolean> {
    this.assert(t, d);
    const existed = this.has(t, d);
    const target = this.file(t, d);
    const tmp = `${target}.${process.pid}.tmp`;
    await mkdir(this.dir(t), { recursive: true });
    await writeFile(tmp, serializeWish({ type: t, date: d, text, updatedAt: new Date().toISOString() }));
    await rename(tmp, target);
    if (!existed) this.dates[t] = [...this.dates[t], d].sort();
    return existed;
  }

  async delete(t: WishType, d: string): Promise<boolean> {
    this.assert(t, d);
    if (!this.has(t, d)) return false;
    await unlink(this.file(t, d));
    this.dates[t] = this.dates[t].filter((x) => x !== d);
    return true;
  }
}
