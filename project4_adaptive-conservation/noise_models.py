"""Tunable noise models for benchmarking error-mitigation approaches.

Builds a local AerSimulator noise model with:
- depolarizing errors on single- and two-qubit gates
- configurable readout error probabilities

No IBM Quantum account needed — runs entirely on your laptop.
"""

from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError


def build_noise_model(
    single_qubit_error: float = 0.01,
    two_qubit_error: float = 0.03,
    readout_error: float = 0.05,
    seed: int = 42,
) -> NoiseModel:
    """Return a NoiseModel with depolarizing gate errors and readout error.

    Args:
        single_qubit_error: depolarizing probability per 1-qubit gate
        two_qubit_error: depolarizing probability per 2-qubit gate
        readout_error: bit-flip probability on measurement (symmetric)
        seed: RNG seed (noise_model construction is deterministic given fixed probs)
    """
    noise_model = NoiseModel()

    # Single-qubit depolarizing error on common gates
    one_q_err = depolarizing_error(single_qubit_error, 1)
    one_q_gates = [
        "id", "x", "y", "z", "h", "s", "sdg", "t", "tdg",
        "sx", "sxdg", "rx", "ry", "rz", "u1", "u2", "u3",
    ]
    noise_model.add_all_qubit_quantum_error(one_q_err, one_q_gates)

    # Two-qubit depolarizing error
    two_q_err = depolarizing_error(two_qubit_error, 2)
    two_q_gates = ["cx", "cz", "swap", "iswap", "cp", "crx", "cry", "crz"]
    noise_model.add_all_qubit_quantum_error(two_q_err, two_q_gates)

    # Symmetric readout error: |0> read as |1> with prob p, |1> read as |0> with prob p
    readout_err = ReadoutError([[1 - readout_error, readout_error],
                                 [readout_error, 1 - readout_error]])
    noise_model.add_all_qubit_readout_error(readout_err)

    return noise_model


def ideal_simulator():
    """A noiseless AerSimulator for reference (ideal) results."""
    from qiskit_aer import AerSimulator
    return AerSimulator()


def noisy_simulator(noise_model: NoiseModel):
    """An AerSimulator with the given noise model."""
    from qiskit_aer import AerSimulator
    return AerSimulator(noise_model=noise_model)
