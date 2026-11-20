import { Callout, CodeBlock, Legend, Panel } from "../components/ui";
import { COLORS } from "../lib/quantum";

const DESKTOP = `┌──────────────────────────────────────────────────────────────────────────┐
│ ◉ Quantum Bootcamp        Lesson 3 of 10 ▓▓▓▓▓▓░░░░ 30%        🏅 3 badges   │ ← top bar + progress
├───────────────┬──────────────────────────────────────────────────────────┤
│ HOME          │  ⏱ 20 min · Lesson 3                                      │
│ ─ Lessons ─   │  📖 Reading a circuit diagram                              │
│ ✓ 1 Qubit     │  By the end: you can read H / CX / measure…                │
│ ✓ 2 Gates     │ ┌─ 🧠 ANALOGY ─────────────────────────────────────────┐  │
│ ▶ 3 Circuits  │ │ A piece of sheet music…                              │  │
│ ○ 4 Noise     │ └──────────────────────────────────────────────────────┘  │
│ ○ 5 Mitigate  │ ┌─ 💬 plain-English bullets ───────────────────────────┐  │
│ …             │ └──────────────────────────────────────────────────────┘  │
│ ─ Toolkit ─   │ ┌─ 🎛️ PLAY WITH IT  (slider demo / circuit builder) ──┐  │
│ 🧪 Sandbox    │ │  [controls]     [ histogram: green / red / purple ]  │  │
│ 💻 Setup      │ └──────────────────────────────────────────────────────┘  │
│ 🗺️ Repo map   │ ┌─ 👆 click-to-reveal  ▾ ▾ ▾ ───────────────────────────┐  │
│ 🗓️ Day plan   │ ┌─ 🎯 WHAT THIS MEANS FOR YOU (cyan callout) ──────────┐  │
│ 📄 Cheat      │ ┌─ 🗺️ WHERE IN THE REPO  📄 src/lib/simulator.ts ↗ ────┐  │
│ ✅ Assess     │ ┌─ 🧪 TRY THIS IN THE REPO  ☐ ☐ ☐ ─────────────────────┐  │
│ 💬 Ask Claude │ ┌─ ✅ quick check (2–3 questions) ─────────────────────┐  │
│               │ [← prev]   [ Mark complete & earn 📖 ]   [next →]        │
└───────────────┴──────────────────────────────────────────────────────────┘`;

const MOBILE = `┌────────────────────┐
│ ☰  Lesson 3/10  30%│  ← hamburger opens the sidebar drawer
├────────────────────┤
│ 📖 Reading a circuit│
│ 🧠 analogy card     │
│ 🎛️ demo (stacked)   │
│   controls ↑        │
│   histogram ↓       │
│ 👆 reveals          │
│ 🎯 means-for-you    │
│ 📄 repo files       │
│ 🧪 try this ☐☐☐     │
│ ✅ quiz             │
│ [← ] [complete] [→]│
└────────────────────┘`;

export default function Blueprint() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-white">🎨 UX Blueprint</h1>
        <p className="text-slate-300">The design rules behind this learning site — and a recipe if you want to add a “Learn” mode to the repo itself.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Desktop wireframe (lesson page)" icon="🖥️"><CodeBlock lang="wireframe" code={DESKTOP} /></Panel>
        <Panel title="Mobile wireframe" icon="📱"><CodeBlock lang="wireframe" code={MOBILE} /></Panel>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Lesson card anatomy (same order every time)" icon="🧱">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-300">
            <li><b>Header</b> — “Lesson N of 10”, time, goal, progress dots.</li>
            <li><b>Analogy card</b> (amber) — coin, headphones, ballots.</li>
            <li><b>Plain-English bullets</b> — max 4.</li>
            <li><b>Play with it</b> — a slider-driven demo with a “Do this:” instruction.</li>
            <li><b>Click to reveal</b> — details hidden until wanted (low intimidation).</li>
            <li><b>What this means for you</b> (cyan callout).</li>
            <li><b>Where in the repo</b> — file chips linking to GitHub.</li>
            <li><b>Try this in the repo</b> — checkable tasks.</li>
            <li><b>Quick check</b> → <b>Mark complete</b> → badge.</li>
          </ol>
        </Panel>
        <Panel title="Colour semantics (never change meaning)" icon="🎨">
          <Legend items={[{ label: "Green #34d399 — ideal / correct / legal", color: COLORS.ideal }, { label: "Red #fb7185 — noisy / error / illegal", color: COLORS.noisy }, { label: "Purple #a78bfa — mitigated (v1 hard)", color: COLORS.mitigated }, { label: "Pink #f472b6 — soft reweighting (v2)", color: COLORS.soft }, { label: "Amber #fbbf24 — warning / readout-only", color: COLORS.readout }, { label: "Cyan #22d3ee — interactive / navigation", color: COLORS.accent }]} />
          <p className="mt-3 text-xs text-slate-500">Matches the repo's histograms so visual memory transfers. Always pair colour with a label or icon (✕, ✓) for colour-blind readers.</p>
        </Panel>
        <Panel title="Interaction principles" icon="🖱️">
          <ul className="space-y-1.5 text-sm text-slate-300">
            <li>▸ <b>Concrete before abstract</b>: the demo comes before the explanation.</li>
            <li>▸ <b>Predict → reveal</b>: ask the learner to guess, then show.</li>
            <li>▸ <b>One slider = one idea</b>; sliders update instantly (debounce ~200 ms for heavy sims).</li>
            <li>▸ <b>Fixed seeds + “re-sample” button</b> so wobble is visible but controlled.</li>
            <li>▸ <b>Every lesson ends with action</b>: a task in the real repo.</li>
          </ul>
        </Panel>
        <Panel title="Progress & motivation" icon="🏅">
          <ul className="space-y-1.5 text-sm text-slate-300">
            <li>▸ Top-bar progress + per-lesson dots (green = done).</li>
            <li>▸ One badge per lesson 🪙 🚪 📖 📻 🎧 ⚖️ 🎯 📈 🏅 🚀.</li>
            <li>▸ Self-assessment levels: Curious beginner → Explorer → Practitioner → Hackathon-ready.</li>
            <li>▸ Everything saved in <code>localStorage</code> — no account needed.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Adding a ‘Learn’ mode to the repo itself (optional)" icon="🧩">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>Add a <code>"learn"</code> entry to the <code>PAGES</code> array in <code>src/App.tsx</code> (it already routes by <code>#/id</code>).</li>
          <li>Create <code>src/pages/Learn.tsx</code>; read the shared Lab state with <code>useLab()</code> from <code>src/lib/store.tsx</code> so lesson demos can show <i>your</i> circuit.</li>
          <li>Reuse <code>NoiseKnobs.tsx</code>, <code>Charts.tsx</code> and <code>QuantumCircuit.tsx</code> inside lesson cards — the sandbox idea is then literally the real Lab.</li>
          <li>Persist progress with <code>localStorage</code> like the Playbook checklist already does.</li>
        </ol>
        <div className="mt-3"><Callout tone="cyan" icon="🧪" title="Sandbox mode"><span>The best teaching pattern: a “Open in Lab” button on each lesson that loads the lesson's circuit into the Lab store (<code>loadStandIn(id)</code>) and jumps to <code>#/lab</code> with the noise knobs preset. This site's <a href="#/sandbox" className="underline">Sandbox</a> is the standalone version of that idea.</span></Callout></div>
      </Panel>
    </div>
  );
}
