import { useEffect, useState } from 'react';

/** Висота «світу» неба в умовних одиницях (дизайн 390×844). */
export const SKY_H = 844;
export const COL_W = 390;      // ширина колонки в одиницях дизайну
export const COL_MAX_PX = 480; // максимальна ширина колонки в px
const STEP = 64;               // квантування: небо не «перетасовується» на кожен піксель ресайзу

const PHONE_MAX_PX = 600; // ≤ цієї ширини небо таке саме, як у макеті (390×844), незалежно від висоти

/**
 * Ширина світу неба для вікна vw×vh: W = 844·vw/vh, тож viewBox збігається з екраном
 * і нічого не вирізається. Телефони (vw ≤ 600) лишаються на 390 — як у макеті.
 */
export const skyWidth = (vw: number, vh: number): number => {
  if (vw <= PHONE_MAX_PX) return COL_W;
  const raw = (SKY_H * vw) / Math.max(vh, 1);
  return Math.ceil(raw / STEP) * STEP;
};

/**
 * Карта: колонка 390 од. = min(vw, 480) px. Повертає ширину повноширинного шару в тих самих
 * одиницях і відступ, на який колонку зсунуто, щоб вона лишалась по центру.
 */
export const mapSkyBox = (vw: number): { Wu: number; xOff: number } => {
  const s = Math.min(vw, COL_MAX_PX) / COL_W;
  const raw = vw / s;
  const Wu = raw <= COL_W ? COL_W : Math.ceil(raw / STEP) * STEP;
  return { Wu, xOff: (Wu - COL_W) / 2 };
};

export interface Viewport { w: number; h: number }

const read = (): Viewport => ({
  w: typeof document === 'undefined' ? COL_W : document.documentElement.clientWidth,
  h: typeof window === 'undefined' ? SKY_H : window.innerHeight,
});

/** Розмір вікна; оновлюється на resize/orientationchange (не частіше разу на кадр). */
export const useViewportSize = (): Viewport => {
  const [v, setV] = useState(read);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const n = read();
        setV((o) => (o.w === n.w && o.h === n.h ? o : n));
      });
    };
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  return v;
};

/** W світу неба для поточного вікна; змінюється лише коли перескакує крок квантування. */
export const useSkyWidth = (): number => {
  const { w, h } = useViewportSize();
  return skyWidth(w, h);
};
