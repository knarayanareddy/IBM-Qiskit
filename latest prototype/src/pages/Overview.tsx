import { useState } from "react";
import { Badge, Meter, Panel, Segmented, Toggle, pct } from "../components/ui";
import { PROJECTS, DEFAULT_TRAITS, scoreProjects, type Traits } from "../lib/meta";
import { useLab } from "../lib/store";
import { lawLabel } from "../lib/simulator";
import { cn } from "../utils/cn";

function Hero() {
  const { experiment, parsed, law } = useLab();
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-800/80 via-slate-900 to-slate-900 p-6 sm:p-10">
      <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-400/20 via-violet-500/20 to-emerald-400/20 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="cyan">WIQD × IBM Quantum</Badge>
            <Badge tone="violet">Amsterdam · 20–21 Nov 2026</Badge>
            <Badge tone="emerald">Error Mitigation track</Badge>
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Qiskit Fall Fest <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">2026</span>
          </h1>
          <p className="mt-2 text-xl font-medium text-slate-200">Algorithm-agnostic error-mitigation prototype</p>
          <p className="mt-4 max-w-2xl text-slate-400">
            The standard algorithm is revealed at the event — so nothing here is hard-coded. Paste any Qiskit or OpenQASM circuit, pick a conservation law,
            and watch raw → readout-mitigated → adaptive soft-reweighted results against the exact ideal, with a scorecard and QPU budget for judges.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#/lab" className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300">
              Open Prototype Lab →
            </a>
            <a href="#/compare" className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-violet-400 hover:text-violet-200">
              See Before → After
            </a>
            <a href="#/playbook" className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200">
              Hackathon Playbook
            </a>
          </div>
          <ul className="mt-6 grid gap-2 text-sm text-slate-400 sm:grid-cols-3">
            {["Paste Qiskit / OpenQASM — any circuit", "Pure TypeScript statevector + noise", "No backend, no IBM account"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-slate-500">Live — your current circuit</div>
            <Badge tone="slate">{parsed.ok ? `${parsed.nQubits} qubits` : "no circuit"}</Badge>
          </div>
          {experiment ? (
            <div className="mt-4 space-y-3.5">
              <div className="text-sm text-slate-300">
                {experiment.metricLabel}
                <span className="ml-2 text-xs text-slate-500">law: {lawLabel(law)}</span>
              </div>
              <Meter value={experiment.raw.value} tone="rose" label="Raw" valueLabel={pct(experiment.raw.value)} />
              <Meter value={experiment.readout.value} tone="amber" label="Readout-only" valueLabel={pct(experiment.readout.value)} />
              <Meter value={experiment.adaptive.value} color="#f472b6" label="Adaptive conservation" valueLabel={pct(experiment.adaptive.value)} />
              <Meter value={experiment.ideal.value} tone="emerald" label="Ideal (exact)" valueLabel={pct(experiment.ideal.value)} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-rose-300">Fix the circuit in the Lab to see live numbers.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function ProjectCards() {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Four projects at a glance</h2>
          <p className="text-sm text-slate-400">Pick one after the algorithm is revealed — the decision helper below scores them.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {PROJECTS.map((p) => (
          <article
            key={p.id}
            className="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 transition hover:-translate-y-0.5 hover:border-slate-500"
          >
            <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: p.color }} />
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: `${p.color}22`, boxShadow: `inset 0 0 0 1px ${p.color}55` }}>
                {p.icon}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    <span className="mr-1.5 text-slate-500">#{p.id}</span>
                    {p.name}
                  </h3>
                  {p.inPrototype && <Badge tone="pink">implemented here</Badge>}
                </div>
                <p className="mt-1 text-sm" style={{ color: p.color }}>{p.tagline}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">Best when</div>
                <ul className="space-y-1 text-slate-300">
                  {p.bestWhen.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span style={{ color: p.color }}>▸</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">v1</div>
                  <div className="text-slate-300">{p.v1}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">v2</div>
                  <div className="text-slate-300">{p.v2}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
              <span className="text-slate-500">Judge takeaway · </span>
              {p.judgeTakeaway}
            </div>
            <div className="mt-3 text-xs text-slate-500">Inspiration: {p.inspiration}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DecisionHelper() {
  const { parsed, law } = useLab();
  const [traits, setTraits] = useState<Traits>(DEFAULT_TRAITS);
  const set = <K extends keyof Traits>(k: K, v: Traits[K]) => setTraits((t) => ({ ...t, [k]: v }));
  const scored = scoreProjects(traits);
  const best = Math.max(...scored.map((s) => s.raw));

  const fill = () => {
    const s = parsed.stats;
    setTraits((t) => ({
      ...t,
      tGates: s.nonClifford > 0,
      symmetry: law.kind !== "none",
      fixedWeight: law.kind === "weight",
      depth: s.depth <= 8 ? 1 : s.depth <= 24 ? 2 : 3,
    }));
  };

  return (
    <Panel
      title="Decision helper"
      icon="🧭"
      subtitle="Describe the revealed algorithm — each project gets a 1–4 fit score with the reasons behind it."
      right={
        <button
          onClick={fill}
          disabled={!parsed.ok}
          className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-40"
        >
          Fill from my Lab circuit
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="space-y-2.5">
          <Toggle checked={traits.tGates} onChange={(v) => set("tGates", v)} label="T / non-Clifford gates present" hint="T, arbitrary-angle rotations, Toffoli" />
          <Toggle checked={traits.symmetry} onChange={(v) => set("symmetry", v)} label="Symmetry is conserved" hint="parity, particle number, …" />
          <Toggle checked={traits.fixedWeight} onChange={(v) => set("fixedWeight", v)} label="Fixed Hamming weight output" hint="e.g. exactly k excitations" />
          <Toggle checked={traits.ancillas} onChange={(v) => set("ancillas", v)} label="Spare ancilla qubits available" />
          <Toggle checked={traits.qpuTight} onChange={(v) => set("qpuTight", v)} label="QPU time is tight" hint="few jobs / shots allowed" />
          <div>
            <div className="mb-1.5 text-sm text-slate-300">Circuit depth</div>
            <Segmented
              value={String(traits.depth) as "1" | "2" | "3"}
              onChange={(v) => set("depth", Number(v) as 1 | 2 | 3)}
              options={[{ value: "1", label: "Shallow" }, { value: "2", label: "Medium" }, { value: "3", label: "Deep" }]}
            />
          </div>
        </div>

        <div className="space-y-3">
          {scored.map(({ project: p, score, raw, reasons }) => (
            <div
              key={p.id}
              className={cn(
                "rounded-xl border p-4 transition",
                raw === best ? "border-pink-400/50 bg-pink-400/5" : "border-slate-700/60 bg-slate-900/30",
              )}
              style={raw === best ? { borderColor: `${p.color}88`, background: `${p.color}0d` } : undefined}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.icon}</span>
                  <span className="font-semibold text-white">{p.name}</span>
                  {raw === best && <Badge tone="emerald">best fit</Badge>}
                </div>
                <div className="flex items-center gap-2" aria-label={`Score ${score} of 4`}>
                  <span className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className="h-3 w-7 rounded-sm transition-colors" style={{ background: i <= score ? p.color : "#334155" }} />
                    ))}
                  </span>
                  <span className="w-8 text-right font-mono text-lg font-bold text-white">{score}/4</span>
                </div>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {reasons.length === 0 && <li className="text-xs text-slate-500">No strong signals either way.</li>}
                {reasons.map((r) => (
                  <li
                    key={r.label}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] ring-1 ring-inset",
                      r.delta > 0 ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20" : "bg-rose-400/10 text-rose-300 ring-rose-400/20",
                    )}
                  >
                    {r.delta > 0 ? "+" : "−"} {r.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            Heuristic scoring (base 1.8 + weighted traits, rounded and clamped to 1–4) — a conversation starter, not a verdict.
          </p>
        </div>
      </div>
    </Panel>
  );
}

export default function Overview() {
  return (
    <div className="space-y-10">
      <Hero />
      <ProjectCards />
      <DecisionHelper />
    </div>
  );
}
