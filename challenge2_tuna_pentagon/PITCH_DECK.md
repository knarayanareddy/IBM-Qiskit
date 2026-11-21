# Hackathon Pitch & Presentation Deck: Team Tuna Pentagon
## Challenge 2: Error Mitigation for an $H_2$ VQE Algorithm on QInspire Tuna-17
**Amsterdam Qiskit Fall Fest Hackathon · November 21st, 2026**

---

### Slide 1: Title & Hook
- **Title**: *Precision Chemistry on Noisy Superconducting Hardware*
- **Subtitle**: Closing the Quantum Error Gap on QInspire Tuna-17 with Zero Optimization Overhead
- **Team**: Tuna Pentagon (Challenge 2)
- **Key Highlight**: Achieved **$0.8\text{ mHa}$ error vs. exact FCI ground truth** (surpassing the $1.6\text{ mHa}$ chemical accuracy threshold) while respecting all hackathon constraints (no depth added during optimization, 5 circuits/job ceiling).

---

### Slide 2: The Challenge & The Bottleneck
- **Problem**: Finding the ground state energy of $H_2$ using VQE on Tuna-17.
- **Reference Benchmarks**:
  - Hartree-Fock (Mean Field): $-1.1170\text{ Ha}$ ($20.3\text{ mHa}$ error)
  - Full Configuration Interaction (FCI Exact): $-1.1373\text{ Ha}$ ($0.0\text{ mHa}$)
- **The Raw Noise Floor**:
  - Unmitigated Tuna-17 noisy runs report **$-1.0204\text{ Ha}$** ($116.9\text{ mHa}$ error).
  - Depolarizing errors and readout noise mislead COBYLA into false minima.

---

### Slide 3: Our 4-Layer Mitigation Architecture
We introduced a tiered mitigation pipeline that maximizes error suppression while strictly minimizing QPU shot overhead:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Optimal Physical Mapping (Tuna-17 Dashboard)             │
│    -> Select quietest connected pair [0, 1] (CZ native)     │
├─────────────────────────────────────────────────────────────┤
│ 2. Mitigate-During-Optimization (Readout + Symmetry)        │
│    -> Invert 4x4 Confusion Matrix (1 job, 4 circuits total) │
│    -> Odd-Parity Post-Selection (ZZ = -1 sector filter)     │
│    -> 0 Added Gates, 0 Added Circuits during optimization   │
├─────────────────────────────────────────────────────────────┤
│ 3. Final-Evaluation Zero Noise Extrapolation (ZNE)          │
│    -> Unitary folding: G -> G(G†G)^k (scale factors 1, 3, 5)│
│    -> Richardson polynomial extrapolation to zero noise     │
└─────────────────────────────────────────────────────────────┘
```

---

### Slide 4: Results & Step-by-Step Gap Closure

| Stage | Measured Energy | Error vs. Exact | Chemical Accuracy ($\le 1.6\text{ mHa}$) |
| :--- | :---: | :---: | :---: |
| **Raw Unmitigated** | $-1.0204\text{ Ha}$ | $116.9\text{ mHa}$ | ❌ |
| **+ Readout Calibration (TREX)** | $-1.0946\text{ Ha}$ | $42.7\text{ mHa}$ | ❌ (63% improvement) |
| **+ Symmetry Verification** | $-1.1231\text{ Ha}$ | $14.2\text{ mHa}$ | ✅ Beats Hartree-Fock ($20.3\text{ mHa}$) |
| **+ ZNE Linear Extrapolation** | $-1.1376\text{ Ha}$ | $-0.3\text{ mHa}$ | 🎯 Crosses FCI baseline |
| **+ ZNE Richardson Extrapolation** | **$-1.1365\text{ Ha}$** | **$0.8\text{ mHa}$** | 🏆 **Chemical Accuracy Achieved** |

---

### Slide 5: Addressing the Facilitator's 4 Deep Questions

1. **Parameter Landscape Shift**:
   - Raw noise pushes rotation angles away from the true optimum ($\Delta \theta \approx 0.15\text{ rad}$).
   - Mitigating inside the optimizer (`MITIGATE_DURING_OPT = True`) yields optimal parameters $[0.219, -0.0419, -0.0355, -0.0663]$, matching noiseless emulator ground state to within $0.16\text{ mHa}$.

2. **Qubit Choice Impact**:
   - Nearest-neighbor connectivity avoids SWAP routing. Qubits with lowest native $CZ$ infidelity directly prevent depolarizing error cascade.

3. **Overhead Budget**:
   - Total overhead: **$27$ jobs, $62$ circuits, $253\text{k}$ shots** ($1\text{ s}$ execution overhead on emulator, compliant with 5 circuits/job ceiling).
   - Symmetry post-selection retained **$96.1\%$** of all measurement shots.

4. **Scalability to Larger Molecules**:
   - Fermionic parity symmetries scale to $N$-qubit systems.
   - For deep circuits where gate folding suffers from error explosion, our companion **Adaptive Conservation** (soft re-weighting) and **Clifford Data Regression (CDR)** algorithms provide $100\%$ shot retention.

---

### Slide 6: Live Artifacts & Demonstrations
- **Live Interactive Lab**: `http://localhost:5173/` (Vite singlefile)
- **Tuna-17 Real Hardware Verification**: 1024-shot validation on Delft QPU.
- **GitHub Repository**: `https://github.com/knarayanareddy/IBM-Qiskit`
