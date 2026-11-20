import type { Op } from "../lib/quantum";

const COL = 56;
const ROW = 52;
const PADX = 54;
const PADY = 28;

const GATE_COLOR: Record<string, string> = {
  h: "#22d3ee",
  x: "#fb7185",
  z: "#a78bfa",
  t: "#fbbf24",
  rz: "#fbbf24",
};

/** greedy left-to-right layering, like Qiskit's drawer */
function layout(n: number, ops: Op[]) {
  const next = new Array(n).fill(0);
  return ops.map((op) => {
    const qs = op.g === "cx" ? [op.c ?? 0, op.q] : [op.q];
    const lo = Math.min(...qs), hi = Math.max(...qs);
    let col = 0;
    for (let q = lo; q <= hi; q++) col = Math.max(col, next[q]);
    for (let q = lo; q <= hi; q++) next[q] = col + 1;
    return col;
  });
}

export function CircuitDiagram({
  n,
  ops,
  measure = false,
  selected,
  onSelect,
  minCols = 3,
}: {
  n: number;
  ops: Op[];
  measure?: boolean;
  /** index of selected op, -1 = wires, -2 = measure */
  selected?: number | null;
  onSelect?: (i: number) => void;
  minCols?: number;
}) {
  const cols = layout(n, ops);
  const nCols = Math.max(minCols, ...cols.map((c) => c + 1)) + (measure ? 1 : 0);
  const W = PADX + nCols * COL + 20;
  const H = PADY * 2 + (n - 1) * ROW + 8;
  const y = (q: number) => PADY + q * ROW;
  const x = (c: number) => PADX + c * COL + COL / 2;
  const sel = (i: number) => selected === i;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950/70 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: Math.min(W, 420), width: "100%", maxWidth: W * 1.4 }} role="img" aria-label="Quantum circuit diagram">
        {Array.from({ length: n }, (_, q) => (
          <g key={q} onClick={() => onSelect?.(-1)} style={{ cursor: onSelect ? "pointer" : "default" }}>
            <text x={10} y={y(q) + 4} fontSize="13" fontFamily="monospace" fill="#94a3b8">q{q}</text>
            <line x1={PADX - 8} x2={W - 12} y1={y(q)} y2={y(q)} stroke={sel(-1) ? "#22d3ee" : "#475569"} strokeWidth={sel(-1) ? 2 : 1.4} />
          </g>
        ))}
        {ops.map((op, i) => {
          const cx = x(cols[i]);
          const hl = sel(i);
          const click = () => onSelect?.(i);
          const cursor = onSelect ? "pointer" : "default";
          if (op.g === "cx") {
            const cy = y(op.c ?? 0), ty = y(op.q);
            return (
              <g key={i} onClick={click} style={{ cursor }}>
                <rect x={cx - 20} y={Math.min(cy, ty) - 20} width={40} height={Math.abs(cy - ty) + 40} fill={hl ? "#22d3ee22" : "transparent"} rx={8} />
                <line x1={cx} x2={cx} y1={cy} y2={ty} stroke="#e2e8f0" strokeWidth={2} />
                <circle cx={cx} cy={cy} r={5.5} fill="#e2e8f0" />
                <circle cx={cx} cy={ty} r={13} fill="#0f172a" stroke="#e2e8f0" strokeWidth={2} />
                <line x1={cx - 13} x2={cx + 13} y1={ty} y2={ty} stroke="#e2e8f0" strokeWidth={2} />
                <line x1={cx} x2={cx} y1={ty - 13} y2={ty + 13} stroke="#e2e8f0" strokeWidth={2} />
              </g>
            );
          }
          const col = GATE_COLOR[op.g] ?? "#e2e8f0";
          const label = op.g === "rz" ? "Rz" : op.g.toUpperCase();
          return (
            <g key={i} onClick={click} style={{ cursor }}>
              <rect x={cx - 18} y={y(op.q) - 18} width={36} height={36} rx={7} fill="#0f172a" stroke={col} strokeWidth={hl ? 3 : 1.8} />
              {hl && <rect x={cx - 23} y={y(op.q) - 23} width={46} height={46} rx={10} fill="none" stroke={col} opacity={0.4} />}
              <text x={cx} y={y(op.q) + 5} textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="monospace" fill={col}>{label}</text>
            </g>
          );
        })}
        {measure &&
          Array.from({ length: n }, (_, q) => {
            const cx = x(nCols - 1);
            const hl = sel(-2);
            return (
              <g key={`m${q}`} onClick={() => onSelect?.(-2)} style={{ cursor: onSelect ? "pointer" : "default" }}>
                <rect x={cx - 18} y={y(q) - 18} width={36} height={36} rx={7} fill="#0f172a" stroke={hl ? "#34d399" : "#64748b"} strokeWidth={hl ? 3 : 1.8} />
                <path d={`M ${cx - 11} ${y(q) + 7} A 11 11 0 0 1 ${cx + 11} ${y(q) + 7}`} fill="none" stroke={hl ? "#34d399" : "#cbd5e1"} strokeWidth={1.8} />
                <line x1={cx} y1={y(q) + 7} x2={cx + 8} y2={y(q) - 7} stroke={hl ? "#34d399" : "#cbd5e1"} strokeWidth={1.8} />
              </g>
            );
          })}
      </svg>
    </div>
  );
}
