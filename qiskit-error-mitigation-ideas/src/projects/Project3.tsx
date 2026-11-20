import { useMemo, useState } from 'react';
import { Circuit, type Gate } from '../components/Circuit';
import { BarCompare, Callout, CodeBlock, ControlBar, Histogram, LineChart, Panel, PhaseIntro, ShotGrid, Slider, Stat, Terminal, Versioned, f3, pct, type Mode } from '../components/ui';
import { Checklist, DiffTable, Formula } from '../components/extras';
import { P3_DEFAULT, p3Decisions, p3Estimate, p3Exact, p3Sweep, p3Table, simP3, type P3Params, type P3Mode } from '../lib/sims';

const circuit = (() => {
  const gates: Gate[] = [
    { c: 0, type: 'cx', q: 0, t: 1 },
    { c: 1, type: 'cx', q: 0, t: 2 },
    { c: 2, type: 'noise', q: 0 },
    { c: 2, type: 'noise', q: 1 },
    { c: 2, type: 'noise', q: 2 },
    { c: 3, type: 'cx', q: 0, t: 3, tone: 'mit' },
    { c: 4, type: 'cx', q: 1, t: 3, tone: 'mit' },
    { c: 5, type: 'cx', q: 1, t: 4, tone: 'mit' },
    { c: 6, type: 'cx', q: 2, t: 4, tone: 'mit' },
    ...[0, 1, 2, 3, 4].map((q) => ({ c: 7, type: 'm' as const, q })),
  ];
  return {
    wires: [{ label: 'd0 |ψ⟩' }, { label: 'd1' }, { label: 'd2' }, { label: 's0', tone: 'anc' as const }, { label: 's1', tone: 'anc' as const }],
    gates,
    regions: [
      { from: 0, to: 1, label: 'encode', color: '#22d3ee' },
      { from: 2, to: 2, label: 'noise', color: '#fb7185' },
      { from: 3, to: 6, label: 'syndrome extraction', color: '#a78bfa' },
      { from: 7, to: 7, label: 'readout', color: '#94a3b8' },
    ],
  };
})();

const COL = { ok: '#34d399', fixed: '#a78bfa', wrong: '#fb7185', caught: '#22d3ee', wasted: '#475569' };

const CODE_V1 = `# 3-qubit repetition code, detection only
qc.cx(d[0], d[1]); qc.cx(d[0], d[2])          # encode |0> -> |000>
...                                            # algorithm / idle noise
qc.cx(d[0], s[0]); qc.cx(d[1], s[0])           # s0 = d0 ^ d1
qc.cx(d[1], s[1]); qc.cx(d[2], s[1])           # s1 = d1 ^ d2
qc.measure(s, syn); qc.measure(d, out)

survivors = {k: v for k, v in counts.items() if k.split()[0] == "00"}  # syndrome clean
z0 = expval_z(survivors, qubit=0) / (1 - 2 * r_readout)               # readout-mitigate`;
const CODE_V2 = `# v2: same circuit, smarter classical decoder (confidence-gated)
import itertools
def posterior(p_eff, a):
    mass, flip0 = np.zeros(4), np.zeros(4)
    for e in itertools.product([0, 1], repeat=3):            # data flips
        for se in itertools.product([0, 1], repeat=2):       # syndrome-bit errors
            pr = np.prod([p_eff if b else 1 - p_eff for b in e]) * \\
                 np.prod([a if b else 1 - a for b in se])
            s = ((e[0]^e[1]^se[0]) << 1) | (e[1]^e[2]^se[1])
            mass[s] += pr; flip0[s] += pr * e[0]
    return mass, flip0 / mass                                # P(s), P(q0 flipped | s)

for s, pf in enumerate(p_flip0):
    conf = max(pf, 1 - pf)
    action[s] = ("keep+correct" if pf > .5 else "keep") if conf >= TAU else "discard"`;

export default function Project3({ mode, phase }: { mode: Mode; phase: number }) {
  const [par, setPar] = useState<P3Params>(P3_DEFAULT);
  const set = (k: keyof P3Params) => (v: number) => setPar({ ...par, [k]: v });
  const shots = useMemo(() => simP3(par), [par]);
  const exact = useMemo(() => p3Exact(par), [par]);
  const table = useMemo(() => p3Table(par), [par]);
  const sweep = useMemo(() => p3Sweep(par), [par]);
  const keepAll = [0, 1, 2, 3].map(() => ({ keep: true, corr0: false }));
  const est = useMemo(
    () => ({
      raw: p3Estimate(shots, keepAll, par, false),
      ro: p3Estimate(shots, keepAll, par, true),
      detect: p3Estimate(shots, p3Decisions(par, 'detect'), par, false),
      detectRo: p3Estimate(shots, p3Decisions(par, 'detect'), par, true),
      correctRo: p3Estimate(shots, p3Decisions(par, 'correct'), par, true),
      gatedRo: p3Estimate(shots, p3Decisions(par, 'gated'), par, true),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shots, par],
  );

  const view = (v: 'v1' | 'v2') => {
    const m: P3Mode = v === 'v1' ? 'detect' : 'gated';
    const dec = p3Decisions(par, m);
    const headline = v === 'v1' ? est.detectRo : est.gatedRo;
    switch (phase) {
      case 0:
        return (
          <>
            <PhaseIntro kicker="Phase 1 of 6" title="The problem & the idea" outputs={['target metric', 'QEM↔QEC continuum']}>
              Encode one logical bit in a 3-qubit repetition code (|0⟩_L = |000⟩). Two syndrome ancillas compute d0⊕d1 and d1⊕d2. A non-zero syndrome means “a bit-flip happened” — discard the shot. On the survivors, we also
              correct the readout. Metric: <b>⟨Z₀⟩</b>, ideal = <b>+1</b>.
            </PhaseIntro>
            <Panel title="The QEM ↔ QEC continuum">
              <div className="relative mt-2 flex items-center justify-between px-2 py-6 text-center text-[11px]">
                <div className="absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded bg-gradient-to-r from-rose-400 via-violet-400 to-emerald-400 opacity-60" />
                {[
                  ['Raw', 'no protection', false],
                  ['Readout mitig.', 'classical only', false],
                  [v === 'v1' ? 'Detect + post-select' : 'Gated decode', v === 'v1' ? 'this project (v1)' : 'this project (v2)', true],
                  ['Correct (QEC)', 'full decoding, needs fast feedback', false],
                  ['Fault tolerant', 'many rounds, big codes', false],
                ].map(([a, b, on]) => (
                  <div key={a as string} className="relative z-10 w-24">
                    <div className={`mx-auto mb-2 h-4 w-4 rounded-full border-2 ${on ? 'border-white bg-violet-400 shadow-[0_0_18px_#a78bfa]' : 'border-slate-500 bg-slate-900'}`} />
                    <div className={on ? 'font-semibold text-white' : 'text-slate-300'}>{a}</div>
                    <div className="text-[10px] text-slate-500">{b}</div>
                  </div>
                ))}
              </div>
            </Panel>
            <div className="mt-5 grid gap-4">
              <Callout tone="warn" title="Honest scope check">
                A repetition code only protects against <b>bit-flips</b> on a <b>Z-basis</b> state. It is a great teaching vehicle, but for a general algorithm (superpositions, phase errors) you would use a code that detects both X and Z errors with few ancillas
                (e.g. the [[k+2, k, 2]] “iceberg” family) — see the Ideas tab.
              </Callout>
              <DiffTable
                rows={[
                  ['Flagged shots', 'Always discarded', 'Decoded by Bayesian posterior; discarded only if confidence < τ'],
                  ['Retention', `${pct(exact.detectRet)} here`, `${pct(exact.gatedRet)} here (τ = ${par.tau})`],
                  ['Syndrome noise', 'Ignored (assumes ancillas perfect)', 'Modelled: ancilla error rate a is part of the posterior'],
                  ['Knob', 'none', 'τ trades shots for accuracy (τ→1 ≈ detect, τ→0.5 ≈ full correction)'],
                ]}
              />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <PhaseIntro kicker="Phase 2 of 6" title="Build the encoded circuit" outputs={['5-qubit circuit', 'syndrome registers']}>
              Encode with two CNOTs, let the payload/idle noise happen, then extract the two parity syndromes onto ancillas s0, s1. {v === 'v2' ? ' The quantum hardware is identical in v2 — the improvement is entirely in the classical decoder.' : ''}
            </PhaseIntro>
            <Circuit {...circuit} />
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <Stat label="Qubits" value={5} sub="3 data + 2 ancilla" tone="violet" />
              <Stat label="CX gates" value={2 + 4} tone="amber" />
              <Stat label="Code distance" value={3} sub="detects ≤2 flips" tone="cyan" />
              <Stat label="Syndromes" value="00 · 01 · 10 · 11" tone="slate" />
            </div>
            {v === 'v2' && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs text-slate-200">
                <b className="text-emerald-300">Classical decode pipeline:</b>
                {['syndrome bits', '→', 'posterior P(q0 flipped | s)', '→', 'confidence ≥ τ ?', '→', 'keep (+correct) / discard'].map((t, i) => (
                  <span key={i} className={t === '→' ? 'text-slate-500' : 'rounded bg-white/10 px-2 py-1'}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-5">
              <CodeBlock code={v === 'v1' ? CODE_V1 : CODE_V2} />
            </div>
          </>
        );
      case 2: {
        const cats = shots.slice(0, 400).map((sh) => {
          const d = dec[sh.s];
          const e0 = sh.e & 1;
          if (!d.keep) return e0 ? COL.caught : COL.wasted;
          const wrong = (e0 ^ (d.corr0 ? 1 : 0)) === 1;
          if (wrong) return COL.wrong;
          return d.corr0 ? COL.fixed : COL.ok;
        });
        const count = (c: string) => cats.filter((x) => x === c).length;
        const hist = new Array(8).fill(0);
        const synH = new Array(4).fill(0);
        shots.forEach((sh) => {
          const m0 = (sh.e & 1) ^ sh.ro[0],
            m1 = ((sh.e >> 1) & 1) ^ sh.ro[1],
            m2 = ((sh.e >> 2) & 1) ^ sh.ro[2];
          hist[m0 * 4 + m1 * 2 + m2]++;
          synH[sh.s]++;
        });
        return (
          <>
            <PhaseIntro kicker="Phase 3 of 6" title="Run on a noisy backend" outputs={['data counts', 'syndrome counts']}>
              Per-qubit effective flip probability after {par.rounds} round(s): <b>{pct((1 - Math.pow(1 - 2 * par.p, par.rounds)) / 2)}</b>. Each square below is a shot (first 400).
            </PhaseIntro>
            <ShotGrid
              items={cats}
              legend={[
                { color: COL.ok, label: 'kept · correct', count: count(COL.ok) },
                ...(v === 'v2' ? [{ color: COL.fixed, label: 'kept · corrected', count: count(COL.fixed) }] : []),
                { color: COL.wrong, label: 'kept · wrong', count: count(COL.wrong) },
                { color: COL.caught, label: 'discarded · q0 was flipped', count: count(COL.caught) },
                { color: COL.wasted, label: 'discarded · q0 was fine', count: count(COL.wasted) },
              ]}
            />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Panel title="Data bitstrings d0d1d2 (after readout noise)">
                <Histogram bars={hist.map((n, i) => ({ label: i.toString(2).padStart(3, '0'), value: n, color: i === 0 ? '#34d399' : i === 7 ? '#fbbf24' : '#fb7185' }))} />
              </Panel>
              <Panel title="Syndrome s0 s1 (ancilla register)">
                <Histogram bars={synH.map((n, i) => ({ label: `${i >> 1}${i & 1}`, value: n, color: i === 0 ? '#34d399' : '#a78bfa' }))} />
              </Panel>
            </div>
          </>
        );
      }
      case 3:
        return (
          <>
            <PhaseIntro kicker="Phase 4 of 6" title={v === 'v1' ? 'Discard flagged shots, then fix readout' : 'Posterior-gated decoding'} outputs={['decision table', 'survivor counts', 'readout-corrected ⟨Z₀⟩']}>
              {v === 'v1' ? 'Only syndrome 00 survives. Everything else is thrown away — including single flips that could have been repaired.' : `For each syndrome we compute the exact posterior P(q0 flipped | s) including syndrome-bit errors, correct if likelier than not, and keep the shot only if confidence ≥ τ = ${par.tau}.`}
            </PhaseIntro>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400">
                  <tr>
                    <th className="p-2.5">s0 s1</th>
                    <th className="p-2.5">most likely cause</th>
                    <th className="p-2.5">P(s)</th>
                    <th className="p-2.5">P(q0 flipped | s)</th>
                    <th className="p-2.5">confidence</th>
                    <th className="p-2.5">action</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-slate-200">
                  {table.map((row) => {
                    const d = dec[row.s];
                    return (
                      <tr key={row.s} className="border-t border-white/5">
                        <td className="p-2.5 text-violet-300">{row.label}</td>
                        <td className="p-2.5 font-sans text-slate-400">{row.meaning}</td>
                        <td className="p-2.5">{pct(row.mass)}</td>
                        <td className="p-2.5">{pct(row.pFlip0)}</td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded bg-white/10">
                              <div className="h-1.5 rounded bg-cyan-400" style={{ width: `${row.conf * 100}%` }} />
                            </div>
                            {pct(row.conf)}
                          </div>
                        </td>
                        <td className={`p-2.5 font-sans font-semibold ${d.keep ? (d.corr0 ? 'text-violet-300' : 'text-emerald-300') : 'text-slate-500'}`}>{d.keep ? (d.corr0 ? 'keep + flip q0' : 'keep') : 'discard'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat label="Survivors" value={headline.kept.toLocaleString()} sub={`of ${par.shots}`} tone="violet" />
              <Stat label="Retention" value={pct(headline.ret)} tone="amber" />
              <Stat label="⟨Z₀⟩ after readout corr." value={f3(headline.z)} sub={`±${f3(headline.err)}`} tone="emerald" />
            </div>
            <div className="mt-4">
              <Formula>⟨Z₀⟩_mit = ⟨Z₀⟩_survivors / (1 − 2r) = 1/{f3(1 - 2 * par.r)} · filtered</Formula>
            </div>
          </>
        );
      case 4: {
        const items = [
          { label: 'Unmitigated', value: est.raw.z, err: est.raw.err, color: '#fb7185' },
          { label: 'Readout-only', value: est.ro.z, err: est.ro.err, color: '#fbbf24' },
          ...(v === 'v1'
            ? [
                { label: 'Detect + post-select', value: est.detect.z, err: est.detect.err, color: '#22d3ee', note: `retention ${pct(est.detect.ret)}` },
                { label: 'Hybrid: detect + readout', value: est.detectRo.z, err: est.detectRo.err, color: '#34d399', highlight: true, note: `retention ${pct(est.detectRo.ret)}` },
              ]
            : [
                { label: 'Detect + readout (v1)', value: est.detectRo.z, err: est.detectRo.err, color: '#22d3ee', note: `retention ${pct(est.detectRo.ret)}` },
                { label: 'Correct all + readout', value: est.correctRo.z, err: est.correctRo.err, color: '#a78bfa', note: 'retention 100%' },
                { label: `Gated decode + readout`, value: est.gatedRo.z, err: est.gatedRo.err, color: '#34d399', highlight: true, note: `retention ${pct(est.gatedRo.ret)}` },
              ]),
        ];
        const x = sweep.map((s) => s.p);
        const S = (name: string, color: string, f: (e: (typeof sweep)[0]['e']) => number, dashed = false) => ({ name, color, dashed, line: sweep.map((s) => ({ x: s.p, y: f(s.e) })) });
        return (
          <>
            <PhaseIntro kicker="Phase 5 of 6" title="Results vs. ideal" outputs={['⟨Z₀⟩ table', 'accuracy ↔ retention', 'noise sweep']}>
              Left: Monte-Carlo from this run. Below: the exact analytic curves while sweeping physical error rate — the diamond marks your current setting.
            </PhaseIntro>
            <Panel>
              <BarCompare items={items} ideal={1} lo={0.6} hi={1.03} />
            </Panel>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Panel title="Exact: logical ⟨Z₀⟩ vs physical error">
                <LineChart
                  series={[
                    S('raw', '#fb7185', (e) => e.raw),
                    S('readout-only', '#fbbf24', (e) => e.ro),
                    S('detect + RO', '#22d3ee', (e) => e.detectRo),
                    S('correct + RO', '#a78bfa', (e) => e.correctRo, true),
                    ...(v === 'v2' ? [S('gated + RO', '#34d399', (e) => e.gatedRo)] : []),
                  ]}
                  xDomain={[Math.min(...x), Math.max(...x)]}
                  yDomain={[0.4, 1.02]}
                  xLabel="bit-flip prob / qubit / round"
                  yLabel="⟨Z₀⟩"
                  markers={[{ x: par.p, y: v === 'v1' ? exact.detectRo : exact.gatedRo, color: '#f8fafc' }]}
                  height={260}
                />
              </Panel>
              <Panel title="Exact: shot retention vs physical error">
                <LineChart
                  series={[
                    S('detect', '#22d3ee', (e) => e.detectRet),
                    ...(v === 'v2' ? [S('gated', '#34d399', (e) => e.gatedRet)] : []),
                  ]}
                  xDomain={[Math.min(...x), Math.max(...x)]}
                  yDomain={[0, 1]}
                  xLabel="bit-flip prob / qubit / round"
                  yLabel="fraction of shots kept"
                  height={260}
                />
              </Panel>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Terminal>{`Project 3 — Hybrid QEM + detection (${v})
shots        : ${par.shots}   rounds: ${par.rounds}   p=${par.p}  a=${par.a}  r=${par.r}
Unmitigated  : ${f3(est.raw.z)} ± ${f3(est.raw.err)}
Readout-only : ${f3(est.ro.z)} ± ${f3(est.ro.err)}
Detect+PS    : ${f3(est.detect.z)} ± ${f3(est.detect.err)}
Hybrid (D+RO): ${f3(est.detectRo.z)} ± ${f3(est.detectRo.err)}   ret ${pct(est.detectRo.ret)}${v === 'v2' ? `\nGated+RO     : ${f3(est.gatedRo.z)} ± ${f3(est.gatedRo.err)}   ret ${pct(est.gatedRo.ret)}` : ''}`}</Terminal>
              <Panel title="Before → After">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="v1 hybrid" value={f3(est.detectRo.z)} tone="amber" sub={`retention ${pct(est.detectRo.ret)}`} />
                  <Stat label="v2 gated" value={f3(est.gatedRo.z)} tone="emerald" sub={`retention ${pct(est.gatedRo.ret)}`} />
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  v2 recovers {pct(est.gatedRo.ret - est.detectRo.ret)} more shots; drag τ up to trade them back for accuracy. At high ancilla error (a), correcting blindly <b className="text-rose-300">hurts</b> — gating notices this.
                </p>
              </Panel>
            </div>
          </>
        );
      }
      default:
        return (
          <>
            <PhaseIntro kicker="Phase 6 of 6" title="Hackathon-day adaptation" outputs={['qubit budget', 'code choice']}>
              Use this when you can spare ancillas and the standard algorithm’s output is (close to) a computational-basis distribution.
            </PhaseIntro>
            <div className="grid gap-5 lg:grid-cols-2">
              <Checklist
                title="Plan"
                tone="emerald"
                items={['Count idle qubits in the QPU region you’ll use; pick a connected patch where ancillas neighbour data qubits.', 'Estimate p_eff and ancilla error a from a 10-minute calibration job (idle + parity circuits).', 'Choose τ from the exact curve in Phase 5, not by eye.', 'Fall back to readout-only if the retention drops below ~30%.']}
              />
              <Checklist
                title="Risks"
                tone="rose"
                items={['Repetition code ignores phase errors — be explicit about the error model it protects.', 'Extra CNOTs add noise: net gain only if physical p is moderate (see sweep: curves cross at high p).', 'Dynamic circuits / mid-circuit readout may be limited in queue time.', 'Syndrome-extraction schedule matters; compile with a fixed initial layout.']}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div>
      <ControlBar onRerun={() => setPar({ ...par, seed: Math.floor(Math.random() * 1e6) })}>
        <Slider label="Bit-flip p / qubit / round" value={par.p} onChange={set('p')} min={0.002} max={0.15} step={0.002} fmt={pct} />
        <Slider label="Rounds (idle/payload)" value={par.rounds} onChange={set('rounds')} min={1} max={6} step={1} />
        <Slider label="Syndrome-bit error a" value={par.a} onChange={set('a')} min={0} max={0.2} step={0.005} fmt={pct} hint="ancilla gate + readout" />
        <Slider label="Data readout error r" value={par.r} onChange={set('r')} min={0} max={0.1} step={0.005} fmt={pct} />
        <Slider label="v2 confidence threshold τ" value={par.tau} onChange={set('tau')} min={0.5} max={0.999} step={0.005} fmt={(v) => v.toFixed(3)} hint="↑ = stricter, fewer shots" />
        <Slider label="Shots" value={par.shots} onChange={set('shots')} min={500} max={20000} step={500} />
      </ControlBar>
      <Versioned mode={mode} phase={phase} render={view} />
    </div>
  );
}
