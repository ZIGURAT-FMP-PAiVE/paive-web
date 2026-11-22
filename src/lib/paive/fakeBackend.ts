import { wallHealthRowClass } from "@/lib/veSemantics";
import type { DecideResult, PaiveLogEntry, PaiveRun } from "./types";

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

let logEntries: PaiveLogEntry[] = [];

/** Upload + run (fixture router). Real API: same signature. */
export function paiveRun(ifcPath: string, _projectId = "pilot-sample", _compareTo = "last-accepted", _note = ""): string {
  const name = ifcPath.toLowerCase();
  if (name.includes("v01")) return "run_001";
  if (name.includes("v02")) return "run_002";
  return "run_003";
}

export function getRun(runId: string): PaiveRun {
  const run = RUNS[runId];
  if (!run) throw new Error(`Unknown run_id: ${runId}`);
  return structuredClone(run);
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