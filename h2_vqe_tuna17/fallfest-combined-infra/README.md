# Qiskit Fall Fest 2026 — Combined Error-Mitigation Infra

This folder contains the **complete infrastructure** for the recommended combined hackathon plan:

> **Project 4 (Adaptive Conservation)** + **Scorecard (Idea 7)** + **Budget Meter (Idea 2)** + **Practise on stand-ins**

You can run the Python code now to validate the approach, then share the `SPECIFICATION.md` and `sonnet_prompt.md` files with another AI assistant (e.g. Sonnet) to build the visualization/prototype layer.

## Folder Structure

```
core/              # Reusable Python modules (adaptive conservation, scorecard, budget meter, stand-ins)
experiments/       # Runnable scripts that produce concrete results
data/              # Example outputs (JSON)
SPECIFICATION.md   # Architecture + what to build next
sonnet_prompt.md   # Copy-paste prompt to give to another AI for the prototype layer
requirements.txt   # Python dependencies
```

## Quick Start

```bash
cd /home/user/fallfest-combined-infra
pip install -r requirements.txt
python experiments/run_all_practice.py
```

This will:
1. Run adaptive conservation on 3 stand-in circuits (GHZ, Trotter step, fixed-weight VQE)
2. Compare against raw and readout-only baselines
3. Print a scorecard + budget meter summary

## What to Share with Another AI (for the prototype layer)

Give them these two files:
- `SPECIFICATION.md` — the technical architecture
- `sonnet_prompt.md` — the exact prompt to build an interactive React/Vite prototype

## Requirements

- Python 3.11+
- `qiskit>=1.0`
- `qiskit-aer>=0.14`
- `numpy>=1.24`

No IBM Quantum account needed — everything runs on local `AerSimulator` noise models.
