import { useEffect, useMemo, useRef, type MouseEvent, type PointerEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatDate, formatFull, isWishType, type WishType } from '@nebo/shared';
import { useIndex } from '../lib/IndexContext.tsx';
import { useTheme } from '../lib/hooks.ts';
import { buildMapLayout, nearestStop, MAP_W, type MapLayout, type MapStop } from '../lib/mapPath.ts';
import { mulberry32, range, round } from '../lib/prng.ts';
import { Birds, Clouds, genClouds, genStars, Glints, Motes, RisingSun, ShootingStars, spread, StarField, useDensity } from '../components/skies.tsx';
import { mapSkyBox, useViewportSize } from '../lib/viewport.ts';
import { IconBack, IconMoon, IconSun, starPath, rayPath } from '../components/glyphs.tsx';

const NIGHT_R = [1.3, 1.6, 1.9];
const DAWN_R = [1.8, 2.2, 2.6];
const DAWN_C = ['#C2555E', '#E0826A', '#F2A65A'];

const pct = (v: number, of: number) => `${round((v / of) * 100, 3)}%`;

/* ───────── Пейзаж (повноширинний шар; колонка з картою зсунута на xOff) ───────── */

interface Box { Wu: number; xOff: number }

const NightScenery = ({ layout, Wu }: { layout: MapLayout } & Box) => {
  const d = useDensity();
  const H = layout.height;
  const stars = useMemo(() => genStars(31, Math.round((H / 844) * 85 * d * spread(Wu)), Wu, H), [H, d, Wu]);
  return (
    <>
      <StarField stars={stars} />
      {d >= 0.55 && <ShootingStars count={3} W={Wu} />}
    </>
  );
};

const DawnScenery = ({ layout, Wu, xOff }: { layout: MapLayout } & Box) => {
  const d = useDensity();
  const H = layout.height;
  const clouds = useMemo(() => genClouds(13, H - 420, Math.max(5, Math.round(H / 260)), 240, Wu), [H, Wu]);
  return (
    <>
      <Clouds items={clouds} W={Wu} />
      <Birds seed={2} n={Math.round(4 * d) || 1} y0={300} y1={520} color="#4E2C49" W={Wu} />
      <Birds seed={8} n={Math.round(3 * d) || 1} y0={Math.max(700, H * 0.55)} y1={Math.max(760, H * 0.6)} color="#6B3A55" W={Wu} />
      <Motes seed={6} n={Math.round((H / 844) * 16 * d)} y0={300} y1={H - 200} W={Wu} />
      <Glints seed={12} n={Math.round(8 * d)} cx={xOff + 210} cy={layout.hillsY + 60} />
    </>
  );
};

/** Пагорби на всю ширину: середина — крива з еталона, з боків плавні продовження. */
const Hills = ({ type, y0, H, Wu, xOff }: { type: WishType; y0: number; H: number } & Box) => {
  const night = type === 'night';
  const back = night ? '#231A40' : '#B98296';
  const front = night ? '#130F2C' : '#8C5A77';
  const win = night ? '#FFC873' : '#FFE2A6';
  const X = xOff, R = X + 390; // права межа колонки
  const wide = X > 0;
  const backD =
    (wide ? `M0 ${y0 - 14} C${X * 0.4} ${y0 - 30} ${X - 39} ${y0 + 18} ${X} ${y0}` : `M0 ${y0}`) +
    ` C${X + 78} ${y0 - 36} ${X + 148.2} ${y0 - 20} ${X + 214.5} ${y0 - 8} S${X + 331.5} ${y0 - 40} ${R} ${y0 - 16}` +
    (wide ? ` S${Wu - 60} ${y0 - 30} ${Wu} ${y0 - 20}` : '') + ` L${Wu} ${H} L0 ${H}Z`;
  const frontD =
    (wide ? `M0 ${y0 + 20} C${X * 0.4} ${y0 + 10} ${X - 49} ${y0 + 46} ${X} ${y0 + 32}` : `M0 ${y0 + 32}`) +
    ` C${X + 97.5} ${y0 + 4} ${X + 195} ${y0 + 40} ${X + 273} ${y0 + 18} S${X + 358.8} ${y0} ${R} ${y0 + 14}` +
    (wide ? ` S${Wu - 60} ${y0 + 30} ${Wu} ${y0 + 8}` : '') + ` L${Wu} ${H} L0 ${H}Z`;
  const flies = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({ length: Math.min(40, Math.round(14 * spread(Wu, 3))) }, () => ({
      x: round(range(r, 15, Wu - 70)), y: round(range(r, y0 - 36, y0 + 120)), dur: round(range(r, 3.5, 7), 1), delay: -round(range(r, 0, 6), 1),
    }));
  }, [y0, Wu]);
  return (
    <>
      {!night && <RisingSun cx={X + 210} cy={y0 + 60} r={82} glow={220} ray="#FFD08A" core="#FFE2A6" halo="#FFE9C2" />}
      <path d={backD} fill={back} />
      <g transform={`translate(${X} 0)`}>
        <circle className="glow" cx="262" cy={y0 - 2} r="26" fill={win} opacity="0.18" />
        <path d={`M246 ${y0 + 14} L246 ${y0 - 4} L262 ${y0 - 18} L278 ${y0 - 4} L278 ${y0 + 14}Z`} fill={front} />
        <rect x="268" y={y0 - 20} width="5" height="10" fill={front} />
        <rect x="256" y={y0 - 2} width="8" height="8" rx="1" fill={win} />
      </g>
      <path d={frontD} fill={front} />
      {night && flies.map((f, i) => (
        <g key={i} className="firefly" style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}>
          <circle cx={f.x} cy={f.y} r="5" fill="#FFD27A" opacity="0.25" />
          <circle cx={f.x} cy={f.y} r="1.5" fill="#FFE9A8" />
        </g>
      ))}
    </>
  );
};

/* ───────── Точки ───────── */

const Dot = ({ s, type, i }: { s: MapStop; type: WishType; i: number }) => {
  const delay = Math.min(0.3 + i * 0.011, 2.2);
  const night = type === 'night';
  const st = { animationDelay: `${delay}s` };
  let visual;
  if (s.kind === 'hero') {
    visual = night ? (
      <g className="pop" style={{ animationDelay: '0s' }}>
        <circle className="glow" cx={s.x} cy={s.y} r="38" fill="#F6C87A" opacity="0.12" />
        <circle cx={s.x} cy={s.y} r="20" fill="#F6C87A" opacity="0.24" />
        <g className="breathe"><path d={starPath(s.x, s.y, 15)} fill="#FFE9B8" /></g>
        <circle cx={s.x} cy={s.y} r="3" fill="#fff" />
      </g>
    ) : (
      <g className="pop" style={{ animationDelay: '0s' }}>
        <circle className="glow" cx={s.x} cy={s.y} r="44" fill="#FFFFFF" opacity="0.35" />
        <g className="spin"><path d={rayPath(s.x, s.y, 24, 34, 12)} stroke="#E0826A" strokeWidth="2.6" strokeLinecap="round" fill="none" /></g>
        <circle cx={s.x} cy={s.y} r="16" fill="#F7B267" />
      </g>
    );
  } else if (s.kind === 'node') {
    visual = night ? (
      <g className="pop" style={st}>
        <circle className="glow" cx={s.x} cy={s.y} r="17" fill="#F6C87A" opacity="0.16" style={st} />
        <path d={starPath(s.x, s.y, 10)} fill="#FFE9B8" />
      </g>
    ) : (
      <g className="pop" style={st}>
        <circle cx={s.x} cy={s.y} r="4.5" fill="#F7B267" />
        <path d={rayPath(s.x, s.y, 7.3, 11.2, 8)} stroke="#D0706A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
    );
  } else {
    visual = night ? (
      <circle className="pop" style={st} cx={s.x} cy={s.y} r={NIGHT_R[s.v]} fill="#FFF4DC" />
    ) : (
      <circle className="pop" style={st} cx={s.x} cy={s.y} r={DAWN_R[s.v]} fill={DAWN_C[s.c]} opacity="0.85" />
    );
  }
  return (
    <a href={`/${type}/${s.date}`} data-date={s.date} className="dot-link" aria-label={formatFull(s.date)} tabIndex={0}>
      <circle className="focus-ring" cx={s.x} cy={s.y} r="11" />
      {visual}
    </a>
  );
};

/* ───────── Сторінка ───────── */

export const MapPage = () => {
  const { type: raw } = useParams();
  if (!isWishType(raw)) return <Navigate to="/" replace />;
  return <MapInner key={raw} type={raw} />;
};

const MapInner = ({ type }: { type: WishType }) => {
  const idx = useIndex();
  const nav = useNavigate();
  const loc = useLocation();
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const vp = useViewportSize();
  useTheme(type);

  const dates = idx[type];
  const layout = useMemo(() => buildMapLayout(dates, type), [dates, type]);
  const { Wu, xOff } = useMemo(() => mapSkyBox(vp.w), [vp.w]);
  const { width: W, height: H } = layout;
  const night = type === 'night';
  const shift = `translate(${xOff} 0)`;

  const go = (date: string) => nav(`/${type}/${date}`, { viewTransition: true });

  // повернення з побажання: прокручуємо до того місця карти, звідки прийшли
  useEffect(() => {
    const focus = (loc.state as { focus?: string } | null)?.focus;
    const s = focus && layout.stops.find((x) => x.date === focus);
    if (!s || !box.current) return;
    const t = setTimeout(() => {
      const y = (s.y / H) * box.current!.getBoundingClientRect().height - window.innerHeight / 2;
      window.scrollTo({ top: Math.max(0, y) });
    }, 0);
    return () => clearTimeout(t);
  }, [loc.state, layout, H]);

  /** Координати вказівника в системі колонки карти (390 од.). */
  const toMap = (clientX: number, clientY: number) => {
    const rect = box.current!.getBoundingClientRect();
    const k = W / rect.width;
    return { x: (clientX - rect.left) * k, y: (clientY - rect.top) * k };
  };

  // тап по карті → найближча точка; клавіатура → прямо по посиланню
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as Element;
    if (t.closest('.map-header, .map-pill, .map-hero-label')) return;
    const link = t.closest<SVGAElement>('a[data-date]');
    if (link) e.preventDefault();
    if (e.detail === 0 && link) return go(link.dataset.date!);
    const p = toMap(e.clientX, e.clientY);
    const s = nearestStop(layout, p.x, p.y, 26);
    if (s) go(s.date);
  };

  // десктоп: курсор-«рука» біля точок
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !wrap.current) return;
    if ((e.target as Element).closest('.map-header, .map-pill, .map-hero-label')) { wrap.current.style.cursor = ''; return; }
    const p = toMap(e.clientX, e.clientY);
    wrap.current.style.cursor = nearestStop(layout, p.x, p.y, 26) ? 'pointer' : '';
  };

  const first = dates[0];
  const empty = !layout.hero;

  return (
    <div ref={wrap} className={`map-wrap theme-${type}`} onClick={onClick} onPointerMove={onMove}>
      <div className="map-sky">
        <svg viewBox={`0 0 ${Wu} ${H}`} preserveAspectRatio="xMidYMin slice" focusable="false" role="group" aria-label={night ? 'Карта ночей' : 'Карта ранків'}>
          {night ? <NightScenery layout={layout} Wu={Wu} xOff={xOff} /> : <DawnScenery layout={layout} Wu={Wu} xOff={xOff} />}
          {!empty && (
            <g transform={shift} aria-hidden="true">
              <path d={layout.pathD} fill="none" stroke="var(--route)" strokeWidth="12" opacity="0.08" strokeLinecap="round" pathLength={1} strokeDasharray="1" className="draw" />
              <path d={layout.pathD} fill="none" stroke="var(--route)" strokeWidth="1.3" opacity="0.5" strokeLinecap="round" pathLength={1} strokeDasharray="1" className="draw" style={{ animationDuration: '4s' }} />
            </g>
          )}
          <Hills type={type} y0={layout.hillsY} H={H} Wu={Wu} xOff={xOff} />
          <g transform={shift}>
            {layout.stops.map((s, i) => <Dot key={s.date} s={s} type={type} i={i} />)}
          </g>
        </svg>
      </div>

      <div className="stage map-col">
        <div className="map" ref={box} style={{ aspectRatio: `${W} / ${H}` }}>
          <header className="map-header up">
            <div className="map-header-row">
              <Link to="/" viewTransition aria-label="На головну" className="circle-btn press"><IconBack /></Link>
              <div className="map-title">
                <h1>{night ? 'Карта зоряних ночей' : 'Карта світанків'}</h1>
                <div className="map-sub">{night ? 'кожна зірка — одне побажання на ніч' : 'кожне сонечко — одне побажання на ранок'}</div>
              </div>
            </div>
            <nav className="seg" aria-label="Категорія">
              <Link to="/night" replace viewTransition className={night ? 'on' : ''} aria-current={night ? 'page' : undefined}><IconMoon size={16} />Ночі</Link>
              <Link to="/morning" replace viewTransition className={!night ? 'on' : ''} aria-current={!night ? 'page' : undefined}><IconSun size={16} />Ранки</Link>
            </nav>
          </header>

          {empty && <p className="map-empty up">Тут ще порожньо — побажання зʼявляться, щойно я їх додам.</p>}

          {layout.hero && (
            <Link
              to={`/${type}/${layout.hero.date}`} viewTransition
              className="map-hero-label up" style={{ left: pct(layout.hero.x + 28, W), top: pct(layout.hero.y, H), animationDelay: '0.4s' }}
            >{formatDate(layout.hero.date)}</Link>
          )}

          {layout.months.map((m, i) => (
            <Link
              key={m.key} to={`/${type}/${m.firstDate}`} viewTransition data-side={m.pill}
              className="map-pill up press"
              style={{
                left: pct(m.pill === 'right' ? m.x + 26 : m.x - 26, W), top: pct(m.y, H),
                animationDelay: `${0.6 + i * 0.35}s`,
              }}
              aria-label={`${m.name}: ${m.label}, від ${formatDate(m.firstDate)}`}
            >
              <span className="map-pill-name">{m.name}</span>
              <span className="map-pill-count">{m.label}</span>
            </Link>
          ))}

          {first && (
            <div className="map-start up" style={{ top: pct(layout.hillsY + 30, H), animationDelay: '1.5s' }}>
              <div className="map-start-title">тут усе почалося</div>
              <div className="map-start-sub">{night ? 'перша добраніч' : 'перший добрий ранок'} · {formatFull(first)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
