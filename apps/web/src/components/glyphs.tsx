import type { CSSProperties, ReactNode } from 'react';
import { round } from '../lib/prng.ts';

/** Чотирипроменева зірка з еталона: R — радіус променя, c — «талія». */
export const starPath = (cx: number, cy: number, R: number, c = 0.28): string => {
  const k = R * c;
  return `M${cx} ${cy - R} Q${round(cx + k, 2)} ${round(cy - k, 2)} ${cx + R} ${cy} Q${round(cx + k, 2)} ${round(cy + k, 2)} ${cx} ${cy + R} Q${round(cx - k, 2)} ${round(cy + k, 2)} ${cx - R} ${cy} Q${round(cx - k, 2)} ${round(cy - k, 2)} ${cx} ${cy - R}Z`;
};

/** Сердечко з центром (cx, cy); s — приблизно піврозмір. */
export const heartPath = (cx: number, cy: number, s: number): string => {
  const n = (v: number) => round(v, 2);
  return (
    `M${n(cx)} ${n(cy + s * 0.78)}` +
    ` C${n(cx - s * 1.15)} ${n(cy + s * 0.05)} ${n(cx - s * 0.6)} ${n(cy - s * 0.85)} ${n(cx)} ${n(cy - s * 0.22)}` +
    ` C${n(cx + s * 0.6)} ${n(cy - s * 0.85)} ${n(cx + s * 1.15)} ${n(cy + s * 0.05)} ${n(cx)} ${n(cy + s * 0.78)}Z`
  );
};

/** Промені навколо центра: n штук від r1 до r2. */
export const rayPath = (cx: number, cy: number, r1: number, r2: number, n: number, offset = 0): string => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    d += `M${round(cx + c * r1, 1)} ${round(cy + s * r1, 1)}L${round(cx + c * r2, 1)} ${round(cy + s * r2, 1)}`;
  }
  return d;
};

const stroke = (w = 1.9): Record<string, string | number> => ({
  fill: 'none', stroke: 'currentColor', strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round',
});

const Icon = ({ size = 22, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{children}</svg>
);

export const IconBack = ({ size }: { size?: number }) => <Icon size={size}><path d="M15 6l-6 6 6 6" {...stroke()} /></Icon>;
export const IconForward = ({ size }: { size?: number }) => <Icon size={size}><path d="M9 6l6 6-6 6" {...stroke()} /></Icon>;
export const IconMoon = ({ size = 20, filled = false }: { size?: number; filled?: boolean }) => (
  <Icon size={size}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" {...(filled ? { fill: 'currentColor' } : stroke(1.8))} />
  </Icon>
);
export const IconSun = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}>
    <g {...stroke(1.8)}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </g>
  </Icon>
);
export const IconShuffle = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" {...stroke(1.8)} /></Icon>
);
export const IconClose = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}><path d="M18 6L6 18M6 6l12 12" {...stroke(1.9)} /></Icon>
);
export const IconChevronDown = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><path d="M6 9l6 6 6-6" {...stroke(2)} /></Icon>
);


type Delay = CSSProperties & Record<string, string | number>;

/** Велика зірка-герой (нічне побажання, найновіша зірка карти). */
export const HeroStar = ({ size = 80 }: { size?: number }) => (
  <svg className="pop" width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
    <circle className="glow" cx="40" cy="40" r="38" fill="#F6C87A" opacity="0.14" />
    <circle cx="40" cy="40" r="20" fill="#F6C87A" opacity="0.22" />
    <g className="breathe"><path d={starPath(40, 40, 22, 0.28)} fill="#FFE9B8" /></g>
    <circle cx="40" cy="40" r="3" fill="#FFFFFF" />
  </svg>
);

/** Велике сонце-герой (ранкове побажання). */
export const HeroSun = ({ size = 80 }: { size?: number }) => (
  <svg className="sunup" width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
    <circle className="glow" cx="40" cy="40" r="38" fill="#FFFFFF" opacity="0.3" />
    <g className="spin"><g className="pulse">
      <path d={rayPath(40, 40, 22, 30, 12)} stroke="#E0826A" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </g></g>
    <circle cx="40" cy="40" r="16" fill="#F7B267" />
  </svg>
);

/** Маркер у мініатюрному сузірʼї внизу екрана побажання. */
export const NavStar = ({ on }: { on: boolean }) =>
  on ? (
    <svg className="pop" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <circle className="glow" cx="15" cy="15" r="14" fill="#F6C87A" opacity="0.2" />
      <path d={starPath(15, 15, 11, 0.28)} fill="#F6C87A" />
      <circle cx="15" cy="15" r="2.2" fill="#FFFFFF" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d={starPath(9, 9, 6, 0.28)} fill="#CFC8EA" /></svg>
  );

export const NavSun = ({ on }: { on: boolean }) =>
  on ? (
    <svg className="pop" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r="6.5" fill="#F7B267" />
      <path d={rayPath(15, 15, 9, 12.5, 8)} stroke="#C2555E" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="#9A6A7E" opacity="0.8" /></svg>
  );

/** Маленьке сонечко-точка на карті ранків (вузол місяця). */
export const SunDot = ({ x, y, r = 4, delay, style }: { x: number; y: number; r?: number; delay?: number; style?: Delay }) => (
  <g className="pop" style={{ animationDelay: delay != null ? `${delay}s` : undefined, ...style }}>
    <circle cx={x} cy={y} r={r} fill="#F7B267" />
    <path d={rayPath(x, y, r * 1.625, r * 2.5, 8)} stroke="#D0706A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </g>
);
