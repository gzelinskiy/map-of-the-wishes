import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface AccessKey {
  id: string;
  hash: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** Ключі доступу (magic-link). Зберігаємо лише SHA-256 хеш; сам ключ показується один раз. */
export class KeyStore {
  private keys: AccessKey[] = [];
  private file: string;
  private saving: Promise<void> = Promise.resolve();
  private mtimeMs = 0;

  constructor(root: string) {
    this.file = path.join(root, 'access', 'keys.json');
  }

  async load(): Promise<void> {
    try {
      this.keys = JSON.parse(await readFile(this.file, 'utf8'));
      this.mtimeMs = statSync(this.file).mtimeMs;
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
      this.keys = [];
    }
  }

  /** Підхоплює ключі, створені поза процесом (scripts/make-key.ts), без перезапуску. */
  private refresh(): void {
    try {
      const m = statSync(this.file).mtimeMs;
      if (m === this.mtimeMs) return;
      this.keys = JSON.parse(readFileSync(this.file, 'utf8'));
      this.mtimeMs = m;
    } catch { /* файлу ще немає або він у процесі запису — лишаємо як є */ }
  }

  private save(): Promise<void> {
    const snapshot = JSON.stringify(this.keys, null, 2);
    const run = async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, snapshot, { mode: 0o600 });
      await rename(tmp, this.file);
      this.mtimeMs = statSync(this.file).mtimeMs;
    };
    // наступний запис іде після попереднього навіть якщо той упав
    const p = this.saving.then(run, run);
    this.saving = p.catch(() => {});
    return p;
  }

  list(): AccessKey[] {
    return this.keys.map((k) => ({ ...k }));
  }

  async create(label: string): Promise<{ id: string; key: string }> {
    const key = randomBytes(32).toString('base64url');
    const id = 'k' + randomBytes(3).toString('hex');
    this.keys.push({ id, hash: sha(key), label: label || 'без підпису', createdAt: new Date().toISOString(), lastUsedAt: null, revokedAt: null });
    await this.save();
    return { id, key };
  }

  /** Повертає id активного ключа. Порівняння сталого часу по всіх ключах. */
  verify(key: string): string | null {
    if (typeof key !== 'string' || key.length < 20 || key.length > 200) return null;
    this.refresh();
    const h = Buffer.from(sha(key), 'hex');
    let found: AccessKey | null = null;
    for (const k of this.keys) {
      if (timingSafeEqual(h, Buffer.from(k.hash, 'hex')) && !k.revokedAt) found = k;
    }
    return found?.id ?? null;
  }

  isActive(id: string): boolean {
    return this.keys.some((k) => k.id === id && !k.revokedAt);
  }

  touch(id: string): void {
    const k = this.keys.find((x) => x.id === id);
    if (!k) return;
    const now = Date.now();
    // не частіше разу на годину, щоб не писати диск на кожен запит
    if (k.lastUsedAt && now - Date.parse(k.lastUsedAt) < 3600_000) return;
    k.lastUsedAt = new Date(now).toISOString();
    // best-effort: помилка запису lastUsedAt не повинна валити сервер
    this.save().catch((e) => console.error('keys.json: не вдалося зберегти lastUsedAt', e));
  }

  async revoke(id: string): Promise<boolean> {
    const k = this.keys.find((x) => x.id === id && !x.revokedAt);
    if (!k) return false;
    k.revokedAt = new Date().toISOString();
    await this.save();
    return true;
  }
}
