import { useMemo } from 'react';
import { PROJECTS } from '../lib/meta';
import { BarCompare, Panel, f3, pct } from '../components/ui';
import { P1_DEFAULT, P2_DEFAULT, P3_DEFAULT, P4_DEFAULT, analyzeP1, analyzeP4, fitZne, p2BiasFloor, p3Exact, simP1, simP2, simP4 } from '../lib/sims';

export default function Compare({ openLab }: { openLab: (project: number) => void }) {
  const d = useMemo(() => {
    const r1 = analyzeP1(simP1(P1_DEFAULT, 1), P1_DEFAULT);
    const r2 = analyzeP1(simP1(P1_DEFAULT, 2), P1_DEFAULT);
    const p2a = fitZne(simP2(P2_DEFAULT, 'v1'), 'linear');
    const p2b = fitZne(simP2(P2_DEFAULT, 'v2'), 'exp');
    const raw2 = simP2(P2_DEFAULT, 'v1')[0];
    const e3 = p3Exact(P3_DEFAULT);
    const r4 = analyzeP4(simP4(P4_DEFAULT), P4_DEFAULT);
    return { r1, r2, p2a, p2b, raw2, e3, r4 };
  }, []);

  const cards = [
    {
      p: PROJECTS[0],
      metric: '⟨ZZ⟩ on Bell state (ideal 1)',
      ideal: 1,
      lo: 0.5,
      hi: 1.05,
      before: { label: 'v1 symmetry PS', value: d.r1.ps, err: d.r1.psErr },
      after: { label: 'v2 PS + readout', value: d.r2.psro, err: d.r2.psroErr },
      raw: { label: 'unmitigated', value: d.r1.raw, err: d.r1.rawErr },
      note: `Retention ${pct(d.r1.retention)} → ${pct(d.r2.retention)}`,
      headline: `${(((1 - d.r1.ps) / (1 - d.r2.psro)) || 1).toFixed(1)}× lower error`,
    },
    {
      p: PROJECTS[1],
      metric: '⟨Z₀⟩ (ideal 0.5)',
      ideal: P2_DEFAULT.E0,
      lo: 0,
      hi: 0.65,
      before: { label: 'v1 T-only, linear', value: d.p2a.value, err: d.p2a.sigma },
      after: { label: 'v2 fold T+CX, exp', value: d.p2b.value, err: d.p2b.sigma },
      raw: { label: 'unmitigated', value: d.raw2.y, err: d.raw2.sigma },
      note: `v1 hard floor ${f3(p2BiasFloor(P2_DEFAULT, 'v1'))} · v2 pays with σ ±${f3(d.p2b.sigma)}`,
      headline: `${(Math.abs(P2_DEFAULT.E0 - d.p2a.value) / Math.max(1e-3, Math.abs(P2_DEFAULT.E0 - d.p2b.value))).toFixed(1)}× lower bias`,
    },
    {
      p: PROJECTS[2],
      metric: 'logical ⟨Z₀⟩ (ideal 1)',
      ideal: 1,
      lo: 0.6,
      hi: 1.03,
      before: { label: 'v1 detect + RO', value: d.e3.detectRo },
      after: { label: 'v2 gated decode + RO', value: d.e3.gatedRo },
      raw: { label: 'unmitigated', value: d.e3.raw },
      note: `Retention ${pct(d.e3.detectRet)} → ${pct(d.e3.gatedRet)}`,
      headline: `+${pct(d.e3.gatedRet - d.e3.detectRet)} shots kept`,
    },
    {
      p: PROJECTS[3],
      metric: 'P(|1100⟩ | symmetry) (ideal 1)',
      ideal: 1,
      lo: 0.6,
      hi: 1.02,
      before: { label: 'v1 soft, flat prior', value: d.r4.softV1.p1100 },
      after: { label: 'v2 soft + EM prior', value: d.r4.softV2.p1100 },
      raw: { label: 'unmitigated', value: d.r4.rawP1100 },
      note: `P(HW=2) estimate: true ${f3(d.r4.truthW2)} · v1 ${f3(d.r4.softV1.w2)} · v2 ${f3(d.r4.softV2.w2)}`,
      headline: `P(HW=2) error ${f3(Math.abs(d.r4.softV1.w2 - d.r4.truthW2))} → ${f3(Math.abs(d.r4.softV2.w2 - d.r4.truthW2))}`,
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-10">
      <h2 className="text-3xl font-bold text-white">Before → After</h2>
      <p className="mt-2 max-w-3xl text-slate-300">Every project has an improved v2. These are live results at the default noise settings; open any project’s lab and choose “⇄ Before vs After” to step through each phase side by side.</p>

      <div className="mt-8 space-y-6">
        {cards.map((c) => (
          <Panel key={c.p.id} className="!p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-white">
                  <span style={{ color: c.p.color }}>{c.p.icon}</span> Project {c.p.id} · {c.p.name}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">{c.metric}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">{c.headline}</span>
                <button onClick={() => openLab(c.p.id)} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10">
                  Open split view →
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <BarCompare
                ideal={c.ideal}
                lo={c.lo}
                hi={c.hi}
                items={[
                  { label: c.raw.label, value: c.raw.value, err: 'err' in c.raw ? c.raw.err : undefined, color: '#fb7185' },
                  { label: c.before.label, value: c.before.value, err: 'err' in c.before ? c.before.err : undefined, color: '#fbbf24' },
                  { label: c.after.label, value: c.after.value, err: 'err' in c.after ? c.after.err : undefined, color: '#34d399', highlight: true },
                ]}
              />
              <div className="space-y-2 rounded-xl bg-white/[0.03] p-4 text-xs text-slate-300">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">What changed in v2</div>
                {c.p.v2.map((t) => (
                  <div key={t} className="flex gap-2">
                    <span className="text-emerald-400">▸</span>
                    {t}
                  </div>
                ))}
                <div className="border-t border-white/10 pt-2 text-slate-400">{c.note}</div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
