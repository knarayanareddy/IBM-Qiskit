import { useMemo, useState } from "react";
import { Badge, Meter, Notice, Panel, Stat, downloadText, pct } from "../components/ui";
import { NoiseKnobs } from "../components/NoiseKnobs";
import { HBars, LineChart, DistChart } from "../components/Charts";
import { MethodCard, fmtGap, gapTone } from "../components/MethodCard";
import { useLab } from "../lib/store";
import { budgetWithHardPS, buildScorecard, scorecardToCSV, scorecardToJSON, secondsPerEffectiveShot } from "../lib/meta";
import { lawLabel, runExperiment, type NoiseConfig } from "../lib/simulator";
import { cn } from "../utils/cn";

const SCALES = [0, 0.5, 1, 1.5, 2, 3, 4];

interface SweepPoint {
  scale: number;
  hardRetention: number;
  faultFree: number;
  errRaw: number;
  errReadout: number;
  errAdaptive: number;
}

function scaleCfg(cfg: NoiseConfig, s: number): NoiseConfig {
  return {
    ...cfg,
    oneQ: Math.min(0.1, cfg.oneQ * s),
    twoQ: Math.min(0.3, cfg.twoQ * s),
    readout: Math.min(0.3, cfg.readout * s),
  };
}

function NoiseSweep() {
  const lab = useLab();
  const { parsed, committed } = lab;
  const key = JSON.stringify([committed.source, committed.cfg, committed.law, committed.prior, committed.seed]);
  const [sweep, setSweep] = useState<{ key: string; pts: SweepPoint[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    if (!parsed.ok) return;
    setBusy(true);
    // yield to paint the busy state first
    setTimeout(() => {
      const pts: SweepPoint[] = SCALES.map((s) => {
        const cfg = scaleCfg(committed.cfg, s);
        const e = runExperiment(parsed, cfg, committed.law, { seed: committed.seed + 17, prior: committed.prior, bootstrap: 0, runtime: false });
        return {
          scale: s,
          hardRetention: e.hardKept,
          faultFree: e.faultFreeProb,
          errRaw: Math.abs(e.raw.value - e.ideal.value),
          errReadout: Math.abs(e.readout.value - e.ideal.value),
          errAdaptive: Math.abs(e.adaptive.value - e.ideal.value),
        };
      });
      setSweep({ key, pts });
      setBusy(false);
    }, 30);
  };

  const stale = sweep && sweep.key !== key;
  const maxErr = sweep ? Math.max(0.05, ...sweep.pts.flatMap((p) => [p.errRaw, p.errReadout, p.errAdaptive])) * 1.1 : 1;

  return (
    <Panel
      title="Retention & error vs noise level"
      icon="📉"
      subtitle="Scales all three error rates (0× … 4× your current setting) on your circuit — shows where hard post-selection hits the exponential wall."
      right={
        <button
          onClick={run}
          disabled={busy || !parsed.ok}
          className="rounded-lg bg-violet-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40"
        >
          {busy ? "Running sweep…" : sweep ? "Re-run sweep" : "Run sweep"}
        </button>
      }
    >
      {!sweep ? (
        <p className="text-sm text-slate-400">Click “Run sweep” — {SCALES.length} simulations, usually a second or two.</p>
      ) : (
        <div className="space-y-4">
          {stale && <Notice tone="amber">Inputs changed since this sweep ran — re-run to refresh.</Notice>}
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-medium text-slate-200">Shot retention</div>
              <LineChart
                xLabel="noise scale (× current)"
                yLabel="retention"
                series={[
                  { label: "v1 hard post-selection (measured)", color: "#fb7185", points: sweep.pts.map((p) => ({ x: p.scale, y: p.hardRetention })) },
                  { label: "P(no gate fault) (analytic)", color: "#94a3b8", dashed: true, points: sweep.pts.map((p) => ({ x: p.scale, y: p.faultFree })) },
                  { label: "v2 adaptive (always 100%)", color: "#f472b6", points: sweep.pts.map((p) => ({ x: p.scale, y: 1 })) },
                ]}
              />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-200">|metric − ideal| (lower is better)</div>
              <LineChart
                xLabel="noise scale (× current)"
                yLabel="error"
                yMax={maxErr}
                yFormat={(v) => v.toFixed(2)}
                series={[
                  { label: "Raw", color: "#fb7185", points: sweep.pts.map((p) => ({ x: p.scale, y: p.errRaw })) },
                  { label: "Readout-only", color: "#fbbf24", points: sweep.pts.map((p) => ({ x: p.scale, y: p.errReadout })) },
                  { label: "Adaptive", color: "#f472b6", points: sweep.pts.map((p) => ({ x: p.scale, y: p.errAdaptive })) },
                ]}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Honest reading: adaptive weighting corrects <i>readout</i> confusion and uses every shot, but it cannot undo gate errors that land back inside the valid subspace (e.g. a
            weight-preserving error). The error curves flatten the readout part only.
          </p>
        </div>
      )}
    </Panel>
  );
}

export default function Compare() {
  const lab = useLab();
  const e = lab.experiment;
  const [showKnobs, setShowKnobs] = useState(false);

  const rows = useMemo(() => (e ? buildScorecard(e, lab.cfg) : []), [e, lab.cfg]);
  const budget = useMemo(() => (e ? budgetWithHardPS(lab.cfg.shots, e.hardKept) : []), [e, lab.cfg.shots]);

  if (!e) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-white">⚖️ Before → After</h1>
        <Notice tone="rose" title="No result yet">
          {lab.error} — fix the circuit on the <a className="underline" href="#/lab">Prototype Lab</a> page.
        </Notice>
      </div>
    );
  }

  const cfg = lab.cfg;
  const maxQ = Math.max(...budget.map((b) => b.qpuSeconds));
  const maxSpe = Math.max(...budget.map((b) => secondsPerEffectiveShot(b, cfg.shots)).filter(Number.isFinite));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">⚖️ Before → After</h1>
          <p className="mt-1 max-w-3xl text-slate-400">
            Every method on the same circuit, same noise, same shots. Metric: <b className="text-slate-200">{e.metricLabel}</b> · law: {lawLabel(lab.law)}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="rose">1q {pct(cfg.oneQ)}</Badge>
          <Badge tone="amber">2q {pct(cfg.twoQ)}</Badge>
          <Badge tone="violet">readout {pct(cfg.readout)}</Badge>
          <Badge tone="cyan">{cfg.shots.toLocaleString()} shots</Badge>
          <button onClick={() => setShowKnobs((s) => !s)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            {showKnobs ? "Hide knobs" : "Adjust noise"}
          </button>
          <button onClick={lab.rerun} className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-200 hover:border-violet-400">↻ new seed</button>
        </div>
      </div>

      {showKnobs && (
        <Panel title="Noise knobs (shared with the Lab)">
          <div className="max-w-xl">
            <NoiseKnobs cfg={cfg} onChange={lab.setCfg} compact />
          </div>
        </Panel>
      )}

      {e.noEffect && (
        <Notice tone="amber" title="No conservation law selected">
          Adaptive conservation has nothing to exploit and reduces to readout-only mitigation (the scorecard says so). Pick a law in the Lab to see it work.
        </Notice>
      )}
      {!e.noEffect && e.lawIdealValid < 0.999 && (
        <Notice tone="amber" title={`The ideal circuit satisfies this law only ${pct(e.lawIdealValid)} of the time`}>
          Post-selection and soft weighting both push towards the law, so they can move <i>away</i> from the true distribution. Check the TVD columns, not just the headline metric.
        </Notice>
      )}

      {/* side-by-side */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Side-by-side</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MethodCard title="Raw" icon="🔴" color="#fb7185" stat={e.raw} raw={e.raw} ideal={e.ideal} />
          <MethodCard title="Readout-only" icon="🟠" color="#fbbf24" stat={e.readout} raw={e.raw} ideal={e.ideal} />
          <MethodCard title="Runtime defaults" icon="🟡" color="#a3e635" stat={e.runtime} raw={e.raw} ideal={e.ideal} note="Approximation: readout mitigation on an independent run" />
          <MethodCard title="v1 Hard PS" icon="✂️" color="#38bdf8" stat={e.hardPS} raw={e.raw} ideal={e.ideal} valueNote="kept frac." note={`Keeps ${pct(e.hardKept)} of shots`} />
          <MethodCard title="v2 Adaptive" icon="📊" color="#f472b6" stat={e.adaptive} raw={e.raw} ideal={e.ideal} highlight note="Uses 100% of shots" />
          <MethodCard title="Ideal" icon="🟢" color="#34d399" stat={e.ideal} raw={e.raw} ideal={e.ideal} isIdeal />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel title="Headline metric" subtitle="white tick = ideal">
            <HBars
              marker={e.ideal.value}
              markerLabel="ideal"
              max={1}
              format={(v) => `${(v * 100).toFixed(1)}%`}
              bars={[
                { label: "Raw", value: e.raw.value, color: "#fb7185" },
                { label: "Readout-only", value: e.readout.value, color: "#fbbf24" },
                { label: "Runtime defaults", value: e.runtime.value, color: "#a3e635" },
                { label: "Adaptive (ours)", value: e.adaptive.value, color: "#f472b6", highlight: true },
                { label: "Ideal", value: e.ideal.value, color: "#34d399" },
              ]}
            />
          </Panel>
          <Panel title="Distance of the whole distribution to ideal" subtitle="TVD — lower is better">
            <HBars
              format={(v) => v.toFixed(3)}
              bars={[
                { label: "Raw", value: e.raw.tvd, color: "#fb7185" },
                { label: "Readout-only", value: e.readout.tvd, color: "#fbbf24" },
                { label: "Runtime defaults", value: e.runtime.tvd, color: "#a3e635" },
                { label: "v1 Hard PS", value: e.hardPS.tvd, color: "#38bdf8" },
                { label: "Adaptive (ours)", value: e.adaptive.tvd, color: "#f472b6", highlight: true },
              ]}
            />
          </Panel>
        </div>
        <Panel title="Output distributions" className="mt-5">
          <DistChart
            m={e.m}
            mask={lab.law.kind === "none" ? undefined : e.mask}
            topN={10}
            series={[
              { label: "Ideal", color: "#34d399", probs: e.idealProbs },
              { label: "Raw", color: "#fb7185", probs: e.pObs },
              { label: "Readout-only", color: "#fbbf24", probs: e.pMit },
              { label: "Hard PS", color: "#38bdf8", probs: e.hardPS.dist },
              { label: "Adaptive", color: "#f472b6", probs: e.adaptive.dist },
            ]}
          />
        </Panel>
      </section>

      {/* scorecard */}
      <Panel
        title="Judge's scorecard"
        icon="🏁"
        subtitle="Port of core/scorecard.py — raw vs Runtime defaults vs ours (plus two extra rows)"
        right={
          <div className="flex gap-2">
            <button onClick={() => downloadText("scorecard.csv", scorecardToCSV(rows), "text/csv")} className="rounded-md border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-400">CSV</button>
            <button onClick={() => downloadText("scorecard.json", scorecardToJSON(rows), "application/json")} className="rounded-md border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-400">JSON</button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-700">
                <th className="py-2 pr-3">Method</th>
                <th className="px-2 text-right">Value ± se</th>
                <th className="px-2 text-right">Ideal</th>
                <th className="px-2 text-right">Error</th>
                <th className="px-2 text-right">Gap closed</th>
                <th className="px-2 text-right">TVD</th>
                <th className="px-2 text-right">TVD gap</th>
                <th className="px-2 text-right">Jobs</th>
                <th className="px-2 text-right">QPU-s</th>
                <th className="px-2 text-right">Ret.</th>
                <th className="pl-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((r) => (
                <tr key={r.method} className={cn(r.ours && "bg-pink-400/5", !r.reference && "text-slate-400")}>
                  <td className="py-2 pr-3 font-medium text-slate-100">
                    {r.method}
                    {!r.reference && <span className="ml-1.5 text-[10px] font-normal uppercase text-slate-500">extra</span>}
                  </td>
                  <td className="px-2 text-right font-mono">
                    {r.observableValue.toFixed(4)}
                    <span className="text-slate-500"> ±{r.se.toFixed(3)}</span>
                  </td>
                  <td className="px-2 text-right font-mono">{r.idealValue.toFixed(4)}</td>
                  <td className="px-2 text-right font-mono">{r.error.toFixed(4)}</td>
                  <td className={cn("px-2 text-right font-mono", gapTone(r.gapClosedPct))}>{fmtGap(r.gapClosedPct)}</td>
                  <td className="px-2 text-right font-mono">{r.tvd.toFixed(3)}</td>
                  <td className={cn("px-2 text-right font-mono", gapTone(r.tvdGapClosedPct))}>{fmtGap(r.tvdGapClosedPct)}</td>
                  <td className="px-2 text-right font-mono">{r.qpuJobs}</td>
                  <td className="px-2 text-right font-mono">{r.qpuSecondsEstimate.toFixed(2)}</td>
                  <td className="px-2 text-right font-mono">{r.retentionPct.toFixed(1)}%</td>
                  <td className="max-w-[18rem] pl-3 text-xs text-slate-500">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Gap closed = (|raw−ideal| − |method−ideal|) / |raw−ideal|. “Ideal” is the exact statevector value (the Python reference samples it). Error bars are bootstrap over shot noise
          with calibration fixed. QPU seconds use scorecard.py’s formula max(1, shots/1000·0.5) — a model, not a measurement.
        </p>
      </Panel>

      {/* budget */}
      <Panel
        title="Budget meter"
        icon="⏱️"
        subtitle="Port of core/budget_meter.py — QPU cost per method (+ measured hard post-selection row)"
      >
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-700">
                  <th className="py-2 pr-3">Method</th>
                  <th className="px-2 text-right">Extra qubits</th>
                  <th className="px-2 text-right">Jobs</th>
                  <th className="px-2 text-right">Shots ×</th>
                  <th className="px-2 text-right">QPU-s</th>
                  <th className="px-2 text-right">Retention</th>
                  <th className="px-2 text-right">s / effective shot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {budget.map((b) => {
                  const spe = secondsPerEffectiveShot(b, cfg.shots);
                  return (
                    <tr key={b.name} className={cn(b.ours && "bg-pink-400/5")} title={b.notes}>
                      <td className="py-2 pr-3 font-medium text-slate-100">
                        {b.name}
                        {b.derived && <span className="ml-1.5 text-[10px] font-normal uppercase text-slate-500">measured</span>}
                        <div className="text-[11px] font-normal text-slate-500">{b.notes}</div>
                      </td>
                      <td className="px-2 text-right font-mono">{b.extraQubits > 0 ? `+${b.extraQubits}` : 0}</td>
                      <td className="px-2 text-right font-mono">{b.extraJobs}</td>
                      <td className="px-2 text-right font-mono">{b.extraShotsFactor.toFixed(1)}</td>
                      <td className="px-2 text-right font-mono">{b.qpuSeconds.toFixed(2)}</td>
                      <td className={cn("px-2 text-right font-mono", b.retentionPct < 90 ? "text-amber-300" : "text-slate-200")}>{b.retentionPct.toFixed(1)}%</td>
                      <td className="px-2 text-right font-mono">{(spe * 1000).toFixed(2)} ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-200">QPU seconds per method</div>
              <div className="space-y-2.5">
                {budget.map((b) => (
                  <Meter key={b.name} size="sm" value={b.qpuSeconds} max={maxQ} color={b.ours ? "#f472b6" : b.derived ? "#38bdf8" : "#64748b"} label={b.name} valueLabel={`${b.qpuSeconds.toFixed(1)} s`} />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-200">QPU time per full-weight shot kept</div>
              <div className="space-y-2.5">
                {budget.map((b) => {
                  const spe = secondsPerEffectiveShot(b, cfg.shots);
                  return <Meter key={b.name} size="sm" value={Number.isFinite(spe) ? spe : maxSpe} max={maxSpe} color={b.ours ? "#f472b6" : "#475569"} label={b.name} valueLabel={`${(spe * 1000).toFixed(2)} ms`} />;
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Adaptive vs ZNE QPU cost" value={`${(budget.find((b) => b.ours)!.qpuSeconds / budget.find((b) => b.name.startsWith("ZNE"))!.qpuSeconds * 100).toFixed(0)}%`} sub="of ZNE's QPU seconds" tone="pink" />
          <Stat label="Hard PS retention (measured)" value={pct(e.hardKept)} sub="shots surviving" tone="rose" />
          <Stat label="Adaptive extra qubits" value="0" sub="2 jobs: raw + calibration" tone="emerald" />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Reference numbers are modelled, not measured: base = 2 s + shots/1000·0.5 s, readout / adaptive × 1.8, ZNE × 3.5, repetition-code × 2.2 at an assumed 85% retention. Replace them with
          real <code>usage.quantum_seconds</code> from your jobs before presenting.
        </p>
      </Panel>

      <NoiseSweep />
    </div>
  );
}
