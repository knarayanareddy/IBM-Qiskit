import type { ReactNode } from "react";
import { Callout, CodeBlock, Panel, ProgressBar, Reveal, useStored } from "../components/ui";

interface Step { id: string; title: string; icon: string; body: ReactNode }

const ROUTES: [string, string, string][] = [
  ["#/overview", "Overview", "Decision helper + project cards"],
  ["#/lab", "Prototype Lab", "Paste a circuit, set noise, run, see histograms"],
  ["#/compare", "Before → After", "Scorecard, Budget Meter, Noise sweep, CSV/JSON export"],
  ["#/ideas", "New Ideas", "7 project ideas with time-boxes"],
  ["#/overhead", "Overhead Wall", "Why mitigation cost explodes with depth"],
  ["#/vd", "Virtual Distillation", "Demo page"],
  ["#/cdr", "Clifford Data Regression", "Demo page"],
  ["#/playbook", "Playbook", "Checklists, pitch skeleton, Runtime baseline code"],
];

export default function Setup() {
  const [checked, setChecked] = useStored<Record<string, boolean>>("qb-setup", {});
  const mk = (id: string, title: string, icon: string, body: ReactNode): Step => ({ id, title, icon, body });

  const steps: Step[] = [
    mk("prereq", "Check prerequisites", "🔎", (
      <div className="space-y-3">
        <p>You need <b>Git</b> and <b>Node.js 20.19+</b> (the repo uses Vite 7, which needs a recent Node). npm comes with Node.</p>
        <CodeBlock prompt code={`git --version\nnode --version     # want v20.19+ or v22+\nnpm --version`} />
        <p className="text-xs text-slate-400">No Node? Install the LTS from nodejs.org, or use <code>nvm install --lts</code>. Python/Qiskit are <b>not</b> needed for the web prototype.</p>
      </div>
    )),
    mk("clone", "Clone the repo", "📥", (
      <div className="space-y-3">
        <CodeBlock prompt code={`git clone https://github.com/knarayanareddy/IBM-Qiskit.git\ncd IBM-Qiskit\nls          # you should see: dist  ideas-repo  src  index.html  package.json …`} />
        <p className="text-xs text-slate-400">Prefer no terminal? Click the green “Code” button on GitHub → Download ZIP → unzip.</p>
      </div>
    )),
    mk("install", "Install dependencies", "📦", (
      <div className="space-y-3">
        <CodeBlock prompt code={`npm install`} />
        <p>Takes 30–90 seconds. Expect a <code>node_modules/</code> folder. Warnings are fine; red <code>ERR!</code> lines are not (see troubleshooting below).</p>
      </div>
    )),
    mk("dev", "Run the dev server", "🚀", (
      <div className="space-y-3">
        <CodeBlock prompt code={`npm run dev`} />
        <p>Vite prints <code className="text-cyan-300">Local: http://localhost:5173/</code>. Open it. You should see a dark app with a top bar: 🌐 Overview, 🧪 Prototype Lab, ⚖️ Before → After, … Edits you make in <code>src/</code> hot-reload instantly.</p>
        <p className="text-xs text-slate-400">Stop the server with <kbd className="rounded bg-slate-800 px-1.5">Ctrl</kbd>+<kbd className="rounded bg-slate-800 px-1.5">C</kbd>.</p>
      </div>
    )),
    mk("build", "Build for production", "🏗️", (
      <div className="space-y-3">
        <CodeBlock prompt code={`npm run build\nnpm run preview     # optional: serve the built site locally`} />
        <p>Output lands in <code>dist/</code>. Because the repo uses <code>vite-plugin-singlefile</code>, everything (JS + CSS) is inlined into <b>one</b> <code>dist/index.html</code> — perfect to copy to a USB stick or email to yourself.</p>
      </div>
    )),
    mk("open", "Open dist/index.html directly (no server)", "📂", (
      <div className="space-y-3">
        <CodeBlock prompt code={`# macOS\nopen dist/index.html\n# Linux\nxdg-open dist/index.html\n# Windows (PowerShell)\nstart dist\\index.html`} />
        <p>Or just double-click the file. Everything runs in the browser — no internet, no backend. The repo already commits a <code>dist/</code> folder, so even <i>before</i> installing anything you can open <code>dist/index.html</code> to look around.</p>
        <Callout tone="cyan" icon="✈️" title="Airplane-mode insurance"><span>Keep a copy of <code>dist/index.html</code> (and <code>ideas-repo/dist/index.html</code> after you build it) on your laptop desktop. If the venue Wi-Fi dies, your tools still work.</span></Callout>
      </div>
    )),
    mk("hash", "Navigate with hash URLs", "🔗", (
      <div className="space-y-3">
        <p>The main app uses the part after <code>#</code> as the page. Type it into the address bar, bookmark it, or share it:</p>
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/70 text-left text-[11px] uppercase tracking-wider text-slate-400"><tr><th className="p-2">URL fragment</th><th>Page</th><th>What you'll do there</th></tr></thead>
            <tbody>
              {ROUTES.map(([h, p, d]) => (
                <tr key={h} className="border-t border-slate-800"><td className="p-2 font-mono text-cyan-300">{h}</td><td className="pr-3">{p}</td><td className="pr-2 text-slate-400">{d}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400">Example: <code>http://localhost:5173/#/lab</code> or <code>file:///…/dist/index.html#/compare</code>. Unknown fragments fall back to Overview.</p>
        <Callout tone="amber" icon="⚠️"><span>The <b>ideas-repo</b> app does <i>not</i> use hash URLs — it switches pages with its top navigation buttons (Overview · Prototype Lab · Before → After · New Ideas · Playbook).</span></Callout>
      </div>
    )),
    mk("ideas", "Run the ideas-repo walkthroughs", "💡", (
      <div className="space-y-3">
        <CodeBlock prompt code={`cd ideas-repo\nnpm install\nnpm run dev      # if 5173 is taken Vite picks 5174 — read the terminal\nnpm run build    # → ideas-repo/dist/index.html`} />
        <p>In the Prototype Lab, pick a project (1–4), then step through six phases: <b>Problem → Circuit → Noisy Run → Mitigate → Results → On the Day</b>. Press <b>▶ Auto-play tour</b> and it walks through them for you. Each project has <b>v1</b> and <b>v2</b> modes and a split view.</p>
      </div>
    )),
    mk("paste", "Paste a circuit into the Lab and run it", "🧪", (
      <div className="space-y-3">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Go to <code>#/lab</code>.</li>
          <li>Find the circuit box (placeholder shows OpenQASM). You can type/paste, or upload a <code>.qasm / .py / .txt / .qasm3</code> file. The prototype accepts <b>Qiskit Python</b> or <b>OpenQASM 2/3</b>, including simple <code>for</code> loops.</li>
          <li>Replace the text with the Bell circuit below.</li>
          <li>Check the badges: <b className="text-emerald-300">parsed ✓</b> + the format name. A red <b className="text-rose-300">error</b> lists what failed. Warnings about unsupported gates mean the simulated circuit is <i>not</i> yours — fix them first.</li>
          <li>Pick a conservation law (or accept the suggestion), set noise knobs, choose v1/v2, and read the histograms. The simulation re-runs automatically ~0.2 s after you stop typing or dragging.</li>
        </ol>
        <CodeBlock lang="python" title="Paste me into the Lab" code={`qc = QuantumCircuit(2, 2)\nqc.h(0)\nqc.cx(0, 1)\nqc.measure_all()`} />
        <CodeBlock lang="qasm" title="…or OpenQASM 2.0" code={`OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q -> c;`} />
        <p className="text-xs text-slate-400">Limits: up to 12 qubits, up to 10 measured. Supported gates include id x y z h s sdg t tdg sx rx ry rz p u cx cy cz ch cp swap rxx ryy rzz ccx and measure.</p>
      </div>
    )),
    mk("export", "Export results (CSV / JSON) from Compare", "💾", (
      <div className="space-y-3">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Make sure the Lab holds the circuit & noise you care about (Compare reads the same state).</li>
          <li>Open <code>#/compare</code>.</li>
          <li>Scroll to the panel <b>“Judge's scorecard”</b> (5 rows: Raw, Runtime Defaults, Adaptive Conservation (ours), Readout-only, Hard post-selection).</li>
          <li>Click <b>CSV</b> → downloads <code>scorecard.csv</code>. Click <b>JSON</b> → <code>scorecard.json</code>.</li>
          <li>Open the CSV in a spreadsheet; columns include method, value, error, gap-closed %, TVD, retention %, QPU jobs/seconds.</li>
        </ol>
        <p className="text-xs text-slate-400">Reproducibility tip from the Playbook: fix random seeds and export the scorecard so every number on your slide can be regenerated.</p>
      </div>
    )),
    mk("decide", "Use the decision helper to pick a project", "🧭", (
      <div className="space-y-3">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Open <code>#/overview</code> and scroll to <b>Decision helper</b>.</li>
          <li>Describe the revealed algorithm with the toggles: <i>T / non-Clifford gates present</i>, <i>Symmetry is conserved</i>, <i>Fixed Hamming weight output</i>, ancilla availability, depth (shallow / medium / deep), and whether QPU time is tight.</li>
          <li>Each project gets a <b>1–4 fit score</b> and the reasons that moved it. Commit to <b>one primary and one fallback</b>.</li>
          <li>Then in the Lab, choose v1 (hard) or v2 (soft) and run baselines.</li>
        </ol>
        <p className="text-xs text-slate-400">Rule of thumb: T gates, no symmetry → ZNE-style. Symmetry or fixed weight → Symmetry-Resolved / Adaptive Conservation. QPU time tight → avoid ≥3× shot methods.</p>
      </div>
    )),
  ];

  const doneCount = steps.filter((s) => checked[s.id]).length;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-white">💻 Setup & Run — the end-to-end pipeline</h1>
        <p className="text-slate-300">Eleven steps, each with copy-paste commands. Tick them off as you go; progress is saved in this browser.</p>
        <div className="max-w-sm"><div className="mb-1 text-xs text-slate-400">{doneCount}/{steps.length} done</div><ProgressBar value={doneCount / steps.length} tone="cyan" /></div>
      </header>
      <div className="space-y-4">
        {steps.map((s, i) => (
          <Panel key={s.id} title={`${i + 1}. ${s.title}`} icon={s.icon} right={<label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400"><input type="checkbox" className="accent-emerald-400" checked={!!checked[s.id]} onChange={(e) => setChecked((c) => ({ ...c, [s.id]: e.target.checked }))} />done</label>} className={checked[s.id] ? "border-emerald-400/30" : ""}>
            <div className="space-y-3 text-sm leading-relaxed text-slate-300">{s.body}</div>
          </Panel>
        ))}
      </div>

      <Panel title="Troubleshooting" icon="🛠️">
        <div className="space-y-2">
          <Reveal q="npm install fails or Vite says 'requires Node …'"><p>Check <code>node --version</code>. Vite 7 wants Node 20.19+ or 22.12+. Upgrade Node, then retry from a clean slate: <code>rm -rf node_modules && npm install</code>.</p></Reveal>
          <Reveal q="'Port 5173 is already in use'"><p>Vite will usually pick the next port automatically (5174…). Read the <code>Local:</code> line in the terminal. Or stop the other server with Ctrl+C.</p></Reveal>
          <Reveal q="Blank page when I open dist/index.html"><p>Make sure you open <code>dist/index.html</code> from a fresh <code>npm run build</code> (single-file build). If you see a blank page, open DevTools (F12) → Console; paste the error into Claude (see Ask Claude).</p></Reveal>
          <Reveal q="The Lab says 'error' or unsupported gate"><p>Read the red message under the circuit box — it names the line. Unsupported gates are skipped with a warning, which changes your circuit; rewrite them with supported gates (e.g. decompose a custom gate into h/cx/rz).</p></Reveal>
          <Reveal q="Page changes but scroll position is odd"><p>Hash navigation scrolls to top by design. Refresh once if the nav highlight seems off.</p></Reveal>
        </div>
      </Panel>
    </div>
  );
}
