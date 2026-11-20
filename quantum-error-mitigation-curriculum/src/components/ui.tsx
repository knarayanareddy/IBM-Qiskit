import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { bitstring, COLORS } from "../lib/quantum";

/* ------------------------------------------------------------ persistence */

export function useStored<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setVal((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent("qb-store", { detail: key }));
        return next;
      });
    },
    [key],
  );
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent).detail !== key) return;
      try {
        const raw = localStorage.getItem(key);
        if (raw) setVal(JSON.parse(raw) as T);
      } catch { /* ignore */ }
    };
    window.addEventListener("qb-store", on);
    return () => window.removeEventListener("qb-store", on);
  }, [key]);
  return [val, set];
}

/* ------------------------------------------------------------- primitives */

export const REPO = "https://github.com/knarayanareddy/IBM-Qiskit";

export function Panel({ title, icon, right, children, className }: { title?: ReactNode; icon?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 shadow-lg shadow-black/20", className)}>
      {(title || right) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
            {icon && <span aria-hidden>{icon}</span>}
            {title}
          </h3>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

type Tone = "cyan" | "emerald" | "rose" | "violet" | "amber" | "slate" | "pink";
const TONES: Record<Tone, string> = {
  cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-100",
  emerald: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
  rose: "border-rose-400/40 bg-rose-400/10 text-rose-100",
  violet: "border-violet-400/40 bg-violet-400/10 text-violet-100",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  slate: "border-slate-600 bg-slate-800/60 text-slate-200",
  pink: "border-pink-400/40 bg-pink-400/10 text-pink-100",
};

export function Callout({ tone = "cyan", title, icon, children }: { tone?: Tone; title?: string; icon?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border-l-4 border p-4 text-sm leading-relaxed", TONES[tone])}>
      {title && (
        <div className="mb-1.5 flex items-center gap-2 font-semibold">
          {icon && <span aria-hidden>{icon}</span>}
          {title}
        </div>
      )}
      <div className="space-y-2 text-slate-200/90">{children}</div>
    </div>
  );
}

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", TONES[tone])}>{children}</span>;
}

export function Reveal({ q, children, defaultOpen }: { q: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={cn("rounded-xl border transition", open ? "border-cyan-400/40 bg-cyan-400/5" : "border-slate-700 bg-slate-800/40 hover:border-slate-500")}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-100">
        <span>
          <span className="mr-2" aria-hidden>{open ? "👀" : "👆"}</span>
          {q}
        </span>
        <span className={cn("text-slate-400 transition-transform", open && "rotate-180")} aria-hidden>▾</span>
      </button>
      {open && <div className="space-y-2 px-4 pb-4 text-sm leading-relaxed text-slate-300">{children}</div>}
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, step, fmt, hint, color = COLORS.accent }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; fmt?: (v: number) => string; hint?: string; color?: string }) {
  const id = `sl-${label.replace(/\W+/g, "")}`;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm text-slate-200">{label}</label>
        <span className="font-mono text-sm font-semibold" style={{ color }}>{fmt ? fmt(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full cursor-pointer" style={{ accentColor: color }} />
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 font-mono text-xl font-bold" style={{ color: color ?? "#e2e8f0" }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function Pct(v: number, d = 1) {
  return `${(v * 100).toFixed(d)}%`;
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function CodeBlock({ code, title, lang = "bash", prompt }: { code: string; title?: string; lang?: string; prompt?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  const lines = code.split("\n");
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="flex items-center gap-2">
          <span className="flex gap-1"><i className="h-2 w-2 rounded-full bg-rose-400/70" /><i className="h-2 w-2 rounded-full bg-amber-400/70" /><i className="h-2 w-2 rounded-full bg-emerald-400/70" /></span>
          {title ?? lang}
        </span>
        <button onClick={copy} className="rounded border border-slate-700 px-2 py-0.5 hover:border-cyan-400 hover:text-cyan-200">{copied ? "✓ copied" : "copy"}</button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed text-emerald-200/90">
        {lines.map((l, i) => (
          <div key={i}>
            {prompt && l.trim() && !l.trim().startsWith("#") && <span className="select-none text-slate-600">$ </span>}
            {l}
          </div>
        ))}
      </pre>
    </div>
  );
}

export function FileChip({ path, note }: { path: string; note?: string }) {
  const isDir = path.endsWith("/");
  const url = `${REPO}/${isDir ? "tree" : "blob"}/main/${path}`;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm transition hover:border-cyan-400/60 hover:bg-slate-800">
      <code className="break-all font-mono text-[13px] text-cyan-300 group-hover:text-cyan-200">📄 {path}</code>
      {note && <span className="text-xs text-slate-400">{note}</span>}
      <span className="ml-auto text-xs text-slate-600 group-hover:text-cyan-300">open ↗</span>
    </a>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition", checked ? "border-emerald-400/40 bg-emerald-400/10 text-slate-300" : "border-slate-700 bg-slate-800/40 text-slate-200 hover:border-slate-500")}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-400" />
      <span className={cn(checked && "line-through decoration-slate-500")}>{children}</span>
    </label>
  );
}

export function ProgressBar({ value, tone = "emerald" }: { value: number; tone?: "emerald" | "cyan" | "violet" }) {
  const c = { emerald: "from-emerald-400 to-cyan-400", cyan: "from-cyan-400 to-violet-400", violet: "from-violet-400 to-pink-400" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", c)} style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

/* --------------------------------------------------------------- histogram */

export interface Series { label: string; color: string; probs: ArrayLike<number> }

export function Histogram({ n, series, height = 190, invalid, maxY }: { n: number; series: Series[]; height?: number; invalid?: Uint8Array; maxY?: number }) {
  const dim = 1 << n;
  const W = 680;
  const padL = 38, padB = 26, padT = 10, padR = 8;
  const H = height;
  const innerW = W - padL - padR;
  const innerH = H - padB - padT;
  const peak = Math.max(0.1, ...series.flatMap((s) => Array.from(s.probs)));
  const top = maxY ?? Math.min(1, Math.ceil(peak * 10 + 0.5) / 10);
  const gw = innerW / dim;
  const bw = Math.min(26, (gw * 0.82) / series.length);
  const ticks = [0, top / 2, top];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Probability histogram of measurement outcomes">
      {ticks.map((t) => {
        const y = padT + innerH - (t / top) * innerH;
        return (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#334155" strokeDasharray={t === 0 ? "" : "3 4"} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(t * 100)}%</text>
          </g>
        );
      })}
      {Array.from({ length: dim }, (_, x) => {
        const cx = padL + gw * x + gw / 2;
        const bad = invalid && invalid[x];
        return (
          <g key={x}>
            {series.map((s, i) => {
              const v = Math.min(top, s.probs[x] ?? 0);
              const h = (v / top) * innerH;
              const bx = cx - (bw * series.length) / 2 + i * bw;
              return (
                <rect key={s.label} x={bx} y={padT + innerH - h} width={bw - 1.5} height={Math.max(h, 0)} rx={2} fill={s.color} opacity={0.92} style={{ transition: "all 220ms ease-out" }}>
                  <title>{`${s.label} · ${bitstring(x, n)} · ${((s.probs[x] ?? 0) * 100).toFixed(2)}%`}</title>
                </rect>
              );
            })}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={dim > 8 ? 9 : 11} fontFamily="monospace" fill={bad ? "#fb7185" : "#cbd5e1"}>
              {bitstring(x, n)}
            </text>
            {bad ? <text x={cx} y={H - 1} textAnchor="middle" fontSize="7" fill="#fb7185">✕</text> : null}
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------------------------------------------------------- quiz */

export interface QuizQ { q: string; options: string[]; answer: number; why: string }

export function Quiz({ questions }: { questions: QuizQ[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  return (
    <div className="space-y-5">
      {questions.map((qq, qi) => {
        const p = picked[qi];
        const done = p !== undefined;
        return (
          <div key={qi}>
            <div className="mb-2 text-sm font-medium text-slate-100">{qi + 1}. {qq.q}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {qq.options.map((o, oi) => {
                const correct = oi === qq.answer;
                return (
                  <button
                    key={oi}
                    onClick={() => setPicked((s) => ({ ...s, [qi]: oi }))}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition",
                      !done && "border-slate-700 bg-slate-800/50 text-slate-200 hover:border-cyan-400/60",
                      done && correct && "border-emerald-400/60 bg-emerald-400/10 text-emerald-100",
                      done && !correct && p === oi && "border-rose-400/60 bg-rose-400/10 text-rose-100",
                      done && !correct && p !== oi && "border-slate-800 text-slate-500",
                    )}
                  >
                    {done && correct ? "✓ " : done && p === oi ? "✕ " : ""}
                    {o}
                  </button>
                );
              })}
            </div>
            {done && <div className={cn("mt-2 text-xs", p === qq.answer ? "text-emerald-300" : "text-amber-300")}>{p === qq.answer ? "Nice! " : "Not quite — "}{qq.why}</div>}
          </div>
        );
      })}
    </div>
  );
}
