"""Approach 2: Non-Clifford-targeted Zero-Noise Extrapolation.

Idea (inspired by Layden et al., 2024): non-Clifford gates (T, Toffoli) are the
expensive, error-prone part of fault-tolerant quantum computing. Clifford gates
are cheap and fault-tolerant-friendly. Instead of amplifying noise on *all*
gates (full ZNE), we amplify noise *only on the non-Clifford T-gate layer* by
folding T gates (T Tdag = I, so the ideal unitary is unchanged but more T gates
= more depolarizing error opportunities on the non-Clifford layer).

We run at noise factors lambda = 1, 2, 3 (1x, 2x, 3x the T-gate count),
measure <Z_0> at each, and extrapolate linearly to lambda = 0.

Benchmark: H on all, T on all (non-Clifford layer), CX entangling chain,
H on all, measure. Observable <Z_0>.
"""

from collections import Counter
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

from circuits import nonclifford_layer_circuit
from metrics import expectation_z_from_counts
from noise_models import build_noise_model, noisy_simulator, ideal_simulator


def fold_t_gates(qc: QuantumCircuit, fold_factor: int) -> QuantumCircuit:
    """Return a copy of qc with each T gate replaced by (fold_factor) T gates.

    fold_factor=1: original (0 Tdag-T pairs inserted)
    fold_factor=2: T -> T Tdag T  (net one T, but 3 physical T gates -> more noise)
    fold_factor=3: T -> T Tdag T Tdag T  (net one T, 5 physical T gates)

    Since T Tdag = I, the ideal unitary is identical; only the physical gate
    count on the non-Clifford layer grows, amplifying noise there specifically.
    Clifford gates (H, CX) are untouched.

    Measurements are dropped and re-added explicitly at the end.
    """
    new_qc = QuantumCircuit(qc.num_qubits, qc.num_qubits)
    for inst, qargs, cargs in qc.data:
        name = inst.name
        if name == "measure":
            continue  # re-add explicitly at the end
        if name == "t" and fold_factor > 1:
            new_qc.append(inst, qargs)  # the original T
            for _ in range(fold_factor - 1):
                # Tdag T = I, adds two more T-family physical gates
                new_qc.tdg(qargs[0])
                new_qc.t(qargs[0])
        else:
            new_qc.append(inst, qargs)
    for i in range(new_qc.num_qubits):
        new_qc.measure(i, i)
    return new_qc


def build_zne_circuits(base_qc: QuantumCircuit, factors=(1, 2, 3)):
    """Build folded circuit variants for each noise factor."""
    return {lam: fold_t_gates(base_qc, lam) for lam in factors}


def run_zne(simulator, base_qc: QuantumCircuit, shots: int = 4096,
            factors=(1, 2, 3)):
    """Run ZNE: measure <Z_0> at each fold factor, extrapolate to lambda=0."""
    exp_values = {}
    for lam in factors:
        qc = fold_t_gates(base_qc, lam)
        job = simulator.run(qc, shots=shots)
        counts = job.result().get_counts()
        exp_values[lam] = expectation_z_from_counts(counts, 0, shots)

    # Linear extrapolation to lambda = 0
    # Fit exp(lambda) = a + b * lambda, evaluate at lambda = 0 -> a
    lam_arr = np.array(factors, dtype=float)
    exp_arr = np.array([exp_values[l] for l in factors], dtype=float)
    if len(factors) >= 2:
        coeffs = np.polyfit(lam_arr, exp_arr, deg=1)
        extrapolated = coeffs[-1]  # intercept = value at lambda=0
    else:
        extrapolated = exp_values[factors[0]]

    return {
        "values_by_lambda": exp_values,
        "extrapolated_zero_noise": float(extrapolated),
    }


def ideal_expectation(base_qc: QuantumCircuit) -> float:
    """Compute <Z_0> on the ideal statevector (measurements removed)."""
    qc_no_meas = QuantumCircuit(base_qc.num_qubits)
    for inst, qargs, cargs in base_qc.data:
        if inst.name != "measure":
            qc_no_meas.append(inst, qargs)
    sv = Statevector.from_instruction(qc_no_meas)
    # <Z_0> = P(q0=0) - P(q0=1); Statevector index bit 0 = qubit 0 (little-endian)
    probs = sv.probabilities()
    p0 = 0.0
    p1 = 0.0
    for idx, prob in enumerate(probs):
        if idx & 1:
            p1 += prob
        else:
            p0 += prob
    return p0 - p1


def evaluate(simulator, shots: int = 4096) -> dict:
    base_qc, _ = nonclifford_layer_circuit()

    zne = run_zne(simulator, base_qc, shots=shots)

    results = {
        "unmitigated_lambda1": zne["values_by_lambda"][1],
        "nonclifford_zne": zne["extrapolated_zero_noise"],
        "lambda_values": zne["values_by_lambda"],
    }

    # Ideal reference
    results["ideal"] = ideal_expectation(base_qc)

    return results


if __name__ == "__main__":
    nm = build_noise_model(single_qubit_error=0.01, two_qubit_error=0.03, readout_error=0.05)
    sim = noisy_simulator(nm)
    res = evaluate(sim)
    print("Approach 2 — Non-Clifford-targeted ZNE (<Z_0>)")
    print(f"  Unmitigated (lambda=1): {res['unmitigated_lambda1']:.4f}")
    print(f"  Non-Clifford ZNE (lambda->0): {res['nonclifford_zne']:.4f}")
    print(f"  Ideal: {res['ideal']:.4f}")
    print(f"  Values by lambda: {res['lambda_values']}")
