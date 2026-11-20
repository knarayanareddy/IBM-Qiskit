# Specification: Combined Error-Mitigation Stack

**Target:** Qiskit Fall Fest 2026 — Error Mitigation track
**Method:** Project 4 (Adaptive Conservation Post-Selection)
**Supporting:** Scorecard (Idea 7) + Budget Meter (Idea 2)
**Practise:** GHZ, Trotter step, fixed-excitation VQE stand-ins

---

## 1. Core Method — Adaptive Conservation (Project 4)

### Problem
Many quantum algorithms produce outputs that must obey a conservation law (e.g. fixed Hamming weight / particle number). Noise breaks this law. Hard post-selection throws away every violating shot — but on deep circuits this dies exponentially.

### Approach
Instead of hard discarding, **soft-reweight every shot** using a measured readout confusion matrix:

```
P(true weight = target | observed bitstring)
```

Every shot gets a partial credit weight in [0, 1]. No shot is thrown away. No exponential wall.

### Inputs
- A quantum circuit (the organisers' "standard algorithm")
- A known conservation law for its output (e.g. target Hamming weight = k)
- Readout calibration data (prepare |0...0⟩ ... |1...1⟩, measure, build confusion matrix)
- QPU noise model (T1, T2, gate errors, readout errors)

### Outputs
- P(conservation law satisfied) — soft estimate
- Shot retention = 100% (all shots used)
- Comparison vs hard post-selection and readout-only

### Hackathon Job Count
- 1 job: raw baseline
- 1 calibration circuit: readout confusion matrix
- Total: ~2 QPU jobs

---

## 2. Scorecard (Idea 7)

### Purpose
Prove your method beats both doing nothing and IBM Qiskit Runtime's default resilience.

### Columns
| Method | <Observable> | Error Bars | QPU Jobs | QPU Seconds | Notes |
|--------|-------------|------------|----------|-------------|-------|
| Raw (unmitigated) | ... | ... | 1 | ... | Baseline |
| Runtime defaults | ... | ... | 1 | ... | readout + twirling + DD + ZNE |
| Adaptive Conservation (ours) | ... | ... | 2 | ... | Our method |

### How to Build
- Run raw on the target QPU (1 job)
- Run with Qiskit Runtime `resilience_level=1` (1 job)
- Run adaptive conservation (2 jobs: raw + calibration)
- Normalise all results by shots and retention
- Plot: raw → Runtime → Ours → Ideal

---

## 3. Budget Meter (Idea 2)

### Purpose
Show cost transparency so judges can see your method is affordable.

### Metrics per method
| Method | Extra Qubits | Extra Jobs | Extra Shots | QPU Seconds | Retention |
|--------|-------------|------------|-------------|-------------|-----------|
| Raw | 0 | 1 | N | ... | 100% |
| Readout-only | 0 | 2 | N | ... | 100% |
| ZNE (λ=1,2,3) | 0 | 3 | 3N | ... | 100% |
| Repetition-code QEC | +2 ancilla | 2 | N | ... | ~85% |
| Adaptive Conservation | 0 | 2 | N | ... | 100% |

### Visualisation
Bar chart: QPU seconds per method. Line chart: retention vs noise level.

---

## 4. Practise Stand-Ins

Before the event, validate on three circuits:

| Stand-In | Gates | Conservation Law | Observable |
|----------|-------|------------------|------------|
| GHZ state | H, CNOT ×(n-1) | Parity (even) | <Z⊗Z⊗...⊗Z> |
| Trotter step | H, T, CNOT, RZ | None (generic) | <Z₀> |
| Fixed-weight VQE | X, RY, CNOT, T | Hamming weight = k | P(weight=k) |

---

## 5. What to Build Next (Prototype Layer)

An interactive web prototype (React + Vite + Tailwind) with:

1. **Noise knobs** — sliders for 1q error, 2q error, readout error, shots
2. **Circuit visualiser** — SVG drawing of the stand-in circuit
3. **Phase stepper** — walk through: Problem → Circuit → Noisy Run → Mitigate → Results
4. **Before/after cards** — raw vs readout-only vs adaptive conservation vs ideal
5. **Scorecard table** — auto-generated from simulation results
6. **Budget meter** — bar chart of QPU seconds per method
7. **v1/v2 toggle** — hard post-selection vs adaptive soft weighting

Files to create:
- `src/lib/simulator.ts` — in-browser statevector simulator (no Qiskit dependency)
- `src/lib/meta.ts` — project definitions, phases, ideas
- `src/pages/Lab.tsx` — interactive lab
- `src/pages/Compare.tsx` — before/after comparison
- `src/pages/Ideas.tsx` — new ideas
- `src/pages/Playbook.tsx` — hackathon playbook
- `src/components/ui.tsx` — reusable UI components

See `sonnet_prompt.md` for the exact prompt to give to another AI to build this.
