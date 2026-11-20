#!/usr/bin/env python3
"""Project 1 — Symmetry-Resolved Mitigation (Entry Point)

Runs the symmetry post-selection mitigation on a Bell state with a tunable
noise model. Prints unmitigated vs readout-only vs symmetry post-selected
<Z⊗Z> results vs the ideal value of +1.

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
    print("Project 1 — Symmetry-Resolved Mitigation")
    print("Bell state <Z⊗Z>, ideal = +1")
    print("=" * 60)
    print(f"  Unmitigated   : {results['unmitigated']:+.4f}")
    print(f"  Readout only  : {results['readout_only']:+.4f}")
    print(f"  Symmetry PS   : {results['symmetry_postselected']:+.4f}")
    print(f"  Shot retention: {results['symmetry_retention']:.2%}")
    print(f"  Ideal         : {results['ideal']:+.4f}")
    print("=" * 60)


if __name__ == "__main__":
    main()
