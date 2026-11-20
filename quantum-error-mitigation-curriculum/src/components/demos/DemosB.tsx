import { useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { Callout, Histogram, Legend, Slider, Stat, Pct } from "../ui";
import {
  COLORS, PRESETS, bitstring, hardPostselect, invertReadout, isValid, lawLabel, mulberry32, noisyDist, popcount, presetCounts, presetIdeal,
  sample, sampleShots, softReweight, tvd, validMask, type Law,
} from "../../lib/quantum";

/* ============================================================ Lesson 5 */

const STRATS = [
  {
    id: "nothing", icon: "📢", name: "Do nothing", analogy: "Shouting across a noisy train platform",
    what: "Run the circuit, histogram the counts, believe them.",
    cost: "1× — cheapest", avail: "Always", verdict: "Your baseline row in the scorecard: 'Raw (unmitigated)'. Every other number is judged against it.",
  },
  {
    id: "mitigate", icon: "🎧", name: "Error mitigation", analogy: "Noise-cancelling headphones",
    what: "The noise still happens. You measure how it behaves (calibration), then clean up the answer afterwards — in software or with extra runs.",
    cost: "1×–100×+ more shots/circuits", avail: "Today, on real IBM hardware", verdict: "This is the hackathon track. Gains are real but partial, and cost grows with circuit depth (see the repo's 🧱 Overhead Wall page).",
  },
  {
    id: "correct", icon: "🏛️", name: "Error correction", analogy: "Building a soundproof studio",
    what: "Spread one logical qubit over many physical qubits and fix errors while the circuit runs. Errors are removed, not just estimated away.",
    cost: "100s–1000s of physical qubits per logical qubit", avail: "Early demos only — not for this hackathon", verdict: "Don't promise it. Judges like people who know the difference.",
  },
];

export function MitigationDemo() {
  const [gate, setGate] = useState(0.0);
  const [readout, setReadout] = useState(0.08);
  const [shots, setShots] = useState(4096);
  const [seed, setSeed] = useState(3);
  const [strat, setStrat] = useState("mitigate");
  const preset = PRESETS[0];
  const ideal = useMemo(() => presetIdeal(preset), [preset]);
  const counts = presetCounts(preset);
  const { noisy, mit } = useMemo(() => {
    const exact = noisyDist(ideal, preset.n, counts, { oneQ: gate / 3, twoQ: gate, readout });
    const s = sample(exact, shots, mulberry32(seed * 104729));
    return { noisy: s, mit: invertReadout(s, preset.n, readout) };
  }, [ideal, preset.n, counts, gate, readout, shots, seed]);
  const tRaw = tvd(noisy, ideal), tMit = tvd(mit, ideal);
  const st = STRATS.find((s) => s.id === strat)!;
  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3">
        {STRATS.map((s) => (
          <button key={s.id} onClick={() => setStrat(s.id)} className={cn("rounded-xl border p-3 text-left transition", strat === s.id ? "border-violet-400 bg-violet-400/10" : "border-slate-700 bg-slate-800/40 hover:border-slate-500")}>
            <div className="text-2xl">{s.icon}</div>
            <div className="text-sm font-semibold text-slate-100">{s.name}</div>
            <div className="text-xs text-slate-400">{s.analogy}</div>
          </button>
        ))}
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-sm sm:grid-cols-3">
        <div><div className="text-[11px] uppercase text-slate-500">What it does</div><div className="text-slate-200">{st.what}</div></div>
        <div><div className="text-[11px] uppercase text-slate-500">Cost / availability</div><div className="text-slate-200">{st.cost}<br /><span className="text-slate-400">{st.avail}</span></div></div>
        <div><div className="text-[11px] uppercase text-slate-500">For you</div><div className="text-slate-200">{st.verdict}</div></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <div className="text-sm font-semibold text-slate-100">🎧 Try readout mitigation on a Bell pair</div>
          <Slider label="Readout error" value={readout} onChange={setReadout} min={0} max={0.15} step={0.0025} fmt={(v) => Pct(v)} color={COLORS.readout} />
          <Slider label="Gate error" value={gate} onChange={setGate} min={0} max={0.08} step={0.002} fmt={(v) => Pct(v)} color={COLORS.noisy} hint="mitigation of readout can't cure this one" />
          <Slider label="Shots" value={shots} onChange={setShots} min={256} max={16384} step={256} fmt={(v) => v.toLocaleString()} />
          <button onClick={() => setSeed(seed + 1)} className="w-full rounded-lg border border-slate-600 py-1.5 text-sm text-slate-300 hover:border-violet-400">🎲 re-sample</button>
        </div>
        <div className="space-y-3">
          <Histogram n={2} series={[{ label: "ideal", color: COLORS.ideal, probs: ideal }, { label: "raw", color: COLORS.noisy, probs: noisy }, { label: "mitigated", color: COLORS.mitigated, probs: mit }]} height={200} maxY={0.6} />
          <Legend items={[{ label: "ideal", color: COLORS.ideal }, { label: "raw (noisy)", color: COLORS.noisy }, { label: "mitigated (calibrated readout inverted)", color: COLORS.mitigated }]} />
          <div className="grid grid-cols-3 gap-3">
            <Stat label="TVD raw → ideal" value={tRaw.toFixed(3)} color={COLORS.noisy} sub="smaller is better" />
            <Stat label="TVD mitigated → ideal" value={tMit.toFixed(3)} color={COLORS.mitigated} sub={tMit < tRaw ? "improved ✓" : "no gain"} />
            <Stat label="Gap closed" value={tRaw > 1e-9 ? `${Math.round(((tRaw - tMit) / tRaw) * 100)}%` : "—"} sub="(raw − mit) / raw" color={COLORS.mitigated} />
          </div>
          <Callout tone="violet" icon="🧪"><span>Set gate error to 0 and readout to ~10%: purple snaps back to green — readout mitigation is excellent at the one thing it targets. Now raise gate error: red wrong-outcomes (01, 10) return and the purple bars can't remove them. <b>Mitigation fixes what it models.</b></span></Callout>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Lesson 6 */

const LAWS: { id: string; label: string; law: Law; story: string }[] = [
  { id: "even", label: "Even parity", law: { kind: "parity-even", k: 0 }, story: "The number of 1s must be even. (Bell state: 00 and 11 obey.)" },
  { id: "odd", label: "Odd parity", law: { kind: "parity-odd", k: 0 }, story: "The number of 1s must be odd." },
  { id: "w2", label: "Hamming weight = 2", law: { kind: "weight", k: 2 }, story: "Exactly two 1s. Think: a bus that always carries exactly 2 passengers (fixed excitations in chemistry)." },
];

export function LawDemo() {
  const [lid, setLid] = useState("even");
  const [x, setX] = useState(0b0011);
  const law = LAWS.find((l) => l.id === lid)!;
  const n = 4;
  const valid = isValid(x, law.law);
  const flips1 = Array.from({ length: n }, (_, k) => x ^ (1 << k));
  const det1 = flips1.filter((y) => !isValid(y, law.law)).length;
  const pairs: number[] = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pairs.push(x ^ (1 << a) ^ (1 << b));
  const det2 = pairs.filter((y) => !isValid(y, law.law)).length;
  const nValid = Array.from({ length: 16 }, (_, i) => i).filter((i) => isValid(i, law.law)).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {LAWS.map((l) => (
          <button key={l.id} onClick={() => setLid(l.id)} className={cn("rounded-lg border px-3 py-1.5 text-sm", lid === l.id ? "border-emerald-400 bg-emerald-400/15 text-emerald-100" : "border-slate-600 text-slate-300 hover:border-slate-400")}>{l.label}</button>
        ))}
        <span className="self-center text-xs text-slate-400">{law.story}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">All 16 possible 4-bit outputs — green = allowed, red = forbidden</div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 16 }, (_, i) => {
              const ok = isValid(i, law.law);
              return (
                <button key={i} onClick={() => setX(i)} className={cn("rounded-lg border py-2 font-mono text-sm transition", ok ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100" : "border-rose-400/20 bg-rose-400/5 text-rose-300/50 line-through", x === i && "ring-2 ring-cyan-300")}>
                  {bitstring(i, n)}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-slate-400">{nValid} of 16 outputs are legal. Noise sprays shots over all 16 — the other {16 - nValid} are <i>provably wrong</i>.</div>
        </div>
        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <div className="text-sm font-semibold text-slate-100">🔬 Inspect one result — click bits to flip them</div>
          <div className="flex justify-center gap-2">
            {Array.from({ length: n }, (_, k) => n - 1 - k).map((k) => (
              <button key={k} onClick={() => setX(x ^ (1 << k))} className={cn("h-14 w-12 rounded-lg border-2 font-mono text-2xl font-black transition", x & (1 << k) ? "border-violet-400 bg-violet-400/20 text-violet-100" : "border-slate-600 bg-slate-800 text-slate-300")}>
                {(x >> k) & 1}
                <div className="text-[9px] font-normal text-slate-500">q{k}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <Stat label="# of 1s" value={popcount(x)} />
            <Stat label="parity" value={popcount(x) % 2 === 0 ? "even" : "odd"} />
            <Stat label="verdict" value={valid ? "legal ✓" : "illegal ✕"} color={valid ? COLORS.ideal : COLORS.noisy} />
          </div>
          {valid ? (
            <div className="space-y-1 text-sm text-slate-300">
              <div>If noise flips <b>one</b> bit, the law notices <b className="text-emerald-300">{det1} of {n}</b> times.</div>
              <div>If noise flips <b>two</b> bits, it notices <b className={det2 === pairs.length ? "text-emerald-300" : "text-amber-300"}>{det2} of {pairs.length}</b> times.</div>
              {det2 < pairs.length && <div className="text-xs text-amber-300/90">⚠ Two flips can cancel out and sneak through. Laws catch <i>many</i> errors, not all.</div>}
            </div>
          ) : (
            <div className="text-sm text-rose-200">This outcome is forbidden. Either noise hit this shot — or your circuit doesn't actually obey this law (check the ideal run first!).</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Lesson 7 */

export function PostSelectDemo() {
  const [pid, setPid] = useState("bell");
  const [gate, setGate] = useState(0.03);
  const [readout, setReadout] = useState(0.06);
  const [shots, setShots] = useState(2048);
  const [seed, setSeed] = useState(1);
  const [view, setView] = useState<"hard" | "soft">("hard");
  const preset = PRESETS.find((p) => p.id === pid)!;
  const n = preset.n;
  const ideal = useMemo(() => presetIdeal(preset), [preset]);
  const counts = presetCounts(preset);
  const mask = useMemo(() => validMask(n, preset.law), [n, preset]);
  const hasLaw = preset.law.kind !== "none";

  const r = useMemo(() => {
    const exact = noisyDist(ideal, n, counts, { oneQ: gate / 3, twoQ: gate, readout });
    const raw = sample(exact, shots, mulberry32(seed * 31 + shots));
    const hard = hasLaw ? hardPostselect(raw, mask) : { kept: 1, dist: raw };
    const soft = hasLaw ? softReweight(raw, n, readout, mask, hard.dist) : raw;
    const dots = sampleShots(exact, 400, mulberry32(seed * 977 + 5));
    let idealValid = 0;
    for (let i = 0; i < ideal.length; i++) if (mask[i]) idealValid += ideal[i];
    return { raw, hard, soft, dots, idealValid };
  }, [ideal, n, counts, gate, readout, shots, seed, mask, hasLaw]);

  const tRaw = tvd(r.raw, ideal), tHard = tvd(r.hard.dist, ideal), tSoft = tvd(r.soft, ideal);
  const badDots = r.dots.filter((d) => !mask[d]).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => setPid(p.id)} className={cn("rounded-lg border px-3 py-1.5 text-sm", pid === p.id ? "border-violet-400 bg-violet-400/15 text-violet-100" : "border-slate-600 text-slate-300 hover:border-slate-400")}>{p.label.split(" (")[0]}</button>
        ))}
        <span className="text-xs text-slate-400">law: <b className="text-emerald-300">{lawLabel(preset.law)}</b></span>
      </div>
      {!preset.lawHolds && (
        <Callout tone="amber" title="Trap: the law doesn't match this circuit" icon="⚠️">
          <span>The ideal GHZ output includes 111, which has odd parity — so even-parity post-selection discards <b>{Pct(1 - r.idealValid, 0)} of perfectly good shots even at zero noise</b>. Always run the ideal circuit first. The repo's Lab shows a warning for exactly this.</span>
        </Callout>
      )}
      {!hasLaw && <Callout tone="slate" icon="ℹ️" title="No law, nothing to exploit"><span>Hard and soft reweighting both collapse to the raw data. For circuits like this, reach for readout mitigation or ZNE instead.</span></Callout>}
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <Slider label="Gate error" value={gate} onChange={setGate} min={0} max={0.1} step={0.002} fmt={(v) => Pct(v)} color={COLORS.noisy} />
          <Slider label="Readout error" value={readout} onChange={setReadout} min={0} max={0.15} step={0.0025} fmt={(v) => Pct(v)} color={COLORS.readout} />
          <Slider label="Shots" value={shots} onChange={setShots} min={256} max={8192} step={256} fmt={(v) => v.toLocaleString()} />
          <button onClick={() => setSeed(seed + 1)} className="w-full rounded-lg border border-slate-600 py-1.5 text-sm text-slate-300 hover:border-violet-400">🎲 re-sample</button>
        </div>
        <div className="space-y-3">
          <Histogram n={n} series={[
            { label: "ideal", color: COLORS.ideal, probs: ideal },
            { label: "raw", color: COLORS.noisy, probs: r.raw },
            { label: "v1 hard post-selection", color: COLORS.mitigated, probs: r.hard.dist },
            { label: "v2 soft reweighting", color: COLORS.soft, probs: r.soft },
          ]} height={210} invalid={hasLaw ? mask.map((m) => (m ? 0 : 1)) as unknown as Uint8Array : undefined} />
          <Legend items={[{ label: "ideal", color: COLORS.ideal }, { label: "raw", color: COLORS.noisy }, { label: "v1 hard post-select", color: COLORS.mitigated }, { label: "v2 soft reweight", color: COLORS.soft }]} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-100">🗳️ 400 ballots (shots) — what happens to the bad ones?</div>
          <div className="flex gap-1 text-xs">
            <button onClick={() => setView("hard")} className={cn("rounded-md border px-2.5 py-1", view === "hard" ? "border-violet-400 bg-violet-400/15 text-violet-100" : "border-slate-600 text-slate-300")}>v1 · throw away</button>
            <button onClick={() => setView("soft")} className={cn("rounded-md border px-2.5 py-1", view === "soft" ? "border-pink-400 bg-pink-400/15 text-pink-100" : "border-slate-600 text-slate-300")}>v2 · re-assign</button>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(40,minmax(0,1fr))] gap-[3px]">
          {r.dots.map((d, i) => {
            const bad = !mask[d];
            return (
              <div key={i} title={bitstring(d, n)} className={cn("flex aspect-square items-center justify-center rounded-full text-[7px] leading-none transition-all duration-300", !bad && "bg-violet-400/90", bad && view === "hard" && "bg-slate-700/60 text-rose-300", bad && view === "soft" && "bg-pink-400")}>
                {bad && view === "hard" ? "✕" : ""}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {view === "hard"
            ? `${badDots} of 400 ballots broke the law and were discarded — only ${400 - badDots} remain to vote. Fewer votes = noisier statistics.`
            : `All 400 ballots count. The ${badDots} suspicious ones (pink) were moved to the most plausible LEGAL outcome using the known readout-error rates.`}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Raw" value={`100% kept`} sub={`TVD ${tRaw.toFixed(3)}`} color={COLORS.noisy} />
        <Stat label="v1 Hard post-selection" value={`${Pct(r.hard.kept, 0)} kept`} sub={`TVD ${tHard.toFixed(3)} · ≈ ${Math.round(shots * r.hard.kept).toLocaleString()} effective shots`} color={COLORS.mitigated} />
        <Stat label="v2 Soft reweighting" value="100% kept" sub={`TVD ${tSoft.toFixed(3)} · ${shots.toLocaleString()} effective shots`} color={COLORS.soft} />
      </div>
      <div className="text-xs text-slate-500">Try: raise gate error to 10% on VQE — v1 retention collapses (most shots break the law), while v2 keeps every shot. Then switch to GHZ and watch both methods struggle because the law is wrong.</div>
    </div>
  );
}
