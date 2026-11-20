import { useMemo, useState, type ReactNode } from 'react';
import { Badge, LineChart, Panel, Slider, Stat, f3, pct } from '../components/ui';
import { gauss, mulberry32 } from '../lib/rng';
import { vdZZ } from '../lib/sims';
import { cn } from '../utils/cn';

/* ---------------- demos ---------------- */
function VDDemo() {
  const [q, setQ] = useState(0.3);
  const [M, setM] = useState(2);
  const xs = Array.from({ length: 41 }, (_, i) => (0.6 * i) / 40);
  const colors = ['#fb7185', '#fbbf24', '#a78bfa', '#34d399'];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4">
        <Slider label="Depolarising noise q on the Bell pair" value={q} onChange={setQ} min={0} max={0.6} step={0.01} fmt={pct} />
        <Slider label="Copies M (virtual distillation)" value={M} onChange={setM} min={1} max={4} step={1} />
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Raw ⟨ZZ⟩ (M=1)" value={f3(vdZZ(q, 1))} tone="rose" />
          <Stat label={`VD  M=${M}`} value={f3(vdZZ(q, M))} tone="emerald" sub={`error ${f3(1 - vdZZ(q, M))}`} />
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          Exact: ρ = (1−q)|Φ⁺⟩⟨Φ⁺| + q·I/4, estimator = Tr(ρ^M·ZZ)/Tr(ρ^M) = (λ₁^M − b^M)/(λ₁^M + 3b^M). The error shrinks <i>exponentially in M</i> — but needs M copies of the state (M× qubits), the exact overhead Project 1 tries to avoid by using one copy and a
          symmetry check. The shootout: <b>same noise, which wins per qubit spent?</b>
        </p>
      </div>
      <LineChart
        series={[1, 2, 3, 4].map((m) => ({ name: `M = ${m}`, color: colors[m - 1], width: m === M ? 3 : 1.5, line: xs.map((x) => ({ x, y: vdZZ(x, m) })) }))}
        xDomain={[0, 0.6]}
        yDomain={[0.4, 1]}
        xLabel="noise strength q"
        yLabel="⟨ZZ⟩ estimate"
        markers={[{ x: q, y: vdZZ(q, M), color: '#f8fafc' }]}
        height={260}
      />
    </div>
  );
}

function OverheadDemo() {
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
    const maxN = (k: 'ps' | 'zne' | 'pec') => rows.filter((r) => r[k] <= budget).slice(-1)[0]?.N ?? 0;
    return { rows, ps: maxN('ps'), zne: maxN('zne'), pec: maxN('pec') };
  }, [eps, lam, sig, budget]);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4">
        <Slider label="2-qubit gate error ε" value={eps} onChange={setEps} min={0.001} max={0.01} step={0.0005} fmt={pct} />
        <Slider label="ZNE max noise factor λ" value={lam} onChange={setLam} min={3} max={9} step={2} />
        <Slider label="Target precision σ" value={sig} onChange={setSig} min={0.005} max={0.05} step={0.005} />
        <Slider label="Shot budget (log₁₀)" value={budget} onChange={setBudget} min={5} max={10} step={0.5} fmt={(v) => `10^${v}`} />
        <div className="grid grid-cols-3 gap-2">
          <Stat label="PS reaches" value={`${model.ps}`} sub="2q gates" tone="cyan" />
          <Stat label="ZNE reaches" value={`${model.zne}`} sub="2q gates" tone="amber" />
          <Stat label="PEC reaches" value={`${model.pec}`} sub="2q gates" tone="violet" />
        </div>
        <p className="text-xs leading-relaxed text-slate-400">Illustrative scaling model (not a measurement): PEC shots ∝ γ² = e^{'{4εN}'}, ZNE ∝ e^{'{2λεN}'} (extrapolating from the noisiest point), post-selection ∝ 1/retention. Exponential-in-depth sampling cost is a general feature of error mitigation — the
          dashboard makes it visible so your project states honestly <i>how deep</i> it works.</p>
      </div>
      <LineChart
        series={[
          { name: 'raw (biased!)', color: '#64748b', dashed: true, line: model.rows.map((r) => ({ x: r.N, y: r.raw })) },
          { name: 'post-selection', color: '#22d3ee', line: model.rows.map((r) => ({ x: r.N, y: r.ps })) },
          { name: 'ZNE', color: '#fbbf24', line: model.rows.map((r) => ({ x: r.N, y: r.zne })) },
          { name: 'PEC', color: '#a78bfa', line: model.rows.map((r) => ({ x: r.N, y: r.pec })) },
        ]}
        xDomain={[10, 400]}
        yDomain={[3, 12]}
        hlines={[{ y: budget, label: 'your shot budget', color: '#34d399' }]}
        xLabel="# two-qubit gates N"
        yLabel="log₁₀(shots needed)"
        height={280}
      />
    </div>
  );
}

function CDRDemo() {
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
    <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4">
        <Slider label="Noise attenuation a (noisy = a·ideal + b)" value={a} onChange={setA} min={0.3} max={1} step={0.01} />
        <Slider label="Systematic offset b" value={b} onChange={setB} min={-0.2} max={0.2} step={0.01} />
        <Slider label="Scatter σ (shot noise + model error)" value={s} onChange={setS} min={0} max={0.15} step={0.005} />
        <Slider label="# training circuits" value={n} onChange={setN} min={4} max={40} step={1} />
        <button onClick={() => setSeed((x) => x + 1)} className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200">
          ↻ new training set
        </button>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Target ideal" value="0.620" tone="emerald" sub="(unknown in practice)" />
          <Stat label="Noisy" value={f3(yStar)} tone="rose" />
          <Stat label="CDR" value={f3(mit)} tone="cyan" sub={`error ${f3(Math.abs(mit - 0.62))}`} />
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          Clifford Data Regression: classically simulate <i>near-Clifford</i> versions of your T-heavy circuit (cheap), run them on the QPU, learn the noisy→ideal map by regression, and apply it to the real circuit. Where Project 2 amplifies noise,
          this one <b>learns</b> it. Ideal for the non-Clifford case with no extra circuit depth.
        </p>
      </div>
      <LineChart
        series={[
          { name: 'identity (no noise)', color: '#64748b', dashed: true, line: [{ x: -1, y: -1 }, { x: 1, y: 1 }] },
          { name: `learned map  ideal = ${alpha.toFixed(2)}·noisy + ${beta.toFixed(2)}`, color: '#22d3ee', line: [-1, 1].map((x) => ({ x, y: alpha * x + beta })) },
          { name: 'training circuits', color: '#f8fafc', points: train.map((p) => ({ x: p.y, y: p.x })) },
        ]}
        xDomain={[-1, 1]}
        yDomain={[-1, 1]}
        xLabel="noisy QPU expectation"
        yLabel="ideal (classical sim)"
        markers={[
          { x: yStar, y: 0.62, color: '#34d399', label: 'truth' },
          { x: yStar, y: mit, color: '#22d3ee', label: 'CDR' },
        ]}
        xTicks={[-1, -0.5, 0, 0.5, 1]}
        height={280}
      />
    </div>
  );
}

/* ---------------- idea cards ---------------- */
function Meter({ label, v, tone }: { label: string; v: number; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
      {label}
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="h-1.5 w-4 rounded-full" style={{ background: i <= v ? tone : 'rgba(255,255,255,0.1)' }} />
        ))}
      </span>
    </div>
  );
}

interface Idea {
  id: string;
  title: string;
  hook: string;
  from: string;
  conf: 'repo' | 'inferred';
  improves: string;
  diff: number;
  nov: number;
  risk: number;
  body: string;
  plan: string[];
  deliver: string;
  color: string;
  demo?: ReactNode;
  demoTitle?: string;
}

const IDEAS: Idea[] = [
  {
    id: 'vd',
    title: 'Purification shootout: 1 copy + symmetry vs. M-copy virtual distillation',
    hook: 'Put Project 1 head-to-head with virtual purification on the same noise and plot error per qubit spent.',
    from: 'Iwaki et al. (virtual purification within a single state) — listed in repo for Project 1',
    conf: 'repo',
    improves: 'Project 1',
    diff: 3,
    nov: 4,
    risk: 2,
    color: '#22d3ee',
    body: 'Judges love a clear “which is better and when”. VD gives exponential suppression in M but needs M copies and a swap-test-like readout; symmetry post-selection needs one copy but only sees symmetry-violating errors. Map the crossover as a function of noise and qubit budget.',
    plan: ['0–3 h  exact density-matrix model for Bell/GHZ + depolarising noise (the demo →)', '3–8 h  Aer implementation of M=2 VD via Pauli-basis estimators (no swap test needed on 2–4 qubits)', '8–14 h  run both on the hackathon backend, measure error vs. qubits', '14–20 h  crossover plot + write-up'],
    deliver: 'Notebook + one decisive figure: error vs. total qubits for {raw, PS, VD-2, PS+VD}.',
    demoTitle: 'Interactive: exact virtual distillation on a depolarised Bell pair',
    demo: <VDDemo />,
  },
  {
    id: 'budget',
    title: 'Mitigation budget meter — “how deep can I honestly go?”',
    hook: 'A calculator + plot that turns a calibration (ε, readout, T1) into the max circuit depth each method can handle within a shot budget.',
    from: 'Quek et al. (limits of QEM sampling overhead) · Gambetta/IBM roadmap talk on utility-scale mitigation — inferred, please verify',
    conf: 'inferred',
    improves: 'All projects',
    diff: 2,
    nov: 3,
    risk: 1,
    color: '#fbbf24',
    body: 'Error mitigation costs grow exponentially with depth; a project that states its operating envelope is more credible than one that hides it. Turn this into a tool: feed in backend properties, get the “mitigation phase diagram”.',
    plan: ['0–2 h  fit decay rates from a quick RB/layer-fidelity or from backend.properties()', '2–6 h  overhead models per method (PEC γ², ZNE extrapolation variance, PS retention)', '6–12 h  validate on Aer with 3 circuit depths', '12–18 h  React/Streamlit dashboard'],
    deliver: 'Dashboard that outputs “use method X up to depth N” for the algorithm you receive.',
    demoTitle: 'Interactive: shots needed vs. circuit size (illustrative model)',
    demo: <OverheadDemo />,
  },
  {
    id: 'cdr',
    title: 'Clifford Data Regression for the T-heavy standard algorithm',
    hook: 'Replace folding with learning: regress noisy→ideal on cheaply-simulable near-Clifford twins of your circuit.',
    from: 'Layden — non-Clifford mitigation (repo, Project 2) · CDR is a known technique that suits exactly this regime',
    conf: 'inferred',
    improves: 'Project 2',
    diff: 3,
    nov: 3,
    risk: 2,
    color: '#a78bfa',
    body: 'No circuit lengthening, no extrapolation variance blow-up, and it is robust to T being a virtual gate because it learns the noise empirically. Requires the target circuit to be close enough to Clifford for training twins (replace most T by S/Z/I).',
    plan: ['0–3 h  generator: swap k of the T gates for nearest Clifford (S/Z/I) → training set', '3–6 h  stabiliser simulation (qiskit.quantum_info.StabilizerState) for ideal values', '6–12 h  run twins + target on QPU in one batch', '12–18 h  regression (linear / ridge) + CI by bootstrap', '18–22 h  compare to Project 2 v2 and Runtime ZNE'],
    deliver: 'Plot: noisy vs. ideal on training twins + learned map + target correction.',
    demoTitle: 'Interactive: learn the noise map',
    demo: <CDRDemo />,
  },
  {
    id: 'iceberg',
    title: 'Iceberg-style error detection around the hardest block',
    hook: 'A [[k+2, k, 2]] code detects both X and Z errors with just 2 extra qubits — the principled version of Project 3.',
    from: 'IBM Research — QEM/QEC continuum (repo, Project 3). Iceberg codes are the literature’s lightweight detect-and-post-select codes',
    conf: 'inferred',
    improves: 'Project 3',
    diff: 5,
    nov: 4,
    risk: 4,
    color: '#fb7185',
    body: 'The repetition code from Project 3 only guards Z-basis bit-flips. A k-qubit block encoded with two stabilisers (XX…X and ZZ…Z) plus two ancillas detects any single-qubit Pauli. Start with k=2 ([[4,2,2]]) and wrap just the noisiest layers.',
    plan: ['Hours 0–4  [[4,2,2]] encode/decode circuits & logical gates', '4–10  syndrome measurement with flag ancillas', '10–16  Aer noise model: Pauli X/Y/Z biased', '16–24  hardware run on 2-logical-qubit toy, retention vs. logical fidelity'],
    deliver: 'Logical-vs-physical fidelity plot with retention overlay; honest note on qubit overhead.',
  },
  {
    id: 'symexp',
    title: 'Ancilla-free symmetry expansion',
    hook: 'Use the symmetry without an ancilla and without discarding shots: combine Pauli expectation values over the symmetry group.',
    from: 'Zhenyu Cai — symmetry expansion (QEM via symmetries) — inferred from the linked profile, please verify',
    conf: 'inferred',
    improves: 'Project 1 (no spare qubit)',
    diff: 3,
    nov: 4,
    risk: 2,
    color: '#34d399',
    body: 'For a stabiliser group G, ⟨O⟩ ≈ Σ_g Tr(ρ·gO) / Σ_g Tr(ρ·g): measure each product gO (extra measurement bases, not extra qubits) and divide. Works when you cannot spare an ancilla — and keeps every shot. Pairs nicely with Project 4’s soft weights.',
    plan: ['0–3 h  derive G for the benchmark (e.g. {I, ZZ} for Bell, {I, XX, ZZ, −YY})', '3–8 h  measurement-basis circuits for each gO', '8–12 h  estimator + variance (watch the denominator!)', '12–18 h  compare to Project 1 v2 at equal shots'],
    deliver: 'Table: P1 ancilla vs. symmetry expansion — qubits, shots, error.',
  },
  {
    id: 'stack',
    title: 'Mitigation-stack autotuner',
    hook: 'Run a 10-minute calibration and automatically pick the cheapest stack from {dynamical decoupling, twirling, readout (TREX), ZNE, PEA/PEC, your post-selection}.',
    from: 'IBM Research/Gambetta context on Runtime resilience options — inferred',
    conf: 'inferred',
    improves: 'Meta-project',
    diff: 4,
    nov: 4,
    risk: 3,
    color: '#38bdf8',
    body: 'The track says “error mitigation techniques of their choice”. A principled selector that probes the device (idle decay, 2q-gate error, readout asymmetry) and chooses the stack — then validates on a known-answer circuit — is both robust and demonstrable.',
    plan: ['0–4 h  probe circuits: idle, echo, CZ-ladder, readout', '4–10 h  scoring rules (bias/variance/cost) per technique', '10–18 h  known-answer validation circuits (Clifford twins, mirror circuits)', '18–24 h  compare against Runtime default resilience levels'],
    deliver: 'One config file out, one comparison table: default vs. autotuned.',
  },
  {
    id: 'scorecard',
    title: 'Fair-fight scorecard: mitigation vs. post-selection',
    hook: 'One metric that doesn’t let post-selection cheat: error × √(shots spent per retained shot), plus a “P(target)” audit.',
    from: 'Marchenkova — mitigation vs. post-selection distinction (repo, Project 4)',
    conf: 'repo',
    improves: 'All projects',
    diff: 1,
    nov: 3,
    risk: 1,
    color: '#f472b6',
    body: 'Hard post-selection can report a perfect “P(HW=2)=1.0” by construction. A scorecard that normalises by QPU shots consumed, shows ESS, and includes a trivially-gameable-metric warning makes every project’s result trustworthy — and gives you a ready-made “results” slide.',
    plan: ['0–2 h  define metrics: bias, σ, retention, QPU-seconds, effective shots', '2–6 h  implement as a function of (counts, shots, method)', '6–10 h  wire into all four project folders', '10–12 h  summary plot'],
    deliver: 'One scorecard figure + a metrics.py that all projects share.',
  },
];

export default function Ideas() {
  const [open, setOpen] = useState<string | null>('vd');
  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-10">
      <h2 className="text-3xl font-bold text-white">New ideas, built from the resources</h2>
      <p className="mt-2 max-w-3xl text-slate-300">Seven directions that extend your four projects. Three have a working interactive demo. Each card lists effort, novelty, risk and a rough time-boxed plan for the hackathon.</p>

      <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
        <b>Transparency on sources.</b> I could not open the X/Twitter links (they require a login), so I haven’t quoted any post. Attributions marked <Badge tone="emerald">repo</Badge> come from the “Inspired by” lines in your README; <Badge tone="amber">inferred</Badge> ones are
        my mapping from each author’s known work — please verify against the posts before you cite them.
      </div>

      <div className="mt-8 space-y-4">
        {IDEAS.map((idea, i) => {
          const isOpen = open === idea.id;
          return (
            <div key={idea.id} className={cn('overflow-hidden rounded-2xl border transition', isOpen ? 'border-white/25 bg-slate-900/80' : 'border-white/10 bg-slate-900/50')}>
              <button onClick={() => setOpen(isOpen ? null : idea.id)} className="flex w-full items-start gap-4 p-5 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold" style={{ background: idea.color + '22', color: idea.color }}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{idea.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{idea.hook}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="cyan">improves: {idea.improves}</Badge>
                    {idea.demo && <Badge tone="emerald">▶ live demo</Badge>}
                    <Badge tone={idea.conf === 'repo' ? 'emerald' : 'amber'}>{idea.conf === 'repo' ? 'attribution: repo' : 'attribution: inferred'}</Badge>
                  </div>
                </div>
                <div className="hidden w-44 shrink-0 space-y-1 sm:block">
                  <Meter label="effort" v={idea.diff} tone="#38bdf8" />
                  <Meter label="novelty" v={idea.nov} tone="#a78bfa" />
                  <Meter label="risk" v={idea.risk} tone="#fb7185" />
                </div>
                <span className="mt-1 text-slate-500">{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div className="space-y-5 border-t border-white/10 p-5">
                  <p className="max-w-3xl text-sm leading-relaxed text-slate-300">{idea.body}</p>
                  <div className="text-xs text-slate-500">
                    <b className="text-slate-400">Source / inspiration:</b> {idea.from}
                  </div>
                  {idea.demo && (
                    <Panel title={idea.demoTitle}>
                      {idea.demo}
                    </Panel>
                  )}
                  <div className="grid gap-5 lg:grid-cols-2">
                    <Panel title="Time-boxed plan">
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {idea.plan.map((p) => (
                          <li key={p} className="flex gap-2">
                            <span style={{ color: idea.color }}>▸</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </Panel>
                    <Panel title="What you hand to the judges">
                      <p className="text-sm text-slate-300">{idea.deliver}</p>
                    </Panel>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Panel title="My suggested weekend combo" className="mt-10">
        <div className="grid gap-4 text-sm text-slate-300 md:grid-cols-3">
          <div>
            <div className="font-semibold text-white">1 · Baseline + scorecard</div>
            <p className="mt-1 text-xs text-slate-400">Run the organisers’ algorithm raw, with Runtime default resilience, and with readout mitigation. Everything is judged against this (idea 7).</p>
          </div>
          <div>
            <div className="font-semibold text-white">2 · One v2 project as your main contribution</div>
            <p className="mt-1 text-xs text-slate-400">Whichever the decision helper picks. Keep its honest limitations on your slide.</p>
          </div>
          <div>
            <div className="font-semibold text-white">3 · One “wow” extension</div>
            <p className="mt-1 text-xs text-slate-400">The budget meter (idea 2) is the cheapest; CDR (idea 3) is the strongest for T-heavy circuits.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
