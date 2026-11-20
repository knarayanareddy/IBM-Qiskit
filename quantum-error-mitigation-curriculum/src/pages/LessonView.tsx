import type { ComponentType } from "react";
import { LESSONS } from "../lib/lessons";
import { Badge, Callout, CodeBlock, FileChip, Panel, Quiz, Reveal, Check, useStored } from "../components/ui";
import { cn } from "../utils/cn";
import { GatesDemo, NoiseDemo, QubitDemo, ReadCircuitDemo } from "../components/demos/DemosA";
import { LawDemo, MitigationDemo, PostSelectDemo } from "../components/demos/DemosB";
import { RuntimeDemo, ScorecardDemo, ZneDemo } from "../components/demos/DemosC";

const DEMOS: Record<number, ComponentType> = {
  1: QubitDemo, 2: GatesDemo, 3: ReadCircuitDemo, 4: NoiseDemo, 5: MitigationDemo,
  6: LawDemo, 7: PostSelectDemo, 8: ZneDemo, 9: ScorecardDemo, 10: RuntimeDemo,
};

export default function LessonView({ id }: { id: number }) {
  const lesson = LESSONS.find((l) => l.id === id) ?? LESSONS[0];
  const Demo = DEMOS[lesson.id];
  const [done, setDone] = useStored<number[]>("qb-lessons", []);
  const [tries, setTries] = useStored<Record<string, boolean>>("qb-tries", {});
  const isDone = done.includes(lesson.id);
  const prev = LESSONS.find((l) => l.id === lesson.id - 1);
  const next = LESSONS.find((l) => l.id === lesson.id + 1);

  return (
    <article className="mx-auto max-w-4xl space-y-6" key={lesson.id}>
      {/* header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Badge tone="cyan">Lesson {lesson.id} of {LESSONS.length}</Badge>
          <Badge tone="slate">⏱ {lesson.minutes} min</Badge>
          {isDone && <Badge tone="emerald">{lesson.badge.emoji} Badge earned: {lesson.badge.name}</Badge>}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          <span className="mr-2">{lesson.emoji}</span>
          {lesson.title}
        </h1>
        <p className="text-slate-300">
          <b className="text-cyan-300">By the end:</b> {lesson.goal}
        </p>
        <div className="flex gap-1.5" aria-label="Lesson progress dots">
          {LESSONS.map((l) => (
            <a key={l.id} href={`#/lesson/${l.id}`} title={l.title} className={cn("h-1.5 flex-1 rounded-full transition", l.id === lesson.id ? "bg-cyan-400" : done.includes(l.id) ? "bg-emerald-400/70" : "bg-slate-700 hover:bg-slate-500")} />
          ))}
        </div>
      </header>

      {/* analogy */}
      <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-transparent p-5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-300">🧠 Analogy · {lesson.analogy.title}</div>
        <p className="text-[15px] leading-relaxed text-slate-100">{lesson.analogy.text}</p>
      </div>

      {/* concrete */}
      <Panel title="The plain-English version" icon="💬">
        <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
          {lesson.concrete.map((c, i) => (
            <li key={i} className="flex gap-2.5"><span className="mt-0.5 text-cyan-400">▸</span><span>{c}</span></li>
          ))}
        </ul>
      </Panel>

      {/* demo */}
      <Panel title={`Play with it · ${lesson.demoTitle}`} icon="🎛️" className="border-cyan-400/30">
        <div className="mb-4 rounded-lg bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
          <b>Do this:</b> {lesson.demoDo}
        </div>
        <Demo />
      </Panel>

      {/* reveals */}
      <Panel title="Click to reveal" icon="👆">
        <div className="space-y-2">
          {lesson.reveals.map((r) => (
            <Reveal key={r.q} q={r.q}>
              <p>{r.a}</p>
            </Reveal>
          ))}
        </div>
      </Panel>

      {lesson.code && <CodeBlock code={lesson.code.code} lang={lesson.code.lang} title={lesson.code.title} />}

      <Callout tone="cyan" icon="🎯" title="What this means for you at the hackathon">
        <p>{lesson.means}</p>
      </Callout>

      {/* repo mapping */}
      <Panel title="Where this lives in the repo" icon="🗺️" right={<a className="text-xs text-cyan-300 hover:underline" href="#/repo">full repo map →</a>}>
        <div className="space-y-2">
          {lesson.files.map((f) => <FileChip key={f.path} path={f.path} note={f.note} />)}
        </div>
      </Panel>

      {/* try it */}
      <Panel title="Try this in the repo" icon="🧪" className="border-emerald-400/30">
        <div className="space-y-2">
          {lesson.tryIt.map((t, i) => {
            const k = `${lesson.id}-${i}`;
            return <Check key={k} checked={!!tries[k]} onChange={(v) => setTries((s) => ({ ...s, [k]: v }))}>{t}</Check>;
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">Not set up yet? Head to <a href="#/setup" className="text-cyan-300 hover:underline">Setup &amp; Run</a> — it takes about 5 minutes. Or use the <a href="#/sandbox" className="text-cyan-300 hover:underline">Sandbox</a> right here.</p>
      </Panel>

      {/* quiz */}
      <Panel title="Quick check" icon="✅">
        <Quiz questions={lesson.quiz} />
      </Panel>

      {/* complete */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <a href={prev ? `#/lesson/${prev.id}` : "#/"} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-400">← {prev ? `Lesson ${prev.id}` : "Home"}</a>
        <button
          onClick={() => setDone((d) => (d.includes(lesson.id) ? d.filter((x) => x !== lesson.id) : [...d, lesson.id]))}
          className={cn("rounded-xl px-5 py-2.5 text-sm font-bold transition", isDone ? "border border-emerald-400 bg-emerald-400/15 text-emerald-200" : "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 hover:brightness-110")}
        >
          {isDone ? `${lesson.badge.emoji} Completed — undo` : `Mark complete & earn ${lesson.badge.emoji} ${lesson.badge.name}`}
        </button>
        <a href={next ? `#/lesson/${next.id}` : "#/assess"} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white">{next ? `Lesson ${next.id} →` : "Self-assessment →"}</a>
      </div>
    </article>
  );
}
