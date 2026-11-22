export type VeStepStatus = "done" | "waiting" | "draft" | "blocked" | "not_run";

export type PaiveRun = {
  schema_version: string;
  run_id: string;
  status: "done" | "blocked";
  created_at: string;
  project: { id: string; name: string; stage: string; currency: string };
  input: {
    ifc_file: string;
    version_label: string;
    note?: string;
    uploaded_by?: string;
    compare_to?: { version_label: string; ifc_file?: string };
  };
  steps: { step: string; name: string; status: VeStepStatus; seconds?: number }[];
  blocked?: {
    message: string;
    missing: { field: string; detail: string }[];
    what_to_do?: string;
  };
  ve1?: {
    summary: {
      walls_total: number;
      mapped: number;
      unmapped: number;
      changed: number;
      unchanged: number;
      area_in_scope_m2: number;
    };
  };
  weights?: {
    weights: Record<string, number>;
    consistency_ratio: number;
  };
  d1?: {
    verdict: string;
    verdict_label: string;
    reason: string;
    achievement_previous_pct: number;
    achievement_current_pct: number;
    dV_pct: number;
    dR_eur: number;
    required_targets_failed: {
      statement: string;
      target: number;
      actual: number;
      unit: string;
      walls: number;
    }[];
  };
  walls?: PaiveWall[];
  ve3?: {
    excluded: { assembly_id: string; description: string; reason: string }[];
  };
  d2?: {
    options: PaiveOption[];
    note?: string;
    current_design?: { price_code: string; F: number; R_eur: number; V: number };
    stability?: { label: string };
  };
  ve6?: {
    text: string;
    number_check: { passed: boolean };
    status: string;
  };
};

export type PaiveWall = {
  guid: string;
  name: string;
  type: string | null;
  area_m2: number;
  change: string;
  u_value: number | null;
  fire_min: number | null;
  rw_db: number | null;
  colour: string;
  cost_eur: number | null;
  flags: string[];
  ve2: {
    status: string;
    reason?: string;
    functions: { statement: string; probability: number }[];
  };
  achievement_pct: Record<string, number>;
};

export type PaiveOption = {
  rank: number;
  assembly_id: string;
  description: string;
  dV_vs_current_pct: number;
  dR_vs_current_eur: number;
  meets_all_required_targets: boolean;
  why: string;
  source: string;
  similarity: number;
  performance: { u_value: number; fire_min: number; rw_db: number };
  achievement_pct: Record<string, number>;
};

export type PaiveLogEntry = {
  log_id: number;
  at: string;
  event: string;
  run_id?: string;
  version?: string;
  verdict?: string;
  decision?: string;
  reason?: string;
  user?: string;
  status?: string;
};

export type DecideResult =
  | { error: { code: string; message: string } }
  | {
      run_id: string;
      reviewer: string;
      reason: string;
      result: { decision: string; next_option?: PaiveOption; log_id: number };
    };