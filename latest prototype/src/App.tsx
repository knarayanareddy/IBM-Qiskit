import { useEffect, useState, type ComponentType } from "react";
import { LabProvider, useLab } from "./lib/store";
import { cn } from "./utils/cn";
import Overview from "./pages/Overview";
import Lab from "./pages/Lab";
import Compare from "./pages/Compare";
import Ideas from "./pages/Ideas";
import Playbook from "./pages/Playbook";

const PAGES: { id: string; label: string; icon: string; Component: ComponentType }[] = [
  { id: "overview", label: "Overview", icon: "🌐", Component: Overview },
  { id: "lab", label: "Prototype Lab", icon: "🧪", Component: Lab },
  { id: "compare", label: "Before → After", icon: "⚖️", Component: Compare },
  { id: "ideas", label: "New Ideas", icon: "💡", Component: Ideas },
  { id: "playbook", label: "Playbook", icon: "📋", Component: Playbook },
];

function currentPage(): string {
  const h = window.location.hash.replace(/^#\/?/, "");
  return PAGES.some((p) => p.id === h) ? h : "overview";
}

function Shell() {
  const [page, setPage] = useState(currentPage);
  const { parsed, pending } = useLab();

  useEffect(() => {
    const on = () => {
      setPage(currentPage());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const Active = PAGES.find((p) => p.id === page)!.Component;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 antialiased selection:bg-cyan-400/30">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-700/60 bg-slate-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
          <a href="#/overview" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-violet-500 to-emerald-400 text-sm font-black text-slate-900">Q</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold text-slate-100">Fall Fest 2026 · Error Mitigation</span>
              <span className="block text-[11px] text-slate-500">Adaptive Conservation Lab</span>
            </span>
          </a>
          <nav className="flex flex-1 gap-1 overflow-x-auto" aria-label="Pages">
            {PAGES.map((p) => (
              <a
                key={p.id}
                href={`#/${p.id}`}
                aria-current={page === p.id ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition",
                  page === p.id ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                )}
              >
                <span aria-hidden>{p.icon}</span>
                <span>{p.label}</span>
              </a>
            ))}
          </nav>
          <div className="hidden shrink-0 items-center gap-2 text-xs md:flex">
            <span className={cn("h-2 w-2 rounded-full", parsed.ok ? (pending ? "animate-pulse bg-amber-400" : "bg-emerald-400") : "bg-rose-400")} />
            <span className="text-slate-400">
              {parsed.ok ? `${parsed.nQubits}q · depth ${parsed.stats.depth} · ${parsed.stats.gates} gates` : "circuit error"}
            </span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8">
        <Active />
      </main>

      <footer className="relative border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Qiskit Fall Fest 2026 · WIQD × IBM Quantum · Amsterdam · 20–21 Nov — unofficial hackathon prototype. Runs entirely in your browser: no Qiskit, no IBM account, no backend.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LabProvider>
      <Shell />
    </LabProvider>
  );
}
