import { LESSONS } from "../lib/lessons";
import { Badge, Callout, Legend, Panel, ProgressBar, useStored } from "../components/ui";
import { COLORS } from "../lib/quantum";
import { cn } from "../utils/cn";

export default function Home() {
  const [done] = useStored<number[]>("qb-lessons", []);
  const total = LESSONS.length;
  const frac = done.length / total;
  const nextLesson = LESSONS.find((l) => !done.includes(l.id));
  const minutes = LESSONS.reduce((a, l) => a + l.minutes, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="cyan">Qiskit Fall Fest 2026 · Amsterdam · 20–21 Nov</Badge>
            <Badge tone="violet">Error Mitigation track</Badge>
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            From “what is a qubit?”<br />
            <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">to demoing error mitigation.</span>
          </h1>
          <p className="max-w-2xl text-slate-300">
            10 interactive lessons (about {Math.round(minutes / 60 * 10) / 10} hours total), a live sandbox, a step-by-step run guide for the
            <code className="mx-1 rounded bg-slate-800 px-1.5 py-0.5 text-cyan-200">knarayanareddy/IBM-Qiskit</code>
            repo, a hackathon-day plan and a printable cheat sheet. Concrete first, maths later (or never).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={`#/lesson/${nextLesson?.id ?? 1}`} className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-3 font-bold text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:brightness-110">
              {done.length === 0 ? "Start Lesson 1 →" : nextLesson ? `Continue: Lesson ${nextLesson.id} →` : "Review lessons"}
            </a>
            <a href="#/setup" className="rounded-xl border border-slate-600 px-5 py-3 font-semibold text-slate-200 hover:border-cyan-400">Set up the repo (5 min)</a>
            <a href="#/sandbox" className="rounded-xl border border-slate-600 px-5 py-3 font-semibold text-slate-200 hover:border-violet-400">Open Sandbox 🧪</a>
          </div>
          <div className="max-w-md space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400"><span>{done.length} of {total} lessons complete</span><span>{Math.round(frac * 100)}%</span></div>
            <ProgressBar value={frac} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="How to use this" icon="🧭">
          <ol className="space-y-2 text-sm text-slate-300">
            <li><b className="text-cyan-300">1.</b> Play with the demo first — it's a safe mini-version of the repo's Lab.</li>
            <li><b className="text-cyan-300">2.</b> Read the analogy and click the reveals.</li>
            <li><b className="text-cyan-300">3.</b> Do "Try this in the repo" in a second window.</li>
            <li><b className="text-cyan-300">4.</b> Pass the quick check → earn the badge.</li>
          </ol>
        </Panel>
        <Panel title="Colour code (everywhere)" icon="🎨">
          <div className="space-y-2">
            <Legend items={[{ label: "Green — ideal / correct", color: COLORS.ideal }, { label: "Red — noisy / error", color: COLORS.noisy }, { label: "Purple & pink — mitigated", color: COLORS.mitigated }, { label: "Amber — warning / readout", color: COLORS.readout }]} />
            <p className="text-xs text-slate-500">Same colours as the repo's histograms, so what you learn here transfers one-to-one.</p>
          </div>
        </Panel>
        <Panel title="It's normal to feel lost" icon="💛">
          <p className="text-sm text-slate-300">Quantum is genuinely hard. You don't need to master it: you need to read a circuit, run a baseline, apply one mitigation method, and report honestly. That's what these lessons build.</p>
        </Panel>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Syllabus</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {LESSONS.map((l) => {
            const ok = done.includes(l.id);
            return (
              <a key={l.id} href={`#/lesson/${l.id}`} className={cn("group rounded-2xl border p-4 transition", ok ? "border-emerald-400/40 bg-emerald-400/5" : "border-slate-700 bg-slate-900/60 hover:border-cyan-400/60 hover:bg-slate-900")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-2xl">{l.emoji}</span>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">Lesson {l.id} · {l.minutes} min</div>
                      <div className="font-semibold leading-snug text-slate-100 group-hover:text-cyan-200">{l.title}</div>
                    </div>
                  </div>
                  <span className={cn("shrink-0 text-lg", ok ? "opacity-100" : "opacity-25 grayscale")} title={`Badge: ${l.badge.name}`}>{l.badge.emoji}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{l.short}</p>
              </a>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel title="Toolkit" icon="🧰">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[["#/sandbox", "🧪 Sandbox", "Tweak noise & mitigation live"], ["#/setup", "💻 Setup & Run", "clone → build → paste → export"], ["#/repo", "🗺️ Repo Map", "concept → exact file"], ["#/day", "🗓️ Hackathon Day", "hour-by-hour plan"], ["#/cheatsheet", "📄 Cheat Sheet", "one printable page"], ["#/assess", "✅ Self-Assessment", "noob → confident"], ["#/prompts", "💬 Ask Claude", "prompts for when you're stuck"], ["#/ux", "🎨 UX Blueprint", "wireframes & design rules"]].map(([h, t, d]) => (
              <a key={h} href={h} className="rounded-lg border border-slate-700 bg-slate-800/40 p-2.5 hover:border-cyan-400/60">
                <div className="font-semibold text-slate-100">{t}</div>
                <div className="text-[11px] text-slate-400">{d}</div>
              </a>
            ))}
          </div>
        </Panel>
        <Callout tone="amber" icon="🔍" title="Repo reality-check (I read the GitHub tree)">
          <p>The repo contains <code>src/</code> (the main prototype, with hash routes) and <code>ideas-repo/</code> (four project walkthroughs, no hash routes) plus a committed <code>dist/</code>.</p>
          <p>It does <b>not</b> currently contain <code>fallfest-combined-infra/</code> or the Python <code>core/</code> files — the TypeScript code mentions them as the originals it ports (e.g. <code>core/scorecard.py</code>). If you have them locally, great; everything here works without them.</p>
        </Callout>
      </section>
    </div>
  );
}
