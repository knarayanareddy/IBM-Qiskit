import { useMemo, useState } from 'react';
import { Circuit, type Gate } from '../components/Circuit';
import { BarCompare, CodeBlock, ControlBar, Funnel, Histogram, PhaseIntro, Panel, ShotGrid, Slider, Stat, Terminal, Versioned, f3, pct, type Mode } from '../components/ui';
import { Checklist, DiffTable, Formula } from '../components/extras';
import { P1_DEFAULT, analyzeP1, simP1, type P1Params } from '../lib/sims';

const CAT_COLOR = { good: '#34d399', undetected: '#fb7185', caught: '#22d3ee', wasted: '#475569' } as const;

function circuitFor(v: 'v1' | 'v2') {
  if (v === 'v1') {
    const gates: Gate[] = [
      { c: 0, type: 'box', q: 0, label: 'H' },
      { c: 1, type: 'cx', q: 0, t: 1 },
      { c: 2, type: 'noise', q: 0 },
      { c: 2, type: 'noise', q: 1 },
      { c: 3, type: 'noise', q: 0 },
      { c: 3, type: 'noise', q: 1 },
      { c: 4, type: 'cx', q: 0, t: 2, tone: 'mit' },
      { c: 5, type: 'cx', q: 1, t: 2, tone: 'mit' },
      { c: 6, type: 'm', q: 2 },
      { c: 6, type: 'm', q: 0 },
      { c: 6, type: 'm', q: 1 },
    ];
    return {
      wires: [{ label: 'q0' }, { label: 'q1' }, { label: 'anc', tone: 'anc' as const }],
      gates,
      regions: [
        { from: 0, to: 1, label: 'Bell prep', color: '#22d3ee' },
        { from: 2, to: 3, label: 'payload + noise', color: '#fb7185' },
        { from: 4, to: 5, label: 'parity check', color: '#a78bfa' },
        { from: 6, to: 6, label: 'readout', color: '#94a3b8' },
      ],
    };
  }
  const gates: Gate[] = [
    { c: 0, type: 'box', q: 0, label: 'H' },
    { c: 1, type: 'cx', q: 0, t: 1 },
    { c: 2, type: 'noise', q: 0 },
    { c: 2, type: 'noise', q: 1 },
    { c: 3, type: 'cx', q: 0, t: 2, tone: 'mit' },
    { c: 4, type: 'cx', q: 1, t: 2, tone: 'mit' },
    { c: 5, type: 'noise', q: 0 },
    { c: 5, type: 'noise', q: 1 },
    { c: 6, type: 'cx', q: 0, t: 3, tone: 'mit' },
    { c: 7, type: 'cx', q: 1, t: 3, tone: 'mit' },
    { c: 8, type: 'm', q: 2 },
    { c: 8, type: 'm', q: 3 },
    { c: 8, type: 'm', q: 0 },
    { c: 8, type: 'm', q: 1 },
  ];
  return {
    wires: [{ label: 'q0' }, { label: 'q1' }, { label: 'anc A', tone: 'anc' as const }, { label: 'anc B', tone: 'anc' as const }],
    gates,
    regions: [
      { from: 0, to: 1, label: 'Bell prep', color: '#22d3ee' },
      { from: 2, to: 2, label: 'payload ½', color: '#fb7185' },
      { from: 3, to: 4, label: 'check A', color: '#a78bfa' },
      { from: 5, to: 5, label: 'payload ½', color: '#fb7185' },
      { from: 6, to: 7, label: 'check B', color: '#a78bfa' },
      { from: 8, to: 8, label: 'readout', color: '#94a3b8' },
    ],
  };
}

const CODE_V1 = `from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister

def bell_with_parity_check():
    q   = QuantumRegister(2, "q")
    a   = QuantumRegister(1, "anc")
    out = ClassicalRegister(2, "out")
    syn = ClassicalRegister(1, "syn")
    qc  = QuantumCircuit(q, a, out, syn)
    qc.h(q[0]); qc.cx(q[0], q[1])          # |Φ+>  (payload goes here)
    qc.cx(q[0], a[0]); qc.cx(q[1], a[0])   # anc = parity(q0,q1)
    qc.measure(a[0], syn[0])
    qc.measure(q, out)
    return qc

# post-select on an intact syndrome ("0" in the syn register)
keep = {k: v for k, v in counts.items() if k.split()[0] == "0"}`;

const CODE_V2 = `# v2: two ancillas = two independent checks at different depths,
#     + readout (TREX-style) correction on the survivors
def add_check(qc, data, anc, syn_bit):
    for d in data: qc.cx(d, anc)
    qc.measure(anc, syn_bit)

# ... payload half 1 ...  add_check(qc, [q0, q1], ancA, synA)
# ... payload half 2 ...  add_check(qc, [q0, q1], ancB, synB)

keep = {k: v for k, v in counts.items() if k.split()[0] == "00"}   # BOTH flags clean
zz_raw = expval_zz(keep)
zz_mit = zz_raw / (1 - 2 * r_readout) ** 2     # r from a calibration circuit
stderr = ((1 - zz_raw**2) / n_kept) ** 0.5 / (1 - 2 * r_readout) ** 2`;

export default function Project1({ mode, phase }: { mode: Mode; phase: number }) {
  const [par, setPar] = useState<P1Params>(P1_DEFAULT);
  const r1 = useMemo(() => analyzeP1(simP1(par, 1), par), [par]);
  const r2 = useMemo(() => analyzeP1(simP1(par, 2), par), [par]);
  const set = (k: keyof P1Params) => (v: number) => setPar({ ...par, [k]: v });

  const view = (v: 'v1' | 'v2') => {
    const R = v === 'v1' ? r1 : r2;
    const circ = circuitFor(v);
    switch (phase) {
      case 0:
        return (
          <>
            <PhaseIntro kicker="Phase 1 of 6" title="The problem & the idea" outputs={['target metric', 'ideal distribution']}>
              Benchmark: a 2-qubit Bell state |Φ⁺⟩ = (|00⟩+|11⟩)/√2. We measure <b>⟨Z⊗Z⟩</b>, which must be exactly <b>+1</b> (the two bits always agree). Any bit-flip on <i>one</i> qubit breaks that
              parity — so parity is a <b>conserved quantity (symmetry)</b> we can check <i>during the same circuit run</i>, with no extra noisy copies.
            </PhaseIntro>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Ideal output (noise-free)">
                <Histogram
                  bars={[
                    { label: '00', value: 50, color: '#34d399', sub: '%' },
                    { label: '01', value: 0, color: '#475569' },
                    { label: '10', value: 0, color: '#475569' },
                    { label: '11', value: 50, color: '#34d399', sub: '%' },
                  ]}
                  height={110}
                />
                <div className="mt-2 text-center font-mono text-sm text-emerald-300">⟨ZZ⟩ = +1.000</div>
              </Panel>
              <Panel title="What the noisy device gives (live sim, raw)">
                <Histogram
                  bars={['00', '01', '10', '11'].map((l, i) => ({ label: l, value: Math.round((r1.hist[i] / r1.n) * 100), color: i === 0 || i === 3 ? '#22d3ee' : '#fb7185', sub: '%' }))}
                  height={110}
                />
                <div className="mt-2 text-center font-mono text-sm text-rose-300">⟨ZZ⟩ raw = {f3(r1.raw)}</div>
              </Panel>
            </div>
            <div className="mt-5">
              <Formula>shots with parity(q0,q1) = odd ⇒ certainly an error ⇒ discard · even ⇒ keep</Formula>
            </div>
            <div className="mt-5">
              <DiffTable
                rows={[
                  ['Checks', '1 parity ancilla at the end', '2 independent ancillas (mid + end): a missed flag must slip past both'],
                  ['Readout', 'Reported separately as “readout-only”', 'Stacked: post-select first, then divide out (1−2r)² on survivors'],
                  ['Stats', 'Point estimate', 'Standard error propagated through post-selection + correction'],
                  ['Cost', '+1 qubit, +2 CX', '+2 qubits, +4 CX, ancilla back-action modelled honestly'],
                ]}
              />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <PhaseIntro kicker="Phase 2 of 6" title="Build the symmetry-checking circuit" outputs={['QuantumCircuit', 'syndrome register']}>
              {v === 'v1'
                ? 'An ancilla is CNOT-ed from both data qubits, so it holds q0 ⊕ q1. Measuring it mid-circuit gives a 1-bit “syndrome”: 0 = parity intact, 1 = a symmetry violation happened.'
                : 'v2 inserts a second, independent parity check halfway through the payload. Errors in the first half must now evade two ancillas, while the second ancilla also guards against the first check’s own back-action.'}
            </PhaseIntro>
            <Circuit {...circ} />
            <div className="mt-2 text-[11px] text-slate-500">⚡ = noise location · purple = mitigation hardware · grey = measurement</div>
            <div className="mt-5">
              <CodeBlock code={v === 'v1' ? CODE_V1 : CODE_V2} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat label="Extra qubits" value={v === 'v1' ? 1 : 2} tone="violet" />
              <Stat label="Extra CX gates" value={v === 'v1' ? 2 : 4} tone="amber" />
              <Stat label="Mid-circuit measurements" value={v === 'v1' ? 1 : 2} tone="cyan" sub="needs dynamic-circuit-capable QPU / or deferred readout" />
            </div>
          </>
        );
      case 2: {
        const items = R.cats.slice(0, 400).map((c) => CAT_COLOR[c]);
        return (
          <>
            <PhaseIntro kicker="Phase 3 of 6" title="Run on a noisy backend" outputs={['counts dict', 'syndrome bits per shot']}>
              Each square is one shot (first 400 of {R.n.toLocaleString()}). The syndrome tells us which shots to trust.
            </PhaseIntro>
            <ShotGrid
              items={items}
              cols={40}
              legend={[
                { color: CAT_COLOR.good, label: 'kept · ZZ=+1 (correct)', count: R.catCount.good },
                { color: CAT_COLOR.undetected, label: 'kept · ZZ=−1 (undetected error)', count: R.catCount.undetected },
                { color: CAT_COLOR.caught, label: 'discarded · was wrong (good catch)', count: R.catCount.caught },
                { color: CAT_COLOR.wasted, label: 'discarded · was fine (false alarm)', count: R.catCount.wasted },
              ]}
            />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Panel title="Raw data-qubit histogram (ancilla ignored)">
                <Histogram bars={['00', '01', '10', '11'].map((l, i) => ({ label: l, value: R.hist[i], color: i === 0 || i === 3 ? '#22d3ee' : '#fb7185' }))} />
              </Panel>
              <Terminal title="counts">{`counts = {'00': ${R.hist[0]}, '01': ${R.hist[1]}, '10': ${R.hist[2]}, '11': ${R.hist[3]}}\nshots  = ${R.n}\nraw <ZZ> = ${f3(R.raw)}   # ideal +1.000`}</Terminal>
            </div>
          </>
        );
      }
      case 3:
        return (
          <>
            <PhaseIntro kicker="Phase 4 of 6" title="Post-select on the syndrome" outputs={['kept counts', 'retention rate', v === 'v2' ? 'readout-corrected ⟨ZZ⟩' : 'filtered ⟨ZZ⟩']}>
              {v === 'v1' ? 'Keep only shots whose syndrome is 0. The error that remains comes from things the parity check cannot see — data readout flips, missed flags and the ancilla’s own back-action.' : 'Keep a shot only if BOTH syndromes are 0, then correct the residual readout bias analytically using a calibrated confusion rate.'}
            </PhaseIntro>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Shot funnel">
                <Funnel
                  stages={[
                    { label: 'All shots', value: R.n, of: R.n, color: '#64748b' },
                    { label: v === 'v1' ? 'Syndrome = 0' : 'Syndromes A & B = 0', value: R.kept, of: R.n, color: '#a78bfa', note: `${R.n - R.kept} shots discarded (${pct(1 - R.retention)})` },
                    { label: 'of which ZZ = +1', value: R.catCount.good, of: R.n, color: '#34d399' },
                  ]}
                />
              </Panel>
              <Panel title="Why does anything still get through?">
                <ul className="space-y-2 text-xs text-slate-300">
                  <li>
                    <b className="text-rose-300">Readout flips on data qubits</b> happen <i>after</i> the check → parity check is blind. Fixed by the readout step.
                  </li>
                  <li>
                    <b className="text-rose-300">Missed flags</b> (ancilla gate fault, prob {pct(par.miss)}) {v === 'v2' ? 'now need to happen twice.' : 'pass straight through — only one chance to catch.'}
                  </li>
                  <li>
                    <b className="text-rose-300">Back-action</b> — the check’s CNOTs can flip a data qubit ({pct(par.backAction)} each).
                  </li>
                  <li>
                    <b className="text-slate-400">Even-weight errors</b> (both bits flip) keep parity — but are harmless for ⟨ZZ⟩.
                  </li>
                </ul>
              </Panel>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat label="Filtered ⟨ZZ⟩" value={f3(R.ps)} tone="cyan" sub={`from ${R.kept} kept shots`} />
              <Stat label="Readout factor (1−2r)²" value={f3(R.rf)} tone="amber" sub={v === 'v2' ? 'divided out in step 5' : 'not applied in v1 headline'} />
              <Stat label="Retention" value={pct(R.retention)} tone="violet" sub="cost of post-selection" />
            </div>
            {v === 'v2' && (
              <div className="mt-5">
                <Formula>⟨ZZ⟩_mit = ⟨ZZ⟩_kept / (1 − 2r)² = {f3(R.ps)} / {f3(R.rf)} = {f3(R.psro)}</Formula>
              </div>
            )}
          </>
        );
      case 4: {
        const items = [
          { label: 'Unmitigated', value: R.raw, err: R.rawErr, color: '#fb7185' },
          { label: 'Readout-only', value: R.ro, err: R.roErr, color: '#fbbf24' },
          { label: 'Symmetry post-select', value: R.ps, err: R.psErr, color: '#22d3ee', highlight: v === 'v1' },
          ...(v === 'v2' ? [{ label: 'Post-select + readout', value: R.psro, err: R.psroErr, color: '#34d399', highlight: true }] : []),
        ];
        const best = v === 'v1' ? R.ps : R.psro;
        return (
          <>
            <PhaseIntro kicker="Phase 5 of 6" title="Results vs. ideal" outputs={['⟨ZZ⟩ table', 'error bars', 'retention']}>
              Closer to the dashed line (+1) is better. Error bars are 1σ shot noise <i>after</i> post-selection — fewer kept shots means wider bars.
            </PhaseIntro>
            <Panel>
              <BarCompare items={items} ideal={1} lo={0.4} hi={1.05} />
            </Panel>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Terminal>{`Project 1 — Symmetry-Resolved Mitigation (${v})
shots           : ${R.n}
Unmitigated     : ${f3(R.raw)} ± ${f3(R.rawErr)}
Readout-only    : ${f3(R.ro)} ± ${f3(R.roErr)}
Symmetry PS     : ${f3(R.ps)} ± ${f3(R.psErr)}${v === 'v2' ? `\nPS + readout    : ${f3(R.psro)} ± ${f3(R.psroErr)}` : ''}
Retention       : ${pct(R.retention)}
|error| vs ideal: ${f3(Math.abs(1 - best))}`}</Terminal>
              <Panel title="Before → After">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="v1 best" value={f3(r1.ps)} tone="amber" sub={`error ${f3(1 - r1.ps)} · ret ${pct(r1.retention)}`} />
                  <Stat label="v2 best" value={f3(r2.psro)} tone="emerald" sub={`error ${f3(1 - r2.psro)} · ret ${pct(r2.retention)}`} />
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Error reduced <b className="text-emerald-300">{(((1 - r1.ps) / Math.max(1e-3, 1 - r2.psro)) || 1).toFixed(1)}×</b> for a {pct(r1.retention - r2.retention)} extra retention cost.
                </div>
              </Panel>
            </div>
          </>
        );
      }
      default:
        return (
          <>
            <PhaseIntro kicker="Phase 6 of 6" title="Hackathon-day adaptation" outputs={['swap-in guide', 'risk list']}>
              You’ll be handed a “standard algorithm”. This is how you decide whether symmetry post-selection fits and how to plug it in.
            </PhaseIntro>
            <div className="grid gap-5 lg:grid-cols-2">
              <Checklist
                title="Does it apply? (go / no-go)"
                tone="emerald"
                items={[
                  'Find a conserved quantity: parity of Z-basis bits, particle number, Hamming weight, a stabiliser.',
                  'Check the symmetry commutes with every gate you add — otherwise the check itself breaks the state.',
                  'You need ≥1 spare qubit connected to the data qubits (mind heavy-hex connectivity & SWAP cost).',
                  'Check that shots survive: retention ≈ (1−ε)^(#gates). Deep circuits → exponential discard.',
                ]}
              />
              <Checklist
                title="Known limitations to state in your pitch"
                tone="rose"
                items={[
                  'Post-selection ≠ mitigation in the strict sense: it is biased if errors correlate with the observable.',
                  'Only detects symmetry-violating errors. Symmetry-preserving errors (e.g. two flips) pass.',
                  'The check circuit adds its own noise — report retention and error bars, always.',
                  'On IBM hardware, mid-circuit measurement + reset need dynamic-circuit support; otherwise defer measurement of the ancilla to the end.',
                ]}
              />
            </div>
            <div className="mt-5">
              <CodeBlock title="swap in your algorithm" code={`# circuits.py
def build_standard_algorithm():
    ...   # <- the organisers' circuit here; keep a list of "data" qubits

def add_symmetry_checks(qc, data_qubits, n_checks=2):
    # Z-parity check; for XX-type symmetries sandwich with H on data + anc
    ...

# run.py -> transpile with optimization_level=1..2 and layout that keeps
# the ancilla adjacent to the data qubits; compare vs Estimator resilience levels.`} />
            </div>
          </>
        );
    }
  };

  return (
    <div>
      <ControlBar onRerun={() => setPar({ ...par, seed: Math.floor(Math.random() * 1e6) })}>
        <Slider label="Gate bit-flip / qubit / layer" value={par.p} onChange={set('p')} min={0} max={0.08} step={0.001} fmt={(v) => pct(v)} />
        <Slider label="Payload depth (layers)" value={par.depth} onChange={set('depth')} min={2} max={10} step={2} />
        <Slider label="Readout error r" value={par.r} onChange={set('r')} min={0} max={0.1} step={0.001} fmt={pct} />
        <Slider label="Ancilla miss prob." value={par.miss} onChange={set('miss')} min={0} max={0.4} step={0.01} fmt={pct} hint="check fails to flag an odd parity" />
        <Slider label="Ancilla back-action" value={par.backAction} onChange={set('backAction')} min={0} max={0.05} step={0.001} fmt={pct} hint="check injects a flip on data" />
        <Slider label="Shots" value={par.shots} onChange={set('shots')} min={500} max={20000} step={500} />
      </ControlBar>
      <Versioned mode={mode} phase={phase} render={view} />
    </div>
  );
}
