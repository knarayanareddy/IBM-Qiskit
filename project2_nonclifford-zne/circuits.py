"""Benchmark circuits for evaluating error-mitigation approaches.

Each circuit returns a (QuantumCircuit, ideal_expectation) pair where
ideal_expectation is the noise-free value of the observable we care about,
so we can quantify how close each mitigation method gets to the truth.

Note: uses explicit per-qubit measurement (qc.measure(i, i)) rather than
measure_all(), because Qiskit 2.x's measure_all() can create extra
classical registers and garble count bitstrings.
"""

from qiskit import QuantumCircuit


def _measure_all(qc: QuantumCircuit, n: int):
    """Explicitly measure each qubit to its matching clbit (single register)."""
    for i in range(n):
        qc.measure(i, i)


def bell_parity_circuit() -> tuple[QuantumCircuit, float]:
    """2-qubit Bell state (|00> + |11>)/sqrt(2).

    Symmetry: global bit-flip parity is conserved. Ideal <Z⊗Z> = +1.
    Good for: symmetry-resolved mitigation (approach 1) and
              adaptive conservation post-selection (approach 4).
    """
    qc = QuantumCircuit(2, 2)
    qc.h(0)
    qc.cx(0, 1)
    _measure_all(qc, 2)
    return qc, 1.0


def parity_conserving_circuit(n_qubits: int = 4) -> tuple[QuantumCircuit, float]:
    """Prepare a state with fixed Hamming weight (2 excitations).

    State: |1100...>. X-only so weight is conserved (no CX, which flips weight).
    Ideal: every shot has exactly two 1s.
    Good for: approach 4.
    """
    qc = QuantumCircuit(n_qubits, n_qubits)
    qc.x(0)
    qc.x(1)
    _measure_all(qc, n_qubits)
    return qc, 1.0


def nonclifford_layer_circuit(n_qubits: int = 3) -> tuple[QuantumCircuit, float]:
    """Circuit with Clifford + non-Clifford (T) gates.

    Structure: H on all, then T on all, then CNOT chain, then H on all, then measure.
    The T gates are the error-prone non-Clifford layer.
    Observable <Z_0>. Ideal value computed numerically in the runner.
    """
    qc = QuantumCircuit(n_qubits, n_qubits)
    for i in range(n_qubits):
        qc.h(i)
    for i in range(n_qubits):
        qc.t(i)          # non-Clifford layer
    for i in range(n_qubits - 1):
        qc.cx(i, i + 1)  # entangling Clifford layer
    for i in range(n_qubits):
        qc.h(i)          # return to Z basis
    _measure_all(qc, n_qubits)
    return qc, 1.0


def repetition_code_circuit() -> tuple[QuantumCircuit, float]:
    """3 data qubits + 2 syndrome ancillas.

    q0,q1,q2 = data (|000> logical 0)
    q3 = q0 XOR q1 (syndrome 0)
    q4 = q1 XOR q2 (syndrome 1)
    Measure all 5 qubits explicitly.
    Good for: approach 3.
    """
    qc = QuantumCircuit(5, 5)
    # Encode |0_L> = |000> (already |000>, no X needed)
    qc.cx(0, 3)
    qc.cx(1, 3)
    qc.cx(1, 4)
    qc.cx(2, 4)
    _measure_all(qc, 5)
    return qc, 1.0


def variational_ansatz(n_qubits: int = 3, reps: int = 2) -> tuple[QuantumCircuit, float]:
    """Generic parameterized ansatz (VQE-like) with rotations and CNOTs.

    Includes T gates so approach 2 can target them. Parameters fixed to 0.3
    for reproducibility. Ideal <Z_0> computed numerically in runner.
    """
    qc = QuantumCircuit(n_qubits, n_qubits)
    for rep in range(reps):
        for i in range(n_qubits):
            qc.ry(0.3, i)
            qc.rz(0.2, i)
            qc.t(i)  # non-Clifford
        for i in range(n_qubits - 1):
            qc.cx(i, i + 1)
    _measure_all(qc, n_qubits)
    return qc, 1.0
