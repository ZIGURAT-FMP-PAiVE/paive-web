import { wallHealthRowClass } from "@/lib/veSemantics";
import type { DecideResult, PaiveLogEntry, PaiveRun } from "./types";

import { SNOWDON_RUN_FILES, usesSnowdonFixtures } from "./fixturePaths";
import run001 from "./fixtures/run_001_baseline_v01.json";
import run002 from "./fixtures/run_002_v02_value_down.json";
import run003 from "./fixtures/run_003_blocked.json";
import decisionAccept from "./fixtures/decision_accept.json";
import decisionReject from "./fixtures/decision_reject.json";

const RUNS: Record<string, PaiveRun> = {
  run_001: run001 as PaiveRun,
  run_002: run002 as PaiveRun,
  run_003: run003 as PaiveRun,
};

const snowdonRunCache = new Map<string, PaiveRun>();

let logEntries: PaiveLogEntry[] = [];

function fixtureVersionFromFilename(ifcPath: string): number | undefined {
  const m = ifcPath.toLowerCase().match(/v0*(\d+)/);
  return m ? parseInt(m[1]!, 10) : undefined;
}

/** Upload + run (fixture router). Real API: same signature. */
export function paiveRun(
  ifcPath: string,
  _projectId = "pilot-sample",
  _compareTo = "last-accepted",
  _note = "",
  activeIfcVersion?: number,
): string {
  const name = ifcPath.toLowerCase();
  if (name.includes("no_psets") || name.includes("blocked")) return "run_003";

  const snowdon = usesSnowdonFixtures(ifcPath);
  const version = activeIfcVersion ?? fixtureVersionFromFilename(ifcPath);

  if (snowdon) {
    if (version != null) return version <= 1 ? "run_001_snowdon" : "run_002_snowdon";
    if (name.includes("v01b")) return "run_001_snowdon";
    return "run_002_snowdon";
  }

  if (version != null) return version <= 1 ? "run_001" : "run_002";

  if (name.includes("v01")) return "run_001";
  return "run_002";
}

export function getRun(runId: string): PaiveRun {
  const run = RUNS[runId];
  if (run) return structuredClone(run);
  throw new Error(`Unknown run_id: ${runId}`);
}

/** Loads typology fixtures inline; Snowdon pipeline JSON from `/public/fixtures/snowdon/`. */
export async function loadRun(runId: string): Promise<PaiveRun> {
  const run = RUNS[runId];
  if (run) return structuredClone(run);

  const snowdonPath = SNOWDON_RUN_FILES[runId];
  if (snowdonPath) {
    let cached = snowdonRunCache.get(runId);
    if (!cached) {
      const res = await fetch(snowdonPath);
      if (!res.ok) throw new Error(`Failed to load fixture: ${snowdonPath}`);
      cached = (await res.json()) as PaiveRun;
      snowdonRunCache.set(runId, cached);
    }
    return structuredClone(cached);
  }

  throw new Error(`Unknown run_id: ${runId}`);
}

export function decide(
  runId: string,
  decision: "accept" | "reject",
  reviewer: string,
  reason: string,
  selectedOption?: string | null,
): DecideResult {
  if (!reason.trim()) {
    return { error: { code: "reason_required", message: "A reason is required for every decision." } };
  }
  if (decision !== "accept" && decision !== "reject") {
    return { error: { code: "bad_decision", message: "decision must be 'accept' or 'reject'." } };
  }
  const template = structuredClone(decision === "accept" ? decisionAccept : decisionReject) as DecideResult & {
    run_id?: string;
    reviewer?: string;
    reason?: string;
    at?: string;
  };
  const at = new Date().toISOString();
  template.run_id = runId;
  template.reviewer = reviewer;
  template.reason = reason;
  template.at = at;
  if ("result" in template && template.result) {
    template.result.log_id = logEntries.length + 1;
  }
  logEntries.push({
    log_id: logEntries.length + 1,
    at,
    event: "decision",
    run_id: runId,
    decision,
    reason,
    user: reviewer,
  });
  return template as DecideResult;
}

export function getLog(): PaiveLogEntry[] {
  return [...logEntries].sort((a, b) => b.log_id - a.log_id);
}

export function verdictBadgeClass(label: string): string {
  const k = label.toLowerCase();
  if (k.includes("up")) return "bg-success/15 text-success border-success/40";
  if (k.includes("down")) return "bg-destructive/15 text-destructive border-destructive/40";
  if (k.includes("baseline")) return "bg-primary/15 text-primary border-primary/40";
  return "bg-muted text-muted-foreground border-border";
}

export function wallRowClass(colour: string): string {
  return wallHealthRowClass(colour);
}