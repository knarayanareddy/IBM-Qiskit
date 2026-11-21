# IBM Qiskit — Error Mitigation Lab & Tuna-17 VQE

Comprehensive quantum error mitigation toolset, interactive web lab, offline single-file bundles, and $H_2$ VQE hardware benchmarks targeting **Quantum Inspire Tuna-17** and **Qiskit Aer** (Qiskit Fall Fest 2026).

---

## 🚀 Repository Structure

```
.
├── dist/index.html                  # Single-file production bundle of the main Lab (offline-ready)
├── index.html                       # Web app entry point (Vite + React 19 + Tailwind)
├── package.json                     # Dependencies for the main interactive prototype
├── src/                             # Core interactive web lab source
│   ├── pages/                       # Lab, Compare, Playbook, Ideas, Clifford Regression, Virtual Distillation, Overhead
│   ├── components/                  # Quantum circuits, histograms, noise knobs, charts
│   └── lib/                         # Quantum simulators, state management, metadata
├── ideas-repo/                      # 4 project walkthroughs & interactive tour
│   └── dist/index.html              # Standalone single-file bundle
├── quantum-error-mitigation-curriculum/ # Step-by-step error mitigation lessons, demos, & sandbox
│   └── dist/index.html              # Standalone single-file bundle
└── h2_vqe_tuna17/                   # H2 VQE error mitigation on Quantum Inspire Tuna-17
    ├── experiments/                 # h2_vqe_challenge.py, h2_vqe_tuna17_hardware_test.py
    ├── core/                        # Adaptive conservation, budget meter, scorecard
    └── h2_vqe_error_mitigation_dashboard.html # Interactive results dashboard
```

---

## ⚡ Quick Start (Web Prototype)

### 1. Run with Node.js
```bash
# Clone the repository
git clone https://github.com/knarayanareddy/IBM-Qiskit.git
cd IBM-Qiskit

# Install dependencies (Node 20+)
npm install

# Start local dev server
npm run dev
# -> Opens http://localhost:5173/
```

### 2. Zero-dependency Offline Access (Airplane Mode)
Open `dist/index.html` directly in any browser:
```bash
# macOS
open dist/index.html

# Linux
xdg-open dist/index.html
```
No web server, node, or internet connection required.

---

## 🧭 Navigation & Hash Routes

| URL Route | Feature / Tool | Description |
| :--- | :--- | :--- |
| `#/overview` | **Decision Helper** | Algorithmic feature toggles to select the best mitigation technique |
| `#/lab` | **Prototype Lab** | Circuit builder/editor, noise parameter tuning, and live histogram simulation |
| `#/compare` | **Before → After Scorecard** | Benchmark scorecard, Budget Meter, noise sweeps, CSV/JSON export |
| `#/ideas` | **New Ideas** | 7 error mitigation projects with effort and feasibility time-boxes |
| `#/overhead` | **Overhead Wall** | Scaling analysis of mitigation cost versus circuit depth |
| `#/vd` | **Virtual Distillation** | Multi-copy state purification demonstration |
| `#/cdr` | **Clifford Data Regression** | Near-Clifford training and polynomial error model regression |
| `#/playbook` | **Playbook** | Hackathon pitch skeleton, checklists, and baseline templates |

---

## 🔬 Quantum Inspire Tuna-17 Hardware Benchmark

Located in [`h2_vqe_tuna17/`](./h2_vqe_tuna17):

### 1. Setup Python Environment
```bash
cd h2_vqe_tuna17
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Verify Tuna-17 Hardware Connectivity
```bash
python experiments/h2_vqe_tuna17_hardware_test.py --armed --shots 1024
```

### 3. Run 9-Technique Benchmark Sweep
```bash
python experiments/h2_vqe_challenge.py --noise tuna17 --shots 4096
```

### Benchmark Results ($H_2$ Ground State Energy)

- **FCI Ground Truth**: `-1.13731 Ha`
- **Hartree-Fock (HF)**: `-1.11700 Ha`

| Method | Energy (Ha) | Error vs Optimal | Error vs HF | Retention |
| :--- | :---: | :---: | :---: | :---: |
| **Symmetry Verification** | **-1.13352** | **0.00378** | 0.01653 | 75.8% |
| **Readout Mitigation (TREX)** | **-1.11937** | **0.01794** | 0.00237 | 100.0% |
| **Adaptive Conservation** | **-1.11888** | **0.01842** | 0.00188 | 100.0% |
| **Clifford Data Regression** | **-1.11306** | **0.02425** | 0.00394 | 100.0% |
| **Raw (Unmitigated)** | **-1.08504** | **0.05226** | 0.03196 | 100.0% |
| **ZNE (Gate Folding)** | **-1.08206** | **0.05524** | 0.03494 | 100.0% |

Interactive results viewer: [`h2_vqe_tuna17/h2_vqe_error_mitigation_dashboard.html`](./h2_vqe_tuna17/h2_vqe_error_mitigation_dashboard.html).

---

## 🏆 Challenge 2: Team Tuna Pentagon (Real Hardware Run)

Located in [`challenge2_tuna_pentagon/`](./challenge2_tuna_pentagon):

Executed live on Quantum Inspire's physical **Tuna-17** superconducting processor (27 batch jobs, 62 circuits, 253,952 shots, 583 s wall time).

| Mitigation Stage | Tuna-17 Measured Energy (Ha) | Error vs. Exact | vs. Hartree-Fock | Error Reduced |
| :--- | :---: | :---: | :---: | :---: |
| **Raw Unmitigated Hardware** | $-1.04756 \pm 0.0031$ | $89.7\text{ mHa}$ | $+69.4\text{ mHa}$ | Baseline ($0\%$) |
| **+ Readout Inversion (TREX)** | $-1.08167 \pm 0.0033$ | $55.6\text{ mHa}$ | $+35.3\text{ mHa}$ | $38.0\%$ |
| **+ Symmetry Post-Selection ($ZZ=-1$)** | $-1.10851 \pm 0.0049$ | $28.8\text{ mHa}$ | $+8.5\text{ mHa}$ | $67.9\%$ ($96.3\%$ shots kept) |
| **+ Zero-Noise Extrapolation (Linear)** | **$-1.12026 \pm 0.0065$** | **$17.0\text{ mHa}$** | **$-3.3\text{ mHa}$ (Beats HF)** | **$81.0\%$** |
| **+ Zero-Noise Extrapolation (Richardson)** | $-1.10446 \pm 0.0095$ | $32.8\text{ mHa}$ | $+12.5\text{ mHa}$ | $63.4\%$ ($0.8\text{ mHa}$ in sim) |

- **Slide Deck & Answers**: [`challenge2_tuna_pentagon/PITCH_DECK.md`](./challenge2_tuna_pentagon/PITCH_DECK.md)
- **Interactive Presentation**: [`challenge2_tuna_pentagon/pitch_deck.html`](./challenge2_tuna_pentagon/pitch_deck.html)
- **Mitigation Chart**: [`challenge2_tuna_pentagon/mitigation_results.png`](./challenge2_tuna_pentagon/mitigation_results.png)

---

## 📄 License
Apache-2.0
