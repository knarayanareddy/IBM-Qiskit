export interface ProjectMeta {
  id: 1 | 2 | 3 | 4;
  name: string;
  short: string;
  tagline: string;
  color: string; // tailwind-free hex
  icon: string;
  bestWhen: string;
  inspired: string;
  folder: string;
  v2: string[];
}

export const PROJECTS: ProjectMeta[] = [
  {
    id: 1,
    name: 'Symmetry-Resolved Mitigation',
    short: 'Symmetry PS',
    tagline: 'A parity ancilla checks a conserved quantity inside the same run — post-select on a clean syndrome.',
    color: '#22d3ee',
    icon: '⚖',
    bestWhen: 'Algorithm has parity / particle-number / Hamming-weight symmetry',
    inspired: 'Iwaki et al. — virtual purification inside a single state',
    folder: 'project1_symmetry-mitigation',
    v2: ['Two independent parity checks (mid + end)', 'Readout correction stacked on survivors', 'Error bars through the whole pipeline'],
  },
  {
    id: 2,
    name: 'Non-Clifford-Targeted ZNE',
    short: 'NC-ZNE',
    tagline: 'Fold T gates (T†T = I) to amplify only non-Clifford noise, then extrapolate to zero.',
    color: '#fbbf24',
    icon: '∿',
    bestWhen: 'Algorithm uses T / Toffoli gates',
    inspired: 'Layden et al. — error mitigation for non-Clifford gates',
    folder: 'project2_nonclifford-zne',
    v2: ['Fold CX as well as T (removes the Clifford-noise floor)', 'Exponential, shot-noise-weighted extrapolation', 'Bootstrap confidence band'],
  },
  {
    id: 3,
    name: 'Hybrid QEM + Error Detection',
    short: 'Hybrid QEM/QEC',
    tagline: 'A 3-qubit repetition code flags bit-flips; discard flagged shots, readout-mitigate the rest.',
    color: '#a78bfa',
    icon: '⛨',
    bestWhen: 'You can spare qubits for ancillas',
    inspired: 'IBM Research — QEM and QEC as a continuum',
    folder: 'project3_hybrid-qem',
    v2: ['Posterior-gated decoding instead of blanket discard', 'Models syndrome-bit (ancilla) errors', 'τ knob trades shots for accuracy'],
  },
  {
    id: 4,
    name: 'Adaptive Conservation Post-Selection',
    short: 'Soft PS',
    tagline: 'Soft-reweight every shot by P(true weight = target | observed) using a measured confusion matrix.',
    color: '#34d399',
    icon: '◐',
    bestWhen: 'Output obeys fixed Hamming weight / particle number',
    inspired: 'Marchenkova — error mitigation vs. post-selection',
    folder: 'project4_adaptive-conservation',
    v2: ['EM / iterative Bayesian unfolding learns the prior', 'Honest metric: P(target | symmetry) vs. ceiling', 'Effective-sample-size reporting'],
  },
];

export const PHASES = ['Problem', 'Circuit', 'Noisy run', 'Mitigate', 'Results', 'On the day'];
