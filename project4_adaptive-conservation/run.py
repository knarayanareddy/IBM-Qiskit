#!/usr/bin/env python3
"""Project 4 — Adaptive Conservation Post-Selection (Entry Point)

Runs adaptive conservation-law post-selection on a 4-qubit circuit preparing
|1100> (fixed Hamming weight = 2). Uses soft reweighting via a measured
readout confusion matrix instead of hard post-selection.

Requires: qiskit, qiskit-aer, numpy
"""

from mitigation import evaluate
from noise_models import build_noise_model, noisy_simulator


def main():
    shots = 4096
    nm = build_noise_model(
        single_qubit_error=0.01,
        two_qubit_error=0.03,
        readout_error=0.08,
    )
    sim = noisy_simulator(nm)
    results = evaluate(sim, shots=shots)

    print("=" * 60)
    print("Project 4 — Adaptive Conservation Post-Selection")
    print("P(Hamming weight == 2), ideal = 1.0")
    print("=" * 60)
    print(f"  Unmitigated        : {results['unmitigated_correct_frac']:.4f}")
    print(f"  Hard post-select   : {results['hard_ps_correct_frac']:.4f}")
    print(f"  Hard PS retention  : {results['hard_ps_retention']:.2%}")
    print(f"  Adaptive estimate  : {results['adaptive_estimate']:.4f}")
    print(f"  Readout-mitigated  : {results['readout_mitigated_correct_frac']:.4f}")
    print(f"  Ideal              : {results['ideal_correct_frac']:.4f}")
    print("=" * 60)


if __name__ == "__main__":
    main()
