# Project 4 — Adaptive Conservation Post-Selection

**Approach:** Instead of hard post-selection (which throws away every shot
violating a conservation law and dies exponentially on deep circuits), this
soft-reweights every shot using a measured readout confusion matrix:
P(true weight = target | observed bitstring). Shots that look like
violations but could be readout errors get partial credit; clean shots get
full credit. Uses all shots, no exponential throwaway.

**Inspired by:** Marchenkova (Oct 2026) — error mitigation vs post-selection
distinction.

**Best for:** Algorithms whose output obeys a fixed Hamming weight / particle
number conservation law.

**Files:**
- `mitigation.py` — core mitigation logic
- `circuits.py` — |1100> weight-conserving benchmark circuit
- `noise_models.py` — tunable AerSimulator noise model
- `metrics.py` — readout confusion matrix
- `run.py` — entry point (`python run.py`)
- `requirements.txt` — dependencies

**Run:**
```bash
pip install -r requirements.txt
python run.py
```

**What it measures:** P(Hamming weight == 2) on a 4-qubit circuit preparing
|1100> (ideal = 1.0). Compares unmitigated, hard post-selection, adaptive
soft reweighting, and readout-mitigated results.
