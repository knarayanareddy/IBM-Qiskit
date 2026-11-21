"""
Adaptive Conservation Post-Selection (Project 4)

Core method for the Qiskit Fall Fest 2026 Error Mitigation track.

Instead of hard post-selection (which throws away every shot violating a
conservation law and dies exponentially on deep circuits), this soft-reweights
every shot using a measured readout confusion matrix:

    P(true satisfies conservation | observed bitstring)

Every shot gets a partial credit weight in [0, 1]. No shot is thrown away.

Supports three conservation law types:
  - "weight": fixed Hamming weight (e.g. exactly 2 excitations)
  - "parity": even parity (e.g. GHZ state)
  - "none": no conservation law (all states valid — for testing only)
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Callable

import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError


@dataclass
class NoiseConfig:
    single_qubit_error: float = 0.01
    two_qubit_error: float = 0.03
    readout_error: float = 0.05
    shots: int = 4096


@dataclass
class AdaptiveResult:
    raw_correct_frac: float
    hard_ps_correct_frac: float
    hard_ps_retention: float
    adaptive_estimate: float
    readout_mitigated_correct_frac: float
    ideal_correct_frac: float
    shots_used_pct: float = 100.0


def build_noise_model(cfg: NoiseConfig) -> NoiseModel:
    """Build an AerSimulator noise model with depolarising gate errors and readout error."""
    nm = NoiseModel()

    one_q_err = depolarizing_error(cfg.single_qubit_error, 1)
    one_q_gates = [
        "id", "x", "y", "z", "h", "s", "sdg", "t", "tdg",
        "sx", "sxdg", "rx", "ry", "rz", "u1", "u2", "u3",
    ]
    nm.add_all_qubit_quantum_error(one_q_err, one_q_gates)

    two_q_err = depolarizing_error(cfg.two_qubit_error, 2)
    two_q_gates = ["cx", "cz", "swap", "iswap", "cp", "crx", "cry", "crz"]
    nm.add_all_qubit_quantum_error(two_q_err, two_q_gates)

    readout_err = ReadoutError(
        [[1 - cfg.readout_error, cfg.readout_error],
         [cfg.readout_error, 1 - cfg.readout_error]]
    )
    nm.add_all_qubit_readout_error(readout_err)

    return nm


def bitstring_to_int(bs: str) -> int:
    """Convert a Qiskit count bitstring to an integer index."""
    clean = bs.replace(" ", "")
    return int(clean[::-1], 2) if clean else 0


def hamming_weight_int(state_idx: int, n_qubits: int) -> int:
    """Hamming weight of a state index."""
    return bin(state_idx).count("1")


def parity_int(state_idx: int) -> int:
    """Parity of a state index (0 = even, 1 = odd)."""
    return bin(state_idx).count("1") % 2


def is_valid_state(
    state_idx: int,
    n_qubits: int,
    conservation_type: str,
    target_weight: int | None = None,
) -> bool:
    """Check if a state index satisfies the conservation law."""
    if conservation_type == "weight":
        if target_weight is None:
            raise ValueError("target_weight required for 'weight' conservation type")
        return hamming_weight_int(state_idx, n_qubits) == target_weight
    elif conservation_type == "parity":
        return parity_int(state_idx) == 0  # even parity
    elif conservation_type == "none":
        return True  # no conservation law — all states valid (testing only)
    else:
        raise ValueError(f"Unknown conservation type: {conservation_type}")


def build_valid_state_mask(
    n_qubits: int,
    conservation_type: str,
    target_weight: int | None = None,
) -> np.ndarray:
    """Build a boolean mask of size 2^n where True = state satisfies conservation."""
    dim = 2 ** n_qubits
    mask = np.zeros(dim, dtype=bool)
    for s in range(dim):
        mask[s] = is_valid_state(s, n_qubits, conservation_type, target_weight)
    return mask


def build_confusion_matrix(
    sim: AerSimulator,
    n_qubits: int,
    shots_per_cal: int = 4096,
) -> np.ndarray:
    """Measure per-qubit readout confusion by preparing |0>/|1> and measuring.

    Returns M[true, observed] = P(observed | true).
    """
    from qiskit import QuantumCircuit as QC

    dim = 2 ** n_qubits
    M = np.zeros((dim, dim))

    for true_state in range(dim):
        qc = QC(n_qubits, n_qubits)
        bits = format(true_state, f"0{n_qubits}b")[::-1]
        for i, b in enumerate(bits):
            if b == "1":
                qc.x(i)
        qc.measure_all()
        job = sim.run(qc, shots=shots_per_cal)
        counts = job.result().get_counts()
        for obs_str, count in counts.items():
            obs = bitstring_to_int(obs_str)
            M[true_state, obs] += count / shots_per_cal

    col_sums = M.sum(axis=0, keepdims=True)
    col_sums[col_sums == 0] = 1.0
    M = M / col_sums
    return M


def mitigate_readout(
    counts: Counter,
    confusion_matrix: np.ndarray,
    n_qubits: int,
    shots: int,
) -> Counter:
    """Apply linear readout-error inversion to correct measured counts."""
    dim = 2 ** n_qubits
    p_obs = np.zeros(dim)
    for bitstring, count in counts.items():
        idx = bitstring_to_int(bitstring)
        p_obs[idx] = count / shots

    try:
        p_true = np.linalg.solve(confusion_matrix, p_obs)
    except np.linalg.LinAlgError:
        p_true = np.linalg.lstsq(confusion_matrix, p_obs, rcond=None)[0]

    p_true = np.clip(p_true, 0, None)
    total = p_true.sum()
    if total > 0:
        p_true = p_true / total

    corrected = Counter()
    for idx, prob in enumerate(p_true):
        bitstring = format(idx, f"0{n_qubits}b")[::-1]
        corrected[bitstring] = int(round(prob * shots))
    return corrected


def hard_postselect_fraction(
    counts: Counter,
    n_qubits: int,
    conservation_type: str,
    target_weight: int | None = None,
) -> tuple[float, int]:
    """Fraction of shots satisfying the conservation law, and number kept."""
    kept = 0
    for bs, c in counts.items():
        idx = bitstring_to_int(bs)
        if is_valid_state(idx, n_qubits, conservation_type, target_weight):
            kept += c
    total = sum(counts.values())
    return kept / total, kept


def adaptive_correctness_estimate(
    counts: Counter,
    confusion_matrix: np.ndarray,
    n_qubits: int,
    conservation_type: str,
    target_weight: int | None = None,
    n_shots: int | None = None,
) -> float:
    """Estimate P(true satisfies conservation) using soft reweighting.

    For each observed bitstring o with count c:
      P(true=t | obs=o) ∝ M[t, o] * P(true=t)   (uniform prior over true states)
      w(o) = sum_{t: valid(t)} P(true=t | obs=o)
    Estimate = sum_o c * w(o) / n_shots
    """
    if n_shots is None:
        n_shots = sum(counts.values())

    dim = 2 ** n_qubits
    valid_mask = build_valid_state_mask(n_qubits, conservation_type, target_weight)

    # Column-normalize M so each column sums to 1: P(obs | true)
    M = confusion_matrix
    col_sums = M.sum(axis=0, keepdims=True)
    col_sums[col_sums == 0] = 1.0
    M_cond = M / col_sums  # M_cond[t, o] = P(obs=o | true=t)

    prior = np.ones(dim) / dim

    estimate = 0.0
    for bitstring, count in counts.items():
        o = bitstring_to_int(bitstring)
        post_unnorm = M_cond[:, o] * prior
        norm = post_unnorm.sum()
        if norm == 0:
            continue
        post = post_unnorm / norm
        w_o = post[valid_mask].sum()
        estimate += count * w_o

    return estimate / n_shots


def run_adaptive_conservation(
    circuit: QuantumCircuit,
    cfg: NoiseConfig,
    conservation_type: str = "weight",
    target_weight: int | None = None,
    n_qubits: int | None = None,
) -> AdaptiveResult:
    """Run adaptive conservation post-selection on a circuit.

    Args:
        circuit: The quantum circuit (should already include measurements).
        cfg: Noise configuration.
        conservation_type: "weight", "parity", or "none".
        target_weight: Target Hamming weight (required if conservation_type="weight").
        n_qubits: Number of qubits (inferred from circuit if not given).

    Returns:
        AdaptiveResult with raw, hard PS, adaptive, readout-mitigated, and ideal values.
    """
    if n_qubits is None:
        n_qubits = circuit.num_qubits

    if conservation_type == "weight" and target_weight is None:
        raise ValueError("target_weight is required for 'weight' conservation type")

    shots = cfg.shots
    sim_noisy = AerSimulator(noise_model=build_noise_model(cfg))
    sim_ideal = AerSimulator()

    # --- Unmitigated run ---
    job = sim_noisy.run(circuit, shots=shots)
    counts = job.result().get_counts()

    raw_correct_frac, _ = hard_postselect_fraction(
        counts, n_qubits, conservation_type, target_weight
    )
    hard_ps_correct_frac, kept = hard_postselect_fraction(
        counts, n_qubits, conservation_type, target_weight
    )
    hard_ps_retention = kept / shots

    # --- Readout-mitigated ---
    M = build_confusion_matrix(sim_noisy, n_qubits, shots_per_cal=shots)
    counts_ro = mitigate_readout(counts, M, n_qubits, shots)
    ro_correct_frac, _ = hard_postselect_fraction(
        counts_ro, n_qubits, conservation_type, target_weight
    )

    # --- Adaptive soft reweighting ---
    adaptive_estimate = adaptive_correctness_estimate(
        counts, M, n_qubits, conservation_type, target_weight, shots
    )

    # --- Ideal reference ---
    job_id = sim_ideal.run(circuit, shots=shots)
    counts_id = job_id.result().get_counts()
    ideal_correct_frac, _ = hard_postselect_fraction(
        counts_id, n_qubits, conservation_type, target_weight
    )

    return AdaptiveResult(
        raw_correct_frac=raw_correct_frac,
        hard_ps_correct_frac=hard_ps_correct_frac,
        hard_ps_retention=hard_ps_retention,
        adaptive_estimate=adaptive_estimate,
        readout_mitigated_correct_frac=ro_correct_frac,
        ideal_correct_frac=ideal_correct_frac,
        shots_used_pct=100.0,
    )
