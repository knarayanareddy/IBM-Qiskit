#!/usr/bin/env python3
"""Project 2 — Non-Clifford-Targeted ZNE (Entry Point)

Runs non-Clifford-targeted zero-noise extrapolation on a circuit with T gates.
Compares unmitigated vs NC-ZNE vs ideal <Z_0>.

Requires: qiskit, qiskit-aer, numpy
"""

from mitigation import evaluate
from noise_models import build_noise_model, noisy_simulator


def main():
    shots = 4096
    nm = build_noise_model(
        single_qubit_error=0.01,
        two_qubit_error=0.03,
        readout_error=0.05,
    )
    sim = noisy_simulator(nm)
    results = evaluate(sim, shots=shots)

    print("=" * 60)
    print("Project 2 — Non-Clifford-Targeted ZNE")
    print("<Z_0>, ideal ≈ +0.5")
    print("=" * 60)
    print(f"  Unmitigated (λ=1): {results['unmitigated_lambda1']:+.4f}")
    print(f"  NC-ZNE (λ→0)     : {results['nonclifford_zne']:+.4f}")
    print(f"  Ideal            : {results['ideal']:+.4f}")
    print(f"  Values by λ      : {results['lambda_values']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
