import { useRef, useState } from "react";
import { Badge, Meter, Notice, Panel, PhaseCard, Segmented, Stat, pct } from "../components/ui";
import { NoiseKnobs } from "../components/NoiseKnobs";
import { QuantumCircuit } from "../components/QuantumCircuit";
import { DistChart } from "../components/Charts";
import { MethodCard } from "../components/MethodCard";
import { useLab } from "../lib/store";
import { PHASES, STAND_INS, buildScorecard } from "../lib/meta";
import { bitstring, lawLabel, type Experiment, type Law, type LawKind } from "../lib/simulator";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ config sidebar */

function ConfigPanel() {
  const lab = useLab();
  const { law, setLaw, parsed } = lab;
  const maxK = Math.max(parsed.measured.length, 1);

  return (
    <div className="space-y-5 lg:sticky lg:top-20">
      <Panel title="Circuit & law" icon="⚙️" subtitle="Applies to every page">
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-xs uppercase tracking-wider text-slate-500">Practice stand-ins</div>
            <div className="flex flex-wrap gap-1.5">
              {STAND_INS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => lab.loadStandIn(s.id)}
                  title={s.description}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs transition",
                    lab.standInId === s.id ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-600 text-slate-300 hover:border-slate-400",
                  )}
                >
                  {s.short}
                </button>
              ))}
              <span
                className={cn(
                  "rounded-lg border border-dashed px-2.5 py-1 text-xs",
                  lab.standInId === null ? "border-violet-400 bg-violet-400/10 text-violet-200" : "border-slate-700 text-slate-500",
                )}
              >
                {lab.standInId === null ? "● custom" : "custom (paste)"}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="law" className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Conservation law
            </label>
            <select
              id="law"
              value={law.kind}
              onChange={(e) => {
                const kind = e.target.value as LawKind;
                const next: Law = { kind, k: kind === "weight" ? Math.min(Math.max(law.k, 0) || 1, maxK) : law.k };
                setLaw(next);
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="parity-even">Parity — even</option>
              <option value="parity-odd">Parity — odd</option>
              <option value="weight">Hamming weight = k</option>
              <option value="none">None</option>
            </select>
            {law.kind === "weight" && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <label htmlFor="k" className="text-slate-400">
                  k =
                </label>
                <input
                  id="k"
                  type="number"
                  min={0}
                  max={maxK}
                  value={law.k}
                  onChange={(e) => setLaw({ ...law, k: Math.max(0, Math.min(maxK, parseInt(e.target.value || "0", 10))) })}
                  className="w-20 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 font-mono text-slate-100"
                />
                <span className="text-xs text-slate-500">of {maxK} measured qubits</span>
              </div>
            )}
            {lab.experiment?.suggestedLaw && lawLabel(lab.experiment.suggestedLaw) !== lawLabel(law) && (
              <button
                onClick={() => setLaw(lab.experiment!.suggestedLaw!)}
                className="mt-2 w-full rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-left text-xs text-emerald-200 hover:bg-emerald-400/20"
              >
                💡 Ideal output satisfies <b>{lawLabel(lab.experiment.suggestedLaw)}</b> — apply
              </button>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Noise knobs" icon="🎛️" subtitle="Depolarising gates + symmetric readout">
        <NoiseKnobs cfg={lab.cfg} onChange={lab.setCfg} />
        <button
          onClick={lab.rerun}
          className="mt-4 w-full rounded-lg bg-violet-500/90 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
        >
          ↻ Re-run with new random seed
        </button>
      </Panel>

      <Panel title="Mitigation version" icon="🔀">
        <Segmented
          value={lab.version}
          onChange={lab.setVersion}
          options={[
            { value: "v1", label: "v1 · hard post-selection", title: "Throw away every shot that violates the law" },
            { value: "v2", label: "v2 · adaptive soft weights", title: "Bayesian per-shot reweighting" },
          ]}
        />
        {lab.version === "v2" && (
          <div className="mt-4">
            <div className="mb-1.5 text-xs uppercase tracking-wider text-slate-500">Prior over true states</div>
            <Segmented
              value={lab.prior}
              onChange={lab.setPrior}
              options={[
                { value: "empirical", label: "empirical (IBU)", title: "prior = readout-mitigated distribution" },
                { value: "uniform", label: "uniform (reference)", title: "exactly as adaptive_conservation.py" },
              ]}
            />
            {lab.prior === "uniform" && (
              <p className="mt-2 text-[11px] leading-snug text-amber-300/90">
                Reference prior: a valid observed string only gets w ≈ (1−e)ⁿ, so the estimate is shrunk towards 0.5 and can land <i>below</i> raw.
              </p>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ phases */

function NoExperiment() {
  const { error, parsed } = useLab();
  return (
    <Notice tone="rose" title="Nothing to simulate yet">
      {error ?? "Circuit did not parse."}
      {parsed.errors.length > 1 && (
        <ul className="mt-1 list-inside list-disc">
          {parsed.errors.slice(1).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </Notice>
  );
}

function ProblemPhase({ e }: { e: Experiment }) {
  const { parsed, law, setLaw } = useLab();
  const s = parsed.stats;
  const lawBroken = law.kind !== "none" && e.lawIdealValid < 0.999;
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Error mitigation starts with a question: <i>what must the output satisfy?</i> Pick a conservation law on the left; the lab measures how often noisy shots break it.
        Metric tracked everywhere: <b className="text-slate-200">{e.metricLabel}</b>.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Qubits" value={s.nQubits} sub={`${s.nMeasured} measured`} tone="cyan" />
        <Stat label="Depth" value={s.depth} sub={`${s.gates} gates`} tone="violet" />
        <Stat label="2-qubit gates" value={s.twoQ + s.multiQ} sub={`${s.oneQ} one-qubit`} tone="emerald" />
        <Stat label="Non-Clifford" value={s.nonClifford} sub={`${s.tGates} T gates`} tone="slate" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Active law" value={<span className="text-base">{lawLabel(law)}</span>} tone="pink" />
        <Stat
          label="Ideal output satisfies law"
          value={law.kind === "none" ? "n/a" : pct(e.lawIdealValid, 2)}
          sub={law.kind === "none"
            ? "no law selected"
            : e.lawIdealValid < 0.999
              ? "post-selection will throw away correct shots"
              : "clean"}
          tone={law.kind === "none" ? "slate" : e.lawIdealValid < 0.999 ? "rose" : "emerald"}
        />
        <Stat label="TVD raw ↔ ideal" value={e.raw.tvd.toFixed(3)} tone="amber" />
        <Stat label="P(no gate fault)" value={pct(e.faultFreeProb, 1)} tone={e.faultFreeProb < 0.3 ? "rose" : "emerald"} />
      </div>
      {lawBroken && (
        <Notice tone="amber" title="This law is not conserved by your ideal circuit">
          A noiseless run already violates it {pct(1 - e.lawIdealValid, 1)} of the time, so post-selection will throw away <i>correct</i> shots. Check the law, or pick a stand-in
          that really conserves it.
        </Notice>
      )}
      {e.suggestedLaw && lawLabel(e.suggestedLaw) !== lawLabel(law) && (
        <Notice tone="cyan" title="Detected from the ideal simulation">
          The exact output is supported only on states with <b>{lawLabel(e.suggestedLaw)}</b>.{" "}
          <button onClick={() => setLaw(e.suggestedLaw!)} className="underline decoration-cyan-400/60 hover:text-cyan-200">
            Use it
          </button>
        </Notice>
      )}
      <div>
        <div className="mb-2 text-sm font-medium text-slate-200">Ideal output distribution (exact statevector)</div>
        <DistChart series={[{ label: "Ideal", color: "#34d399", probs: e.idealProbs }]} m={e.m} mask={law.kind === "none" ? undefined : e.mask} />
      </div>
    </div>
  );
}

function CircuitPhase() {
  const lab = useLab();
  const fileRef = useRef<HTMLInputElement>(null);
  const p = lab.parsed;
  const standIn = STAND_INS.find((s) => s.id === lab.standInId);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-400">
          Paste <b className="text-slate-200">Qiskit (Python)</b> or <b className="text-slate-200">OpenQASM 2/3</b>. Loops (<code>for i in range(n)</code>), variables and
          expressions like <code>pi/4</code> are understood.
        </p>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".qasm,.py,.txt,.qasm3"
            className="sr-only"
            aria-label="Upload circuit file"
            onChange={async (ev) => {
              const f = ev.target.files?.[0];
              if (f) lab.setSource(await f.text());
              ev.target.value = "";
            }}
          />
          <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-400">
            ⬆ Upload file
          </button>
        </div>
      </div>
      <textarea
        value={lab.source}
        onChange={(e) => lab.setSource(e.target.value)}
        spellCheck={false}
        rows={13}
        aria-label="Circuit source"
        placeholder={'OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;'}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/70 p-3 font-mono text-[13px] leading-relaxed text-emerald-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={p.ok ? "emerald" : "rose"}>{p.ok ? "parsed ✓" : "error"}</Badge>
        <Badge tone="slate">{p.format === "qasm" ? "OpenQASM" : p.format === "qiskit" ? "Qiskit Python" : "empty"}</Badge>
        {p.ok && (
          <span className="text-xs text-slate-500">
            {p.nQubits} qubits · depth {p.stats.depth} · {p.stats.gates} gates · measuring {p.measured.length}
            {p.explicitMeasure ? " (explicit)" : " (all)"}
          </span>
        )}
        {lab.pending && <span className="text-xs text-amber-300">re-simulating…</span>}
      </div>
      {p.errors.map((m) => (
        <Notice key={m} tone="rose">
          {m}
        </Notice>
      ))}
      {p.warnings.length > 0 && (
        <Notice tone="amber" title="Heads-up — parts of the source were not simulated">
          <ul className="list-inside list-disc space-y-0.5">
            {p.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Notice>
      )}
      {standIn?.note && (
        <Notice tone="violet" title={standIn.label}>
          {standIn.note}
        </Notice>
      )}
      {p.ok && <QuantumCircuit circuit={p} />}
      <p className="text-[11px] text-slate-500">
        Supported: id x y z h s sdg t tdg sx sxdg rx ry rz p/u1 u2 u3/u · cx cy cz ch cp crx cry crz swap iswap rxx ryy rzz rzx · ccx ccz cswap · measure / measure_all. Mid-circuit
        measurement, resets, classical control and custom gates are not supported.
      </p>
    </div>
  );
}

function NoisyPhase({ e }: { e: Experiment }) {
  const lab = useLab();
  const { law } = lab;
  const cfg = lab.cfg;
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Each shot is a Monte-Carlo trajectory: after every gate a random Pauli is inserted with the depolarising probability, the statevector is evolved, and the measured
        bits are finally flipped by readout error. Shots with no fault reuse the ideal state.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Shots" value={e.config.shots.toLocaleString()} tone="cyan" />
        <Stat label="P(no gate fault)" value={pct(e.faultFreeProb, 1)} sub="analytic Π(1−p)" tone={e.faultFreeProb < 0.3 ? "rose" : "emerald"} />
        <Stat label="Law violations" value={law.kind === "none" ? "n/a" : pct(1 - e.raw.value, 1)} sub={law.kind === "none" ? "no law selected" : "raw shots breaking the law"} tone="rose" />
        <Stat label="TVD raw ↔ ideal" value={e.raw.tvd.toFixed(3)} tone="amber" />
      </div>
      <div>
        <div className="mb-2 text-sm font-medium text-slate-200">Noisy vs ideal distribution</div>
        <DistChart
          series={[
            { label: "Ideal", color: "#34d399", probs: e.idealProbs },
            { label: "Raw noisy", color: "#fb7185", probs: e.pObs },
          ]}
          m={e.m}
          mask={law.kind === "none" ? undefined : e.mask}
        />
      </div>
      <div>
        <div className="mb-2 text-sm font-medium text-slate-200">Calibrated readout (per qubit, from {cfg.shots.toLocaleString()} calibration shots)</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {e.cal.map((c, q) => (
            <div key={q} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2 text-xs">
              <div className="mb-1 font-mono text-slate-300">q{q}</div>
              <div className="grid grid-cols-2 gap-0.5 font-mono text-[11px]">
                <span className="rounded bg-emerald-500/20 px-1.5 py-1 text-emerald-200">{(1 - c.a).toFixed(3)}</span>
                <span className="rounded bg-rose-500/20 px-1.5 py-1 text-rose-200">{c.a.toFixed(3)}</span>
                <span className="rounded bg-rose-500/20 px-1.5 py-1 text-rose-200">{c.b.toFixed(3)}</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-1 text-emerald-200">{(1 - c.b).toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">
          M[true→observed]: rows = prepared |0⟩,|1⟩. P(1|1) is a little worse than P(0|0) because preparing |1⟩ uses a noisy X gate — exactly as in the Aer calibration circuits.
        </p>
      </div>
    </div>
  );
}

function MitigatePhase({ e }: { e: Experiment }) {
  const lab = useLab();
  const { law, version } = lab;
  const shots = e.config.shots;
  const rows = Array.from(e.counts)
    .map((c, i) => ({ i, c }))
    .filter((r) => r.c > 0)
    .sort((a, b) => b.c - a.c)
    .slice(0, 10);
  return (
    <div className="space-y-5">
      {law.kind === "none" && (
        <Notice tone="amber" title="No conservation law selected">
          With nothing to condition on, every shot is valid: hard post-selection keeps 100% and adaptive weights are all 1. Both reduce to the readout-only result.
        </Notice>
      )}
      {version === "v1" ? (
        <>
          <p className="text-sm text-slate-400">
            <b className="text-slate-200">v1 — hard post-selection.</b> Keep a shot only if its observed bitstring satisfies the law ({lawLabel(law)}); discard the rest.
            Retention falls exponentially with circuit size because every gate adds a chance of leaving the valid subspace.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Kept" value={Math.round(e.hardKept * shots).toLocaleString()} sub={`of ${shots.toLocaleString()} shots`} tone="emerald" />
            <Stat label="Discarded" value={Math.round((1 - e.hardKept) * shots).toLocaleString()} sub="QPU time wasted" tone="rose" />
            <Stat label="Shots to net N kept" value={e.hardKept > 0 ? (1 / e.hardKept).toFixed(2) : "∞"} sub="cost multiplier" tone="amber" />
          </div>
          <Meter value={e.hardKept} tone="emerald" label="Shot retention (hard)" valueLabel={pct(e.hardKept)} hint={`P(no gate fault) = ${pct(e.faultFreeProb)}. Retention decays roughly like this — see Compare → noise sweep.`} />
        </>
      ) : (
        <>
          <p className="text-sm text-slate-400">
            <b className="text-slate-200">v2 — adaptive soft reweighting.</b> Every observed bitstring <i>o</i> gets a weight equal to the posterior probability that the{" "}
            <i>true</i> state was valid, using the measured confusion matrix. No shot is thrown away.
          </p>
          <div className="rounded-xl border border-pink-400/30 bg-pink-400/5 p-4 text-center font-mono text-sm leading-relaxed text-pink-100">
            P(t | o) ∝ M[t, o] · prior(t) &nbsp;&nbsp;→&nbsp;&nbsp; w(o) = Σ<sub>t valid</sub> P(t | o) &nbsp;&nbsp;→&nbsp;&nbsp; estimate = Σ<sub>o</sub> n<sub>o</sub> · w(o) / N
            <div className="mt-1 text-[11px] text-pink-200/70">
              prior = {e.prior === "uniform" ? "uniform (reference implementation)" : "readout-mitigated distribution (one IBU step)"}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Shots used" value="100%" sub="every shot carries weight" tone="emerald" />
            <Stat label="Mean weight" value={pct(e.softMass)} sub="= soft estimate" tone="pink" />
            <Stat label="Effective sample size" value={Math.round(e.ess).toLocaleString()} sub={`of ${shots.toLocaleString()} shots`} tone="cyan" />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-200">Most frequent observed outcomes and their weights</div>
            <div className="overflow-x-auto rounded-xl border border-slate-700/60">
              <table className="w-full min-w-[30rem] text-sm">
                <thead className="bg-slate-900/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Observed o</th>
                    <th className="px-3 py-2 text-right">Count</th>
                    <th className="px-3 py-2">Valid?</th>
                    <th className="px-3 py-2">Soft weight w(o)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((r) => (
                    <tr key={r.i}>
                      <td className="px-3 py-1.5 font-mono text-slate-200">{bitstring(r.i, e.m)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-300">{r.c}</td>
                      <td className="px-3 py-1.5">{e.mask[r.i] ? <span className="text-emerald-400">✓ valid</span> : <span className="text-rose-400">✗ violates</span>}</td>
                      <td className="w-1/2 px-3 py-1.5">
                        <Meter size="sm" value={e.weights[r.i]} color="#f472b6" valueLabel={e.weights[r.i].toFixed(3)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Hard post-selection would give every ✗ row weight 0 and every ✓ row weight 1. Soft weights admit that a ✗ shot may be a readout-flipped valid state and a ✓ shot may be a
              flipped invalid one.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function ResultsPhase({ e }: { e: Experiment }) {
  const lab = useLab();
  const { law, version } = lab;
  const mit = version === "v1" ? e.hardPS : e.adaptive;
  const mitLabel = version === "v1" ? "v1 · Hard post-selection" : "v2 · Adaptive conservation";
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Metric: <b className="text-slate-200">{e.metricLabel}</b>. “Gap closed” is how much of the distance to the exact ideal each method removes relative to raw; TVD (total-variation
        distance) judges the whole output distribution.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MethodCard title="Raw" icon="🔴" color="#fb7185" stat={e.raw} raw={e.raw} ideal={e.ideal} />
        <MethodCard title="Readout-only" icon="🟠" color="#fbbf24" stat={e.readout} raw={e.raw} ideal={e.ideal} note="Confusion-matrix inversion" />
        <MethodCard
          title={mitLabel}
          icon="📊"
          color="#f472b6"
          stat={mit}
          raw={e.raw}
          ideal={e.ideal}
          highlight
          valueNote={version === "v1" ? "kept fraction" : undefined}
          note={
            version === "v1"
              ? "Reference semantics: value = fraction of shots surviving (≡ raw). The benefit is in the conditional distribution (TVD)."
              : e.noEffect
                ? "No law → reduces to readout-only."
                : `Prior: ${e.prior}. Mean per-shot weight.`
          }
        />
        <MethodCard title="Ideal" icon="🟢" color="#34d399" stat={e.ideal} raw={e.raw} ideal={e.ideal} isIdeal />
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
        <div className="mb-3 text-sm font-medium text-slate-200">Shot retention meter</div>
        <div className="grid gap-4 md:grid-cols-2">
          <Meter value={e.hardKept} tone="rose" label="v1 · hard post-selection" valueLabel={`${pct(e.hardKept)} kept`} hint={`${Math.round((1 - e.hardKept) * e.config.shots).toLocaleString()} shots discarded`} />
          <Meter value={1} color="#f472b6" label="v2 · adaptive soft weights" valueLabel="100% used" hint={`mean weight ${pct(e.softMass)} · effective samples ${Math.round(e.ess).toLocaleString()}`} />
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-200">Output distributions</div>
        <DistChart
          series={[
            { label: "Ideal", color: "#34d399", probs: e.idealProbs },
            { label: "Raw", color: "#fb7185", probs: e.pObs },
            { label: "Readout-only", color: "#fbbf24", probs: e.pMit },
            { label: version === "v1" ? "Hard PS" : "Adaptive", color: "#f472b6", probs: mit.dist },
          ]}
          m={e.m}
          mask={law.kind === "none" ? undefined : e.mask}
          topN={8}
        />
      </div>
      {law.kind !== "none" && e.lawIdealValid < 0.999 && (
        <Notice tone="amber" title="Reading these numbers">
          The ideal circuit itself only satisfies the law {pct(e.lawIdealValid)} of the time, so “closer to ideal” and “more valid” are different goals here. This is the failure mode
          you want to be able to explain to judges.
        </Notice>
      )}
    </div>
  );
}

function PlanPhase({ e }: { e: Experiment }) {
  const lab = useLab();
  const rows = buildScorecard(e, lab.cfg);
  const ours = rows.find((r) => r.ours)!;
  const shots = lab.cfg.shots;
  const hardNeed = e.hardKept > 0 ? Math.ceil(shots / e.hardKept) : Infinity;
  const steps = [
    { t: "0:00 – 0:20", title: "Parse & classify", body: `Paste the circuit; confirm ${lab.parsed.nQubits} qubits, depth ${lab.parsed.stats.depth}. Decide the law (${lawLabel(lab.law)}) and the headline observable.` },
    { t: "0:20 – 0:45", title: "Sanity-check ideal", body: `Ideal P(law) = ${lab.law.kind === "none" ? "n/a" : pct(e.lawIdealValid)}. If < 100% the law is wrong or only approximately conserved.` },
    { t: "0:45 – 1:15", title: "Transpile & pick layout", body: "optimization_level=3, best-connected qubits from backend properties; note the transpiled 2q-gate count — that is the real noise budget." },
    { t: "1:15 – 1:45", title: "Run on QPU (2 jobs)", body: `Job 1: circuit, ${shots.toLocaleString()} shots. Job 2 (or batched): |0…0⟩ and |1…1⟩ calibration circuits. Estimated ≈ ${ours.qpuSecondsEstimate.toFixed(1)} s on the scorecard model.` },
    { t: "1:45 – 2:15", title: "Mitigate in the browser", body: "Paste the counts, build the per-qubit confusion matrix, compute the readout-only and adaptive estimates. Compare against Runtime resilience_level=1." },
    { t: "2:15 – 3:00", title: "Make it convincing", body: "Error bars, gap-closed %, retention vs hard post-selection, budget table. Prepare one honest-limits slide." },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="QPU jobs" value={ours.qpuJobs} sub="raw + calibration" tone="cyan" />
        <Stat label="Extra qubits" value="0" sub="no ancillas needed" tone="emerald" />
        <Stat label="Shots to match (hard PS)" value={Number.isFinite(hardNeed) ? hardNeed.toLocaleString() : "∞"} sub={`for ${shots.toLocaleString()} kept shots`} tone="rose" />
        <Stat label="Adaptive gap closed" value={ours.gapClosedPct === null ? "—" : `${ours.gapClosedPct.toFixed(0)}%`} sub="vs raw, this setting" tone="pink" />
      </div>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-300">{i + 1}</span>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-slate-100">{s.title}</span>
                <span className="font-mono text-[11px] text-slate-500">{s.t}</span>
              </div>
              <p className="text-sm text-slate-400">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <a href="#/compare" className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300">
          Open scorecard & budget →
        </a>
        <a href="#/playbook" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-emerald-400">
          Full playbook →
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function Lab() {
  const lab = useLab();
  const [phase, setPhase] = useState(0);
  const e = lab.experiment;

  const body = () => {
    if (PHASES[phase].id === "circuit") return <CircuitPhase />;
    if (!e) return <NoExperiment />;
    switch (PHASES[phase].id) {
      case "problem": return <ProblemPhase e={e} />;
      case "noisy": return <NoisyPhase e={e} />;
      case "mitigate": return <MitigatePhase e={e} />;
      case "results": return <ResultsPhase e={e} />;
      default: return <PlanPhase e={e} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">🧪 Prototype Lab</h1>
        <p className="mt-1 text-slate-400">Live in-browser statevector simulation. Everything below reacts to the circuit, law and noise you set.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <ConfigPanel />
        <div className="min-w-0 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Phases">
            {PHASES.map((p, i) => (
              <PhaseCard key={p.id} index={i} title={p.label} blurb={p.blurb} state={i === phase ? "active" : i < phase ? "done" : "todo"} onClick={() => setPhase(i)} />
            ))}
          </div>
          <Panel
            title={`${phase + 1}. ${PHASES[phase].label}`}
            right={lab.pending ? <Badge tone="amber">simulating…</Badge> : <Badge tone="emerald">live</Badge>}
            bodyClassName="min-h-[24rem]"
          >
            {body()}
          </Panel>
          <div className="flex justify-between">
            <button
              disabled={phase === 0}
              onClick={() => setPhase((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-400 disabled:opacity-30"
            >
              ← {phase > 0 ? PHASES[phase - 1].label : "Back"}
            </button>
            <button
              disabled={phase === PHASES.length - 1}
              onClick={() => setPhase((p) => Math.min(PHASES.length - 1, p + 1))}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-30"
            >
              {phase < PHASES.length - 1 ? PHASES[phase + 1].label : "Done"} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
