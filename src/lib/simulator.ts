/**
 * simulator.ts — pure-TypeScript, in-browser engine.
 *
 * Port of the math in fallfest-combined-infra/core/adaptive_conservation.py:
 *   - NoiseConfig / noise model  (depolarising 1q + 2q gate errors, symmetric readout error)
 *   - conservation laws          (weight / parity / none)  + valid-state mask
 *   - confusion matrix           (measured by sampling calibration shots)
 *   - readout mitigation         (linear inversion, clip, renormalise)
 *   - hard post-selection        (v1)
 *   - adaptive soft reweighting  (v2):  w(o) = Σ_{t valid} P(t|o),  P(t|o) ∝ M[t,o]·prior(t)
 *
 * No Qiskit, no backend, no external quantum libraries. Works for ANY circuit that can be
 * parsed from Qiskit-Python-style or OpenQASM 2/3 text (see parseCircuit()).
 *
 * Deliberate deviations from the Python reference (all documented in the UI):
 *   1. The confusion matrix is tensored (one 2x2 per measured qubit) instead of 2^n calibration
 *      circuits. This is what the Python docstring says ("per-qubit"), it is exact for
 *      independent readout error and scales to ~10 qubits.
 *   2. M[t,o] = P(o|t) is used consistently (p_obs = Mᵀ p_true). The Python code solves M x = p_obs,
 *      which only coincides because its M happens to be symmetric.
 *   3. Gate noise is applied to every gate (Aer would silently skip gates not in its list).
 *   4. Mitigated distributions are kept as probabilities (no rounding to integer counts).
 *   5. An optional *empirical prior* for the soft weights (default). The reference's uniform prior
 *      is still available — see the note on `PriorMode`.
 */

/* ------------------------------------------------------------------ types */

export interface NoiseConfig {
  oneQ: number; // 1-qubit depolarising parameter
  twoQ: number; // 2-qubit depolarising parameter
  readout: number; // symmetric readout flip probability
  shots: number;
}

/** Same defaults as the Python NoiseConfig dataclass. */
export const DEFAULT_NOISE: NoiseConfig = { oneQ: 0.01, twoQ: 0.03, readout: 0.05, shots: 4096 };

export type LawKind = "none" | "parity-even" | "parity-odd" | "weight";
export interface Law {
  kind: LawKind;
  k: number; // target Hamming weight when kind === "weight"
}

/**
 * "uniform"   — exactly the reference: P(true=t) uniform. Note: with a uniform prior the soft weight of
 *               an observed *valid* string is only ≈ (1-e)^n, so the estimate is shrunk towards 0.5 and
 *               can be WORSE than the raw valid fraction.
 * "empirical" — prior = readout-mitigated distribution (one iterative-Bayesian-unfolding step).
 *               Converges to the readout-mitigated valid mass but keeps per-shot soft weights.
 */
export type PriorMode = "uniform" | "empirical";

export interface GateOp {
  name: string;
  qubits: number[];
  params: number[];
}

export interface CircuitStats {
  nQubits: number;
  nMeasured: number;
  depth: number;
  gates: number;
  oneQ: number;
  twoQ: number;
  multiQ: number;
  tGates: number;
  nonClifford: number;
  counts: Record<string, number>;
}

export interface ParsedCircuit {
  ok: boolean;
  format: "qiskit" | "qasm" | "empty";
  nQubits: number;
  ops: GateOp[];
  measured: number[]; // sorted measured qubits (all qubits when no explicit measurement)
  explicitMeasure: boolean;
  warnings: string[];
  errors: string[];
  stats: CircuitStats;
}

export const MAX_QUBITS = 12;
export const MAX_MEASURED = 10;

/* ------------------------------------------------------------------ rng */

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

/* ------------------------------------------------------------------ expression evaluator */

type Val = number | number[];

function num(v: Val): number {
  if (Array.isArray(v)) throw new Error("expected a number, got a list");
  return v;
}

const FUNCS: Record<string, (a: Val[]) => Val> = {
  sqrt: (a) => Math.sqrt(num(a[0])),
  sin: (a) => Math.sin(num(a[0])),
  cos: (a) => Math.cos(num(a[0])),
  tan: (a) => Math.tan(num(a[0])),
  asin: (a) => Math.asin(num(a[0])),
  acos: (a) => Math.acos(num(a[0])),
  atan: (a) => Math.atan(num(a[0])),
  exp: (a) => Math.exp(num(a[0])),
  log: (a) => Math.log(num(a[0])),
  abs: (a) => Math.abs(num(a[0])),
  int: (a) => Math.trunc(num(a[0])),
  float: (a) => num(a[0]),
  round: (a) => Math.round(num(a[0])),
  min: (a) => Math.min(...a.map(num)),
  max: (a) => Math.max(...a.map(num)),
  pow: (a) => Math.pow(num(a[0]), num(a[1])),
  len: (a) => (Array.isArray(a[0]) ? a[0].length : 1),
  range: (a) => {
    const [x, y, z] = a.map(num);
    const start = a.length >= 2 ? x : 0;
    const stop = a.length >= 2 ? y : x;
    const step = a.length >= 3 ? z : 1;
    if (!step) throw new Error("range() step is zero");
    const out: number[] = [];
    for (let v = start; step > 0 ? v < stop : v > stop; v += step) {
      out.push(v);
      if (out.length > 4096) throw new Error("range() too large");
    }
    return out;
  },
};

export function evalExpr(src: string, env: Record<string, Val> = {}): Val {
  const s = src.trim();
  if (!s) throw new Error("empty expression");
  const re = /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)|([A-Za-z_][A-Za-z_0-9.]*)|(\*\*|\/\/|[-+*/%(),[\]]))/y;
  const toks: { t: "n" | "id" | "op"; v: string }[] = [];
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) throw new Error(`unexpected '${s.slice(i, i + 8)}'`);
    if (m[1] !== undefined) toks.push({ t: "n", v: m[1] });
    else if (m[2] !== undefined) toks.push({ t: "id", v: m[2] });
    else toks.push({ t: "op", v: m[3] });
    i = re.lastIndex;
  }
  let pos = 0;
  const peek = () => toks[pos];
  const eat = (v?: string) => {
    const t = toks[pos];
    if (!t || (v !== undefined && t.v !== v)) throw new Error(`expected '${v ?? "token"}'`);
    pos++;
    return t;
  };

  const parseExpr = (): Val => {
    let v = parseTerm();
    while (peek() && (peek().v === "+" || peek().v === "-")) {
      const op = eat().v;
      const r = parseTerm();
      v = op === "+" ? num(v) + num(r) : num(v) - num(r);
    }
    return v;
  };
  const parseTerm = (): Val => {
    let v = parseUnary();
    while (peek() && ["*", "/", "//", "%"].includes(peek().v) && peek().t === "op") {
      const op = eat().v;
      const r = num(parseUnary());
      const l = num(v);
      v = op === "*" ? l * r : op === "/" ? l / r : op === "//" ? Math.floor(l / r) : l % r;
    }
    return v;
  };
  const parseUnary = (): Val => {
    const t = peek();
    if (t && t.t === "op" && (t.v === "-" || t.v === "+")) {
      eat();
      const v = num(parseUnary());
      return t.v === "-" ? -v : v;
    }
    return parsePower();
  };
  const parsePower = (): Val => {
    const base = parseAtom();
    if (peek() && peek().v === "**") {
      eat();
      return Math.pow(num(base), num(parseUnary()));
    }
    return base;
  };
  const parseList = (close: string): Val[] => {
    const out: Val[] = [];
    if (peek() && peek().v === close) {
      eat();
      return out;
    }
    for (;;) {
      out.push(parseExpr());
      if (peek() && peek().v === ",") {
        eat();
        if (peek() && peek().v === close) {
          eat();
          return out;
        }
        continue;
      }
      eat(close);
      return out;
    }
  };
  const parseAtom = (): Val => {
    const t = peek();
    if (!t) throw new Error("unexpected end of expression");
    if (t.t === "n") {
      eat();
      return parseFloat(t.v);
    }
    if (t.t === "id") {
      eat();
      const name = t.v.replace(/^(np|numpy|math|qiskit)\./, "");
      if (peek() && peek().v === "(") {
        eat();
        const args = parseList(")");
        const f = FUNCS[name];
        if (!f) throw new Error(`unknown function ${name}()`);
        return f(args);
      }
      if (name in env) return env[name];
      if (name === "pi") return Math.PI;
      if (name === "tau") return 2 * Math.PI;
      if (name === "True") return 1;
      if (name === "False") return 0;
      throw new Error(`unknown name '${name}'`);
    }
    if (t.v === "(") {
      eat();
      const v = parseExpr();
      eat(")");
      return v;
    }
    if (t.v === "[") {
      eat();
      return parseList("]").map(num);
    }
    throw new Error(`unexpected '${t.v}'`);
  };

  const result = parseExpr();
  if (pos < toks.length) throw new Error(`unexpected '${toks[pos].v}'`);
  return result;
}

function splitTopLevel(s: string, sep = ","): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim() !== "") out.push(cur);
  return out.map((x) => x.trim());
}

/* ------------------------------------------------------------------ gate table */

/** name -> [numQubits, numParams] */
const ARITY: Record<string, [number, number]> = {
  id: [1, 0], x: [1, 0], y: [1, 0], z: [1, 0], h: [1, 0], s: [1, 0], sdg: [1, 0], t: [1, 0], tdg: [1, 0],
  sx: [1, 0], sxdg: [1, 0], rx: [1, 1], ry: [1, 1], rz: [1, 1], p: [1, 1], u2: [1, 2], u3: [1, 3],
  cx: [2, 0], cy: [2, 0], cz: [2, 0], ch: [2, 0], cp: [2, 1], crx: [2, 1], cry: [2, 1], crz: [2, 1],
  swap: [2, 0], iswap: [2, 0], rxx: [2, 1], ryy: [2, 1], rzz: [2, 1], rzx: [2, 1],
  ccx: [3, 0], ccz: [3, 0], cswap: [3, 0],
};

const ALIAS: Record<string, string> = {
  cnot: "cx", u1: "p", phase: "p", cu1: "cp", cphase: "cp", u: "u3", toffoli: "ccx", fredkin: "cswap",
  i: "id", sxdg: "sxdg",
};

const CTRL: Record<string, [string, number]> = {
  cx: ["x", 1], cy: ["y", 1], cz: ["z", 1], ch: ["h", 1], cp: ["p", 1], crx: ["rx", 1], cry: ["ry", 1],
  crz: ["rz", 1], ccx: ["x", 2], ccz: ["z", 2],
};

const PROT: Record<string, string> = { rxx: "XX", ryy: "YY", rzz: "ZZ", rzx: "ZX" };

const IGNORED_METHODS = new Set([
  "draw", "barrier", "name", "global_phase", "save_statevector", "assign_parameters", "decompose", "depth",
  "size", "count_ops", "copy", "inverse", "delay", "snapshot",
]);

const CLIFFORD_FIXED = new Set(["id", "x", "y", "z", "h", "s", "sdg", "sx", "sxdg", "cx", "cy", "cz", "swap", "iswap"]);
const ROTATIONS_Q = new Set(["rx", "ry", "rz", "p", "rxx", "ryy", "rzz", "rzx"]);

function isNonClifford(op: GateOp): boolean {
  if (CLIFFORD_FIXED.has(op.name)) return false;
  if (ROTATIONS_Q.has(op.name)) {
    const k = op.params[0] / (Math.PI / 2);
    return Math.abs(k - Math.round(k)) > 1e-9;
  }
  return true; // t, tdg, ch, cp, crx.., u2/u3, ccx, ccz, cswap
}

/* ------------------------------------------------------------------ circuit parsing */

interface Builder {
  declared: number;
  ops: GateOp[];
  measured: Set<number>;
  warnings: string[];
  errors: string[];
}

function newBuilder(): Builder {
  return { declared: 0, ops: [], measured: new Set(), warnings: [], errors: [] };
}

function pushWarning(b: Builder, msg: string) {
  if (b.warnings.length < 12 && !b.warnings.includes(msg)) b.warnings.push(msg);
}

function addGate(b: Builder, rawName: string, params: number[], qubits: number[]): void {
  const lower = rawName.toLowerCase();
  const name = ALIAS[lower] ?? lower;
  const ar = ARITY[name];
  if (!ar) {
    pushWarning(b, `Unsupported gate "${rawName}" was skipped — the simulated circuit differs from yours.`);
    return;
  }
  if (qubits.length !== ar[0]) {
    b.errors.push(`Gate ${rawName} expects ${ar[0]} qubit(s), got ${qubits.length}.`);
    return;
  }
  if (params.length < ar[1]) {
    b.errors.push(`Gate ${rawName} expects ${ar[1]} parameter(s), got ${params.length}.`);
    return;
  }
  for (const q of qubits) {
    if (!Number.isInteger(q) || q < 0) {
      b.errors.push(`Invalid qubit index ${q} in ${rawName}.`);
      return;
    }
  }
  if (new Set(qubits).size !== qubits.length) {
    b.errors.push(`Gate ${rawName} acts on duplicate qubits.`);
    return;
  }
  if (b.ops.length >= 6000) {
    b.errors.push("Circuit too large for the in-browser simulator (6000 gate limit).");
    return;
  }
  b.ops.push({ name, qubits, params: params.slice(0, ar[1]) });
}

function parsePython(src: string, b: Builder): void {
  const lines = src
    .split("\n")
    .map((raw) => {
      const hash = raw.indexOf("#");
      const text = (hash >= 0 ? raw.slice(0, hash) : raw).replace(/\s+$/, "");
      const indent = (text.match(/^[ \t]*/)?.[0] ?? "").replace(/\t/g, "    ").length;
      return { text: text.trim(), indent };
    })
    .filter((l) => l.text !== "");

  const blockEnd = (i: number, end: number) => {
    let j = i + 1;
    while (j < end && lines[j].indent > lines[i].indent) j++;
    return j;
  };

  const statement = (t: string, env: Record<string, Val>) => {
    if (/^(import|from)\s/.test(t) || /^print\(/.test(t)) return;
    let m = t.match(/^(\w+)\s*=\s*(.+)$/);
    if (m && !/^\w+\.\w+\(/.test(t)) {
      const rhs = m[2];
      const qc = rhs.match(/^(?:qiskit\.)?QuantumCircuit\((.*)\)$/);
      if (qc) {
        const first = splitTopLevel(qc[1])[0] ?? "";
        try {
          b.declared = Math.max(b.declared, num(evalExpr(first, env)));
        } catch {
          const digits = first.match(/\d+/);
          if (digits) b.declared = Math.max(b.declared, parseInt(digits[0], 10));
          else pushWarning(b, "Could not infer qubit count from QuantumCircuit(...).");
        }
        return;
      }
      try {
        env[m[1]] = evalExpr(rhs, env);
      } catch {
        /* non-numeric assignment (e.g. backend = ...) — ignore */
      }
      return;
    }
    m = t.match(/^(\w+)\.(\w+)\((.*)\)$/);
    if (!m) {
      pushWarning(b, `Unrecognised line skipped: "${t.slice(0, 48)}"`);
      return;
    }
    const method = m[2];
    const args = splitTopLevel(m[3]).filter((a) => !/^\w+\s*=[^=]/.test(a));
    const vals = (): Val[] => args.map((a) => evalExpr(a, env));
    if (method === "measure_all") {
      b.measured.add(-1); // sentinel: all
      return;
    }
    if (method === "measure") {
      const [q] = vals();
      for (const x of Array.isArray(q) ? q : [q]) b.measured.add(x);
      return;
    }
    if (IGNORED_METHODS.has(method)) return;
    const name = ALIAS[method.toLowerCase()] ?? method.toLowerCase();
    const ar = ARITY[name];
    if (!ar) {
      pushWarning(b, `Unsupported call ".${method}(...)" skipped.`);
      return;
    }
    const v = vals();
    const params = v.slice(0, ar[1]).map(num);
    const qargs = v.slice(ar[1], ar[1] + ar[0]);
    const len = Math.max(1, ...qargs.map((x) => (Array.isArray(x) ? x.length : 1)));
    for (let k = 0; k < len; k++) {
      const qs = qargs.map((x) => (Array.isArray(x) ? x[x.length === 1 ? 0 : k] : x));
      addGate(b, method, params, qs);
    }
  };

  const runBlock = (start: number, end: number, env: Record<string, Val>) => {
    let i = start;
    while (i < end) {
      const L = lines[i];
      const t = L.text;
      const f = t.match(/^for\s+(\w+)\s+in\s+(.+):$/);
      if (f) {
        const j = blockEnd(i, end);
        let iter: Val;
        try {
          iter = evalExpr(f[2], env);
        } catch (e) {
          b.errors.push(`Cannot evaluate loop "${t}": ${(e as Error).message}`);
          i = j;
          continue;
        }
        const arr = Array.isArray(iter) ? iter : [iter];
        for (const v of arr) {
          runBlock(i + 1, j, { ...env, [f[1]]: v });
          if (b.errors.length) return;
        }
        i = j;
        continue;
      }
      if (/^(if|elif|else|while|def|class|with|try|except|return)\b/.test(t)) {
        pushWarning(b, `Control flow "${t.split(/\s|:|\(/)[0]}" is not supported — block skipped.`);
        i = t.endsWith(":") ? blockEnd(i, end) : i + 1;
        continue;
      }
      try {
        statement(t, env);
      } catch (e) {
        pushWarning(b, `Line skipped ("${t.slice(0, 40)}"): ${(e as Error).message}`);
      }
      if (b.errors.length) return;
      i++;
    }
  };

  runBlock(0, lines.length, {});
}

function parseQasm(src: string, b: Builder): void {
  let text = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  if (/\bgate\s+\w+/.test(text)) {
    pushWarning(b, "Custom `gate` definitions are not supported and were dropped — decompose to basis gates first.");
    text = text.replace(/\bgate\s+[^{]*\{[^}]*\}/g, "");
  }
  const regs = new Map<string, { off: number; size: number }>();
  let total = 0;
  const resolve = (ref: string): number[] => {
    const r = ref.trim();
    let m = r.match(/^(\w+)\s*\[\s*(\d+)\s*\]$/);
    if (m) {
      const reg = regs.get(m[1]);
      if (!reg) throw new Error(`unknown register ${m[1]}`);
      return [reg.off + parseInt(m[2], 10)];
    }
    m = r.match(/^(\w+)$/);
    if (m) {
      const reg = regs.get(m[1]);
      if (!reg) throw new Error(`unknown register ${m[1]}`);
      return Array.from({ length: reg.size }, (_, i) => reg.off + i);
    }
    throw new Error(`cannot parse operand "${r}"`);
  };

  for (const st of text.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      if (/^(OPENQASM|include)\b/i.test(st)) continue;
      let m = st.match(/^qreg\s+(\w+)\s*\[(\d+)\]$/);
      if (m) {
        regs.set(m[1], { off: total, size: +m[2] });
        total += +m[2];
        continue;
      }
      m = st.match(/^qubit\s*\[(\d+)\]\s+(\w+)$/) ?? null;
      if (m) {
        regs.set(m[2], { off: total, size: +m[1] });
        total += +m[1];
        continue;
      }
      m = st.match(/^qubit\s+(\w+)$/);
      if (m) {
        regs.set(m[1], { off: total, size: 1 });
        total += 1;
        continue;
      }
      m = st.match(/^measure\s+(.+?)\s*->\s*(.+)$/) ?? st.match(/^(?:bit(?:\[\d+\])?\s+)?[\w[\]]+\s*=\s*measure\s+(.+)$/);
      if (m) {
        for (const q of resolve(m[1])) b.measured.add(q);
        continue;
      }
      if (/^(creg|bit)\b/.test(st) || /^barrier\b/.test(st) || /^(input|output)\b/.test(st)) continue;
      if (/^(reset|if|for|while|def)\b/.test(st)) {
        pushWarning(b, `Statement "${st.split(/\s/)[0]}" is not supported and was skipped.`);
        continue;
      }
      m = st.match(/^([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?\s+(.+)$/);
      if (!m) {
        pushWarning(b, `Unrecognised statement skipped: "${st.slice(0, 48)}"`);
        continue;
      }
      const params = m[2] ? splitTopLevel(m[2]).map((p) => num(evalExpr(p))) : [];
      const operands = splitTopLevel(m[3]).map(resolve);
      const len = Math.max(...operands.map((o) => o.length));
      for (let k = 0; k < len; k++) addGate(b, m[1], params, operands.map((o) => (o.length === 1 ? o[0] : o[k])));
    } catch (e) {
      pushWarning(b, `Statement skipped ("${st.slice(0, 40)}"): ${(e as Error).message}`);
    }
  }
  b.declared = Math.max(b.declared, total);
}

/** ASAP layering used for depth and for the SVG drawer. Returns column index per op. */
export function layerOps(ops: GateOp[], nQubits: number): { cols: number[]; depth: number } {
  const next = new Array(nQubits).fill(0);
  const cols: number[] = [];
  let depth = 0;
  for (const op of ops) {
    const lo = Math.min(...op.qubits);
    const hi = Math.max(...op.qubits);
    let c = 0;
    for (let q = lo; q <= hi; q++) c = Math.max(c, next[q]);
    for (let q = lo; q <= hi; q++) next[q] = c + 1;
    cols.push(c);
    depth = Math.max(depth, c + 1);
  }
  return { cols, depth };
}

const EMPTY_STATS: CircuitStats = {
  nQubits: 0, nMeasured: 0, depth: 0, gates: 0, oneQ: 0, twoQ: 0, multiQ: 0, tGates: 0, nonClifford: 0, counts: {},
};

export function parseCircuit(source: string): ParsedCircuit {
  const src = source.trim();
  if (!src) {
    return {
      ok: false, format: "empty", nQubits: 0, ops: [], measured: [], explicitMeasure: false,
      warnings: [], errors: ["Paste a Qiskit (Python) or OpenQASM circuit to begin."], stats: EMPTY_STATS,
    };
  }
  const isQasm = /OPENQASM|^\s*qreg\s|^\s*qubit[\s[]/im.test(src);
  const b = newBuilder();
  try {
    if (isQasm) parseQasm(src, b);
    else parsePython(src, b);
  } catch (e) {
    b.errors.push((e as Error).message);
  }

  let maxIdx = -1;
  for (const op of b.ops) for (const q of op.qubits) maxIdx = Math.max(maxIdx, q);
  const measuredIdx = [...b.measured].filter((q) => q >= 0);
  for (const q of measuredIdx) maxIdx = Math.max(maxIdx, q);
  const nQubits = Math.max(b.declared, maxIdx + 1);

  if (nQubits === 0 && !b.errors.length) b.errors.push("No qubits found — declare a QuantumCircuit(n) / qreg.");
  if (nQubits > MAX_QUBITS) b.errors.push(`${nQubits} qubits exceeds the in-browser limit of ${MAX_QUBITS}.`);
  const all = b.measured.has(-1) || b.measured.size === 0;
  const measured = all ? Array.from({ length: nQubits }, (_, i) => i) : [...new Set(measuredIdx)].sort((a, c) => a - c);
  if (measured.length > MAX_MEASURED) b.errors.push(`${measured.length} measured qubits exceeds the limit of ${MAX_MEASURED} (dense 2ⁿ mitigation).`);
  if (!b.ops.length && !b.errors.length) b.warnings.push("Circuit contains no recognised gates.");

  const { depth } = layerOps(b.ops, Math.max(nQubits, 1));
  const counts: Record<string, number> = {};
  let oneQ = 0, twoQ = 0, multiQ = 0, tGates = 0, nonClifford = 0;
  for (const op of b.ops) {
    counts[op.name] = (counts[op.name] ?? 0) + 1;
    if (op.qubits.length === 1) oneQ++;
    else if (op.qubits.length === 2) twoQ++;
    else multiQ++;
    if (op.name === "t" || op.name === "tdg") tGates++;
    if (isNonClifford(op)) nonClifford++;
  }
  return {
    ok: b.errors.length === 0 && nQubits > 0,
    format: isQasm ? "qasm" : "qiskit",
    nQubits,
    ops: b.ops,
    measured,
    explicitMeasure: !all,
    warnings: b.warnings,
    errors: b.errors,
    stats: { nQubits, nMeasured: measured.length, depth, gates: b.ops.length, oneQ, twoQ, multiQ, tGates, nonClifford, counts },
  };
}

/* ------------------------------------------------------------------ statevector kernels */

type Mat1 = number[]; // [ar,ai, br,bi, cr,ci, dr,di] for [[a,b],[c,d]]

function mat1(name: string, p: number[]): Mat1 {
  const r = Math.SQRT1_2;
  switch (name) {
    case "id": return [1, 0, 0, 0, 0, 0, 1, 0];
    case "x": return [0, 0, 1, 0, 1, 0, 0, 0];
    case "y": return [0, 0, 0, -1, 0, 1, 0, 0];
    case "z": return [1, 0, 0, 0, 0, 0, -1, 0];
    case "h": return [r, 0, r, 0, r, 0, -r, 0];
    case "s": return [1, 0, 0, 0, 0, 0, 0, 1];
    case "sdg": return [1, 0, 0, 0, 0, 0, 0, -1];
    case "t": return [1, 0, 0, 0, 0, 0, Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)];
    case "tdg": return [1, 0, 0, 0, 0, 0, Math.cos(Math.PI / 4), -Math.sin(Math.PI / 4)];
    case "sx": return [0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5];
    case "sxdg": return [0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5];
    case "rx": { const c = Math.cos(p[0] / 2), s = Math.sin(p[0] / 2); return [c, 0, 0, -s, 0, -s, c, 0]; }
    case "ry": { const c = Math.cos(p[0] / 2), s = Math.sin(p[0] / 2); return [c, 0, -s, 0, s, 0, c, 0]; }
    case "rz": { const c = Math.cos(p[0] / 2), s = Math.sin(p[0] / 2); return [c, -s, 0, 0, 0, 0, c, s]; }
    case "p": return [1, 0, 0, 0, 0, 0, Math.cos(p[0]), Math.sin(p[0])];
    case "u2": return mat1("u3", [Math.PI / 2, p[0], p[1]]);
    case "u3": {
      const [th, ph, la] = p;
      const c = Math.cos(th / 2), s = Math.sin(th / 2);
      return [c, 0, -Math.cos(la) * s, -Math.sin(la) * s, Math.cos(ph) * s, Math.sin(ph) * s, Math.cos(ph + la) * c, Math.sin(ph + la) * c];
    }
    default: throw new Error(`no 1q matrix for ${name}`);
  }
}

function applyMat1(re: Float64Array, im: Float64Array, q: number, m: Mat1, ctrlMask = 0): void {
  const dim = re.length;
  const tb = 1 << q;
  const [ar, ai, br, bi, cr, ci, dr, di] = m;
  for (let i = 0; i < dim; i++) {
    if (i & tb) continue;
    if ((i & ctrlMask) !== ctrlMask) continue;
    const j = i | tb;
    const xr = re[i], xi = im[i], yr = re[j], yi = im[j];
    re[i] = ar * xr - ai * xi + br * yr - bi * yi;
    im[i] = ar * xi + ai * xr + br * yi + bi * yr;
    re[j] = cr * xr - ci * xi + dr * yr - di * yi;
    im[j] = cr * xi + ci * xr + dr * yi + di * yr;
  }
}

function applySwap(re: Float64Array, im: Float64Array, a: number, b: number, ctrlMask = 0): void {
  const ma = 1 << a, mb = 1 << b;
  for (let i = 0; i < re.length; i++) {
    if ((i & ma) && !(i & mb) && (i & ctrlMask) === ctrlMask) {
      const j = (i ^ ma) | mb;
      const tr = re[i], ti = im[i];
      re[i] = re[j]; im[i] = im[j];
      re[j] = tr; im[j] = ti;
    }
  }
}

const PHASE_R = [1, 0, -1, 0];
const PHASE_I = [0, 1, 0, -1];

/** exp(-i θ/2 · P) for a Pauli string P given as chars on qubits. */
function applyPauliRot(re: Float64Array, im: Float64Array, qs: number[], chars: string, theta: number): void {
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
  let flip = 0;
  for (let k = 0; k < qs.length; k++) if (chars[k] === "X" || chars[k] === "Y") flip |= 1 << qs[k];
  const phase = (st: number): number => {
    let pw = 0;
    for (let k = 0; k < qs.length; k++) {
      const bit = (st >> qs[k]) & 1;
      if (chars[k] === "Y") pw += bit ? 3 : 1;
      else if (chars[k] === "Z" && bit) pw += 2;
    }
    return pw & 3;
  };
  const dim = re.length;
  if (flip === 0) {
    for (let st = 0; st < dim; st++) {
      const pw = phase(st);
      const fr = c + s * PHASE_I[pw], fi = -s * PHASE_R[pw];
      const xr = re[st], xi = im[st];
      re[st] = fr * xr - fi * xi;
      im[st] = fr * xi + fi * xr;
    }
    return;
  }
  for (let st = 0; st < dim; st++) {
    const s2 = st ^ flip;
    if (s2 < st) continue;
    const p1 = phase(st), p2 = phase(s2);
    const a1r = s * PHASE_I[p1], a1i = -s * PHASE_R[p1]; // contribution st -> s2
    const a2r = s * PHASE_I[p2], a2i = -s * PHASE_R[p2]; // contribution s2 -> st
    const xr = re[st], xi = im[st], yr = re[s2], yi = im[s2];
    re[s2] = c * yr + a1r * xr - a1i * xi;
    im[s2] = c * yi + a1r * xi + a1i * xr;
    re[st] = c * xr + a2r * yr - a2i * yi;
    im[st] = c * xi + a2r * yi + a2i * yr;
  }
}

function applyOp(re: Float64Array, im: Float64Array, op: GateOp): void {
  const n = op.name;
  const ctrl = CTRL[n];
  if (ctrl) {
    const [base, nc] = ctrl;
    let mask = 0;
    for (let k = 0; k < nc; k++) mask |= 1 << op.qubits[k];
    applyMat1(re, im, op.qubits[nc], mat1(base, op.params), mask);
    return;
  }
  if (n === "swap") return applySwap(re, im, op.qubits[0], op.qubits[1]);
  if (n === "cswap") return applySwap(re, im, op.qubits[1], op.qubits[2], 1 << op.qubits[0]);
  if (n === "iswap") {
    applyPauliRot(re, im, op.qubits, "XX", -Math.PI / 2);
    applyPauliRot(re, im, op.qubits, "YY", -Math.PI / 2);
    return;
  }
  if (PROT[n]) return applyPauliRot(re, im, op.qubits, PROT[n], op.params[0]);
  applyMat1(re, im, op.qubits[0], mat1(n, op.params));
}

const PAULI_MATS: Mat1[] = [
  mat1("id", []), mat1("x", []), mat1("y", []), mat1("z", []),
];

/* ------------------------------------------------------------------ noise model (Pauli-trajectory form of depolarising) */

interface Site {
  op: number;
  qs: number[];
  p: number; // probability that a non-identity Pauli is inserted
}

/**
 * Aer's depolarizing_error(λ, k): ρ → (1-λ)ρ + λ·I/d. Equivalent Pauli-channel form: a non-identity
 * Pauli (uniform over the 4^k-1 choices) is applied with probability λ(1 - 1/4^k).
 */
function buildSites(ops: GateOp[], cfg: NoiseConfig): Site[] {
  const p1 = Math.min(1, cfg.oneQ * 0.75);
  const p2 = Math.min(1, cfg.twoQ * (15 / 16));
  const sites: Site[] = [];
  ops.forEach((op, idx) => {
    const q = op.qubits;
    if (q.length === 1) sites.push({ op: idx, qs: q, p: p1 });
    else if (q.length === 2) sites.push({ op: idx, qs: q, p: p2 });
    else {
      // 3-qubit gates decompose to ~6 CX on hardware: model as 6 two-qubit error sites
      const pairs = [[q[0], q[2]], [q[1], q[2]], [q[0], q[1]], [q[0], q[2]], [q[1], q[2]], [q[0], q[1]]];
      for (const pr of pairs) sites.push({ op: idx, qs: pr, p: p2 });
    }
  });
  return sites;
}

type Fault = [op: number, qubit: number, pauli: number];

function sampleFaults(sites: Site[], rng: Rng): Fault[] {
  const out: Fault[] = [];
  for (const s of sites) {
    if (rng() < s.p) {
      const k = s.qs.length;
      const code = 1 + Math.floor(rng() * (4 ** k - 1));
      for (let i = 0; i < k; i++) {
        const pa = (code >> (2 * i)) & 3;
        if (pa) out.push([s.op, s.qs[i], pa]);
      }
    }
  }
  return out;
}

function measuredIndexMap(nQubits: number, measured: number[]): Uint32Array | null {
  if (measured.length === nQubits) return null;
  const map = new Uint32Array(1 << nQubits);
  for (let s = 0; s < map.length; s++) {
    let o = 0;
    for (let k = 0; k < measured.length; k++) o |= ((s >> measured[k]) & 1) << k;
    map[s] = o;
  }
  return map;
}

function runStatevector(circ: ParsedCircuit, faults: Fault[], map: Uint32Array | null): Float64Array {
  const dim = 1 << circ.nQubits;
  const re = new Float64Array(dim);
  const im = new Float64Array(dim);
  re[0] = 1;
  let f = 0;
  for (let i = 0; i < circ.ops.length; i++) {
    applyOp(re, im, circ.ops[i]);
    while (f < faults.length && faults[f][0] === i) {
      applyMat1(re, im, faults[f][1], PAULI_MATS[faults[f][2]]);
      f++;
    }
  }
  const mdim = 1 << circ.measured.length;
  const probs = new Float64Array(mdim);
  for (let s = 0; s < dim; s++) probs[map ? map[s] : s] += re[s] * re[s] + im[s] * im[s];
  return probs;
}

class CdfSampler {
  cdf: Float64Array;
  constructor(probs: Float64Array) {
    this.cdf = new Float64Array(probs.length);
    let acc = 0;
    for (let i = 0; i < probs.length; i++) {
      acc += probs[i];
      this.cdf[i] = acc;
    }
    for (let i = 0; i < probs.length; i++) this.cdf[i] /= acc || 1;
  }
  sample(rng: Rng): number {
    const u = rng();
    let lo = 0, hi = this.cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

export function simulateIdeal(circ: ParsedCircuit): Float64Array {
  return runStatevector(circ, [], measuredIndexMap(circ.nQubits, circ.measured));
}

const TRAJECTORY_BUDGET = 3.5e7; // amplitude-updates

/** Sample `cfg.shots` noisy outcomes (gate noise via Pauli trajectories, then readout flips). */
export function sampleNoisyCounts(circ: ParsedCircuit, cfg: NoiseConfig, idealProbs: Float64Array, rng: Rng): { counts: Float64Array; faultFreeFrac: number } {
  const m = circ.measured.length;
  const mdim = 1 << m;
  const map = measuredIndexMap(circ.nQubits, circ.measured);
  const sites = buildSites(circ.ops, cfg);
  const idealSampler = new CdfSampler(idealProbs);
  const outcomes = new Uint32Array(cfg.shots);
  const patterns: Fault[][] = [];
  let free = 0;
  let nOut = 0;
  for (let s = 0; s < cfg.shots; s++) {
    const f = sampleFaults(sites, rng);
    if (f.length === 0) {
      outcomes[nOut++] = idealSampler.sample(rng);
      free++;
    } else patterns.push(f);
  }
  const nErr = patterns.length;
  if (nErr > 0) {
    const cost = Math.max(1, circ.ops.length) * (1 << circ.nQubits);
    const K = Math.max(1, Math.min(nErr, Math.floor(TRAJECTORY_BUDGET / cost)));
    for (let j = 0; j < K; j++) {
      const sampler = new CdfSampler(runStatevector(circ, patterns[j], map));
      const reps = Math.floor(nErr / K) + (j < nErr % K ? 1 : 0);
      for (let r = 0; r < reps; r++) outcomes[nOut++] = sampler.sample(rng);
    }
  }
  const counts = new Float64Array(mdim);
  const e = cfg.readout;
  for (let s = 0; s < nOut; s++) {
    let o = outcomes[s];
    if (e > 0) for (let q = 0; q < m; q++) if (rng() < e) o ^= 1 << q;
    counts[o]++;
  }
  return { counts, faultFreeFrac: free / Math.max(1, cfg.shots) };
}

/** Probability that a shot is free of any gate fault: Π(1-p_site). */
export function faultFreeProbability(circ: ParsedCircuit, cfg: NoiseConfig): number {
  let p = 1;
  for (const s of buildSites(circ.ops, cfg)) p *= 1 - s.p;
  return p;
}

/* ------------------------------------------------------------------ conservation laws */

export function popcount(x: number): number {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

export function isValidState(idx: number, law: Law): boolean {
  switch (law.kind) {
    case "weight": return popcount(idx) === law.k;
    case "parity-even": return popcount(idx) % 2 === 0;
    case "parity-odd": return popcount(idx) % 2 === 1;
    default: return true;
  }
}

export function buildValidStateMask(m: number, law: Law): Uint8Array {
  const dim = 1 << m;
  const mask = new Uint8Array(dim);
  for (let s = 0; s < dim; s++) mask[s] = isValidState(s, law) ? 1 : 0;
  return mask;
}

export function lawLabel(law: Law): string {
  switch (law.kind) {
    case "weight": return `Hamming weight = ${law.k}`;
    case "parity-even": return "even parity";
    case "parity-odd": return "odd parity";
    default: return "no conservation law";
  }
}

/** Inspect an ideal distribution and suggest the strongest law it satisfies exactly. */
export function suggestLaw(idealProbs: Float64Array): Law | null {
  const support: number[] = [];
  idealProbs.forEach((p, i) => {
    if (p > 1e-9) support.push(i);
  });
  if (!support.length) return null;
  const w0 = popcount(support[0]);
  if (support.every((s) => popcount(s) === w0)) {
    return support.length === idealProbs.length ? null : { kind: "weight", k: w0 };
  }
  const par = w0 % 2;
  if (support.every((s) => popcount(s) % 2 === par)) return { kind: par === 0 ? "parity-even" : "parity-odd", k: 0 };
  return null;
}

export function bitstring(idx: number, m: number): string {
  return idx.toString(2).padStart(m, "0");
}

/* ------------------------------------------------------------------ readout calibration / confusion matrix */

/** Per-qubit confusion: a = P(obs 1 | true 0), b = P(obs 0 | true 1). M[t][o] = P(o|t). */
export interface QubitCal {
  a: number;
  b: number;
}

function binomial(n: number, p: number, rng: Rng): number {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng() < p) k++;
  return k;
}

/**
 * Measure the confusion matrix by sampling calibration shots (|0…0⟩ and |1…1⟩ preparations give every
 * per-qubit 2x2 block). Preparing |1⟩ uses a noisy X gate: a depolarising error flips the bit with
 * probability λ/2, exactly as it would in the Aer calibration circuits.
 */
export function calibrateReadout(m: number, cfg: NoiseConfig, rng: Rng): QubitCal[] {
  const e = cfg.readout;
  const flipPrep = Math.min(1, cfg.oneQ) * 0.5;
  const bTrue = e * (1 - flipPrep) + (1 - e) * flipPrep;
  const shots = Math.max(1, cfg.shots);
  const cal: QubitCal[] = [];
  for (let q = 0; q < m; q++) {
    cal.push({ a: binomial(shots, e, rng) / shots, b: binomial(shots, bTrue, rng) / shots });
  }
  return cal;
}

/** Dense confusion matrix M[t*dim+o] — only for display / tiny circuits (reference parity). */
export function denseConfusion(cal: QubitCal[]): Float64Array {
  const m = cal.length;
  const dim = 1 << m;
  const M = new Float64Array(dim * dim);
  for (let t = 0; t < dim; t++) {
    for (let o = 0; o < dim; o++) {
      let v = 1;
      for (let q = 0; q < m; q++) {
        const tb = (t >> q) & 1, ob = (o >> q) & 1;
        v *= tb === 0 ? (ob ? cal[q].a : 1 - cal[q].a) : ob ? 1 - cal[q].b : cal[q].b;
      }
      M[t * dim + o] = v;
    }
  }
  return M;
}

/** Linear readout inversion (tensored), clip negatives, renormalise. p_obs = Mᵀ p_true. */
export function mitigateReadout(pObs: Float64Array, cal: QubitCal[]): Float64Array {
  const m = cal.length;
  const dim = pObs.length;
  const x = Float64Array.from(pObs);
  for (let q = 0; q < m; q++) {
    const { a, b } = cal[q];
    const det = 1 - a - b;
    if (Math.abs(det) < 1e-6) continue;
    const bit = 1 << q;
    for (let i = 0; i < dim; i++) {
      if (i & bit) continue;
      const x0 = x[i], x1 = x[i | bit];
      x[i] = ((1 - b) * x0 - b * x1) / det;
      x[i | bit] = (-a * x0 + (1 - a) * x1) / det;
    }
  }
  let total = 0;
  for (let i = 0; i < dim; i++) {
    if (x[i] < 0) x[i] = 0;
    total += x[i];
  }
  if (total > 0) for (let i = 0; i < dim; i++) x[i] /= total;
  return x;
}

/* ------------------------------------------------------------------ hard post-selection (v1) + adaptive soft reweighting (v2) */

export function hardPostselect(pObs: Float64Array, mask: Uint8Array): { kept: number; dist: Float64Array } {
  const dist = new Float64Array(pObs.length);
  let kept = 0;
  for (let i = 0; i < pObs.length; i++) {
    if (mask[i]) {
      kept += pObs[i];
      dist[i] = pObs[i];
    }
  }
  if (kept > 0) for (let i = 0; i < dist.length; i++) dist[i] /= kept;
  return { kept, dist };
}

/**
 * Per-outcome soft weight  w(o) = Σ_{t valid} P(true=t | obs=o),   P(t|o) ∝ M[t,o]·prior(t).
 * Only computed for observed outcomes (pObs[o] > 0).
 *
 * Also returns the posterior-reassigned ("unfolded") distribution  u(t) = Σ_o p_obs(o)·P(t|o),
 * i.e. every shot is spread over the true states it could have come from.
 */
export function softWeights(cal: QubitCal[], mask: Uint8Array, prior: Float64Array, pObs: Float64Array): { w: Float64Array; unfolded: Float64Array } {
  const m = cal.length;
  const dim = 1 << m;
  const w = new Float64Array(dim);
  const unfolded = new Float64Array(dim);
  const vec = new Float64Array(dim);
  for (let o = 0; o < dim; o++) {
    if (pObs[o] <= 0) continue;
    vec[0] = 1;
    let size = 1;
    for (let q = 0; q < m; q++) {
      const ob = (o >> q) & 1;
      const f0 = ob ? cal[q].a : 1 - cal[q].a;
      const f1 = ob ? 1 - cal[q].b : cal[q].b;
      for (let t = 0; t < size; t++) {
        vec[t + size] = vec[t] * f1;
        vec[t] *= f0;
      }
      size <<= 1;
    }
    let num = 0, den = 0;
    for (let t = 0; t < dim; t++) {
      const v = vec[t] * prior[t];
      vec[t] = v;
      den += v;
      if (mask[t]) num += v;
    }
    w[o] = den > 0 ? num / den : 0;
    if (den > 0) for (let t = 0; t < dim; t++) unfolded[t] += (pObs[o] * vec[t]) / den;
  }
  return { w, unfolded };
}

export function makePrior(mode: PriorMode, pMit: Float64Array): Float64Array {
  const dim = pMit.length;
  if (mode === "uniform") return new Float64Array(dim).fill(1 / dim);
  const eps = 1e-3;
  const prior = new Float64Array(dim);
  for (let i = 0; i < dim; i++) prior[i] = (1 - eps) * pMit[i] + eps / dim;
  return prior;
}

/* ------------------------------------------------------------------ metrics */

export function tvd(p: Float64Array, q: Float64Array): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]);
  return s / 2;
}

export type MetricKind = "valid" | "q0";

export function metricOf(kind: MetricKind, p: Float64Array, mask: Uint8Array): number {
  let s = 0;
  if (kind === "valid") {
    for (let i = 0; i < p.length; i++) if (mask[i]) s += p[i];
  } else {
    for (let i = 0; i < p.length; i++) if (!(i & 1)) s += p[i];
  }
  return s;
}

function normalise(counts: Float64Array): Float64Array {
  let t = 0;
  for (const c of counts) t += c;
  const p = new Float64Array(counts.length);
  if (t > 0) for (let i = 0; i < p.length; i++) p[i] = counts[i] / t;
  return p;
}

function bootstrapSE(p: Float64Array, shots: number, B: number, rng: Rng, fns: Array<(q: Float64Array) => number>): number[] {
  const sampler = new CdfSampler(p);
  const sums = fns.map(() => 0);
  const sq = fns.map(() => 0);
  for (let b = 0; b < B; b++) {
    const c = new Float64Array(p.length);
    for (let s = 0; s < shots; s++) c[sampler.sample(rng)]++;
    const q = normalise(c);
    fns.forEach((fn, i) => {
      const v = fn(q);
      sums[i] += v;
      sq[i] += v * v;
    });
  }
  return fns.map((_, i) => {
    const mean = sums[i] / B;
    return Math.sqrt(Math.max(0, sq[i] / B - mean * mean));
  });
}

/* ------------------------------------------------------------------ experiment */

export interface MethodStat {
  value: number; // headline metric (see Experiment.metricLabel)
  se: number;
  tvd: number; // distance of the method's output distribution to ideal
  retention: number; // fraction of shots that carry full weight
  dist: Float64Array;
}

export interface ExperimentOptions {
  seed: number;
  prior: PriorMode;
  bootstrap?: number; // default 30
  runtime?: boolean; // run the independent "Runtime defaults" baseline (default true)
}

export interface Experiment {
  m: number;
  dim: number;
  law: Law;
  metricKind: MetricKind;
  metricLabel: string;
  mask: Uint8Array;
  idealProbs: Float64Array;
  counts: Float64Array;
  pObs: Float64Array;
  pMit: Float64Array;
  cal: QubitCal[];
  weights: Float64Array;
  prior: PriorMode;
  raw: MethodStat;
  readout: MethodStat;
  runtime: MethodStat;
  hardPS: MethodStat;
  adaptive: MethodStat;
  ideal: MethodStat;
  hardKept: number; // fraction of shots surviving hard post-selection
  softMass: number; // Σ p_obs·w  (mean per-shot weight)
  ess: number; // effective sample size of the soft weights
  noEffect: boolean; // law === none → adaptive reduces to readout-only
  faultFreeProb: number; // analytic P(no gate fault in a shot)
  suggestedLaw: Law | null;
  lawIdealValid: number; // P(ideal output satisfies the chosen law)
  config: NoiseConfig;
}

/** Mirrors the Python AdaptiveResult dataclass. */
export interface AdaptiveResult {
  raw_correct_frac: number;
  hard_ps_correct_frac: number;
  hard_ps_retention: number;
  adaptive_estimate: number;
  readout_mitigated_correct_frac: number;
  ideal_correct_frac: number;
  shots_used_pct: number;
}

export function toAdaptiveResult(e: Experiment): AdaptiveResult {
  return {
    raw_correct_frac: e.raw.value,
    hard_ps_correct_frac: e.hardPS.value,
    hard_ps_retention: e.hardKept,
    adaptive_estimate: e.adaptive.value,
    readout_mitigated_correct_frac: e.readout.value,
    ideal_correct_frac: e.ideal.value,
    shots_used_pct: 100,
  };
}

export function runExperiment(circ: ParsedCircuit, cfg: NoiseConfig, law: Law, opts: ExperimentOptions): Experiment {
  if (!circ.ok) throw new Error(circ.errors[0] ?? "Circuit did not parse.");
  const rng = mulberry32(opts.seed);
  const m = circ.measured.length;
  const dim = 1 << m;
  const mask = buildValidStateMask(m, law);
  const metricKind: MetricKind = law.kind === "none" ? "q0" : "valid";
  const metricLabel = metricKind === "valid" ? `P(${lawLabel(law)})` : "P(qubit 0 reads 0)";
  const B = opts.bootstrap ?? 30;
  const shotsForBoot = Math.min(cfg.shots, 4096);

  const idealProbs = simulateIdeal(circ);
  const idealValue = metricOf(metricKind, idealProbs, mask);
  const ideal: MethodStat = { value: idealValue, se: 0, tvd: 0, retention: 1, dist: idealProbs };

  // ---- noisy run + calibration
  const { counts } = sampleNoisyCounts(circ, cfg, idealProbs, rng);
  const pObs = normalise(counts);
  const cal = calibrateReadout(m, cfg, rng);
  const pMit = mitigateReadout(pObs, cal);

  // ---- raw
  const raw: MethodStat = { value: metricOf(metricKind, pObs, mask), se: 0, tvd: tvd(pObs, idealProbs), retention: 1, dist: pObs };

  // ---- readout-only
  const readout: MethodStat = { value: metricOf(metricKind, pMit, mask), se: 0, tvd: tvd(pMit, idealProbs), retention: 1, dist: pMit };

  // ---- v1 hard post-selection  (reference: hard_ps_correct_frac == raw valid fraction, retention = kept)
  const hp = law.kind === "none" ? { kept: 1, dist: pObs } : hardPostselect(pObs, mask);
  const hardPS: MethodStat = {
    value: raw.value,
    se: 0,
    tvd: hp.kept > 0 ? tvd(hp.dist, idealProbs) : 1,
    retention: hp.kept,
    dist: hp.dist,
  };

  // ---- v2 adaptive soft reweighting
  const noEffect = law.kind === "none";
  const prior = makePrior(opts.prior, pMit);
  const sw = noEffect ? null : softWeights(cal, mask, prior, pObs);
  const weights = sw ? sw.w : new Float64Array(dim).fill(1);
  // posterior-reassigned distribution restricted to the conserved subspace
  const softDist = new Float64Array(dim);
  let softDistMass = 0;
  if (sw) {
    for (let i = 0; i < dim; i++) if (mask[i]) { softDist[i] = sw.unfolded[i]; softDistMass += sw.unfolded[i]; }
    if (softDistMass > 0) for (let i = 0; i < dim; i++) softDist[i] /= softDistMass;
  }
  let softMass = 0;
  let sumW = 0, sumW2 = 0;
  for (let i = 0; i < dim; i++) {
    softMass += pObs[i] * weights[i];
    sumW += counts[i] * weights[i];
    sumW2 += counts[i] * weights[i] * weights[i];
  }
  const ess = sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;
  const adaptive: MethodStat = {
    value: noEffect ? readout.value : softMass,
    se: 0,
    tvd: noEffect ? readout.tvd : softDistMass > 0 ? tvd(softDist, idealProbs) : 1,
    retention: 1,
    dist: noEffect ? pMit : softDist,
  };

  // ---- Runtime defaults approximation: independent run + readout mitigation (as scorecard.py)
  let runtime: MethodStat = readout;
  let rtP = pObs;
  let rtCal = cal;
  if (opts.runtime !== false) {
    const rng2 = mulberry32((opts.seed * 7919 + 104729) >>> 0);
    const rt = sampleNoisyCounts(circ, cfg, idealProbs, rng2);
    rtP = normalise(rt.counts);
    rtCal = calibrateReadout(m, cfg, rng2);
    const rtMit = mitigateReadout(rtP, rtCal);
    runtime = { value: metricOf(metricKind, rtMit, mask), se: 0, tvd: tvd(rtMit, idealProbs), retention: 1, dist: rtMit };
  }

  // ---- error bars (bootstrap over shot noise, calibration held fixed)
  if (B > 0) {
    const [seRaw, seRo, seAd] = bootstrapSE(pObs, shotsForBoot, B, rng, [
      (q) => metricOf(metricKind, q, mask),
      (q) => metricOf(metricKind, mitigateReadout(q, cal), mask),
      (q) => (noEffect ? metricOf(metricKind, mitigateReadout(q, cal), mask) : q.reduce((acc, v, i) => acc + v * weights[i], 0)),
    ]);
    const scale = Math.sqrt(shotsForBoot / Math.max(1, cfg.shots));
    raw.se = seRaw * scale;
    hardPS.se = seRaw * scale;
    readout.se = seRo * scale;
    adaptive.se = seAd * scale;
    if (opts.runtime !== false) {
      const [seRt] = bootstrapSE(rtP, shotsForBoot, B, rng, [(q) => metricOf(metricKind, mitigateReadout(q, rtCal), mask)]);
      runtime.se = seRt * scale;
    } else runtime = { ...readout };
  }

  // ideal distribution diagnostics
  let lawIdealValid = 0;
  for (let i = 0; i < dim; i++) if (mask[i]) lawIdealValid += idealProbs[i];

  return {
    m, dim, law, metricKind, metricLabel, mask, idealProbs, counts, pObs, pMit, cal, weights, prior: opts.prior,
    raw, readout, runtime, hardPS, adaptive, ideal,
    hardKept: hp.kept, softMass, ess, noEffect,
    faultFreeProb: faultFreeProbability(circ, cfg),
    suggestedLaw: suggestLaw(idealProbs),
    lawIdealValid,
    config: cfg,
  };
}

/** |raw-ideal| → |method-ideal| improvement, in %. null when raw is already at ideal. */
export function gapClosed(raw: number, method: number, ideal: number): number | null {
  const g0 = Math.abs(raw - ideal);
  if (g0 < 1e-9) return null;
  return ((g0 - Math.abs(method - ideal)) / g0) * 100;
}

export function gapClosedTvd(rawTvd: number, methodTvd: number): number | null {
  if (rawTvd < 1e-9) return null;
  return ((rawTvd - methodTvd) / rawTvd) * 100;
}
