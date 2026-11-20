# Project 2 — Non-Clifford-Targeted ZNE

**Approach:** Amplify noise *only* on non-Clifford T-gate layers by folding
T gates (T†T = I, so the ideal unitary is unchanged but more T gates = more
depolarizing error opportunities on the non-Clifford layer). Clifford gates
are left untouched. Extrapolate to zero noise.

**Inspired by:** Layden et al. (2024) — error mitigation for non-Clifford
gates.

**Best for:** Algorithms that use T / Toffoli gates.

**Files:**
- `mitigation.py` — core mitigation logic (fold_t_gates, run_zne)
- `circuits.py` — Clifford + T benchmark circuit
- `noise_models.py` — tunable AerSimulator noise model
- `metrics.py` — expectation values, readout correction
- `run.py` — entry point (`python run.py`)
- `requirements.txt` — dependencies

**Run:**
```bash
pip install -r requirements.txt
python run.py
```

**What it measures:** <Z_0> on a circuit with H, T, and CX layers (ideal ≈ +0.5).
Compares unmitigated (λ=1) vs NC-ZNE (λ→0 linear extrapolation) vs ideal.
