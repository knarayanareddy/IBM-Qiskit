import { useEffect, useState, type ComponentType } from "react";
import { cn } from "./utils/cn";
import { LESSONS } from "./lib/lessons";
import { ProgressBar, useStored } from "./components/ui";
import Home from "./pages/Home";
import LessonView from "./pages/LessonView";
import Sandbox from "./pages/Sandbox";
import Setup from "./pages/Setup";
import RepoMap from "./pages/RepoMap";
import DayPlan from "./pages/DayPlan";
import CheatSheet from "./pages/CheatSheet";
import Assessment from "./pages/Assessment";
import Prompts from "./pages/Prompts";
import Blueprint from "./pages/Blueprint";

const TOOLS: { id: string; label: string; icon: string; Component: ComponentType }[] = [
  { id: "sandbox", label: "Sandbox", icon: "🧪", Component: Sandbox },
  { id: "setup", label: "Setup & Run", icon: "💻", Component: Setup },
  { id: "repo", label: "Repo Map", icon: "🗺️", Component: RepoMap },
  { id: "day", label: "Hackathon Day", icon: "🗓️", Component: DayPlan },
  { id: "cheatsheet", label: "Cheat Sheet", icon: "📄", Component: CheatSheet },
  { id: "assess", label: "Self-Assessment", icon: "✅", Component: Assessment },
  { id: "prompts", label: "Ask Claude", icon: "💬", Component: Prompts },
  { id: "ux", label: "UX Blueprint", icon: "🎨", Component: Blueprint },
];

type Route = { kind: "home" } | { kind: "lesson"; id: number } | { kind: "tool"; id: string };

function parse(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  const [a, b] = h.split("/");
  if (a === "lesson") {
    const id = parseInt(b, 10);
    if (LESSONS.some((l) => l.id === id)) return { kind: "lesson", id };
  }
  if (TOOLS.some((t) => t.id === a)) return { kind: "tool", id: a };
  return { kind: "home" };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parse);
  const [open, setOpen] = useState(false);
  const [done] = useStored<number[]>("qb-lessons", []);

  useEffect(() => {
    const on = () => {
      setRoute(parse());
      setOpen(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const frac = done.length / LESSONS.length;
  const isActive = (k: string) =>
    (route.kind === "home" && k === "home") || (route.kind === "lesson" && k === `l${route.id}`) || (route.kind === "tool" && k === route.id);

  const link = (href: string, key: string, icon: string, label: string, extra?: React.ReactNode) => (
    <a
      key={key}
      href={href}
      aria-current={isActive(key) ? "page" : undefined}
      className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition", isActive(key) ? "bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/40" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100")}
    >
      <span className="w-5 text-center" aria-hidden>{icon}</span>
      <span className="flex-1 leading-tight">{label}</span>
      {extra}
    </a>
  );

  const sidebar = (
    <nav className="space-y-5" aria-label="Course navigation">
      <div className="space-y-1">{link("#/", "home", "🏠", "Home & syllabus")}</div>
      <div>
        <div className="mb-1.5 flex items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Lessons</span><span>{done.length}/{LESSONS.length}</span>
        </div>
        <div className="space-y-0.5">
          {LESSONS.map((l) =>
            link(`#/lesson/${l.id}`, `l${l.id}`, l.emoji, `${l.id}. ${l.short}`, done.includes(l.id) ? <span className="text-emerald-400" title="completed">✓</span> : <span className="text-[10px] text-slate-600">{l.minutes}m</span>),
          )}
        </div>
      </div>
      <div>
        <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Toolkit</div>
        <div className="space-y-0.5">{TOOLS.map((t) => link(`#/${t.id}`, t.id, t.icon, t.label))}</div>
      </div>
      <a href="https://github.com/knarayanareddy/IBM-Qiskit" target="_blank" rel="noreferrer" className="block rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:border-cyan-400 hover:text-cyan-200">⭐ Open the repo on GitHub ↗</a>
    </nav>
  );

  const Page = route.kind === "tool" ? TOOLS.find((t) => t.id === route.id)!.Component : null;

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-200 antialiased selection:bg-cyan-400/30">
      <div aria-hidden className="no-print pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="no-print sticky top-0 z-40 border-b border-slate-800 bg-[#060a14]/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button onClick={() => setOpen(!open)} className="rounded-md border border-slate-700 px-2.5 py-1 text-slate-300 lg:hidden" aria-label="Toggle navigation">☰</button>
          <a href="#/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-violet-500 to-emerald-400 font-mono text-sm font-black text-slate-900">|ψ⟩</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold text-white">Quantum Hackathon Bootcamp</span>
              <span className="block text-[11px] text-slate-500">Error Mitigation · Qiskit Fall Fest 2026</span>
            </span>
          </a>
          <div className="ml-auto flex w-40 items-center gap-2 sm:w-64">
            <div className="flex-1"><ProgressBar value={frac} /></div>
            <span className="text-xs tabular-nums text-slate-400">{Math.round(frac * 100)}%</span>
          </div>
          <div className="hidden items-center gap-1 text-lg sm:flex" title="Badges earned">
            {LESSONS.map((l) => (
              <span key={l.id} className={cn("text-base transition", done.includes(l.id) ? "opacity-100" : "opacity-20 grayscale")} title={`${l.badge.name}${done.includes(l.id) ? " ✓" : ""}`}>{l.badge.emoji}</span>
            ))}
          </div>
        </div>
      </header>

      <div className="relative flex">
        {/* desktop sidebar */}
        <aside className="no-print sticky top-[53px] hidden h-[calc(100vh-53px)] w-72 shrink-0 overflow-y-auto border-r border-slate-800 bg-[#060a14]/60 p-3 lg:block">{sidebar}</aside>
        {/* mobile drawer */}
        {open && (
          <div className="no-print fixed inset-0 top-[53px] z-30 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-slate-800 bg-[#0a1020] p-3">{sidebar}</aside>
          </div>
        )}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">
          {route.kind === "home" && <Home />}
          {route.kind === "lesson" && <LessonView id={route.id} />}
          {Page && <Page />}
          <footer className="no-print mx-auto mt-14 max-w-4xl border-t border-slate-800 pt-5 text-center text-xs text-slate-600">
            Unofficial study guide for the Qiskit Fall Fest 2026 Error Mitigation track. Demos use simplified teaching simulations — not hardware results. Progress is stored only in your browser.
          </footer>
        </main>
      </div>
    </div>
  );
}
