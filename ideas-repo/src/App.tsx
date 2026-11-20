import { useState } from 'react';
import Overview from './pages/Overview';
import Lab, { type LabState } from './pages/Lab';
import Compare from './pages/Compare';
import Ideas from './pages/Ideas';
import Playbook from './pages/Playbook';
import { cn } from './utils/cn';

type Page = 'overview' | 'lab' | 'compare' | 'ideas' | 'playbook';
const NAV: [Page, string][] = [
  ['overview', 'Overview'],
  ['lab', 'Prototype Lab'],
  ['compare', 'Before → After'],
  ['ideas', 'New Ideas'],
  ['playbook', 'Playbook'],
];

export default function App() {
  const [page, setPage] = useState<Page>('overview');
  const [lab, setLab] = useState<LabState>({ project: 1, mode: 'v1', phase: 0 });

  const go = (p: string, project?: number) => {
    setPage(p as Page);
    if (project) setLab({ project, mode: 'v1', phase: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070b17] text-slate-200 antialiased selection:bg-cyan-400/30" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070b17]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button onClick={() => go('overview')} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 font-mono text-sm font-bold text-slate-950">|ψ⟩</span>
            <span className="hidden text-sm font-semibold text-white sm:block">
              Error-Mitigation Studio <span className="font-normal text-slate-500">· Qiskit Fall Fest 2026</span>
            </span>
          </button>
          <nav className="flex gap-1 overflow-x-auto text-xs sm:text-sm">
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => go(id)} className={cn('whitespace-nowrap rounded-lg px-3 py-2 font-medium transition', page === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {page === 'overview' && <Overview go={go} />}
      {page === 'lab' && <Lab state={lab} setState={setLab} />}
      {page === 'compare' && (
        <Compare
          openLab={(p) => {
            setLab({ project: p, mode: 'split', phase: 3 });
            setPage('lab');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
      {page === 'ideas' && <Ideas />}
      {page === 'playbook' && <Playbook />}

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">Prototype visualisations of github.com/knarayanareddy/IBM-Qiskit · simplified in-browser noise models, not hardware results</footer>
    </div>
  );
}
