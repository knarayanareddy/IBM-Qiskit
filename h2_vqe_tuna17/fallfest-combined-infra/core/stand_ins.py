"""
Stand-in circuits for practise before the hackathon.

Three circuits to validate the adaptive conservation approach:
1. GHZ state — parity conservation law (even parity)
2. Trotter step — generic circuit with T gates (no conservation law)
3. Fixed-weight VQE ansatz — Hamming weight conservation (weight = 2)
"""

from __future__ import annotations

from qiskit import QuantumCircuit


def ghz_circuit(n_qubits: int = 3) -> QuantumCircuit:
    """GHZ state: (|0...0> + |1...1>)/sqrt(2).

    Conservation law: even parity.
    Note: |000> is even parity, |111> is odd parity (3 ones). The GHZ state
    is a superposition of both, so measuring parity gives ~50/50.
    For a true parity-conserving state, use |00> + |11> (Bell state) instead.
    """
    qc = QuantumCircuit(n_qubits, n_qubits)
    qc.h(0)
    for i in range(n_qubits - 1):
        qc.cx(i, i + 1)
    qc.measure_all()
    return qc


def bell_state(n_qubits: int = 2) -> QuantumCircuit:
    """Bell state: (|00> + |11>)/sqrt(2).

    Conservation law: even parity — both |00> and |11> have even parity.
    This is a better parity-conservation example than GHZ.
    """
    qc = QuantumCircuit(n_qubits, n_qubits)
    qc.h(0)
    qc.cx(0, 1)
    qc.measure_all()
    return qc


def trotter_step(n_qubits: int = 3, reps: int = 1) -> QuantumCircuit:
    """Trotter step circuit with Clifford + T gates.

    Structure: H on all, T on all, CNOT chain, RZ rotations, H on all, measure.
    No strict conservation law — good for testing generic mitigation.
    Observable: <Z_0>.
    """
    qc = QuantumCircuit(n_qubits, n_qubits)
    for rep in range(reps):
        for i in range(n_qubits):
            qc.h(i)
            qc.t(i)
        for i in range(n_qubits - 1):
            qc.cx(i, i + 1)
        for i in range(n_qubits):
            qc.rz(0.3, i)
        for i in range(n_qubits):
            qc.h(i)
    qc.measure_all()
    return qc


def fixed_weight_vqe(n_qubits: int = 4, reps: int = 1, target_weight: int = 2) -> QuantumCircuit:
    """Fixed-weight VQE-style ansatz.

    X gates set the excitations (target_weight qubits in |1>).
    Uses weight-conserving XX+YY interactions instead of CNOTs
    which would flip Hamming weight.
    Ideal: Hamming weight always == target_weight.
    Noise changes the weight.
    """
    qc = QuantumCircuit(n_qubits, n_qubits)
    for i in range(target_weight):
        qc.x(i)
    # Weight-conserving XX+YY interactions preserve total excitation number
    for i in range(n_qubits - 1):
        qc.h(i)
        qc.h(i + 1)
        qc.cx(i, i + 1)
        qc.cz(i, i + 1)
        qc.cx(i, i + 1)
        qc.h(i)
        qc.h(i + 1)
    qc.measure_all()
    return qc


STAND_INS = {
    "ghz": {
        "factory": ghz_circuit,
        "n_qubits": 3,
        "conservation_type": "parity",
        "target_weight": None,
        "observable": "parity",
        "ideal": 0.5,  # GHZ is superposition of even and odd parity
        "description": "GHZ state — parity (mixed even/odd)",
    },
    "bell": {
        "factory": bell_state,
        "n_qubits": 2,
        "conservation_type": "parity",
        "target_weight": None,
        "observable": "parity",
        "ideal": 1.0,  # Both |00> and |11> are even parity
        "description": "Bell state — even parity conservation",
    },
    "trotter": {
        "factory": trotter_step,
        "n_qubits": 3,
        "conservation_type": "none",
        "target_weight": None,
        "observable": "z0",
        "ideal": 0.5,
        "description": "Trotter step — Clifford + T gates, no conservation law",
    },
    "fixed_weight_vqe": {
        "factory": fixed_weight_vqe,
        "n_qubits": 4,
        "conservation_type": "weight",
        "target_weight": 2,
        "observable": "hamming_weight",
        "ideal": 1.0,
        "description": "Fixed-weight VQE ansatz — Hamming weight = 2",
    },
}


def get_stand_in(name: str) -> dict:
    """Get a stand-in circuit definition by name."""
    if name not in STAND_INS:
        raise ValueError(f"Unknown stand-in: {name}. Available: {list(STAND_INS.keys())}")
    return STAND_INS[name]
