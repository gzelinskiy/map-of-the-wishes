import type { Wish, WishType } from './index.ts';

/** Нормалізує текст: LF, без кінцевих пробілів у рядках, не більше однієї порожньої лінії підряд. */
export const normalizeText = (raw: string): string =>
  raw
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const serializeWish = (w: Wish): string => {
  const head = [`date: ${w.date}`, `type: ${w.type}`];
  if (w.updatedAt) head.push(`updatedAt: ${w.updatedAt}`);
  return `---\n${head.join('\n')}\n---\n${normalizeText(w.text)}\n`;
};

export const parseWish = (src: string, fallback?: { type: WishType; date: string }): Wish => {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src.replace(/\r\n?/g, '\n'));
  if (!m) {
    if (!fallback) throw new Error('wish file has no frontmatter');
    return { ...fallback, text: normalizeText(src) };
  }
  const meta: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const type = (meta.type ?? fallback?.type) as WishType;
  const date = meta.date ?? fallback?.date;
  if (!type || !date) throw new Error('wish frontmatter missing type/date');
  return { type, date, text: normalizeText(m[2]), ...(meta.updatedAt ? { updatedAt: meta.updatedAt } : {}) };
};

/** Абзаци за порожніми рядками; одиночні переноси всередині абзацу зберігаються як є. */
export const paragraphs = (text: string): string[] =>
  text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
