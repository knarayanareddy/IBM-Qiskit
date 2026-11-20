"""
Run the Budget Meter (Idea 2): QPU cost comparison across mitigation methods.

Usage:
    python experiments/run_budget_meter.py [--shots 4096]
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.budget_meter import build_budget_meter, print_budget_meter, export_budget_meter


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Budget Meter")
    parser.add_argument("--shots", type=int, default=4096)
    args = parser.parse_args()

    methods = build_budget_meter(base_shots=args.shots)

    print(f"\n{'='*70}")
    print(f"Budget Meter — QPU Cost per Mitigation Method (base shots: {args.shots:,})")
    print(f"{'='*70}")
    print_budget_meter(methods)

    os.makedirs("data", exist_ok=True)
    out_path = "data/budget_meter.json"
    export_budget_meter(methods, out_path)
    print(f"Results saved to {out_path}\n")


if __name__ == "__main__":
    main()
