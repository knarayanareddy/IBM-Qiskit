import { Badge, CodeBlock, Panel } from '../components/ui';
import { Checklist } from '../components/extras';

const SOURCES: [string, string, string, 'repo' | 'inferred' | 'unverified'][] = [
  ['@amarchenkova', 'Project 4 — error mitigation vs. post-selection', 'Repo “Inspired by: Marchenkova”', 'repo'],
  ['@atsushi_iwaki_', 'Project 1 — virtual purification within a single state', 'Repo “Inspired by: Iwaki et al.”', 'repo'],
  ['@layden_variable', 'Project 2 — mitigation for non-Clifford gates', 'Repo “Inspired by: Layden et al.”', 'repo'],
  ['@IBMResearch', 'Project 3 — QEM and QEC as a continuum', 'Repo “Inspired by: IBM Research”', 'repo'],
  ['@zhenyu_cai', 'Symmetry expansion / QEM methods (idea 5)', 'Author’s published work on symmetry-based QEM', 'inferred'],
  ['@quekpottheories', 'Sampling-overhead limits of QEM (idea 2)', 'Author’s published bounds on QEM cost', 'inferred'],
  ['@jaygambetta', 'IBM utility-scale roadmap / mitigation context (ideas 2, 6)', 'General context only', 'unverified'],
  ['@zlatko_minev', 'Hardware / error-suppression context', 'General context only', 'unverified'],
  ['@freeCodeCamp', 'Learning resource (Qiskit basics)', 'General context only', 'unverified'],
  ['@SciTechera', 'News / context', 'General context only', 'unverified'],
];

export default function Playbook() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-10">
      <h2 className="text-3xl font-bold text-white">Hackathon playbook</h2>
      <p className="mt-2 max-w-3xl text-slate-300">Track brief: “Teams are given a standard algorithm that they need to run on QPU with the error mitigation techniques of their choice.” Here’s how to turn the four projects into a winning, well-argued submission.</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Checklist
          title="Before 20 Nov"
          tone="cyan"
          items={['Port the 4 repos into one package with a shared metrics.py (bias, σ, retention, shots).', 'Write a generic `run_method(circuit, backend, method)` interface so swapping the algorithm takes minutes.', 'Practise on 3 stand-ins: GHZ, a Trotter step (Clifford+T), a fixed-excitation VQE ansatz.', 'Get an IBM Quantum token working with qiskit-ibm-runtime and test a trivial job.']}
        />
        <Checklist
          title="First 2 hours on site"
          tone="amber"
          items={['Read the algorithm: gate set, depth, symmetries, observable → use the decision helper.', 'Transpile for the target backend; count 2-qubit gates and depth.', 'Launch baselines immediately: raw, readout-only, Runtime default resilience (queue time is your scarcest resource).', 'Launch the 2-circuit readout calibration in the same batch.']}
        />
        <Checklist
          title="Make the result convincing"
          tone="emerald"
          items={['Always error bars; always the unmitigated baseline.', 'Report retention and shots consumed — normalise by it.', 'State what your method cannot fix (symmetry-preserving errors, Clifford floor, phase errors).', 'One decisive figure beats ten tables.']}
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <CodeBlock
          title="baseline to beat — Runtime built-ins (illustrative; check your installed version)"
          code={`from qiskit_ibm_runtime import QiskitRuntimeService, EstimatorV2 as Estimator

service = QiskitRuntimeService()
backend = service.least_busy(operational=True, simulator=False)
est = Estimator(mode=backend)

# 1) bare
est.options.resilience_level = 0
# 2) readout mitigation + twirling + DD
est.options.dynamical_decoupling.enable = True
est.options.twirling.enable_gates = True
est.options.resilience.measure_mitigation = True
# 3) + ZNE
est.options.resilience.zne_mitigation = True
est.options.resilience.zne.noise_factors = (1, 3, 5)
est.options.resilience.zne.extrapolator = "exponential"`}
        />
        <Panel title="Pitch skeleton (3 minutes)">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>The algorithm and its ideal answer — one slide.</li>
            <li>What breaks on the QPU (raw result vs. ideal).</li>
            <li>Our method in one diagram (the circuit or the weighting).</li>
            <li>Result with error bars vs. Runtime defaults.</li>
            <li>Cost: extra qubits, jobs, retention, QPU time.</li>
            <li>Honest limits + what we’d do with more time.</li>
          </ol>
        </Panel>
      </div>

      <h3 className="mt-12 text-xl font-bold text-white">Resource map & confidence</h3>
      <p className="mt-1 text-sm text-slate-400">The linked X posts were not readable (login wall), so this table says how each handle was mapped — not what the posts said.</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-3">Resource</th>
              <th className="p-3">Used for</th>
              <th className="p-3">Basis</th>
              <th className="p-3">Confidence</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {SOURCES.map(([a, b, c, d]) => (
              <tr key={a} className="border-t border-white/5">
                <td className="p-3 font-mono text-cyan-300">{a}</td>
                <td className="p-3">{b}</td>
                <td className="p-3 text-xs text-slate-400">{c}</td>
                <td className="p-3">
                  <Badge tone={d === 'repo' ? 'emerald' : d === 'inferred' ? 'amber' : 'slate'}>{d}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
