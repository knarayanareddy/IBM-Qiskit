#!/usr/bin/env python3
"""
Minimal 2-circuit hardware test for H2 VQE on QInspire Tuna-17.

Purpose: Verify auth + connectivity + basic job submission before
committing quota to the full 9-technique sweep.

Submits exactly 2 circuits to Tuna-17:
  1. Raw H2 ansatz at theta = [0, 0, 0, 0]  (|10> initial state via X gates)
  2. Raw H2 ansatz at theta = [pi/4, pi/4, 0, 0]

Each circuit: 2 qubits, 1 CNOT, measure both qubits.
Shots: 1024 per circuit (keeps quota usage tiny).

Requires --armed flag to actually submit to hardware.
Without --armed, runs locally on AerSimulator as a dry run.
"""

import argparse
import sys
import time
from math import pi

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

try:
    from coreapi.auth import BasicAuthentication
    from quantuminspire.qiskit import QIProvider, QI
    QI_AVAILABLE = True
except ImportError:
    try:
        from qiskit_quantuminspire.qi_provider import QIProvider
        QI = None
        QI_AVAILABLE = True
    except ImportError:
        QI_AVAILABLE = False
        QI = None

# ---- H2 ansatz: X-X + CNOT + ry(θ0) ry(θ1) cx ry(θ2) ry(θ3) ----
def h2_ansatz(theta_values):
    qc = QuantumCircuit(2)
    qc.x([0, 1])                      # prepare |11> (odd parity sector start)
    qc.ry(theta_values[0], 0)
    qc.ry(theta_values[1], 1)
    qc.cx(0, 1)
    qc.ry(theta_values[2], 0)
    qc.ry(theta_values[3], 1)
    qc.measure_all()
    return qc

# Two test parameter sets
TEST_THETAS = [
    [0.0, 0.0, 0.0, 0.0],
    [pi / 4, pi / 4, 0.0, 0.0],
]

def compute_z_energy(counts):
    """Compute Z-group energy (II, IZ, ZI, ZZ terms + nuclear repulsion)."""
    norm_counts = {k.replace(" ", ""): v for k, v in counts.items()}
    total = sum(norm_counts.values())
    if total == 0:
        return 0.0
    iz, zi, zz = 0.0, 0.0, 0.0
    for bitstring, count in norm_counts.items():
        c0 = int(bitstring[-1])
        c1 = int(bitstring[-2]) if len(bitstring) > 1 else 0
        s_iz = 1.0 if c0 == 0 else -1.0
        s_zi = 1.0 if c1 == 0 else -1.0
        s_zz = 1.0 if (c0 ^ c1) == 0 else -1.0
        iz += s_iz * count
        zi += s_zi * count
        zz += s_zz * count
    iz /= total
    zi /= total
    zz /= total
    # II = -1.052373, IZ = +0.397937, ZI = -0.397937, ZZ = -0.011280, NUC = +0.719969
    e_z = -1.0523732457728594 + 0.39793742484317923 * iz - 0.39793742484317923 * zi - 0.011280104256235324 * zz + 0.7199689944489797
    return e_z

def run_local_dry_run(shots=1024):
    """Dry run on local AerSimulator to validate circuit construction."""
    print("=" * 60)
    print("DRY RUN — Local AerSimulator (no hardware, no quota used)")
    print("=" * 60)
    sim = AerSimulator()
    for i, theta in enumerate(TEST_THETAS):
        qc = h2_ansatz(theta)
        transpiled = transpile(qc, sim, optimization_level=1)
        job = sim.run(transpiled, shots=shots)
        counts = job.result().get_counts()
        norm_counts = {k.replace(" ", ""): v for k, v in counts.items()}
        print(f"\nCircuit {i+1}: theta = {theta}")
        print(f"  Counts: {counts}")
        total = sum(norm_counts.values())
        p_odd = (norm_counts.get("01", 0) + norm_counts.get("10", 0)) / total if total > 0 else 0
        z_energy = compute_z_energy(counts)
        print(f"  Odd-parity probability: {p_odd:.4f}")
        print(f"  Z-group energy: {z_energy:.6f} Ha")
    print("\nDry run complete. Circuits construct and run correctly.")

def run_hardware(shots=1024, auto_confirm=False):
    """Submit 2 circuits to Tuna-17 hardware."""
    if not QI_AVAILABLE:
        print("ERROR: qiskit-quantuminspire not installed.")
        print("  Install: pip install qiskit-quantuminspire")
        sys.exit(1)

    # ---- Authenticate & Connect ----
    print("\n" + "=" * 60)
    print("QINSPIRE HARDWARE — Tuna-17")
    print("=" * 60)

    provider = None
    if QI is not None:
        print("\nAuthentication:")
        print("  Using email/password (BasicAuthentication).")
        email = input("  QInspire email: ").strip()
        password = input("  QInspire password: ").strip()

        from coreapi.auth import BasicAuthentication
        auth = BasicAuthentication(email, password)

        try:
            QI.set_authentication(auth, project_name="h2-vqe-tuna17-test")
            provider = QIProvider()
        except Exception as e:
            print(f"  Authentication failed: {e}")
            sys.exit(1)
    else:
        # QI2 modern provider (qiskit-quantuminspire)
        try:
            provider = QIProvider()
        except FileNotFoundError:
            print("\nQuantum Inspire authentication required.")
            print("Initiating login (OAuth device code)...")
            from quantuminspire.api import Api
            api = Api()
            api.login()
            provider = QIProvider()
        except Exception as e:
            print(f"ERROR: Could not initialize QIProvider: {e}")
            sys.exit(1)

    # ---- Connect to Tuna-17 ----
    try:
        backends = provider.backends()
        tuna17 = None
        for b in backends:
            if "Tuna-17" in str(b.name) or "Tuna-17" in str(b):
                tuna17 = b
                break
        if tuna17 is None:
            print("ERROR: Tuna-17 not found among available backends.")
            print(f"  Available: {[str(b.name) for b in backends]}")
            sys.exit(1)
        print(f"\n✓ Connected to Tuna-17: {tuna17.name}")
        status_val = tuna17.status() if callable(tuna17.status) else tuna17.status
        print(f"  Status: {status_val}")
    except Exception as e:
        print(f"ERROR: Could not connect to QInspire: {e}")
        sys.exit(1)

    # ---- Build circuits ----
    print(f"\nBuilding {len(TEST_THETAS)} circuit(s) with {shots} shots each...")
    circuits = []
    for i, theta in enumerate(TEST_THETAS):
        qc = h2_ansatz(theta)
        qc = transpile(qc, tuna17, optimization_level=1)
        circuits.append(qc)
        print(f"  Circuit {i+1}: theta={theta}, depth={qc.depth()}, gates={qc.count_ops()}")

    # ---- Confirm before submitting ----
    print(f"\n⚠️  About to submit {len(circuits)} circuit(s) to Tuna-17 hardware.")
    print(f"   Shots per circuit: {shots}")
    print(f"   This will consume QPU quota/credits.")
    if not auto_confirm:
        confirm = input("\n   Proceed? (type 'yes' to confirm): ").strip().lower()
        if confirm != "yes":
            print("Aborted by user.")
            sys.exit(0)
    else:
        print("   Auto-confirmed via --yes.")

    # ---- Submit ----
    print(f"\nSubmitting to Tuna-17...")
    try:
        job = tuna17.run(circuits, shots=shots)
        print(f"  Job submitted: {job.job_id()}")
        print(f"  Waiting for results (timeout 1200s)...")
        result = job.result(timeout=1200)
        print(f"  ✓ Job completed!")
    except Exception as e:
        print(f"ERROR: Job submission/execution failed: {e}")
        sys.exit(1)

    # ---- Print results ----
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    for i, theta in enumerate(TEST_THETAS):
        counts = result.get_counts(i)
        norm_counts = {k.replace(" ", ""): v for k, v in counts.items()}
        total = sum(norm_counts.values())
        p_odd = (norm_counts.get("01", 0) + norm_counts.get("10", 0)) / total if total > 0 else 0
        print(f"\nCircuit {i+1}: theta = {theta}")
        print(f"  Raw counts: {counts}")
        print(f"  Total shots: {total}")
        z_energy = compute_z_energy(counts)
        print(f"  Odd-parity probability (|01> + |10>): {p_odd:.4f}")
        print(f"  Even-parity probability (|00> + |11>): {1 - p_odd:.4f}")
        print(f"  Z-group energy: {z_energy:.6f} Ha")

    print("\n" + "=" * 60)
    print("Hardware test complete. If you see sensible counts above,")
    print("auth + connectivity are verified. Ready for the full sweep.")
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(
        description="Minimal 2-circuit H2 VQE hardware test on Tuna-17"
    )
    parser.add_argument(
        "--armed",
        action="store_true",
        help="Actually submit to Tuna-17 hardware. Without this, runs a local dry run.",
    )
    parser.add_argument(
        "--shots",
        type=int,
        default=1024,
        help="Shots per circuit (default: 1024, max 131072 on Tuna-17)",
    )
    parser.add_argument(
        "--mode",
        type=str,
        default="all",
        help="Test mode (e.g. 'all', 'minimal').",
    )
    parser.add_argument(
        "--yes",
        "-y",
        action="store_true",
        help="Auto-confirm prompt before submitting to hardware.",
    )
    args = parser.parse_args()

    if args.armed:
        run_hardware(shots=args.shots, auto_confirm=args.yes)
    else:
        run_local_dry_run(shots=args.shots)

if __name__ == "__main__":
    main()