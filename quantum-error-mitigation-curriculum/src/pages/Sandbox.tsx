import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { CircuitDiagram } from "../components/CircuitDiagram";
import { Callout, Histogram, Legend, Panel, Slider, Pct } from "../components/ui";
import {
  COLORS, PRESETS, gapClosed, gapClosedTvd, hardPostselect, invertReadout, lawLabel, mulberry32, noisyDist, observe, presetCounts, presetIdeal,
  sample, softReweight, tvd, validMask, type Law, type LawKind,
} from "../lib/quantum";

interface Row { method: string; value: number; error: number; gap: number | null; tvd: number; tvdGap: number | null; retention: number; jobs: number; note: string; color: string }

function download(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Sandbox() {
  const [pid, setPid] = useState("vqe");
  const preset = PRESETS.find((p) => p.id === pid)!;
  const [oneQ, setOneQ] = useState(0.01);
  const [twoQ, setTwoQ] = useState(0.03);
  const [readout, setReadout] = useState(0.05);
  const [shots, setShots] = useState(4096);
  const [seed, setSeed] = useState(2026);
  const [lawKind, setLawKind] = useState<LawKind | "preset">("preset");
  const [k, setK] = useState(2);
  const [show, setShow] = useState({ raw: true, readout: false, hard: true, soft: true });

  const law: Law = lawKind === "preset" ? preset.law : { kind: lawKind, k };
  const n = preset.n;
  const ideal = useMemo(() => presetIdeal(preset), [preset]);
  const counts = presetCounts(preset);
  const mask = useMemo(() => validMask(n, law), [n, law]);

  const res = useMemo(() => {
    const exact = noisyDist(ideal, n, counts, { oneQ, twoQ, readout });
    const raw = sample(exact, shots, mulberry32(seed));
    const rawB = sample(exact, shots, mulberry32(seed + 99991));
    const hasLaw = law.kind !== "none";
    const ro = invertReadout(raw, n, readout);
    const rt = invertReadout(rawB, n, readout);
    const hard = hasLaw ? hardPostselect(raw, mask) : { kept: 1, dist: raw };
    const soft = hasLaw ? softReweight(raw, n, readout, mask, hard.dist) : ro;
    let idealValid = 0;
    for (let i = 0; i < ideal.length; i++) if (mask[i]) idealValid += ideal[i];
    const iv = observe(ideal, preset.obs);
    const rv = observe(raw, preset.obs);
    const mk = (method: string, d: Float64Array, ret: number, jobs: number, note: string, color: string): Row => {
      const v = observe(d, preset.obs);
      const t = tvd(d, ideal);
      return { method, value: v, error: Math.abs(v - iv), gap: gapClosed(rv, v, iv), tvd: t, tvdGap: gapClosedTvd(tvd(raw, ideal), t), retention: ret, jobs, note, color };
    };
    const rows: Row[] = [
      mk("Raw (unmitigated)", raw, 1, 1, "Baseline", COLORS.noisy),
      mk("Runtime defaults (≈ readout, independent run)", rt, 1, 1, "Approximates resilience_level=1", COLORS.readout),
      mk("Readout-only mitigation", ro, 1, 2, "Confusion-matrix inversion", COLORS.readout),
      mk("Hard post-selection (v1)", hard.dist, hard.kept, 1, hasLaw ? "Discards law-breaking shots" : "No law → same as raw", COLORS.mitigated),
      mk("Adaptive soft reweighting (v2)", soft, 1, 2, hasLaw ? "Re-assigns shots, keeps all" : "No law → reduces to readout-only", COLORS.soft),
    ];
    return { raw, ro, hard, soft, rows, idealValid, iv, hasLaw };
  }, [ideal, n, counts, oneQ, twoQ, readout, shots, seed, law, mask, preset.obs]);

  const csv = () => {
    const head = ["method", "value", "ideal", "error", "gap_closed_pct", "tvd", "tvd_gap_closed_pct", "retention_pct", "qpu_jobs", "shots", "notes"];
    const lines = res.rows.map((r) => [`"${r.method}"`, r.value.toFixed(5), res.iv.toFixed(5), r.error.toFixed(5), r.gap === null ? "" : r.gap.toFixed(2), r.tvd.toFixed(5), r.tvdGap === null ? "" : r.tvdGap.toFixed(2), (r.retention * 100).toFixed(2), r.jobs, shots, `"${r.note}"`].join(","));
    download("sandbox-scorecard.csv", [head.join(","), ...lines].join("\n"), "text/csv");
  };
  const json = () =>
    download("sandbox-scorecard.json", JSON.stringify({ circuit: preset.label, law: lawLabel(law), noise: { oneQ, twoQ, readout }, shots, seed, observable: preset.obs.label, rows: res.rows.map(({ color: _c, ...r }) => r) }, null, 2), "application/json");

  const series = [
    { label: "ideal", color: COLORS.ideal, probs: ideal },
    ...(show.raw ? [{ label: "raw", color: COLORS.noisy, probs: res.raw }] : []),
    ...(show.readout ? [{ label: "readout-only", color: COLORS.readout, probs: res.ro }] : []),
    ...(show.hard ? [{ label: "v1 hard", color: COLORS.mitigated, probs: res.hard.dist }] : []),
    ...(show.soft ? [{ label: "v2 soft", color: COLORS.soft, probs: res.soft }] : []),
  ];
  const sel = "w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-white">🧪 Sandbox — a mini Prototype Lab</h1>
        <p className="text-slate-300">Same workflow as the repo's <code>#/lab</code> + <code>#/compare</code>: pick a circuit, set noise, choose a conservation law, read the scorecard, export CSV/JSON. Use it to build intuition <i>before</i> (or while) you run the real thing.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[330px_1fr]">
        <Panel title="Controls" icon="🎚️" className="h-fit">
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-xs uppercase tracking-wider text-slate-500">Practice stand-ins</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.id} onClick={() => { setPid(p.id); setLawKind("preset"); }} className={cn("rounded-md border px-2.5 py-1 text-xs", pid === p.id ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-600 text-slate-300")}>{p.label.split(" (")[0]}</button>
                ))}
              </div>
            </div>
            <Slider label="1-qubit gate error" value={oneQ} onChange={setOneQ} min={0} max={0.05} step={0.001} fmt={(v) => Pct(v)} color={COLORS.noisy} />
            <Slider label="2-qubit gate error" value={twoQ} onChange={setTwoQ} min={0} max={0.15} step={0.002} fmt={(v) => Pct(v)} color={COLORS.noisy} />
            <Slider label="Readout error" value={readout} onChange={setReadout} min={0} max={0.25} step={0.0025} fmt={(v) => Pct(v)} color={COLORS.readout} />
            <Slider label="Shots" value={shots} onChange={setShots} min={256} max={32768} step={256} fmt={(v) => v.toLocaleString()} />
            <div>
              <div className="mb-1 text-sm text-slate-200">Conservation law</div>
              <select value={lawKind} onChange={(e) => setLawKind(e.target.value as LawKind | "preset")} className={sel}>
                <option value="preset">stand-in default ({lawLabel(preset.law)})</option>
                <option value="none">none</option>
                <option value="parity-even">even parity</option>
                <option value="parity-odd">odd parity</option>
                <option value="weight">Hamming weight = k</option>
              </select>
              {lawKind === "weight" && <div className="mt-2"><Slider label="k (number of 1s)" value={k} onChange={setK} min={0} max={n} step={1} /></div>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSeed((s) => s + 1)} className="flex-1 rounded-lg border border-slate-600 py-1.5 text-sm text-slate-300 hover:border-cyan-400">🎲 new seed ({seed})</button>
              <button onClick={() => { setOneQ(0.01); setTwoQ(0.03); setReadout(0.05); setShots(4096); setSeed(2026); }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-100">reset</button>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          {preset.ops && (
            <Panel title={`Circuit · ${preset.label}`} icon="🔌">
              <CircuitDiagram n={preset.n} ops={preset.ops} measure />
              <div className="mt-2 text-xs text-slate-400">{preset.note}</div>
            </Panel>
          )}
          {!preset.ops && <Callout tone="slate" icon="ℹ️" title={preset.label}><span>{preset.note}</span></Callout>}
          {res.hasLaw && res.idealValid < 0.999 && (
            <Callout tone="amber" icon="⚠️" title="The ideal run already violates this law">
              <span>A noiseless run puts only {Pct(res.idealValid, 1)} of its probability on legal outcomes, so post-selection will throw away <b>correct</b> shots. Check the law — exactly the warning the repo's Lab shows.</span>
            </Callout>
          )}
          {!res.hasLaw && <Callout tone="slate" icon="ℹ️" title="No conservation law selected"><span>Adaptive conservation has nothing to exploit and reduces to readout-only mitigation — the repo's scorecard says so too.</span></Callout>}

          <Panel title="Histograms" icon="📊" right={
            <div className="flex flex-wrap gap-3 text-xs text-slate-300">
              {([["raw", "raw"], ["readout", "readout-only"], ["hard", "v1 hard"], ["soft", "v2 soft"]] as const).map(([key, l]) => (
                <label key={key} className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" className="accent-cyan-400" checked={show[key]} onChange={(e) => setShow((s) => ({ ...s, [key]: e.target.checked }))} />{l}</label>
              ))}
            </div>
          }>
            <Histogram n={n} series={series} height={230} invalid={res.hasLaw ? (mask.map((m) => (m ? 0 : 1)) as unknown as Uint8Array) : undefined} />
            <div className="mt-2"><Legend items={[{ label: "ideal", color: COLORS.ideal }, { label: "raw", color: COLORS.noisy }, { label: "readout-only", color: COLORS.readout }, { label: "v1 hard post-select", color: COLORS.mitigated }, { label: "v2 soft reweight", color: COLORS.soft }]} /></div>
            <div className="mt-1 text-[11px] text-slate-500">Red ✕ under a bitstring = forbidden by the chosen law.</div>
          </Panel>

          <Panel title={`Judge's scorecard · observable: ${preset.obs.label} (ideal ${res.iv.toFixed(3)})`} icon="🏅" right={
            <div className="flex gap-2">
              <button onClick={csv} className="rounded-md border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-400">CSV ⬇</button>
              <button onClick={json} className="rounded-md border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-400">JSON ⬇</button>
            </div>
          }>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th className="py-1.5 pr-3">Method</th><th className="pr-3">Value</th><th className="pr-3">Error</th><th className="pr-3">Gap closed</th><th className="pr-3">TVD</th><th className="pr-3">TVD gap</th><th className="pr-3">Retention</th><th>Jobs</th></tr>
                </thead>
                <tbody className="font-mono text-[13px]">
                  {res.rows.map((r) => (
                    <tr key={r.method} className="border-t border-slate-800">
                      <td className="py-2 pr-3 font-sans"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: r.color }} />{r.method}<div className="pl-[18px] font-sans text-[11px] text-slate-500">{r.note}</div></td>
                      <td className="pr-3">{r.value.toFixed(3)}</td>
                      <td className="pr-3">{r.error.toFixed(3)}</td>
                      <td className="pr-3" style={{ color: r.gap === null ? "#64748b" : r.gap > 20 ? COLORS.ideal : r.gap < 0 ? COLORS.noisy : COLORS.readout }}>{r.gap === null ? "—" : `${r.gap.toFixed(0)}%`}</td>
                      <td className="pr-3">{r.tvd.toFixed(3)}</td>
                      <td className="pr-3" style={{ color: r.tvdGap === null ? "#64748b" : r.tvdGap > 20 ? COLORS.ideal : r.tvdGap < 0 ? COLORS.noisy : COLORS.readout }}>{r.tvdGap === null ? "—" : `${r.tvdGap.toFixed(0)}%`}</td>
                      <td className="pr-3" style={{ color: r.retention < 0.5 ? COLORS.noisy : "#e2e8f0" }}>{(r.retention * 100).toFixed(0)}%</td>
                      <td>{r.jobs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">Teaching simulation with a simplified noise model and perfectly known readout error. Real hardware is messier — that's what the repo's Lab and the QPU are for.</p>
          </Panel>

          <Callout tone="cyan" icon="🧭" title="Experiments to run">
            <ul className="list-disc space-y-1 pl-5">
              <li>VQE, 2-qubit error → 12%: watch hard-PS retention fall while soft stays 100%.</li>
              <li>GHZ: note the warning, then set law to “none” — gap-closed collapses to readout-only.</li>
              <li>Trotter: confirm there is no law; which row wins? (hint: readout-ish rows)</li>
              <li>Shots 256 → 32,768: which rows' numbers wobble most between seeds?</li>
            </ul>
          </Callout>
        </div>
      </div>
    </div>
  );
}
