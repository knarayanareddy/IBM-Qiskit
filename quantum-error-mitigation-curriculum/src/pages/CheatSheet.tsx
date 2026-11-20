import type { ReactNode } from "react";

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-xl border border-slate-700 bg-slate-900/70 p-3 print-sheet">
      <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">{title}</h3>
      <div className="space-y-1 text-[12.5px] leading-snug text-slate-300">{children}</div>
    </section>
  );
}
const K = ({ children }: { children: ReactNode }) => <code className="rounded bg-slate-800 px-1 font-mono text-[11.5px] text-emerald-200">{children}</code>;

export default function CheatSheet() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-white">📄 One-Page Cheat Sheet</h1>
          <p className="text-slate-300">Print it (Ctrl/Cmd+P → “Save as PDF” or paper). The print view switches to black-on-white.</p>
        </div>
        <button onClick={() => window.print()} className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-2.5 font-bold text-slate-900 hover:brightness-110">🖨️ Print / Save PDF</button>
      </div>

      <div className="print-sheet rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700 pb-2">
          <div className="text-lg font-black text-white">Qiskit Fall Fest 2026 · Error Mitigation · Cheat Sheet</div>
          <div className="text-xs text-slate-400">Amsterdam · 20–21 Nov · repo: github.com/knarayanareddy/IBM-Qiskit</div>
        </div>
        <div className="columns-1 gap-3 space-y-3 md:columns-2 lg:columns-3">
          <Box title="30-second glossary">
            <p><b>Qubit</b> — coin spinning in the air. <b>Measure</b> — catch it: 0 or 1.</p>
            <p><b>Shot</b> — one run + measure (default 4096). <b>Counts</b> — the tally.</p>
            <p><b>H</b> spin · <b>X</b> flip · <b>CX</b> “if A=1 flip B” · <b>T</b> hidden twist (non-Clifford).</p>
            <p>Bit order: <K>q2 q1 q0</K> — q0 is the RIGHT-most char.</p>
          </Box>
          <Box title="Colour code">
            <p><span className="text-emerald-400">■ green</span> ideal · <span className="text-rose-400">■ red</span> noisy · <span className="text-violet-400">■ purple</span> mitigated (v1) · <span className="text-pink-400">■ pink</span> soft (v2) · <span className="text-amber-400">■ amber</span> warning / readout-only.</p>
          </Box>
          <Box title="Three noises">
            <p>🤏 <b>Gate error</b> — shaky hand; 2-qubit gates worst; (1−p)^gates.</p>
            <p>🖍️ <b>Readout error</b> — smudged scoreboard; calibrate &amp; invert.</p>
            <p>🍦 <b>Decoherence</b> — 1 drifts to 0 over time; depth hurts.</p>
          </Box>
          <Box title="Three strategies">
            <p>📢 Nothing = baseline (Raw row).</p>
            <p>🎧 <b>Mitigation</b> = estimate the clean answer after noisy runs; costs shots. <b>Not correction.</b></p>
            <p>🏛️ Correction = many qubits per logical qubit; not today.</p>
          </Box>
          <Box title="Conservation laws">
            <p><b>Parity</b>: # of 1s even/odd. Catches every single flip, not all double flips.</p>
            <p><b>Hamming weight</b>: exactly k ones.</p>
            <p>⚠ Check with the IDEAL run first. GHZ-3 contains 111 (odd) → “even parity” discards real signal.</p>
          </Box>
          <Box title="v1 vs v2">
            <p><b>v1 hard post-selection</b>: bin illegal shots → retention ↓, error bars ↑.</p>
            <p><b>v2 soft reweighting</b>: re-assign illegal shots to likely legal outcomes via calibrated readout rates; 100% retention; needs calibration jobs.</p>
            <p>No law → both collapse to readout-only.</p>
          </Box>
          <Box title="ZNE in 3 steps">
            <p>1 Amplify noise (fold U→U U† U), factors e.g. 1,3,5.</p>
            <p>2 Measure at each level. 3 Extrapolate to 0×.</p>
            <p>Wrong curve → bias. Few shots / far extrapolation → variance. Report error bars.</p>
          </Box>
          <Box title="Scorecard formulas">
            <p><K>gap closed = (|raw−ideal| − |method−ideal|) / |raw−ideal|</K></p>
            <p><K>TVD = ½ Σ |p − q|</K> (0 same, 1 different)</p>
            <p><K>retention = kept / total shots</K> · effective shots = shots × retention.</p>
            <p>Report gap-closed AND TVD AND retention AND cost.</p>
          </Box>
          <Box title="Runtime">
            <p><b>SamplerV2</b> → bitstring counts (needed for post-selection/reweighting).</p>
            <p><b>EstimatorV2</b> → ⟨observable⟩ ± error. <K>resilience_level</K> 0 none · 1 readout (TREX, default) · 2 + gate twirling + ZNE.</p>
            <p>Transpile: <K>optimization_level=3</K>; note 2q-gate count &amp; depth. Verify option names vs installed version.</p>
          </Box>
          <Box title="Terminal">
            <p><K>git clone https://github.com/knarayanareddy/IBM-Qiskit.git</K></p>
            <p><K>cd IBM-Qiskit && npm install</K></p>
            <p><K>npm run dev</K> → localhost:5173 · <K>npm run build</K> → dist/index.html (single file)</p>
            <p>Ideas: <K>cd ideas-repo && npm install && npm run dev</K></p>
          </Box>
          <Box title="Hash URLs (main app)">
            <p><K>#/overview</K> <K>#/lab</K> <K>#/compare</K> <K>#/ideas</K> <K>#/overhead</K> <K>#/vd</K> <K>#/cdr</K> <K>#/playbook</K></p>
            <p>ideas-repo has no hash URLs — use its nav buttons.</p>
          </Box>
          <Box title="Lab quick-flow">
            <p>Paste Qiskit/QASM → see <b>parsed ✓</b> → pick law → knobs → v1/v2 → <K>#/compare</K> → scorecard → CSV/JSON.</p>
            <p>Max 12 qubits, 10 measured. Resolve every parser warning.</p>
          </Box>
          <Box title="Decision helper → project">
            <p>T gates, medium depth, QPU ok → <b>Non-Clifford ZNE</b>.</p>
            <p>Symmetry + ancilla → <b>Symmetry-Resolved</b>.</p>
            <p>Fixed weight, readout-dominated, want all shots → <b>Adaptive Conservation</b>.</p>
            <p>No law → readout/ZNE + honest negative control. Pick ONE primary + ONE fallback.</p>
          </Box>
          <Box title="Day-of order">
            <p>1 Paste circuit, fix warnings · 2 Ideal run: law? · 3 Decision helper · 4 Transpile · 5 Submit <b>raw + defaults + calibration</b> immediately · 6 Tune sim while queued · 7 Scorecard raw → Runtime defaults → ours → ideal · 8 Export CSV/JSON · 9 Honest failure case.</p>
          </Box>
          <Box title="Say this to judges">
            <p>“Mitigation doesn't stop errors; it estimates what the answer would have been without them, at the cost of extra shots. We compare against raw and Runtime defaults on the same circuit and shots, report gap-closed, TVD and retention, and here is where it fails.”</p>
          </Box>
          <Box title="If stuck">
            <p>Blank page → F12 console. Parse error → read the red line. No law → fallback project. Ask Claude with the prompt templates (Ask Claude page).</p>
          </Box>
        </div>
      </div>
    </div>
  );
}
