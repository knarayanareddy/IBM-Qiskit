/**
 * quantum.ts — a tiny, honest teaching engine for the lesson demos.
 * (statevector sim + simplified noise + the mitigation ideas from the repo)
 * Qubit 0 is the RIGHT-most character of a bitstring (Qiskit convention).
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ------------------------------------------------------------------ circuits */

export type GateName = "h" | "x" | "z" | "t" | "rz" | "cx";
export interface Op {
  g: GateName;
  /** target qubit (for cx: the target) */
  q: number;
  /** control qubit (cx only) */
  c?: number;
  theta?: number;
}

export function simulate(n: number, ops: Op[]): Float64Array {
  const dim = 1 << n;
  const re = new Float64Array(dim);
  const im = new Float64Array(dim);
  re[0] = 1;
  const s2 = Math.SQRT1_2;
  for (const op of ops) {
    const bit = 1 << op.q;
    switch (op.g) {
      case "h":
        for (let i = 0; i < dim; i++) {
          if (i & bit) continue;
          const j = i | bit;
          const ar = re[i], ai = im[i], br = re[j], bi = im[j];
          re[i] = (ar + br) * s2; im[i] = (ai + bi) * s2;
          re[j] = (ar - br) * s2; im[j] = (ai - bi) * s2;
        }
        break;
      case "x":
        for (let i = 0; i < dim; i++) {
          if (i & bit) continue;
          const j = i | bit;
          [re[i], re[j]] = [re[j], re[i]];
          [im[i], im[j]] = [im[j], im[i]];
        }
        break;
      case "z":
        for (let i = 0; i < dim; i++) if (i & bit) { re[i] = -re[i]; im[i] = -im[i]; }
        break;
      case "t":
      case "rz": {
        const th = op.g === "t" ? Math.PI / 4 : op.theta ?? 0;
        // t: |1> gets e^{i pi/4};  rz: e^{-i th/2} on |0>, e^{+i th/2} on |1>
        const p0 = op.g === "t" ? 0 : -th / 2;
        const p1 = op.g === "t" ? th : th / 2;
        const c0 = Math.cos(p0), s0 = Math.sin(p0), c1 = Math.cos(p1), s1 = Math.sin(p1);
        for (let i = 0; i < dim; i++) {
          const [cc, ss] = i & bit ? [c1, s1] : [c0, s0];
          const r = re[i], m = im[i];
          re[i] = r * cc - m * ss;
          im[i] = r * ss + m * cc;
        }
        break;
      }
      case "cx": {
        const cb = 1 << (op.c ?? 0);
        for (let i = 0; i < dim; i++) {
          if (!(i & cb) || i & bit) continue;
          const j = i | bit;
          [re[i], re[j]] = [re[j], re[i]];
          [im[i], im[j]] = [im[j], im[i]];
        }
        break;
      }
    }
  }
  const p = new Float64Array(dim);
  for (let i = 0; i < dim; i++) p[i] = re[i] * re[i] + im[i] * im[i];
  return p;
}

export function countOps(ops: Op[]) {
  let oneQ = 0, twoQ = 0;
  for (const o of ops) o.g === "cx" ? twoQ++ : oneQ++;
  return { oneQ, twoQ };
}

export function bitstring(x: number, n: number): string {
  return x.toString(2).padStart(n, "0");
}

export function popcount(x: number): number {
  let c = 0;
  while (x) { c += x & 1; x >>= 1; }
  return c;
}

/* --------------------------------------------------------------------- laws */

export type LawKind = "none" | "parity-even" | "parity-odd" | "weight";
export interface Law { kind: LawKind; k: number }

export function isValid(x: number, law: Law): boolean {
  switch (law.kind) {
    case "none": return true;
    case "parity-even": return popcount(x) % 2 === 0;
    case "parity-odd": return popcount(x) % 2 === 1;
    case "weight": return popcount(x) === law.k;
  }
}

export function validMask(n: number, law: Law): Uint8Array {
  const m = new Uint8Array(1 << n);
  for (let x = 0; x < m.length; x++) m[x] = isValid(x, law) ? 1 : 0;
  return m;
}

export function lawLabel(law: Law): string {
  switch (law.kind) {
    case "none": return "no law";
    case "parity-even": return "even parity";
    case "parity-odd": return "odd parity";
    case "weight": return `Hamming weight = ${law.k}`;
  }
}

/* -------------------------------------------------------------------- noise */

export interface Noise {
  oneQ: number;
  twoQ: number;
  readout: number;
  /** T1-style drift: probability that a |1> relaxes to |0> */
  decay?: number;
}

export function faultFree(counts: { oneQ: number; twoQ: number }, noise: Noise): number {
  return Math.pow(1 - noise.oneQ, counts.oneQ) * Math.pow(1 - noise.twoQ, counts.twoQ);
}

/** gate faults: with probability 1-f the output is scrambled (uniform). */
export function gateNoisy(ideal: ArrayLike<number>, f: number): Float64Array {
  const dim = ideal.length;
  const out = new Float64Array(dim);
  for (let i = 0; i < dim; i++) out[i] = f * ideal[i] + (1 - f) / dim;
  return out;
}

export function applyDecay(p: Float64Array, n: number, g: number): Float64Array {
  let cur = p;
  for (let k = 0; k < n; k++) {
    const bit = 1 << k;
    const nxt = Float64Array.from(cur);
    for (let x = 0; x < cur.length; x++) {
      if (x & bit) {
        const moved = cur[x] * g;
        nxt[x] -= moved;
        nxt[x ^ bit] += moved;
      }
    }
    cur = nxt;
  }
  return cur;
}

export function applyReadout(p: Float64Array, n: number, r: number): Float64Array {
  let cur = p;
  for (let k = 0; k < n; k++) {
    const bit = 1 << k;
    const nxt = new Float64Array(cur.length);
    for (let x = 0; x < cur.length; x++) nxt[x] = (1 - r) * cur[x] + r * cur[x ^ bit];
    cur = nxt;
  }
  return cur;
}

export function noisyDist(ideal: ArrayLike<number>, n: number, counts: { oneQ: number; twoQ: number }, noise: Noise): Float64Array {
  let p = gateNoisy(ideal, faultFree(counts, noise));
  if (noise.decay) p = applyDecay(p, n, noise.decay);
  return applyReadout(p, n, noise.readout);
}

export function sample(p: ArrayLike<number>, shots: number, rng: Rng): Float64Array {
  const dim = p.length;
  const cdf = new Float64Array(dim);
  let s = 0;
  for (let i = 0; i < dim; i++) { s += p[i]; cdf[i] = s; }
  const out = new Float64Array(dim);
  for (let k = 0; k < shots; k++) {
    const u = rng() * s;
    let lo = 0, hi = dim - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1; else hi = mid;
    }
    out[lo]++;
  }
  for (let i = 0; i < dim; i++) out[i] /= shots;
  return out;
}

/** a single shot at a time — used for the "shot grid" visual */
export function sampleShots(p: ArrayLike<number>, shots: number, rng: Rng): number[] {
  const dim = p.length;
  const cdf = new Float64Array(dim);
  let s = 0;
  for (let i = 0; i < dim; i++) { s += p[i]; cdf[i] = s; }
  const out: number[] = [];
  for (let k = 0; k < shots; k++) {
    const u = rng() * s;
    let lo = 0, hi = dim - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1; else hi = mid;
    }
    out.push(lo);
  }
  return out;
}

/* ---------------------------------------------------------------- mitigation */

/** invert the symmetric per-qubit readout confusion, clip negatives, renormalise */
export function invertReadout(p: Float64Array, n: number, r: number): Float64Array {
  if (r >= 0.499) return Float64Array.from(p);
  let cur = p;
  const d = 1 - 2 * r;
  for (let k = 0; k < n; k++) {
    const bit = 1 << k;
    const nxt = new Float64Array(cur.length);
    for (let x = 0; x < cur.length; x++) nxt[x] = ((1 - r) * cur[x] - r * cur[x ^ bit]) / d;
    cur = nxt;
  }
  let s = 0;
  const out = new Float64Array(cur.length);
  for (let i = 0; i < cur.length; i++) { out[i] = Math.max(0, cur[i]); s += out[i]; }
  if (s > 0) for (let i = 0; i < out.length; i++) out[i] /= s;
  return out;
}

/** v1: throw away every shot that breaks the law, renormalise the rest */
export function hardPostselect(obs: Float64Array, mask: Uint8Array): { kept: number; dist: Float64Array } {
  let kept = 0;
  for (let i = 0; i < obs.length; i++) if (mask[i]) kept += obs[i];
  const dist = new Float64Array(obs.length);
  if (kept > 0) for (let i = 0; i < obs.length; i++) if (mask[i]) dist[i] = obs[i] / kept;
  return { kept, dist };
}

/**
 * v2: nobody is discarded. A shot that broke the law is re-assigned across the
 * LEGAL outcomes, weighted by "how plausible is it that readout flips turned x into y".
 */
export function softReweight(obs: Float64Array, n: number, r: number, mask: Uint8Array, hardDist: Float64Array): Float64Array {
  const dim = obs.length;
  let nValid = 0;
  for (let i = 0; i < dim; i++) nValid += mask[i];
  const prior = new Float64Array(dim);
  let hs = 0;
  for (let i = 0; i < dim; i++) hs += hardDist[i];
  for (let i = 0; i < dim; i++) if (mask[i]) prior[i] = (hs > 0 ? 0.97 * hardDist[i] : 0) + (hs > 0 ? 0.03 : 1) / nValid;
  const rr = Math.max(r, 1e-6);
  const out = new Float64Array(dim);
  for (let y = 0; y < dim; y++) {
    if (obs[y] <= 0) continue;
    const w = new Float64Array(dim);
    let tot = 0;
    for (let x = 0; x < dim; x++) {
      if (!mask[x]) continue;
      const d = popcount(x ^ y);
      w[x] = prior[x] * Math.pow(rr, d) * Math.pow(1 - rr, n - d);
      tot += w[x];
    }
    if (tot <= 0) continue;
    for (let x = 0; x < dim; x++) out[x] += (obs[y] * w[x]) / tot;
  }
  return out;
}

/* ------------------------------------------------------------------ metrics */

export function tvd(p: ArrayLike<number>, q: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]);
  return s / 2;
}

export function gapClosed(raw: number, method: number, ideal: number): number | null {
  const g0 = Math.abs(raw - ideal);
  if (g0 < 1e-9) return null;
  return ((g0 - Math.abs(method - ideal)) / g0) * 100;
}

export function gapClosedTvd(rawTvd: number, methodTvd: number): number | null {
  if (rawTvd < 1e-9) return null;
  return ((rawTvd - methodTvd) / rawTvd) * 100;
}

export interface Observable { kind: "parity" | "weight" | "q0"; label: string }

export function observe(p: ArrayLike<number>, obs: Observable): number {
  let s = 0;
  for (let x = 0; x < p.length; x++) {
    if (obs.kind === "parity") s += p[x] * (popcount(x) % 2 === 0 ? 1 : -1);
    else if (obs.kind === "weight") s += p[x] * popcount(x);
    else s += (x & 1) === 0 ? p[x] : 0;
  }
  return s;
}

/* ------------------------------------------------------------------ presets */

export interface Preset {
  id: string;
  label: string;
  n: number;
  ops?: Op[];
  ideal?: number[];
  counts?: { oneQ: number; twoQ: number };
  law: Law;
  obs: Observable;
  qiskit: string;
  note: string;
  lawHolds: boolean;
}

const vqeIdeal = (() => {
  const a = new Array(16).fill(0);
  // stylised weight-2 distribution (illustrative, not a real VQE solution)
  const w: Record<string, number> = { "0011": 0.3, "0101": 0.08, "0110": 0.12, "1001": 0.12, "1010": 0.08, "1100": 0.3 };
  for (const k of Object.keys(w)) a[parseInt(k, 2)] = w[k];
  return a;
})();

export const PRESETS: Preset[] = [
  {
    id: "bell",
    label: "Bell state",
    n: 2,
    ops: [{ g: "h", q: 0 }, { g: "cx", c: 0, q: 1 }],
    law: { kind: "parity-even", k: 0 },
    obs: { kind: "parity", label: "⟨ZZ⟩ parity" },
    lawHolds: true,
    qiskit: "qc = QuantumCircuit(2, 2)\nqc.h(0)\nqc.cx(0, 1)\nqc.measure_all()",
    note: "Ideal output is only 00 and 11 — both have EVEN parity, so 'even parity' is a perfect law.",
  },
  {
    id: "ghz",
    label: "GHZ (3 qubits)",
    n: 3,
    ops: [{ g: "h", q: 0 }, { g: "cx", c: 0, q: 1 }, { g: "cx", c: 1, q: 2 }],
    law: { kind: "parity-even", k: 0 },
    obs: { kind: "parity", label: "⟨ZZZ⟩ parity" },
    lawHolds: false,
    qiskit: "qc = QuantumCircuit(3, 3)\nqc.h(0)\nfor i in range(2):\n    qc.cx(i, i + 1)\nqc.measure_all()",
    note: "TRAP: ideal output is 000 and 111 — but 111 has ODD parity. An 'even parity' law throws away real signal. (The repo's GHZ stand-in warns about exactly this.)",
  },
  {
    id: "trotter",
    label: "Trotter step (T gates)",
    n: 3,
    ops: [
      { g: "h", q: 0 }, { g: "t", q: 0 }, { g: "h", q: 1 }, { g: "t", q: 1 }, { g: "h", q: 2 }, { g: "t", q: 2 },
      { g: "cx", c: 0, q: 1 }, { g: "cx", c: 1, q: 2 },
      { g: "rz", q: 0, theta: 0.3 }, { g: "rz", q: 1, theta: 0.3 }, { g: "rz", q: 2, theta: 0.3 },
      { g: "h", q: 0 }, { g: "h", q: 1 }, { g: "h", q: 2 },
    ],
    law: { kind: "none", k: 0 },
    obs: { kind: "q0", label: "P(q0 = 0)" },
    lawHolds: true,
    qiskit: "qc = QuantumCircuit(3, 3)\nfor i in range(3):\n    qc.h(i); qc.t(i)\nfor i in range(2):\n    qc.cx(i, i + 1)\nfor i in range(3):\n    qc.rz(0.3, i)\nfor i in range(3):\n    qc.h(i)\nqc.measure_all()",
    note: "No conservation law exists, so hard/soft reweighting has nothing to grab onto — an honest negative control. Use readout mitigation or ZNE here.",
  },
  {
    id: "vqe",
    label: "Fixed-weight VQE (stylised)",
    n: 4,
    ideal: vqeIdeal,
    counts: { oneQ: 8, twoQ: 12 },
    law: { kind: "weight", k: 2 },
    obs: { kind: "weight", label: "mean Hamming weight" },
    lawHolds: true,
    qiskit: "n, k = 4, 2\nqc = QuantumCircuit(n, n)\nfor i in range(k):\n    qc.x(i)            # start with k excitations\nfor i in range(n - 1):\n    qc.rxx(theta[i], i, i + 1)   # these gates\n    qc.ryy(theta[i], i, i + 1)   # keep the weight fixed\nqc.measure_all()",
    note: "Exactly 2 of 4 bits are 1 in every ideal shot. Six legal outcomes out of sixteen — noise lands in the other ten.",
  },
];

export function presetIdeal(p: Preset): Float64Array {
  return p.ideal ? Float64Array.from(p.ideal) : simulate(p.n, p.ops ?? []);
}
export function presetCounts(p: Preset) {
  return p.counts ?? countOps(p.ops ?? []);
}

export const COLORS = {
  ideal: "#34d399",
  noisy: "#fb7185",
  mitigated: "#a78bfa",
  soft: "#f472b6",
  readout: "#fbbf24",
  accent: "#22d3ee",
};
