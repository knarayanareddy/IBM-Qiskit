import { useEffect, useState } from "react";
import { Badge, CopyButton, Meter, Notice, Panel, type Tone } from "../components/ui";
import { cn } from "../utils/cn";

interface CheckGroup {
  id: string;
  title: string;
  icon: string;
  tone: Tone;
  items: string[];
}

const GROUPS: CheckGroup[] = [
  {
    id: "before",
    title: "Before the event",
    icon: "🛫",
    tone: "cyan",
    items: [
      "Create an IBM Quantum account and save credentials locally (QiskitRuntimeService.save_account)",
      "Run the Runtime baseline snippet below on a simulator or small backend to confirm the toolchain works",
      "Clone the reference repo and run experiments/run_all_practice.py so the Python numbers match this prototype",
      "Practise the Lab on all five stand-ins — especially the 'law not conserved' ones",
      "Decide your fallback project from the Overview decision helper (what if there is no conservation law?)",
      "Pre-write the 3-minute pitch skeleton and the honest-limits slide",
      "Pack: laptop + charger, offline copy of docs/this app, notebook for the circuit reveal",
    ],
  },
  {
    id: "onsite",
    title: "First 2 hours on site",
    icon: "⏱️",
    tone: "violet",
    items: [
      "Paste the revealed circuit into the Lab; resolve every parser warning (unsupported gates change the circuit!)",
      "Run the ideal simulation: does the output obey a conservation law? Use the 'detected from ideal' hint",
      "Fill the decision helper from the circuit; commit to ONE primary project and ONE fallback",
      "Transpile for the target backend (optimization_level=3) and record 2q-gate count and depth",
      "Submit raw job + readout-calibration circuits immediately — queue time is the real bottleneck",
      "While jobs queue: tune noise knobs so the simulator's raw P(law) matches the first real run",
      "Agree the headline observable with the organisers / judges",
    ],
  },
  {
    id: "convincing",
    title: "Making results convincing",
    icon: "🏆",
    tone: "emerald",
    items: [
      "Show raw → Runtime defaults → ours → ideal with error bars on the SAME circuit and shots",
      "Report gap-closed % AND TVD — don't cherry-pick a single metric",
      "Show shot retention: hard post-selection vs soft weights, at your real noise level",
      "State the cost: jobs, extra qubits, QPU seconds (replace the model with measured usage)",
      "Include one honest failure case (no law, or law only approximately conserved)",
      "Fix random seeds and export scorecard CSV/JSON so every number is reproducible",
      "Explain mitigation ≠ correction in one sentence a non-expert can repeat",
    ],
  },
];

const BASELINE = `# --- Qiskit Runtime baseline (verify option names against your installed qiskit-ibm-runtime) ---
from qiskit import QuantumCircuit
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler, EstimatorV2 as Estimator

service = QiskitRuntimeService()                      # credentials saved beforehand
circuit = QuantumCircuit.from_qasm_str(open("circuit.qasm").read())   # <- the revealed algorithm

backend = service.least_busy(operational=True, simulator=False, min_num_qubits=circuit.num_qubits)
pm = generate_preset_pass_manager(optimization_level=3, backend=backend)
isa = pm.run(circuit)
print("2q gates:", isa.count_ops(), "depth:", isa.depth())

# 1) RAW counts (no mitigation) — baseline row of the scorecard
raw = Sampler(mode=backend)
raw_job = raw.run([isa], shots=4096)

# 2) RUNTIME DEFAULTS row — Estimator with resilience_level=1 (readout mitigation) for an observable
from qiskit.quantum_info import SparsePauliOp
obs = SparsePauliOp("Z" * circuit.num_qubits).apply_layout(isa.layout)
est = Estimator(mode=backend)
est.options.resilience_level = 1
est.options.default_shots = 4096
est_job = est.run([(isa, obs)])

# 3) CALIBRATION for adaptive conservation: |0...0> and |1...1>  (per-qubit confusion matrices)
n = circuit.num_qubits
cal0 = QuantumCircuit(n); cal0.measure_all()
cal1 = QuantumCircuit(n); cal1.x(range(n)); cal1.measure_all()
cal_job = raw.run([pm.run(cal0), pm.run(cal1)], shots=4096)

# counts -> paste into this prototype's Lab (or run adaptive_conservation.py)
# raw_job.result()[0].data.meas.get_counts()
# Optional on the Sampler: raw.options.dynamical_decoupling.enable = True
#                          raw.options.twirling.enable_gates = True
`;

const PITCH = [
  { t: "0:00 – 0:25", h: "Hook", b: "Noise breaks conservation laws. Post-selection fixes that — until it throws away almost every shot." },
  { t: "0:25 – 1:00", h: "Method", b: "Soft-reweight every shot by P(true state is valid | observed bitstring) using a measured confusion matrix. No shot discarded, 0 extra qubits, 2 jobs." },
  { t: "1:00 – 2:00", h: "Evidence", b: "Scorecard: raw → Runtime defaults → ours → ideal, with error bars, gap-closed % and TVD on the revealed algorithm. Show retention curve vs noise." },
  { t: "2:00 – 2:30", h: "Honesty", b: "Where it does not help: no conservation law, or a law the ideal circuit already breaks; gate errors that stay inside the valid subspace." },
  { t: "2:30 – 3:00", h: "Close", b: "Cost table (jobs / QPU-s / retention), reproducible exports, and what we'd do with another day of QPU time." },
];

type Confidence = "repo" | "inferred" | "unverified";
const CONF: Record<Confidence, { tone: Tone; text: string }> = {
  repo: { tone: "emerald", text: "in the repo" },
  inferred: { tone: "amber", text: "inferred" },
  unverified: { tone: "rose", text: "unverified" },
};

const RESOURCES: { name: string; use: string; conf: Confidence; where?: string }[] = [
  { name: "core/adaptive_conservation.py", use: "Noise model, confusion matrix, readout inversion, hard vs soft weights — ported to src/lib/simulator.ts", conf: "repo", where: "github.com/knarayanareddy/IBM-Qiskit › fallfest-combined-infra" },
  { name: "core/scorecard.py", use: "Raw vs Runtime defaults vs adaptive table + CSV/JSON export — ported to Compare + meta.ts", conf: "repo" },
  { name: "core/budget_meter.py", use: "QPU cost per method (modelled numbers) — ported to Compare + meta.ts", conf: "repo" },
  { name: "core/stand_ins.py", use: "GHZ / Bell / Trotter / fixed-weight VQE practice circuits — in the Lab. Note: the reference VQE ansatz does not conserve weight; the Lab ships a conserving one plus the original.", conf: "repo" },
  { name: "SPECIFICATION.md", use: "Architecture of the combined stack and the prototype layer", conf: "repo" },
  { name: "Qiskit Runtime V2 primitives docs", use: "SamplerV2 / EstimatorV2 options (resilience_level, twirling, dynamical decoupling)", conf: "inferred", where: "docs.quantum.ibm.com — check version matching the event's environment" },
  { name: "IBM Quantum usage metrics", use: "Real QPU seconds per job (job.usage / metrics) to replace the budget model", conf: "inferred" },
  { name: "Event logistics (Amsterdam, 20–21 Nov 2026)", use: "Dates/location as given in your brief; QPU quotas, backend names and the algorithm are NOT yet known", conf: "unverified" },
  { name: "Social-media attributions on the Ideas page", use: "Pointers to people/topics for inspiration — individual claims not checked", conf: "unverified" },
];

function useChecks() {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("ff26-checks") ?? "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("ff26-checks", JSON.stringify(done));
    } catch {
      /* storage unavailable */
    }
  }, [done]);
  return [done, setDone] as const;
}

export default function Playbook() {
  const [done, setDone] = useChecks();
  const total = GROUPS.reduce((a, g) => a + g.items.length, 0);
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">📋 Playbook</h1>
          <p className="mt-1 max-w-3xl text-slate-400">Checklists, a Runtime baseline, a 3-minute pitch and a confidence-rated resource map.</p>
        </div>
        <div className="w-64">
          <Meter value={count} max={total} tone="emerald" label="Checklist progress" valueLabel={`${count}/${total}`} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {GROUPS.map((g) => {
          const n = g.items.filter((_, i) => done[`${g.id}-${i}`]).length;
          return (
            <Panel key={g.id} title={g.title} icon={g.icon} right={<Badge tone={g.tone}>{n}/{g.items.length}</Badge>}>
              <ul className="space-y-2.5">
                {g.items.map((it, i) => {
                  const k = `${g.id}-${i}`;
                  return (
                    <li key={k}>
                      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={!!done[k]}
                          onChange={(e) => setDone((d) => ({ ...d, [k]: e.target.checked }))}
                          className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
                        />
                        <span className={cn("leading-snug", done[k] ? "text-slate-500 line-through" : "text-slate-300")}>{it}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        })}
      </div>

      <Panel
        title="Qiskit Runtime baseline"
        icon="🐍"
        subtitle="Raw, Runtime-defaults and calibration jobs — the three inputs the scorecard needs"
        right={<CopyButton text={BASELINE} />}
      >
        <pre className="max-h-[32rem] overflow-auto rounded-xl bg-slate-950/80 p-4 text-[12.5px] leading-relaxed text-emerald-200">
          <code>{BASELINE}</code>
        </pre>
        <p className="mt-2 text-xs text-slate-500">
          Written from memory of the V2 primitives API and not executed here — check option names against the installed qiskit-ibm-runtime version. Note: <code>resilience_level</code> is an
          Estimator option; for Sampler counts use the DD / twirling options shown in the comments.
        </p>
      </Panel>

      <Panel title="Pitch skeleton — 3 minutes" icon="🎤">
        <ol className="grid gap-3 md:grid-cols-5">
          {PITCH.map((p, i) => (
            <li key={p.h} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-400/20 text-xs font-bold text-violet-200">{i + 1}</span>
                <span className="font-mono text-[11px] text-slate-500">{p.t}</span>
              </div>
              <div className="mt-2 font-semibold text-slate-100">{p.h}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{p.b}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Resource map" icon="🗺️" subtitle="How much to trust each pointer">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {(Object.keys(CONF) as Confidence[]).map((c) => (
            <Badge key={c} tone={CONF[c].tone}>{c} — {CONF[c].text}</Badge>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {RESOURCES.map((r) => (
            <div key={r.name} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm text-slate-100">{r.name}</span>
                <Badge tone={CONF[r.conf].tone}>{r.conf}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-400">{r.use}</p>
              {r.where && <p className="mt-1 text-xs text-slate-500">{r.where}</p>}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Notice tone="slate">
            <b>Confidence legend.</b> <i>repo</i> = I read the file in the reference repository. <i>inferred</i> = standard practice, not verified against the event environment.{" "}
            <i>unverified</i> = taken from your brief or unconfirmed.
          </Notice>
        </div>
      </Panel>
    </div>
  );
}
