# Qiskit Fall Fest 2026 — Original Error-Mitigation Projects

Four self-contained, out-of-the-box error-mitigation approaches for the
**Error Mitigation** hackathon track (Qiskit Fall Fest 2026, WIQD × IBM
Quantum, Amsterdam, 20–21 November 2026).

None of these copy existing repos — each is built from first principles so you
can choose the approach that best matches the "standard algorithm" you receive
at the event.

## Projects

| # | Project | Folder | Core Idea | Best When the Algorithm... |
|---|---------|--------|-----------|---------------------------|
| 1 | Symmetry-Resolved Mitigation | `project1_symmetry-mitigation/` | Parity ancilla computes a conserved symmetry inside one circuit run; post-select on intact syndrome. No multi-copy extrapolation. | Has parity / particle-number / Hamming-weight symmetry |
| 2 | Non-Clifford-Targeted ZNE | `project2_nonclifford-zne/` | Fold T gates (T†T = I) to amplify noise only on non-Clifford layers; Clifford gates untouched. Extrapolate to zero noise. | Uses T / Toffoli gates |
| 3 | Hybrid QEM + Error Detection | `project3_hybrid-qem/` | 3-qubit repetition code + syndrome ancillas flag bit-flips; discard flagged shots, then readout-mitigate survivors. | Can spare qubits for ancillas |
| 4 | Adaptive Conservation Post-Selection | `project4_adaptive-conservation/` | Soft-reweight every shot by P(true weight = target \| observed) using a measured confusion matrix. All shots used, no exponential throwaway. | Output obeys fixed Hamming weight / particle number |

## Quick Start (per project)

```bash
cd project1_symmetry-mitigation        # or project2/3/4
pip install -r requirements.txt
python run.py
```

Each project is fully self-contained — no shared dependencies between folders.

## Requirements

- Python 3.11+
- `qiskit>=1.0`
- `qiskit-aer>=0.14`
- `numpy>=1.24`

No IBM Quantum account needed — everything runs on local `AerSimulator`
noise models.

## How to Choose at the Hackathon

1. Wait for the **standard algorithm** from the organizers.
2. Inspect its gate set and structure:
   - T/Toffoli gates → **Project 2**
   - Parity / particle-number symmetry → **Project 1**
   - Can spare qubits for ancillas → **Project 3**
   - Fixed Hamming weight output → **Project 4**
3. Swap the benchmark circuit in `circuits.py` for the real algorithm.
4. Tune the noise model in `noise_models.py` to the QPU calibration you
   receive on-site.

## Source

Common utilities (`circuits.py`, `metrics.py`, `noise_models.py`) are copied
into each project folder so every project is independently runnable.
