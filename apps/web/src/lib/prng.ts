/** Детермінований генератор (mulberry32): однаковий seed → однакове небо між рендерами. */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type Rng = ReturnType<typeof mulberry32>;
export const range = (r: Rng, a: number, b: number) => a + r() * (b - a);
export const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
export const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
