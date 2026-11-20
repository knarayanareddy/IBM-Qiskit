import type { ReactNode } from 'react';
import { Panel } from './ui';

export function DiffTable({ rows }: { rows: [string, ReactNode, ReactNode][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="grid grid-cols-[120px_1fr_1fr] bg-white/5 text-[11px] font-semibold uppercase tracking-wider">
        <div className="p-2.5 text-slate-400">Aspect</div>
        <div className="p-2.5 text-amber-300">Before · v1</div>
        <div className="p-2.5 text-emerald-300">After · v2</div>
      </div>
      {rows.map(([a, b, c]) => (
        <div key={a} className="grid grid-cols-[120px_1fr_1fr] border-t border-white/5 text-xs">
          <div className="p-2.5 font-medium text-slate-300">{a}</div>
          <div className="p-2.5 text-slate-400">{b}</div>
          <div className="p-2.5 text-slate-200">{c}</div>
        </div>
      ))}
    </div>
  );
}

export function Checklist({ title, items, tone = 'cyan' }: { title: string; items: ReactNode[]; tone?: 'cyan' | 'amber' | 'rose' | 'emerald' }) {
  const c = { cyan: 'text-cyan-300', amber: 'text-amber-300', rose: 'text-rose-300', emerald: 'text-emerald-300' }[tone];
  return (
    <Panel title={title}>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-300">
            <span className={c}>▸</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-violet-400/20 bg-violet-400/5 px-4 py-3 text-center font-mono text-sm text-violet-200">{children}</div>;
}
