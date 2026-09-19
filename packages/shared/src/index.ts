export type WishType = 'night' | 'morning';

export interface Wish {
  type: WishType;
  date: string; // YYYY-MM-DD
  text: string;
  updatedAt?: string;
}

export interface WishIndex {
  start: string | null;
  night: string[]; // sorted ascending
  morning: string[];
}

export interface WishResponse extends Wish {
  prev: string | null;
  next: string | null;
  counterpart: boolean;
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isWishType = (v: unknown): v is WishType => v === 'night' || v === 'morning';

export const isIsoDate = (v: string): boolean => {
  if (!ISO_DATE.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const MONTHS_GEN = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
const MONTHS_NOM = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
const MONTHS_SHORT = ['січ','лют','бер','кві','тра','чер','лип','сер','вер','жов','лис','гру'];

const parts = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
};

/** «19 вересня» */
export const formatDate = (iso: string): string => {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS_GEN[m]}`;
};
/** «19 вер» */
export const formatShort = (iso: string): string => {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS_SHORT[m]}`;
};
/** «19 вересня 2026» */
export const formatFull = (iso: string): string => `${formatDate(iso)} ${parts(iso).y}`;
/** «Вересень» */
export const monthName = (iso: string): string => MONTHS_NOM[parts(iso).m];
/** «2026-09» */
export const monthKey = (iso: string): string => iso.slice(0, 7);

/** Українська множина: 1 ніч, 2-4 ночі, 5+ ночей */
export const plural = (n: number, one: string, few: string, many: string): string => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
};

export const countLabel = (type: WishType, n: number): string =>
  type === 'night'
    ? `${n} ${plural(n, 'ніч', 'ночі', 'ночей')}`
    : `${n} ${plural(n, 'ранок', 'ранки', 'ранків')}`;

export interface MonthGroup {
  key: string;
  name: string;
  dates: string[]; // ascending
}

/** Групує відсортовані дати за місяцями, від найновішого місяця до найстарішого. */
export const groupByMonth = (dates: string[]): MonthGroup[] => {
  const map = new Map<string, string[]>();
  for (const d of dates) {
    const k = monthKey(d);
    (map.get(k) ?? map.set(k, []).get(k)!).push(d);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, ds]) => ({ key, name: monthName(ds[0]), dates: ds }));
};

/** Дата за київським часом; 00:00–04:59 належить попередньому дню (нічні побажання). */
export const effectiveNightDate = (now: Date = new Date(), tz = 'Europe/Kyiv'): string => {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const g = (t: string) => f.find((p) => p.type === t)!.value;
  const iso = `${g('year')}-${g('month')}-${g('day')}`;
  if (Number(g('hour')) < 5) {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return iso;
};

export const todayKyiv = (now: Date = new Date()): string => {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(now);
};

export * from './wishFile.ts';
export * from './userInput.ts';
