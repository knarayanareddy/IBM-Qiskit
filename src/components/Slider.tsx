import { type ReactNode } from "react";
import { cn } from "../utils/cn";

export interface SliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  fmt?: (v: number) => string;
}

/** Simple range slider with a value readout. Tailwind-styled track + thumb. */
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  fmt = (v) => v.toFixed(3),
}: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-cyan-300">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  className,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-400/60 disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}
