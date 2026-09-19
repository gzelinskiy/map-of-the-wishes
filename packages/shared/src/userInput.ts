import { isIsoDate, type WishType } from './index.ts';

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export { addDays };

/** gn|night|н|ніч → night; gm|morning|р|ранок → morning */
export const parseTypeToken = (tok: string | undefined): WishType | null => {
  if (!tok) return null;
  const t = tok.toLowerCase().replace(/^\//, '');
  if (['gn', 'night', 'н', 'ніч', 'ночі', 'добраніч'].includes(t)) return 'night';
  if (['gm', 'morning', 'р', 'ранок', 'ранки'].includes(t)) return 'morning';
  return null;
};

/**
 * «2026-09-01», «01.09.2026», «1.9» (поточний рік), «сьогодні», «вчора», «позавчора».
 * `today` — ISO-дата, відносно якої рахуються слова та рік.
 */
export const parseUserDate = (input: string, today: string): string | null => {
  const s = input.trim().toLowerCase();
  if (['сьогодні', 'today'].includes(s)) return today;
  if (['вчора', 'yesterday'].includes(s)) return addDays(today, -1);
  if (['позавчора'].includes(s)) return addDays(today, -2);
  if (isIsoDate(s)) return s;
  const m = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2}|\d{4}))?$/.exec(s);
  if (m) {
    let y = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
    if (m[3] && m[3].length === 2) y += 2000;
    const iso = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return isIsoDate(iso) ? iso : null;
  }
  return null;
};
