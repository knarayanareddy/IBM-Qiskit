import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, type ReactNode } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Tone = "cyan" | "violet" | "emerald" | "pink" | "amber" | "rose" | "slate";

export function Badge({
  children,
  tone = "slate",
  title,
  className,
}: {
  children?: ReactNode;
  tone?: Tone;
  title?: string;
  className?: string;
}) {
  const base = "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none";
  const ring: Record<Tone, string> = {
    cyan: "border-cyan-400/30 bg-cyan-400/5 text-cyan-300",
    violet: "border-violet-400/30 bg-violet-400/5 text-violet-300",
    emerald: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300",
    pink: "border-pink-400/30 bg-pink-400/5 text-pink-300",
    amber: "border-amber-400/30 bg-amber-400/5 text-amber-300",
    rose: "border-rose-400/30 bg-rose-400/5 text-rose-300",
    slate: "border-slate-600 bg-slate-800/40 text-slate-300",
  };
  return (
    <span
      className={base + " " + ring[tone] + (className ? " " + className : "")}
      title={title}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  title,
  icon,
  subtitle,
  right,
  bodyClassName,
  className,
}: {
  children?: ReactNode;
  title?: string;
  icon?: string;
  subtitle?: string;
  right?: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
        </div>
        {right && <div className="ml-auto shrink-0">{right}</div>}
      </div>
      {subtitle && <p className="mb-4 text-xs text-slate-500">{subtitle}</p>}
      <div className={["rounded-xl border border-slate-700/60 bg-slate-900/40 p-4", bodyClassName].join(" ")}>
        {children}
      </div>
    </section>
  );
}

export function Meter({
  value,
  max = 1,
  color,
  tone,
  label,
  valueLabel,
  size,
  hint,
}: {
  value: number;
  max?: number;
  color?: string;
  tone?: "emerald" | "rose" | "cyan" | "amber" | "pink";
  label?: string;
  valueLabel?: string;
  size?: "sm";
  hint?: string;
}) {
  const clamp = Math.min(1, Math.max(0, value / max));
  const fillColor = color ?? (tone ? { emerald: "#34d399", rose: "#fb7185", cyan: "#22d3ee", amber: "#fbbf24", pink: "#f472b6" }[tone] ?? "#34d399" : "#34d399");
  const ring: Record<string, string> = {
    emerald: "border-emerald-400/30 bg-emerald-400/5",
    rose: "border-rose-400/30 bg-rose-400/5",
    cyan: "border-cyan-400/30 bg-cyan-400/5",
    amber: "border-amber-400/30 bg-amber-400/5",
    pink: "border-pink-400/30 bg-pink-400/5",
  };
  const toneRing = tone ? ring[tone] : "border-slate-600 bg-slate-900/40";
  const h = size === "sm" ? "h-1.5" : "h-3";
  return (
    <div className={toneRing + " rounded-xl px-3 py-2 text-sm flex flex-col gap-1.5"}>
      {label && <div className="flex justify-between">
        <span className="text-slate-300">{label}</span>
        {valueLabel && <span className="font-mono text-xs">{valueLabel}</span>}
      </div>}
      <div className="relative w-full overflow-hidden rounded-full bg-slate-700/30">
        <div className={h + " rounded-full"} style={{ width: `${clamp * 100}%`, background: fillColor }} />
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function Pips({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="h-2.5 w-7 rounded-sm transition-colors ring-1 ring-inset" style={{ background: i <= value ? tone : "#334155" }} />
        ))}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; title?: string }[];
}) {
  return (
    <div className="flex gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs border",
            value === o.value ? "bg-cyan-400 text-slate-900 border-cyan-400" : "bg-slate-800 text-slate-400 border-slate-600 hover:text-slate-200",
          )}
          title={o.title}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <button onClick={() => onChange(!checked)} className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2",
        checked ? "bg-cyan-400 border-cyan-400" : "bg-slate-700 border-slate-600",
      )}>
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-slate-900 shadow-md transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
          aria-hidden="true"
        />
      </button>
      <div>
        <div className={cn("text-sm", checked ? "text-slate-200" : "text-slate-500")}>{label}</div>
        {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string | number | ReactNode; sub?: string; tone?: Tone }) {
  const ring: Record<Tone, string> = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    emerald: "text-emerald-300",
    pink: "text-pink-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    slate: "text-slate-300",
  };
  return (
    <div className="text-center">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-lg font-bold text-slate-100", ring[tone ?? "slate"])}>{value}</span>
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}

export function PhaseCard({ index, title, blurb, state, onClick }: { index: number; title: string; blurb: string; state: "active" | "done" | "todo"; onClick: () => void }) {
  const ring: Record<string, string> = {
    active: "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40",
    done: "text-emerald-400",
    todo: "text-slate-500 hover:text-slate-200",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition",
        state === "active" ? ring.active : state === "done" ? "border-emerald-400/30" : "border-slate-600",
      )}
    >
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
        state === "active" ? "bg-cyan-400 text-slate-900" : state === "done" ? "bg-emerald-400/10 text-emerald-400" : "bg-slate-800 text-slate-500")}>
        {index + 1}
      </span>
      <div className="min-w-0">
        <span className={ring[state]}>{title}</span>
        <div className="text-[10px] text-slate-600">{blurb}</div>
      </div>
    </button>
  );
}

export function Notice({
  children,
  tone = "slate",
  title,
}: {
  children?: ReactNode;
  tone?: Tone;
  title?: ReactNode | string;
}) {
  const ring: Record<Tone, string> = {
    cyan: "border-cyan-400/30 bg-cyan-400/5",
    violet: "border-violet-400/30 bg-violet-400/5",
    emerald: "border-emerald-400/30 bg-emerald-400/5",
    pink: "border-pink-400/30 bg-pink-400/5",
    amber: "border-amber-400/30 bg-amber-400/5",
    rose: "border-rose-400/30 bg-rose-400/5",
    slate: "border-slate-600 bg-slate-800/40",
  };
  const TONE_TEXT: Record<Tone, string> = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    emerald: "text-emerald-300",
    pink: "text-pink-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    slate: "text-slate-300",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", ring[tone])}>
      {title && <div className={cn("mb-1 font-semibold", TONE_TEXT[tone])}>{title}</div>}
      <div className="text-slate-300">{children}</div>
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          },
          () => undefined,
        );
      }}
      className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-400/60 hover:text-cyan-200"
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
