import { DEFAULT_NOISE, type NoiseConfig } from "../lib/simulator";

interface KnobDef {
  key: keyof NoiseConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  hint: string;
}

const KNOBS: KnobDef[] = [
  { key: "oneQ", label: "1-qubit gate error", min: 0, max: 0.05, step: 0.001, fmt: (v) => `${(v * 100).toFixed(1)}%`, hint: "depolarising λ on every 1q gate" },
  { key: "twoQ", label: "2-qubit gate error", min: 0, max: 0.15, step: 0.002, fmt: (v) => `${(v * 100).toFixed(1)}%`, hint: "depolarising λ on every 2q gate" },
  { key: "readout", label: "Readout error", min: 0, max: 0.25, step: 0.0025, fmt: (v) => `${(v * 100).toFixed(1)}%`, hint: "symmetric bit-flip at measurement" },
  { key: "shots", label: "Shots", min: 256, max: 32768, step: 256, fmt: (v) => v.toLocaleString(), hint: "samples per job" },
];

export function NoiseKnobs({ cfg, onChange, compact = false }: { cfg: NoiseConfig; onChange: (c: NoiseConfig) => void; compact?: boolean }) {
  return (
    <div className="space-y-4">
      {KNOBS.map((k) => (
        <div key={k.key}>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor={`knob-${k.key}`} className="text-sm text-slate-200">
              {k.label}
            </label>
            <span className="font-mono text-sm text-cyan-300">{k.fmt(cfg[k.key])}</span>
          </div>
          <input
            id={`knob-${k.key}`}
            type="range"
            min={k.min}
            max={k.max}
            step={k.step}
            value={cfg[k.key]}
            onChange={(e) => onChange({ ...cfg, [k.key]: parseFloat(e.target.value) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
          />
          {!compact && <div className="mt-0.5 text-[11px] text-slate-500">{k.hint}</div>}
        </div>
      ))}
      <button
        onClick={() => onChange(DEFAULT_NOISE)}
        className="text-xs text-slate-400 underline decoration-slate-600 underline-offset-2 hover:text-cyan-300"
      >
        Reset to reference defaults (1% / 3% / 5% / 4096)
      </button>
    </div>
  );
}
