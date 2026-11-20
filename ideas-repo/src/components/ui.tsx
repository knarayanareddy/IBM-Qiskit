import { useState, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export type Mode = 'v1' | 'v2' | 'split';

/* ---------- basic atoms ---------- */
export function Panel({ children, className, title, right }: { children: ReactNode; className?: string; title?: ReactNode; right?: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur p-5', className)}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold tracking-wide text-slate-200">{title}</h4>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' }) {
  const tones = {
    slate: 'bg-white/5 text-slate-300 border-white/10',
    cyan: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30',
    violet: 'bg-violet-400/10 text-violet-300 border-violet-400/30',
    emerald: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
    amber: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    rose: 'bg-rose-400/10 text-rose-300 border-rose-400/30',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', tones[tone])}>{children}</span>;
}

export function VersionTag({ v }: { v: 'v1' | 'v2' }) {
  return v === 'v1' ? (
    <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">● BEFORE · v1 Original (repo)</div>
  ) : (
    <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">● AFTER · v2 Improved</div>
  );
}

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'win' | 'bad'; title?: string; children: ReactNode }) {
  const t = {
    info: 'border-cyan-400/30 bg-cyan-400/5 text-cyan-100',
    warn: 'border-amber-400/30 bg-amber-400/5 text-amber-100',
    win: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-100',
    bad: 'border-rose-400/30 bg-rose-400/5 text-rose-100',
  }[tone];
  const icon = { info: 'ℹ', warn: '⚠', win: '✓', bad: '✕' }[tone];
  return (
    <div className={cn('rounded-xl border p-4 text-sm leading-relaxed', t)}>
      {title && (
        <div className="mb-1 font-semibold">
          <span className="mr-1.5">{icon}</span>
          {title}
        </div>
      )}
      <div className="opacity-90">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, tone = 'slate' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' }) {
  const c = { slate: 'text-slate-100', cyan: 'text-cyan-300', emerald: 'text-emerald-300', amber: 'text-amber-300', rose: 'text-rose-300', violet: 'text-violet-300' }[tone];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={cn('mt-1 font-mono text-2xl font-semibold', c)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, step, fmt, hint }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; fmt?: (v: number) => string; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-cyan-300">{fmt ? fmt(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-cyan-400" />
      {hint && <div className="mt-0.5 text-[10px] text-slate-500">{hint}</div>}
    </label>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-start gap-3 text-left">
      <span className={cn('mt-0.5 h-5 w-9 shrink-0 rounded-full border p-0.5 transition', value ? 'border-cyan-400 bg-cyan-400/30' : 'border-white/20 bg-white/5')}>
        <span className={cn('block h-3.5 w-3.5 rounded-full transition', value ? 'translate-x-4 bg-cyan-300' : 'bg-slate-400')} />
      </span>
      <span>
        <span className="block text-xs text-slate-300">{label}</span>
        {hint && <span className="block text-[10px] text-slate-500">{hint}</span>}
      </span>
    </button>
  );
}

export function Terminal({ title = 'run.py output', children }: { title?: string; children: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 font-mono text-[11px] text-slate-400">{title}</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-emerald-200/90">{children}</pre>
    </div>
  );
}

export function CodeBlock({ code, title = 'qiskit (illustrative)' }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5">
        <span className="font-mono text-[11px] text-slate-400">{title}</span>
        <button
          className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white"
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-violet-200/90">{code}</pre>
    </div>
  );
}

/* ---------- phase output header ---------- */
export function PhaseIntro({ title, kicker, children, outputs }: { title: string; kicker: string; children: ReactNode; outputs?: string[] }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">{kicker}</div>
      <h3 className="mt-1 text-2xl font-semibold text-white">{title}</h3>
      <div className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">{children}</div>
      {outputs && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-500">Phase output →</span>
          {outputs.map((o) => (
            <Badge key={o} tone="violet">
              {o}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- split wrapper ---------- */
export function Versioned({ mode, phase, full = [0, 5], render }: { mode: Mode; phase: number; full?: number[]; render: (v: 'v1' | 'v2') => ReactNode }) {
  if (mode !== 'split' || full.includes(phase)) return <>{render(mode === 'split' ? 'v2' : mode)}</>;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="min-w-0 rounded-2xl border border-amber-400/15 p-4">
        <VersionTag v="v1" />
        {render('v1')}
      </div>
      <div className="min-w-0 rounded-2xl border border-emerald-400/15 p-4">
        <VersionTag v="v2" />
        {render('v2')}
      </div>
    </div>
  );
}

/* ---------- bar compare ---------- */
export interface BarItem {
  label: string;
  value: number;
  err?: number;
  color?: string;
  note?: string;
  highlight?: boolean;
}
export function BarCompare({ items, ideal, lo = 0, hi = 1, floor, floorLabel, idealLabel = 'ideal' }: { items: BarItem[]; ideal?: number; lo?: number; hi?: number; floor?: number; floorLabel?: string; idealLabel?: string }) {
  const pos = (v: number) => `${clamp01((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-[minmax(110px,170px)_1fr_auto] items-center gap-3">
          <div className={cn('text-xs leading-tight', it.highlight ? 'font-semibold text-white' : 'text-slate-300')}>
            {it.label}
            {it.note && <div className="text-[10px] font-normal text-slate-500">{it.note}</div>}
          </div>
          <div className="relative h-6 rounded-md bg-white/5">
            <div className="absolute inset-y-0 left-0 rounded-md transition-all duration-500" style={{ width: pos(it.value), background: it.color ?? '#22d3ee', opacity: it.highlight ? 1 : 0.75 }} />
            {it.err !== undefined && (
              <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-white" style={{ left: pos(it.value - it.err), width: `calc(${pos(it.value + it.err)} - ${pos(it.value - it.err)})` }}>
                <span className="absolute -left-px top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-white" />
                <span className="absolute -right-px top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-white" />
              </div>
            )}
            {floor !== undefined && <div className="absolute inset-y-[-3px] w-0.5 bg-amber-400/80" style={{ left: pos(floor) }} />}
            {ideal !== undefined && <div className="absolute inset-y-[-3px] w-0.5 border-l-2 border-dashed border-emerald-300" style={{ left: pos(ideal) }} />}
          </div>
          <div className="w-24 text-right font-mono text-xs text-slate-200">
            {it.value.toFixed(3)}
            {it.err !== undefined && <span className="text-slate-500"> ±{it.err.toFixed(3)}</span>}
          </div>
        </div>
      ))}
      {(ideal !== undefined || floor !== undefined) && (
        <div className="flex gap-4 pl-[calc(min(170px,25%)+12px)] text-[10px] text-slate-500">
          {ideal !== undefined && (
            <span>
              <span className="mr-1 inline-block h-2.5 w-0 border-l-2 border-dashed border-emerald-300" />
              {idealLabel} = {ideal.toFixed(2)}
            </span>
          )}
          {floor !== undefined && (
            <span>
              <span className="mr-1 inline-block h-2.5 w-0.5 bg-amber-400/80" />
              {floorLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* ---------- histogram ---------- */
export interface HBar {
  label: string;
  value: number;
  color: string;
  sub?: string;
}
export function Histogram({ bars, height = 150, unit = '' }: { bars: HBar[]; height?: number; unit?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height: height + 38 }}>
      {bars.map((b) => (
        <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
          <div className="mb-1 font-mono text-[10px] text-slate-400">
            {b.value}
            {unit}
          </div>
          <div className="w-full rounded-t-md transition-all duration-500" style={{ height: Math.max(1, (b.value / max) * height), background: b.color }} />
          <div className="mt-1.5 font-mono text-[11px] text-slate-300">{b.label}</div>
          {b.sub && <div className="text-[9px] text-slate-500">{b.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------- shot grid ---------- */
export function ShotGrid({ items, legend, cols = 40 }: { items: string[]; legend: { color: string; label: string; count?: number }[]; cols?: number }) {
  return (
    <div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((c, i) => (
          <div key={i} className="aspect-square rounded-[2px]" style={{ background: c }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
            {l.label}
            {l.count !== undefined && <span className="font-mono text-slate-500">({l.count})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- funnel ---------- */
export function Funnel({ stages }: { stages: { label: string; value: number; of: number; color: string; note?: string }[] }) {
  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <div key={s.label}>
          <div className="mb-0.5 flex justify-between text-xs">
            <span className="text-slate-300">{s.label}</span>
            <span className="font-mono text-slate-400">
              {s.value.toLocaleString()} <span className="text-slate-600">({((s.value / s.of) * 100).toFixed(1)}%)</span>
            </span>
          </div>
          <div className="h-5 rounded bg-white/5">
            <div className="h-5 rounded transition-all duration-500" style={{ width: `${(s.value / s.of) * 100}%`, background: s.color }} />
          </div>
          {s.note && <div className="mt-0.5 text-[10px] text-slate-500">{s.note}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------- line chart ---------- */
export interface Series {
  name: string;
  color: string;
  points?: { x: number; y: number; err?: number }[];
  line?: { x: number; y: number }[];
  dashed?: boolean;
  width?: number;
}
export function LineChart({
  series,
  xDomain,
  yDomain,
  hlines = [],
  xLabel,
  yLabel,
  markers = [],
  height = 300,
  xTicks,
}: {
  series: Series[];
  xDomain: [number, number];
  yDomain: [number, number];
  hlines?: { y: number; label: string; color: string }[];
  xLabel?: string;
  yLabel?: string;
  markers?: { x: number; y: number; color: string; label?: string }[];
  height?: number;
  xTicks?: number[];
}) {
  const W = 620,
    H = height,
    m = { l: 46, r: 14, t: 14, b: 40 };
  const sx = (x: number) => m.l + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (W - m.l - m.r);
  const sy = (y: number) => H - m.b - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * (H - m.t - m.b);
  const yt = Array.from({ length: 6 }, (_, i) => yDomain[0] + ((yDomain[1] - yDomain[0]) * i) / 5);
  const xt = xTicks ?? Array.from({ length: 6 }, (_, i) => xDomain[0] + ((xDomain[1] - xDomain[0]) * i) / 5);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {yt.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,0.07)" />
            <text x={m.l - 6} y={sy(t) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        {xt.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke="rgba(255,255,255,0.04)" />
            <text x={sx(t)} y={H - m.b + 15} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {Number.isInteger(t) ? t : t.toFixed(2)}
            </text>
          </g>
        ))}
        {xLabel && (
          <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#cbd5e1">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text transform={`translate(12 ${H / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="#cbd5e1">
            {yLabel}
          </text>
        )}
        {hlines.map((h) => (
          <g key={h.label}>
            <line x1={m.l} x2={W - m.r} y1={sy(h.y)} y2={sy(h.y)} stroke={h.color} strokeDasharray="5 4" strokeWidth="1.5" />
            <text x={W - m.r - 4} y={sy(h.y) - 4} textAnchor="end" fontSize="10" fill={h.color}>
              {h.label}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.name}>
            {s.line && <polyline fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dashed ? '6 4' : undefined} points={s.line.map((p) => `${sx(p.x)},${sy(clampY(p.y, yDomain))}`).join(' ')} />}
            {s.points?.map((p, i) => (
              <g key={i}>
                {p.err !== undefined && <line x1={sx(p.x)} x2={sx(p.x)} y1={sy(p.y - p.err)} y2={sy(p.y + p.err)} stroke={s.color} strokeWidth="1.5" />}
                <circle cx={sx(p.x)} cy={sy(p.y)} r="4.5" fill={s.color} stroke="#0f172a" strokeWidth="1.5" />
              </g>
            ))}
          </g>
        ))}
        {markers.map((mk, i) => (
          <g key={i}>
            <path d={`M ${sx(mk.x)} ${sy(mk.y) - 7} l 6 7 l -6 7 l -6 -7 z`} fill={mk.color} stroke="#0f172a" />
            {mk.label && (
              <text x={sx(mk.x) + 10} y={sy(mk.y) + 4} fontSize="10" fill={mk.color}>
                {mk.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="h-0.5 w-4" style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
const clampY = (y: number, d: [number, number]) => Math.max(d[0] - (d[1] - d[0]) * 0.2, Math.min(d[1] + (d[1] - d[0]) * 0.2, y));

/* ---------- param panel ---------- */
export function ControlBar({ children, onRerun, title = 'Noise model & run settings' }: { children: ReactNode; onRerun: () => void; title?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/5 to-violet-400/5 p-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
          <span className="text-xs">{open ? '▾' : '▸'}</span> {title}
          <span className="ml-2 text-[10px] font-normal text-slate-400">everything below recomputes live</span>
        </button>
        <button onClick={onRerun} className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20">
          ↻ Re-run with new seed
        </button>
      </div>
      {open && <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>}
    </div>
  );
}

export const f3 = (x: number) => x.toFixed(3);
export const pct = (x: number) => (x * 100).toFixed(1) + '%';
