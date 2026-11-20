"""
Run Project 4 (Adaptive Conservation) on stand-in circuits.

Usage:
    python experiments/run_project4.py [--stand-in ghz|trotter|fixed_weight_vqe] [--shots 4096]
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from qiskit import QuantumCircuit

from core.adaptive_conservation import NoiseConfig, run_adaptive_conservation
from core.stand_ins import get_stand_in, STAND_INS


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Project 4 on stand-in circuits")
    parser.add_argument("--stand-in", choices=list(STAND_INS.keys()), default="fixed_weight_vqe")
    parser.add_argument("--shots", type=int, default=4096)
    parser.add_argument("--1q-error", type=float, default=0.01, dest="one_q_error")
    parser.add_argument("--2q-error", type=float, default=0.03, dest="two_q_error")
    parser.add_argument("--ro-error", type=float, default=0.05, dest="ro_error")
    args = parser.parse_args()

    stand_in = get_stand_in(args.stand_in)
    circuit = stand_in["factory"](n_qubits=stand_in["n_qubits"])
    conservation_type = stand_in["conservation_type"]
    target_weight = stand_in["target_weight"]

    cfg = NoiseConfig(
        single_qubit_error=args.one_q_error,
        two_qubit_error=args.two_q_error,
        readout_error=args.ro_error,
        shots=args.shots,
    )

    n_qubits = stand_in["n_qubits"]
    ideal_val = stand_in["ideal"]

    print(f"\n{'='*70}")
    print(f"Project 4 — Adaptive Conservation on {stand_in['description']}")
    print(f"{'='*70}")
    print(f"Circuit: {args.stand_in} ({n_qubits} qubits)")
    print(f"Conservation: {conservation_type}" + (f" (target_weight={target_weight})" if target_weight else ""))
    print(f"Noise: 1q={cfg.single_qubit_error}, 2q={cfg.two_qubit_error}, ro={cfg.readout_error}")
    print(f"Shots: {cfg.shots}")
    print(f"{'='*70}\n")

    result = run_adaptive_conservation(
        circuit,
        cfg,
        conservation_type=conservation_type,
        target_weight=target_weight,
        n_qubits=n_qubits,
    )

    print(f"Raw correct fraction          : {result.raw_correct_frac:.4f}")
    print(f"Hard PS correct fraction      : {result.hard_ps_correct_frac:.4f}")
    print(f"Hard PS retention             : {result.hard_ps_retention:.2%}")
    print(f"Adaptive estimate             : {result.adaptive_estimate:.4f}")
    print(f"Readout-mitigated correct frac: {result.readout_mitigated_correct_frac:.4f}")
    print(f"Ideal correct fraction        : {result.ideal_correct_frac:.4f}")
    print(f"Shots used                    : {result.shots_used_pct:.1f}%")
    print(f"\nIdeal value: {ideal_val}")
    print(f"{'='*70}\n")

    # Save results
    output = {
        "stand_in": args.stand_in,
        "conservation_type": conservation_type,
        "target_weight": target_weight,
        "noise": {
            "single_qubit_error": cfg.single_qubit_error,
            "two_qubit_error": cfg.two_qubit_error,
            "readout_error": cfg.readout_error,
        },
        "shots": cfg.shots,
        "results": {
            "raw_correct_frac": result.raw_correct_frac,
            "hard_ps_correct_frac": result.hard_ps_correct_frac,
            "hard_ps_retention": result.hard_ps_retention,
            "adaptive_estimate": result.adaptive_estimate,
            "readout_mitigated_correct_frac": result.readout_mitigated_correct_frac,
            "ideal_correct_frac": result.ideal_correct_frac,
            "shots_used_pct": result.shots_used_pct,
        },
        "ideal_value": ideal_val,
    }

    os.makedirs("data", exist_ok=True)
    out_path = f"data/project4_{args.stand_in}.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Results saved to {out_path}")


if __name__ == "__main__":
    main()
