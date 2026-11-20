export type GateTone = 'default' | 'noise' | 'mit' | 'fold' | 'meas';
export interface Gate {
  c: number;
  type: 'box' | 'cx' | 'm' | 'span' | 'noise' | 'barrier';
  q: number;
  t?: number;
  label?: string;
  tone?: GateTone;
}
export interface Wire {
  label: string;
  tone?: 'data' | 'anc';
}
export interface Region {
  from: number;
  to: number;
  label: string;
  color: string;
}

const TONE: Record<GateTone, { fill: string; stroke: string; text: string }> = {
  default: { fill: '#0e7490', stroke: '#22d3ee', text: '#ecfeff' },
  noise: { fill: 'rgba(244,63,94,0.15)', stroke: '#fb7185', text: '#fecdd3' },
  mit: { fill: '#6d28d9', stroke: '#a78bfa', text: '#f5f3ff' },
  fold: { fill: '#b45309', stroke: '#fbbf24', text: '#fffbeb' },
  meas: { fill: '#334155', stroke: '#94a3b8', text: '#f1f5f9' },
};

export function Circuit({ wires, gates, regions = [], cols }: { wires: Wire[]; gates: Gate[]; regions?: Region[]; cols?: number }) {
  const GX = 52,
    GY = 46,
    L = 64,
    T = regions.length ? 34 : 14;
  const nCols = cols ?? Math.max(...gates.map((g) => g.c)) + 1;
  const W = L + nCols * GX + 20;
  const H = T + wires.length * GY + 8;
  const x = (c: number) => L + c * GX + GX / 2;
  const y = (q: number) => T + q * GY + GY / 2;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/70 p-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ minWidth: W }}>
        {regions.map((r) => (
          <g key={r.label}>
            <rect x={L + r.from * GX + 2} y={4} width={(r.to - r.from + 1) * GX - 4} height={H - 8} rx="8" fill={r.color} opacity="0.07" />
            <text x={L + r.from * GX + ((r.to - r.from + 1) * GX) / 2} y={18} textAnchor="middle" fontSize="10" fill={r.color} fontWeight="600">
              {r.label}
            </text>
          </g>
        ))}
        {wires.map((w, i) => (
          <g key={i}>
            <text x={L - 10} y={y(i) + 4} textAnchor="end" fontSize="12" fontFamily="monospace" fill={w.tone === 'anc' ? '#c4b5fd' : '#cbd5e1'}>
              {w.label}
            </text>
            <line x1={L} x2={W - 12} y1={y(i)} y2={y(i)} stroke={w.tone === 'anc' ? '#7c3aed' : '#475569'} strokeWidth="1.5" />
          </g>
        ))}
        {gates.map((g, i) => {
          const tone = TONE[g.tone ?? 'default'];
          const cx = x(g.c);
          if (g.type === 'barrier')
            return <line key={i} x1={cx} x2={cx} y1={T - 4} y2={H - 6} stroke="#64748b" strokeDasharray="3 4" />;
          if (g.type === 'cx') {
            const t = g.t ?? 0;
            return (
              <g key={i}>
                <line x1={cx} x2={cx} y1={y(g.q)} y2={y(t)} stroke={tone.stroke} strokeWidth="2" />
                <circle cx={cx} cy={y(g.q)} r="4.5" fill={tone.stroke} />
                <circle cx={cx} cy={y(t)} r="11" fill="#020617" stroke={tone.stroke} strokeWidth="2" />
                <line x1={cx - 7} x2={cx + 7} y1={y(t)} y2={y(t)} stroke={tone.stroke} strokeWidth="2" />
                <line x1={cx} x2={cx} y1={y(t) - 7} y2={y(t) + 7} stroke={tone.stroke} strokeWidth="2" />
              </g>
            );
          }
          if (g.type === 'm')
            return (
              <g key={i}>
                <rect x={cx - 16} y={y(g.q) - 14} width="32" height="28" rx="5" fill={TONE.meas.fill} stroke={TONE.meas.stroke} />
                <path d={`M ${cx - 9} ${y(g.q) + 6} A 10 10 0 0 1 ${cx + 9} ${y(g.q) + 6}`} fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                <line x1={cx} y1={y(g.q) + 6} x2={cx + 6} y2={y(g.q) - 6} stroke="#e2e8f0" strokeWidth="1.5" />
              </g>
            );
          if (g.type === 'noise')
            return (
              <g key={i}>
                <rect x={cx - 16} y={y(g.q) - 14} width="32" height="28" rx="6" fill={TONE.noise.fill} stroke={TONE.noise.stroke} strokeDasharray="4 3" />
                <text x={cx} y={y(g.q) + 5} textAnchor="middle" fontSize="14" fill={TONE.noise.stroke}>
                  ⚡
                </text>
              </g>
            );
          if (g.type === 'span') {
            const t = g.t ?? g.q;
            const y0 = y(Math.min(g.q, t)) - 14,
              y1 = y(Math.max(g.q, t)) + 14;
            return (
              <g key={i}>
                <rect x={cx - 18} y={y0} width="36" height={y1 - y0} rx="6" fill={tone.fill} stroke={tone.stroke} />
                <text x={cx} y={(y0 + y1) / 2 + 4} textAnchor="middle" fontSize="10" fill={tone.text} fontWeight="600">
                  {g.label}
                </text>
              </g>
            );
          }
          return (
            <g key={i}>
              <rect x={cx - 16} y={y(g.q) - 14} width="32" height="28" rx="5" fill={tone.fill} stroke={tone.stroke} />
              <text x={cx} y={y(g.q) + 4.5} textAnchor="middle" fontSize={(g.label?.length ?? 1) > 2 ? 10 : 13} fill={tone.text} fontWeight="600" fontFamily="monospace">
                {g.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
