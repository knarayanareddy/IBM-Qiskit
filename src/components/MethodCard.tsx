import type { ReactNode } from "react";
import { gapClosed, gapClosedTvd, type MethodStat } from "../lib/simulator";
import { cn } from "../utils/cn";

export function fmtGap(g: number | null): string {
  if (g === null) return "—";
  return `${g >= 0 ? "+" : ""}${g.toFixed(0)}%`;
}

export function gapTone(g: number | null): string {
  if (g === null) return "text-slate-500";
  if (g > 50) return "text-emerald-300";
  if (g > 10) return "text-lime-300";
  if (g > -5) return "text-slate-300";
  return "text-rose-300";
}

export function MethodCard({
  title, icon, color, stat, raw, ideal, note, highlight, isIdeal, valueNote,
}: {
  title: string; icon: string; color: string; stat: MethodStat; raw: MethodStat; ideal: MethodStat; note?: ReactNode; highlight?: boolean; isIdeal?: boolean; valueNote?: string;
}) {
  const g = isIdeal ? null : gapClosed(raw.value, stat.value, ideal.value);
  const gt = isIdeal ? null : gapClosedTvd(raw.tvd, stat.tvd);
  const isRaw = stat === raw;
  return (
    <div
      className={cn("relative flex flex-col rounded-2xl border bg-slate-900/50 p-4", highlight ? "shadow-lg" : "border-slate-700/60")}
      style={highlight ? { borderColor: `${color}99`, boxShadow: `0 0 28px -12px ${color}` } : undefined}
    >
      <div aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-b" style={{ background: color }} />
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="mt-3 font-mono text-3xl font-bold" style={{ color }}>
        {(stat.value * 100).toFixed(1)}
        <span className="text-lg">%</span>
      </div>
      <div className="text-xs text-slate-500">
        {stat.se > 0 ? `± ${(stat.se * 100).toFixed(1)}%` : isIdeal ? "exact statevector" : "\u00a0"}
        {valueNote && <span className="ml-1">· {valueNote}</span>}
      </div>
      <dl className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <dt className="text-slate-500">Gap closed (metric)</dt>
          <dd className={cn("font-mono", gapTone(g))}>{isRaw ? "baseline" : isIdeal ? "—" : fmtGap(g)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">TVD to ideal</dt>
          <dd className="font-mono text-slate-300">{isIdeal ? "0" : stat.tvd.toFixed(3)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Gap closed (TVD)</dt>
          <dd className={cn("font-mono", gapTone(gt))}>{isRaw ? "baseline" : isIdeal ? "—" : fmtGap(gt)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Shots at full weight</dt>
          <dd className="font-mono text-slate-300">{stat.retention * 100}%</dd>
        </div>
      </dl>
      {note && <div className="mt-3 border-t border-slate-700/50 pt-2 text-[11px] leading-snug text-slate-500">{note}</div>}
    </div>
  );
}
