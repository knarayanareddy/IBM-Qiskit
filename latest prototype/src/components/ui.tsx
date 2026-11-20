import { useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

export type Tone = "cyan" | "violet" | "emerald" | "pink" | "amber" | "rose" | "slate";

const TONE_BADGE: Record<Tone, string> = {
  cyan: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/30",
  violet: "bg-violet-400/10 text-violet-300 ring-violet-400/30",
  emerald: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  pink: "bg-pink-400/10 text-pink-300 ring-pink-400/30",
  amber: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  rose: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
  slate: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
};

export const TONE_BAR: Record<Tone, string> = {
  cyan: "bg-cyan-400",
  violet: "bg-violet-400",
  emerald: "bg-emerald-400",
  pink: "bg-pink-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  slate: "bg-slate-400",
};

export const TONE_TEXT: Record<Tone, string> = {
  cyan: "text-cyan-300",
  violet: "text-violet-300",
  emerald: "text-emerald-300",
  pink: "text-pink-300",
  amber: "text-amber-300",
  rose: "text-rose-300",
  slate: "text-slate-300",
};

export function Badge({ tone = "slate", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONE_BADGE[tone], className)}
    >
      {children}
    </span>
  );
}

export function Panel({
  title, subtitle, icon, right, children, className, bodyClassName,
}: {
  title?: ReactNode; subtitle?: ReactNode; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-slate-700/60 bg-slate-800/40 shadow-lg shadow-black/10 backdrop-blur", className)}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-700/50 px-5 py-4">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 text-xl leading-none">{icon}</div>}
            <div>
              <h3 className="text-base font-semibold text-slate-100">{title}</h3>
              {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {right}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Horizontal meter 0..1 (or 0..max). */
export function Meter({
  value, max = 1, tone = "cyan", label, valueLabel, hint, size = "md", color,
}: {
  value: number; max?: number; tone?: Tone; label?: ReactNode; valueLabel?: ReactNode; hint?: ReactNode; size?: "sm" | "md"; color?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full">
      {(label || valueLabel) && (
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-slate-300">{label}</span>
          <span className="font-mono text-slate-200">{valueLabel}</span>
        </div>
      )}
      <div className={cn("overflow-hidden rounded-full bg-slate-700/60", size === "sm" ? "h-1.5" : "h-2.5")}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", !color && TONE_BAR[tone])}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

/** 1..5 pip meter used for effort / novelty / risk. */
export function Pips({ value, max = 5, tone = "cyan", label }: { value: number; max?: number; tone?: Tone; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="flex gap-1" role="img" aria-label={`${label} ${value} of ${max}`}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={cn("h-2 w-5 rounded-sm", i < value ? TONE_BAR[tone] : "bg-slate-700")} />
        ))}
      </span>
    </div>
  );
}

export function PhaseCard({
  index, title, blurb, state, onClick,
}: {
  index: number; title: string; blurb: string; state: "done" | "active" | "todo"; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={state === "active" ? "step" : undefined}
      className={cn(
        "group relative flex min-w-[8.5rem] flex-1 flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition",
        state === "active" && "border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_24px_-8px] shadow-cyan-400/60",
        state === "done" && "border-emerald-400/30 bg-emerald-400/5 hover:border-emerald-400/50",
        state === "todo" && "border-slate-700/60 bg-slate-800/40 hover:border-slate-500",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
            state === "active" && "bg-cyan-400 text-slate-900",
            state === "done" && "bg-emerald-400 text-slate-900",
            state === "todo" && "bg-slate-700 text-slate-300",
          )}
        >
          {state === "done" ? "✓" : index + 1}
        </span>
        <span className="text-sm font-semibold text-slate-100">{title}</span>
      </span>
      <span className="text-[11px] leading-tight text-slate-400">{blurb}</span>
    </button>
  );
}

export function Stat({ label, value, sub, tone = "slate" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn("mt-0.5 font-mono text-xl font-semibold", TONE_TEXT[tone])}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, className,
}: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-lg border border-slate-700 bg-slate-900/60 p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            value === o.value ? "bg-cyan-400/20 text-cyan-200 shadow-inner" : "text-slate-400 hover:text-slate-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-900/30 px-3 py-2.5 hover:border-slate-600">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full bg-slate-700 p-0.5 transition peer-checked:bg-cyan-400 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-300 after:block after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-4"
      />
    
      <span>
        <span className="block text-sm text-slate-200">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function Notice({ tone = "amber", title, children }: { tone?: Tone; title?: ReactNode; children: ReactNode }) {
  const ring: Record<Tone, string> = {
    cyan: "border-cyan-400/30 bg-cyan-400/5", violet: "border-violet-400/30 bg-violet-400/5", emerald: "border-emerald-400/30 bg-emerald-400/5",
    pink: "border-pink-400/30 bg-pink-400/5", amber: "border-amber-400/30 bg-amber-400/5", rose: "border-rose-400/30 bg-rose-400/5",
    slate: "border-slate-600 bg-slate-800/40",
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
