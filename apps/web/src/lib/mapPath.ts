import { groupByMonth, countLabel, type WishType } from '@nebo/shared';
import { mulberry32, range, round } from './prng.ts';

export const MAP_W = 390;
const HERO = { x: 250, y: 262 };
const LEFT_X = 118;
const RIGHT_X = 282;
const MIN_SEG = 150;      // мінімальна висота сегмента між вузлами (px у системі 390 ширини)
const PER_WISH = 13;      // вертикальний крок на одне побажання
const TAIL = 70;          // стежка за останнім вузлом до пагорбів
const BOTTOM = 240;       // від останнього вузла до низу карти (пагорби, підпис)

export type StopKind = 'hero' | 'node' | 'dot';

export interface MapStop {
  date: string;
  x: number;
  y: number;
  kind: StopKind;
  /** hero, що водночас перше побажання місяця */
  isNode: boolean;
  /** 0..2: розмір і колір точки (для варіативності) */
  v: number;
  c: number;
}

export interface MapMonth {
  key: string;
  name: string;
  label: string;   // «31 ніч»
  count: number;
  firstDate: string;
  x: number;
  y: number;
  /** з якого боку від вузла стоїть «таблетка» */
  pill: 'right' | 'left';
}

export interface MapLayout {
  width: number;
  height: number;
  pathD: string;
  stops: MapStop[];
  months: MapMonth[];
  hero: MapStop | null;
  hillsY: number;
  startDate: string | null;
}

interface Anchor { x: number; y: number }

const bez = (a: Anchor, b: Anchor, t: number): Anchor => {
  const h = b.y - a.y;
  const c1 = { x: a.x, y: a.y + h * 0.5 };
  const c2 = { x: b.x, y: b.y - h * 0.5 };
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
};

/** Полілінія сегмента з кумулятивними довжинами. */
const sampleSegment = (a: Anchor, b: Anchor) => {
  const n = Math.max(24, Math.ceil((b.y - a.y) / 4));
  const pts: Anchor[] = [];
  const cum: number[] = [0];
  for (let i = 0; i <= n; i++) {
    const p = bez(a, b, i / n);
    pts.push(p);
    if (i > 0) cum.push(cum[i - 1] + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y));
  }
  return { pts, cum, length: cum[n] };
};

const pointAt = (seg: ReturnType<typeof sampleSegment>, s: number) => {
  const { pts, cum } = seg;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const span = cum[i] - cum[i - 1] || 1;
  const t = (s - cum[i - 1]) / span;
  const a = pts[i - 1], b = pts[i];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: a.x + dx * t, y: a.y + dy * t, nx: -dy / len, ny: dx / len };
};

/**
 * Розкладка карти. `dates` — ISO-дати одного типу (порядок довільний).
 * Згори — найновіше побажання (hero), далі місяці у зворотному порядку; кожен місяць — це
 * «доріжка» з точок від новішого до старішого, що закінчується вузлом = першим побажанням місяця.
 */
export const buildMapLayout = (dates: string[], type: WishType, seed = 7): MapLayout => {
  const sorted = [...new Set(dates)].sort();
  if (!sorted.length) {
    return { width: MAP_W, height: 900, pathD: '', stops: [], months: [], hero: null, hillsY: 700, startDate: null };
  }
  const rnd = mulberry32(seed + (type === 'night' ? 1 : 2));
  const groups = groupByMonth(sorted); // новіші місяці першими; dates у кожному — за зростанням
  const heroDate = sorted[sorted.length - 1];

  const anchors: Anchor[] = [{ ...HERO }];
  const runs: { dates: string[]; monthIdx: number }[] = [];
  let y = HERO.y;
  let side = 0;

  groups.forEach((g, gi) => {
    const desc = [...g.dates].reverse();
    const run = gi === 0 ? desc.slice(1) : desc; // hero не повторюємо в доріжці
    if (!run.length) return;
    y += Math.max(MIN_SEG, run.length * PER_WISH);
    const x = (side % 2 === 0 ? LEFT_X : RIGHT_X) + range(rnd, -8, 8);
    anchors.push({ x: round(x), y: round(y) });
    runs.push({ dates: run, monthIdx: gi });
    side++;
  });

  const last = anchors[anchors.length - 1];
  const tail: Anchor = { x: round(last.x < 195 ? last.x + 20 : last.x - 20), y: round(last.y + TAIL) };
  const all = [...anchors, tail];
  const segs = all.slice(0, -1).map((a, i) => sampleSegment(a, all[i + 1]));

  const stops: MapStop[] = [];
  const nodeOf = new Map<number, { x: number; y: number }>();
  const heroIsNode = groups[0].dates.length === 1;
  stops.push({ date: heroDate, ...HERO, kind: 'hero', isNode: heroIsNode, v: 2, c: 0 });
  if (heroIsNode) nodeOf.set(0, { ...HERO });

  runs.forEach((run, ri) => {
    const seg = segs[ri];
    const m = run.dates.length;
    run.dates.forEach((date, j) => {
      const isNode = j === m - 1;
      const p = pointAt(seg, ((j + 1) / m) * seg.length);
      const jit = isNode ? 0 : range(rnd, -5, 5);
      const stop: MapStop = {
        date,
        x: round(p.x + p.nx * jit),
        y: round(p.y + p.ny * jit),
        kind: isNode ? 'node' : 'dot',
        isNode,
        v: Math.floor(rnd() * 3),
        c: Math.floor(rnd() * 3),
      };
      if (isNode) { stop.x = round(p.x); stop.y = round(p.y); nodeOf.set(run.monthIdx, { x: stop.x, y: stop.y }); }
      stops.push(stop);
    });
  });

  const months: MapMonth[] = groups.map((g, gi) => {
    const pos = nodeOf.get(gi)!;
    return {
      key: g.key,
      name: g.name,
      label: countLabel(type, g.dates.length),
      count: g.dates.length,
      firstDate: g.dates[0],
      x: pos.x,
      y: pos.y,
      pill: pos.x < 195 ? 'right' : 'left',
    };
  });

  const pathD =
    `M${all[0].x} ${all[0].y}` +
    all.slice(1).map((b, i) => {
      const a = all[i], h = b.y - a.y;
      return ` C${a.x} ${round(a.y + h / 2)} ${b.x} ${round(b.y - h / 2)} ${b.x} ${b.y}`;
    }).join('');

  const height = round(last.y + BOTTOM);
  return {
    width: MAP_W, height, pathD, stops, months,
    hero: stops[0], hillsY: round(last.y + 110), startDate: sorted[0],
  };
};

/** Найближча точка до (x, y) у координатах карти; null, якщо далі за maxDist. */
export const nearestStop = (layout: MapLayout, x: number, y: number, maxDist = 24): MapStop | null => {
  let best: MapStop | null = null;
  let bd = maxDist;
  for (const s of layout.stops) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= bd) { bd = d; best = s; }
  }
  return best;
};
