#!/usr/bin/env tsx
/**
 * Імпорт ~/Oksana/{GM,GN}/YYYY-MM/DD[ (VOICE)].md → data/wishes/{morning,night}/YYYY-MM-DD.md
 * Використання: tsx scripts/import-oksana.ts [srcDir] [--dry-run] [--out data]
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { serializeWish, normalizeText, isIsoDate, type WishType } from '../packages/shared/src/index.ts';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
const src = path.resolve(positional[0] ?? path.join(homedir(), 'Oksana'));
const out = path.resolve(opt('--out') ?? 'data');
const dry = flag('--dry-run');

const DIRS: Record<string, WishType> = { GM: 'morning', GN: 'night' };
const FILE_RE = /^(\d{2})(?: \(VOICE\))?\.md$/;

const found: Record<WishType, Map<string, { text: string; voice: boolean }>> = { night: new Map(), morning: new Map() };
const problems: string[] = [];

for (const [dir, type] of Object.entries(DIRS)) {
  const base = path.join(src, dir);
  if (!existsSync(base)) { problems.push(`нема каталогу ${base}`); continue; }
  for (const ym of (await readdir(base)).sort()) {
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    for (const f of (await readdir(path.join(base, ym))).sort()) {
      if (f.startsWith('.')) continue;
      const m = FILE_RE.exec(f);
      if (!m) { problems.push(`пропущено невідомий файл ${dir}/${ym}/${f}`); continue; }
      const date = `${ym}-${m[1]}`;
      if (!isIsoDate(date)) { problems.push(`некоректна дата ${dir}/${ym}/${f}`); continue; }
      const text = normalizeText(await readFile(path.join(base, ym, f), 'utf8'));
      if (!text) { problems.push(`порожній файл ${dir}/${ym}/${f}`); continue; }
      if (found[type].has(date)) problems.push(`дублікат ${type} ${date} (${f})`);
      found[type].set(date, { text, voice: f.includes('(VOICE)') });
    }
  }
}

let written = 0;
for (const type of ['night', 'morning'] as const) {
  const dir = path.join(out, 'wishes', type);
  if (!dry) await mkdir(dir, { recursive: true });
  for (const [date, { text }] of found[type]) {
    if (!dry) await writeFile(path.join(dir, `${date}.md`), serializeWish({ type, date, text }));
    written++;
  }
}

const all = (t: WishType) => [...found[t].keys()].sort();
const gaps = (t: WishType, from: string, to: string) => {
  const have = new Set(all(t)); const miss: string[] = [];
  for (let d = new Date(from + 'T00:00:00Z'); d <= new Date(to + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10); if (!have.has(iso)) miss.push(iso);
  }
  return miss;
};
const every = [...all('night'), ...all('morning')].sort();
console.log(`${dry ? '[dry-run] ' : ''}джерело: ${src}`);
console.log(`ранків: ${found.morning.size}, ночей: ${found.night.size}, записано файлів: ${dry ? 0 : written}`);
if (every.length) {
  console.log(`діапазон: ${every[0]} … ${every.at(-1)}`);
  for (const t of ['morning', 'night'] as const) {
    const g = gaps(t, every[0], every.at(-1)!);
    console.log(`  пропущені дні (${t}): ${g.length}`);
  }
}
const voices = (['night', 'morning'] as const).flatMap((t) => [...found[t]].filter(([, v]) => v.voice).map(([d]) => `${t} ${d}`));
if (voices.length) console.log(`(VOICE) → звичайний текст: ${voices.join(', ')}`);
for (const p of problems) console.warn('!', p);
process.exit(problems.length ? 1 : 0);
