import { useState } from "react";
import { Badge, Notice, Panel, Pips, type Tone } from "../components/ui";
import { ATTRIBUTION_NOTE, IDEAS, type Idea } from "../lib/meta";
import { cn } from "../utils/cn";

const CONF_TONE: Record<Idea["sources"][number]["confidence"], Tone> = { stated: "emerald", inferred: "amber", unverified: "rose" };

const ALL_HANDLES = [
  "@amarchenkova", "@atsushi_iwaki_", "@layden_variable", "@IBMResearch", "@zhenyu_cai", "@quekpottheories", "@jaygambetta", "@SciTechera",
];

type Sort = "id" | "effort" | "novelty" | "risk";

export default function Ideas() {
  const [open, setOpen] = useState<number | null>(1);
  const [sort, setSort] = useState<Sort>("id");
  const [handle, setHandle] = useState<string | null>(null);

  const list = IDEAS.filter((i) => !handle || i.sources.some((s) => s.handle === handle)).sort((a, b) =>
    sort === "id" ? a.id - b.id : sort === "novelty" ? b.novelty - a.novelty : a[sort] - b[sort],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">💡 New Ideas</h1>
        <p className="mt-1 max-w-3xl text-slate-400">
          Seven extra concepts to pair with Adaptive Conservation or fall back on. Each has effort / novelty / risk meters, a time-boxed plan and the exact artefacts to show judges.
        </p>
      </div>

      <Notice tone="amber" title="About the attributions">
        {ATTRIBUTION_NOTE}
      </Notice>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setHandle(null)}
            className={cn("rounded-full border px-2.5 py-1 text-xs", handle === null ? "border-cyan-400 bg-cyan-400/15 text-cyan-200" : "border-slate-700 text-slate-400 hover:border-slate-500")}
          >
            all sources
          </button>
          {ALL_HANDLES.map((h) => (
            <button
              key={h}
              onClick={() => setHandle(handle === h ? null : h)}
              className={cn("rounded-full border px-2.5 py-1 font-mono text-xs", handle === h ? "border-violet-400 bg-violet-400/15 text-violet-200" : "border-slate-700 text-slate-400 hover:border-slate-500")}
            >
              {h}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200">
            <option value="id">default</option>
            <option value="effort">lowest effort</option>
            <option value="risk">lowest risk</option>
            <option value="novelty">highest novelty</option>
          </select>
        </label>
      </div>

      {list.length === 0 && <p className="text-sm text-slate-500">No ideas cite that handle.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((idea) => {
          const isOpen = open === idea.id;
          return (
            <Panel key={idea.id} className={cn(isOpen && "lg:col-span-2 border-cyan-400/30")}>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900/70 text-2xl ring-1 ring-slate-700">{idea.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      <span className="mr-1.5 text-slate-500">#{idea.id}</span>
                      {idea.title}
                    </h3>
                    {idea.builtHere && <Badge tone="emerald">in this prototype</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{idea.pitch}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-x-8 gap-y-1.5 sm:grid-cols-3">
                <Pips label="Effort" value={idea.effort} tone="amber" />
                <Pips label="Novelty" value={idea.novelty} tone="violet" />
                <Pips label="Risk" value={idea.risk} tone="rose" />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {idea.sources.map((s) => (
                  <Badge key={s.handle} tone={CONF_TONE[s.confidence]} title={`${s.why} — ${s.confidence}`} className="font-mono">
                    {s.handle} · {s.confidence}
                  </Badge>
                ))}
              </div>

              <button onClick={() => setOpen(isOpen ? null : idea.id)} aria-expanded={isOpen} className="mt-4 text-sm font-medium text-cyan-300 hover:text-cyan-200">
                {isOpen ? "▾ Hide plan" : "▸ Time-boxed plan & deliverables"}
              </button>

              {isOpen && (
                <div className="mt-4 grid gap-6 border-t border-slate-700/50 pt-4 md:grid-cols-[1.4fr_1fr]">
                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Time-boxed plan</div>
                    <ol className="space-y-2">
                      {idea.timebox.map((t) => (
                        <li key={t.slot} className="flex gap-3 text-sm">
                          <span className="w-24 shrink-0 font-mono text-xs text-cyan-300">{t.slot}</span>
                          <span className="text-slate-300">{t.task}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Judge-facing deliverables</div>
                      <ul className="space-y-1 text-sm text-slate-300">
                        {idea.deliverables.map((d) => (
                          <li key={d} className="flex gap-2">
                            <span className="text-emerald-400">✓</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Why these sources</div>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {idea.sources.map((s) => (
                          <li key={s.handle}>
                            <span className="font-mono text-slate-300">{s.handle}</span> — {s.why}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {idea.builtHere && <Notice tone="emerald">{idea.builtHere}</Notice>}
                  </div>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
