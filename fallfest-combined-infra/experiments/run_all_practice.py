"""
Run all practice experiments: Project 4 on all stand-ins, Scorecard, and Budget Meter.

Usage:
    python experiments/run_all_practice.py
"""

from __future__ import annotations

import subprocess
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SCRIPTS = [
    ("experiments/run_project4.py", ["--stand-in", "ghz"]),
    ("experiments/run_project4.py", ["--stand-in", "trotter"]),
    ("experiments/run_project4.py", ["--stand-in", "fixed_weight_vqe"]),
    ("experiments/run_scorecard.py", ["--stand-in", "fixed_weight_vqe"]),
    ("experiments/run_budget_meter.py", []),
]


def main() -> None:
    for script, args in SCRIPTS:
        print(f"\n{'#'*70}")
        print(f"# Running: python {script} {' '.join(args)}")
        print(f"{'#'*70}\n")
        result = subprocess.run(
            [sys.executable, script] + args,
            capture_output=True,
            text=True,
        )
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        if result.returncode != 0:
            print(f"ERROR: {script} failed with code {result.returncode}")
            sys.exit(result.returncode)

    print(f"\n{'#'*70}")
    print("# All practice experiments complete.")
    print(f"{'#'*70}\n")


if __name__ == "__main__":
    main()
