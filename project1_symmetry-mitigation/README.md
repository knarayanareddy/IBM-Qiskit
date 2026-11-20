# Project 1 — Symmetry-Resolved Mitigation

**Approach:** Add a parity ancilla that computes a conserved symmetry
(e.g. even parity) *inside* a single circuit run, then post-select on shots
where the syndrome is intact. Avoids the multi-copy overhead of virtual
purification or full ZNE.

**Inspired by:** Iwaki et al. (Nov 2026) — virtual purification within a
single quantum state.

**Best for:** Algorithms with parity / particle-number / Hamming-weight
symmetry.

**Files:**
- `mitigation.py` — core mitigation logic
- `circuits.py` — Bell state benchmark circuit
- `noise_models.py` — tunable AerSimulator noise model
- `metrics.py` — expectation values, readout confusion matrix, correction
- `run.py` — entry point (`python run.py`)
- `requirements.txt` — dependencies

**Run:**
```bash
pip install -r requirements.txt
python run.py
```

**What it measures:** <Z⊗Z> on a 2-qubit Bell state (ideal = +1).
Compares unmitigated, readout-only, and symmetry post-selected results,
plus shot retention rate.
