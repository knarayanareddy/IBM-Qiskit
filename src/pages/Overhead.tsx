import { useMemo, useState } from "react";
import { Slider } from "../components/Slider";
import { Stat } from "../components/ui";
import { LineChart } from "../components/Charts";

/**
 * Sampling-Overhead Wall Calculator
 *
 * Illustrative cost model (not a measurement): plots log₁₀(shots needed) vs
 * # two-qubit gates N for raw / post-selection / ZNE / PEC, with a shot-budget
 * line. Shows where each mitigation method hits the exponential wall — and
 * where adaptive conservation stays flat because it needs no extra shots.
 *
 * Ported from qiskit-error-mitigation-ideas/src/pages/Ideas.tsx (OverheadDemo).
 */

export default function Overhead() {
  const [eps, setEps] = useState(0.004);
  const [lam, setLam] = useState(5);
  const [sig, setSig] = useState(0.02);
  const [budget, setBudget] = useState(7);

  const model = useMemo(() => {
    const d = 1.33 * eps;
    const rows = Array.from({ length: 40 }, (_, i) => {
      const N = 10 + i * 10;
      const base = 1 / (sig * sig);
      return {
        N,
        raw: Math.log10(base),
        ps: Math.log10(base * Math.exp(0.8 * d * N)),
        zne: Math.log10(base * 4 * Math.exp(2 * lam * d * N)),
        pec: Math.log10(base * Math.exp(4 * d * N)),
      };
    });
    const maxN = (k: "ps" | "zne" | "pec") =>
      rows.filter((r) => r[k] <= budget).slice(-1)[0]?.N ?? 0;
    return { rows, ps: maxN("ps"), zne: maxN("zne"), pec: maxN("pec") };
  }, [eps, lam, sig, budget]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">🧱 Sampling-Overhead Wall</h1>
        <p className="mt-1 max-w-3xl text-slate-400">
          Illustrative scaling model (not a measurement). For each number N of two-qubit gates, plot the
          log₁₀ shots needed to reach the target precision. Post-selection cost ∝ 1/retention, ZNE cost ∝
          e^(2·λ·ε·N) (extrapolating from the noisiest point), PEC cost ∝ γ² = e^(4·ε·N). The horizontal line
          is your shot budget — everything below it is reachable; above it, the method is impractical.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <Slider
            label="2-qubit gate error ε"
            value={eps}
            onChange={setEps}
            min={0.001}
            max={0.01}
            step={0.0005}
            fmt={(v) => `${(v * 100).toFixed(2)}%`}
          />
          <Slider
            label="ZNE max noise factor λ"
            value={lam}
            onChange={setLam}
            min={3}
            max={9}
            step={2}
          />
          <Slider
            label="Target precision σ"
            value={sig}
            onChange={setSig}
            min={0.005}
            max={0.05}
            step={0.005}
          />
          <Slider
            label="Shot budget (log₁₀)"
            value={budget}
            onChange={setBudget}
            min={5}
            max={10}
            step={0.5}
            fmt={(v) => `10^${v.toFixed(1)}`}
          />
          <div className="grid grid-cols-3 gap-2">
            <Stat label="PS reaches" value={model.ps} sub="2q gates" tone="cyan" />
            <Stat label="ZNE reaches" value={model.zne} sub="2q gates" tone="amber" />
            <Stat label="PEC reaches" value={model.pec} sub="2q gates" tone="violet" />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            <span className="text-emerald-400 font-mono">✓</span> Adaptive conservation needs <b>no extra shots</b>
            — its line stays flat at the budget regardless of depth. That's the honest advantage: mitigation
            that doesn't hit an exponential wall because it never amplifies noise or discards shots.
          </p>
        </div>
        <div>
          <LineChart
            series={[
              {
                label: "raw (biased!)",
                color: "#64748b",
                dashed: true,
                points: model.rows.map((r) => ({ x: r.N, y: r.raw })),
              },
              {
                label: "post-selection",
                color: "#22d3ee",
                points: model.rows.map((r) => ({ x: r.N, y: r.ps })),
              },
              {
                label: "ZNE",
                color: "#fbbf24",
                points: model.rows.map((r) => ({ x: r.N, y: r.zne })),
              },
              {
                label: "PEC",
                color: "#a78bfa",
                points: model.rows.map((r) => ({ x: r.N, y: r.pec })),
              },
              {
                label: "adaptive (flat)",
                color: "#f472b6",
                points: model.rows.map((r) => ({ x: r.N, y: Math.log10(1 / (sig * sig)) })),
              },
            ]}
            xDomain={[10, 400]}
            yDomain={[3, 12]}
            hlines={[{ y: budget, label: "your shot budget", color: "#34d399" }]}
            xLabel="# two-qubit gates N"
            yLabel="log₁₀(shots needed)"
            height={320}
          />
          <p className="mt-3 text-xs text-slate-500">
            Models: raw = 1/σ² (no mitigation, biased); PS = base·e^(0.8·d·N); ZNE = 4·base·e^(2·λ·d·N);
            PEC = base·e^(4·d·N); d = 1.33·ε. Replace with your own measured per-gate failure probabilities
            before presenting to judges.
          </p>
        </div>
      </div>
    </div>
  );
}
