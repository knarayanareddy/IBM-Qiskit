import { bitstring } from "../lib/simulator";
import { cn } from "../utils/cn";

export interface Series {
  label: string;
  color: string;
  probs: Float64Array;
}

/** Grouped bar chart of the most probable outcomes. Outcomes violating the law get a ✗ marker. */
export function DistChart({
  series, m, mask, topN = 10, height = 150,
}: {
  series: Series[]; m: number; mask?: Uint8Array; topN?: number; height?: number;
}) {
  const dim = 1 << m;
  const score = new Float64Array(dim);
  for (const s of series) for (let i = 0; i < dim; i++) score[i] = Math.max(score[i], s.probs[i]);
  const idx = Array.from({ length: dim }, (_, i) => i)
    .sort((a, b) => score[b] - score[a])
    .slice(0, Math.min(topN, dim))
    .sort((a, b) => a - b);
  const maxP = Math.max(0.0001, ...idx.map((i) => score[i]));
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-slate-400">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        {mask && <span className="ml-auto text-slate-500">✗ = violates the law</span>}
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-fit items-end gap-2" style={{ height: height + 38 }}>
          {idx.map((i) => (
            <div key={i} className="flex flex-col items-center gap-1" style={{ minWidth: Math.max(34, series.length * 11 + 8) }}>
              <div className="flex items-end gap-0.5" style={{ height }}>
                {series.map((s) => (
                  <div
                    key={s.label}
                    title={`${s.label}: ${(s.probs[i] * 100).toFixed(2)}%`}
                    className="w-2.5 rounded-t-sm transition-all duration-500"
                    style={{ height: Math.max(1, (s.probs[i] / maxP) * height), background: s.color }}
                  />
                ))}
              </div>
              <div className="font-mono text-[10px] text-slate-300">{bitstring(i, m)}</div>
              {mask && <div className={cn("text-[10px] leading-none", mask[i] ? "text-emerald-400" : "text-rose-400")}>{mask[i] ? "✓" : "✗"}</div>}
            </div>
          ))}
        </div>
      </div>
      {dim > topN && <div className="mt-1 text-[11px] text-slate-500">Showing top {topN} of {dim} outcomes.</div>}
    </div>
  );
}

export interface Bar {
  label: string;
  value: number;
  color: string;
  note?: string;
  highlight?: boolean;
}

/** Horizontal bars with an optional ideal marker. */
export function HBars({
  bars, max, marker, markerLabel, format = (v) => v.toFixed(3),
}: {
  bars: Bar[]; max?: number; marker?: number; markerLabel?: string; format?: (v: number) => string;
}) {
  const top = max ?? Math.max(...bars.map((b) => b.value), marker ?? 0, 1e-9) * 1.08;
  return (
    <div className="space-y-2.5">
      {bars.map((b) => (
        <div key={b.label} className={cn("grid grid-cols-[minmax(7rem,11rem)_1fr_4.5rem] items-center gap-3 text-sm", b.highlight && "font-semibold")}>
          <span className={cn("truncate text-slate-300", b.highlight && "text-pink-300")} title={b.label}>
            {b.label}
          </span>
          <div className="relative h-5 rounded bg-slate-700/40">
            <div className="h-full rounded transition-all duration-500" style={{ width: `${Math.min(100, (b.value / top) * 100)}%`, background: b.color }} />
            {marker !== undefined && (
              <div className="absolute inset-y-[-3px] w-0.5 bg-white/80" style={{ left: `${Math.min(100, (marker / top) * 100)}%` }} title={markerLabel} />
            )}
          </div>
          <span className="text-right font-mono text-xs text-slate-200">{format(b.value)}</span>
        </div>
      ))}
      {marker !== undefined && markerLabel && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-block h-3 w-0.5 bg-white/80" /> {markerLabel}
        </div>
      )}
    </div>
  );
}

export interface LineSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[];
  dashed?: boolean;
  width?: number;
}

export interface HLine {
  y: number;
  label: string;
  color: string;
}

export interface Marker {
  x: number;
  y: number;
  color: string;
  label?: string;
}

export function LineChart({
  series, xLabel, yLabel, yMin = 0, yMax = 1, width = 520, height = 220, yFormat = (v) => `${Math.round(v * 100)}%`, xFormat = (v) => v.toFixed(1), hlines,
  xDomain, yDomain, markers,
}: {
  series: LineSeries[]; xLabel: string; yLabel: string; yMin?: number; yMax?: number; width?: number; height?: number;
  yFormat?: (v: number) => string; xFormat?: (v: number) => string; hlines?: HLine[];
  xDomain?: [number, number]; yDomain?: [number, number];
  markers?: Marker[];
}) {
  const pad = { l: 44, r: 12, t: 12, b: 36 };
  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const x0 = xDomain?.[0] ?? Math.min(...xs);
  const x1 = xDomain?.[1] ?? Math.max(...xs);
  const y0 = yDomain?.[0] ?? yMin;
  const y1 = yDomain?.[1] ?? yMax;
  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (width - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - y0) / (y1 - y0 || 1)) * (height - pad.t - pad.b);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => y0 + t * (y1 - y0));
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`${yLabel} versus ${xLabel}`}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} stroke="#334155" strokeWidth={1} strokeDasharray="3 4" />
            <text x={pad.l - 6} y={sy(t) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{yFormat(t)}</text>
          </g>
        ))}
        {hlines?.map((h) => (
          <g key={h.label}>
            <line x1={pad.l} x2={width - pad.r} y1={sy(h.y)} y2={sy(h.y)} stroke={h.color} strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={pad.l - 6} y={sy(h.y) + 3} textAnchor="end" fontSize={10} fill={h.color}>{h.label}</text>
          </g>
        ))}
        {series[0]?.points.map((p) => (
          <text key={p.x} x={sx(p.x)} y={height - 18} textAnchor="middle" fontSize={10} fill="#94a3b8">{xFormat(p.x)}</text>
        ))}
        <text x={(pad.l + width - pad.r) / 2} y={height - 3} textAnchor="middle" fontSize={10} fill="#64748b">{xLabel}</text>
        {series.map((s) => (
          <g key={s.label}>
            <polyline
              fill="none" stroke={s.color} strokeWidth={s.width ?? 2.2} strokeDasharray={s.dashed ? "6 4" : undefined}
              points={s.points.map((p) => `${sx(p.x)},${sy(Math.max(y0, Math.min(y1, p.y)))}`).join(" ")}
            />
            {s.points.map((p) => (
              <circle key={p.x} cx={sx(p.x)} cy={sy(Math.max(y0, Math.min(y1, p.y)))} r={3} fill={s.color} />
            ))}
          </g>
        ))}
        {markers?.map((m, i) => {
          const cx = sx(Math.max(x0, Math.min(x1, m.x)));
          const cy = sy(Math.max(y0, Math.min(y1, m.y)));
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={4} fill="none" stroke={m.color} strokeWidth={2} />
              <circle cx={cx} cy={cy} r={2} fill={m.color} />
              {m.label && (
                <text x={cx} y={cy - 8} textAnchor="middle" fontSize={10} fill="#94a3b8">{m.label}</text>
              )}
            </g>
          );
        })}
        {series.flatMap((s) =>
          s.points.map((p, i) => (
            <text key={`${s.label}-${i}`} x={sx(p.x)} y={sy(Math.max(y0, Math.min(y1, p.y))) - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">
              {p.y.toFixed(1)}
            </text>
          ))
        )}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        {hlines?.map((h) => (
          <span key={h.label} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-0.5 w-3" style={{ background: h.color }} />
            {h.label}
          </span>
        ))}
      </div>
    </div>
  );
}
