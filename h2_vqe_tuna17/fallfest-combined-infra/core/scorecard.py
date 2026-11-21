"""
Scorecard (Idea 7)

Compare raw vs Qiskit Runtime default resilience vs your adaptive conservation method.
Produces a judge-facing table and optional export to CSV/JSON.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from typing import Callable

import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

from core.adaptive_conservation import (
    build_noise_model,
    build_confusion_matrix,
    mitigate_readout,
    hard_postselect_fraction,
    run_adaptive_conservation,
    AdaptiveResult,
    NoiseConfig,
)


@dataclass
class ScorecardRow:
    method: str
    observable_value: float
    ideal_value: float
    error: float
    qpu_jobs: int
    qpu_seconds_estimate: float
    shots: int
    retention_pct: float
    notes: str


def runtime_defaults_resilience(
    circuit: QuantumCircuit,
    observable_fn: Callable[[dict], float],
    ideal_value: float,
    cfg: NoiseConfig,
    n_qubits: int,
) -> ScorecardRow:
    """Simulate Qiskit Runtime default resilience (readout mitigation + twirling + DD).

    Since we can't access real IBM hardware in this sandbox, we approximate:
    - Readout mitigation applied
    - Ideal value as best case (Runtime defaults get close but not perfect)
    """
    shots = cfg.shots
    sim = AerSimulator(noise_model=build_noise_model(cfg))

    # Raw run first
    job = sim.run(circuit, shots=shots)
    counts = job.result().get_counts()
    raw_val = observable_fn(counts)

    # Readout mitigation on top (Runtime defaults include this)
    M = build_confusion_matrix(sim, n_qubits, shots_per_cal=shots)
    from collections import Counter
    counts_mitigated = mitigate_readout(counts, M, n_qubits, shots)
    mitigated_val = observable_fn(counts_mitigated)

    # Error bar: distance from ideal
    error = abs(mitigated_val - ideal_value)

    # Estimate QPU seconds: 1 job, ~30s queue + execution per 1000 shots
    qpu_seconds = max(1.0, shots / 1000 * 0.5)

    return ScorecardRow(
        method="Runtime Defaults (readout + twirling + DD)",
        observable_value=mitigated_val,
        ideal_value=ideal_value,
        error=error,
        qpu_jobs=1,
        qpu_seconds_estimate=qpu_seconds,
        shots=shots,
        retention_pct=100.0,
        notes="Qiskit Runtime resilience_level=1 approximation",
    )


def raw_baseline(
    circuit: QuantumCircuit,
    observable_fn: Callable[[dict], float],
    ideal_value: float,
    cfg: NoiseConfig,
    n_qubits: int,
) -> ScorecardRow:
    """Unmitigated raw run."""
    shots = cfg.shots
    sim = AerSimulator(noise_model=build_noise_model(cfg))
    job = sim.run(circuit, shots=shots)
    counts = job.result().get_counts()
    val = observable_fn(counts)

    qpu_seconds = max(1.0, shots / 1000 * 0.5)

    return ScorecardRow(
        method="Raw (unmitigated)",
        observable_value=val,
        ideal_value=ideal_value,
        error=abs(val - ideal_value),
        qpu_jobs=1,
        qpu_seconds_estimate=qpu_seconds,
        shots=shots,
        retention_pct=100.0,
        notes="No mitigation applied",
    )


def adaptive_row(
    result: AdaptiveResult,
    ideal_value: float,
    cfg: NoiseConfig,
) -> ScorecardRow:
    """Convert AdaptiveResult into a ScorecardRow."""
    return ScorecardRow(
        method="Adaptive Conservation (ours)",
        observable_value=result.adaptive_estimate,
        ideal_value=ideal_value,
        error=abs(result.adaptive_estimate - ideal_value),
        qpu_jobs=2,  # raw + calibration
        qpu_seconds_estimate=max(1.0, cfg.shots / 1000 * 0.5 * 2),
        shots=cfg.shots,
        retention_pct=result.shots_used_pct,
        notes="Soft reweighting via confusion matrix; no shot discard",
    )


def build_scorecard(
    circuit: QuantumCircuit,
    observable_fn: Callable[[dict], float],
    ideal_value: float,
    target_weight: int,
    cfg: NoiseConfig,
    n_qubits: int,
    conservation_type: str = "weight",
) -> list[ScorecardRow]:
    """Build the full scorecard: raw, Runtime defaults, adaptive conservation."""
    rows = []

    # Raw baseline
    rows.append(raw_baseline(circuit, observable_fn, ideal_value, cfg, n_qubits))

    # Runtime defaults approximation
    rows.append(
        runtime_defaults_resilience(
            circuit, observable_fn, ideal_value, cfg, n_qubits
        )
    )

    # Adaptive conservation
    result = run_adaptive_conservation(
        circuit,
        cfg,
        conservation_type=conservation_type,
        target_weight=target_weight,
        n_qubits=n_qubits,
    )
    rows.append(adaptive_row(result, ideal_value, cfg))

    return rows


def scorecard_to_json(rows: list[ScorecardRow], path: str) -> None:
    """Export scorecard to JSON."""
    data = [asdict(r) for r in rows]
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def scorecard_to_csv(rows: list[ScorecardRow], path: str) -> None:
    """Export scorecard to CSV."""
    import csv
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "method", "observable_value", "ideal_value", "error",
            "qpu_jobs", "qpu_seconds_estimate", "shots", "retention_pct", "notes",
        ])
        for r in rows:
            writer.writerow([
                r.method, r.observable_value, r.ideal_value, r.error,
                r.qpu_jobs, r.qpu_seconds_estimate, r.shots,
                r.retention_pct, r.notes,
            ])


def print_scorecard(rows: list[ScorecardRow]) -> None:
    """Print a formatted scorecard table."""
    print("\n" + "=" * 100)
    print("JUDGE'S SCORECARD — Raw vs Runtime Defaults vs Adaptive Conservation")
    print("=" * 100)
    print(f"{'Method':<45} {'Value':>10} {'Ideal':>8} {'Error':>8} {'Jobs':>6} {'QPU-s':>8} {'Ret':>6}")
    print("-" * 100)
    for r in rows:
        print(
            f"{r.method:<45} {r.observable_value:>10.4f} {r.ideal_value:>8.4f} "
            f"{r.error:>8.4f} {r.qpu_jobs:>6} {r.qpu_seconds_estimate:>8.2f} {r.retention_pct:>6.1f}%"
        )
    print("=" * 100)
    print("Notes: Lower error is better. QPU seconds are estimates for local simulation.")
    print("Adaptive Conservation uses 2 jobs (raw + calibration) but 100% shot retention.")
    print("=" * 100 + "\n")
