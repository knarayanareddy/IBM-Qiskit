"""Approach 3: Hybrid QEM + light error detection.

Idea (inspired by IBM Research QEM/QEC continuum, Sep 2026): combine a tiny
error-detecting code with classical post-processing, rather than pure
post-processing mitigation.

We use a 3-qubit repetition code: |0_L> = |000>. Two syndrome ancillas compute
parity checks (q0⊕q1, q1⊕q2). After the noisy run we post-select on syndrome
== 00 (no bit-flip detected), then apply readout mitigation on the surviving
data qubits. This is hybrid: light error detection (hardware) + QEM (classical).

Benchmark: repetition code encoding |0>. Observable <Z_0> on logical qubit,
ideal = +1.
"""

from collections import Counter
from qiskit import QuantumCircuit

from metrics import expectation_z_from_counts, mitigate_readout, build_readout_confusion_matrix
from noise_models import build_noise_model, noisy_simulator, ideal_simulator


def _clean(bitstring: str) -> str:
    return bitstring.replace(" ", "")


def repetition_code_circuit() -> QuantumCircuit:
    """3 data qubits + 2 syndrome ancillas.

    q0,q1,q2 = data (|000> logical 0)
    q3 = q0 XOR q1 (syndrome 0)
    q4 = q1 XOR q2 (syndrome 1)
    Measure all.
    """
    qc = QuantumCircuit(5, 5)
    # Encode |0_L> = |000> (already |000>, no X needed)
    # Syndrome: a0 = q0 XOR q1, a1 = q1 XOR q2
    qc.cx(0, 3)
    qc.cx(1, 3)
    qc.cx(1, 4)
    qc.cx(2, 4)
    qc.measure(0, 0)
    qc.measure(1, 1)
    qc.measure(2, 2)
    qc.measure(3, 3)
    qc.measure(4, 4)
    return qc


def run_unmitigated(simulator, shots: int = 4096) -> Counter:
    qc = repetition_code_circuit()
    job = simulator.run(qc, shots=shots)
    return job.result().get_counts()


def run_hybrid(simulator, shots: int = 4096):
    """Post-select on syndrome == 00, then readout-mitigate the 3 data qubits.

    Returns (corrected_data_counts, shots_kept).
    """
    qc = repetition_code_circuit()
    job = simulator.run(qc, shots=shots)
    counts = job.result().get_counts()

    kept = Counter()
    total_kept = 0
    for bitstring, count in counts.items():
        bs = _clean(bitstring)[::-1]  # little-endian: index 3,4 = ancillas
        s0 = int(bs[3]) if len(bs) > 3 else 0
        s1 = int(bs[4]) if len(bs) > 4 else 0
        if s0 == 0 and s1 == 0:
            data = bs[:3][::-1]  # q2 q1 q0 -> back to qiskit order
            kept[data] = kept.get(data, 0) + count
            total_kept += count

    # Readout mitigation on the 3 data qubits
    M = build_readout_confusion_matrix(3, shots_per_cal=shots, simulator=simulator)
    corrected = mitigate_readout(kept, M, 3, total_kept)
    return corrected, total_kept


def run_readout_only(simulator, shots: int = 4096) -> Counter:
    """Readout mitigation on 3 data qubits, no error detection (ignore syndrome)."""
    qc = repetition_code_circuit()
    job = simulator.run(qc, shots=shots)
    counts = job.result().get_counts()
    # Collapse to 3 data qubits, drop ancillas
    data_counts = Counter()
    for bitstring, count in counts.items():
        bs = _clean(bitstring)[::-1]
        data = bs[:3][::-1]
        data_counts[data] = data_counts.get(data, 0) + count
    M = build_readout_confusion_matrix(3, shots_per_cal=shots, simulator=simulator)
    return mitigate_readout(data_counts, M, 3, shots)


def evaluate(simulator, shots: int = 4096) -> dict:
    results = {}

    # Unmitigated: <Z_0> on data qubit 0 (drop ancillas)
    counts_un = Counter()
    raw = run_unmitigated(simulator, shots)
    for bitstring, count in raw.items():
        bs = _clean(bitstring)[::-1]
        data = bs[:3][::-1]
        counts_un[data] = counts_un.get(data, 0) + count
    results["unmitigated"] = expectation_z_from_counts(counts_un, 0, shots)

    # Readout only
    counts_ro = run_readout_only(simulator, shots)
    results["readout_only"] = expectation_z_from_counts(counts_ro, 0, shots)

    # Hybrid: detect + postselect + readout mitigate
    counts_hyb, kept = run_hybrid(simulator, shots)
    results["hybrid_detect_postselect"] = expectation_z_from_counts(counts_hyb, 0, kept)
    results["hybrid_retention"] = kept / shots

    # Ideal reference
    ideal_sim = ideal_simulator()
    raw_id = run_unmitigated(ideal_sim, shots)
    counts_id = Counter()
    for bitstring, count in raw_id.items():
        bs = _clean(bitstring)[::-1]
        data = bs[:3][::-1]
        counts_id[data] = counts_id.get(data, 0) + count
    results["ideal"] = expectation_z_from_counts(counts_id, 0, shots)

    return results


if __name__ == "__main__":
    nm = build_noise_model(single_qubit_error=0.01, two_qubit_error=0.03, readout_error=0.05)
    sim = noisy_simulator(nm)
    res = evaluate(sim)
    print("Approach 3 — Hybrid QEM + light error detection (<Z_0>, ideal=+1)")
    print(f"  Unmitigated:            {res['unmitigated']:.4f}")
    print(f"  Readout only:           {res['readout_only']:.4f}")
    print(f"  Hybrid detect+postsel:  {res['hybrid_detect_postselect']:.4f}")
    print(f"  Hybrid shot retention:  {res['hybrid_retention']:.4f}")
    print(f"  Ideal:                  {res['ideal']:.4f}")
