import type { QuizQ } from "../components/ui";

export interface Lesson {
  id: number;
  title: string;
  short: string;
  emoji: string;
  minutes: number;
  badge: { name: string; emoji: string };
  goal: string;
  analogy: { title: string; text: string };
  concrete: string[];
  demoTitle: string;
  demoDo: string;
  reveals: { q: string; a: string }[];
  code?: { title: string; lang: string; code: string };
  means: string;
  files: { path: string; note: string }[];
  tryIt: string[];
  quiz: QuizQ[];
}

export const LESSONS: Lesson[] = [
  {
    id: 1,
    title: "What is a qubit? (the coin in mid-air)",
    short: "Qubit, superposition, measurement",
    emoji: "🪙",
    minutes: 15,
    badge: { name: "Coin Flipper", emoji: "🪙" },
    goal: "Explain a qubit, superposition and measurement without a single equation — and know why every chart in the repo is 'counts from many shots'.",
    analogy: {
      title: "A coin that hasn't landed yet",
      text: "A normal bit is a coin lying flat: heads (0) or tails (1). A qubit is a coin spinning in the air — until you catch it, it's a blend of both. Catching it (measuring) always gives a plain 0 or 1, never 'half'. And you only learn the spin's odds by catching many, many coins.",
    },
    concrete: [
      "Superposition = the coin is still spinning. It isn't 'secretly' heads or tails — the odds are all there is until you look.",
      "Measurement = catching the coin. After you catch it, it's just a plain 0 or 1 again.",
      "A shot = one full run of the circuit followed by one measurement. The repo defaults to 4096 shots.",
      "Counts / histogram = the tally of those 4096 answers. Every bar chart in the repo is exactly this.",
    ],
    demoTitle: "The spinning-coin lab",
    demoDo: "Press 'Measure ×1' five times (random!), then 'Measure ×100' (the bars settle near the recipe). Drag the slider to change the recipe.",
    reveals: [
      { q: "Is a qubit REALLY just a spinning coin?", a: "It's the right picture for this hackathon. The honest extra: a real qubit also carries a hidden 'direction' called phase, which lets different paths cancel or reinforce (interference). That's why the T gate in Lesson 2 matters. You don't need phase to understand error mitigation — you only need to know that measuring gives 0/1 with certain odds." },
      { q: "Why do we need thousands of shots?", a: "One measurement is a single random coin catch. To estimate the odds to within ±1% you need on the order of 10,000 catches (error shrinks like 1/√shots). Fewer shots → bumpier bars, even on perfect hardware. This is 'shot noise' and it's different from hardware noise." },
      { q: "How would I explain a qubit to a 10-year-old?", a: "“A normal computer bit is a coin lying flat — heads or tails. A qubit is a coin spinning in the air. While it spins it's kind of both. The moment you grab it, it becomes heads or tails. We spin and grab the same coin thousands of times to learn how it likes to land.”  ← Memorise this; it's on your self-assessment." },
    ],
    means: "When the repo says 'raw counts', 'histogram' or 'shots', it means this tally. Mitigation is all about getting a better tally from a noisy machine — or a better answer from the tally you already have.",
    files: [
      { path: "src/lib/simulator.ts", note: "sampleNoisyCounts() — draws the shots; DEFAULT_NOISE has shots: 4096" },
      { path: "src/components/Charts.tsx", note: "the histogram/chart components" },
      { path: "src/components/NoiseKnobs.tsx", note: "the 'Shots' knob (256 → 32,768)" },
    ],
    tryIt: [
      "Run the app (see Setup & Run) and open http://localhost:5173/#/lab",
      "Find the Shots knob. Set it to 256 and watch how jagged the histogram is.",
      "Drag it to 32768 and watch the bars smooth out — same circuit, same noise, just more catches.",
    ],
    quiz: [
      { q: "A qubit is in a perfect 50/50 superposition. You measure it 100 times. What do you expect?", options: ["Exactly 50 zeros and 50 ones, every time", "About 50/50, but not exactly", "All zeros", "A number like 0.5"], answer: 1, why: "Each catch is random; the tally only approximates the odds." },
      { q: "What can a single measurement return?", options: ["0 or 1", "Anything between 0 and 1", "A blend of 0 and 1", "A histogram"], answer: 0, why: "Measuring always collapses to a plain bit." },
    ],
  },
  {
    id: 2,
    title: "Quantum gates: H, X, CX and T",
    short: "H, X, CX/CNOT, T",
    emoji: "🚪",
    minutes: 20,
    badge: { name: "Gate Keeper", emoji: "🚪" },
    goal: "Know what the four gates in the repo do — by analogy — and build a Bell pair yourself.",
    analogy: {
      title: "Things you can do to a coin",
      text: "X turns the coin over. H gives it a spin. CX is a linked pair: 'if coin A shows 1, flip coin B'. T is a secret twist you can't see by looking — only later, after another gate, does it show up.",
    },
    concrete: [
      "X (NOT): 0 ↔ 1. The only gate that behaves like a classical bit.",
      "H (Hadamard): from a definite 0 → a perfect 50/50. Starts most circuits.",
      "CX (CNOT): two qubits. Flips the target if the control is 1. After H then CX → a Bell pair: the two results always agree.",
      "T: a small phase twist. Alone it's invisible; combined with H it changes results. It's a 'non-Clifford' gate — a flag in the repo's decision helper.",
    ],
    demoTitle: "Gate workshop",
    demoDo: "Click each gate card. Then press preset 'Bell' and 'GHZ'. Finally load 'H then T' and notice the histogram doesn't change when you add T — then add another H and see what happens.",
    reveals: [
      { q: "What is entanglement, in one breath?", a: "Two qubits whose results are linked: each alone is a fair coin flip, but together they always agree (Bell) — or always match across all three (GHZ). It's why 01 and 10 are 'impossible' outputs for a Bell pair, and that's what makes errors detectable." },
      { q: "Why does the repo care about 'T gates' and 'non-Clifford'?", a: "Circuits made only of Clifford gates (H, S, CX, X, Z…) can be simulated cheaply on a normal computer, which unlocks tricks like Clifford Data Regression (see src/pages/CliffordRegression.tsx). Add T gates and those tricks stop being straightforward — so 'T gates present?' is the first toggle in the decision helper, steering you toward ZNE-type methods." },
      { q: "Why are 2-qubit gates the villains?", a: "On real devices CX/ECR-type gates are roughly 10× noisier than single-qubit gates. The repo's default noise reflects this: 1% per 1-qubit gate, 3% per 2-qubit gate. Rule of thumb: count your two-qubit gates — that's your noise budget." },
    ],
    means: "Every circuit you'll see at the hackathon is built from these ideas. If you can say 'H makes randomness, CX copies it across qubits, T is the hard one', you can read 90% of the diagrams.",
    files: [
      { path: "src/lib/simulator.ts", note: "parseCircuit() — the full list of supported gates (h, x, t, cx, rzz, ccx, swap…)" },
      { path: "src/lib/meta.ts", note: "STAND_INS — Bell, GHZ, Trotter (T gates), VQE circuits as ready-made code" },
    ],
    tryIt: [
      "In the Lab, click the stand-in buttons: GHZ → Bell → Trotter step.",
      "Watch the header badge: it reports qubits · depth · gates for each.",
      "Which stand-in has T gates? (Trotter) Which has the most 2-qubit gates?",
    ],
    quiz: [
      { q: "After H on q0 followed by CX (control q0, target q1), which outputs appear?", options: ["00 and 11", "01 and 10", "All four equally", "Only 00"], answer: 0, why: "H randomises q0; CX copies that randomness onto q1, so they agree." },
      { q: "Which gate is invisible when measured directly but matters inside a circuit?", options: ["X", "T", "CX", "Measure"], answer: 1, why: "T only adds a phase; it shows up after later gates like H turn phase into probability." },
    ],
  },
  {
    id: 3,
    title: "Reading a circuit diagram",
    short: "Wires, boxes, ⊕ and meters",
    emoji: "📖",
    minutes: 20,
    badge: { name: "Circuit Reader", emoji: "📖" },
    goal: "Read any H/CX/measure diagram left-to-right and predict its output.",
    analogy: {
      title: "A piece of sheet music",
      text: "Each horizontal line is one instrument (qubit). Time flows left → right. Boxes are things the instrument does. A line joining two instruments means they play together (CX). The meter at the end is the recording microphone.",
    },
    concrete: [
      "Horizontal wire = one qubit, all starting at 0. q0 is the TOP wire.",
      "Box with a letter = a one-qubit gate (H, X, T…).",
      "● connected to ⊕ = CX: ● is the control, ⊕ the target.",
      "Meter/dial box = measurement. Results are read as bitstrings with q0 on the RIGHT (Qiskit's convention): q2 q1 q0.",
    ],
    demoTitle: "Click-to-decode",
    demoDo: "Click every part of the diagram and watch the matching line of Qiskit code light up. Before pressing 'reveal answer', predict which bitstrings will appear.",
    reveals: [
      { q: "Why is q0 on the right in results but on top in the picture?", a: "A historical Qiskit choice (little-endian bit order). In the picture, qubits are listed top-down q0, q1, q2. In result strings, the last character is q0. For symmetric circuits like Bell and GHZ it doesn't matter; for anything else it will bite you, so remember it when you compare counts to the diagram." },
      { q: "What's 'depth'?", a: "The number of columns of gates if you pack everything as far left as possible. Gates on different qubits can share a column. Depth × error rate is a quick feel for how noisy a run will be — the Lab's header badge shows it." },
      { q: "Can I paste Qiskit code instead of drawing?", a: "Yes — that's the intended workflow. The Lab accepts Qiskit Python (QuantumCircuit calls, even for-loops) or OpenQASM 2/3, draws the diagram for you, and reports 'parsed ✓' or an error. Max 12 qubits, 10 measured in the prototype." },
    ],
    code: {
      title: "The same Bell circuit — paste this into the Lab",
      lang: "python",
      code: `qc = QuantumCircuit(2, 2)   # 2 wires (qubits) + 2 classical result slots
qc.h(0)                     # H box on the top wire
qc.cx(0, 1)                 # ●──⊕ between q0 and q1
qc.measure_all()            # meter on every wire`,
    },
    means: "At the hackathon the organisers will reveal a circuit. You'll paste it into the Lab, check the diagram looks like what they described, and trust nothing until the parser says 'parsed ✓' with no warnings.",
    files: [
      { path: "src/components/QuantumCircuit.tsx", note: "diagram drawing in the main prototype" },
      { path: "ideas-repo/src/components/Circuit.tsx", note: "circuit diagrams in the four walkthroughs" },
      { path: "src/pages/Lab.tsx", note: "the paste box, file upload, parse status badges" },
    ],
    tryIt: [
      "Open #/lab, scroll to the circuit box and replace the text with the Bell code above.",
      "Look for the 'parsed ✓' badge and the new diagram.",
      "Add qc.cx(1, 0) as an extra line — predict how the histogram changes before checking.",
    ],
    quiz: [
      { q: "In the result string '011' for a 3-qubit circuit, which bit is q0?", options: ["The left '0'", "The middle '1'", "The right '1'", "None — it's unordered"], answer: 2, why: "Qiskit writes q0 as the right-most bit: q2 q1 q0." },
      { q: "In ●──⊕, what does the dot represent?", options: ["The target", "The control", "A measurement", "An error"], answer: 1, why: "The dot is the control; the ⊕ is flipped when the control is 1." },
      { q: "H then CX on a Bell circuit — which output should NEVER appear in a perfect run?", options: ["00", "11", "01", "Both 00 and 11"], answer: 2, why: "01 and 10 break the Bell pair's agreement — they can only come from noise." },
    ],
  },
  {
    id: 4,
    title: "Noise: why real answers are wrong",
    short: "Bit flips, readout errors, decoherence",
    emoji: "📻",
    minutes: 25,
    badge: { name: "Noise Hunter", emoji: "📻" },
    goal: "Name the three kinds of noise, say which one hurts most, and recognise their fingerprints in a histogram.",
    analogy: {
      title: "A shaky hand, a smudged scoreboard, melting ice cream",
      text: "Gate errors are a shaky hand pressing the wrong button. Readout errors are a smudged scoreboard: the game was fine but you misread it. Decoherence is melting ice cream — the longer the circuit takes, the more the qubit loses its quantum-ness (a '1' drifts back to '0').",
    },
    concrete: [
      "Gate (bit-flip) errors: each gate has a small chance of misfiring. 2-qubit gates are worst. Errors accumulate: 100 gates at 1% leaves only 37% chance of NO fault.",
      "Readout errors: the final measurement misreports a bit (commonly 1–5%). Fixable with calibration.",
      "Decoherence: qubits relax over time. Deeper circuits take longer → more drift.",
      "Result: impossible outcomes (like 01 for a Bell pair) appear. Their share is a handy thermometer for how noisy the run was.",
    ],
    demoTitle: "Noise lab",
    demoDo: "Drag each slider alone and notice how the red bars differ: readout error smears evenly, decoherence pulls toward 0s. Then switch circuit from Bell to VQE — same error rate, far more red.",
    reveals: [
      { q: "Which noise is easiest to fix?", a: "Readout. You can calibrate it: prepare |00…0⟩ and |11…1⟩, measure, and learn exactly how often each bit is misread (a 'confusion matrix'). Then undo it mathematically. Gate noise is much harder, which is why ZNE (Lesson 8) exists." },
      { q: "Why do deeper circuits get worse so fast?", a: "Fidelity roughly multiplies: (1−p)^gates. At p = 3% per 2-qubit gate: 10 gates → 74% fault-free, 50 gates → 21%, 100 gates → 5%. That exponential decay is also why mitigation costs explode with depth (see the 🧱 Overhead Wall page in the repo)." },
      { q: "Does the repo simulate real IBM hardware exactly?", a: "No — and it says so in the footer: 'Runs entirely in your browser: no Qiskit, no IBM account, no backend.' It uses simplified noise models (depolarising gate errors + symmetric readout flips) so you can build intuition fast. Treat numbers as illustrative; real hardware results come from the QPU at the event." },
    ],
    means: "Your job at the hackathon is NOT to remove noise — it's to show, with numbers, that your method moves the noisy histogram closer to the ideal one, honestly and cheaply.",
    files: [
      { path: "src/components/NoiseKnobs.tsx", note: "four knobs: 1-qubit gate error, 2-qubit gate error, readout error, shots" },
      { path: "src/lib/simulator.ts", note: "NoiseConfig, DEFAULT_NOISE (1% / 3% / 5% / 4096), sampleNoisyCounts, faultFreeProbability" },
      { path: "ideas-repo/src/lib/sims.ts", note: "the simulators behind the 4 project walkthroughs" },
      { path: "src/pages/Overhead.tsx", note: "how mitigation cost explodes with depth" },
    ],
    tryIt: [
      "In the Lab, set all noise knobs to 0 → raw histogram equals ideal.",
      "Raise ONLY readout error to 10% → note which outcomes get polluted.",
      "Reset, then raise ONLY 2-qubit gate error to 8% on the VQE stand-in.",
    ],
    quiz: [
      { q: "Which error shows up even if the circuit ran perfectly?", options: ["Gate error", "Readout error", "Decoherence", "Shot noise from too few shots"], answer: 1, why: "Readout error happens at the final measurement; the quantum state itself was fine. (Shot noise also appears with perfect hardware, but it's statistical, not hardware error.)" },
      { q: "You double circuit depth with the same per-gate error. The chance of zero faults…", options: ["doubles", "halves", "is squared (drops fast)", "stays the same"], answer: 2, why: "Fault-free probability multiplies per gate, so doubling the gates squares it." },
    ],
  },
  {
    id: 5,
    title: "Mitigation vs correction vs doing nothing",
    short: "Three ways to deal with noise",
    emoji: "🎧",
    minutes: 20,
    badge: { name: "Noise Canceller", emoji: "🎧" },
    goal: "Say in one sentence why mitigation ≠ correction, and demonstrate readout mitigation working (and not working).",
    analogy: {
      title: "Noise-cancelling headphones vs a soundproof studio",
      text: "Doing nothing is shouting on a train platform. Error mitigation is noise-cancelling headphones: the platform is still loud, but you clean up what reaches your ears. Error correction is building a soundproof studio: expensive, many walls (qubits), mostly not available yet.",
    },
    concrete: [
      "Do nothing: your baseline. Every improvement is measured against this ('Raw' row).",
      "Mitigation: noise still happens; you estimate and cancel its effect afterward, using extra runs or calibration data.",
      "Correction: encode one 'logical' qubit in many physical ones and fix errors live. Not what this hackathon is about.",
      "Rule: mitigation removes bias at the price of extra shots/circuits; it can't promise perfection.",
    ],
    demoTitle: "Headphones on, headphones off",
    demoDo: "Pick each strategy card. Then with gate error at 0, drag readout error up and watch purple (mitigated) hug green (ideal) while red drifts. Now raise gate error — the leftover red errors that purple can't fix are what the other lessons are about.",
    reveals: [
      { q: "The one-sentence version for judges", a: "“Error mitigation doesn't stop errors from happening — it uses extra measurements and models to estimate what the answer would have been without them, at the cost of more shots, and it's not a substitute for error correction.”" },
      { q: "What does readout mitigation actually do?", a: "It measures the 'confusion' (how often 0→1 and 1→0 flips happen), writes that as a matrix, and applies its inverse to your counts. In the demo above: invertReadout() — then clip negatives and renormalise. The repo does the same in simulator.ts: calibrateReadout → mitigateReadout." },
      { q: "Why isn't mitigation 'free'?", a: "Either you run more circuits (calibration, noise-scaled copies for ZNE) or you throw shots away (post-selection), or you amplify statistical wobble when you invert noise. The repo's Budget Meter on the Compare page puts a number on this: QPU seconds per effective shot." },
    ],
    means: "At the event you'll be asked: 'what did you do about noise?' Always answer with three things: the baseline (do nothing), your mitigation, and what it cost.",
    files: [
      { path: "src/lib/simulator.ts", note: "calibrateReadout(), denseConfusion(), mitigateReadout()" },
      { path: "src/pages/Compare.tsx", note: "Before → After page with the Budget Meter" },
      { path: "src/lib/meta.ts", note: "buildBudgetMeter(), secondsPerEffectiveShot()" },
      { path: "src/pages/Overhead.tsx", note: "the 'Overhead Wall' — when mitigation becomes impractical" },
    ],
    tryIt: [
      "Open #/compare and find the Budget Meter panel.",
      "Which method costs the most QPU seconds? Which gives the cheapest effective shot?",
      "Open #/overhead and slide depth upward to see where methods 'hit the wall'.",
    ],
    quiz: [
      { q: "Error mitigation vs error correction — the key difference?", options: ["Mitigation is just a newer name", "Mitigation estimates the clean answer after noisy runs; correction fixes errors during the computation using many qubits", "Correction is cheaper", "They are the same for hackathons"], answer: 1, why: "Mitigation is post-processing + extra runs; correction needs lots of physical qubits." },
      { q: "Readout mitigation can fix…", options: ["All noise", "Only measurement misreads", "Only T-gate errors", "Nothing"], answer: 1, why: "It models and removes measurement confusion. Gate errors need other tools." },
    ],
  },
  {
    id: 6,
    title: "Conservation laws: parity & Hamming weight",
    short: "Hidden rules that expose errors",
    emoji: "⚖️",
    minutes: 20,
    badge: { name: "Law Keeper", emoji: "⚖️" },
    goal: "Spot a conservation law in a circuit and explain why it lets you tell some wrong outputs from right ones.",
    analogy: {
      title: "The bus with exactly two passengers",
      text: "Imagine a bus that always has exactly 2 passengers. If you count 3 or 1, someone miscounted — you didn't need to know who. A circuit that preserves 'how many 1s' works the same way: any output with the wrong count is provably an error.",
    },
    concrete: [
      "Parity: is the number of 1s even or odd? A Bell pair only produces even outputs (00, 11).",
      "Hamming weight: exactly how many 1s. Fixed-weight chemistry circuits keep it constant (e.g. always 2 excitations).",
      "A law lets you label every possible output 'legal' or 'forbidden' — without knowing the exact answer.",
      "Limits: laws catch many errors but not all (two flips can cancel parity), and some circuits have no law at all.",
    ],
    demoTitle: "Legal or forbidden?",
    demoDo: "Pick a law and see which of the 16 outputs stay green. Click bits to flip them and read how often single and double flips get caught.",
    reveals: [
      { q: "Where do I find the law for MY circuit?", a: "Two ways: (1) think — does the algorithm preserve a count of excitations or a symmetry? (2) run the IDEAL simulation in the Lab and look at which outputs appear. The repo even has a 'suggestLaw' helper and a 'detected from ideal' hint. Always verify; the GHZ stand-in is a deliberate trap — its ideal output 111 violates 'even parity'." },
      { q: "Why does a bit flip always break parity?", a: "One flipped bit changes the count of 1s by exactly one: even ↔ odd. That's why parity catches every single flip. Two flips change the count by 0 or ±2, so parity can't see them — that's the blind spot." },
      { q: "What if there's no law?", a: "Then there's nothing to post-select on; the repo's Trotter stand-in is the honest 'negative control'. Fall back to readout mitigation or ZNE. The decision helper includes 'no symmetry' for exactly this case." },
    ],
    means: "Conservation laws are the secret sauce of 2 of the 4 project ideas (Symmetry-Resolved, Adaptive Conservation). The first question after the circuit is revealed: 'does it conserve anything?'",
    files: [
      { path: "src/lib/simulator.ts", note: "LawKind = none | parity-even | parity-odd | weight; isValidState(), buildValidStateMask(), lawLabel(), suggestLaw()" },
      { path: "src/pages/Lab.tsx", note: "the law selector + the warning when the ideal run violates the law" },
      { path: "ideas-repo/src/projects/Project1.tsx", note: "Symmetry-Resolved Mitigation walkthrough" },
      { path: "ideas-repo/src/projects/Project4.tsx", note: "Adaptive Conservation walkthrough" },
    ],
    tryIt: [
      "In the Lab, load the GHZ stand-in. Read the amber 'law not conserved' notice.",
      "Load 'Fixed-weight VQE (weight = 2)' → green. Then load 'VQE — reference gates (⚠ not conserving)'.",
      "Compare: which one makes the Lab warn that post-selection will discard correct shots?",
    ],
    quiz: [
      { q: "A fixed-weight circuit (weight = 2, 4 qubits). Which output is certainly an error?", options: ["0011", "0101", "0111", "1100"], answer: 2, why: "0111 has three 1s — weight 3 — so it's forbidden." },
      { q: "Parity catches…", options: ["every even number of flips", "every single bit flip but not all double flips", "only readout errors", "nothing"], answer: 1, why: "One flip always changes parity; two flips can cancel out." },
    ],
  },
  {
    id: 7,
    title: "Post-selection vs soft reweighting",
    short: "Throw away shots vs re-assign them",
    emoji: "🎯",
    minutes: 25,
    badge: { name: "Shot Saver", emoji: "🎯" },
    goal: "Explain why post-selection throws away shots, why that hurts, and how soft reweighting keeps them.",
    analogy: {
      title: "Counting ballots",
      text: "Hard post-selection (v1) is a bouncer: ballots that break the rules are thrown in the bin — the vote is cleaner, but you have fewer voters. Soft reweighting (v2) is a careful clerk: a suspicious ballot is re-assigned to the most plausible legal candidate, based on how often smudged ballots happen. Nobody is discarded.",
    },
    concrete: [
      "Hard post-selection: keep only shots that obey the law, renormalise. Retention = kept ÷ total.",
      "Cost: at high noise, most shots break the law, retention collapses, and the remaining sample is small and wobbly.",
      "Soft reweighting: use the calibrated readout error rates to move each suspicious shot toward the legal outcomes it most likely came from. 100% retention.",
      "Both need a correct law. Wrong law → you remove real signal (GHZ trap).",
    ],
    demoTitle: "400 ballots",
    demoDo: "Compare the 'throw away' and 're-assign' views of the ballot grid, then push gate error up on the VQE preset and watch retention collapse for v1 only. Finally pick GHZ — the law is wrong, and both methods suffer.",
    reveals: [
      { q: "Why does throwing away shots 'hurt'?", a: "Statistical error scales like 1/√(shots kept). Keep a quarter of the shots and your error bars double. In the repo's Compare page, 'Hard post-selection (v1)' shows retention % and the noise sweep plots how retention falls as noise rises." },
      { q: "So is soft always better?", a: "Not always. Soft reweighting assumes a model (here: readout flips). It can't fix gate faults that happen to land on a legal outcome, and it needs calibration circuits (2 jobs instead of 1). That's an honest trade-off to state on stage." },
      { q: "What's the 'prior' option in the Lab?", a: "Soft reweighting needs a starting guess of how likely each legal outcome is. 'uniform' assumes all equally likely; 'empirical' uses the data (hard post-selected distribution). Empirical is usually better when the ideal distribution is uneven — it's the default." },
    ],
    means: "Your scorecard should always show retention next to accuracy. A method that 'wins' on accuracy by discarding 95% of shots hasn't really won.",
    files: [
      { path: "src/lib/simulator.ts", note: "hardPostselect(), softWeights(), makePrior() (uniform | empirical)" },
      { path: "src/pages/Compare.tsx", note: "retention tiles + the NoiseSweep panel (retention vs noise)" },
      { path: "ideas-repo/src/components/ui.tsx", note: "ShotGrid and Funnel — the ballot/shot visuals" },
      { path: "ideas-repo/src/projects/Project4.tsx", note: "Adaptive Conservation: v1 hard vs v2 soft, with auto-play tour" },
    ],
    tryIt: [
      "In the Lab pick the VQE w=2 stand-in, switch version v1 ↔ v2 and compare the retention number.",
      "Open #/compare → NoiseSweep → press 'Run sweep'. Find the curve labelled 'v1 hard post-selection (measured)'.",
      "In ideas-repo, open Adaptive Conservation → phase 'Mitigate' and watch the shot grid.",
    ],
    quiz: [
      { q: "Why does hard post-selection reduce accuracy of the statistics?", options: ["It adds noise", "It discards shots, leaving a smaller sample", "It changes the circuit", "It needs more qubits"], answer: 1, why: "Fewer shots → bigger statistical error bars." },
      { q: "You use 'even parity' on GHZ-3 at zero noise. Retention?", options: ["100%", "About 50% — it discards real |111⟩ shots", "0%", "Depends on shots only"], answer: 1, why: "111 has odd parity so half of the perfect shots are binned. The law doesn't hold for this circuit." },
    ],
  },
  {
    id: 8,
    title: "ZNE: make it noisier to find zero",
    short: "Zero-noise extrapolation",
    emoji: "📈",
    minutes: 25,
    badge: { name: "Zero-Noise Ninja", emoji: "📈" },
    goal: "Explain ZNE as 'amplify noise, measure, extrapolate back' and know its bias/variance trade-off.",
    analogy: {
      title: "Estimating a car's speed with no wind",
      text: "You can't turn off the wind. So you drive the same road in 1×, 2×, 3× headwind, note how your fuel use rises, and draw the line back to 0× wind. That extrapolated number is your 'no-wind' answer. Same idea: run the circuit at 1×, 3×, 5× noise, then extend the curve to 0×.",
    },
    concrete: [
      "Step 1 — amplify: make the circuit deliberately noisier without changing the maths, by 'folding' gates (U → U U† U ≈ 3× noise).",
      "Step 2 — measure the observable at each noise level.",
      "Step 3 — extrapolate: fit a line / exponential / polynomial and read off the value at 0× noise.",
      "Trade-off: a wrong curve shape → bias; far-out extrapolation + few shots → huge variance.",
    ],
    demoTitle: "Extrapolation playground",
    demoDo: "Start with Linear fit and strong noise (bias). Switch to Exponential (bias gone). Then lower the shots or pick Richardson (wobble explodes). Re-run the experiment several times to see the wobble.",
    reveals: [
      { q: "How can adding noise ever help?", a: "It doesn't help directly — it gives you extra data points on how the answer degrades. Knowing the trend lets you extend it backwards. Folding U → U U† U keeps the ideal answer the same (U† undoes U) but triples the gate noise." },
      { q: "Why does the repo mention 'Non-Clifford ZNE' (Project 2)?", a: "Tricks that exploit Clifford structure don't apply when T gates or arbitrary rotations dominate, so ZNE is the standard tool. The Project 2 walkthrough contrasts v1 (global folding λ = 1,2,3 + linear fit) with v2 (layer-wise amplification + Richardson/exponential fit with error bars)." },
      { q: "How is this related to IBM's Runtime resilience level 2?", a: "Level 2 turns on ZNE (plus gate twirling and readout mitigation). IBM's default noise factors are (1, 3, 5) with exponential/linear extrapolators. It's the 'ZNE in one line' baseline your custom ZNE should beat or at least match." },
    ],
    means: "ZNE is expensive (≥3× shots) and needs an honest uncertainty. Judges will love a plot with error bars and a sentence about bias vs variance — it's exactly the repo's judge takeaway for Project 2.",
    files: [
      { path: "ideas-repo/src/projects/Project2.tsx", note: "Non-Clifford ZNE walkthrough (v1 vs v2)" },
      { path: "src/lib/meta.ts", note: "PROJECTS[1] — ZNE card; buildBudgetMeter() has the ZNE cost row" },
      { path: "src/pages/Overhead.tsx", note: "ZNE variance blow-up vs depth" },
    ],
    tryIt: [
      "Start ideas-repo (cd ideas-repo && npm install && npm run dev) → Prototype Lab → choose project 2 (Non-Clifford ZNE).",
      "Click '▶ Auto-play tour' and watch the 6 phases run themselves.",
      "At the Results phase, compare v1 vs v2 error bars.",
    ],
    quiz: [
      { q: "ZNE gets its estimate by…", options: ["Removing noise from the hardware", "Running at several amplified noise levels and extrapolating to zero", "Discarding bad shots", "Using more qubits"], answer: 1, why: "Amplify, measure, extrapolate back." },
      { q: "A linear fit through strongly curved data typically gives…", options: ["Zero bias", "A biased estimate", "Infinite shots", "Perfect results"], answer: 1, why: "A straight line can't follow an exponential decay; the extrapolation lands off-target." },
    ],
  },
  {
    id: 9,
    title: "Scorecard: TVD, retention, gap-closed %",
    short: "Did mitigation actually help?",
    emoji: "🏅",
    minutes: 20,
    badge: { name: "Scorekeeper", emoji: "🏅" },
    goal: "Read the Compare page's scorecard row by row and decide honestly whether mitigation helped.",
    analogy: {
      title: "A report card before and after tutoring",
      text: "Raw is last term's grade. Gap-closed % says how much of the distance to a perfect score the tutoring recovered. TVD compares the whole histogram, not one number. Retention is how many exam questions you were allowed to keep. A big gain with tiny retention is a suspicious grade.",
    },
    concrete: [
      "Observable value & error: the headline number (e.g. parity) and its distance from ideal.",
      "Gap closed % = (|raw − ideal| − |method − ideal|) ÷ |raw − ideal|. 100% = perfect, 0% = no gain, negative = worse.",
      "TVD (total variation distance) = ½ Σ|p − q|: how far apart two histograms are. 0 = identical, 1 = totally different.",
      "Retention %: fraction of shots that survive. Plus jobs / QPU seconds = the cost.",
    ],
    demoTitle: "Build a scorecard by hand",
    demoDo: "In ①, set raw/mitigated/ideal and watch the traffic light. In ②, drag wrong mass and see TVD equal total wrong share. In ③, slide retention down to see error bars grow.",
    reveals: [
      { q: "Why report BOTH gap-closed and TVD?", a: "One observable can be lucky (errors cancelling by accident). TVD looks at the whole histogram. The repo's Playbook checklist says exactly this: 'Report gap-closed % AND TVD — don't cherry-pick a single metric'." },
      { q: "Why does the 'Hard post-selection' row look strange?", a: "In the repo, its headline Value equals the kept fraction (it notes '≡ raw by construction; benefit shows in TVD column'). That's why the table has a TVD column — the benefit of hard post-selection is only visible there." },
      { q: "What does the 'Runtime Defaults' row mean?", a: "A stand-in for 'what you'd get by just using IBM's resilience_level=1 (readout mitigation)'. It's the baseline your fancy method must beat to be interesting. Your hackathon demo: raw → Runtime defaults → ours → ideal." },
    ],
    means: "Judges will skim your scorecard in seconds. Put raw, Runtime defaults and your method side by side with error bars, state retention, and include one honest failure case.",
    files: [
      { path: "src/pages/Compare.tsx", note: "the 'Judge's scorecard' panel with CSV and JSON buttons" },
      { path: "src/lib/meta.ts", note: "buildScorecard(), scorecardToCSV(), scorecardToJSON()" },
      { path: "src/lib/simulator.ts", note: "tvd(), gapClosed(), gapClosedTvd()" },
    ],
    tryIt: [
      "Open #/compare and find the Judge's scorecard table.",
      "For each of the 5 rows, read: value, error, gap closed %, TVD, retention.",
      "Click CSV, then JSON, and open the downloaded files.",
    ],
    quiz: [
      { q: "Raw error 0.40, mitigated error 0.10. Gap closed?", options: ["25%", "75%", "30%", "10%"], answer: 1, why: "(0.40 − 0.10) ÷ 0.40 = 75%." },
      { q: "A method closes 90% of the gap but keeps only 3% of shots. Verdict?", options: ["Clear win", "Impressive accuracy, but suspicious cost — check the budget", "Broken", "Same as raw"], answer: 1, why: "Always read accuracy next to retention and cost." },
    ],
  },
  {
    id: 10,
    title: "Qiskit Runtime, EstimatorV2 & resilience levels",
    short: "How you'll run on real hardware",
    emoji: "🚀",
    minutes: 25,
    badge: { name: "Runtime Pilot", emoji: "🚀" },
    goal: "Know what Sampler and Estimator give you, and what resilience levels 0/1/2 switch on — so you can run the baseline rows on the day.",
    analogy: {
      title: "Ordering at a restaurant",
      text: "Qiskit Runtime is the kitchen next to the quantum computer. Sampler is 'bring me all the raw ingredients' (every bitstring). Estimator is 'bring me the finished dish' (an average value with error bar). Resilience level is a menu dial: 0 plain, 1 add readout cleanup, 2 add the fancy slow process.",
    },
    concrete: [
      "SamplerV2 → counts (bitstrings). You need this for histograms, post-selection and soft reweighting.",
      "EstimatorV2 → expectation value of an observable ± standard error. Resilience options live here.",
      "resilience_level 0 = none; 1 (default) = readout mitigation (TREX); 2 = + gate twirling + ZNE. Higher = more QPU time.",
      "Error SUPPRESSION (dynamical decoupling, twirling) is separate from mitigation but often combined.",
    ],
    demoTitle: "Option explorer",
    demoDo: "Click levels 0/1/2 and watch the code and the cost multiplier change. Toggle individual options. Then switch to SamplerV2 to see the raw-counts workflow.",
    reveals: [
      { q: "Where's the repo's baseline snippet?", a: "src/pages/Playbook.tsx → the BASELINE constant. It transpiles with optimization_level=3, runs a raw Sampler job, a Runtime-defaults Estimator job (resilience_level=1), and two calibration circuits (|0…0⟩ and |1…1⟩) for adaptive conservation. It's labelled 'verify option names against your installed qiskit-ibm-runtime' — take that seriously." },
      { q: "What's a 'PUB'?", a: "Primitive Unified Bloc: a tuple (circuit, observable[, parameters]). You pass a list of PUBs to estimator.run([...]). For Sampler it's just (circuit[, parameters])." },
      { q: "What do I need before the event?", a: "An IBM Quantum account, an API key saved with QiskitRuntimeService.save_account(...), and a smoke test of the baseline on a simulator or small backend. The Playbook's 'Before the event' list starts with exactly this." },
    ],
    code: {
      title: "Credentials (do this once, before Amsterdam)",
      lang: "python",
      code: `from qiskit_ibm_runtime import QiskitRuntimeService
QiskitRuntimeService.save_account(
    channel="ibm_quantum_platform",
    token="YOUR_API_KEY",      # from your IBM Quantum account page
    overwrite=True,
)
service = QiskitRuntimeService()
print(service.backends())      # if this prints a list, you're ready`,
    },
    means: "On the day, the three baseline rows you must be able to produce are: Raw (Sampler counts), Runtime defaults (Estimator, resilience_level=1) and yours. Everything else is polish.",
    files: [
      { path: "src/pages/Playbook.tsx", note: "BASELINE snippet, checklists, pitch skeleton, resources" },
      { path: "src/lib/meta.ts", note: "buildScorecard() rows mirror raw / Runtime defaults / adaptive" },
    ],
    tryIt: [
      "Open #/playbook and read the BASELINE code block top to bottom — can you name what each section produces?",
      "Tick off 'Before the event' items; progress saves in your browser.",
      "Optional: pip install qiskit qiskit-ibm-runtime and run the snippet on a local simulator.",
    ],
    quiz: [
      { q: "You need raw bitstrings to post-select. Which primitive?", options: ["EstimatorV2", "SamplerV2", "Either", "Neither"], answer: 1, why: "Sampler returns counts; Estimator returns averaged values." },
      { q: "resilience_level = 1 turns on…", options: ["Nothing", "Readout-error mitigation (TREX)", "ZNE", "Error correction"], answer: 1, why: "Level 1 is minimal-cost readout mitigation; level 2 adds gate twirling and ZNE." },
    ],
  },
];
