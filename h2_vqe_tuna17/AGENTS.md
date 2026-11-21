# H2 VQE Error Mitigation — Tuna-17 (QInspire) — Agent Context

## What this project does
Runs H2 VQE with 9 error mitigation techniques on Tuna-17 hardware (QInspire) and local AerSimulator.
Benchmark targets: HF ≈ -1.117 Ha, true optimal ≈ -1.1373 Ha.

## How to run

**Local simulator (no account needed):**
```bash
cd /home/user/fallfest-combined-infra
pip install -r requirements.txt
python experiments/h2_vqe_challenge.py tuna17 4096
```

**Hardware test (2 circuits, minimal quota):**
```bash
python experiments/h2_vqe_tuna17_hardware_test.py --armed --shots 1024
```
You'll be prompted for QInspire email + password. No API token option visible in QI UI — use BasicAuthentication.

**Full hardware sweep:**
```bash
python experiments/h2_vqe_challenge.py --hardware --shots 4096
```
⚠️ Consumes QPU quota. Run the small test first.

## Constraints (do not change)
- VQE algorithm unchanged: X-X → ry(θ₀), ry(θ₁), cx(0,1), ry(θ₂), ry(θ₃) — 4 params
- Hamiltonian unchanged: II=-1.0524, IZ=+0.3979, ZI=-0.3979, ZZ=-0.0113, XX=+0.1809, NUCLEAR_REPULSION=+0.71997
- Max 5 circuits per batch job (Tuna-17 limit) — enforced via MAX_CIRCUITS_PER_JOB=5
- SHOTS=4096, MAXITER=20
- ZNE folding CX-CX pairs = intermediate mitigation gates (allowed)
- PEC post-selection invalid on H2 X-X ansatz (~96% discard) — returns raw
- PEA excluded under noise (noiseless statevector) — runs only on --noise none

## Key files

| File | Purpose |
|------|---------|
| `fallfest-combined-infra/experiments/h2_vqe_challenge.py` | Main pipeline — all 9 techniques, hardware mode, mitigate-during-opt, project_simplex, multi-final-evals, Richardson ZNE |
| `fallfest-combined-infra/experiments/h2_vqe_tuna17_hardware_test.py` | Minimal 2-circuit hardware connectivity test (option 4) |
| `fallfest-combined-infra/core/adaptive_conservation.py` | Adaptive Conservation technique |
| `fallfest-combined-infra/core/budget_meter.py` | Circuit/shot budget tracking |
| `fallfest-combined-infra/core/scorecard.py` | Results scoring |
| `fallfest-combined-infra/core/stand_ins.py` | Stand-in implementations |
| `fallfest-combined-infra/requirements.txt` | Python dependencies |
| `h2_vqe_error_mitigation_dashboard.html` | Interactive results dashboard |
| `h2_vqe_tuna17_results.json/csv` | Tuna-17 simulator results (4096 shots) |
| `h2_vqe_no-noise_results.json/csv` | No-noise baseline |

## Known hardware issues (Tuna-17)
- Rx(θ) executes as Rx(−θ) — known bug (GitHub issue #395). Our ansatz uses Ry/Rz; transpile at optimization_level=1 minimizes Rx decomposition.
- Single-qubit angles quantized to nearest π/36 (5°).
- CNOT decomposed to CZ + single-qubit gates (CZ is native).
- 5 circuits per batch job max. 131072 max shots per circuit.
- Mid-circuit measurement allowed (not used by our ansatz).

## Files NOT to include in repo
- `.cache/`, `__pycache__/`, `*.zip`, `*.jpg`, `*.png` — generated/cache/binary
- `google_drive/` — teammate's extracted files (reference only)
- `error-mitigation-projects/` — separate project, not part of this pipeline
- `fallfest-combined-infra.zip`, `fallfest-prototype-complete.zip`, `error-mitigation-projects.zip` — pre-built zips
- `.arena/` — Arena sandbox metadata