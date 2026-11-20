import { useMemo, useState } from 'react';
import { PROJECTS } from '../lib/meta';
import { Badge, Panel } from '../components/ui';
import { cn } from '../utils/cn';

const FEATURES = [
  { id: 'nc', label: 'Many T / Toffoli / arbitrary-angle gates' },
  { id: 'sym', label: 'A parity / particle-number / stabiliser symmetry is conserved' },
  { id: 'hw', label: 'Output is fixed Hamming weight (chemistry-like)' },
  { id: 'anc', label: 'I can spare ≥ 2 well-connected extra qubits' },
  { id: 'deep', label: 'Circuit is deep (≳ 40 two-qubit layers)' },
  { id: 'time', label: 'QPU time is tight (only a few jobs)' },
] as const;
type F = (typeof FEATURES)[number]['id'];

function score(sel: Record<F, boolean>) {
  const why: string[][] = [[], [], [], []];
  const s = [10, 10, 10, 10];
  const add = (i: number, v: number, w: string) => {
    s[i] += v;
    why[i].push(`${v > 0 ? '+' : ''}${v} ${w}`);
  };
  if (sel.sym) {
    add(0, 40, 'symmetry exists');
    add(3, 15, 'symmetry exists');
    add(2, 5, 'symmetry helps');
  }
  if (sel.hw) {
    add(3, 45, 'fixed Hamming weight');
    add(0, 10, 'weight = parity-like check');
  }
  if (sel.nc) {
    add(1, 50, 'non-Clifford gates present');
  }
  if (sel.anc) {
    add(2, 40, 'spare ancillas');
    add(0, 15, 'ancilla available');
  } else {
    add(3, 15, 'needs no ancilla');
    add(1, 5, 'needs no ancilla');
  }
  if (sel.deep) {
    add(0, -20, 'deep → exponential discard');
    add(2, -25, 'ancilla noise accumulates');
    add(1, -10, 'folding makes it deeper still');
    add(3, 10, 'soft weights avoid exponential discard');
  } else {
    add(2, 15, 'shallow → codes pay off');
  }
  if (sel.time) {
    add(1, -20, 'needs ≥3 folded jobs');
    add(0, 10, 'single job');
    add(3, 10, 'single job + 1 calibration');
  }
  return s.map((v, i) => ({ id: i + 1, score: Math.max(0, Math.min(100, v)), why: why[i] }));
}

export default function Overview({ go }: { go: (page: string, project?: number) => void }) {
  const [sel, setSel] = useState<Record<F, boolean>>({ nc: false, sym: true, hw: false, anc: true, deep: false, time: false });
  const ranked = useMemo(() => score(sel).sort((a, b) => b.score - a.score), [sel]);
  const top = PROJECTS[ranked[0].id - 1];

  const stack = (() => {
    if (sel.sym && sel.hw) return 'Project 4 (soft weights) + Project 1 (parity ancilla) — same conservation law, two ways to use it. Readout-calibrate once and share it.';
    if (sel.nc && sel.anc) return 'Project 2 (fold CX/T) for the coherent+gate noise, then Project 3 detection around the most error-prone block.';
    if (sel.nc) return 'Project 2 (v2: fold entangling gates, exponential fit) + readout mitigation. Add Pauli twirling first.';
    if (sel.anc) return 'Project 3 (gated decode) + readout mitigation.';
    return 'Readout mitigation + Project 4 style soft symmetry weights; add ZNE only if you can afford extra jobs.';
  })();

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(60% 60% at 20% 20%, #22d3ee33, transparent), radial-gradient(50% 50% at 85% 10%, #a78bfa33, transparent)' }} />
        <div className="relative mx-auto max-w-[1200px] px-6 py-16 sm:py-24">
          <div className="flex flex-wrap gap-2">
            <Badge tone="cyan">Qiskit Fall Fest 2026</Badge>
            <Badge tone="violet">Track: Error Mitigation</Badge>
            <Badge>20–21 Nov · CWI & House of Watt, Amsterdam</Badge>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-white sm:text-6xl">
            Four error-mitigation projects, <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">made tangible.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Step through every phase of each project from your repo — problem, circuit, noisy run, mitigation, results, hackathon-day plan — with live noise knobs. Then flip to the improved <b className="text-emerald-300">v2</b> versions and compare before vs. after.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => go('lab', 1)} className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_30px_#22d3ee55] hover:bg-cyan-300">
              Open the Prototype Lab →
            </button>
            <button onClick={() => go('compare')} className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              ⇄ See Before → After
            </button>
            <button onClick={() => go('ideas')} className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              ✦ New ideas
            </button>
          </div>
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['4', 'projects'],
              ['6', 'phases each'],
              ['8', 'live simulators (v1+v2)'],
              ['7', 'new ideas'],
            ].map(([a, b]) => (
              <div key={b}>
                <div className="font-mono text-3xl font-bold text-white">{a}</div>
                <div className="text-xs text-slate-400">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* project cards */}
      <section className="mx-auto max-w-[1200px] px-6 py-14">
        <h2 className="text-2xl font-bold text-white">The four projects at a glance</h2>
        <p className="mt-1 text-sm text-slate-400">Click one to jump into its lab.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {PROJECTS.map((p) => (
            <button key={p.id} onClick={() => go('lab', p.id)} className="group rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-left transition hover:-translate-y-0.5 hover:border-white/30" style={{ boxShadow: `inset 0 1px 0 ${p.color}33` }}>
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-xl" style={{ background: p.color + '22', color: p.color }}>
                  {p.icon}
                </span>
                <span className="text-xs text-slate-500">Project {p.id}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-300">{p.tagline}</p>
              <div className="mt-4 rounded-lg bg-white/5 p-3 text-xs text-slate-300">
                <span className="text-slate-500">Best when: </span>
                {p.bestWhen}
              </div>
              <div className="mt-3 space-y-1">
                {p.v2.map((t) => (
                  <div key={t} className="flex gap-2 text-xs text-slate-400">
                    <span className="text-emerald-400">v2 ▸</span>
                    {t}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs font-semibold opacity-0 transition group-hover:opacity-100" style={{ color: p.color }}>
                Open lab →
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* decision helper */}
      <section className="border-y border-white/10 bg-slate-900/40">
        <div className="mx-auto max-w-[1200px] px-6 py-14">
          <h2 className="text-2xl font-bold text-white">Which project fits? — decision helper</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">The organisers reveal the “standard algorithm” on the day. Tick what is true about it and see how the four projects rank (rule-based heuristic from the repo’s “How to choose” guidance).</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <Panel title="About the algorithm you receive">
              <div className="space-y-2">
                {FEATURES.map((f) => (
                  <button key={f.id} onClick={() => setSel({ ...sel, [f.id]: !sel[f.id] })} className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition', sel[f.id] ? 'border-cyan-400/50 bg-cyan-400/10 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5')}>
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded border text-xs', sel[f.id] ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/30')}>{sel[f.id] ? '✓' : ''}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            </Panel>
            <div className="space-y-3">
              {ranked.map((r, i) => {
                const p = PROJECTS[r.id - 1];
                return (
                  <div key={r.id} className={cn('rounded-xl border p-4 transition', i === 0 ? 'border-white/30 bg-white/[0.07]' : 'border-white/10 bg-white/[0.03]')}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span style={{ color: p.color }}>{p.icon}</span> {i + 1}. {p.short}
                        {i === 0 && <Badge tone="emerald">best fit</Badge>}
                      </div>
                      <button onClick={() => go('lab', p.id)} className="text-xs text-cyan-300 hover:underline">
                        open →
                      </button>
                    </div>
                    <div className="mt-2 h-2 rounded bg-white/10">
                      <div className="h-2 rounded transition-all duration-500" style={{ width: `${r.score}%`, background: p.color }} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">{r.why.length ? r.why.map((w) => <span key={w}>{w}</span>) : <span>no strong signal</span>}</div>
                  </div>
                );
              })}
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm text-emerald-100">
                <b>Suggested stack: </b>
                {stack} <span className="text-emerald-300/70">(Top pick: {top.short}.)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* matrix */}
      <section className="mx-auto max-w-[1200px] px-6 py-14">
        <h2 className="text-2xl font-bold text-white">Comparison matrix</h2>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3">&nbsp;</th>
                {PROJECTS.map((p) => (
                  <th key={p.id} className="p-3" style={{ color: p.color }}>
                    {p.icon} {p.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[
                ['Extra qubits', '+1 (v2: +2)', '0', '+2 ancillas', '0'],
                ['Extra jobs', '1', '3–5 folded circuits', '1', '1 + calibration'],
                ['Uses all shots?', 'No (post-select)', 'Yes', 'No (v1) / mostly (v2)', 'Yes (soft)'],
                ['Main cost', 'Retention ↓ with depth', 'Variance ↑ at high λ', 'Ancilla noise, qubits', 'Calibration quality'],
                ['Main blind spot', 'Symmetry-preserving errors', 'Clifford noise floor (v1)', 'Phase errors (rep. code)', 'Symmetry-preserving errors'],
                ['Bias vs variance', 'Bias ↓, variance ↑ slightly', 'Bias ↓, variance ↑↑', 'Bias ↓↓, retention ↓', 'Bias ↓, variance ~'],
                ['Hackathon risk', 'Low', 'Medium (hardware T virtual!)', 'Medium (dynamic circuits)', 'Low'],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-white/5">
                  <td className="p-3 font-medium text-white">{row[0]}</td>
                  {row.slice(1).map((c, i) => (
                    <td key={i} className="p-3 text-xs">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
