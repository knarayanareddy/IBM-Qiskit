import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_NOISE,
  parseCircuit,
  runExperiment,
  type Experiment,
  type Law,
  type NoiseConfig,
  type ParsedCircuit,
  type PriorMode,
} from "./simulator";
import { STAND_INS } from "./meta";

export type Version = "v1" | "v2";

interface Committed {
  source: string;
  cfg: NoiseConfig;
  law: Law;
  prior: PriorMode;
  seed: number;
}

interface LabStore {
  source: string;
  setSource: (s: string) => void;
  standInId: string | null;
  loadStandIn: (id: string) => void;
  cfg: NoiseConfig;
  setCfg: (c: NoiseConfig) => void;
  law: Law;
  setLaw: (l: Law) => void;
  version: Version;
  setVersion: (v: Version) => void;
  prior: PriorMode;
  setPrior: (p: PriorMode) => void;
  seed: number;
  rerun: () => void;
  parsed: ParsedCircuit;
  experiment: Experiment | null;
  error: string | null;
  pending: boolean;
  committed: Committed;
}

const Ctx = createContext<LabStore | null>(null);

export function useLab(): LabStore {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLab outside provider");
  return v;
}

export function LabProvider({ children }: { children: ReactNode }) {
  const initial = STAND_INS[3]; // weight-conserving VQE
  const [source, setSource] = useState(initial.code);
  const [standInId, setStandInId] = useState<string | null>(initial.id);
  const [cfg, setCfg] = useState<NoiseConfig>(DEFAULT_NOISE);
  const [law, setLaw] = useState<Law>(initial.law);
  const [version, setVersion] = useState<Version>("v2");
  const [prior, setPrior] = useState<PriorMode>("empirical");
  const [seed, setSeed] = useState(2026);

  const live = useMemo<Committed>(() => ({ source, cfg, law, prior, seed }), [source, cfg, law, prior, seed]);
  const [committed, setCommitted] = useState<Committed>(live);

  // debounce so dragging sliders / typing doesn't re-simulate on every event
  useEffect(() => {
    const t = setTimeout(() => setCommitted(live), 220);
    return () => clearTimeout(t);
  }, [live]);

  const parsed = useMemo(() => parseCircuit(committed.source), [committed.source]);

  const { experiment, error } = useMemo(() => {
    if (!parsed.ok) return { experiment: null, error: parsed.errors[0] ?? "Circuit did not parse." };
    try {
      return {
        experiment: runExperiment(parsed, committed.cfg, committed.law, { seed: committed.seed, prior: committed.prior }),
        error: null,
      };
    } catch (e) {
      return { experiment: null, error: (e as Error).message };
    }
  }, [parsed, committed.cfg, committed.law, committed.prior, committed.seed]);

  const loadStandIn = useCallback((id: string) => {
    const s = STAND_INS.find((x) => x.id === id);
    if (!s) return;
    setSource(s.code);
    setLaw(s.law);
    setStandInId(id);
  }, []);

  const setSourceCustom = useCallback((s: string) => {
    setSource(s);
    setStandInId(null);
  }, []);

  const rerun = useCallback(() => setSeed((x) => (x * 1664525 + 1013904223) >>> 0), []);

  const value: LabStore = {
    source, setSource: setSourceCustom, standInId, loadStandIn, cfg, setCfg, law, setLaw, version, setVersion, prior, setPrior,
    seed, rerun, parsed, experiment, error, pending: committed !== live, committed,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
