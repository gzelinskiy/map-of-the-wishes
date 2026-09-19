import { useEffect, useRef } from 'react';

/** Свайп вліво/вправо. Вертикальний скрол не чіпає (потрібен CSS touch-action: pan-y на елементі). */
export const useSwipe = (
  ref: React.RefObject<HTMLElement | null>,
  { onLeft, onRight }: { onLeft: () => void; onRight: () => void },
) => {
  const cb = useRef({ onLeft, onRight });
  cb.current = { onLeft, onRight };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number; t: number; id: number } | null = null;

    const down = (e: PointerEvent) => {
      // системний жест «назад» в iOS стартує з краю екрана — не конфліктуємо
      if (e.pointerType === 'touch' && (e.clientX < 24 || e.clientX > window.innerWidth - 24)) return;
      if ((e.target as Element | null)?.closest('button, a, [data-noswipe]')) { start = null; return; }
      start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y, dt = performance.now() - start.t;
      start = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5 || dt > 900) return;
      (dx < 0 ? cb.current.onLeft : cb.current.onRight)();
    };
    const cancel = () => { start = null; };

    el.addEventListener('pointerdown', down, { passive: true });
    el.addEventListener('pointerup', up, { passive: true });
    el.addEventListener('pointercancel', cancel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  }, [ref]);
};

/** Клавіатурні стрілки. */
export const useArrowKeys = (onLeft: () => void, onRight: () => void) => {
  const cb = useRef({ onLeft, onRight });
  cb.current = { onLeft, onRight };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') cb.current.onLeft();
      if (e.key === 'ArrowRight') cb.current.onRight();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
};

/** Ставить data-theme на <html> (фон за колонкою, overscroll) і колір адресного рядка. */
export const useTheme = (theme: 'night' | 'morning') => {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'night' ? '#090C24' : '#5E6FAE');
  }, [theme]);
};

/** Пауза анімацій у фоновій вкладці. */
export const useVisibilityFlag = () => {
  useEffect(() => {
    const set = () => { document.documentElement.dataset.hidden = String(document.visibilityState === 'hidden'); };
    set();
    document.addEventListener('visibilitychange', set);
    return () => document.removeEventListener('visibilitychange', set);
  }, []);
};
