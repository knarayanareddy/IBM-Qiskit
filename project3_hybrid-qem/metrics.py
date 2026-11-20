"""Metrics for comparing error-mitigation approaches.

- expectation_from_counts: compute <Z_i> or <Z⊗Z> from measurement counts
- hamming_weight_fraction: fraction of shots with a target Hamming weight
- readout_confusion_matrix: build from calibration circuits (prepare |0>/|1>, measure)
- mitigate_readout: invert a measured confusion matrix to correct counts

Note: Qiskit 2.x may emit count bitstrings with spaces between registers
(e.g. '00 10'). We strip spaces everywhere before parsing.
"""

from collections import Counter
import numpy as np


def _clean(bitstring: str) -> str:
    return bitstring.replace(" ", "")


def expectation_z_from_counts(counts: Counter, qubit_index: int, n_shots: int) -> float:
    """<Z> on a single qubit from counts (bitstrings, little-endian Qiskit order)."""
    total = 0.0
    for bitstring, count in counts.items():
        bs = _clean(bitstring)[::-1]
        bit = int(bs[qubit_index]) if qubit_index < len(bs) else 0
        total += (1.0 if bit == 0 else -1.0) * count
    return total / n_shots


def expectation_zz_from_counts(counts: Counter, q0: int, q1: int, n_shots: int) -> float:
    """<Z⊗Z> on two qubits from counts."""
    total = 0.0
    for bitstring, count in counts.items():
        bs = _clean(bitstring)[::-1]
        b0 = int(bs[q0]) if q0 < len(bs) else 0
        b1 = int(bs[q1]) if q1 < len(bs) else 0
        zz = (1.0 if b0 == 0 else -1.0) * (1.0 if b1 == 0 else -1.0)
        total += zz * count
    return total / n_shots


def hamming_weight_fraction(counts: Counter, target_weight: int, n_qubits: int, n_shots: int) -> float:
    """Fraction of shots whose bitstring has exactly target_weight ones."""
    matching = 0
    for bitstring, count in counts.items():
        bs = _clean(bitstring)[::-1]
        w = sum(1 for i in range(min(n_qubits, len(bs))) if bs[i] == "1")
        if w == target_weight:
            matching += count
    return matching / n_shots


def build_readout_confusion_matrix(n_qubits: int, shots_per_cal: int = 4096,
                                    simulator=None) -> np.ndarray:
    """Measure per-qubit readout confusion by preparing |0> and |1> and measuring.

    Returns a (2^n, 2^n) matrix where M[true, observed] = P(observed | true).
    """
    from qiskit import QuantumCircuit
    if simulator is None:
        from qiskit_aer import AerSimulator
        simulator = AerSimulator()

    dim = 2 ** n_qubits
    M = np.zeros((dim, dim))

    for true_state in range(dim):
        qc = QuantumCircuit(n_qubits, n_qubits)
        bits = format(true_state, f"0{n_qubits}b")[::-1]
        for i, b in enumerate(bits):
            if b == "1":
                qc.x(i)
        qc.measure_all()
        job = simulator.run(qc, shots=shots_per_cal)
        counts = job.result().get_counts()
        for obs_str, count in counts.items():
            obs = int(_clean(obs_str)[::-1], 2) if _clean(obs_str) else 0
            M[true_state, obs] += count / shots_per_cal

    col_sums = M.sum(axis=0, keepdims=True)
    col_sums[col_sums == 0] = 1.0
    M = M / col_sums
    return M


def mitigate_readout(counts: Counter, confusion_matrix: np.ndarray,
                     n_qubits: int, n_shots: int) -> Counter:
    """Apply linear readout-error inversion to correct measured counts."""
    dim = 2 ** n_qubits
    p_obs = np.zeros(dim)
    for bitstring, count in counts.items():
        idx = int(_clean(bitstring)[::-1], 2) if _clean(bitstring) else 0
        p_obs[idx] = count / n_shots

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
        corrected[bitstring] = int(round(prob * n_shots))
    return corrected


def compute_confusion_from_counts(counts: Counter, n_qubits: int,
                                   true_state: int, n_shots: int) -> np.ndarray:
    """Extract one column of the confusion matrix from a single calibration run."""
    dim = 2 ** n_qubits
    col = np.zeros(dim)
    for bitstring, count in counts.items():
        obs = int(_clean(bitstring)[::-1], 2) if _clean(bitstring) else 0
        col[obs] = count / n_shots
    return col
