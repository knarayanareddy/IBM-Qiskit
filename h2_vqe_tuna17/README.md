# H2 VQE Error Mitigation — Tuna-17 (QInspire)

H2 Variational Quantum Eigensolver with 9 error mitigation techniques,
targeting QuTech's Tuna-17 processor via Quantum Inspire.

## Benchmark
- Hartree-Fock: ≈ −1.117 Ha
- True optimal: ≈ −1.1373 Ha

## Techniques compared
1. Raw (unmitigated)
2. Readout mitigation (TREX-style confusion matrix inversion)
3. Adaptive Conservation (soft parity reweighting, 100% retention)
4. Symmetry Verification (odd-parity post-selection, |01⟩/|10⟩)
5. ZNE (gate folding + Richardson extrapolation, CNOT counts [1,3,5])
6. PEA (model-based ZNE, noiseless statevector only)
7. PEC (ancilla + syndrome — invalid on H2 X-X ansatz, returns raw)
8. Randomized Compiling (Pauli twirling)
9. Clifford Data Regression (ideal = (raw − b) / a)

Plus transpilation sweep O0–O3.

## Quick start

```bash
# Install dependencies
pip install -r requirements.txt

# Run on local AerSimulator (Tuna-17 noise model)
cd fallfest-combined-infra
python experiments/h2_vqe_challenge.py tuna17 4096

# Small hardware connectivity test (2 circuits, 1024 shots)
python experiments/h2_vqe_tuna17_hardware_test.py --armed --shots 1024

# Full hardware sweep (consumes QPU quota)
python experiments/h2_vqe_challenge.py --hardware --shots 4096
```

## Authentication
QInspire does not show an API token option in the account UI. Use email/password
via `BasicAuthentication` when prompted by the hardware test script.

## Constraints
- Max 5 circuits per batch job (Tuna-17)
- SHOTS=4096, MAXITER=20
- VQE algorithm and Hamiltonian unchanged
- Local AerSimulator; hardware mode optional via `--hardware`

## Files
- `fallfest-combined-infra/experiments/h2_vqe_challenge.py` — main pipeline
- `fallfest-combined-infra/experiments/h2_vqe_tuna17_hardware_test.py` — 2-circuit hardware test
- `fallfest-combined-infra/core/` — technique implementations
- `h2_vqe_error_mitigation_dashboard.html` — interactive dashboard
- `AGENTS.md` — agent setup context