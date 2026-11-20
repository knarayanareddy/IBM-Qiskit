export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(r: RNG): number {
  let u = 0;
  while (u === 0) u = r();
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function binom(r: RNG, n: number, p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return n;
  const m = n * p;
  const s = n * p * (1 - p);
  if (s > 30) return Math.max(0, Math.min(n, Math.round(m + Math.sqrt(s) * gauss(r))));
  let k = 0;
  for (let i = 0; i < n; i++) if (r() < p) k++;
  return k;
}

export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
