import { useMemo, useState } from 'react';
import { Circuit, type Gate } from '../components/Circuit';
import { BarCompare, Callout, CodeBlock, ControlBar, Funnel, LineChart, Panel, PhaseIntro, Slider, Stat, Terminal, Toggle, Versioned, f3, type Mode, type Series } from '../components/ui';
import { Checklist, DiffTable, Formula } from '../components/extras';
import { P2_DEFAULT, fitZne, p2BiasFloor, scalesFor, simP2, type P2Params } from '../lib/sims';

/** Build the benchmark circuit, folding T (and optionally CX) k times. */
function buildCircuit(k: number, foldCX: boolean) {
  const gates: Gate[] = [];
  let c = 0;
  const seq: { kind: 'H' | 'T' | 'CX' | 'M'; q: number; t?: number }[] = [
    { kind: 'H', q: 0 },
    { kind: 'T', q: 0 },
    { kind: 'CX', q: 0, t: 1 },
    { kind: 'T', q: 1 },
    { kind: 'CX', q: 0, t: 1 },
    { kind: 'H', q: 0 },
    { kind: 'T', q: 0 },
  ];
  for (const s of seq) {
    if (s.kind === 'H') gates.push({ c: c++, type: 'box', q: s.q, label: 'H' });
    if (s.kind === 'T') {
      gates.push({ c: c++, type: 'box', q: s.q, label: 'T' });
      for (let i = 0; i < k; i++) {
        gates.push({ c: c++, type: 'box', q: s.q, label: 'T†', tone: 'fold' });
        gates.push({ c: c++, type: 'box', q: s.q, label: 'T', tone: 'fold' });
      }
    }
    if (s.kind === 'CX') {
      gates.push({ c: c++, type: 'cx', q: s.q, t: s.t });
      if (foldCX)
        for (let i = 0; i < k; i++) {
          gates.push({ c: c++, type: 'cx', q: s.q, t: s.t, tone: 'fold' });
          gates.push({ c: c++, type: 'cx', q: s.q, t: s.t, tone: 'fold' });
        }
    }
  }
  gates.push({ c: c, type: 'm', q: 0 });
  return { gates, cols: c + 1 };
}

const CODE_V1 = `def fold_t_gates(qc, k):
    """T -> T (T† T)^k : same unitary, (1+2k)x the non-Clifford noise."""
    out = qc.copy_empty_like()
    for inst in qc.data:
        out.append(inst)
        if inst.operation.name == "t":
            q = inst.qubits[0]
            for _ in range(k):
                out.barrier(q); out.tdg(q); out.barrier(q); out.t(q)  # barriers stop the transpiler cancelling T†T
    return out

lams   = [1, 3, 5]
values = [expval_z0(run(fold_t_gates(qc, (l - 1)//2))) for l in lams]
zne    = np.polyfit(lams, values, 1)[1]       # linear, evaluated at lambda = 0`;
const CODE_V2 = `def fold_gates(qc, k, names=("t", "cx")):
    """Global-ish folding on BOTH the non-Clifford and the entangling layers."""
    out = qc.copy_empty_like()
    for inst in qc.data:
        out.append(inst)
        if inst.operation.name in names:
            for _ in range(k):
                out.barrier(*inst.qubits)
                out.append(inst.operation.inverse(), inst.qubits)
                out.barrier(*inst.qubits)
                out.append(inst.operation, inst.qubits)
    return out

# exponential extrapolation, weighted by shot noise, + bootstrap CI
w   = (np.array(vals) / np.array(sig)) ** 2
b, a = np.polyfit(lams, np.log(vals), 1, w=np.sqrt(w))
zne  = np.exp(a)                               # value at lambda = 0

# or let the runtime do it:
# estimator.options.resilience.zne_mitigation = True
# estimator.options.resilience.zne.noise_factors = (1, 3, 5)
# estimator.options.resilience.zne.extrapolator = "exponential"`;

export default function Project2({ mode, phase }: { mode: Mode; phase: number }) {
  const [par, setPar] = useState<P2Params>(P2_DEFAULT);
  const [k, setK] = useState(1);
  const pts1 = useMemo(() => simP2(par, 'v1'), [par]);
  const pts2 = useMemo(() => simP2(par, 'v2'), [par]);
  const lin1 = useMemo(() => fitZne(pts1, 'linear', par.seed), [pts1, par.seed]);
  const fits2 = useMemo(
    () => ({ linear: fitZne(pts2, 'linear', par.seed), rich: fitZne(pts2, 'richardson', par.seed), exp: fitZne(pts2, 'exp', par.seed) }),
    [pts2, par.seed],
  );
  const set = (key: keyof P2Params) => (v: number) => setPar({ ...par, [key]: v });
  const lams = scalesFor(par.nScales);
  const maxL = lams[lams.length - 1];
  const floor1 = p2BiasFloor(par, 'v1');
  const aTeff = par.virtualT ? 0 : par.aT;

  const view = (v: 'v1' | 'v2') => {
    const pts = v === 'v1' ? pts1 : pts2;
    switch (phase) {
      case 0:
        return (
          <>
            <PhaseIntro kicker="Phase 1 of 6" title="The problem & the idea" outputs={['target metric', 'noise budget']}>
              Zero-noise extrapolation (ZNE) measures the observable at <i>amplified</i> noise levels λ = 1, 3, 5… and extrapolates back to λ = 0. Project 2 amplifies noise <b>only where it hurts most — the non-Clifford T layers</b> — by
              replacing T with T·(T†T)^k: the ideal unitary is identical, but there are 1+2k times as many noisy T gates. Benchmark: ⟨Z₀⟩ of an H/T/CX circuit, ideal ≈ <b>+{par.E0.toFixed(2)}</b>.
            </PhaseIntro>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Noise budget of the benchmark (decay exponent)">
                <Funnel
                  stages={[
                    { label: 'Clifford layers (H, CX) — v1 never touches these', value: par.aC, of: par.aC + aTeff || 1, color: '#fb7185' },
                    { label: par.virtualT ? 'T layers (virtual Rz on IBM hardware: ≈ 0 noise!)' : 'T layers — amplified by folding', value: aTeff, of: par.aC + aTeff || 1, color: '#fbbf24' },
                  ]}
                />
                <div className="mt-3 font-mono text-xs text-slate-400">⟨Z⟩(λ) = E₀ · exp(−a_C·λ_C − a_T·λ_T)</div>
              </Panel>
              <Panel title="What ZNE must undo">
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Ideal E₀" value={par.E0.toFixed(2)} tone="emerald" />
                  <Stat label="Noisy λ=1" value={f3(pts1[0].y)} tone="rose" />
                  <Stat label="Decay" value={`${((1 - pts1[0].y / par.E0) * 100).toFixed(0)}%`} tone="amber" sub="signal lost" />
                </div>
              </Panel>
            </div>
            <div className="mt-5 grid gap-4">
              <Callout tone="bad" title="Critical catch in v1 — two hidden problems">
                (1) <b>Bias floor.</b> Extrapolating T-noise to zero still leaves all Clifford noise: even with infinite shots v1 converges to E₀·e^(−a_C) = <b>{f3(floor1)}</b>, not {par.E0}. (2) <b>On IBM QPUs T is a virtual Rz</b> (a
                frame change, ~zero error) — folding it amplifies nothing. Flip the “virtual T” switch above to watch v1 collapse.
              </Callout>
              <DiffTable
                rows={[
                  ['Folded gates', 'T only', 'T and CX (the layers that really cost fidelity)'],
                  ['Extrapolator', 'Linear (underestimates exponential decay)', 'Exponential, shot-noise weighted; Richardson & linear as cross-checks'],
                  ['Bias floor', 'E₀·e^(−a_C) — Clifford noise untouched', 'None (up to model error)'],
                  ['Uncertainty', 'None', 'Bootstrap 1σ band on the extrapolated value'],
                ]}
              />
            </div>
          </>
        );
      case 1: {
        const kk = k;
        const { gates, cols } = buildCircuit(kk, v === 'v2');
        return (
          <>
            <PhaseIntro kicker="Phase 2 of 6" title="Fold the circuit to amplify noise" outputs={['family of folded circuits', 'scale factors λ']}>
              Pick a fold number k. Orange gates are the inserted identity pairs. Scale factor λ = 1 + 2k.{' '}
              {v === 'v1' ? 'Only T gates are folded — CX gates stay as they are.' : 'Both T and CX are folded so every noisy layer is amplified by the same λ.'}
            </PhaseIntro>
            <div className="mb-3 max-w-sm">
              <Slider label={`Fold number k  →  λ = ${1 + 2 * kk}`} value={kk} onChange={setK} min={0} max={3} step={1} />
            </div>
            <Circuit wires={[{ label: 'q0' }, { label: 'q1' }]} gates={gates} cols={cols} />
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat label="Scale factor λ" value={1 + 2 * kk} tone="amber" />
              <Stat label="T gates" value={3 * (1 + 2 * kk)} tone="cyan" sub="was 3" />
              <Stat label="CX gates" value={v === 'v2' ? 2 * (1 + 2 * kk) : 2} tone={v === 'v2' ? 'rose' : 'slate'} sub="was 2" />
            </div>
            <div className="mt-5">
              <CodeBlock code={v === 'v1' ? CODE_V1 : CODE_V2} />
            </div>
            <div className="mt-3">
              <Callout tone="warn" title="Transpiler trap">
                Without barriers (or optimization_level=0 on those regions) the transpiler will cancel T†·T back to identity and your “amplified” circuit silently has λ = 1.
              </Callout>
            </div>
          </>
        );
      }
      case 2:
        return (
          <>
            <PhaseIntro kicker="Phase 3 of 6" title="Run every folded circuit" outputs={['⟨Z₀⟩(λ) per scale', 'raw 0/1 counts']}>
              Each scale factor is a separate job of {par.shots.toLocaleString()} shots. Notice how the signal shrinks <i>and</i> the relative error grows with λ — the price of extrapolation.
            </PhaseIntro>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400">
                  <tr>
                    <th className="p-2.5">λ</th>
                    <th className="p-2.5">counts[0]</th>
                    <th className="p-2.5">counts[1]</th>
                    <th className="p-2.5">⟨Z₀⟩ measured</th>
                    <th className="p-2.5">1σ</th>
                    <th className="p-2.5">rel. error</th>
                    <th className="p-2.5">true ⟨Z⟩ (hidden)</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-slate-200">
                  {pts.map((p) => (
                    <tr key={p.lam} className="border-t border-white/5">
                      <td className="p-2.5 text-amber-300">{p.lam}</td>
                      <td className="p-2.5">{p.k1}</td>
                      <td className="p-2.5">{p.n - p.k1}</td>
                      <td className="p-2.5">{f3(p.y)}</td>
                      <td className="p-2.5">±{f3(p.sigma)}</td>
                      <td className="p-2.5">{((p.sigma / Math.max(1e-3, p.y)) * 100).toFixed(1)}%</td>
                      <td className="p-2.5 text-slate-500">{f3(p.exact)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {par.virtualT && v === 'v1' && (
              <div className="mt-4">
                <Callout tone="bad" title="Flat curve!">
                  With virtual T gates every λ gives the same value (within shot noise). There is nothing to extrapolate — the fit will just amplify the noise.
                </Callout>
              </div>
            )}
          </>
        );
      case 3: {
        const xmax = maxL + 0.4;
        const sample = (f: (x: number) => number) => Array.from({ length: 50 }, (_, i) => ({ x: (xmax * i) / 49, y: f((xmax * i) / 49) }));
        const series: Series[] = [{ name: 'measured ⟨Z₀⟩(λ) ±1σ', color: '#f8fafc', points: pts.map((p) => ({ x: p.lam, y: p.y, err: p.sigma })) }];
        const markers = [];
        if (v === 'v1') {
          series.push({ name: 'linear fit', color: '#fbbf24', line: sample(lin1.f) });
          markers.push({ x: 0, y: lin1.value, color: '#fbbf24', label: `ZNE ${f3(lin1.value)}` });
        } else {
          series.push({ name: 'linear', color: '#fbbf24', line: sample(fits2.linear.f), dashed: true, width: 1.5 });
          series.push({ name: 'Richardson', color: '#a78bfa', line: sample(fits2.rich.f), dashed: true, width: 1.5 });
          series.push({ name: 'exponential (chosen)', color: '#34d399', line: sample(fits2.exp.f), width: 2.5 });
          markers.push({ x: 0, y: fits2.exp.value, color: '#34d399', label: `exp ${f3(fits2.exp.value)} ±${f3(fits2.exp.sigma)}` });
        }
        return (
          <>
            <PhaseIntro kicker="Phase 4 of 6" title="Extrapolate to zero noise" outputs={['fit curve', 'λ→0 estimate', v === 'v2' ? 'bootstrap σ' : 'point estimate']}>
              {v === 'v1' ? 'A straight line through the points, read off at λ = 0. Real noise decays exponentially, so the line undershoots — and the amber floor shows what the T-only fold can never reach.' : 'Noise attenuates expectation values exponentially, so an exponential model fits the physics. We weight by shot noise and bootstrap 300 resamples for the uncertainty.'}
            </PhaseIntro>
            <Panel>
              <LineChart
                series={series}
                xDomain={[0, xmax]}
                yDomain={[0, Math.max(0.7, par.E0 + 0.15)]}
                xLabel={v === 'v1' ? 'T-fold scale factor λ_T' : 'global noise scale factor λ'}
                yLabel="⟨Z₀⟩"
                hlines={[
                  { y: par.E0, label: `ideal ${par.E0}`, color: '#34d399' },
                  ...(v === 'v1' ? [{ y: floor1, label: 'v1 bias floor (Clifford noise)', color: '#f59e0b' }] : []),
                ]}
                markers={markers}
                xTicks={[0, ...lams]}
              />
            </Panel>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {v === 'v1' ? (
                <>
                  <Stat label="Linear ZNE" value={f3(lin1.value)} tone="amber" />
                  <Stat label="Floor (∞ shots)" value={f3(floor1)} tone="rose" sub="best v1 could ever do" />
                  <Stat label="Shot-noise σ" value={`±${f3(lin1.sigma)}`} tone="cyan" />
                </>
              ) : (
                <>
                  <Stat label="Linear" value={f3(fits2.linear.value)} tone="amber" sub="underestimates" />
                  <Stat label="Richardson" value={f3(fits2.rich.value)} tone="violet" sub={`σ ±${f3(fits2.rich.sigma)} (noisy)`} />
                  <Stat label="Exponential" value={f3(fits2.exp.value)} tone="emerald" sub={`σ ±${f3(fits2.exp.sigma)}`} />
                </>
              )}
            </div>
          </>
        );
      }
      case 4: {
        const raw = pts1[0];
        const items =
          v === 'v1'
            ? [
                { label: 'Unmitigated (λ=1)', value: raw.y, err: raw.sigma, color: '#fb7185' },
                { label: 'NC-ZNE (T-only, linear)', value: lin1.value, err: lin1.sigma, color: '#fbbf24', highlight: true },
              ]
            : [
                { label: 'Unmitigated (λ=1)', value: raw.y, err: raw.sigma, color: '#fb7185' },
                { label: 'Linear', value: fits2.linear.value, err: fits2.linear.sigma, color: '#fbbf24' },
                { label: 'Richardson', value: fits2.rich.value, err: fits2.rich.sigma, color: '#a78bfa' },
                { label: 'Exponential', value: fits2.exp.value, err: fits2.exp.sigma, color: '#34d399', highlight: true },
              ];
        const best = v === 'v1' ? lin1.value : fits2.exp.value;
        const bestSig = v === 'v1' ? lin1.sigma : fits2.exp.sigma;
        return (
          <>
            <PhaseIntro kicker="Phase 5 of 6" title="Results vs. ideal" outputs={['mitigated ⟨Z₀⟩', 'bias / variance', 'cost multiplier']}>
              ZNE trades <b>bias</b> for <b>variance</b>: the extrapolated value is closer to ideal, but its error bar is wider than the raw point.
            </PhaseIntro>
            <Panel>
              <BarCompare items={items} ideal={par.E0} lo={0} hi={0.65} floor={v === 'v1' ? floor1 : undefined} floorLabel="v1 convergence floor" />
            </Panel>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Terminal>{`Project 2 — Non-Clifford ZNE (${v})
shots / scale   : ${par.shots}   scales: ${lams.join(', ')}
ideal  <Z0>     : ${par.E0.toFixed(3)}
unmitigated     : ${f3(raw.y)} ± ${f3(raw.sigma)}
${v === 'v1' ? `NC-ZNE linear   : ${f3(lin1.value)} ± ${f3(lin1.sigma)}` : `linear          : ${f3(fits2.linear.value)} ± ${f3(fits2.linear.sigma)}\nrichardson      : ${f3(fits2.rich.value)} ± ${f3(fits2.rich.sigma)}\nexponential     : ${f3(fits2.exp.value)} ± ${f3(fits2.exp.sigma)}`}
|bias| vs ideal : ${f3(Math.abs(par.E0 - best))}   (raw ${f3(Math.abs(par.E0 - raw.y))})
QPU cost        : ${par.nScales}x jobs, up to ${maxL}x circuit depth`}</Terminal>
              <Panel title="Before → After">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="v1 error" value={f3(Math.abs(par.E0 - lin1.value))} tone="amber" sub={`σ ±${f3(lin1.sigma)}`} />
                  <Stat label="v2 error" value={f3(Math.abs(par.E0 - fits2.exp.value))} tone="emerald" sub={`σ ±${f3(fits2.exp.sigma)}`} />
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  v1 is limited by a hard floor of {f3(Math.abs(par.E0 - floor1))}; v2 has no floor but pays with variance (±{f3(bestSig)}). Raise shots or lower the largest λ to tighten it.
                </div>
              </Panel>
            </div>
          </>
        );
      }
      default:
        return (
          <>
            <PhaseIntro kicker="Phase 6 of 6" title="Hackathon-day adaptation" outputs={['fold plan', 'baseline to beat']}>
              If the organisers’ algorithm is Clifford+T (or has Toffolis), ZNE is a natural candidate — but be strategic about <i>what</i> you fold.
            </PhaseIntro>
            <div className="grid gap-5 lg:grid-cols-2">
              <Checklist
                title="Do this"
                tone="emerald"
                items={[
                  'Check the transpiled circuit’s basis: IBM Heron/Eagle basis is {rz, sx, x, cz/ecr}. Count 2-qubit gates — that is where the real noise lives.',
                  'Fold the 2-qubit gates (CX/CZ/ECR) and use λ ∈ {1, 3, 5}; add 7 only if shot budget allows.',
                  'Use exponential extrapolation; report the linear one as a sanity check.',
                  'Always report σ. Mitigated values with no error bars won’t be convincing.',
                ]}
              />
              <Checklist
                title="Watch out"
                tone="rose"
                items={[
                  'Folded circuits are λ× deeper → T1/T2 decay is not purely “gate noise”; exponential model can break at λ ≥ 5.',
                  'Shot noise explodes after extrapolation: Var ∝ (Σ c_i²σ_i²). Budget shots toward larger λ.',
                  'Compare to the built-in Runtime ZNE & twirling so judges see your improvement over the default.',
                  'Coherent errors don’t fold into exponentials — add Pauli twirling (randomised compiling) first.',
                ]}
              />
            </div>
            <div className="mt-5">
              <Callout tone="info" title="Pitch line">
                “We identified that T-only folding leaves a Clifford-noise floor and is a no-op on virtual-Rz hardware, so we fold the entangling layers and use a shot-noise-weighted exponential fit with bootstrap error bars.”
              </Callout>
            </div>
            <div className="mt-5">
              <Formula>λ-grid → E(λ) → fit → E(0) ± σ</Formula>
            </div>
          </>
        );
    }
  };

  return (
    <div>
      <ControlBar onRerun={() => setPar({ ...par, seed: Math.floor(Math.random() * 1e6) })}>
        <Slider label="Clifford-layer noise a_C" value={par.aC} onChange={set('aC')} min={0} max={0.6} step={0.01} />
        <Slider label="T-layer noise a_T" value={par.aT} onChange={set('aT')} min={0} max={0.5} step={0.01} />
        <Slider label="Shots per scale" value={par.shots} onChange={set('shots')} min={500} max={30000} step={500} />
        <Slider label="Number of scale factors" value={par.nScales} onChange={set('nScales')} min={2} max={5} step={1} fmt={(v) => `${v}  (λ=${scalesFor(v).join(',')})`} />
        <Slider label="Ideal ⟨Z₀⟩" value={par.E0} onChange={set('E0')} min={0.2} max={0.9} step={0.05} />
        <Toggle label="T is a virtual Rz (IBM hardware reality)" value={par.virtualT} onChange={(v) => setPar({ ...par, virtualT: v })} hint="T-folding then amplifies nothing" />
      </ControlBar>
      <Versioned mode={mode} phase={phase} render={view} />
    </div>
  );
}
