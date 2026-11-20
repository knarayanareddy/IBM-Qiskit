import { useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { CircuitDiagram } from "../CircuitDiagram";
import { Callout, Histogram, Legend, Slider, Stat, Pct } from "../ui";
import {
  COLORS, PRESETS, bitstring, countOps, mulberry32, noisyDist, presetCounts, presetIdeal, sample, simulate, type GateName, type Op,
} from "../../lib/quantum";

/* ============================================================ Lesson 1 */

export function QubitDemo() {
  const [p0, setP0] = useState(0.5);
  const [tally, setTally] = useState<[number, number]>([0, 0]);
  const [last, setLast] = useState<0 | 1 | null>(null);
  const measure = (times: number) => {
    let a = 0, b = 0, l: 0 | 1 = 0;
    for (let i = 0; i < times; i++) {
      if (Math.random() < p0) { a++; l = 0; } else { b++; l = 1; }
    }
    setTally(([x, y]) => [x + a, y + b]);
    setLast(l);
  };
  const total = tally[0] + tally[1];
  const pick = (v: number) => { setP0(v); setTally([0, 0]); setLast(null); };
  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-36 w-36">
          <div
            className={cn("absolute inset-0 rounded-full border-4 border-slate-600 shadow-xl", last === null && "animate-[coinspin_2.4s_linear_infinite]")}
            style={{ background: `conic-gradient(#22d3ee 0 ${p0 * 360}deg, #a78bfa ${p0 * 360}deg 360deg)` }}
          />
          <div className="absolute inset-5 flex items-center justify-center rounded-full bg-slate-900/90 text-5xl font-black text-white">
            {last === null ? "?" : last}
          </div>
        </div>
        <div className="text-center text-xs text-slate-400">
          {last === null ? "Spinning… (not measured yet)" : "Caught! A measurement always gives plain 0 or 1."}
        </div>
        <div className="flex gap-2">
          <button onClick={() => measure(1)} className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-cyan-300">Measure ×1</button>
          <button onClick={() => measure(100)} className="rounded-lg border border-cyan-400 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/10">×100</button>
        </div>
        <button onClick={() => pick(p0)} className="text-xs text-slate-500 underline hover:text-slate-300">reset tally</button>
      </div>
      <div className="space-y-4">
        <Slider label="Chance of reading 0" value={p0} onChange={pick} min={0} max={1} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} hint="This is the 'recipe' your gates created. 50% = perfect superposition." />
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => pick(1)} className="rounded-full border border-slate-600 px-3 py-1 hover:border-cyan-400">definitely 0 (start state)</button>
          <button onClick={() => pick(0)} className="rounded-full border border-slate-600 px-3 py-1 hover:border-cyan-400">definitely 1 (after X)</button>
          <button onClick={() => pick(0.5)} className="rounded-full border border-slate-600 px-3 py-1 hover:border-cyan-400">50/50 (after H)</button>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <div className="mb-2 flex items-baseline justify-between text-xs text-slate-400">
            <span>Counts after {total} measurements ("shots")</span>
            <span>true recipe: {Math.round(p0 * 100)}% / {Math.round((1 - p0) * 100)}%</span>
          </div>
          {[0, 1].map((b) => (
            <div key={b} className="mb-2 flex items-center gap-3">
              <span className="w-6 font-mono text-slate-300">{b}</span>
              <div className="h-6 flex-1 overflow-hidden rounded bg-slate-800">
                <div className="h-full rounded transition-all duration-300" style={{ width: `${total ? (tally[b] / total) * 100 : 0}%`, background: b === 0 ? "#22d3ee" : "#a78bfa" }} />
              </div>
              <span className="w-24 text-right font-mono text-xs text-slate-300">{tally[b]} ({total ? Math.round((tally[b] / total) * 100) : 0}%)</span>
            </div>
          ))}
          <div className="text-xs text-slate-500">Press "×1" a few times — it's random! Press "×100" — now the bars settle near the recipe.</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Lesson 2 */

const GATE_CARDS: { g: string; name: string; analogy: string; detail: string; color: string }[] = [
  { g: "X", name: "NOT / flip", analogy: "🪙 Turn the coin over", detail: "0 becomes 1, 1 becomes 0. The only gate that behaves exactly like a classical bit.", color: "#fb7185" },
  { g: "H", name: "Hadamard", analogy: "🌀 Give the coin a spin", detail: "From a definite 0 it makes a perfect 50/50 blend. Almost every circuit starts with H.", color: "#22d3ee" },
  { g: "CX", name: "CNOT", analogy: "🔗 'If A is 1, flip B'", detail: "Two coins, linked. With H first, it makes a Bell pair: they always agree, but each alone is random.", color: "#e2e8f0" },
  { g: "T", name: "T gate", analogy: "🎭 A secret twist", detail: "Changes a hidden property (phase) you can't see by measuring directly. It's the 'hard' non-Clifford gate — why the repo's decision helper asks about it.", color: "#fbbf24" },
];

export function GatesDemo() {
  const [n, setN] = useState(2);
  const [ops, setOps] = useState<Op[]>([{ g: "h", q: 0 }, { g: "cx", c: 0, q: 1 }]);
  const [q, setQ] = useState(0);
  const [c, setC] = useState(0);
  const [flipped, setFlipped] = useState<string | null>(null);
  const probs = useMemo(() => simulate(n, ops), [n, ops]);
  const add = (g: GateName) => {
    if (g === "cx") {
      if (c === q) return;
      setOps([...ops, { g, c, q }]);
    } else setOps([...ops, { g, q }]);
  };
  const setSize = (m: number) => {
    setN(m);
    setOps([]);
    setQ(0);
    setC(0);
  };
  const nonzero = Array.from(probs).map((p, i) => [p, i] as const).filter(([p]) => p > 1e-6);
  let msg = "Add gates and watch the probabilities change.";
  if (nonzero.length === 1) msg = `Deterministic: always ${bitstring(nonzero[0][1], n)} — no randomness left.`;
  else if (nonzero.length === 1 << n && probs.every((p) => Math.abs(p - 1 / (1 << n)) < 1e-6)) msg = "Every outcome equally likely — all qubits are 50/50 and unrelated.";
  else if (nonzero.length === 2 && nonzero.every(([p]) => Math.abs(p - 0.5) < 1e-6) && Math.abs(nonzero[0][1] ^ nonzero[1][1]) > 1 && (nonzero[0][1] ^ nonzero[1][1]) === (1 << n) - 1)
    msg = `Entangled! Only ${bitstring(nonzero[0][1], n)} and ${bitstring(nonzero[1][1], n)} appear: the qubits always agree, yet each one alone is a coin flip.`;
  const { oneQ, twoQ } = countOps(ops);
  const sel = "rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100";
  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-4">
        {GATE_CARDS.map((g) => (
          <button key={g.g} onClick={() => setFlipped(flipped === g.g ? null : g.g)} className="min-h-[104px] rounded-xl border bg-slate-800/50 p-3 text-left transition hover:bg-slate-800" style={{ borderColor: flipped === g.g ? g.color : "#334155" }}>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-black" style={{ color: g.color }}>{g.g}</span>
              <span className="text-[11px] text-slate-500">{g.name}</span>
            </div>
            <div className="mt-1 text-sm text-slate-200">{g.analogy}</div>
            {flipped === g.g && <div className="mt-1.5 text-xs leading-snug text-slate-400">{g.detail}</div>}
            {flipped !== g.g && <div className="mt-1.5 text-[11px] text-slate-600">tap to reveal ›</div>}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className="font-semibold text-slate-100">🔧 Build your own</span>
          <span>qubits:</span>
          {[2, 3].map((m) => (
            <button key={m} onClick={() => setSize(m)} className={cn("rounded-md border px-2.5 py-0.5", n === m ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-600")}>{m}</button>
          ))}
          <span className="ml-auto flex flex-wrap gap-2 text-xs">
            <button onClick={() => { setN(2); setOps([{ g: "h", q: 0 }, { g: "cx", c: 0, q: 1 }]); }} className="rounded-full border border-slate-600 px-2.5 py-0.5 hover:border-cyan-400">preset: Bell</button>
            <button onClick={() => { setN(3); setOps([{ g: "h", q: 0 }, { g: "cx", c: 0, q: 1 }, { g: "cx", c: 1, q: 2 }]); }} className="rounded-full border border-slate-600 px-2.5 py-0.5 hover:border-cyan-400">preset: GHZ</button>
            <button onClick={() => { setN(2); setOps([{ g: "h", q: 0 }, { g: "t", q: 0 }]); }} className="rounded-full border border-slate-600 px-2.5 py-0.5 hover:border-cyan-400">preset: H then T (T is invisible!)</button>
          </span>
        </div>
        <CircuitDiagram n={n} ops={ops} />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label className="text-slate-400">target qubit</label>
          <select value={q} onChange={(e) => setQ(+e.target.value)} className={sel}>{Array.from({ length: n }, (_, i) => <option key={i} value={i}>q{i}</option>)}</select>
          {(["h", "x", "z", "t"] as GateName[]).map((g) => (
            <button key={g} onClick={() => add(g)} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 font-mono font-bold text-slate-100 hover:border-cyan-400">+ {g.toUpperCase()}</button>
          ))}
          <span className="mx-1 text-slate-600">|</span>
          <label className="text-slate-400">control</label>
          <select value={c} onChange={(e) => setC(+e.target.value)} className={sel}>{Array.from({ length: n }, (_, i) => <option key={i} value={i}>q{i}</option>)}</select>
          <button onClick={() => add("cx")} disabled={c === q} className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1 font-mono font-bold text-slate-100 hover:border-cyan-400 disabled:opacity-40">+ CX</button>
          <button onClick={() => setOps(ops.slice(0, -1))} className="ml-auto rounded-md border border-slate-700 px-2.5 py-1 text-slate-400 hover:text-slate-100">↶ undo</button>
          <button onClick={() => setOps([])} className="rounded-md border border-slate-700 px-2.5 py-1 text-slate-400 hover:text-slate-100">clear</button>
        </div>
        <div className="mt-4">
          <Histogram n={n} series={[{ label: "ideal (no noise)", color: COLORS.ideal, probs }]} height={170} maxY={1} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Callout tone="emerald" icon="💡"><span>{msg}</span></Callout>
          <div className="text-xs text-slate-500">{oneQ} one-qubit gates · {twoQ} two-qubit gates</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Lesson 3 */

export function ReadCircuitDemo() {
  const [pid, setPid] = useState<"bell" | "ghz">("bell");
  const preset = PRESETS.find((p) => p.id === pid)!;
  const ops = preset.ops!;
  const [sel, setSel] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const probs = useMemo(() => presetIdeal(preset), [preset]);
  const codeLines = preset.qiskit.split("\n");
  // map selection -> highlighted code lines
  const lineFor = (s: number | null): number[] => {
    if (s === null) return [];
    if (s === -1) return [0];
    if (s === -2) return [codeLines.length - 1];
    if (preset.id === "ghz" && s >= 1) return [3, 4]; // the loop covers both cx lines
    return [s + 1];
  };
  const hl = lineFor(sel);
  const explain = (s: number | null) => {
    if (s === null) return { t: "👆 Click any part of the diagram", d: "Wires, gates, the ⊕ symbol, the meter boxes. The code on the right lights up to match." };
    if (s === -1) return { t: "Wires = qubits, time flows →", d: `Each horizontal line is one qubit, starting at 0. We have ${preset.n}. q0 is the TOP wire — but in the results, q0 is the RIGHT-most character (Qiskit's convention). That trips up everyone once.` };
    if (s === -2) return { t: "Meter box = measurement", d: `Every qubit is measured at the end, turning it into a plain bit. Results are written as strings like ${bitstring(preset.id === "bell" ? 3 : 7, preset.n)} (q${preset.n - 1} … q0). Run it 4096 times ("shots") and count.` };
    const o = ops[s];
    if (o.g === "h") return { t: `H on q${o.q} — the spin`, d: "Turns a definite 0 into a 50/50 blend. This creates the randomness that the rest of the circuit will 'copy' into other qubits." };
    return { t: `● ──⊕  CX: control q${o.c}, target q${o.q}`, d: `The filled dot is the CONTROL, the ⊕ is the TARGET. If q${o.c} is 1, flip q${o.q}. After H + CX the qubits are entangled: they always agree.` };
  };
  const e = explain(sel);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        {(["bell", "ghz"] as const).map((id) => (
          <button key={id} onClick={() => { setPid(id); setSel(null); setReveal(false); }} className={cn("rounded-md border px-3 py-1", pid === id ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-600 text-slate-300")}>{id === "bell" ? "Bell (2 qubits)" : "GHZ (3 qubits)"}</button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          <CircuitDiagram n={preset.n} ops={ops} measure selected={sel} onSelect={(i) => setSel(i === sel ? null : i)} />
          <div className="min-h-[96px] rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-3">
            <div className="text-sm font-semibold text-cyan-200">{e.t}</div>
            <div className="mt-1 text-sm text-slate-300">{e.d}</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
          <div className="border-b border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-400">Qiskit (Python) — same circuit</div>
          <pre className="p-3 font-mono text-[12.5px] leading-relaxed">
            {codeLines.map((l, i) => (
              <div key={i} className={cn("rounded px-1 transition", hl.includes(i) ? "bg-cyan-400/20 text-cyan-100" : "text-emerald-200/80")}>{l || " "}</div>
            ))}
          </pre>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm text-slate-200">🔮 <b>Predict first:</b> which bitstrings will appear? Then reveal.</div>
          <button onClick={() => setReveal(!reveal)} className="rounded-md border border-cyan-400 px-3 py-1 text-sm text-cyan-200 hover:bg-cyan-400/10">{reveal ? "hide" : "reveal answer"}</button>
        </div>
        {reveal ? (
          <>
            <Histogram n={preset.n} series={[{ label: "ideal", color: COLORS.ideal, probs }]} height={150} maxY={1} />
            <div className="text-xs text-slate-400">{preset.id === "bell" ? "Only 00 and 11. Never 01 or 10 — that's the entanglement signature." : "Only 000 and 111. Note 111 has three 1s (odd count!) — remember this for Lesson 6."}</div>
          </>
        ) : (
          <div className="py-6 text-center text-sm text-slate-500">(hidden)</div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ Lesson 4 */

export function NoiseDemo() {
  const [pid, setPid] = useState("bell");
  const [gate, setGate] = useState(0.03);
  const [readout, setReadout] = useState(0.05);
  const [decay, setDecay] = useState(0);
  const [shots, setShots] = useState(2048);
  const [seed, setSeed] = useState(1);
  const preset = PRESETS.find((p) => p.id === pid)!;
  const ideal = useMemo(() => presetIdeal(preset), [preset]);
  const counts = presetCounts(preset);
  const noisy = useMemo(() => {
    const exact = noisyDist(ideal, preset.n, counts, { oneQ: gate / 3, twoQ: gate, readout, decay });
    return sample(exact, shots, mulberry32(seed * 7919 + shots));
  }, [ideal, preset.n, counts, gate, readout, decay, shots, seed]);
  let wrong = 0;
  for (let i = 0; i < noisy.length; i++) if (ideal[i] < 1e-9) wrong += noisy[i];
  const f = Math.pow(1 - gate / 3, counts.oneQ) * Math.pow(1 - gate, counts.twoQ);
  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-slate-500">Circuit</div>
          <div className="flex flex-wrap gap-1.5">
            {["bell", "ghz", "vqe"].map((id) => (
              <button key={id} onClick={() => setPid(id)} className={cn("rounded-md border px-2.5 py-1 text-xs", pid === id ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-600 text-slate-300")}>
                {PRESETS.find((p) => p.id === id)!.label.split(" (")[0]}
              </button>
            ))}
          </div>
        </div>
        <Slider label="🤏 Gate error (shaky hand)" value={gate} onChange={setGate} min={0} max={0.1} step={0.002} fmt={(v) => Pct(v)} color="#fb7185" hint="chance a 2-qubit gate misfires (1-qubit gates: a third of this)" />
        <Slider label="🖍️ Readout error (smudged scoreboard)" value={readout} onChange={setReadout} min={0} max={0.15} step={0.0025} fmt={(v) => Pct(v)} color="#fbbf24" hint="chance a qubit is misread at the end" />
        <Slider label="🍦 Decoherence (melting ice cream)" value={decay} onChange={setDecay} min={0} max={0.25} step={0.005} fmt={(v) => Pct(v)} color="#22d3ee" hint="chance a '1' quietly drifts back to '0'" />
        <Slider label="Shots" value={shots} onChange={setShots} min={256} max={16384} step={256} fmt={(v) => v.toLocaleString()} />
        <button onClick={() => setSeed(seed + 1)} className="w-full rounded-lg border border-slate-600 py-1.5 text-sm text-slate-300 hover:border-cyan-400">🎲 re-run the shots</button>
      </div>
      <div className="space-y-3">
        <Histogram n={preset.n} series={[{ label: "ideal", color: COLORS.ideal, probs: ideal }, { label: "noisy (what hardware gives)", color: COLORS.noisy, probs: noisy }]} height={220} invalid={undefined} />
        <Legend items={[{ label: "ideal", color: COLORS.ideal }, { label: "noisy run", color: COLORS.noisy }]} />
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Impossible outcomes" value={Pct(wrong)} sub="shots that should never happen" color={wrong > 0.02 ? COLORS.noisy : COLORS.ideal} />
          <Stat label="Gate-fault-free chance" value={Pct(f, 0)} sub={`${counts.oneQ + counts.twoQ} gates in this circuit`} />
          <Stat label="Gates" value={`${counts.oneQ}+${counts.twoQ}`} sub="1q + 2q" />
        </div>
        <div className="text-xs text-slate-500">Drag the sliders to 0 — green and red match (apart from small shot-to-shot wobble). Switch to VQE: more gates → more red, even at the same error rate.</div>
      </div>
    </div>
  );
}
