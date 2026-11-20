# Copy-Paste Prompt for Another AI (e.g. Sonnet)

Give this prompt verbatim to the other AI, along with the SPECIFICATION.md file.

---

## Prompt

I am building an interactive web prototype for a Qiskit Fall Fest 2026 error-mitigation hackathon project. Please build it as a **React + Vite + Tailwind CSS** single-page application.

### Context
The project uses **Adaptive Conservation Post-Selection** (Project 4) as its core error-mitigation method, plus a **Scorecard** (raw vs Runtime defaults vs our method) and a **Budget Meter** (cost comparison across methods).

### What to Build

Create a multi-page app with these routes:

1. **Overview** — Hero section, 4 project cards, and a "decision helper" that scores each project based on the algorithm's characteristics (T gates, symmetry, fixed Hamming weight, spare ancillas, circuit depth, QPU time).

2. **Prototype Lab** — Interactive, step-by-step walkthrough of Project 4 with:
   - Tunable noise knobs (1-qubit gate error, 2-qubit gate error, readout error, shots)
   - SVG quantum circuit visualiser
   - Phase stepper: Problem → Circuit → Noisy Run → Mitigate → Results → Hackathon Plan
   - Live in-browser statevector simulation (no Qiskit dependency needed — pure TypeScript math)
   - Before/after results: raw vs readout-only vs adaptive conservation vs ideal
   - v1/v2 toggle: hard post-selection vs adaptive soft weighting
   - Shot retention meter

3. **Before → After (Compare)** — Side-by-side comparison of all mitigation methods at the same noise setting, with a "judge's scorecard" table showing raw vs mitigated vs ideal and "gap closed" percentage.

4. **New Ideas** — 7 additional project concepts with effort/novelty/risk meters, attribution to sources, time-boxed plans, and judge-facing deliverables.

5. **Playbook** — Hackathon checklist (before event, first 2 hours on site, making results convincing), Qiskit Runtime baseline code snippet, pitch skeleton, and resource map with confidence ratings.

### Technical Requirements
- React 19, TypeScript, Vite, Tailwind CSS 4
- No external quantum computing libraries — implement a lightweight statevector simulator in TypeScript
- All state local (no backend)
- Dark theme (slate-900 background, cyan/violet/emerald accents)
- Responsive design
- Must build successfully with `npm run build`

### File Structure Expected
```
src/
  App.tsx          # 5-page router
  pages/           # Overview, Lab, Compare, Ideas, Playbook
  components/      # UI primitives (Badge, Panel, Meter, PhaseCard, QuantumCircuit)
  lib/             # simulator.ts, meta.ts
  utils/           # cn.ts
```

### Key Data
Use these project definitions (adapted from the Python reference implementation):

**Project 4 — Adaptive Conservation Post-Selection**
- Icon: 📊, Color: #f472b6
- Tagline: "Soft-reweight every shot by conservation-law likelihood — no exponential throwaway."
- Inspiration: Error mitigation vs post-selection distinction (@amarchenkova)
- Best when: output has fixed Hamming weight / particle number; deep circuit; want to use every shot
- v1: Hard Hamming-weight post-selection
- v2: Soft Bayesian reweighting
- Judge takeaway: Know the limits of post-selection; shows credibility

**Stand-in circuits for practise:**
- GHZ state (parity conservation)
- Trotter step with T gates (non-Clifford)
- Fixed-weight VQE ansatz (Hamming weight = 2)

### Deliverable
Return the complete, buildable source code for all files listed above. The app must run with `npm install && npm run dev` and build with `npm run build`.

---
