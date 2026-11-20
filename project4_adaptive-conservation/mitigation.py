"""Approach 4: Adaptive conservation-law post-selection.

Idea (inspired by Marchenkova's error-mitigation vs post-selection distinction):
many algorithms have outputs that must obey a conservation law (e.g. fixed
Hamming weight / particle number). Hard post-selection throws away every shot
violating the law — but Marchenkova warns this dies exponentially on deep
circuits.

Instead, we *adaptively reweight* every shot using the measured readout
confusion matrix: P(true weight = target | observed bitstring). Shots that
look like violations but could be readout errors get partial credit; shots
that look clean get full credit. Uses all shots, no exponential throwaway.

Benchmark: 4-qubit circuit preparing |1100> (2 excitations). Ideal: every
shot has Hamming weight exactly 2. (X-only — no CX, which flips weight.)
"""

from collections import Counter
import numpy as np
from qiskit import QuantumCircuit

from metrics import build_readout_confusion_matrix
from noise_models import build_noise_model, noisy_simulator, ideal_simulator


def _clean(bitstring: str) -> str:
    return bitstring.replace(" ", "")


def hamming_weight(bitstring: str, n_qubits: int) -> int:
    bs = _clean(bitstring)[::-1]
    return sum(1 for i in range(min(n_qubits, len(bs))) if bs[i] == "1")


def conservation_circuit(n_qubits: int = 4) -> QuantumCircuit:
    """Prepare |1100...> (2 excitations), X-only so weight is conserved.

    Ideal output: Hamming weight always == 2.
    """
    qc = QuantumCircuit(n_qubits, n_qubits)
    qc.x(0)
    qc.x(1)
    for i in range(n_qubits):
        qc.measure(i, i)
    return qc


def run_unmitigated(simulator, shots: int = 4096, n_qubits: int = 4) -> Counter:
    qc = conservation_circuit(n_qubits)
    job = simulator.run(qc, shots=shots)
    return job.result().get_counts()


def hard_postselect_fraction(counts: Counter, target_weight: int,
                             n_qubits: int, n_shots: int) -> tuple[float, int]:
    """Fraction of shots with weight == target_weight, and number kept."""
    kept = 0
    for bs, c in counts.items():
        if hamming_weight(bs, n_qubits) == target_weight:
            kept += c
    return kept / n_shots, kept


def adaptive_correctness_estimate(counts: Counter, confusion_matrix: np.ndarray,
                                   target_weight: int, n_qubits: int,
                                   n_shots: int) -> float:
    """Estimate P(true weight == target) using soft reweighting by confusion matrix.

    For each observed bitstring o with count c:
      P(true=t | obs=o) ∝ M[t, o] * P(true=t)   (uniform prior over true states)
      w(o) = sum_{t: weight(t)==target} P(true=t | obs=o)
    Estimate = sum_o c * w(o) / n_shots
    """
    dim = 2 ** n_qubits
    true_weights = np.array([bin(t).count("1") for t in range(dim)])
    target_mask = (true_weights == target_weight)

    # Column-normalize M so each column sums to 1: P(obs | true)
    M = confusion_matrix
    col_sums = M.sum(axis=0, keepdims=True)
    col_sums[col_sums == 0] = 1.0
    M_cond = M / col_sums  # M_cond[t, o] = P(obs=o | true=t)

    # Uniform prior P(true=t) = 1/dim
    prior = np.ones(dim) / dim

    estimate = 0.0
    for bitstring, count in counts.items():
        o = int(_clean(bitstring)[::-1], 2) if _clean(bitstring) else 0
        # P(true=t | obs=o) ∝ P(obs=o | true=t) * P(true=t)
        post_unnorm = M_cond[:, o] * prior
        norm = post_unnorm.sum()
        if norm == 0:
            continue
        post = post_unnorm / norm
        w_o = post[target_mask].sum()
        estimate += count * w_o

    return estimate / n_shots


def run_readout_mitigated(simulator, counts: Counter, n_qubits: int,
                          n_shots: int) -> Counter:
    M = build_readout_confusion_matrix(n_qubits, shots_per_cal=n_shots,
                                       simulator=simulator)
    from metrics import mitigate_readout
    return mitigate_readout(counts, M, n_qubits, n_shots)


def evaluate(simulator, shots: int = 4096, n_qubits: int = 4,
             target_weight: int = 2) -> dict:
    results = {}
    counts = run_unmitigated(simulator, shots, n_qubits)

    # Unmitigated: fraction with correct weight
    results["unmitigated_correct_frac"], _ = hard_postselect_fraction(
        counts, target_weight, n_qubits, shots)

    # Hard post-selection: same correctness (all kept are correct) but lower retention
    results["hard_ps_correct_frac"], kept = hard_postselect_fraction(
        counts, target_weight, n_qubits, shots)
    results["hard_ps_retention"] = kept / shots

    # Adaptive soft reweighting using confusion matrix
    M = build_readout_confusion_matrix(n_qubits, shots_per_cal=shots,
                                       simulator=simulator)
    results["adaptive_estimate"] = adaptive_correctness_estimate(
        counts, M, target_weight, n_qubits, shots)

    # Readout-mitigated then hard weight check
    counts_ro = run_readout_mitigated(simulator, counts, n_qubits, shots)
    results["readout_mitigated_correct_frac"], _ = hard_postselect_fraction(
        counts_ro, target_weight, n_qubits, shots)

    # Ideal reference
    ideal_sim = ideal_simulator()
    counts_id = run_unmitigated(ideal_sim, shots, n_qubits)
    results["ideal_correct_frac"], _ = hard_postselect_fraction(
        counts_id, target_weight, n_qubits, shots)

    return results


if __name__ == "__main__":
    nm = build_noise_model(single_qubit_error=0.01, two_qubit_error=0.03, readout_error=0.08)
    sim = noisy_simulator(nm)
    res = evaluate(sim)
    print("Approach 4 — Adaptive conservation post-selection (P(weight==2), ideal=1.0)")
    print(f"  Unmitigated correct frac: {res['unmitigated_correct_frac']:.4f}")
    print(f"  Hard PS correct frac:     {res['hard_ps_correct_frac']:.4f}")
    print(f"  Hard PS retention:        {res['hard_ps_retention']:.4f}")
    print(f"  Adaptive estimate:        {res['adaptive_estimate']:.4f}")
    print(f"  Readout-mitigated:        {res['readout_mitigated_correct_frac']:.4f}")
    print(f"  Ideal:                    {res['ideal_correct_frac']:.4f}")
