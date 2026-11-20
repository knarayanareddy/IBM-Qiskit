import { useState } from "react";
import { cn } from "../utils/cn";
import { Callout, Check, CodeBlock, Panel, ProgressBar, useStored } from "../components/ui";

interface Block {
  id: string;
  when: string;
  title: string;
  icon: string;
  goal: string;
  items: string[];
  tip?: string;
  code?: string;
}

const BLOCKS: Block[] = [
  {
    id: "h1", when: "Hour 1", title: "Clone, build, explore", icon: "🔧",
    goal: "A working local copy and comfort clicking around the Lab.",
    items: [
      "git clone https://github.com/knarayanareddy/IBM-Qiskit.git && cd IBM-Qiskit",
      "npm install  →  npm run dev  → open http://localhost:5173",
      "npm run build once, and keep a copy of dist/index.html on the desktop (offline insurance)",
      "Lab: click all 5 stand-ins (GHZ, Bell, Trotter, VQE, VQE-ref ⚠) and note retention + gap-closed for each",
      "Drag every noise knob from 0 to max and watch the histogram",
      "Open #/compare once and click CSV + JSON to confirm downloads work on the venue laptop/browser",
    ],
    tip: "If anything breaks, stop and ask a mentor early — environment issues are the #1 time sink.",
    code: "git clone https://github.com/knarayanareddy/IBM-Qiskit.git\ncd IBM-Qiskit && npm install && npm run dev",
  },
  {
    id: "h2", when: "Hour 2", title: "Decision helper → pick your top project", icon: "🧭",
    goal: "Know which of the four projects you'd pick for a few different imaginary algorithms.",
    items: [
      "Open #/overview → Decision helper. Try the 3 scenarios below and write down the scores",
      "Scenario A: T gates ON, symmetry OFF, deep → what wins?",
      "Scenario B: symmetry ON, fixed Hamming weight ON, shallow → what wins?",
      "Scenario C: QPU time tight ON → which methods drop?",
      "Skim the 4 walkthroughs in ideas-repo: press ▶ Auto-play tour on each",
      "Choose a personal default: ONE primary + ONE fallback project",
    ],
    tip: "You're not predicting the algorithm — you're rehearsing the decision so it takes 3 minutes on the day.",
  },
  {
    id: "h3", when: "Hour 3", title: "Practise with a stand-in circuit", icon: "🏋️",
    goal: "Run the full loop (paste → law → noise → mitigate → scorecard → export) on GHZ, Bell and Trotter.",
    items: [
      "Bell: parity-even law → v1 and v2; gap-closed and retention in the scorecard",
      "GHZ: observe the 'law not conserved' warning; explain it out loud to a teammate",
      "Trotter (T gates): no law → confirm adaptive reduces to readout-only (honest negative control)",
      "Tune noise knobs until raw P(law) looks like a real-hardware number (e.g. 60–85%)",
      "Export scorecard CSV for each stand-in; name the files by circuit",
      "Time yourself: paste → export in under 5 minutes",
    ],
  },
  {
    id: "pre", when: "Before reveal", title: "Read the Playbook", icon: "📋",
    goal: "Everything prepared so the reveal is a 'fill in the blanks' moment.",
    items: [
      "#/playbook → tick every item in 'Before the event'",
      "IBM Quantum account + API key saved: QiskitRuntimeService.save_account(...)",
      "Run the Runtime baseline snippet on a simulator or small backend (checks your toolchain)",
      "Pre-write the 3-minute pitch skeleton and the 'honest limits' slide",
      "Decide your fallback if there's no conservation law",
      "Pack laptop, charger, notebook; offline copies of dist/index.html",
    ],
    tip: "The Playbook's own list: queue time is the real bottleneck on the day — be ready to submit jobs the minute you have a circuit.",
  },
  {
    id: "post", when: "After reveal", title: "Apply the decision helper → run baselines", icon: "🎬",
    goal: "From circuit to first hardware jobs within ~2 hours of the reveal.",
    items: [
      "Paste the revealed circuit into the Lab; resolve EVERY parser warning (unsupported gates change your circuit)",
      "Run the ideal simulation: does the output obey a conservation law? (Lab shows 'detected from ideal')",
      "Fill the decision helper → commit to ONE project, ONE fallback; choose v1 (hard) or v2 (soft)",
      "Transpile for the target backend (optimization_level=3); record 2-qubit gate count + depth",
      "Submit immediately: (1) RAW Sampler job, (2) readout-only / Runtime defaults (Estimator resilience_level=1), (3) calibration circuits |0…0⟩ and |1…1⟩",
      "While jobs queue: tune the Lab's noise knobs to match the first real raw result",
      "Agree the headline observable with organisers / judges",
      "Build the final scorecard: raw → Runtime defaults → ours → ideal, with error bars, same circuit & shots; export CSV/JSON",
    ],
    tip: "Always include one honest failure case, retention next to accuracy, and a one-sentence 'mitigation ≠ correction'.",
    code: "# baselines to submit (see Playbook → BASELINE)\n# 1. raw       : SamplerV2.run([isa], shots=4096)\n# 2. defaults  : EstimatorV2 with options.resilience_level = 1\n# 3. calibrate : |0…0> and |1…1> circuits for readout confusion",
  },
];

export default function DayPlan() {
  const [tab, setTab] = useState(BLOCKS[0].id);
  const [done, setDone] = useStored<Record<string, boolean>>("qb-day", {});
  const total = BLOCKS.reduce((a, b) => a + b.items.length, 0);
  const count = Object.values(done).filter(Boolean).length;
  const b = BLOCKS.find((x) => x.id === tab)!;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-white">🗓️ Hackathon Day Action Plan</h1>
        <p className="text-slate-300">A condensed “what to do on site” guide. Rehearse the first three blocks at home — they take about 3 hours.</p>
        <div className="max-w-sm"><div className="mb-1 text-xs text-slate-400">{count}/{total} tasks ticked</div><ProgressBar value={count / total} tone="violet" /></div>
      </header>

      <div className="flex flex-wrap gap-2">
        {BLOCKS.map((x) => {
          const n = x.items.filter((_, i) => done[`${x.id}-${i}`]).length;
          return (
            <button key={x.id} onClick={() => setTab(x.id)} className={cn("rounded-xl border px-3 py-2 text-left text-sm transition", tab === x.id ? "border-cyan-400 bg-cyan-400/15" : "border-slate-700 bg-slate-900/60 hover:border-slate-500")}>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">{x.when}</div>
              <div className="font-semibold text-slate-100">{x.icon} {x.title}</div>
              <div className="text-[11px] text-slate-500">{n}/{x.items.length}</div>
            </button>
          );
        })}
      </div>

      <Panel title={`${b.when} · ${b.title}`} icon={b.icon}>
        <p className="mb-4 text-sm text-slate-300"><b className="text-cyan-300">Goal:</b> {b.goal}</p>
        <div className="space-y-2">
          {b.items.map((t, i) => {
            const k = `${b.id}-${i}`;
            return <Check key={k} checked={!!done[k]} onChange={(v) => setDone((d) => ({ ...d, [k]: v }))}>{t}</Check>;
          })}
        </div>
        {b.code && <div className="mt-4"><CodeBlock code={b.code} lang="shell" /></div>}
        {b.tip && <div className="mt-4"><Callout tone="amber" icon="💡"><span>{b.tip}</span></Callout></div>}
      </Panel>

      <Panel title="Decision rules of thumb" icon="🧭">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="py-1 pr-3">If the algorithm has…</th><th>Lean toward</th></tr></thead>
            <tbody className="text-slate-300">
              {[
                ["T gates / arbitrary rotations, medium depth, QPU time OK", "Non-Clifford ZNE (project 2)"],
                ["A clear symmetry (parity, particle number), a spare ancilla", "Symmetry-Resolved (project 1)"],
                ["Fixed Hamming weight output, readout error dominates, need every shot", "Adaptive Conservation (project 4) — v2 soft"],
                ["Symmetry but shots are plentiful and noise is low", "Hard post-selection (v1) is simpler"],
                ["No law at all", "Readout mitigation / ZNE; present Adaptive as an honest negative control"],
                ["QPU time tight", "Avoid ≥3× shot methods (ZNE); prefer 2-job methods"],
              ].map(([a, b2]) => (
                <tr key={a} className="border-t border-slate-800"><td className="py-2 pr-3">{a}</td><td className="font-semibold text-violet-200">{b2}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">These mirror the logic of the repo's decision helper; the helper gives the exact scores and reasons.</p>
      </Panel>
    </div>
  );
}
