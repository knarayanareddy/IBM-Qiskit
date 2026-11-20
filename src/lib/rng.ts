/** Deterministic PRNG + Gaussian helper — ported from qiskit-error-mitigation-ideas/src/lib/rng.ts */

/** Mulberry32 PRNG — returns [0, 1). Seed is a 32-bit unsigned int. */
export function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: standard normal from a uniform PRNG. */
export function gauss(rng: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rng(); // avoid log(0)
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
