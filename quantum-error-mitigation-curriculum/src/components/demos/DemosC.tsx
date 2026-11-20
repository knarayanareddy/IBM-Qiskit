import { useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { Callout, CodeBlock, Legend, Slider, Stat, Pct } from "../ui";
import { COLORS, gauss, mulberry32, type Rng } from "../../lib/quantum";

/* ============================================================ Lesson 8 — ZNE */

type Fit = "linear" | "exp" | "rich";
const FACTORS: Record<string, number[]> = { "1,2,3": [1, 2, 3], "1,3,5": [1, 3, 5], "1,1.5,2": [1, 1.5, 2] };

function fitFn(xs: number[], ys: number[], kind: Fit): ((x: number) => number) | null {
  const n = xs.length;
  if (kind === "rich") {
    return (x0: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        let l = 1;
        for (let j = 0; j < n; j++) if (j !== i) l *= (x0 - xs[j]) / (xs[i] - xs[j]);
        s += ys[i] * l;
      }
      return s;
    };
  }
  const tx = xs;
  let ty = ys;
  if (kind === "exp") {
    if (ys.some((y) => y <= 0)) return null;
    ty = ys.map(Math.log);
  }
  const mx = tx.reduce((a, b) => a + b, 0) / n, my = ty.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (tx[i] - mx) * (ty[i] - my); sxx += (tx[i] - mx) ** 2; }
  const b = sxy / sxx, a = my - b * mx;
  return kind === "exp" ? (x) => Math.exp(a + b * x) : (x) => a + b * x;
}

function measurePoints(factors: number[], rate: number, shots: number, rng: Rng) {
  return factors.map((l) => {
    const mean = Math.exp(-rate * l);
    const sd = Math.sqrt(Math.max(0, 1 - mean * mean) / shots);
    return { x: l, y: mean + gauss(rng) * sd, sd };
  });
}

export function ZneDemo() {
  const [rate, setRate] = useState(0.15);
  const [shots, setShots] = useState(2000);
  const [fkey, setFkey] = useState("1,3,5");
  const [fit, setFit] = useState<Fit>("exp");
  const [seed, setSeed] = useState(4);
  const factors = FACTORS[fkey];

  const d = useMemo(() => {
    const pts = measurePoints(factors, rate, shots, mulberry32(seed * 1013));
    const f = fitFn(pts.map((p) => p.x), pts.map((p) => p.y), fit);
    const est = f ? f(0) : NaN;
    // repeat the whole experiment 300x to expose bias & variance
    const ests: number[] = [];
    const rng = mulberry32(777 + seed);
    for (let t = 0; t < 300; t++) {
      const p = measurePoints(factors, rate, shots, rng);
      const g = fitFn(p.map((q) => q.x), p.map((q) => q.y), fit);
      if (g) ests.push(g(0));
    }
    const mean = ests.reduce((a, b) => a + b, 0) / Math.max(1, ests.length);
    const sd = Math.sqrt(ests.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, ests.length));
    return { pts, f, est, bias: mean - 1, sd };
  }, [factors, rate, shots, fit, seed]);

  const W = 640, H = 300, pl = 46, pr = 16, pt = 14, pb = 36;
  const xmax = Math.max(...factors) + 0.4;
  const ymin = Math.min(0.2, ...d.pts.map((p) => p.y - 0.05), Number.isFinite(d.est) ? d.est - 0.05 : 1) ;
  const ymax = Math.max(1.12, Number.isFinite(d.est) ? d.est + 0.06 : 1);
  const X = (x: number) => pl + (x / xmax) * (W - pl - pr);
  const Y = (y: number) => pt + (1 - (y - ymin) / (ymax - ymin)) * (H - pt - pb);
  const curve = d.f
    ? Array.from({ length: 60 }, (_, i) => {
        const x = (i / 59) * Math.max(...factors);
        return `${i === 0 ? "M" : "L"} ${X(x).toFixed(1)} ${Y(Math.max(ymin, Math.min(ymax, d.f!(x)))).toFixed(1)}`;
      }).join(" ")
    : "";
  const raw = d.pts[0].y;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <Slider label="How noisy is the hardware?" value={rate} onChange={setRate} min={0.02} max={0.4} step={0.01} fmt={(v) => v.toFixed(2)} color={COLORS.noisy} hint="signal shrinks like e^(−rate × noise scale)" />
          <Slider label="Shots per noise level" value={shots} onChange={setShots} min={200} max={20000} step={200} fmt={(v) => v.toLocaleString()} />
          <div>
            <div className="mb-1 text-sm text-slate-200">Noise scale factors</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(FACTORS).map((k) => (
                <button key={k} onClick={() => setFkey(k)} className={cn("rounded-md border px-2.5 py-1 font-mono text-xs", fkey === k ? "border-violet-400 bg-violet-400/15 text-violet-100" : "border-slate-600 text-slate-300")}>{k}</button>
              ))}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">1 = real hardware. 2 = twice the noise (via gate folding). IBM's Runtime default is 1, 3, 5.</div>
          </div>
          <div>
            <div className="mb-1 text-sm text-slate-200">Curve to extend back to zero</div>
            <div className="flex flex-wrap gap-1.5">
              {([["linear", "Linear"], ["exp", "Exponential"], ["rich", "Richardson"]] as [Fit, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setFit(k)} className={cn("rounded-md border px-2.5 py-1 text-xs", fit === k ? "border-violet-400 bg-violet-400/15 text-violet-100" : "border-slate-600 text-slate-300")}>{l}</button>
              ))}
            </div>
          </div>
          <button onClick={() => setSeed(seed + 1)} className="w-full rounded-lg border border-slate-600 py-1.5 text-sm text-slate-300 hover:border-violet-400">🎲 re-run the experiment</button>
        </div>
        <div className="space-y-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-700 bg-slate-950/60" role="img" aria-label="Zero-noise extrapolation chart">
            {[0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line x1={pl} x2={W - pr} y1={Y(t)} y2={Y(t)} stroke="#1e293b" />
                <text x={pl - 6} y={Y(t) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{t}</text>
              </g>
            ))}
            {Array.from({ length: Math.ceil(xmax) + 1 }, (_, i) => (
              <g key={i}>
                <line x1={X(i)} x2={X(i)} y1={pt} y2={H - pb} stroke="#1e293b" />
                <text x={X(i)} y={H - pb + 16} textAnchor="middle" fontSize="11" fill="#94a3b8">{i}×</text>
              </g>
            ))}
            <text x={(W + pl) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#64748b">noise scale (0× = the impossible, perfect device)</text>
            <line x1={pl} x2={W - pr} y1={Y(1)} y2={Y(1)} stroke={COLORS.ideal} strokeWidth={1.5} strokeDasharray="6 4" />
            <text x={W - pr - 4} y={Y(1) - 5} textAnchor="end" fontSize="10" fill={COLORS.ideal}>ideal = 1.00</text>
            {curve && <path d={curve} fill="none" stroke={COLORS.mitigated} strokeWidth={2.2} strokeDasharray="5 3" />}
            {d.pts.map((p) => (
              <g key={p.x}>
                <line x1={X(p.x)} x2={X(p.x)} y1={Y(p.y - p.sd)} y2={Y(p.y + p.sd)} stroke={COLORS.noisy} strokeWidth={2} />
                <circle cx={X(p.x)} cy={Y(p.y)} r={5.5} fill={COLORS.noisy} />
                <text x={X(p.x)} y={Y(p.y) - 11} textAnchor="middle" fontSize="10" fill="#fda4af">{p.y.toFixed(2)}</text>
              </g>
            ))}
            {Number.isFinite(d.est) && (
              <g>
                <circle cx={X(0)} cy={Y(Math.max(ymin, Math.min(ymax, d.est)))} r={7} fill={COLORS.mitigated} stroke="white" strokeWidth={1.5} />
                <text x={X(0) + 12} y={Y(Math.max(ymin, Math.min(ymax, d.est))) + 4} fontSize="11" fontWeight="700" fill="#c4b5fd">ZNE estimate {d.est.toFixed(3)}</text>
              </g>
            )}
          </svg>
          <Legend items={[{ label: "measured at each noise level (± shot noise)", color: COLORS.noisy }, { label: "extrapolation → 0× noise", color: COLORS.mitigated }, { label: "true ideal value", color: COLORS.ideal }]} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Raw (1×)" value={raw.toFixed(3)} color={COLORS.noisy} sub={`error ${Math.abs(raw - 1).toFixed(3)}`} />
            <Stat label="ZNE estimate" value={Number.isFinite(d.est) ? d.est.toFixed(3) : "n/a"} color={COLORS.mitigated} sub={Number.isFinite(d.est) ? `error ${Math.abs(d.est - 1).toFixed(3)}` : "needs positive data"} />
            <Stat label="Bias" value={Number.isFinite(d.bias) ? d.bias.toFixed(3) : "n/a"} sub="average miss over 300 reruns" />
            <Stat label="Wobble (σ)" value={`±${d.sd.toFixed(3)}`} sub="run-to-run spread" color={d.sd > 0.05 ? COLORS.noisy : COLORS.ideal} />
          </div>
          <Callout tone="violet" icon="🧪"><span>Try: <b>Linear</b> with strong noise → purple lands <i>below</i> 1 (bias: a straight line can't follow a curve). Switch to <b>Exponential</b> → bias vanishes. Now drop the shots to 200 or pick <b>Richardson</b> → the wobble explodes. ZNE trades bias for variance, and you pay for variance in shots.</span></Callout>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Lesson 9 — Scorecard */

function verdict(gap: number | null, retention: number) {
  if (gap === null) return { c: "#94a3b8", t: "Raw was already perfect — nothing to improve.", e: "⚪" };
  if (gap < 0) return { c: COLORS.noisy, t: "Mitigation made it WORSE. Report this honestly and investigate.", e: "🔴" };
  if (gap < 20) return { c: COLORS.readout, t: "Marginal gain — likely within noise. Don't oversell.", e: "🟡" };
  if (retention < 0.3) return { c: COLORS.readout, t: "Good accuracy gain, but you threw away most shots. Check the cost column.", e: "🟡" };
  return { c: COLORS.ideal, t: "Mitigation helped, at a sensible cost. 🎉", e: "🟢" };
}

export function ScorecardDemo() {
  const [ideal, setIdeal] = useState(1.0);
  const [raw, setRaw] = useState(0.62);
  const [mit, setMit] = useState(0.88);
  const [w01, setW01] = useState(0.06);
  const [w10, setW10] = useState(0.03);
  const [keep, setKeep] = useState(0.55);
  const shots = 4096;

  const errRaw = Math.abs(raw - ideal), errMit = Math.abs(mit - ideal);
  const gap = errRaw < 1e-9 ? null : ((errRaw - errMit) / errRaw) * 100;
  const v = verdict(gap, keep);

  const idealD = [0.5, 0, 0, 0.5];
  const good = (1 - w01 - w10) / 2;
  const yours = [good, w01, w10, good];
  const diffs = yours.map((p, i) => p - idealD[i]);
  const tv = diffs.reduce((a, b) => a + Math.abs(b), 0) / 2;
  const labels = ["00", "01", "10", "11"];
  const effShots = Math.round(shots * keep);
  const widen = 1 / Math.sqrt(Math.max(keep, 0.01));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-100">① Gap closed % — "how much of the mistake did we fix?"</div>
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            <Slider label="Ideal value (the truth)" value={ideal} onChange={setIdeal} min={0} max={1} step={0.01} fmt={(x) => x.toFixed(2)} color={COLORS.ideal} />
            <Slider label="Raw measured" value={raw} onChange={setRaw} min={0} max={1} step={0.01} fmt={(x) => x.toFixed(2)} color={COLORS.noisy} />
            <Slider label="Mitigated measured" value={mit} onChange={setMit} min={0} max={1} step={0.01} fmt={(x) => x.toFixed(2)} color={COLORS.mitigated} />
          </div>
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="py-1 pr-3">Method</th><th className="pr-3">Value</th><th className="pr-3">Error</th><th>Gap closed</th></tr></thead>
                <tbody className="font-mono">
                  <tr className="border-t border-slate-800"><td className="py-1.5 pr-3 font-sans text-rose-300">Raw (unmitigated)</td><td className="pr-3">{raw.toFixed(2)}</td><td className="pr-3">{errRaw.toFixed(2)}</td><td className="text-slate-500">baseline</td></tr>
                  <tr className="border-t border-slate-800"><td className="py-1.5 pr-3 font-sans text-violet-300">Mitigated</td><td className="pr-3">{mit.toFixed(2)}</td><td className="pr-3">{errMit.toFixed(2)}</td><td style={{ color: v.c }} className="font-bold">{gap === null ? "—" : `${gap.toFixed(0)}%`}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border p-3 text-sm" style={{ borderColor: v.c + "66", background: v.c + "14", color: "#e2e8f0" }}>{v.e} {v.t}</div>
            <div className="font-mono text-xs text-slate-400">gap closed = (|raw − ideal| − |mitigated − ideal|) ÷ |raw − ideal| = ({errRaw.toFixed(2)} − {errMit.toFixed(2)}) ÷ {errRaw.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-100">② TVD — "how far apart are two histograms?" (Bell pair; ideal = 50% 00, 50% 11)</div>
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            <Slider label="Wrong mass on 01" value={w01} onChange={setW01} min={0} max={0.3} step={0.005} fmt={(x) => Pct(x)} color={COLORS.noisy} />
            <Slider label="Wrong mass on 10" value={w10} onChange={setW10} min={0} max={0.3} step={0.005} fmt={(x) => Pct(x)} color={COLORS.noisy} />
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-3">
              {labels.map((l, i) => (
                <div key={l} className="text-center">
                  <div className="flex h-24 items-end justify-center gap-1">
                    <div className="w-4 rounded-t" style={{ height: `${idealD[i] * 190}%`, maxHeight: "100%", background: COLORS.ideal }} />
                    <div className="w-4 rounded-t" style={{ height: `${Math.min(100, yours[i] * 190)}%`, background: COLORS.noisy }} />
                  </div>
                  <div className="font-mono text-xs text-slate-300">{l}</div>
                  <div className="font-mono text-[11px]" style={{ color: Math.abs(diffs[i]) > 0.001 ? COLORS.readout : "#64748b" }}>Δ {diffs[i] >= 0 ? "+" : ""}{diffs[i].toFixed(3)}</div>
                </div>
              ))}
            </div>
            <div className="font-mono text-sm text-slate-200">TVD = ½ × Σ|Δ| = ½ × {diffs.reduce((a, b) => a + Math.abs(b), 0).toFixed(3)} = <b style={{ color: tv < 0.03 ? COLORS.ideal : COLORS.noisy }}>{tv.toFixed(3)}</b></div>
            <div className="text-xs text-slate-500">TVD 0 = identical histograms, 1 = completely different. For a Bell pair it equals the total share of wrong outcomes.</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-100">③ Retention — "how many shots survived?"</div>
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <Slider label="Retention (kept shots)" value={keep} onChange={setKeep} min={0.02} max={1} step={0.01} fmt={(x) => Pct(x, 0)} color={COLORS.mitigated} />
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Shots run" value={shots.toLocaleString()} />
            <Stat label="Effective shots" value={effShots.toLocaleString()} color={COLORS.mitigated} />
            <Stat label="Error bar ×" value={`×${widen.toFixed(2)}`} sub="vs. keeping every shot" color={widen > 1.8 ? COLORS.noisy : COLORS.ideal} />
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">Statistical error shrinks like 1/√shots. Keep 25% of shots → error bars twice as wide. That's the hidden cost of hard post-selection.</div>
      </div>
    </div>
  );
}

/* ============================================================ Lesson 10 — Runtime */

export function RuntimeDemo() {
  const [level, setLevel] = useState(1);
  const [prim, setPrim] = useState<"est" | "sam">("est");
  const [trex, setTrex] = useState(true);
  const [twirl, setTwirl] = useState(false);
  const [zne, setZne] = useState(false);
  const [dd, setDd] = useState(false);

  const pick = (l: number) => {
    setLevel(l);
    setTrex(l >= 1);
    setTwirl(l >= 2);
    setZne(l >= 2);
  };
  const cost = (zne ? 3 : 1) * 1;
  const lines = [
    "from qiskit_ibm_runtime import QiskitRuntimeService, EstimatorV2 as Estimator",
    "",
    "service = QiskitRuntimeService()                 # your saved IBM account",
    "backend = service.least_busy(operational=True, simulator=False)",
    "estimator = Estimator(mode=backend)",
    `estimator.options.resilience_level = ${level}      # ← the 'easy button' (0, 1 or 2)`,
    "estimator.options.default_shots = 4096",
    ...(dd ? ["estimator.options.dynamical_decoupling.enable = True   # suppression, not mitigation"] : []),
    ...(twirl && level < 2 ? ["estimator.options.twirling.enable_gates = True"] : []),
    ...(zne && level < 2 ? ["estimator.options.resilience.zne_mitigation = True", "estimator.options.resilience.zne.noise_factors = (1, 3, 5)"] : []),
    ...(trex && level < 1 ? ["estimator.options.resilience.measure_mitigation = True"] : []),
    "",
    "job = estimator.run([(isa_circuit, observable)])   # a 'PUB': circuit + observable",
    "result = job.result()[0]",
    "print(result.data.evs, result.data.stds)          # value ± error bar",
  ];
  const row = (label: string, on: boolean, set: (v: boolean) => void, note: string, tone: string) => (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 text-sm", on ? tone : "border-slate-700 bg-slate-800/40")}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-1 h-4 w-4 accent-violet-400" />
      <span><span className="font-semibold text-slate-100">{label}</span><br /><span className="text-xs text-slate-400">{note}</span></span>
    </label>
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2">
        {([["est", "EstimatorV2", "Asks: 'what is the average value of this observable?' → a number ± error bar. Resilience levels live here."], ["sam", "SamplerV2", "Asks: 'give me the raw bitstrings.' → counts. You need these for post-selection, soft reweighting and the histograms in this repo."]] as const).map(([id, name, d]) => (
          <button key={id} onClick={() => setPrim(id)} className={cn("rounded-xl border p-3 text-left", prim === id ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700 bg-slate-800/40 hover:border-slate-500")}>
            <div className="font-mono text-sm font-bold text-cyan-200">{name}</div>
            <div className="text-xs text-slate-400">{d}</div>
          </button>
        ))}
      </div>
      {prim === "sam" ? (
        <CodeBlock lang="python" title="SamplerV2 — raw counts for your own mitigation" code={`from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler

service = QiskitRuntimeService()
backend = service.least_busy(operational=True, simulator=False)
sampler = Sampler(mode=backend)

job = sampler.run([isa_circuit], shots=4096)
counts = job.result()[0].data.meas.get_counts()   # {'00': 1980, '11': 1890, '01': 120, ...}
# → paste into the Lab, or post-select / reweight yourself`} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-sm text-slate-200">resilience_level (easy button)</div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((l) => (
                  <button key={l} onClick={() => pick(l)} className={cn("rounded-lg border py-2 text-center", level === l ? "border-violet-400 bg-violet-400/15 text-violet-100" : "border-slate-600 text-slate-300")}>
                    <div className="font-mono text-xl font-black">{l}</div>
                    <div className="text-[10px]">{["none", "readout (default)", "+ gates & ZNE"][l]}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-slate-500">What's switched on — tweak individually</div>
              {row("Readout mitigation (TREX)", trex, setTrex, "Fixes the 'smudged scoreboard'. Cheap.", "border-violet-400/50 bg-violet-400/10")}
              {row("Gate twirling", twirl, setTwirl, "Randomises gate errors so they average into simple noise. Needed for ZNE.", "border-violet-400/50 bg-violet-400/10")}
              {row("Zero-noise extrapolation", zne, setZne, "Runs the circuit at several noise levels, extends to zero. Costs more QPU time.", "border-violet-400/50 bg-violet-400/10")}
              {row("Dynamical decoupling", dd, setDd, "Error SUPPRESSION: tiny pulses protect idle qubits. Off by default.", "border-cyan-400/50 bg-cyan-400/10")}
            </div>
            <Stat label="Rough QPU-time multiplier" value={`≈ ${cost}×`} sub="ZNE with noise factors (1,3,5) ≈ 3 noise levels · estimate only" color={cost > 1 ? COLORS.readout : COLORS.ideal} />
          </div>
          <div className="space-y-3">
            <CodeBlock lang="python" title="Estimator options — updates as you click" code={lines.join("\n")} />
            <Callout tone="amber" icon="⚠️" title="Check your installed version">
              <span>Runtime option names move between releases (the repo's own Playbook snippet says "verify option names against your installed qiskit-ibm-runtime"). Before the hackathon, run <code className="rounded bg-slate-800 px-1">pip show qiskit-ibm-runtime</code> and skim the "Configure noise management" page of IBM's docs.</span>
            </Callout>
          </div>
        </div>
      )}
    </div>
  );
}
