import { useMemo, useState } from "react";
import { Slider, Button } from "../components/Slider";
import { Stat } from "../components/ui";
import { LineChart } from "../components/Charts";
import { gauss, mulberry32 } from "../lib/rng";

/**
 * Clifford Data Regression (CDR) Demo
 *
 * Learns the noisy→ideal expectation map by running near-Clifford versions of
 * a T-heavy circuit (cheap to classically simulate) on the QPU, regressing
 * ideal = α·noisy + β, then applying it to the real circuit. Where Project 2
 * (ZNE) amplifies noise, CDR <b>learns</b> it — ideal for the non-Clifford case
 * with no extra circuit depth.
 *
 * Ported from qiskit-error-mitigation-ideas/src/pages/Ideas.tsx (CDRDemo).
 */

export default function CliffordRegression() {
  const [a, setA] = useState(0.6);
  const [b, setB] = useState(-0.05);
  const [s, setS] = useState(0.04);
  const [n, setN] = useState(14);
  const [seed, setSeed] = useState(4);

  const { train, alpha, beta, yStar, mit } = useMemo(() => {
    const rng = mulberry32(seed);
    const train = Array.from({ length: n }, () => {
      const x = Math.round((rng() * 2 - 1) * 4) / 4; // near-Clifford-ish: coarse values
      return { x, y: a * x + b + s * gauss(rng) };
    });
    const mx = train.reduce((t, p) => t + p.y, 0) / n;
    const my = train.reduce((t, p) => t + p.x, 0) / n;
    let sxx = 0,
      sxy = 0;
    train.forEach((p) => {
      sxx += (p.y - mx) ** 2;
      sxy += (p.y - mx) * (p.x - my);
    });
    const alpha = sxx > 1e-9 ? sxy / sxx : 1;
    const beta = my - alpha * mx;
    const yStar = a * 0.62 + b + s * gauss(rng);
    return { train, alpha, beta, yStar, mit: alpha * yStar + beta };
  }, [a, b, s, n, seed]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">📡 Clifford Data Regression</h1>
        <p className="mt-1 max-w-3xl text-slate-400">
          Classically simulate <i>near-Clifford</i> versions of your T-heavy circuit (cheap), run them on the
          QPU, learn the noisy→ideal map by regression, then apply it to the real circuit. Where ZNE amplifies
          noise and hopes the extrapolation holds, CDR <b>learns</b> the map from data — no extra circuit depth.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <Slider
            label="Noise attenuation a (noisy = a·ideal + b)"
            value={a}
            onChange={setA}
            min={0.3}
            max={1}
            step={0.01}
          />
          <Slider label="Systematic offset b" value={b} onChange={setB} min={-0.2} max={0.2} step={0.01} />
          <Slider
            label="Scatter σ (shot noise + model error)"
            value={s}
            onChange={setS}
            min={0}
            max={0.15}
            step={0.005}
          />
          <Slider label="# training circuits" value={n} onChange={setN} min={4} max={40} step={1} />
          <Button
            onClick={() => setSeed((x) => x + 1)}
            className="w-fit border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 hover:border-cyan-400"
          >
            ↻ new training set
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Target ideal" value="0.620" tone="emerald" sub="(unknown in practice)" />
            <Stat label="Noisy" value={yStar.toFixed(3)} tone="rose" />
            <Stat label="CDR" value={mit.toFixed(3)} tone="cyan" sub={`error ${Math.abs(mit - 0.62).toFixed(3)}`} />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Learned map: ideal ≈ {alpha.toFixed(2)}·noisy + {beta.toFixed(2)}. Regression fit from {n} training
            circuits; applied to the single noisy target y* = 0.62·a + b + noise.
          </p>
        </div>
        <div>
          <LineChart
            series={[
              {
                label: "identity (no noise)",
                color: "#64748b",
                dashed: true,
                points: [
                  { x: -1, y: -1 },
                  { x: 1, y: 1 },
                ],
              },
              {
                label: `learned map  ideal = ${alpha.toFixed(2)}·noisy + ${beta.toFixed(2)}`,
                color: "#22d3ee",
                points: [-1, 1].map((x) => ({ x, y: alpha * x + beta })),
              },
              {
                label: "training circuits",
                color: "#f8fafc",
                points: train.map((p) => ({ x: p.y, y: p.x })),
              },
            ]}
            xDomain={[-1, 1]}
            yDomain={[-1, 1]}
            xLabel="noisy QPU expectation"
            yLabel="ideal (classical sim)"
            markers={[
              { x: yStar, y: 0.62, color: "#34d399", label: "truth" },
              { x: yStar, y: mit, color: "#f472b6", label: "CDR estimate" },
            ]}
            height={280}
          />
          <p className="mt-3 text-xs text-slate-500">
            Green dot = truth (0.62, unknown in practice). Pink dot = CDR's estimate after regression. The blue
            line is the learned map; grey points are the training circuits used to fit it.
          </p>
        </div>
      </div>
    </div>
  );
}
