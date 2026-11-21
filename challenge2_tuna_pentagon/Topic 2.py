# 2-qubit H2 VQE on Quantum Inspire's Tuna-17.

import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import minimize

from qiskit import QuantumCircuit
from qiskit.circuit import ParameterVector
from qiskit.quantum_info import SparsePauliOp, Statevector
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

SHOTS = 4096  # shots per measurement circuit
MAX_CIRCUITS_PER_JOB = 5  # Tuna-17 allows at most 5 circuits per batch job
JOB_TIMEOUT = 1200  # seconds to wait for each job
MAXITER = 20  # DO NOT SET THIS HIGHER
N_FINAL_EVALS = 5  # repeated evaluations of the final parameters


from qiskit_quantuminspire.qi_provider import QIProvider

provider = QIProvider()
print(provider.backends())
backend = provider.get_backend("Tuna-17")

# 2-qubit H2 Hamiltonian (electronic part)
h2_hamiltonian = SparsePauliOp.from_list(
    [
        ("II", -1.0523732457728594),
        ("IZ", 0.39793742484317923),
        ("ZI", -0.39793742484317923),
        ("ZZ", -0.011280104256235324),
        ("XX", 0.18093119978423144),
    ]
)
NUCLEAR_REPULSION = 0.7199689944489797  # Hartree

n = 2
H_mat = h2_hamiltonian.to_matrix()
exact_total = np.linalg.eigvalsh(H_mat).min() + NUCLEAR_REPULSION
HF_TOTAL = -1.116998996754003  # Hartree-Fock energy
print("Exact total ground state energy (Hartree):", exact_total)
print("Hartree-Fock total energy (Hartree):      ", HF_TOTAL)

params = ParameterVector("t", 4)
ansatz = QuantumCircuit(n)
ansatz.x([0, 1])
ansatz.ry(params[0], 0)
ansatz.ry(params[1], 1)
ansatz.cx(0, 1)
ansatz.ry(params[2], 0)
ansatz.ry(params[3], 1)


def exact_energy(x):
    """Noiseless energy of the state the ansatz prepares (diagnostic only)."""
    s = Statevector(ansatz.assign_parameters(list(x))).data
    return float((s.conj() @ H_mat @ s).real) + NUCLEAR_REPULSION

pm = generate_preset_pass_manager(
    target=backend.target, optimization_level=3
)

# Qubit-wise commuting groups: {II, IZ, ZI, ZZ} (measure in Z) and {XX} (measure in X).
groups = h2_hamiltonian.group_commuting(qubit_wise=True)

def measurement_circuit(group):
    basis = {}
    for label in group.paulis.to_labels():
        for q, ch in enumerate(reversed(label)):  # qubit 0 is the rightmost character
            if ch != "I":
                basis[q] = ch
    qc = ansatz.copy()
    for q, ch in basis.items():
        if ch == "X":
            qc.h(q)
        elif ch == "Y":
            qc.sdg(q)
            qc.h(q)
    qc.measure_all()
    return qc


logical_circuits = [measurement_circuit(g) for g in groups]
templates = [pm.run(c) for c in logical_circuits]
print(f"{len(h2_hamiltonian)} Pauli terms -> {len(groups)} measurement circuits")
for g, t in zip(groups, templates):
    print("  group", g.paulis.to_labels(), "->", dict(t.count_ops()))


def run_in_chunks(circuits):
    """Run circuits in jobs of at most MAX_CIRCUITS_PER_JOB; return a list of count dicts."""
    out = []
    for i in range(0, len(circuits), MAX_CIRCUITS_PER_JOB):
        chunk = circuits[i : i + MAX_CIRCUITS_PER_JOB]
        job = backend.run(chunk, shots=SHOTS)
        print("submitted job", job.job_id())
        try:
            result = job.result(timeout=JOB_TIMEOUT)
        except TypeError:  # this version's result() takes no timeout argument
            result = job.result()
        counts = result.get_counts()
        out.extend([counts] if isinstance(counts, dict) else counts)
    return out


def _bits(key):
    key = key.replace(" ", "")
    return int(key, 16) if key.startswith("0x") else int(key, 2)


def counts_to_probs(counts):
    p = np.zeros(2**n)
    for k, c in counts.items():
        p[_bits(k)] += c
    return p / p.sum()


def expectation(group, probs):
    total = 0.0
    for label, coeff in zip(group.paulis.to_labels(), group.coeffs.real):
        mask = sum(1 << q for q, ch in enumerate(reversed(label)) if ch != "I")
        parity = np.array([(-1) ** bin(b & mask).count("1") for b in range(2**n)])
        total += coeff * float(parity @ probs)
    return total


def energy(x):
    """Raw measured total energy (Hartree) for parameters x: no mitigation of any kind."""
    bound = []
    for tpl in templates:
        pv = {p: v for p, v in zip(params, x) if p in tpl.parameters}
        bound.append(tpl.assign_parameters(pv))
    all_counts = run_in_chunks(bound)
    e = sum(
        expectation(g, counts_to_probs(c)) for g, c in zip(groups, all_counts)
    )
    return e + NUCLEAR_REPULSION

history = []

def cost(x):
    e = energy(x)
    history.append(e)
    print(f"iter {len(history)}: E = {e:.5f} Ha")
    return e


res = minimize(
    cost, np.zeros(len(params)), method="cobyla",
    options={"maxiter": MAXITER, "rhobeg": 0.3},
)
x_opt = res.x

# Final numbers. res.fun is the lowest *noisy* reading, which is biased low by luck
final = np.array([energy(x_opt) for _ in range(N_FINAL_EVALS)])
print(f"\nFinal parameters: {np.round(x_opt, 4)}")
print(f"Measured energy at final parameters: {final.mean():.5f} +/- {final.std():.5f} Ha")
print(f"True (noiseless) energy of that state: {exact_energy(x_opt):.5f} Ha")
print(f"Exact ground state: {exact_total:.5f} Ha   Hartree-Fock: {HF_TOTAL:.5f} Ha")

fig, ax = plt.subplots()
ax.plot(range(1, len(history) + 1), history, label="VQE (raw)")
ax.axhline(exact_total, color="k", linestyle="--", label="Exact")
ax.axhline(HF_TOTAL, color="gray", linestyle=":", label="Hartree-Fock")
ax.set_xlabel("Iterations")
ax.set_ylabel("Energy (Hartree)")
ax.legend()
plt.show()