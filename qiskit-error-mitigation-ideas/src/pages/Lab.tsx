import { useEffect, useState } from 'react';
import { PHASES, PROJECTS } from '../lib/meta';
import type { Mode } from '../components/ui';
import { cn } from '../utils/cn';
import Project1 from '../projects/Project1';
import Project2 from '../projects/Project2';
import Project3 from '../projects/Project3';
import Project4 from '../projects/Project4';

export interface LabState {
  project: number;
  mode: Mode;
  phase: number;
}

export default function Lab({ state, setState }: { state: LabState; setState: (s: LabState) => void }) {
  const { project, mode, phase } = state;
  const meta = PROJECTS[project - 1];
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setState({ ...state, phase: (state.phase + 1) % PHASES.length });
    }, 5000);
    return () => clearInterval(t);
  }, [auto, state, setState]);

  const Comp = [Project1, Project2, Project3, Project4][project - 1];

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-6">
      {/* project tabs */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROJECTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setState({ ...state, project: p.id, phase: 0 })}
            className={cn('rounded-xl border p-3 text-left transition', project === p.id ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]')}
            style={project === p.id ? { boxShadow: `0 0 0 1px ${p.color}66, 0 8px 30px ${p.color}22` } : undefined}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm" style={{ background: p.color + '22', color: p.color }}>
                {p.icon}
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Project {p.id}</div>
                <div className="text-sm font-semibold text-white">{p.short}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-white">
            {meta.icon} {meta.name}
          </h2>
          <p className="mt-1 text-slate-300">{meta.tagline}</p>
          <p className="mt-1 text-xs text-slate-500">
            Repo folder: <code className="text-slate-400">{meta.folder}/</code> · Inspired by: {meta.inspired}
          </p>
        </div>
        {/* version switch */}
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs font-semibold">
          {(
            [
              ['v1', 'Before · v1'],
              ['v2', 'After · v2'],
              ['split', '⇄ Before vs After'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setState({ ...state, mode: m })}
              className={cn('rounded-lg px-3 py-2 transition', mode === m ? (m === 'v1' ? 'bg-amber-400/20 text-amber-200' : m === 'v2' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-violet-400/25 text-violet-200') : 'text-slate-400 hover:text-white')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* stepper */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
        <div className="flex items-center">
          {PHASES.map((name, i) => (
            <div key={name} className="flex flex-1 items-center last:flex-none">
              <button onClick={() => setState({ ...state, phase: i })} className="group flex flex-col items-center gap-1.5">
                <span
                  className={cn('flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition', i === phase ? 'scale-110 border-transparent text-slate-950' : i < phase ? 'border-white/30 bg-white/10 text-white' : 'border-white/15 text-slate-500 group-hover:text-white')}
                  style={i === phase ? { background: meta.color, boxShadow: `0 0 20px ${meta.color}88` } : undefined}
                >
                  {i < phase ? '✓' : i + 1}
                </span>
                <span className={cn('hidden text-[11px] sm:block', i === phase ? 'font-semibold text-white' : 'text-slate-500')}>{name}</span>
              </button>
              {i < PHASES.length - 1 && <div className="mx-2 h-px flex-1 transition" style={{ background: i < phase ? meta.color : 'rgba(255,255,255,0.1)' }} />}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button disabled={phase === 0} onClick={() => setState({ ...state, phase: phase - 1 })} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-30">
            ← Previous
          </button>
          <button onClick={() => setAuto(!auto)} className={cn('rounded-lg border px-3 py-1.5 text-xs', auto ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-slate-400 hover:text-white')}>
            {auto ? '❚❚ Pause tour' : '▶ Auto-play tour'}
          </button>
          <button disabled={phase === PHASES.length - 1} onClick={() => setState({ ...state, phase: phase + 1 })} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-30">
            Next →
          </button>
        </div>
      </div>

      <Comp key={project} mode={mode} phase={phase} />

      <p className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-slate-500">
        <b className="text-slate-400">About these numbers.</b> The prototypes run a compact classical Monte-Carlo noise model in your browser (bit-flips, readout error, ancilla faults, exponential noise decay) to illustrate each method’s behaviour. They are
        <i> not</i> Qiskit-Aer or QPU outputs; absolute values will differ on real hardware, but the qualitative trade-offs (bias floor, retention cost, variance blow-up) are what each phase is designed to teach.
      </p>
    </div>
  );
}
