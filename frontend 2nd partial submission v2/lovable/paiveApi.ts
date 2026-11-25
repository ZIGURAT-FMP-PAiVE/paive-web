// PAiVE back-end client for the Lovable app.
// Copy this file into the Lovable project as src/lib/paiveApi.ts (or ask Lovable to create it from this text).
// Contract: docs/integration/api-contract.md in ZIGURAT-FMP-PAiVE/PAiVE. Back end: src/paive/api/server.py.
//
// The back end runs in Google Colab behind a temporary HTTPS tunnel, so its URL changes every session.
// The URL and the API key are therefore typed by the user on the Settings screen and kept in localStorage.

export type ElementStatus = "mapped" | "unmapped" | "out_of_scope" | "read";

export interface Health {
  status: "ok";
  api_version: string;
  paive_version: string;
  git_commit: string | null;
  storage: "google_drive" | "folder" | "local";
  storage_root: string;
  auth_required: boolean;
  time: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  task: "read" | "classify_functions" | string;
  description: string;
  available: boolean;
  status: string; // "ready" or why it is not available
}

export interface ElementResult {
  guid: string;
  name?: string;
  type_name?: string;
  ifc_class?: string;
  storey?: string;
  materials?: string;
  total_thickness_mm?: number | null;
  is_external?: string;
  u_value?: number | null;
  fire_min?: number | null;
  rw_db?: number | null;
  area_m2?: number | null;
  status: ElementStatus;
  functions: string[]; // e.g. ["F-HEAT", "F-FIRE"]
  proba?: Record<string, number>;
  confidence: number | null; // 0-1, null for the no-AI reader
  category?: string; // external | party | internal | core (VE2 v03)
  [extra: string]: unknown;
}

export interface ClassifyResult {
  run_id: string;
  created: string;
  model: string;
  model_name: string;
  ifc_name: string;
  git_commit: string | null;
  min_confidence?: number;
  elements: ElementResult[];
  summary: { n_elements: number; by_status: Partial<Record<ElementStatus, number>> };
}

export interface RunSummary {
  run_id: string;
  created: string;
  model: string;
  ifc_name: string;
  summary: ClassifyResult["summary"];
}


// ---------------------------------------------------------------- full run (VE1-VE6) - app/fixtures/*.json
export type Verdict = "baseline" | "value_up" | "value_down" | "no_change";
export type WallColour = "red" | "amber" | "green" | "grey";
export type StepStatus = "done" | "waiting" | "draft" | "blocked" | "not_run";

export interface WallFunction {
  function_id: string; // F-SEP F-HEAT F-FIRE F-SOUND F-ENCL F-LOAD
  statement: string; // "Control Heat"
  type: "basic" | "required_secondary" | "gate";
  probability: number | null; // AI model output (null = rules)
  predicted: boolean;
  source: string; // model | rules | brief | always 1
}

export interface Wall {
  guid: string;
  name: string;
  type: string | null;
  price_code: string | null;
  storey: string;
  area_m2: number | null;
  is_external: boolean | null;
  load_bearing: boolean | null;
  u_value: number | null;
  fire_min: number | null;
  rw_db: number | null;
  change: "changed" | "new" | "unchanged";
  previous: Record<string, unknown> | null;
  ve2: { status: ElementStatus; wall_category: string | null; category_confidence: number | null;
         functions: WallFunction[]; model: string; reason?: string };
  scores: Record<string, number>;
  achievement_pct: Record<string, number>;
  cost_eur: number | null;
  flags: string[];
  colour: WallColour; // colour the wall by guid in the 3D view
}

export interface Option {
  rank: number;
  group: string;
  assembly_id: string;
  price_code: string;
  description: string;
  source: string;
  similarity: number;
  performance: { u_value: number | null; fire_min: number | null; rw_db: number | null };
  scores: Record<string, number>;
  achievement_pct: Record<string, number>;
  meets_all_required_targets: boolean;
  meets_preferred_targets?: boolean | null;          // null = no preferred target triggered this group
  better_value_than_current?: boolean;
  triggers?: Trigger[];
  assumed_from_current_design?: string[];            // functions with no library value (current value used)
  newly_misses_preferred?: string[];
  F: number; R_eur: number; V: number;
  dV_vs_current_pct: number; dR_vs_current_eur: number;
  topsis_closeness: number;
  applies_to_guids: string[];
  why: string;
}

/** Why a wall group gets options: below a required target / newly below a preferred target / lost value (Value down). */
export type Trigger = "required" | "preferred" | "value";

export interface OptionGroup {
  group: string; wall_category: string; price_code: string; guids: string[];
  triggers: Trigger[]; why: string; weak_functions: string[];
  walls_that_lost_value: { guid: string; cost_before: number; cost_now: number; wall_value_change_pct: number }[];
  status: "ok" | "no alternative found";
  best?: string;                                     // "current design" or the price code TOPSIS ranks first
  current_design: { price_code: string; F: number; R_eur: number; V: number | null; topsis_closeness?: number };
}

export interface RunResult {
  schema_version: string;
  run_id: string;
  status: "done" | "blocked";
  created_at: string;
  model_version?: string;
  project: { id: string; name: string; stage: string; confidential: boolean; currency: string };
  input: { ifc_file: string; version_label: string; note: string; uploaded_by: string;
           compare_to: { run_id: string | null; ifc_file: string; version_label: string; mode: string } | null };
  steps: { step: string; name: string; status: StepStatus; seconds?: number }[];
  ve1?: { summary: Record<string, number>; missing_fields: unknown[]; missing_project_data: unknown[] };
  weights?: { weights: Record<string, number>; consistency_ratio: number };
  d1: null | { verdict: Verdict; verdict_label: string; reason: string; dV_pct?: number; dR_eur?: number;
               achievement_previous_pct?: number; achievement_current_pct: number;
               required_targets_failed: { function_id: string; statement: string; target: number; actual: number;
                                          unit: string; walls: number }[]; [k: string]: unknown };
  walls: Wall[];
  ve3?: { embedding_model: string; excluded: { assembly_id: string; description: string; reason: string }[] };
  d2: null | { options: Option[]; groups?: OptionGroup[]; current_design: Record<string, unknown> | null;
               stability: { label: "Stable" | "Sensitive" | null }; note?: string; [k: string]: unknown };
  ve6: null | { text: string; llm: string; model: string | null; template_used: boolean;
                number_check: { passed: boolean; unmatched: string[] } };
  blocked?: { failure_test: string; step: string; message: string; missing: Record<string, unknown>[]; what_to_do: string };
  decision: null | { decision: "accept" | "reject"; reviewer: string; reason: string; selected_option: string | null; at: string };
}

export interface DecisionResult {
  run_id: string; decision: "accept" | "reject"; selected_option: string | null; reviewer: string; reason: string; at: string;
  result: { logged: boolean; log_id: number; write_back_to_bim: false; reference_version?: string; next_option?: string | null; message?: string;
            group?: string;
            round?: number;                                  // reject loop: VE3 searched again for this group
            new_options?: { assembly_id: string; description: string; dR_vs_current_eur: number; dV_vs_current_pct: number | null;
                            meets_all_required_targets: boolean; assumed_from_current_design: string[]; topsis_closeness: number }[] };
}

export interface LogEvent { log_id: number; at: string; event: string; run_id?: string; user?: string; reason?: string; [k: string]: unknown }

const URL_KEY = "paive.backendUrl";
const KEY_KEY = "paive.apiKey";

export const settings = {
  get url(): string {
    return (localStorage.getItem(URL_KEY) ?? "").replace(/\/+$/, "");
  },
  set url(v: string) {
    localStorage.setItem(URL_KEY, v.trim().replace(/\/+$/, ""));
  },
  get apiKey(): string {
    return localStorage.getItem(KEY_KEY) ?? "";
  },
  set apiKey(v: string) {
    localStorage.setItem(KEY_KEY, v.trim());
  },
};

export class PaiveApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!settings.url) throw new PaiveApiError(0, "Back-end URL not set - open Settings and paste the URL from the Colab notebook.");
  let res: Response;
  try {
    res = await fetch(`${settings.url}${path}`, {
      ...init,
      headers: { ...(settings.apiKey ? { "X-API-Key": settings.apiKey } : {}), ...(init.headers ?? {}) },
    });
  } catch {
    throw new PaiveApiError(0, "Back end offline - is the Colab notebook running and the URL current?");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch { /* not JSON */ }
    throw new PaiveApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const paiveApi = {
  health: () => call<Health>("/health"),
  models: () => call<{ models: ModelInfo[] }>("/models").then((r) => r.models),
  samples: () => call<{ samples: string[] }>("/samples").then((r) => r.samples),
  /** Upload an IFC file (or pass sample name instead) and run one model on it. */
  classify: (model: string, input: { file?: File; sample?: string }) => {
    const form = new FormData();
    form.append("model", model);
    if (input.file) form.append("file", input.file);
    else if (input.sample) form.append("sample", input.sample);
    return call<ClassifyResult>("/classify", { method: "POST", body: form });
  },
  runs: (limit = 50) => call<{ runs: RunSummary[] }>(`/runs?limit=${limit}`).then((r) => r.runs),
  run: (runId: string) => call<ClassifyResult>(`/runs/${encodeURIComponent(runId)}`),

  // ---- full run VE1-VE6 (Upload & Run -> Result -> Options -> Report & Log) ----
  /** Upload the latest IFC version (or a sample) and press Run. compare_to: "last-accepted" | "none" | a run_id. */
  fullRun: (input: { file?: File; sample?: string; compare_to?: string; note?: string; uploaded_by?: string }) => {
    const form = new FormData();
    if (input.file) form.append("file", input.file);
    else if (input.sample) form.append("sample", input.sample);
    form.append("compare_to", input.compare_to ?? "last-accepted");
    form.append("note", input.note ?? "");
    form.append("uploaded_by", input.uploaded_by ?? "");
    return call<RunResult>("/run", { method: "POST", body: form });
  },
  getRun: (runId: string) => call<RunResult>(`/run/${encodeURIComponent(runId)}`),
  /** VE5: a reason is always required (the server answers 400 without one). */
  decide: (body: { run_id: string; decision: "accept" | "reject"; reviewer: string; reason: string; selected_option?: string | null;
                   group?: string }) =>                // group = the wall group the decision is about (d2.groups[].group)
    call<DecisionResult>("/decide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  log: (limit = 200) => call<{ events: LogEvent[] }>(`/log?limit=${limit}`).then((r) => r.events),
};
