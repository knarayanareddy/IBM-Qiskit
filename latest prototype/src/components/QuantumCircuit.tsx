import { layerOps, type ParsedCircuit, type GateOp } from "../lib/simulator";

const ROW = 42;
const COL = 48;
const LEFT = 46;
const TOP = 22;

function fmtAngle(x: number): string {
  const k = x / Math.PI;
  const dens = [1, 2, 3, 4, 6, 8];
  for (const d of dens) {
    const n = k * d;
    if (Math.abs(n - Math.round(n)) < 1e-6) {
      const nn = Math.round(n);
      if (nn === 0) return "0";
      const num = nn === 1 ? "π" : nn === -1 ? "-π" : `${nn}π`;
      return d === 1 ? num : `${num}/${d}`;
    }
  }
  return x.toFixed(2);
}

const LABEL: Record<string, string> = {
  id: "I", x: "X", y: "Y", z: "Z", h: "H", s: "S", sdg: "S†", t: "T", tdg: "T†", sx: "√X", sxdg: "√X†",
  rx: "Rx", ry: "Ry", rz: "Rz", p: "P", u2: "U2", u3: "U", crx: "Rx", cry: "Ry", crz: "Rz", cp: "P", ch: "H",
  rxx: "XX", ryy: "YY", rzz: "ZZ", rzx: "ZX", iswap: "iSW",
};

function style(op: GateOp): { fill: string; stroke: string; text: string } {
  const n = op.name;
  if (n === "t" || n === "tdg") return { fill: "#451a03", stroke: "#f59e0b", text: "#fcd34d" }; // non-Clifford
  if (["rx", "ry", "rz", "p", "u2", "u3", "crx", "cry", "crz", "cp", "rxx", "ryy", "rzz", "rzx"].includes(n))
    return { fill: "#2e1065", stroke: "#a78bfa", text: "#ddd6fe" };
  return { fill: "#083344", stroke: "#22d3ee", text: "#a5f3fc" };
}

export function QuantumCircuit({ circuit }: { circuit: ParsedCircuit }) {
  const n = Math.max(1, circuit.nQubits);
  const { cols, depth } = layerOps(circuit.ops, n);
  const measCol = depth;
  const width = LEFT + (depth + (circuit.measured.length ? 1 : 0)) * COL + 24;
  const height = TOP + n * ROW + 4;
  const cx = (c: number) => LEFT + c * COL + COL / 2;
  const cy = (q: number) => TOP + q * ROW + ROW / 2;

  const box = (c: number, q: number, op: GateOp, label: string, key: string) => {
    const st = style(op);
    const sub = op.params.length ? op.params.map(fmtAngle).join(",") : "";
    return (
      <g key={key}>
        <rect x={cx(c) - 16} y={cy(q) - 14} width={32} height={28} rx={5} fill={st.fill} stroke={st.stroke} strokeWidth={1.4} />
        <text x={cx(c)} y={cy(q) + (sub ? -1 : 4)} textAnchor="middle" fontSize={label.length > 2 ? 10 : 12} fontWeight={600} fill={st.text}>
          {label}
        </text>
        {sub && (
          <text x={cx(c)} y={cy(q) + 10} textAnchor="middle" fontSize={8} fill={st.text} opacity={0.85}>
            {sub.length > 7 ? sub.slice(0, 7) : sub}
          </text>
        )}
        <title>{`${op.name}${op.params.length ? "(" + op.params.map((p) => p.toFixed(4)).join(", ") + ")" : ""} q[${op.qubits.join(",")}]`}</title>
      </g>
    );
  };

  const dot = (c: number, q: number, key: string) => <circle key={key} cx={cx(c)} cy={cy(q)} r={4.5} fill="#e2e8f0" />;
  const xTarget = (c: number, q: number, key: string) => (
    <g key={key}>
      <circle cx={cx(c)} cy={cy(q)} r={11} fill="#0f172a" stroke="#22d3ee" strokeWidth={1.6} />
      <line x1={cx(c) - 11} x2={cx(c) + 11} y1={cy(q)} y2={cy(q)} stroke="#22d3ee" strokeWidth={1.6} />
      <line x1={cx(c)} x2={cx(c)} y1={cy(q) - 11} y2={cy(q) + 11} stroke="#22d3ee" strokeWidth={1.6} />
    </g>
  );
  const swapX = (c: number, q: number, key: string) => (
    <g key={key} stroke="#a78bfa" strokeWidth={2}>
      <line x1={cx(c) - 6} x2={cx(c) + 6} y1={cy(q) - 6} y2={cy(q) + 6} />
      <line x1={cx(c) - 6} x2={cx(c) + 6} y1={cy(q) + 6} y2={cy(q) - 6} />
    </g>
  );

  const els = circuit.ops.map((op, i) => {
    const c = cols[i];
    const qs = op.qubits;
    const lo = Math.min(...qs), hi = Math.max(...qs);
    const k = `g${i}`;
    const line = qs.length > 1 ? <line key={`${k}l`} x1={cx(c)} x2={cx(c)} y1={cy(lo)} y2={cy(hi)} stroke="#94a3b8" strokeWidth={1.5} /> : null;
    const nm = op.name;
    if (nm === "cx" || nm === "ccx")
      return (
        <g key={k}>
          {line}
          {qs.slice(0, -1).map((q, j) => dot(c, q, `${k}d${j}`))}
          {xTarget(c, qs[qs.length - 1], `${k}t`)}
        </g>
      );
    if (nm === "cz" || nm === "ccz")
      return (
        <g key={k}>
          {line}
          {qs.map((q, j) => dot(c, q, `${k}d${j}`))}
        </g>
      );
    if (nm === "swap")
      return (
        <g key={k}>
          {line}
          {swapX(c, qs[0], `${k}a`)}
          {swapX(c, qs[1], `${k}b`)}
        </g>
      );
    if (nm === "cswap")
      return (
        <g key={k}>
          {line}
          {dot(c, qs[0], `${k}c`)}
          {swapX(c, qs[1], `${k}a`)}
          {swapX(c, qs[2], `${k}b`)}
        </g>
      );
    if (["cy", "ch", "cp", "crx", "cry", "crz"].includes(nm))
      return (
        <g key={k}>
          {line}
          {dot(c, qs[0], `${k}c`)}
          {box(c, qs[1], op, LABEL[nm] ?? nm.toUpperCase(), `${k}b`)}
        </g>
      );
    if (qs.length === 2)
      return (
        <g key={k}>
          {line}
          {box(c, qs[0], op, LABEL[nm] ?? nm, `${k}a`)}
          {box(c, qs[1], op, LABEL[nm] ?? nm, `${k}b`)}
        </g>
      );
    return box(c, qs[0], op, LABEL[nm] ?? nm.toUpperCase(), k);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-950/60 p-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Quantum circuit, ${circuit.nQubits} qubits, depth ${depth}`}>
        {Array.from({ length: n }, (_, q) => (
          <g key={q}>
            <text x={8} y={cy(q) + 4} fontSize={11} fill="#94a3b8" fontFamily="ui-monospace,monospace">q{q}</text>
            <line x1={LEFT - 6} x2={width - 10} y1={cy(q)} y2={cy(q)} stroke="#475569" strokeWidth={1.2} />
          </g>
        ))}
        {els}
        {circuit.measured.map((q) => (
          <g key={`m${q}`}>
            <rect x={cx(measCol) - 15} y={cy(q) - 13} width={30} height={26} rx={5} fill="#022c22" stroke="#34d399" strokeWidth={1.3} />
            <path d={`M ${cx(measCol) - 8} ${cy(q) + 5} A 8 8 0 0 1 ${cx(measCol) + 8} ${cy(q) + 5}`} fill="none" stroke="#6ee7b7" strokeWidth={1.3} />
            <line x1={cx(measCol)} y1={cy(q) + 5} x2={cx(measCol) + 6} y2={cy(q) - 6} stroke="#6ee7b7" strokeWidth={1.3} />
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 px-2 pb-1 pt-2 text-[11px] text-slate-400">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-cyan-400 bg-cyan-950" />Clifford</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-amber-400 bg-amber-950" />T / non-Clifford</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-violet-400 bg-violet-950" />rotation</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-emerald-400 bg-emerald-950" />measure</span>
      </div>
    </div>
  );
}
