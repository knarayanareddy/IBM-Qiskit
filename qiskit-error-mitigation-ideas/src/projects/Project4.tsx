import { useMemo, useState } from 'react';
import { Circuit, type Gate } from '../components/Circuit';
import { BarCompare, Callout, CodeBlock, ControlBar, Histogram, LineChart, Panel, PhaseIntro, ShotGrid, Slider, Stat, Terminal, Versioned, f3, pct, type Mode } from '../components/ui';
import { Checklist, DiffTable, Formula } from '../components/extras';
import { P4_DEFAULT, analyzeP4, bits4, pop, simP4, type P4Params } from '../lib/sims';

const wColor = (o: number) => (pop(o) === 2 ? '#34d399' : pop(o) === 1 || pop(o) === 3 ? '#fbbf24' : '#fb7185');

const circuit = (() => {
  const gates: Gate[] = [
    { c: 0, type: 'box', q: 0, label: 'X' },
    { c: 0, type: 'box', q: 1, label: 'X' },
    { c: 1, type: 'span', q: 1, t: 2, label: 'U', tone: 'mit' },
    { c: 2, type: 'span', q: 0, t: 3, label: 'W', tone: 'mit' },
    { c: 3, type: 'noise', q: 0 },
    { c: 3, type: 'noise', q: 1 },
    { c: 3, type: 'noise', q: 2 },
    { c: 3, type: 'noise', q: 3 },
    { c: 4, type: 'span', q: 0, t: 3, label: 'W†', tone: 'mit' },
    { c: 5, type: 'span', q: 1, t: 2, label: 'U†', tone: 'mit' },
    ...[0, 1, 2, 3].map((q) => ({ c: 6, type: 'm' as const, q })),
  ];
  return {
    wires: [{ label: 'q0' }, { label: 'q1' }, { label: 'q2' }, { label: 'q3' }],
    gates,
    regions: [
      { from: 0, to: 0, label: '|1100⟩', color: '#22d3ee' },
      { from: 1, to: 5, label: 'weight-conserving payload (ideal = identity)', color: '#a78bfa' },
      { from: 6, to: 6, label: 'readout', color: '#94a3b8' },
    ],
  };
})();

const CODE_V1 = `import numpy as np, itertools
# per-qubit readout calibration: prepare |0000>, |1111> and measure
r01, r10 = calibrate_readout(backend)          # P(read 1|0), P(read 0|1)

def conf(o, t):                                  # P(observed o | true t)
    return np.prod([(1-r10 if ob else r10) if tb else (r01 if ob else 1-r01)
                    for ob, tb in zip(o, t)])

def weight(o, target=2):                         # P(true HW == target | o), uniform prior
    num = sum(conf(o, t) for t in states if sum(t) == target)
    den = sum(conf(o, t) for t in states)
    return num / den

est = sum(c * weight(o) for o, c in counts.items()) / shots`;
const CODE_V2 = `# v2: learn the prior with Iterative Bayesian Unfolding (EM) instead of assuming uniform
prior = np.ones(16) / 16
for _ in range(n_iter):
    post  = C * prior                                # C[o, t] = confusion matrix, shape (16, 16)
    post /= post.sum(axis=1, keepdims=True)          # P(t | o)
    prior = (p_obs[:, None] * post).sum(axis=0)      # new estimate of the true distribution

in_sym = [t for t in range(16) if bin(t).count("1") == 2]
p_sym  = prior[in_sym].sum()                         # P(true HW == 2)
p_1100 = prior[0b1100] / p_sym                       # symmetry-resolved target probability
# every shot contributes: weight(o) = sum_{t in sym} post[o, t]`;

export default function Project4({ mode, phase }: { mode: Mode; phase: number }) {
  const [par, setPar] = useState<P4Params>(P4_DEFAULT);
  const set = (k: keyof P4Params) => (v: number) => setPar({ ...par, [k]: v });
  const sim = useMemo(() => simP4(par), [par]);
  const R = useMemo(() => analyzeP4(sim, par), [sim, par]);
  const ceiling = R.truthW2 > 0 ? R.truthP1100 / R.truthW2 : 0;

  const view = (v: 'v1' | 'v2') => {
    const soft = v === 'v1' ? R.softV1 : R.softV2;
    switch (phase) {
      case 0:
        return (
          <>
            <PhaseIntro kicker="Phase 1 of 6" title="The problem & the idea" outputs={['target metric', 'conservation law']}>
              The circuit prepares |1100⟩ and applies weight-conserving operations, so every ideal shot has <b>Hamming weight 2</b> (think: particle number in chemistry). Hard post-selection throws away every shot that violates this.
              Project 4 instead gives every shot a <b>soft weight</b> = P(true weight = 2 | what I observed), computed from a measured readout confusion matrix — so a “violating” shot that is probably just a readout error still counts, partially.
            </PhaseIntro>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Ideal output">
                <Histogram bars={[{ label: '1100', value: 100, color: '#34d399', sub: '%' }, { label: '1010', value: 0, color: '#475569' }, { label: '0110', value: 0, color: '#475569' }, { label: '1000', value: 0, color: '#475569' }]} height={100} />
              </Panel>
              <Panel title="Observed (top outcomes, live)">
                <Histogram
                  bars={[...Array(16).keys()]
                    .sort((a, b) => sim.nO[b] - sim.nO[a])
                    .slice(0, 6)
                    .map((o) => ({ label: bits4(o), value: Math.round((sim.nO[o] / sim.N) * 100), color: wColor(o), sub: '%' }))}
                  height={100}
                />
              </Panel>
            </div>
            <div className="mt-5 grid gap-4">
              <Callout tone="bad" title="Metric trap in v1">
                Under hard post-selection, “P(HW = 2)” is <b>trivially 1.0</b> — you removed everything else by construction. A fair comparison needs a metric the filter can’t game: <b>P(|1100⟩ | weight 2)</b> — the probability of the <i>exact</i> target state.
                v2 reports both.
              </Callout>
              <DiffTable
                rows={[
                  ['Prior', 'Uniform over all 16 strings (a guess)', 'Learned from the data via EM / iterative Bayesian unfolding'],
                  ['Headline metric', 'P(HW=2) (trivial for hard PS)', 'P(|1100⟩ | symmetry) + P(HW=2), vs. exact-symmetry ceiling'],
                  ['Shots used', 'All (soft)', 'All (soft), with effective-sample-size reported'],
                  ['Extras', '—', 'Convergence trace; shows the ceiling imposed by symmetry-preserving errors'],
                ]}
              />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <PhaseIntro kicker="Phase 2 of 6" title="Build the weight-conserving circuit" outputs={['4-qubit circuit']}>
              X gates prepare |1100⟩. The payload U… U† conserves Hamming weight (e.g. XY / givens-rotation style gates) and ideally collapses to the identity, so the answer is known. Noise (⚡) in the payload causes two kinds of errors:
              <b> weight-preserving hops</b> (1100 → 1010: invisible to the symmetry) and <b>weight-breaking flips</b> (visible). Readout error then smears everything further.
            </PhaseIntro>
            <Circuit {...circuit} />
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <Stat label="Qubits" value={4} tone="cyan" />
              <Stat label="Extra qubits" value={0} sub="no ancilla needed!" tone="emerald" />
              <Stat label="Hops / layer" value={pct(par.hop)} tone="violet" sub="symmetric errors" />
              <Stat label="Flips / shot" value={pct(par.flip)} tone="rose" sub="symmetry-breaking" />
            </div>
            <div className="mt-5">
              <CodeBlock code={v === 'v1' ? CODE_V1 : CODE_V2} />
            </div>
          </>
        );
      case 2: {
        const items = sim.obs.slice(0, 400).map((o) => wColor(o));
        return (
          <>
            <PhaseIntro kicker="Phase 3 of 6" title="Run on a noisy backend" outputs={['16-outcome counts', 'calibration matrices']}>
              Readout is asymmetric (a 1 decays to 0 more often than 0 flips to 1), so “violations” are biased toward weight 1.
            </PhaseIntro>
            <ShotGrid
              items={items}
              legend={[
                { color: '#34d399', label: 'weight 2 (looks valid)', count: sim.obs.slice(0, 400).filter((o) => pop(o) === 2).length },
                { color: '#fbbf24', label: 'weight 1 or 3', count: sim.obs.slice(0, 400).filter((o) => pop(o) % 2 === 1).length },
                { color: '#fb7185', label: 'weight 0 or 4', count: sim.obs.slice(0, 400).filter((o) => pop(o) % 4 === 0).length },
              ]}
            />
            <div className="mt-5">
              <Panel title="All 16 observed bitstrings (q0 q1 q2 q3)">
                <Histogram bars={[...Array(16).keys()].map((o) => ({ label: bits4(o), value: sim.nO[o], color: wColor(o) }))} height={130} />
              </Panel>
            </div>
            <div className="mt-5">
              <Terminal title="counts">{`shots = ${sim.N}\nP(obs == 1100)    = ${f3(R.rawP1100)}\nP(obs HW == 2)    = ${f3(R.rawW2)}   # ideal 1.000\nreadout: P(0|1)=${par.r10}  P(1|0)=${par.r01}`}</Terminal>
            </div>
          </>
        );
      }
      case 3: {
        const top = [...Array(16).keys()].sort((a, b) => sim.nO[b] - sim.nO[a]).slice(0, 8);
        return (
          <>
            <PhaseIntro kicker="Phase 4 of 6" title={v === 'v1' ? 'Soft-reweight each shot with the confusion matrix' : 'Learn the prior, then reweight (EM)'} outputs={['per-shot weights w(o)', v === 'v2' ? 'learned prior π(t)' : 'soft estimate']}>
              {v === 'v1' ? 'w(o) = Σ_{t: HW=2} P(o|t) / Σ_t P(o|t) with a flat prior. A shot reading 1000 gets a moderate weight: it could be a weight-1 state, or 1100 whose second 1 decayed.' : 'The flat prior ignores that the true state is almost always 1100. EM repeatedly (1) computes P(t|o) given the current prior, (2) re-estimates the prior. Shots like 1000 are then recognised as “1100 + a T1 decay” and get proper credit.'}
            </PhaseIntro>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Single-qubit confusion matrix P(read | true)">
                <div className="mx-auto grid max-w-xs grid-cols-[auto_1fr_1fr] gap-1 text-center text-xs">
                  <div />
                  <div className="text-slate-400">read 0</div>
                  <div className="text-slate-400">read 1</div>
                  <div className="py-3 pr-2 text-right text-slate-400">true 0</div>
                  <div className="rounded-lg py-3 font-mono" style={{ background: `rgba(34,211,238,${1 - par.r01})` }}>
                    <span className="text-slate-950">{f3(1 - par.r01)}</span>
                  </div>
                  <div className="rounded-lg py-3 font-mono" style={{ background: `rgba(251,113,133,${Math.min(1, par.r01 * 8)})` }}>
                    {f3(par.r01)}
                  </div>
                  <div className="py-3 pr-2 text-right text-slate-400">true 1</div>
                  <div className="rounded-lg py-3 font-mono" style={{ background: `rgba(251,113,133,${Math.min(1, par.r10 * 8)})` }}>
                    {f3(par.r10)}
                  </div>
                  <div className="rounded-lg py-3 font-mono" style={{ background: `rgba(34,211,238,${1 - par.r10})` }}>
                    <span className="text-slate-950">{f3(1 - par.r10)}</span>
                  </div>
                </div>
                <div className="mt-2 text-center text-[10px] text-slate-500">tensor product over 4 qubits → 16×16 matrix C[o][t]</div>
              </Panel>
              {v === 'v1' ? (
                <Panel title="Top observed outcomes → soft weight">
                  <WeightTable top={top} sim={sim} w={R.softV1.weights} />
                </Panel>
              ) : (
                <Panel title="Learned prior π(t) after EM">
                  <Histogram bars={[...Array(16).keys()].filter((t) => R.softV2.prior[t] > 0.003 || pop(t) === 2).map((t) => ({ label: bits4(t), value: Math.round(R.softV2.prior[t] * 1000) / 10, color: wColor(t), sub: '%' }))} height={110} />
                </Panel>
              )}
            </div>
            {v === 'v2' && (
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Panel title="EM convergence of P(1100 | HW=2)">
                  <LineChart
                    series={[{ name: 'estimate', color: '#34d399', line: R.softV2.trace.map((y, x) => ({ x, y })), points: R.softV2.trace.map((y, x) => ({ x, y })).filter((_, i) => i % 5 === 0 || i === par.emIters) }]}
                    xDomain={[0, Math.max(1, par.emIters)]}
                    yDomain={[0.5, 1.02]}
                    hlines={[{ y: ceiling, label: `symmetry ceiling ${f3(ceiling)}`, color: '#fbbf24' }, { y: 1, label: 'ideal', color: '#34d399' }]}
                    xLabel="EM iteration"
                    height={230}
                  />
                </Panel>
                <Panel title="Top observed outcomes → soft weight (v2)">
                  <WeightTable top={top} sim={sim} w={R.softV2.weights} />
                </Panel>
              </div>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat label="Effective sample fraction" value={pct(soft.ess)} sub="(Σw)²/Σw² / N — shots actually working" tone="violet" />
              <Stat label="P(HW=2) estimate" value={f3(soft.w2)} sub={`true value ${f3(R.truthW2)}`} tone={Math.abs(soft.w2 - R.truthW2) < 0.05 ? 'emerald' : 'rose'} />
              <Stat label="P(1100 | HW=2) estimate" value={f3(soft.p1100)} sub={`ceiling ${f3(ceiling)}`} tone="cyan" />
            </div>
            <div className="mt-4">
              <Formula>w(o) = P(HW(t)=2 | o) = Σ_{'{t∈HW2}'} C[o][t]·π(t) / Σ_t C[o][t]·π(t)</Formula>
            </div>
          </>
        );
      }
      case 4: {
        const items = [
          { label: 'Unmitigated P(obs=1100)', value: R.rawP1100, color: '#fb7185' },
          { label: 'Hard post-selection', value: R.hardP1100, color: '#fbbf24', note: `keeps ${pct(R.hardRet)} of shots` },
          { label: 'Readout inversion', value: R.invP1100, color: '#a78bfa', note: 'no symmetry used' },
          { label: 'Soft reweighting (flat prior)', value: R.softV1.p1100, color: '#22d3ee', highlight: v === 'v1', note: `ESS ${pct(R.softV1.ess)}` },
          ...(v === 'v2' ? [{ label: 'Soft + EM prior (v2)', value: R.softV2.p1100, color: '#34d399', highlight: true, note: `uses 100% of shots, ${par.emIters} iters` }] : []),
        ];
        return (
          <>
            <PhaseIntro kicker="Phase 5 of 6" title="Results vs. ideal" outputs={['P(1100) per method', 'P(HW=2) audit', 'ceiling']}>
              Amber line = best any symmetry-based method can do: weight-preserving hops (1100→1010…) are invisible to the conservation law, so P(1100 | HW=2) can’t exceed {f3(ceiling)}.
            </PhaseIntro>
            <Panel>
              <BarCompare items={items} ideal={1} lo={0.6} hi={1.02} floor={ceiling} floorLabel="symmetry ceiling (hops are undetectable)" />
            </Panel>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Panel title="P(weight = 2) audit — why the v1 metric misleads">
                <table className="w-full text-xs">
                  <tbody className="font-mono text-slate-200">
                    {[
                      ['True value (hidden)', R.truthW2, 'text-slate-400'],
                      ['Raw observed', R.rawW2, 'text-rose-300'],
                      ['Hard post-select', 1, 'text-amber-300'],
                      ['Soft, flat prior (v1)', R.softV1.w2, 'text-cyan-300'],
                      ['Soft, EM prior (v2)', R.softV2.w2, 'text-emerald-300'],
                    ].map(([l, x, c]) => (
                      <tr key={l as string} className="border-t border-white/5">
                        <td className="py-2 font-sans text-slate-300">{l}</td>
                        <td className={`py-2 text-right ${c}`}>{f3(x as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-slate-500">Hard PS reports 1.000 by construction. A flat prior badly under-estimates. EM lands on the true value.</p>
              </Panel>
              <Terminal>{`Project 4 — Adaptive Conservation PS (${v})
shots              : ${sim.N}
Unmitigated P(1100): ${f3(R.rawP1100)}
Hard PS    P(1100) : ${f3(R.hardP1100)}   (keeps ${pct(R.hardRet)})
Readout inv.       : ${f3(R.invP1100)}
Soft (flat)        : ${f3(R.softV1.p1100)}   ESS ${pct(R.softV1.ess)}${v === 'v2' ? `\nSoft + EM (v2)     : ${f3(R.softV2.p1100)}   ESS ${pct(R.softV2.ess)}` : ''}
ceiling (symmetry) : ${f3(ceiling)}`}</Terminal>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
              <Stat label="v1 soft" value={f3(R.softV1.p1100)} tone="amber" sub={`gap to ceiling ${f3(Math.abs(ceiling - R.softV1.p1100))}`} />
              <Stat label="v2 soft + EM" value={f3(R.softV2.p1100)} tone="emerald" sub={`gap to ceiling ${f3(Math.abs(ceiling - R.softV2.p1100))}`} />
            </div>
          </>
        );
      }
      default:
        return (
          <>
            <PhaseIntro kicker="Phase 6 of 6" title="Hackathon-day adaptation" outputs={['conservation-law audit', 'calibration plan']}>
              Cheapest approach in qubits (no ancilla), and uses every shot — a strong fit if the standard algorithm is a VQE / chemistry-style / fixed-excitation circuit.
            </PhaseIntro>
            <div className="grid gap-5 lg:grid-cols-2">
              <Checklist
                title="Plan"
                tone="emerald"
                items={['Verify the conservation law on a noiseless simulator first (sum of probabilities in the symmetry sector = 1).', 'Run a 2-circuit readout calibration (|0…0⟩, |1…1⟩) on the same qubits, same day, same job batch.', 'Prefer per-qubit confusion (tensored) for n > ~10 qubits; full 2ⁿ matrices explode.', 'Report P(target) AND effective sample size.']}
              />
              <Checklist
                title="Risks"
                tone="rose"
                items={['Only symmetry-violating errors are exposed; hops inside the sector remain. State the ceiling honestly.', 'Correlated readout errors (crosstalk) break the tensored model — verify with the 4-qubit calibration.', 'If the prior is wrong *and* data is scarce, EM can over-fit: cap iterations / regularise.', 'Calibration drifts: recalibrate inside the same session.']}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div>
      <ControlBar onRerun={() => setPar({ ...par, seed: Math.floor(Math.random() * 1e6) })}>
        <Slider label="Weight-preserving hop / layer" value={par.hop} onChange={set('hop')} min={0} max={0.2} step={0.005} fmt={pct} hint="symmetric error — undetectable" />
        <Slider label="Weight-breaking flip / shot" value={par.flip} onChange={set('flip')} min={0} max={0.2} step={0.005} fmt={pct} />
        <Slider label="Readout P(0|1)" value={par.r10} onChange={set('r10')} min={0} max={0.2} step={0.005} fmt={pct} />
        <Slider label="Readout P(1|0)" value={par.r01} onChange={set('r01')} min={0} max={0.1} step={0.005} fmt={pct} />
        <Slider label="v2 EM iterations" value={par.emIters} onChange={set('emIters')} min={0} max={60} step={1} />
        <Slider label="Shots" value={par.shots} onChange={set('shots')} min={500} max={20000} step={500} />
      </ControlBar>
      <Versioned mode={mode} phase={phase} render={view} />
    </div>
  );
}

function WeightTable({ top, sim, w }: { top: number[]; sim: { nO: number[] }; w: number[] }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-slate-500">
        <tr>
          <th className="pb-1 text-left font-normal">observed</th>
          <th className="pb-1 text-left font-normal">HW</th>
          <th className="pb-1 text-right font-normal">count</th>
          <th className="pb-1 pl-3 text-left font-normal">weight w(o)</th>
        </tr>
      </thead>
      <tbody className="font-mono text-slate-200">
        {top.map((o) => (
          <tr key={o} className="border-t border-white/5">
            <td className="py-1.5" style={{ color: wColor(o) }}>
              {bits4(o)}
            </td>
            <td>{pop(o)}</td>
            <td className="text-right">{sim.nO[o]}</td>
            <td className="pl-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 rounded bg-white/10">
                  <div className="h-1.5 rounded bg-emerald-400" style={{ width: `${w[o] * 100}%` }} />
                </div>
                {w[o].toFixed(2)}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
