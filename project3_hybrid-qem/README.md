# Project 3 — Hybrid QEM + Light Error Detection

**Approach:** Combine a tiny error-detecting code (3-qubit repetition code)
with classical post-processing. Two syndrome ancillas compute parity checks;
shots flagged with a non-zero syndrome are discarded; surviving data qubits
get readout mitigation. This is the QEM/QEC continuum — light hardware
detection + classical post-processing.

**Inspired by:** IBM Research (Sep 2026) — QEM and QEC as a continuum.

**Best for:** Algorithms where you can spare qubits for ancillas.

**Files:**
- `mitigation.py` — core mitigation logic
- `circuits.py` — repetition code benchmark circuit
- `noise_models.py` — tunable AerSimulator noise model
- `metrics.py` — expectation values, readout confusion matrix, correction
- `run.py` — entry point (`python run.py`)
- `requirements.txt` — dependencies

**Run:**
```bash
pip install -r requirements.txt
python run.py
```

**What it measures:** <Z_0> on a logical qubit encoded in a 3-qubit repetition
code (ideal = +1). Compares unmitigated, readout-only, and hybrid
detect+postselect results, plus shot retention rate.
