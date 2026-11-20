/**
 * meta.ts — static project data + TS ports of core/stand_ins.py, core/scorecard.py, core/budget_meter.py.
 * Nothing here is circuit-specific: the stand-ins are only *examples* to practise with.
 */
import type { Experiment, Law, MethodStat, NoiseConfig } from "./simulator";
import { gapClosed, gapClosedTvd } from "./simulator";

/* ================================================================== projects */

export interface Project {
  id: 1 | 2 | 3 | 4;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  inspiration: string;
  bestWhen: string[];
  v1: string;
  v2: string;
  judgeTakeaway: string;
  status: string;
  inPrototype: boolean;
}

export const PROJECTS: Project[] = [
  {
    id: 1,
    name: "Symmetry-Resolved",
    icon: "🪞",
    color: "#22d3ee",
    tagline: "Measure the symmetry sector, then mitigate inside each sector separately.",
    inspiration: "Symmetry verification / symmetry-expansion line of work (@zhenyu_cai) — inferred",
    bestWhen: [
      "The algorithm has a clear global symmetry (Z2 parity, U(1) number, spatial)",
      "You can afford a few extra measurement settings",
      "A spare ancilla would make symmetry checks cheap",
    ],
    v1: "Post-select on the symmetry sector",
    v2: "Per-sector readout + gate-error calibration",
    judgeTakeaway: "Shows you understand *why* symmetry carries information noise destroys.",
    status: "Sketched — reuse the Lab's conservation selector as the sector label.",
    inPrototype: false,
  },
  {
    id: 2,
    name: "Non-Clifford ZNE",
    icon: "📈",
    color: "#a78bfa",
    tagline: "Zero-noise extrapolation that stays honest when T / arbitrary rotations are present.",
    inspiration: "Noise-amplification / PEA-style ideas (@layden_variable, @IBMResearch) — inferred",
    bestWhen: [
      "T gates or arbitrary-angle rotations dominate (Clifford tricks don't apply)",
      "Circuit is shallow-to-medium (amplified noise stays below the wall)",
      "QPU time is NOT the bottleneck (≥3× shots)",
    ],
    v1: "Global unitary folding, λ = 1, 2, 3, linear fit",
    v2: "Layer-wise amplification + Richardson / exponential fit with error bars",
    judgeTakeaway: "Standard tool — shine by reporting bias/variance honestly.",
    status: "Sketched — ZNE row appears in the Budget Meter for cost comparison.",
    inPrototype: false,
  },
  {
    id: 3,
    name: "Hybrid QEM + Detection",
    icon: "🛡️",
    color: "#34d399",
    tagline: "Detect errors with a tiny code on spare qubits, then mitigate what slips through.",
    inspiration: "Error-detection codes + mitigation hybrids (@IBMResearch, @jaygambetta) — inferred",
    bestWhen: [
      "Spare ancillas are available on the device",
      "Circuit depth is moderate (detection overhead is amortised)",
      "You can tolerate ~15–30% shot loss for a big accuracy gain",
    ],
    v1: "Repetition / [[k+2,k,2]]-style detection, post-select on clean syndromes",
    v2: "Syndrome-weighted reweighting + readout mitigation",
    judgeTakeaway: "Bridges mitigation and QEC — credible narrative toward fault tolerance.",
    status: "Sketched — 'Repetition-code QEC' row appears in the Budget Meter.",
    inPrototype: false,
  },
  {
    id: 4,
    name: "Adaptive Conservation",
    icon: "📊",
    color: "#f472b6",
    tagline: "Soft-reweight every shot by conservation-law likelihood — no exponential throwaway.",
    inspiration: "Error mitigation vs post-selection distinction (@amarchenkova)",
    bestWhen: [
      "Output has fixed Hamming weight / particle number",
      "Circuit is deep — hard post-selection retention collapses",
      "You want to use every shot",
    ],
    v1: "Hard Hamming-weight post-selection",
    v2: "Soft Bayesian reweighting",
    judgeTakeaway: "Know the limits of post-selection; shows credibility.",
    status: "Fully implemented in this prototype (Lab + Compare).",
    inPrototype: true,
  },
];

/* ================================================================== decision helper */

export interface Traits {
  tGates: boolean;
  symmetry: boolean;
  fixedWeight: boolean;
  ancillas: boolean;
  depth: 1 | 2 | 3; // shallow / medium / deep
  qpuTight: boolean;
}

export const DEFAULT_TRAITS: Traits = {
  tGates: false, symmetry: false, fixedWeight: false, ancillas: false, depth: 2, qpuTight: false,
};

interface Contribution {
  label: string;
  delta: number;
}

/** Score 1–4 per project from algorithm traits, with the reasons that moved it. */
export function scoreProjects(t: Traits): { project: Project; score: 1 | 2 | 3 | 4; raw: number; reasons: Contribution[] }[] {
  const depthName = ["", "shallow", "medium", "deep"][t.depth];
  const rows = PROJECTS.map((project) => {
    const r: Contribution[] = [];
    const add = (cond: boolean, label: string, delta: number) => {
      if (cond) r.push({ label, delta });
    };
    switch (project.id) {
      case 1:
        add(t.symmetry, "A conserved symmetry is exactly what this project resolves", 1.3);
        add(t.fixedWeight, "Fixed weight is a U(1) sector", 0.4);
        add(t.ancillas, "Spare ancillas make symmetry checks cheap", 0.5);
        add(t.depth === 3, "Deep circuits shrink the surviving sector", -0.3);
        add(t.qpuTight, "Extra settings cost QPU time", -0.3);
        add(!t.symmetry, "No symmetry → nothing to resolve", -0.6);
        break;
      case 2:
        add(t.tGates, "Non-Clifford gates: ZNE still works where Clifford tricks fail", 1.5);
        add(t.depth === 1, "Shallow circuit: amplified noise stays tolerable", 0.5);
        add(t.depth === 3, "Deep circuit: noise amplification hits the wall", -0.9);
        add(t.qpuTight, "ZNE needs ≥3× shots", -1.0);
        add(!t.qpuTight, "QPU time is available for extra noise factors", 0.3);
        break;
      case 3:
        add(t.ancillas, "Spare ancillas host the detection code", 1.4);
        add(!t.ancillas, "No spare qubits → detection code is awkward", -0.8);
        add(t.depth === 2, "Medium depth amortises detection overhead", 0.4);
        add(t.depth === 3, "Deep circuit: syndrome retention collapses", -0.4);
        add(t.tGates, "Handles arbitrary gates (code is gate-agnostic)", 0.3);
        add(t.symmetry, "Symmetry checks double as detection", 0.3);
        add(t.qpuTight, "Detection costs shots", -0.5);
        break;
      case 4:
        add(t.fixedWeight, "Fixed Hamming weight: the ideal use-case", 1.6);
        add(t.symmetry && !t.fixedWeight, "Parity-type law still gives a usable constraint", 0.8);
        add(t.depth === 3, "Deep circuit: soft weights beat hard post-selection's exponential wall", 0.7);
        add(t.depth === 1, "Shallow: hard post-selection already retains most shots", -0.3);
        add(t.qpuTight, "Needs only ~2 jobs, 0 extra qubits, 100% retention", 0.6);
        add(!t.symmetry && !t.fixedWeight, "No conservation law → reduces to readout-only", -1.4);
        break;
    }
    const raw = 1.8 + r.reduce((a, c) => a + c.delta, 0);
    const score = Math.max(1, Math.min(4, Math.round(raw))) as 1 | 2 | 3 | 4;
    return { project, score, raw, reasons: r };
  });
  void depthName;
  return rows;
}

/* ================================================================== stand-in circuits (core/stand_ins.py) */

export interface StandIn {
  id: string;
  label: string;
  short: string;
  description: string;
  law: Law;
  observable: string;
  referenceIdeal: number | null; // value hard-coded in stand_ins.py (the app recomputes the true ideal)
  note?: string;
  code: string;
}

export const STAND_INS: StandIn[] = [
  {
    id: "ghz",
    label: "GHZ state",
    short: "GHZ",
    description: "GHZ state — parity (mixed even/odd). Reference ideal = 0.5.",
    law: { kind: "parity-even", k: 0 },
    observable: "parity",
    referenceIdeal: 0.5,
    note: "3-qubit GHZ is (|000⟩+|111⟩)/√2 — |111⟩ is odd parity, so even-parity post-selection discards real signal. A good example of the law NOT being conserved: ",
code: `# GHZ state — parity conservation (reference: stand_ins.ghz_circuit)\nn = 3\nqc = QuantumCircuit(n, n)\nqc.h(0)\nfor i in range(n - 1):\n    qc.cx(i, i + 1)\nqc.measure_all()\n`,
  },
  {
    id: "bell",
    label: "Bell state",
    short: "Bell",
    description: "Bell state — even parity conservation. Reference ideal = 1.0.",
    law: { kind: "parity-even", k: 0 },
    observable: "parity",
    referenceIdeal: 1.0,
    code: `# Bell state — even parity (reference: stand_ins.bell_state)\nqc = QuantumCircuit(2, 2)\nqc.h(0)\nqc.cx(0, 1)\nqc.measure_all()\n`,
  },
  {
    id: "trotter",
    label: "Trotter step (T gates)",
    short: "Trotter",
    description: "Trotter step — Clifford + T gates, no conservation law. Metric: P(q0 = 0).",
    law: { kind: "none", k: 0 },
    observable: "z0",
    referenceIdeal: 0.5,
    note: "With no conservation law, adaptive reweighting has nothing to exploit and reduces to readout mitigation — an honest negative control.",
    code: `# Trotter step with T gates — no conservation law (reference: stand_ins.trotter_step)\nn = 3\nqc = QuantumCircuit(n, n)\nfor i in range(n):\n    qc.h(i)\n    qc.t(i)\nfor i in range(n - 1):\n    qc.cx(i, i + 1)\nfor i in range(n):\n    qc.rz(0.3, i)\nfor i in range(n):\n    qc.h(i)\nqc.measure_all()\n`,
  },
  {
    id: "vqe",
    label: "Fixed-weight VQE (weight = 2)",
    short: "VQE w=2",
    description: "Fixed-weight VQE ansatz — Hamming weight = 2, built from weight-conserving XX+YY rotations.",
    law: { kind: "weight", k: 2 },
    observable: "hamming_weight",
    referenceIdeal: 1.0,
    note: "Uses exp(-iθ(XX+YY)/2) interactions, which provably conserve excitation number. The Python reference ansatz (H·CX·CZ·CX·H) does NOT — see the next stand-in.",
    code: `# Fixed-weight VQE ansatz — weight-conserving XX+YY interactions, weight = 2\nn = 4\ntarget_weight = 2\nqc = QuantumCircuit(n, n)\nfor i in range(target_weight):\n    qc.x(i)\ntheta = [0.7, 0.4, 1.1]\nfor i in range(n - 1):\n    qc.rxx(theta[i], i, i + 1)\n    qc.ryy(theta[i], i, i + 1)\nqc.measure_all()\n`,
  },
  {
    id: "vqe-ref",
    label: "VQE — reference gates (⚠ not conserving)",
    short: "VQE ref ⚠",
    description: "Exactly the gate sequence in stand_ins.fixed_weight_vqe. Simulation shows it does not conserve Hamming weight.",
    law: { kind: "weight", k: 2 },
    observable: "hamming_weight",
    referenceIdeal: 1.0,
    note: "Ideal P(weight = 2) is ≈ 0.375, not the hard-coded 1.0 — the H·CX·CZ·CX·H block mixes weight sectors. Use this to see the 'law violated by the ideal' warning and why hard post-selection then discards real signal.",
    code: `# Reference fixed_weight_vqe gates, verbatim. NOT weight-conserving (see note).\nn = 4\nqc = QuantumCircuit(n, n)\nfor i in range(2):\n    qc.x(i)\nfor i in range(n - 1):\n    qc.h(i)\n    qc.h(i + 1)\n    qc.cx(i, i + 1)\n    qc.cz(i, i + 1)\n    qc.cx(i, i + 1)\n    qc.h(i)\n    qc.h(i + 1)\nqc.measure_all()\n`,
  },
];

export const PHASES = [
  { id: "problem", label: "Problem", blurb: "What must the output satisfy?" },
  { id: "circuit", label: "Circuit", blurb: "Plug in any circuit" },
  { id: "noisy", label: "Noisy Run", blurb: "Hardware-like noise" },
  { id: "mitigate", label: "Mitigate", blurb: "v1 hard vs v2 soft" },
  { id: "results", label: "Results", blurb: "Before → after" },
  { id: "plan", label: "Hackathon Plan", blurb: "What to run on the QPU" },
] as const;

/* ================================================================== budget meter (core/budget_meter.py) */

export interface MethodCost {
  name: string;
  extraQubits: number;
  extraJobs: number; // reference field name: extra_jobs (counts total jobs incl. baseline)
  extraShotsFactor: number;
  qpuSeconds: number;
  retentionPct: number;
  notes: string;
  derived?: boolean; // not in the Python reference
  ours?: boolean;
}

/** Faithful port of build_budget_meter(): same numbers, same order. */
export function buildBudgetMeter(baseShots = 4096): MethodCost[] {
  const base = 2.0 + (baseShots / 1000) * 0.5;
  return [
    { name: "Raw (unmitigated)", extraQubits: 0, extraJobs: 1, extraShotsFactor: 1, qpuSeconds: base, retentionPct: 100, notes: "Baseline. No mitigation." },
    { name: "Readout-only mitigation", extraQubits: 0, extraJobs: 2, extraShotsFactor: 1, qpuSeconds: base * 1.8, retentionPct: 100, notes: "1 calibration circuit" },
    { name: "Adaptive Conservation (ours)", extraQubits: 0, extraJobs: 2, extraShotsFactor: 1, qpuSeconds: base * 1.8, retentionPct: 100, notes: "Soft reweighting; no shot discard", ours: true },
    { name: "ZNE (λ=1,2,3)", extraQubits: 0, extraJobs: 3, extraShotsFactor: 3, qpuSeconds: base * 3.5, retentionPct: 100, notes: "3 circuit executions + readout calibration" },
    { name: "Repetition-code QEC", extraQubits: 2, extraJobs: 2, extraShotsFactor: 1, qpuSeconds: base * 2.2, retentionPct: 85, notes: "Post-select on clean syndrome; retention drops with noise" },
  ];
}

/** Adds the one row the Python meter lacks — hard post-selection — using the *measured* retention. */
export function budgetWithHardPS(baseShots: number, measuredRetention: number): MethodCost[] {
  const rows = buildBudgetMeter(baseShots);
  const base = 2.0 + (baseShots / 1000) * 0.5;
  const hard: MethodCost = {
    name: "Hard post-selection (v1)",
    extraQubits: 0,
    extraJobs: 1,
    extraShotsFactor: 1,
    qpuSeconds: base,
    retentionPct: measuredRetention * 100,
    notes: "Retention measured from this simulation; shots discarded are wasted QPU time",
    derived: true,
  };
  rows.splice(1, 0, hard);
  return rows;
}

/** QPU seconds needed per full-weight shot kept — the fair comparison for post-selection. */
export function secondsPerEffectiveShot(c: MethodCost, shots: number): number {
  const eff = (shots * c.extraShotsFactor * c.retentionPct) / 100;
  return eff > 0 ? c.qpuSeconds / eff : Infinity;
}

/* ================================================================== scorecard (core/scorecard.py) */

export interface ScorecardRow {
  method: string;
  observableValue: number;
  se: number;
  idealValue: number;
  error: number;
  gapClosedPct: number | null;
  tvd: number;
  tvdGapClosedPct: number | null;
  qpuJobs: number;
  qpuSecondsEstimate: number;
  shots: number;
  retentionPct: number;
  notes: string;
  ours?: boolean;
  reference: boolean; // appears in the Python scorecard
}

export function buildScorecard(e: Experiment, cfg: NoiseConfig): ScorecardRow[] {
  const ideal = e.ideal.value;
  const baseSec = Math.max(1, (cfg.shots / 1000) * 0.5); // scorecard.py formula
  const mk = (
    method: string, s: MethodStat, jobs: number, sec: number, notes: string, reference: boolean, ours = false, retention = s.retention,
  ): ScorecardRow => ({
    method,
    observableValue: s.value,
    se: s.se,
    idealValue: ideal,
    error: Math.abs(s.value - ideal),
    gapClosedPct: gapClosed(e.raw.value, s.value, ideal),
    tvd: s.tvd,
    tvdGapClosedPct: gapClosedTvd(e.raw.tvd, s.tvd),
    qpuJobs: jobs,
    qpuSecondsEstimate: sec,
    shots: cfg.shots,
    retentionPct: retention * 100,
    notes,
    reference,
    ours,
  });
  return [
    mk("Raw (unmitigated)", e.raw, 1, baseSec, "No mitigation applied", true),
    mk("Runtime Defaults (readout + twirling + DD)", e.runtime, 1, baseSec, "Qiskit Runtime resilience_level=1 approximation (readout mitigation on an independent run)", true),
    mk("Adaptive Conservation (ours)", e.adaptive, 2, baseSec * 2, e.noEffect ? "No conservation law selected → reduces to readout-only" : "Soft reweighting via confusion matrix; no shot discard", true, true, 1),
    mk("Readout-only mitigation", e.readout, 2, baseSec * 2, "Confusion-matrix inversion on the raw counts", false),
    mk("Hard post-selection (v1)", e.hardPS, 1, baseSec, "Value = kept fraction (≡ raw by construction); benefit shows in TVD column", false, false, e.hardKept),
  ];
}

export function scorecardToJSON(rows: ScorecardRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      method: r.method, observable_value: r.observableValue, std_error: r.se, ideal_value: r.idealValue, error: r.error,
      gap_closed_pct: r.gapClosedPct, tvd_to_ideal: r.tvd, qpu_jobs: r.qpuJobs, qpu_seconds_estimate: r.qpuSecondsEstimate,
      shots: r.shots, retention_pct: r.retentionPct, notes: r.notes,
    })),
    null,
    2,
  );
}

export function scorecardToCSV(rows: ScorecardRow[]): string {
  const head = ["method", "observable_value", "std_error", "ideal_value", "error", "gap_closed_pct", "tvd_to_ideal", "qpu_jobs", "qpu_seconds_estimate", "shots", "retention_pct", "notes"];
  const esc = (v: string | number | null) => (typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v ?? "");
  const lines = rows.map((r) =>
    [r.method, r.observableValue, r.se, r.idealValue, r.error, r.gapClosedPct, r.tvd, r.qpuJobs, r.qpuSecondsEstimate, r.shots, r.retentionPct, r.notes].map(esc).join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

/* ================================================================== new ideas */

export interface Idea {
  id: number;
  title: string;
  icon: string;
  pitch: string;
  effort: number; // 1–5
  novelty: number;
  risk: number;
  sources: { handle: string; why: string; confidence: "stated" | "inferred" | "unverified" }[];
  timebox: { slot: string; task: string }[];
  deliverables: string[];
  builtHere?: string;
}

export const IDEAS: Idea[] = [
  {
    id: 1,
    title: "Sampling-Overhead Wall Calculator",
    icon: "🧱",
    pitch: "Interactive proof of *when mitigation must fail*: plot the exponential shot cost of ZNE/PEC/post-selection vs depth for the measured noise level, and mark where your method stays flat.",
    effort: 2, novelty: 3, risk: 1,
    sources: [
      { handle: "@quekpottheories", why: "Limits-of-error-mitigation framing (sample cost grows exponentially with depth)", confidence: "inferred" },
      { handle: "@zhenyu_cai", why: "Mitigation taxonomy / cost comparison across methods", confidence: "inferred" },
    ],
    timebox: [
      { slot: "0:00–0:30", task: "Pick cost models: post-selection e^{λ·gates}, PEC γ^{2·depth}, ZNE variance blow-up" },
      { slot: "0:30–1:30", task: "Reuse the Lab's sweep to get λ per gate from measured fault-free probability" },
      { slot: "1:30–2:30", task: "Plot cost vs depth; overlay adaptive-conservation flat line" },
      { slot: "2:30–3:00", task: "One-slide takeaway: 'where each method hits the wall'" },
    ],
    deliverables: ["Log-scale cost-vs-depth chart", "Table of 'max useful depth' per method", "One honest-limits slide"],
    builtHere: "Partly: Compare → retention vs noise sweep shows the post-selection wall.",
  },
  {
    id: 2,
    title: "Budget Meter (Idea 2)",
    icon: "⏱️",
    pitch: "Make cost transparent: extra qubits, jobs, shots, QPU seconds and shot retention for every method, with seconds-per-effective-shot as the fair comparison.",
    effort: 1, novelty: 2, risk: 1,
    sources: [
      { handle: "@jaygambetta", why: "Utility-era emphasis on cost-aware, scalable workflows", confidence: "inferred" },
    ],
    timebox: [
      { slot: "0:00–0:20", task: "Fill the budget table from the event's actual QPU time limits" },
      { slot: "0:20–1:00", task: "Measure real job time from Runtime job metrics (usage.quantum_seconds)" },
      { slot: "1:00–1:30", task: "Replace estimates with measured values; export JSON" },
    ],
    deliverables: ["Budget table + bar chart", "Measured vs estimated QPU seconds", "Seconds-per-effective-shot column"],
    builtHere: "Implemented: Compare → Budget Meter.",
  },
  {
    id: 3,
    title: "Judge's Scorecard (Idea 7)",
    icon: "🏁",
    pitch: "Prove your method beats both 'do nothing' and Qiskit Runtime's default resilience on the same circuit, same shots, with error bars and gap-closed %.",
    effort: 2, novelty: 2, risk: 2,
    sources: [
      { handle: "@IBMResearch", why: "Benchmarking against the platform's default resilience options", confidence: "inferred" },
    ],
    timebox: [
      { slot: "0:00–0:30", task: "Define one headline observable agreed with organisers" },
      { slot: "0:30–1:30", task: "Run raw + resilience_level=1 + ours on the real backend" },
      { slot: "1:30–2:00", task: "Compute error bars (bootstrap) and gap-closed %" },
    ],
    deliverables: ["Scorecard table (CSV/JSON)", "Bar chart raw → Runtime → ours → ideal", "Methodology footnote"],
    builtHere: "Implemented: Compare → Scorecard, with CSV/JSON export.",
  },
  {
    id: 4,
    title: "Symmetry Expansion Lite",
    icon: "🧬",
    pitch: "Project the noisy state onto the symmetric subspace by averaging over symmetry operators — a middle path between hard post-selection and full mitigation.",
    effort: 3, novelty: 4, risk: 3,
    sources: [
      { handle: "@zhenyu_cai", why: "Symmetry-expansion style mitigation", confidence: "inferred" },
      { handle: "@amarchenkova", why: "Mitigation vs post-selection distinction (user-provided)", confidence: "stated" },
    ],
    timebox: [
      { slot: "0:00–0:45", task: "List symmetry generators of the revealed algorithm" },
      { slot: "0:45–2:00", task: "Measure expectation of each generator on hardware; build the projector weights" },
      { slot: "2:00–3:00", task: "Compare against hard and soft post-selection on the scorecard" },
    ],
    deliverables: ["Symmetry-sector table", "Observable estimates ± error", "Comparison with v1/v2"],
  },
  {
    id: 5,
    title: "Noise-Amplification Sweep (PEA-lite)",
    icon: "📡",
    pitch: "Instead of unitary folding, amplify the *learned* noise by controlled factors and extrapolate — then show how bad the extrapolation gets when the noise model is wrong.",
    effort: 4, novelty: 4, risk: 4,
    sources: [
      { handle: "@layden_variable", why: "Probabilistic error amplification / learned Pauli noise", confidence: "inferred" },
      { handle: "@IBMResearch", why: "Runtime options for noise amplification", confidence: "inferred" },
    ],
    timebox: [
      { slot: "0:00–1:00", task: "Check which Runtime resilience options expose noise factors" },
      { slot: "1:00–2:30", task: "Run factors 1, 1.5, 2, 3; fit linear + exponential" },
      { slot: "2:30–3:30", task: "Report extrapolation bias vs model choice" },
    ],
    deliverables: ["Extrapolation plot with both fits", "Bias/variance table", "Recommendation slide"],
  },
  {
    id: 6,
    title: "Calibration-Aware Layout + DD Picker",
    icon: "🎯",
    pitch: "Pick physical qubits and a dynamical-decoupling sequence using live backend properties, then show the free accuracy gain before any mitigation is applied.",
    effort: 2, novelty: 2, risk: 2,
    sources: [
      { handle: "@atsushi_iwaki_", why: "Hardware-aware compilation / layout selection — attribution UNVERIFIED, please confirm before citing", confidence: "unverified" },
    ],
    timebox: [
      { slot: "0:00–0:30", task: "Pull backend.target error rates and T1/T2" },
      { slot: "0:30–1:30", task: "Score candidate layouts; transpile at optimization_level=3" },
      { slot: "1:30–2:30", task: "A/B on QPU: default layout vs picked layout; with/without DD" },
    ],
    deliverables: ["Layout score table", "A/B results with error bars", "Recommended Runtime options block"],
  },
  {
    id: 7,
    title: "'Mitigation ≠ Correction' Explainer",
    icon: "🎬",
    pitch: "A 90-second visual story: what noise does to a distribution, what post-selection throws away, what soft weights keep — judges and the public remember stories.",
    effort: 2, novelty: 3, risk: 1,
    sources: [
      { handle: "@SciTechera", why: "Public-facing science communication style", confidence: "unverified" },
      { handle: "@amarchenkova", why: "Mitigation vs post-selection distinction (user-provided)", confidence: "stated" },
    ],
    timebox: [
      { slot: "0:00–0:30", task: "Storyboard 5 frames: ideal → noisy → post-select → soft → compare" },
      { slot: "0:30–1:30", task: "Export Lab histograms as SVG; animate with CSS" },
      { slot: "1:30–2:00", task: "Record voice-over / rehearse the 3-minute pitch" },
    ],
    deliverables: ["5-frame explainer", "Shareable GIF/video", "Pitch backup slide"],
  },
];

export const ATTRIBUTION_NOTE =
  "Handles are inspiration pointers supplied in the brief. The specific claims each person made were NOT verified by this prototype — confirm on their feeds / papers before putting a name on a slide.";
