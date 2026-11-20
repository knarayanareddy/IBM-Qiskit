"""Approach 1: Symmetry-resolved mitigation (virtual purification within one state).

Idea (inspired by Iwaki et al., Nov 2026): instead of running multiple noisy
copies and extrapolating (ZNE), exploit a known symmetry *inside* a single
circuit run.

We add a parity ancilla that computes a conserved symmetry (e.g. even parity)
from the data qubits. After the noisy run, we post-select on shots where the
ancilla reports the symmetry is intact. Because the check is computed
coherently within one state, we avoid the multi-copy overhead of virtual
purification or ZNE.

Benchmark: 2-qubit Bell state |00>+|11>. Observable <Z⊗Z> should be +1.
Symmetry: global bit-flip parity (q0 XOR q1 = 0).
"""

from collections import Counter
from qiskit import QuantumCircuit

from circuits import bell_parity_circuit
from metrics import expectation_zz_from_counts, mitigate_readout
from noise_models import build_noise_model, noisy_simulator, ideal_simulator


def _clean(bitstring: str) -> str:
    return bitstring.replace(" ", "")


def bell_circuit_with_parity_ancilla() -> QuantumCircuit:
    """Bell state + parity ancilla (q2 = q0 XOR q1).

    In the noiseless Bell state q0 == q1 always, so ancilla = 0 with prob 1.
    Any bit-flip error breaking parity flips ancilla to 1.
    """
    qc = QuantumCircuit(3, 3)
    qc.h(0)
    qc.cx(0, 1)
    # Parity computation: q2 = q0 XOR q1
    qc.cx(0, 2)
    qc.cx(1, 2)
    qc.measure(0, 0)
    qc.measure(1, 1)
    qc.measure(2, 2)
    return qc


def run_unmitigated(simulator, shots: int = 4096) -> Counter:
    qc = bell_circuit_with_parity_ancilla()
    job = simulator.run(qc, shots=shots)
    return job.result().get_counts()


def counts_to_2bit_dropping_ancilla(counts: Counter) -> Counter:
    """Collapse 3-bit (q0,q1,ancilla) counts to 2-bit (q0,q1)."""
    out = Counter()
    for bitstring, count in counts.items():
        bs = _clean(bitstring)[::-1]  # little-endian: index 2 = ancilla
        data = bs[:2][::-1]  # back to Qiskit order q1q0
        out[data] = out.get(data, 0) + count
    return out


def run_symmetry_postselected(simulator, shots: int = 4096):
    """Post-select on ancilla (q2) == 0, i.e. parity syndrome intact.

    Returns (corrected_counts_2bit, shots_kept).
    """
    qc = bell_circuit_with_parity_ancilla()
    job = simulator.run(qc, shots=shots)
    counts = job.result().get_counts()
    kept = Counter()
    total_kept = 0
    for bitstring, count in counts.items():
        bs = _clean(bitstring)[::-1]
        ancilla = int(bs[2]) if len(bs) > 2 else 0
        if ancilla == 0:
            data = bs[:2][::-1]
            kept[data] = kept.get(data, 0) + count
            total_kept += count
    return kept, total_kept


def run_readout_only(simulator, shots: int = 4096) -> Counter:
    """Standard readout mitigation (no symmetry) on the plain Bell circuit."""
    qc, _ = bell_parity_circuit()
    job = simulator.run(qc, shots=shots)
    counts = job.result().get_counts()
    from metrics import build_readout_confusion_matrix
    M = build_readout_confusion_matrix(2, shots_per_cal=shots, simulator=simulator)
    return mitigate_readout(counts, M, 2, shots)


def evaluate(simulator, shots: int = 4096) -> dict:
    results = {}

    # Unmitigated (data only, drop ancilla)
    counts_un = counts_to_2bit_dropping_ancilla(run_unmitigated(simulator, shots))
    results["unmitigated"] = expectation_zz_from_counts(counts_un, 0, 1, shots)

    # Readout-only mitigation
    counts_ro = run_readout_only(simulator, shots)
    results["readout_only"] = expectation_zz_from_counts(counts_ro, 0, 1, shots)

    # Symmetry post-selection
    counts_sym, kept = run_symmetry_postselected(simulator, shots)
    results["symmetry_postselected"] = expectation_zz_from_counts(counts_sym, 0, 1, kept)
    results["symmetry_retention"] = kept / shots

    # Ideal reference
    ideal_sim = ideal_simulator()
    counts_id = counts_to_2bit_dropping_ancilla(run_unmitigated(ideal_sim, shots))
    results["ideal"] = expectation_zz_from_counts(counts_id, 0, 1, shots)

    return results


if __name__ == "__main__":
    nm = build_noise_model(single_qubit_error=0.01, two_qubit_error=0.03, readout_error=0.05)
    sim = noisy_simulator(nm)
    res = evaluate(sim)
    print("Approach 1 — Symmetry-resolved mitigation (Bell <Z⊗Z>, ideal=+1)")
    for k, v in res.items():
        print(f"  {k}: {v:.4f}")
