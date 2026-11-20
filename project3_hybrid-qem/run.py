#!/usr/bin/env python3
"""Project 3 — Hybrid QEM + Light Error Detection (Entry Point)

Runs hybrid quantum-error-mitigation + light error detection using a
3-qubit repetition code with syndrome ancillas. Post-selects on clean
syndrome, then applies readout mitigation.

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
    print("Project 3 — Hybrid QEM + Light Error Detection")
    print("<Z_0> on repetition-code logical qubit, ideal = +1")
    print("=" * 60)
    print(f"  Unmitigated   : {results['unmitigated']:+.4f}")
    print(f"  Readout only  : {results['readout_only']:+.4f}")
    print(f"  Hybrid        : {results['hybrid_detect_postselect']:+.4f}")
    print(f"  Shot retention: {results['hybrid_retention']:.2%}")
    print(f"  Ideal         : {results['ideal']:+.4f}")
    print("=" * 60)


if __name__ == "__main__":
    main()
