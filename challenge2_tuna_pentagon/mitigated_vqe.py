"""H2 VQE on Tuna-17 WITH error mitigation (Qiskit Fall Fest Amsterdam 2026, Challenge 2).

Team Tuna Pentagon. Built on the organisers' base_vqe.py. The VQE itself is UNCHANGED:
same Hamiltonian, same 4-parameter ansatz, same COBYLA optimiser and MAXITER = 20.

Mitigation added (each can be switched on/off below, and its overhead is counted):
  1. FIXED PHYSICAL QUBITS  - choose the quietest connected pair from the Tuna-17 dashboard.
                              Needed anyway so the readout calibration matches the qubits used.
  2. READOUT CORRECTION     - 4 calibration circuits (|00>,|01>,|10>,|11>) in ONE extra job,
                              then every measured distribution is corrected with the inverse
                              confusion matrix. Pure post-processing: no extra gates.
  3. SYMMETRY POST-SELECTION- the H2 ground state has odd parity (ZZ = -1: only 01 or 10).
                              In the Z-basis circuit, shots reading 00 or 11 are errors and are
                              discarded. No extra circuits; costs only the discarded shots.
  4. ZNE (final evaluation) - every two-qubit gate G becomes G (G^-1 G)^k (scale 1, 3, 5) and the
                              energy is extrapolated to zero noise. Adds folded circuits only in
                              the final evaluation. ASK THE FACILITATOR whether folding counts as
                              "adding depth to the algorithm" before reporting it.

Run modes:  BACKEND_NAME = "Tuna-17" | "QX emulator" | "aer-noisy" (local test, no account).
"""
from __future__ import annotations

import itertools
import time

import matplotlib.pyplot as plt
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import ParameterVector
from qiskit.quantum_info import SparsePauliOp, Statevector
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from scipy.optimize import minimize

# ----------------------------------------------------------------------------- settings
import os
BACKEND_NAME = os.environ.get("VQE_BACKEND", "Tuna-17")
LAYOUT = None            # e.g. [5, 6]: physical qubits for logical qubits 0 and 1 (must be connected)
SHOTS = 4096
MAX_CIRCUITS_PER_JOB = 5  # Tuna-17 limit
JOB_TIMEOUT = 600         # seconds (organisers' tip: never more than 10 minutes)
MAXITER = 20              # DO NOT SET THIS HIGHER
N_FINAL_EVALS = 3         # repeated final evaluations (each one: raw + all mitigation variants)
USE_READOUT = True
USE_SYMMETRY = True
MITIGATE_DURING_OPT = True  # readout + symmetry inside the optimiser too (free: post-processing only)
ZNE_SCALES = (1, 3, 5)      # set to () to skip ZNE
SEED = 7

# ----------------------------------------------------------------------------- backend
if BACKEND_NAME == "aer-noisy":
    from qiskit_aer import AerSimulator
    from qiskit_aer.noise import NoiseModel, ReadoutError, depolarizing_error

    nm = NoiseModel()
    nm.add_all_qubit_quantum_error(depolarizing_error(0.004, 1), ["sx", "x", "rz"])
    nm.add_all_qubit_quantum_error(depolarizing_error(0.03, 2), ["cz", "cx"])
    nm.add_all_qubit_readout_error(ReadoutError([[0.97, 0.03], [0.06, 0.94]]))
    backend = AerSimulator(noise_model=nm, basis_gates=["sx", "x", "rz", "cz"], seed_simulator=SEED)
else:
    from qiskit_quantuminspire.qi_provider import QIProvider

    backend = QIProvider().get_backend(BACKEND_NAME)

# ----------------------------------------------------------------------------- problem (unchanged)
h2_hamiltonian = SparsePauliOp.from_list(
    [
        ("II", -1.0523732457728594),
        ("IZ", 0.39793742484317923),
        ("ZI", -0.39793742484317923),
        ("ZZ", -0.011280104256235324),
        ("XX", 0.18093119978423144),
    ]
)
NUCLEAR_REPULSION = 0.7199689944489797
n = 2
H_mat = h2_hamiltonian.to_matrix()
exact_total = np.linalg.eigvalsh(H_mat).min() + NUCLEAR_REPULSION
HF_TOTAL = -1.116998996754003

params = ParameterVector("t", 4)
ansatz = QuantumCircuit(n)
ansatz.x([0, 1])
ansatz.ry(params[0], 0)
ansatz.ry(params[1], 1)
ansatz.cx(0, 1)
ansatz.ry(params[2], 0)
ansatz.ry(params[3], 1)


def exact_energy(x):
    s = Statevector(ansatz.assign_parameters(list(x))).data
    return float((s.conj() @ H_mat @ s).real) + NUCLEAR_REPULSION


# Fixed layout so every circuit (VQE, calibration, folded) uses the same two physical qubits
pm_kwargs = {"target": backend.target, "optimization_level": 3, "seed_transpiler": SEED}
if LAYOUT is not None:
    pm_kwargs["initial_layout"] = list(LAYOUT)
pm = generate_preset_pass_manager(**pm_kwargs)

groups = h2_hamiltonian.group_commuting(qubit_wise=True)


def is_z_group(group):
    return all(set(lbl) <= {"I", "Z"} for lbl in group.paulis.to_labels())


def measurement_circuit(group):
    basis = {}
    for label in group.paulis.to_labels():
        for q, ch in enumerate(reversed(label)):
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


templates = [pm.run(measurement_circuit(g)) for g in groups]
if LAYOUT is None:  # remember the qubits the transpiler chose, so calibration uses the same ones
    lay = templates[0].layout
    LAYOUT = lay.final_index_layout() if lay is not None else [0, 1]  # simulators have no layout
    pm_kwargs["initial_layout"] = list(LAYOUT)
    pm = generate_preset_pass_manager(**pm_kwargs)
    templates = [pm.run(measurement_circuit(g)) for g in groups]
print("physical qubits used:", LAYOUT)
for g, t in zip(groups, templates):
    print("  group", g.paulis.to_labels(), "->", dict(t.count_ops()))

# ----------------------------------------------------------------------------- execution + overhead
OVERHEAD = {"jobs": 0, "circuits": 0, "shots": 0, "seconds": 0.0}


def run_in_chunks(circuits, tag):
    out = []
    for i in range(0, len(circuits), MAX_CIRCUITS_PER_JOB):
        chunk = circuits[i : i + MAX_CIRCUITS_PER_JOB]
        t0 = time.time()
        job = backend.run(chunk, shots=SHOTS)
        try:
            result = job.result(timeout=JOB_TIMEOUT)
        except TypeError:
            result = job.result()
        counts = result.get_counts()
        out.extend([counts] if isinstance(counts, dict) else counts)
        OVERHEAD["jobs"] += 1
        OVERHEAD["circuits"] += len(chunk)
        OVERHEAD["shots"] += len(chunk) * SHOTS
        OVERHEAD["seconds"] += time.time() - t0
        TAGS[tag] = TAGS.get(tag, 0) + len(chunk)
    return out


TAGS: dict[str, int] = {}


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


# ----------------------------------------------------------------------------- 2. readout correction


def calibration_circuits():
    circs = []
    for b in range(2**n):  # b = q1q0 as an integer, same convention as counts_to_probs
        qc = QuantumCircuit(n)
        for q in range(n):
            if b >> q & 1:
                qc.x(q)
        qc.measure_all()
        circs.append(pm.run(qc))
    return circs


def project_simplex(v):
    u = np.sort(v)[::-1]
    css = np.cumsum(u) - 1
    k = np.nonzero(u - css / np.arange(1, len(v) + 1) > 0)[0][-1]
    return np.maximum(v - css[k] / (k + 1), 0)


M_INV = None
if USE_READOUT:
    cal = run_in_chunks(calibration_circuits(), "readout calibration")
    M = np.column_stack([counts_to_probs(c) for c in cal])  # M[measured, prepared]
    M_INV = np.linalg.inv(M)
    print("readout confusion matrix (columns = prepared 00,01,10,11):\n", np.round(M, 3))


def correct(probs, readout=True, symmetry=True, z_group=False):
    p = probs
    if readout and M_INV is not None:
        p = project_simplex(M_INV @ p)
    kept = 1.0
    if symmetry and z_group:  # keep odd parity only: |01> (index 1) and |10> (index 2)
        mask = np.array([0, 1, 1, 0], float)
        kept = float((p * mask).sum())
        p = p * mask / kept
    return p, kept


def energy_from_counts(all_counts, readout, symmetry):
    e, kept = NUCLEAR_REPULSION, 1.0
    for g, c in zip(groups, all_counts):
        p, k = correct(counts_to_probs(c), readout, symmetry, is_z_group(g))
        kept = min(kept, k)
        e += expectation(g, p)
    return e, kept


def bound_circuits(x, scale=1):
    out = []
    for tpl in templates:
        pv = {p: v for p, v in zip(params, x) if p in tpl.parameters}
        out.append(fold_two_qubit_gates(tpl.assign_parameters(pv), scale))
    return out


# ----------------------------------------------------------------------------- 4. ZNE folding


def fold_two_qubit_gates(qc, scale):
    if scale == 1:
        return qc
    out = qc.copy_empty_like()
    for inst in qc.data:
        out.append(inst)
        if inst.operation.num_qubits == 2 and inst.operation.name not in ("barrier", "measure"):
            for _ in range((scale - 1) // 2):
                out.append(inst.operation.inverse(), inst.qubits)
                out.append(inst.operation, inst.qubits)
    return out


# ----------------------------------------------------------------------------- VQE (optimiser unchanged)
history, history_raw = [], []


def cost(x):
    counts = run_in_chunks(bound_circuits(x), "VQE iterations")
    raw, _ = energy_from_counts(counts, False, False)
    mit, _ = energy_from_counts(counts, USE_READOUT, USE_SYMMETRY)
    history_raw.append(raw)
    history.append(mit)
    print(f"iter {len(history)}: raw {raw:.5f}  mitigated {mit:.5f}  (noiseless {exact_energy(x):.5f}) Ha")
    return mit if MITIGATE_DURING_OPT else raw


res = minimize(cost, np.zeros(len(params)), method="cobyla", options={"maxiter": MAXITER, "rhobeg": 0.3})
x_opt = res.x

# ----------------------------------------------------------------------------- final evaluation
rows = {"raw": [], "readout": [], "readout + symmetry": [], "ZNE linear": [], "ZNE Richardson": []}
kept_frac = []
for _ in range(N_FINAL_EVALS):
    scales = tuple(ZNE_SCALES) or (1,)
    batch = [c for s in scales for c in bound_circuits(x_opt, s)]  # all scales together: fewer jobs
    counts = run_in_chunks(batch, "final evaluation (incl. ZNE folds)")
    k_per = len(templates)
    scaled = {s: counts[i * k_per : (i + 1) * k_per] for i, s in enumerate(scales)}
    c1 = scaled[1]
    rows["raw"].append(energy_from_counts(c1, False, False)[0])
    rows["readout"].append(energy_from_counts(c1, True, False)[0])
    e_sym, k = energy_from_counts(c1, True, True)
    rows["readout + symmetry"].append(e_sym)
    kept_frac.append(k)
    if len(ZNE_SCALES) >= 2:
        xs = np.array(ZNE_SCALES, float)
        ys = np.array([energy_from_counts(scaled[s], USE_READOUT, USE_SYMMETRY)[0] for s in ZNE_SCALES])
        rows["ZNE linear"].append(float(np.polyval(np.polyfit(xs, ys, 1), 0)))
        rows["ZNE Richardson"].append(float(np.polyval(np.polyfit(xs, ys, len(xs) - 1), 0)))

print(f"\nFinal parameters: {np.round(x_opt, 4)}")
print(f"Noiseless energy of that state (emulator check): {exact_energy(x_opt):.5f} Ha")
print(f"Exact ground state: {exact_total:.5f} Ha   Hartree-Fock: {HF_TOTAL:.5f} Ha\n")
print(f"{'method':22s} {'energy (Ha)':>14s} {'error (mHa)':>12s}")
summary = []
for name, vals in rows.items():
    if vals:
        v = np.array(vals)
        summary.append((name, v.mean(), v.std()))
        print(f"{name:22s} {v.mean():9.5f}±{v.std():.4f} {1000 * (v.mean() - exact_total):10.1f}")
print(f"\nSymmetry post-selection kept {np.mean(kept_frac):.1%} of Z-basis shots")
print("Overhead (circuits by purpose):", TAGS)
print(f"Totals: {OVERHEAD['jobs']} jobs, {OVERHEAD['circuits']} circuits, "
      f"{OVERHEAD['shots']:,} shots, {OVERHEAD['seconds']:.0f} s wall time")

fig, (a1, a2) = plt.subplots(1, 2, figsize=(12, 4))
a1.plot(range(1, len(history_raw) + 1), history_raw, label="raw")
a1.plot(range(1, len(history) + 1), history, label="readout + symmetry")
for a in (a1,):
    a.axhline(exact_total, color="k", ls="--", label="Exact")
    a.axhline(HF_TOTAL, color="gray", ls=":", label="Hartree-Fock")
a1.set_xlabel("Iteration"); a1.set_ylabel("Energy (Ha)"); a1.legend(); a1.set_title("VQE on " + BACKEND_NAME)
names = [s[0] for s in summary]
errs = [1000 * (s[1] - exact_total) for s in summary]
a2.bar(names, errs, yerr=[1000 * s[2] for s in summary], color="C0")
a2.axhline(1000 * (HF_TOTAL - exact_total), color="C3", ls="--", label="Hartree-Fock (20.3 mHa)")
a2.axhline(1.6, color="k", ls=":", label="chemical accuracy")
a2.set_ylabel("error vs exact (mHa)"); a2.legend(); a2.tick_params(axis="x", rotation=20)
a2.set_title("Final parameters, mitigation step by step")
plt.tight_layout(); plt.savefig("mitigation_results.png", dpi=150)
print("Saved mitigation plot: mitigation_results.png")
import sys
if BACKEND_NAME != "aer-noisy" and sys.stdout.isatty():
    plt.show()
