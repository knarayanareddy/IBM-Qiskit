"""
Run the Scorecard (Idea 7): Raw vs Runtime Defaults vs Adaptive Conservation.

Usage:
    python experiments/run_scorecard.py [--stand-in fixed_weight_vqe] [--shots 4096]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Callable

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from qiskit import QuantumCircuit

from core.adaptive_conservation import NoiseConfig, run_adaptive_conservation
from core.scorecard import (
    raw_baseline,
    runtime_defaults_resilience,
    adaptive_row,
    build_scorecard,
    print_scorecard,
    scorecard_to_json,
    scorecard_to_csv,
)
from core.stand_ins import get_stand_in, STAND_INS


def parity_observable(counts: dict, n_qubits: int) -> float:
    total = sum(counts.values())
    even = sum(c for bs, c in counts.items() if bin(int(bs.replace(" ", "")[::-1], 2)).count("1") % 2 == 0)
    return (even - (total - even)) / total


def z0_observable(counts: dict, n_qubits: int) -> float:
    total = sum(counts.values())
    p0 = sum(c for bs, c in counts.items() if bs.replace(" ", "")[-1] == "0")
    return (p0 - (total - p0)) / total


def hamming_weight_observable(counts: dict, target: int, n_qubits: int) -> float:
    total = sum(counts.values())
    match = sum(
        c for bs, c in counts.items()
        if bin(int(bs.replace(" ", "")[::-1], 2)).count("1") == target
    )
    return match / total


def make_observable_fn(stand_in: dict, n_qubits: int) -> Callable[[dict], float]:
    obs = stand_in["observable"]
    target = stand_in["target_weight"]
    if obs == "parity":
        return lambda c: parity_observable(c, n_qubits)
    elif obs == "z0":
        return lambda c: z0_observable(c, n_qubits)
    elif obs == "hamming_weight":
        return lambda c: hamming_weight_observable(c, target, n_qubits)
    return lambda c: 0.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Scorecard comparison")
    parser.add_argument("--stand-in", choices=list(STAND_INS.keys()), default="fixed_weight_vqe")
    parser.add_argument("--shots", type=int, default=4096)
    parser.add_argument("--1q-error", type=float, default=0.01, dest="one_q_error")
    parser.add_argument("--2q-error", type=float, default=0.03, dest="two_q_error")
    parser.add_argument("--ro-error", type=float, default=0.05, dest="ro_error")
    args = parser.parse_args()

    stand_in = get_stand_in(args.stand_in)
    circuit = stand_in["factory"](n_qubits=stand_in["n_qubits"])
    target_weight = stand_in["target_weight"] or 2
    n_qubits = stand_in["n_qubits"]
    ideal_val = stand_in["ideal"]

    cfg = NoiseConfig(
        single_qubit_error=args.one_q_error,
        two_qubit_error=args.two_q_error,
        readout_error=args.ro_error,
        shots=args.shots,
    )

    observable_fn = make_observable_fn(stand_in, n_qubits)

    print(f"\n{'='*70}")
    print(f"Scorecard — {stand_in['description']}")
    print(f"{'='*70}")
    print(f"Noise: 1q={cfg.single_qubit_error}, 2q={cfg.two_qubit_error}, ro={cfg.readout_error}")
    print(f"Shots: {cfg.shots}")
    print(f"Ideal value: {ideal_val}")
    print(f"{'='*70}\n")

    rows = build_scorecard(circuit, observable_fn, ideal_val, target_weight, cfg, n_qubits)
    print_scorecard(rows)

    # Save
    os.makedirs("data", exist_ok=True)
    out_path = f"data/scorecard_{args.stand_in}.json"
    scorecard_to_json(rows, out_path)
    csv_path = f"data/scorecard_{args.stand_in}.csv"
    scorecard_to_csv(rows, csv_path)
    print(f"Results saved to {out_path} and {csv_path}")


if __name__ == "__main__":
    main()
