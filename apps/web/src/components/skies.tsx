import { useId, useMemo, type CSSProperties } from 'react';
import { mulberry32, pick, range, round, type Rng } from '../lib/prng.ts';
import { rayPath, starPath } from './glyphs.tsx';

type Css = CSSProperties & Record<string, string | number>;

/** Легкі пристрої отримують менше анімованих елементів. */
export const useDensity = (): number => {
  return useMemo(() => {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    const cores = nav?.hardwareConcurrency ?? 8;
    const mem = (nav as unknown as { deviceMemory?: number } | undefined)?.deviceMemory ?? 8;
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return 0.5;
    return cores <= 4 || mem <= 2 ? 0.55 : 1;
  }, []);
};

/* ───────── Зорі ───────── */

interface Star { x: number; y: number; r: number; o: number; tw: boolean; delay: number; dur: number; cross: boolean }

export const genStars = (seed: number, n: number, w: number, h: number, y0 = 0): Star[] => {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const rad = pick(r, [0.6, 0.8, 0.9, 1.1, 1.3, 1.6] as const);
    return {
      x: round(range(r, 4, w - 4)), y: round(y0 + range(r, 4, h - 4)), r: rad,
      o: round(range(r, 0.4, 0.95), 2),
      tw: r() < 0.6, delay: round(range(r, 0, 5), 1), dur: round(range(r, 2.6, 5.8), 1),
      cross: rad >= 1.6 && r() < 0.7,
    };
  });
};

export const StarField = ({ stars }: { stars: Star[] }) => (
  <>
    {stars.map((s, i) => (
      <g key={i}>
        <circle
          cx={s.x} cy={s.y} r={s.r} fill="#FFF4DC"
          className={s.tw ? 'tw' : undefined}
          opacity={s.tw ? undefined : s.o}
          style={s.tw ? { animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` } : undefined}
        />
        {s.cross && <path d={`M${s.x} ${s.y - 5}V${s.y + 5}M${s.x - 5} ${s.y}H${s.x + 5}`} stroke="#FFF4DC" strokeWidth="0.6" opacity="0.32" />}
      </g>
    ))}
  </>
);

/* ───────── Падаючі зорі: різні напрямки та інтервали ───────── */

const SHOOTS = [
  { x: 330, y: 50, dx: -230, dy: 120, delay: 2, dur: 10, w: 1.3 },   // вниз-ліворуч
  { x: 40, y: 70, dx: 210, dy: 140, delay: 5.5, dur: 11, w: 1.1 },   // вниз-праворуч
  { x: 200, y: 30, dx: -60, dy: 250, delay: 8.5, dur: 12, w: 1.2 },  // майже вертикально
  { x: 120, y: 230, dx: 240, dy: -40, delay: 11, dur: 13, w: 1.0 },  // полого
];

export const ShootingStars = ({ count = 3, yScale = 1 }: { count?: number; yScale?: number }) => (
  <>
    {SHOOTS.slice(0, count).map((s, i) => {
      // хвіст — проти напрямку руху
      const len = 52, L = Math.hypot(s.dx, s.dy);
      const tx = round(s.x - (s.dx / L) * len, 1), ty = round(s.y * yScale - (s.dy / L) * len, 1);
      const style: Css = { '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` };
      return (
        <g key={i} className="shoot" style={style}>
          <path d={`M${s.x} ${s.y * yScale}L${tx} ${ty}`} stroke="#FFF4DC" strokeWidth={s.w} strokeLinecap="round" opacity="0.9" />
          <circle cx={s.x} cy={s.y * yScale} r={s.w + 0.4} fill="#FFFFFF" />
        </g>
      );
    })}
  </>
);

/* ───────── Хмаринки, пташки, порошинки, іскорки ───────── */

const cloudPath = (x: number, y: number, s: number) =>
  `M${x} ${y} a${14 * s} ${14 * s} 0 0 1 ${26 * s} ${-8 * s} a${18 * s} ${18 * s} 0 0 1 ${34 * s} ${2 * s} a${12 * s} ${12 * s} 0 0 1 ${20 * s} ${6 * s} Z`;

interface CloudSpec { x: number; y: number; s: number; o: number; kind: 'drift' | 'drift2' | 'cross'; delay: number; dur: number }

export const genClouds = (seed: number, h: number, n: number, y0 = 90): CloudSpec[] => {
  const r = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => {
    const kind = i % 3 === 0 ? 'drift' : i % 3 === 1 ? 'drift2' : 'cross';
    return {
      x: kind === 'cross' ? 0 : round(range(r, 10, 260)), y: round(range(r, y0, h)), s: round(range(r, 0.75, 1.3), 2),
      o: round(range(r, 0.32, 0.72), 2), kind, delay: -round(range(r, 1, kind === 'cross' ? 60 : 14), 1),
      dur: kind === 'cross' ? round(range(r, 57, 90)) : 0,
    };
  });
};

export const Clouds = ({ items }: { items: CloudSpec[] }) => (
  <>
    {items.map((c, i) => (
      <g key={i} className={c.kind} style={{ animationDelay: `${c.delay}s`, ...(c.dur ? { animationDuration: `${c.dur}s` } : null) }}>
        <path d={cloudPath(c.x, c.y, c.s)} fill="#FFFFFF" opacity={c.o} />
      </g>
    ))}
  </>
);

export const Birds = ({ seed, n, y0, y1, color = '#4E2C49' }: { seed: number; n: number; y0: number; y1: number; color?: string }) => {
  const items = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({ length: n }, () => {
      const w = range(r, 17, 26), y = range(r, y0, y1), a = w * 0.27;
      return { w, y, a, dur: round(range(r, 18, 29), 1), delay: -round(range(r, 1, 24), 1), flap: round(range(r, 0.46, 0.7), 2) };
    });
  }, [seed, n, y0, y1]);
  return (
    <>
      {items.map((b, i) => (
        <g key={i} className="bird" style={{ animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}>
          <path
            className="flap" style={{ animationDuration: `${b.flap}s` }}
            d={`M0 ${round(b.y, 1)} Q${round(b.w / 4, 1)} ${round(b.y - b.a, 1)} ${round(b.w / 2, 1)} ${round(b.y, 1)} Q${round((3 * b.w) / 4, 1)} ${round(b.y - b.a, 1)} ${round(b.w, 1)} ${round(b.y, 1)}`}
            fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          />
        </g>
      ))}
    </>
  );
};

export const Motes = ({ seed, n, y0, y1 }: { seed: number; n: number; y0: number; y1: number }) => {
  const items = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({ length: n }, () => ({
      x: round(range(r, 15, 375)), y: round(range(r, y0, y1)), r: pick(r, [1.2, 1.6, 2, 2.6] as const),
      dur: round(range(r, 7.5, 13), 1), delay: -round(range(r, 1, 10), 1),
    }));
  }, [seed, n, y0, y1]);
  return (
    <>
      {items.map((m, i) => (
        <circle key={i} className="mote" cx={m.x} cy={m.y} r={m.r} fill="#FFF6DE" style={{ animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s` }} />
      ))}
    </>
  );
};

export const Glints = ({ seed, n, cx, cy, rMin = 90, rMax = 230 }: { seed: number; n: number; cx: number; cy: number; rMin?: number; rMax?: number }) => {
  const items = useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({ length: n }, () => {
      const a = range(r, Math.PI * 1.05, Math.PI * 1.95), d = range(r, rMin, rMax), s = range(r, 4, 9);
      return { x: round(cx + Math.cos(a) * d), y: round(cy + Math.sin(a) * d * 0.8), s, delay: -round(range(r, 0, 5), 1), dur: round(range(r, 3.5, 5.8), 1) };
    });
  }, [seed, n, cx, cy, rMin, rMax]);
  return (
    <>
      {items.map((g, i) => (
        <path key={i} className="glint" d={starPath(g.x, g.y, g.s, 0.3)} fill="#FFFFFF" style={{ animationDelay: `${g.delay}s`, animationDuration: `${g.dur}s` }} />
      ))}
    </>
  );
};

/** Сонце, що сходить: промені, диск, три кільця. cx/cy — центр; масштаб r — радіус диска. */
export const RisingSun = ({ cx, cy, r, glow, ray = '#FFD89A', core = '#FFE7BD', halo = '#FFE2B0', ringK = 1.34 }: { cx: number; cy: number; r: number; glow: number; ray?: string; core?: string; halo?: string; ringK?: number }) => (
  <>
    {[0, -2, -4].map((d) => (
      <circle key={d} className="ring" style={{ animationDelay: `${d}s` }} cx={cx} cy={cy} r={round(r * ringK, 1)} fill="none" stroke="#FFF3D6" strokeWidth="2" />
    ))}
    <g className="rise">
      <circle cx={cx} cy={cy} r={glow} fill={halo} opacity="0.35" />
      <g className="spin"><path d={rayPath(cx, cy, r * 1.25, r * 1.7, 18)} stroke={ray} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" fill="none" /></g>
      <circle cx={cx} cy={cy} r={r} fill={core} />
    </g>
  </>
);

export const Moon = ({ cx, cy, r = 23 }: { cx: number; cy: number; r?: number }) => {
  const id = useId();
  return (
    <>
      <defs>
        <mask id={id}>
          <rect x={cx - 80} y={cy - 80} width="160" height="160" fill="#fff" />
          <circle cx={cx + 11} cy={cy - 8} r={r * 0.91} fill="#000" />
        </mask>
      </defs>
      <g className="breathe"><circle cx={cx} cy={cy} r={r * 2} fill="#F7E6C0" opacity="0.08" /></g>
      <circle cx={cx} cy={cy} r={r} fill="#F7E6C0" mask={`url(#${id})`} />
    </>
  );
};

/* ───────── Готові шари неба ───────── */

/** Нічне небо: зорі + падаючі зорі. Заповнює контейнер (slice). */
export const NightSky = ({ seed = 11, stars = 90, moon = false, shoots = 3, align = 'xMidYMid' }: { seed?: number; stars?: number; moon?: boolean; shoots?: number; align?: 'xMidYMid' | 'xMidYMin' }) => {
  const d = useDensity();
  const field = useMemo(() => genStars(seed, Math.round(stars * d), 390, 844), [seed, stars, d]);
  return (
    <svg viewBox="0 0 390 844" preserveAspectRatio={`${align} slice`} aria-hidden="true" focusable="false">
      <StarField stars={field} />
      {moon && <Moon cx={322} cy={120} />}
      {d >= 0.55 && <ShootingStars count={shoots} />}
    </svg>
  );
};

/** Світанок для ранкового побажання: сонце знизу, хмари, пташки, порошинки. */
export const DawnSky = ({ seed = 5 }: { seed?: number }) => {
  const d = useDensity();
  const clouds = useMemo(() => genClouds(seed, 600, 6), [seed]);
  return (
    <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <Glints seed={seed + 1} n={Math.round(12 * d)} cx={195} cy={880} />
      <Clouds items={clouds} />
      <RisingSun cx={195} cy={880} r={74} glow={200} />
      <Birds seed={seed + 2} n={Math.round(4 * d) || 1} y0={190} y1={270} />
      <Motes seed={seed + 3} n={Math.round(20 * d)} y0={330} y1={820} />
    </svg>
  );
};
