import { useState } from "react";
import { Slider } from "../components/Slider";
import { Stat } from "../components/ui";
import { LineChart } from "../components/Charts";

/**
 * Virtual Distillation Demo
 *
 * Exact maths: ρ = (1−q)|Φ⁺⟩⟨Φ⁺| + q·I/4, estimator = Tr(ρ^M·ZZ)/Tr(ρ^M) =
 * (λ₁^M − b^M)/(λ₁^M + 3·b^M) where λ₁ = 1 − q + (1−q)/4·... wait, simpler:
 * ρ = (1-q)·Bell + q·I/4 → eigenvalues: λ₁ = 1-q+q/4 (Bell direction), b = q/4 (the other 3).
 * ⟨ZZ⟩ = (λ₁^M − b^M)/(λ₁^M + 3·b^M).
 *
 * The error shrinks exponentially in M — but needs M copies of the state
 * (M× qubits). The shootout: same noise, which wins per qubit spent?
 *
 * Ported from qiskit-error-mitigation-ideas/src/pages/Ideas.tsx (VDDemo).
 */

export default function VirtualDistillation() {
  const [q, setQ] = useState(0.3);
  const [M, setM] = useState(2);

  const xs = Array.from({ length: 41 }, (_, i) => (0.6 * i) / 40);
  const colors = ["#fb7185", "#fbbf24", "#a78bfa", "#34d399"];

  function vdZZ(q: number, M: number): number {
    const a = 1 - q;
    const b = (1 - a) / 4;
    const l1 = a + b;
    return (Math.pow(l1, M) - Math.pow(b, M)) / (Math.pow(l1, M) + 3 * Math.pow(b, M));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">🪞 Virtual Distillation</h1>
        <p className="mt-1 max-w-3xl text-slate-400">
          Exact estimator on a depolarised Bell pair with observable ZZ (ideal = 1). The error shrinks
          <i>exponentially in M</i> — but needs M copies of the state (M× qubits). The shootout: same noise,
          which wins per qubit spent — M copies, or one copy + a symmetry check?
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <Slider
            label="Depolarising noise q on the Bell pair"
            value={q}
            onChange={setQ}
            min={0}
            max={0.6}
            step={0.01}
            fmt={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Slider
            label="Copies M (virtual distillation)"
            value={M}
            onChange={setM}
            min={1}
            max={4}
            step={1}
          />
          <div className="grid grid-cols-2 gap-3">
            <Stat label={`Raw ⟨ZZ⟩ (M=1)`} value={vdZZ(q, 1).toFixed(3)} tone="rose" />
            <Stat
              label={`VD  M=${M}`}
              value={vdZZ(q, M).toFixed(3)}
              tone="emerald"
              sub={`error ${(1 - vdZZ(q, M)).toFixed(3)}`}
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            ρ = (1−q)|Φ⁺⟩⟨Φ⁺| + q·I/4. Estimator = Tr(ρ^M·ZZ)/Tr(ρ^M) = (λ₁^M − b^M)/(λ₁^M + 3b^M).
            With M copies you need M× qubits and M× state preparation — Project 1 (symmetry) tries to avoid
            that by using one copy and a sector check instead.
          </p>
        </div>
        <div>
          <LineChart
            series={[1, 2, 3, 4].map((m) => ({
              label: `M = ${m}`,
              color: colors[m - 1],
              width: m === M ? 3 : 1.5,
              points: xs.map((x) => ({ x, y: vdZZ(x, m) })),
            }))}
            xDomain={[0, 0.6]}
            yDomain={[0.4, 1]}
            xLabel="noise strength q"
            yLabel="⟨ZZ⟩ estimate"
            markers={[{ x: q, y: vdZZ(q, M), color: "#f8fafc" }]}
            height={280}
          />
          <p className="mt-3 text-xs text-slate-500">
            Each curve = one fixed M. Marked point = your current q and M. Notice how M=2,3,4 separate from
            M=1 as q grows — but the qubit cost grows linearly in M.
          </p>
        </div>
      </div>
    </div>
  );
}
