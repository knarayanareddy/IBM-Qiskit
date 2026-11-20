import { Callout, Check, Panel, ProgressBar, useStored } from "../components/ui";

const GROUPS: { title: string; icon: string; items: { id: string; text: string; lesson?: number; href?: string }[] }[] = [
  {
    title: "Understand it",
    icon: "🧠",
    items: [
      { id: "a1", text: "I can explain what a qubit is to a 10-year-old", lesson: 1 },
      { id: "a2", text: "I can read a circuit diagram with H, CX, and measure gates", lesson: 3 },
      { id: "a3", text: "I can name the three kinds of noise and which is easiest to fix", lesson: 4 },
      { id: "a4", text: "I can explain mitigation vs error correction in one sentence", lesson: 5 },
      { id: "a5", text: "I can say what parity and Hamming weight are and spot when a law does NOT hold (GHZ)", lesson: 6 },
      { id: "a6", text: "I can explain why post-selection throws away shots — and how soft reweighting avoids it", lesson: 7 },
      { id: "a7", text: "I can describe ZNE as amplify → measure → extrapolate, and its bias/variance trade-off", lesson: 8 },
      { id: "a8", text: "I know what Sampler, Estimator and resilience levels 0/1/2 do", lesson: 10 },
    ],
  },
  {
    title: "Do it",
    icon: "🛠️",
    items: [
      { id: "b1", text: "I can run npm install && npm run dev without errors", href: "#/setup" },
      { id: "b2", text: "I can run a circuit in the Lab and interpret the histogram", href: "#/setup" },
      { id: "b3", text: "I can paste a Qiskit/QASM circuit into the Lab and get 'parsed ✓'", lesson: 3 },
      { id: "b4", text: "I can read the scorecard and tell if mitigation helped", lesson: 9 },
      { id: "b5", text: "I can export CSV/JSON from Compare", href: "#/setup" },
      { id: "b6", text: "I can use the decision helper to pick one primary and one fallback project", href: "#/day" },
      { id: "b7", text: "I can open dist/index.html offline and navigate with #/lab, #/compare", href: "#/setup" },
    ],
  },
  {
    title: "Demo it",
    icon: "🎤",
    items: [
      { id: "c1", text: "I can run a stand-in (GHZ / Bell / Trotter) from paste to export in under 5 minutes", href: "#/day" },
      { id: "c2", text: "I have an IBM Quantum account and tested the Runtime baseline snippet", lesson: 10 },
      { id: "c3", text: "I can give the 3-minute pitch including one honest failure case", href: "#/day" },
    ],
  },
];

export default function Assessment() {
  const [done, setDone] = useStored<Record<string, boolean>>("qb-assess", {});
  const all = GROUPS.flatMap((g) => g.items);
  const n = all.filter((i) => done[i.id]).length;
  const f = n / all.length;
  const level = f === 1 ? ["🏆", "Hackathon-ready", "You can run and demo error mitigation with confidence. Go enjoy Amsterdam."] : f >= 0.7 ? ["🚀", "Practitioner", "Nearly there — close the remaining gaps by rehearsing the day plan."] : f >= 0.35 ? ["🧭", "Explorer", "You've got the shape of it. Keep going through lessons and the Lab."] : ["🌱", "Curious beginner", "Perfect starting point. Begin with Lesson 1 — everything builds from there."];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-white">✅ Noob → Confident self-assessment</h1>
        <p className="text-slate-300">Tick an item only when you could do it <i>without</i> looking anything up. Be kind to yourself — honest beats impressive.</p>
      </header>
      <Panel className="border-emerald-400/30">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-5xl">{level[0]}</div>
          <div className="min-w-[220px] flex-1 space-y-2">
            <div className="flex justify-between"><span className="font-bold text-white">{level[1]}</span><span className="text-sm text-slate-400">{n}/{all.length}</span></div>
            <ProgressBar value={f} />
            <p className="text-sm text-slate-300">{level[2]}</p>
          </div>
        </div>
      </Panel>
      {GROUPS.map((g) => (
        <Panel key={g.title} title={g.title} icon={g.icon}>
          <div className="space-y-2">
            {g.items.map((it) => (
              <div key={it.id} className="flex items-center gap-2">
                <div className="flex-1"><Check checked={!!done[it.id]} onChange={(v) => setDone((d) => ({ ...d, [it.id]: v }))}>{it.text}</Check></div>
                <a href={it.lesson ? `#/lesson/${it.lesson}` : it.href} className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-cyan-400 hover:text-cyan-200">{it.lesson ? `Lesson ${it.lesson}` : "how →"}</a>
              </div>
            ))}
          </div>
        </Panel>
      ))}
      <Callout tone="violet" icon="🎓" title="Stuck on an item?">
        <p>Open <a href="#/prompts" className="text-violet-200 underline">Ask Claude</a> and use the “Test me” prompts — they quiz you on exactly these skills.</p>
      </Callout>
    </div>
  );
}
