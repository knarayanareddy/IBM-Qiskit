import { mulberry32, binom, gauss, clamp, mean } from './rng';

export type Version = 'v1' | 'v2';

/* =====================================================================
   PROJECT 1 — Symmetry-resolved mitigation (Bell state, <ZZ>, parity ancilla)
   ===================================================================== */
export interface P1Params {
  p: number; // data bit-flip prob per qubit per layer
  depth: number; // payload layers
  r: number; // data readout flip prob
  miss: number; // prob. a parity check fails to register an odd parity
  falseAlarm: number; // prob. a parity check fires on clean parity
  backAction: number; // prob. a check injects a flip on a data qubit
  shots: number;
  seed: number;
}
export interface P1Shot {
  m: [number, number];
  synA: number;
  synB: number;
}
export const P1_DEFAULT: P1Params = { p: 0.025, depth: 4, r: 0.03, miss: 0.12, falseAlarm: 0.02, backAction: 0.01, shots: 4000, seed: 7 };

export function simP1(par: P1Params, checks: 1 | 2): P1Shot[] {
  const rng = mulberry32(par.seed);
  const out: P1Shot[] = [];
  const h1 = Math.ceil(par.depth / 2);
  const h2 = par.depth - h1;
  for (let i = 0; i < par.shots; i++) {
    const b = rng() < 0.5 ? 0 : 1;
    const x = [b, b];
    for (let l = 0; l < h1; l++) for (let q = 0; q < 2; q++) if (rng() < par.p) x[q] ^= 1;
    const check = () => {
      const P = x[0] ^ x[1];
      const u = rng();
      return P ? (u < 1 - par.miss ? 1 : 0) : u < par.falseAlarm ? 1 : 0;
    };
    const back = (apply: boolean) => {
      const u = rng();
      const q = rng() < 0.5 ? 0 : 1;
      if (apply && u < par.backAction) x[q] ^= 1;
    };
    const synA = check();
    back(checks === 2);
    for (let l = 0; l < h2; l++) for (let q = 0; q < 2; q++) if (rng() < par.p) x[q] ^= 1;
    const synB = check();
    back(true);
    const ro0 = rng() < par.r ? 1 : 0;
    const ro1 = rng() < par.r ? 1 : 0;
    out.push({ m: [x[0] ^ ro0, x[1] ^ ro1], synA: checks === 2 ? synA : 0, synB });
  }
  return out;
}

export type P1Cat = 'good' | 'undetected' | 'caught' | 'wasted';
export interface P1Result {
  n: number;
  raw: number;
  rawErr: number;
  ro: number;
  roErr: number;
  ps: number;
  psErr: number;
  psro: number;
  psroErr: number;
  kept: number;
  retention: number;
  hist: number[]; // 00,01,10,11
  cats: P1Cat[];
  catCount: Record<P1Cat, number>;
  rf: number;
}
export function analyzeP1(shots: P1Shot[], par: P1Params): P1Result {
  const n = shots.length;
  const rf = Math.pow(1 - 2 * par.r, 2);
  const zz = (s: P1Shot) => 1 - 2 * (s.m[0] ^ s.m[1]);
  const all = shots.map(zz);
  const raw = mean(all);
  const rawErr = Math.sqrt(Math.max(0, 1 - raw * raw) / n);
  const keptIdx = shots.map((s) => s.synA === 0 && s.synB === 0);
  const kz = shots.filter((_, i) => keptIdx[i]).map(zz);
  const kept = kz.length;
  const ps = kept ? mean(kz) : 0;
  const psErr = kept ? Math.sqrt(Math.max(0, 1 - ps * ps) / kept) : 1;
  const hist = [0, 0, 0, 0];
  const cats: P1Cat[] = [];
  const catCount: Record<P1Cat, number> = { good: 0, undetected: 0, caught: 0, wasted: 0 };
  shots.forEach((s, i) => {
    hist[s.m[0] * 2 + s.m[1]]++;
    const bad = zz(s) < 0;
    const c: P1Cat = keptIdx[i] ? (bad ? 'undetected' : 'good') : bad ? 'caught' : 'wasted';
    cats.push(c);
    catCount[c]++;
  });
  return {
    n,
    raw,
    rawErr,
    ro: clamp(raw / rf, -1, 1),
    roErr: rawErr / rf,
    ps,
    psErr,
    psro: clamp(ps / rf, -1, 1),
    psroErr: psErr / rf,
    kept,
    retention: kept / n,
    hist,
    cats,
    catCount,
    rf,
  };
}

/* =====================================================================
   PROJECT 2 — Non-Clifford-targeted ZNE
   ===================================================================== */
export interface P2Params {
  E0: number;
  aC: number; // Clifford-layer noise exponent (per unit scale)
  aT: number; // T-layer noise exponent (per unit scale)
  virtualT: boolean; // T = virtual Rz on hardware -> no physical noise
  shots: number;
  seed: number;
  nScales: number;
}
export const P2_DEFAULT: P2Params = { E0: 0.5, aC: 0.25, aT: 0.15, virtualT: false, shots: 8192, seed: 11, nScales: 3 };
export interface ZPoint {
  lam: number;
  y: number;
  sigma: number;
  exact: number;
  k1: number;
  n: number;
}
export interface Fit {
  name: string;
  value: number;
  sigma: number;
  f: (x: number) => number;
}
export const scalesFor = (n: number) => Array.from({ length: n }, (_, i) => 1 + 2 * i);

export function simP2(par: P2Params, v: Version): ZPoint[] {
  const rng = mulberry32(par.seed);
  const aT = par.virtualT ? 0 : par.aT;
  return scalesFor(par.nScales).map((lam) => {
    const lamC = v === 'v2' ? lam : 1;
    const E = par.E0 * Math.exp(-(par.aC * lamC + aT * lam));
    const k1 = binom(rng, par.shots, (1 + E) / 2);
    const y = (2 * k1) / par.shots - 1;
    return { lam, y, sigma: Math.sqrt(Math.max(1e-6, 1 - y * y) / par.shots), exact: E, k1, n: par.shots };
  });
}

function olsLine(xs: number[], ys: number[], ws?: number[]) {
  const w = ws ?? xs.map(() => 1);
  const sw = w.reduce((a, b) => a + b, 0);
  const mx = xs.reduce((a, x, i) => a + w[i] * x, 0) / sw;
  const my = ys.reduce((a, y, i) => a + w[i] * y, 0) / sw;
  let sxx = 0,
    sxy = 0;
  xs.forEach((x, i) => {
    sxx += w[i] * (x - mx) ** 2;
    sxy += w[i] * (x - mx) * (ys[i] - my);
  });
  const b = sxx > 1e-12 ? sxy / sxx : 0;
  return { a: my - b * mx, b };
}
function lagrange(xs: number[], ys: number[], x: number) {
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    let t = ys[i];
    for (let j = 0; j < xs.length; j++) if (j !== i) t *= (x - xs[j]) / (xs[i] - xs[j]);
    s += t;
  }
  return s;
}
type Method = 'linear' | 'richardson' | 'exp';
function fitOnce(xs: number[], ys: number[], sg: number[], m: Method): (x: number) => number {
  if (m === 'linear') {
    const { a, b } = olsLine(xs, ys);
    return (x) => a + b * x;
  }
  if (m === 'richardson') return (x) => lagrange(xs, ys, x);
  const idx = ys.map((y, i) => (y > 0.01 ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 2) {
    const { a, b } = olsLine(xs, ys);
    return (x) => a + b * x;
  }
  const X = idx.map((i) => xs[i]);
  const L = idx.map((i) => Math.log(ys[i]));
  const W = idx.map((i) => (ys[i] / sg[i]) ** 2);
  const { a, b } = olsLine(X, L, W);
  return (x) => Math.exp(a + b * x);
}
export function fitZne(points: ZPoint[], m: Method, seed = 5): Fit {
  const xs = points.map((p) => p.lam);
  const ys = points.map((p) => p.y);
  const sg = points.map((p) => p.sigma);
  const f = fitOnce(xs, ys, sg, m);
  const rng = mulberry32(seed);
  const vals: number[] = [];
  for (let b = 0; b < 300; b++) {
    const yb = ys.map((y, i) => y + sg[i] * gauss(rng));
    vals.push(fitOnce(xs, yb, sg, m)(0));
  }
  const mu = mean(vals);
  const sd = Math.sqrt(mean(vals.map((x) => (x - mu) ** 2)));
  const name = m === 'linear' ? 'Linear' : m === 'richardson' ? 'Richardson' : 'Exponential';
  return { name, value: f(0), sigma: sd, f };
}
export function p2BiasFloor(par: P2Params, v: Version) {
  // value you converge to with infinite shots when extrapolating to lambda->0
  if (v === 'v2') return par.E0;
  return par.E0 * Math.exp(-par.aC);
}

/* =====================================================================
   PROJECT 3 — Hybrid QEM + light error detection (3-qubit repetition code)
   ===================================================================== */
export interface P3Params {
  p: number; // bit-flip per data qubit per round
  rounds: number;
  a: number; // syndrome-bit error probability (ancilla gate+readout)
  r: number; // data readout error
  shots: number;
  seed: number;
  tau: number; // confidence threshold for v2 gated decoder
}
export const P3_DEFAULT: P3Params = { p: 0.04, rounds: 2, a: 0.03, r: 0.03, shots: 4000, seed: 3, tau: 0.85 };
export const pEff = (p: number, rounds: number) => (1 - Math.pow(1 - 2 * p, rounds)) / 2;

export interface SynRow {
  s: number;
  label: string;
  mass: number;
  pFlip0: number;
  corr0: boolean;
  conf: number;
  meaning: string;
}
const SYN_MEANING = ['no flag', 'q2 flipped (or q0&q1)', 'q0 flipped (or q1&q2)', 'q1 flipped (or q0&q2)'];
// s index = s1*2 + s2, where s1 = d0^d1, s2 = d1^d2
export function p3Table(par: P3Params): SynRow[] {
  const q = pEff(par.p, par.rounds);
  const mass = [0, 0, 0, 0];
  const f0 = [0, 0, 0, 0];
  for (let e = 0; e < 8; e++) {
    const b = [e & 1, (e >> 1) & 1, (e >> 2) & 1];
    const pe = b.reduce((acc, bit) => acc * (bit ? q : 1 - q), 1);
    const s1 = b[0] ^ b[1];
    const s2 = b[1] ^ b[2];
    for (let se = 0; se < 4; se++) {
      const a1 = se & 1,
        a2 = (se >> 1) & 1;
      const ps = (a1 ? par.a : 1 - par.a) * (a2 ? par.a : 1 - par.a);
      const s = (s1 ^ a1) * 2 + (s2 ^ a2);
      mass[s] += pe * ps;
      if (b[0]) f0[s] += pe * ps;
    }
  }
  return [0, 1, 2, 3].map((s) => {
    const pf = mass[s] > 0 ? f0[s] / mass[s] : 0;
    const corr0 = pf > 0.5;
    return { s, label: `${(s >> 1) & 1}${s & 1}`, mass: mass[s], pFlip0: pf, corr0, conf: Math.max(pf, 1 - pf), meaning: SYN_MEANING[s] };
  });
}
export type P3Mode = 'detect' | 'correct' | 'gated';
export interface Decision {
  keep: boolean;
  corr0: boolean;
}
export function p3Decisions(par: P3Params, mode: P3Mode): Decision[] {
  const t = p3Table(par);
  return t.map((row) => {
    if (mode === 'detect') return { keep: row.s === 0, corr0: false };
    if (mode === 'correct') return { keep: true, corr0: row.corr0 };
    return { keep: row.conf >= par.tau, corr0: row.corr0 };
  });
}
export interface P3Exact {
  raw: number;
  ro: number;
  detect: number;
  detectRo: number;
  detectRet: number;
  correctRo: number;
  gatedRo: number;
  gatedRet: number;
}
export function p3Exact(par: P3Params): P3Exact {
  const q = pEff(par.p, par.rounds);
  const rf = 1 - 2 * par.r;
  const t = p3Table(par);
  const est = (dec: Decision[]) => {
    let K = 0,
      Z = 0;
    t.forEach((row, s) => {
      if (!dec[s].keep) return;
      const perr = dec[s].corr0 ? 1 - row.pFlip0 : row.pFlip0;
      K += row.mass;
      Z += row.mass * (1 - 2 * perr);
    });
    return { z: K > 0 ? Z / K : 0, ret: K };
  };
  const d = est(p3Decisions(par, 'detect'));
  const c = est(p3Decisions(par, 'correct'));
  const g = est(p3Decisions(par, 'gated'));
  return {
    raw: (1 - 2 * q) * rf,
    ro: 1 - 2 * q,
    detect: d.z * rf,
    detectRo: d.z,
    detectRet: d.ret,
    correctRo: c.z,
    gatedRo: g.z,
    gatedRet: g.ret,
  };
}
export interface P3Shot {
  e: number;
  s: number;
  ro: [number, number, number];
}
export function simP3(par: P3Params): P3Shot[] {
  const rng = mulberry32(par.seed);
  const q = pEff(par.p, par.rounds);
  const out: P3Shot[] = [];
  for (let i = 0; i < par.shots; i++) {
    let e = 0;
    for (let k = 0; k < 3; k++) if (rng() < q) e |= 1 << k;
    const b = [e & 1, (e >> 1) & 1, (e >> 2) & 1];
    const a1 = rng() < par.a ? 1 : 0;
    const a2 = rng() < par.a ? 1 : 0;
    const s = ((b[0] ^ b[1] ^ a1) << 1) | (b[1] ^ b[2] ^ a2);
    const ro: [number, number, number] = [rng() < par.r ? 1 : 0, rng() < par.r ? 1 : 0, rng() < par.r ? 1 : 0];
    out.push({ e, s, ro });
  }
  return out;
}
export interface P3Est {
  z: number;
  err: number;
  ret: number;
  kept: number;
}
export function p3Estimate(shots: P3Shot[], dec: Decision[], par: P3Params, ro: boolean): P3Est {
  const rf = 1 - 2 * par.r;
  const vals: number[] = [];
  for (const sh of shots) {
    const d = dec[sh.s];
    if (!d.keep) continue;
    const bit = (sh.e & 1) ^ (d.corr0 ? 1 : 0) ^ sh.ro[0];
    vals.push(1 - 2 * bit);
  }
  const z = mean(vals);
  const se = vals.length ? Math.sqrt(Math.max(1e-9, 1 - z * z) / vals.length) : 1;
  const div = ro ? rf : 1;
  return { z: clamp(z / div, -1, 1), err: se / div, ret: vals.length / shots.length, kept: vals.length };
}
export function p3Sweep(par: P3Params, n = 26) {
  const rows: { p: number; e: P3Exact }[] = [];
  for (let i = 0; i < n; i++) {
    const p = 0.003 + (0.16 * i) / (n - 1);
    rows.push({ p, e: p3Exact({ ...par, p }) });
  }
  return rows;
}

/* =====================================================================
   PROJECT 4 — Adaptive conservation post-selection (|1100>, weight 2)
   ===================================================================== */
export interface P4Params {
  hop: number; // per layer: weight-preserving hop (random adjacent swap)
  flip: number; // per shot: weight-breaking bit flip
  r10: number; // readout 1->0
  r01: number; // readout 0->1
  shots: number;
  seed: number;
  emIters: number;
}
export const P4_DEFAULT: P4Params = { hop: 0.05, flip: 0.05, r10: 0.07, r01: 0.02, shots: 4000, seed: 5, emIters: 25 };
export const pop = (x: number) => (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
export const bits4 = (x: number) => x.toString(2).padStart(4, '0');
export const W2 = [3, 5, 6, 9, 10, 12];
const bit = (x: number, i: number) => (x >> (3 - i)) & 1;

export interface P4Sim {
  nO: number[];
  nT: number[];
  obs: number[];
  tru: number[];
  N: number;
}
export function simP4(par: P4Params): P4Sim {
  const rng = mulberry32(par.seed);
  const nO = new Array(16).fill(0);
  const nT = new Array(16).fill(0);
  const obs: number[] = [];
  const tru: number[] = [];
  for (let i = 0; i < par.shots; i++) {
    const t = [1, 1, 0, 0];
    for (let l = 0; l < 2; l++) {
      if (rng() < par.hop) {
        const k = Math.floor(rng() * 3);
        const tmp = t[k];
        t[k] = t[k + 1];
        t[k + 1] = tmp;
      }
    }
    if (rng() < par.flip) t[Math.floor(rng() * 4)] ^= 1;
    const o = t.map((b) => (b === 1 ? (rng() < par.r10 ? 0 : 1) : rng() < par.r01 ? 1 : 0));
    const ti = (t[0] << 3) | (t[1] << 2) | (t[2] << 1) | t[3];
    const oi = (o[0] << 3) | (o[1] << 2) | (o[2] << 1) | o[3];
    nO[oi]++;
    nT[ti]++;
    obs.push(oi);
    tru.push(ti);
  }
  return { nO, nT, obs, tru, N: par.shots };
}
export function confusion(par: P4Params): number[][] {
  // C[o][t]
  const C: number[][] = [];
  for (let o = 0; o < 16; o++) {
    C.push([]);
    for (let t = 0; t < 16; t++) {
      let p = 1;
      for (let i = 0; i < 4; i++) {
        const ob = bit(o, i),
          tb = bit(t, i);
        p *= tb === 1 ? (ob === 1 ? 1 - par.r10 : par.r10) : ob === 1 ? par.r01 : 1 - par.r01;
      }
      C[o].push(p);
    }
  }
  return C;
}
export interface P4Result {
  N: number;
  rawP1100: number;
  rawW2: number;
  hardP1100: number;
  hardRet: number;
  softV1: { p1100: number; w2: number; ess: number; weights: number[] };
  softV2: { p1100: number; w2: number; ess: number; weights: number[]; prior: number[]; trace: number[] };
  invP1100: number;
  invW2: number;
  truthP1100: number;
  truthW2: number;
  C: number[][];
}
function softEstimate(nO: number[], N: number, C: number[][], prior: number[]) {
  const weights: number[] = [];
  let num = 0,
    den = 0,
    sw = 0,
    sw2 = 0;
  for (let o = 0; o < 16; o++) {
    let tot = 0,
      inW = 0;
    for (let t = 0; t < 16; t++) {
      const v = C[o][t] * prior[t];
      tot += v;
      if (pop(t) === 2) inW += v;
    }
    const w = tot > 0 ? inW / tot : 0;
    weights.push(w);
    if (inW > 0) num += nO[o] * w * ((C[o][12] * prior[12]) / inW);
    den += nO[o] * w;
    sw += nO[o] * w;
    sw2 += nO[o] * w * w;
  }
  return { p1100: den > 0 ? num / den : 0, w2: sw / N, ess: sw2 > 0 ? (sw * sw) / sw2 / N : 0, weights };
}
export function analyzeP4(sim: P4Sim, par: P4Params): P4Result {
  const { nO, nT, N } = sim;
  const C = confusion(par);
  const rawP1100 = nO[12] / N;
  const keptN = nO.reduce((a, n, o) => a + (pop(o) === 2 ? n : 0), 0);
  const uni = new Array(16).fill(1 / 16);
  const v1 = softEstimate(nO, N, C, uni);
  // EM / iterative Bayesian unfolding with learned prior
  let prior = uni.slice();
  const trace: number[] = [];
  const W = (pr: number[]) => {
    const s = W2.reduce((a, t) => a + pr[t], 0);
    return s > 0 ? pr[12] / s : 0;
  };
  trace.push(W(prior));
  for (let it = 0; it < par.emIters; it++) {
    const next = new Array(16).fill(0);
    for (let o = 0; o < 16; o++) {
      if (!nO[o]) continue;
      let tot = 0;
      for (let t = 0; t < 16; t++) tot += C[o][t] * prior[t];
      if (tot <= 0) continue;
      for (let t = 0; t < 16; t++) next[t] += (nO[o] / N) * ((C[o][t] * prior[t]) / tot);
    }
    prior = next;
    trace.push(W(prior));
  }
  const v2 = softEstimate(nO, N, C, prior);
  const v2p = W(prior);
  // tensored inverse
  let vec = nO.map((n) => n / N);
  const det = 1 - par.r01 - par.r10;
  for (let i = 0; i < 4; i++) {
    const nv = vec.slice();
    for (let x = 0; x < 16; x++) {
      const b = bit(x, i);
      const x0 = x & ~(1 << (3 - i));
      const x1 = x | (1 << (3 - i));
      const p0 = vec[x0],
        p1 = vec[x1];
      nv[x] = b === 0 ? ((1 - par.r10) * p0 - par.r10 * p1) / det : (-par.r01 * p0 + (1 - par.r01) * p1) / det;
    }
    vec = nv;
  }
  vec = vec.map((v) => Math.max(0, v));
  const sv = vec.reduce((a, b) => a + b, 0) || 1;
  vec = vec.map((v) => v / sv);
  return {
    N,
    rawP1100,
    rawW2: W2.reduce((a, o) => a + nO[o], 0) / N,
    hardP1100: keptN ? nO[12] / keptN : 0,
    hardRet: keptN / N,
    softV1: v1,
    softV2: { p1100: v2p, w2: W2.reduce((a, t) => a + prior[t], 0), ess: v2.ess, weights: v2.weights, prior, trace },
    invP1100: vec[12],
    invW2: W2.reduce((a, t) => a + vec[t], 0),
    truthP1100: nT[12] / N,
    truthW2: W2.reduce((a, t) => a + nT[t], 0) / N,
    C,
  };
}

/* ======================= Idea demos (exact maths) ======================= */
// Virtual distillation on a depolarised Bell pair, observable ZZ (ideal = 1)
export function vdZZ(q: number, M: number) {
  const a = 1 - q;
  const b = (1 - a) / 4;
  const l1 = a + b;
  return (Math.pow(l1, M) - Math.pow(b, M)) / (Math.pow(l1, M) + 3 * Math.pow(b, M));
}
