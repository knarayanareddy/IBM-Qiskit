import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { Callout, FileChip, Panel } from "../components/ui";

interface Entry { concept: string; path: string; look: string; lesson?: number; area: "main" | "ideas" }

const MAP: Entry[] = [
  // ------- main app
  { concept: "Page routing (hash URLs) & top nav", path: "src/App.tsx", look: "PAGES array + currentPage() reads window.location.hash; header shows 'Nq · depth · gates'", area: "main" },
  { concept: "Shared Lab state (circuit, noise, law, seed)", path: "src/lib/store.tsx", look: "LabProvider / useLab(); 220 ms debounce before re-simulating; default stand-in = weight VQE", area: "main" },
  { concept: "Circuit parser (Qiskit Python / OpenQASM)", path: "src/lib/simulator.ts", look: "parseCircuit(), MAX_QUBITS = 12, MAX_MEASURED = 10, layerOps() for depth", lesson: 3, area: "main" },
  { concept: "Paste box, upload, parse badges", path: "src/pages/Lab.tsx", look: "textarea with OpenQASM placeholder; 'parsed ✓' badge; supported-gate list", lesson: 3, area: "main" },
  { concept: "Circuit diagram drawing", path: "src/components/QuantumCircuit.tsx", look: "SVG circuit renderer in the Lab", lesson: 3, area: "main" },
  { concept: "Stand-in circuits: GHZ, Bell, Trotter, VQE", path: "src/lib/meta.ts", look: "STAND_INS array — each has code, law, observable, referenceIdeal and a teaching note", lesson: 2, area: "main" },
  { concept: "Noise knobs (sliders)", path: "src/components/NoiseKnobs.tsx", look: "1-qubit error 0–5%, 2-qubit 0–15%, readout 0–25%, shots 256–32,768", lesson: 4, area: "main" },
  { concept: "Generic slider component", path: "src/components/Slider.tsx", look: "the reusable slider used by knobs & demos", lesson: 4, area: "main" },
  { concept: "Noise model & shot sampling", path: "src/lib/simulator.ts", look: "NoiseConfig, DEFAULT_NOISE (1% / 3% / 5% / 4096), sampleNoisyCounts(), faultFreeProbability()", lesson: 4, area: "main" },
  { concept: "Histograms & charts", path: "src/components/Charts.tsx", look: "bar/line chart components used on Lab and Compare", lesson: 1, area: "main" },
  { concept: "UI building blocks (Panel, Badge, Notice, Stat, Meter…)", path: "src/components/ui.tsx", look: "also downloadText() used by the CSV/JSON export", area: "main" },
  { concept: "Conservation laws", path: "src/lib/simulator.ts", look: "LawKind, isValidState(), buildValidStateMask(), lawLabel(), suggestLaw()", lesson: 6, area: "main" },
  { concept: "Readout calibration & mitigation", path: "src/lib/simulator.ts", look: "calibrateReadout(), denseConfusion(), mitigateReadout()", lesson: 5, area: "main" },
  { concept: "Hard post-selection (v1)", path: "src/lib/simulator.ts", look: "hardPostselect() returns kept fraction + renormalised distribution", lesson: 7, area: "main" },
  { concept: "Soft reweighting (v2) & priors", path: "src/lib/simulator.ts", look: "softWeights(), makePrior() with uniform | empirical", lesson: 7, area: "main" },
  { concept: "Metrics: TVD, gap closed", path: "src/lib/simulator.ts", look: "tvd(), gapClosed(), gapClosedTvd()", lesson: 9, area: "main" },
  { concept: "Run one full experiment", path: "src/lib/simulator.ts", look: "runExperiment() → raw, runtime, readout, hardPS, adaptive stats", lesson: 9, area: "main" },
  { concept: "Scorecard table + CSV/JSON export", path: "src/pages/Compare.tsx", look: "'Judge's scorecard' panel; buttons call downloadText('scorecard.csv' | 'scorecard.json')", lesson: 9, area: "main" },
  { concept: "Scorecard logic", path: "src/lib/meta.ts", look: "buildScorecard(), scorecardToCSV(), scorecardToJSON(), ScorecardRow", lesson: 9, area: "main" },
  { concept: "Budget Meter (QPU cost)", path: "src/lib/meta.ts", look: "buildBudgetMeter(), budgetWithHardPS(), secondsPerEffectiveShot()", lesson: 5, area: "main" },
  { concept: "Noise sweep (retention & error vs noise)", path: "src/pages/Compare.tsx", look: "NoiseSweep component: press 'Run sweep'", lesson: 7, area: "main" },
  { concept: "Decision helper", path: "src/pages/Overview.tsx", look: "DecisionHelper() with Toggles; logic in meta.ts → scoreProjects(), Traits", area: "main" },
  { concept: "The 4 project cards (v1/v2, best-when, judge takeaway)", path: "src/lib/meta.ts", look: "PROJECTS array", area: "main" },
  { concept: "7 project ideas with time-boxes", path: "src/pages/Ideas.tsx", look: "renders IDEAS from meta.ts (effort / novelty / risk)", area: "main" },
  { concept: "Overhead Wall demo", path: "src/pages/Overhead.tsx", look: "exponential cost of ZNE / PEC / post-selection vs depth", lesson: 5, area: "main" },
  { concept: "Virtual Distillation demo", path: "src/pages/VirtualDistillation.tsx", look: "extra mitigation idea page (#/vd)", area: "main" },
  { concept: "Clifford Data Regression demo", path: "src/pages/CliffordRegression.tsx", look: "extra mitigation idea page (#/cdr)", lesson: 2, area: "main" },
  { concept: "Playbook: checklists, pitch, Runtime baseline code", path: "src/pages/Playbook.tsx", look: "GROUPS (before / first 2 hours / making results convincing), BASELINE python string, PITCH, RESOURCES", lesson: 10, area: "main" },
  // ------- ideas repo
  { concept: "Circuit diagrams in walkthroughs", path: "ideas-repo/src/components/Circuit.tsx", look: "the SVG circuit used in phase 2 'Circuit'", lesson: 3, area: "ideas" },
  { concept: "Histogram, ShotGrid, Funnel, BarCompare, Slider, Terminal, CodeBlock", path: "ideas-repo/src/components/ui.tsx", look: "visual building blocks of the walkthroughs", lesson: 7, area: "ideas" },
  { concept: "Extra widgets", path: "ideas-repo/src/components/extras.tsx", look: "additional visual components", area: "ideas" },
  { concept: "Auto-play tour & phase stepper", path: "ideas-repo/src/pages/Lab.tsx", look: "'▶ Auto-play tour' / '❚❚ Pause tour' button; v1 / v2 / split modes", area: "ideas" },
  { concept: "Simulators behind the walkthroughs", path: "ideas-repo/src/lib/sims.ts", look: "the exact little simulations for the four projects", lesson: 4, area: "ideas" },
  { concept: "Project 1 — Symmetry-Resolved Mitigation", path: "ideas-repo/src/projects/Project1.tsx", look: "sliders: gate bit-flip, payload depth, readout error, ancilla miss probability", lesson: 6, area: "ideas" },
  { concept: "Project 2 — Non-Clifford ZNE", path: "ideas-repo/src/projects/Project2.tsx", look: "v1 global folding vs v2 layer-wise + Richardson/exponential", lesson: 8, area: "ideas" },
  { concept: "Project 3 — Hybrid QEM + Detection", path: "ideas-repo/src/projects/Project3.tsx", look: "combine mitigation with error detection", area: "ideas" },
  { concept: "Project 4 — Adaptive Conservation", path: "ideas-repo/src/projects/Project4.tsx", look: "soft reweighting that keeps every shot", lesson: 7, area: "ideas" },
  { concept: "Overview / Compare / Ideas / Playbook (ideas-repo)", path: "ideas-repo/src/pages/Compare.tsx", look: "side-by-side project comparison; also see Overview.tsx, Ideas.tsx, Playbook.tsx in the same folder", area: "ideas" },
];

export default function RepoMap() {
  const [q, setQ] = useState("");
  const [area, setArea] = useState<"all" | "main" | "ideas">("all");
  const rows = useMemo(
    () => MAP.filter((e) => (area === "all" || e.area === area) && (q.trim() === "" || `${e.concept} ${e.path} ${e.look}`.toLowerCase().includes(q.toLowerCase()))),
    [q, area],
  );
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-white">🗺️ Lesson-to-Code Map</h1>
        <p className="text-slate-300">Concept → exact file → what to look for. Paths come from the repo's real file tree (<code>main</code> branch). Click any file to open it on GitHub.</p>
      </header>
      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: scorecard, noise, tour, parity…" className="min-w-[220px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none" />
          {([["all", "All"], ["main", "Main app · src/"], ["ideas", "Walkthroughs · ideas-repo/"]] as const).map(([id, l]) => (
            <button key={id} onClick={() => setArea(id)} className={cn("rounded-lg border px-3 py-1.5 text-sm", area === id ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-600 text-slate-300")}>{l}</button>
          ))}
        </div>
      </Panel>
      <div className="space-y-2">
        {rows.map((e, i) => (
          <div key={e.path + e.concept + i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-slate-100">{e.concept}</div>
              {e.lesson && <a href={`#/lesson/${e.lesson}`} className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-200 hover:bg-cyan-400/20">Lesson {e.lesson} →</a>}
            </div>
            <FileChip path={e.path} />
            <div className="mt-1.5 text-xs text-slate-400">👀 {e.look}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="py-10 text-center text-slate-500">No matches. Try “noise” or “scorecard”.</div>}
      </div>
      <Callout tone="amber" icon="🐍" title="About the Python core">
        <p>Your brief mentions <code>fallfest-combined-infra/</code> with four Python projects. It isn't in the GitHub tree I could read (top level is <code>dist</code>, <code>ideas-repo</code>, <code>src</code> + config). The TypeScript ports reference their originals — <code>core/scorecard.py</code>, <code>core/budget_meter.py</code>, <code>core/stand_ins.py</code>, <code>experiments/run_all_practice.py</code>, <code>adaptive_conservation.py</code>. If you have them locally, run <code>experiments/run_all_practice.py</code> so the Python numbers match the prototype (the Playbook recommends exactly this).</p>
      </Callout>
      <Callout tone="slate" icon="🔬" title="How to explore any file quickly">
        <p>In the repo folder: <code>grep -rn "hardPostselect" src/</code> shows where a function is used. Or open the file on GitHub and press <kbd>t</kbd> for file search, <kbd>/</kbd> for in-file search. Paste unfamiliar code into Claude with “explain this like I'm new to React and to quantum”.</p>
      </Callout>
    </div>
  );
}
