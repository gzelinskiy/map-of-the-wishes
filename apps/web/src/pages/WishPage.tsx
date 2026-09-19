import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { formatDate, formatShort, isIsoDate, isWishType, paragraphs, type WishResponse, type WishType } from '@nebo/shared';
import { useIndex } from '../lib/IndexContext.tsx';
import { getWish, LockedError, prefetchWish } from '../lib/api.ts';
import { useArrowKeys, useSwipe, useTheme } from '../lib/hooks.ts';
import { DawnSky, NightSky } from '../components/skies.tsx';
import { HeroStar, HeroSun, IconBack, IconForward, IconMoon, IconSun, NavStar, NavSun } from '../components/glyphs.tsx';

const NAV_POS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 110, y: 26 }],
  2: [{ x: 60, y: 34 }, { x: 160, y: 22 }],
  3: [{ x: 22, y: 40 }, { x: 110, y: 16 }, { x: 198, y: 34 }],
};

const dayNum = (iso: string) => Date.parse(iso + 'T00:00:00Z') / 86_400_000;
const closest = (list: string[], date: string): string | null => {
  let best: string | null = null, bd = Infinity;
  for (const d of list) { const k = Math.abs(dayNum(d) - dayNum(date)); if (k < bd) { bd = k; best = d; } }
  return best;
};

export const WishPage = () => {
  const { type, date } = useParams();
  if (!isWishType(type) || !date || !isIsoDate(date)) return <Navigate to="/" replace />;
  return <WishInner type={type} date={date} />;
};

const WishInner = ({ type, date }: { type: WishType; date: string }) => {
  const idx = useIndex();
  const nav = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const morning = type === 'morning';
  useTheme(type);

  const list = idx[type];
  const i = list.indexOf(date);
  const other: WishType = morning ? 'night' : 'morning';

  /* ── завантаження тексту + префетч сусідів ── */
  const [shown, setShown] = useState<WishResponse | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (i < 0) return;
    let alive = true;
    setFailed(false);
    getWish(type, date).then((w) => { if (alive) setShown(w); }).catch((e) => {
      if (e instanceof LockedError) location.reload();
      else if (alive) setFailed(true);
    });
    for (const k of [i - 1, i + 1, i - 2, i + 2]) prefetchWish(type, list[k]);
    return () => { alive = false; };
  }, [type, date, i, list]);

  /* ── «ніч розчиняється у світанок» — при вході на ранок, не при гортанні ── */
  const prevType = useRef(type);
  const [fade, setFade] = useState(morning ? 1 : 0);
  useEffect(() => {
    if (morning && prevType.current !== 'morning') setFade((f) => f + 1);
    prevType.current = type;
  }, [type, morning]);

  /* ── навігація ── */
  const go = useCallback((d: string | null | undefined) => {
    if (d) nav(`/${type}/${d}`, { replace: false });
  }, [nav, type]);
  const older = i > 0 ? list[i - 1] : null;
  const newer = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  useSwipe(root, { onLeft: () => go(newer), onRight: () => go(older) });
  useArrowKeys(() => go(older), () => go(newer));

  const otherList = idx[other];
  const counterpart = otherList.includes(date) ? date : closest(otherList, date);
  const sameDay = counterpart === date;

  /* ── міні-сузір'я з трьох сусідніх ── */
  const nearby = useMemo(() => {
    const n = Math.min(3, list.length);
    const start = Math.max(0, Math.min(i - 1, list.length - n));
    return list.slice(start, start + n);
  }, [list, i]);
  const pos = NAV_POS[nearby.length] ?? [];
  const poly = ['0,52', ...pos.map((p) => `${p.x},${p.y}`), '220,24'].join(' ');

  if (i < 0) return <Navigate to={`/${type}`} replace />;

  const paras = shown && shown.date === date ? paragraphs(shown.text) : [];

  return (
    <div ref={root} className={`stage theme-${type} wish-stage`}>
      <div className="sky-fixed">{morning ? <DawnSky /> : <NightSky seed={11} stars={95} shoots={3} />}</div>
      {morning && fade > 0 && (
        <div key={fade} className="sky-fixed nightfade" aria-hidden="true">
          <div className="fade-bg"><NightSky seed={11} stars={95} shoots={0} /></div>
        </div>
      )}

      <header className="wish-header">
        <Link to={`/${type}`} state={{ focus: date }} viewTransition aria-label={morning ? 'До карти ранків' : 'До карти ночей'} className="circle-btn press"><IconBack /></Link>
        <div className="wish-headline">
          <div className="wish-kind">{morning ? 'Добрий ранок' : 'Добраніч'}</div>
          <div className="wish-date">{formatDate(date)}</div>
        </div>
        {counterpart ? (
          <Link
            to={`/${other}/${counterpart}`} viewTransition className="circle-btn press"
            aria-label={sameDay ? (morning ? 'Нічне побажання цього дня' : 'Ранкове побажання цього дня')
              : `${morning ? 'Найближча ніч' : 'Найближчий ранок'}: ${formatDate(counterpart)}`}
          >{morning ? <IconMoon /> : <IconSun />}</Link>
        ) : <span className="circle-btn" aria-disabled="true">{morning ? <IconMoon /> : <IconSun />}</span>}
      </header>

      <main className="wish-main" aria-live="polite" aria-busy={!paras.length && !failed}>
        <div className="wish-hero">{morning ? <HeroSun /> : <HeroStar />}</div>
        {failed ? (
          <p className="wish-error">Не вдалося завантажити це побажання. Спробуй ще раз трохи згодом.</p>
        ) : (
          <article key={`${type}/${shown?.date ?? 'x'}`} className="wish-text">
            {paras.map((p, j) => (
              <p key={j} className="up" style={{ animationDelay: `${(0.35 + j * 0.35).toFixed(2)}s` }}>{p}</p>
            ))}
          </article>
        )}
      </main>

      <div className="wish-spacer" />
      <nav className="wish-nav" aria-label={morning ? 'Сусідні ранки' : 'Сусідні ночі'}>
        <button type="button" className="circle-btn lg press" aria-label="Попереднє побажання" disabled={!older} onClick={() => go(older)}><IconBack /></button>
        <div className="constellation" data-noswipe>
          <svg width="220" height="60" viewBox="0 0 220 60" aria-hidden="true" focusable="false">
            <polyline points={poly} fill="none" stroke="var(--route)" strokeWidth="1" opacity="0.55" strokeDasharray="2 4" />
          </svg>
          {nearby.map((d, k) => {
            const on = d === date, p = pos[k];
            const Mark = morning ? NavSun : NavStar;
            return (
              <div key={d}>
                <button type="button" className="const-btn" style={{ left: p.x - 22, top: p.y - 22 }} aria-label={formatDate(d)} aria-current={on || undefined} onClick={() => go(d)}>
                  <Mark on={on} />
                </button>
                <div className={`const-label${on ? ' on' : ''}`} style={{ left: p.x - 30, top: p.y + 18 }}>{formatShort(d)}</div>
              </div>
            );
          })}
        </div>
        <button type="button" className="circle-btn lg press" aria-label="Наступне побажання" disabled={!newer} onClick={() => go(newer)}><IconForward /></button>
      </nav>
    </div>
  );
};
