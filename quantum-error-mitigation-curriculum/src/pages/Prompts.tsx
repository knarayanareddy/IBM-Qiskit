import { useState } from "react";
import { Panel } from "../components/ui";

const GROUPS: { title: string; icon: string; tone: string; prompts: string[] }[] = [
  {
    title: "I don't understand a concept",
    icon: "🤔",
    tone: "text-cyan-300",
    prompts: [
      "Explain [qubit / superposition / entanglement / T gate] using a coin analogy, then give me a 2-question quiz. Assume I know zero quantum.",
      "I understand parity now. Give me 3 tiny 4-bit examples where a conservation law catches an error and 1 where it doesn't, with answers hidden until I ask.",
      "In plain English, what's the difference between error mitigation, error suppression and error correction? Use a table and one sentence on what each costs.",
      "Explain zero-noise extrapolation like I'm 12, then explain why a linear fit gives bias and an exponential fit might not.",
      "Why does hard post-selection reduce my effective shots? Show me the 1/√N argument with numbers for 4096 shots at 25% retention.",
    ],
  },
  {
    title: "I'm stuck in the repo",
    icon: "🛠️",
    tone: "text-emerald-300",
    prompts: [
      "I cloned github.com/knarayanareddy/IBM-Qiskit and `npm run dev` fails with this error: [paste]. My Node version is [paste]. Walk me through fixing it step by step.",
      "Here is the content of src/pages/Compare.tsx [paste]. Explain the NoiseSweep component line by line as if I know basic JavaScript but no React.",
      "I pasted this circuit into the Lab and it says: [paste error]. Which line is the problem and how do I rewrite it using supported gates?",
      "Where in src/lib/simulator.ts is [hardPostselect / softWeights / tvd] implemented? Explain what the function takes in and returns, with a tiny numeric example.",
      "I want to add a new stand-in circuit to src/lib/meta.ts STAND_INS. Show me the minimal object I need to add, and what each field does.",
    ],
  },
  {
    title: "Reading results",
    icon: "📊",
    tone: "text-violet-300",
    prompts: [
      "Here is my scorecard CSV: [paste]. In plain English, did mitigation help? Point out anything suspicious (low retention, negative gap closed, overlapping error bars).",
      "My raw P(law) on hardware is 0.72 but the Lab simulation shows 0.91. Which noise knobs should I adjust first, and how do I calibrate them honestly?",
      "My v2 adaptive method closed 40% of the gap but v1 closed 55% with 30% retention. How do I present this fairly to judges?",
    ],
  },
  {
    title: "Hackathon day",
    icon: "🎤",
    tone: "text-amber-300",
    prompts: [
      "The organisers just revealed this algorithm: [describe/paste circuit]. Walk me through the decision helper traits (T gates, symmetry, fixed weight, ancillas, depth, QPU time) and recommend one primary and one fallback project with reasons.",
      "Here's my revealed circuit in QASM: [paste]. Does it conserve parity or Hamming weight? How can I verify with the ideal simulation in the Lab?",
      "Write my 3-minute pitch for [project] using this skeleton: problem → idea → baseline (raw, Runtime defaults) → result with gap-closed/TVD/retention → honest limits → next step. Keep it jargon-light.",
      "Give me a 10-minute checklist to submit raw, Runtime-defaults and calibration jobs for this circuit with qiskit-ibm-runtime, and the exact things to record from each result.",
      "I have 30 minutes left and my results are weak. Help me decide what honest story to tell and what one extra plot would strengthen it.",
    ],
  },
  {
    title: "Test me",
    icon: "🎓",
    tone: "text-pink-300",
    prompts: [
      "Quiz me, one question at a time, on the 7 self-assessment skills (qubit for a 10-year-old, reading H/CX/measure, running the Lab, post-selection shot loss, reading the scorecard, CSV/JSON export, npm run dev). Wait for my answer before the next. Be encouraging.",
      "Role-play a judge at the hackathon. Ask me 5 tough-but-fair questions about my error-mitigation project (cost, baselines, failure cases, mitigation vs correction) and critique my answers.",
      "Show me a circuit diagram description (e.g. 'H on q0, CX q0→q1, CX q1→q2, measure') and ask me to predict the histogram. Then reveal and explain.",
    ],
  },
];

export default function Prompts() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (p: string) => {
    navigator.clipboard?.writeText(p).then(() => {
      setCopied(p);
      setTimeout(() => setCopied(null), 1400);
    });
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-white">💬 Prompts to ask Claude when you're stuck</h1>
        <p className="text-slate-300">Click to copy, replace anything in <code className="text-amber-300">[brackets]</code>, and paste. The more concrete you are (error text, file contents, circuit code), the better the answer.</p>
      </header>
      <Panel title="Golden rules for good answers" icon="✨">
        <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <li>📋 Paste the <b>exact</b> error or file content, not a paraphrase.</li>
          <li>🎚️ Say your level: “I'm a beginner in quantum and React”.</li>
          <li>🔒 Ask for <b>one step at a time</b> if you feel overwhelmed.</li>
          <li>🧪 End with “…and give me something to try in the Lab to check I got it”.</li>
        </ul>
      </Panel>
      {GROUPS.map((g) => (
        <Panel key={g.title} title={g.title} icon={g.icon}>
          <div className="space-y-2">
            {g.prompts.map((p) => (
              <button key={p} onClick={() => copy(p)} className="group flex w-full items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-left text-sm text-slate-200 transition hover:border-cyan-400/60 hover:bg-slate-800">
                <span className={`mt-0.5 text-xs font-bold ${g.tone}`}>{copied === p ? "✓ copied" : "⧉ copy"}</span>
                <span className="flex-1">{p}</span>
              </button>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
