import { useState } from "react";
import type { DecideResult, PaiveLogEntry, PaiveOption, PaiveRun, PaiveWall } from "@/lib/paive/types";
import { Button } from "@/components/ui/button";
import { verdictBadgeClass, wallRowClass } from "@/lib/paive/fakeBackend";
import {
  ColorLegendRow,
  D1_VERDICT_LEGEND,
  DECISION_LOG_LEGEND,
  WALL_HEALTH_LEGEND,
} from "@/components/paive/ColorLegendRow";
import { rankAccent, rankHeaderClass, rankOptionGlowClass, rankSelectedCellClass } from "@/lib/veSemantics";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  dataTableZebraClass,
} from "@/components/ui/table";

export function VeRunSteps({ run }: { run: PaiveRun }) {
  return (
    <div className="space-y-4">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {run.steps.map((s) => (
          <li
            key={s.step}
            className={cn(
              "rounded-xl border border-border px-4 py-3 text-base",
              s.status === "done" && "border-l-4 border-l-success bg-success/[0.04]",
              s.status === "waiting" && "border-l-4 border-l-warning bg-warning/[0.04]",
              s.status === "draft" && "border-l-4 border-l-primary bg-primary/[0.04]",
              s.status === "blocked" && "border-l-4 border-l-destructive bg-destructive/[0.04]",
              (s.status === "not_run" || !s.status) && "bg-background/40",
            )}
          >
            <div className="font-semibold">
              {s.step} · {s.name}
            </div>
            <div className="capitalize text-muted-foreground">{s.status.replace("_", " ")}</div>
          </li>
        ))}
      </ul>
      {run.status === "blocked" && run.blocked && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">{run.blocked.message}</p>
          {run.blocked.what_to_do && <p className="mt-2 text-base text-muted-foreground">{run.blocked.what_to_do}</p>}
          <table className="mt-3 w-full text-left text-base">
            <tbody>
              {run.blocked.missing.map((m) => (
                <tr key={m.field} className="border-t border-border/50">
                  <td className="py-2 pr-4 font-medium">{m.field}</td>
                  <td className="py-2 text-muted-foreground">{m.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {run.ve1?.summary && (
        <dl className="grid grid-cols-2 gap-3 text-base sm:grid-cols-4">
          {[
            ["Walls in scope", String(run.ve1.summary.walls_total)],
            ["Mapped", String(run.ve1.summary.mapped)],
            ["Unmapped", String(run.ve1.summary.unmapped)],
            ["Area", `${run.ve1.summary.area_in_scope_m2} m²`],
            ["Changed", String(run.ve1.summary.changed)],
            ["Unchanged", String(run.ve1.summary.unchanged)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function D1BlockedPanel({ run }: { run: PaiveRun }) {
  if (!run.blocked) return null;
  return (
    <div className="space-y-3">
      <p className="font-semibold text-destructive">{run.blocked.message}</p>
      {run.blocked.what_to_do && <p className="text-base text-muted-foreground">{run.blocked.what_to_do}</p>}
      <table className="w-full text-left text-base">
        <tbody>
          {run.blocked.missing.map((m) => (
            <tr key={m.field} className="border-t border-border/50">
              <td className="py-2 pr-4 font-medium">{m.field}</td>
              <td className="py-2 text-muted-foreground">{m.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Muted placeholder when D1 has not run yet (IFC present, no verdict). */
export function D1BaselinePlaceholder() {
  return (
    <div
      className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-5 py-8"
      role="status"
    >
      <p className="text-center text-base leading-relaxed text-muted-foreground">
        D1 verdict appears after the model is analyzed against project targets.
      </p>
    </div>
  );
}

export function D1ResultPanel({ run }: { run: PaiveRun }) {
  const d1 = run.d1;
  if (!d1) return null;
  return (
    <div className="space-y-4">
      <VerdictBadge label={d1.verdict_label} className={verdictBadgeClass(d1.verdict_label)} />
      <p className="text-base text-muted-foreground">{d1.reason}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          label="Achievement"
          value={
            d1.achievement_previous_pct != null && d1.achievement_current_pct != null
              ? `${d1.achievement_previous_pct}% → ${d1.achievement_current_pct}%`
              : d1.achievement_current_pct != null
                ? `${d1.achievement_current_pct}%`
                : "—"
          }
        />
        <MetricTile
          label="ΔV"
          value={
            d1.dV_pct != null && !Number.isNaN(d1.dV_pct)
              ? `${d1.dV_pct > 0 ? "+" : ""}${d1.dV_pct}%`
              : "—"
          }
        />
        <MetricTile
          label="ΔR"
          value={
            d1.dR_eur != null && !Number.isNaN(d1.dR_eur)
              ? `${d1.dR_eur > 0 ? "+" : ""}€${Math.round(d1.dR_eur).toLocaleString("en-US")}`
              : "—"
          }
        />
      </div>
      <ColorLegendRow items={D1_VERDICT_LEGEND} className="mt-2" />
      {d1.required_targets_failed.length > 0 && (
        <ul className="space-y-2 rounded-xl border border-border border-l-4 border-l-destructive bg-destructive/[0.04] p-4 pl-5">
          {d1.required_targets_failed.map((f) => (
            <li key={f.statement} className="text-base">
              <span className="font-semibold text-destructive">{f.statement}</span>
              <span className="text-muted-foreground">
                {" "}
                — target {f.target} {f.unit}, actual {f.actual} ({f.walls} walls)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="text-base text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function VerdictBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-4 py-1.5 text-base font-semibold", className)}>{label}</span>
  );
}

export function PaiveWallsTable({
  walls,
  selectedGuid,
  onSelect,
}: {
  walls: PaiveWall[];
  selectedGuid: string | null;
  onSelect: (guid: string) => void;
}) {
  return (
    <div>
      <Table className="min-w-[720px] text-base">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Wall</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>U / Fire / Rw</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={dataTableZebraClass}>
          {walls.map((w) => (
            <TableRow
              key={w.guid}
              onClick={() => onSelect(w.guid)}
              className={cn(
                "cursor-pointer",
                wallRowClass(w.colour),
                selectedGuid === w.guid && "ring-1 ring-inset ring-primary/30 bg-accent/25",
              )}
            >
              <TableCell className="pr-2 font-medium">{w.name}</TableCell>
              <TableCell className="text-muted-foreground">{w.type ?? "—"}</TableCell>
              <TableCell className="capitalize">{w.change}</TableCell>
              <TableCell className="text-sm text-muted-foreground tabular-nums">
                {w.u_value ?? "—"} / {w.fire_min ?? "—"} / {w.rw_db ?? "—"}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {w.cost_eur != null ? `€${Math.round(w.cost_eur).toLocaleString("en-US")}` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ColorLegendRow items={WALL_HEALTH_LEGEND} className="mt-4" />
      {walls.some((w) => w.ve2.status === "unmapped") && (
        <p className="mt-3 text-sm text-muted-foreground">
          Grey walls need a person to classify missing data before the next run.
        </p>
      )}
    </div>
  );
}

export function WallFunctionChips({ wall }: { wall: PaiveWall | undefined }) {
  if (!wall) return null;
  if (wall.ve2.status === "unmapped") {
    return <p className="text-base text-muted-foreground">{wall.ve2.reason ?? "Unmapped wall"}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {wall.ve2.functions.map((f) => (
        <span key={f.statement} className="rounded-full bg-primary/10 px-3 py-1 text-base">
          {f.statement} {Math.round(f.probability * 100)}%
        </span>
      ))}
    </div>
  );
}

function optionValueCostLine(o: PaiveOption) {
  return `ΔV ${o.dV_vs_current_pct > 0 ? "+" : ""}${o.dV_vs_current_pct}% · ΔR ${o.dR_vs_current_eur > 0 ? "+" : ""}€${Math.round(o.dR_vs_current_eur).toLocaleString("en-US")}`;
}

function optionPerformanceLine(o: PaiveOption) {
  return `U ${o.performance.u_value} · ${o.performance.fire_min} min fire · Rw ${o.performance.rw_db} dB`;
}

const PROSE_TRUNCATE = 140;

function ExpandableProseCell({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const trimmed = text.trim();
  if (!trimmed || trimmed === "—") return <span className="text-muted-foreground">—</span>;
  const long = trimmed.length > PROSE_TRUNCATE;
  if (!long) {
    return <span className="block max-w-prose leading-relaxed">{trimmed}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="block max-w-prose text-left leading-relaxed transition-colors hover:text-foreground"
      aria-expanded={open}
    >
      <span className={cn(!open && "line-clamp-3")}>{trimmed}</span>
      <span className="mt-1 block text-xs font-medium text-primary">{open ? "Show less" : "Show more"}</span>
    </button>
  );
}

const COMPARISON_ROWS: {
  label: string;
  getValue: (o: PaiveOption) => string;
  wrap?: boolean;
  prose?: boolean;
  valueTone?: (value: string, o: PaiveOption) => string | undefined;
}[] = [
  { label: "Description", getValue: (o) => o.description, wrap: true, prose: true },
  { label: "ΔV · ΔR", getValue: optionValueCostLine },
  { label: "U · fire · Rw", getValue: optionPerformanceLine },
  {
    label: "Required targets",
    getValue: (o) => (o.meets_all_required_targets ? "Meets required targets" : "Misses a required target"),
    valueTone: (_v, o) => (o.meets_all_required_targets ? "text-success" : "text-destructive"),
  },
  { label: "Why", getValue: (o) => o.why, wrap: true, prose: true },
];

export function D2ComparisonMatrix({
  options,
  selectedId,
  placeholder = false,
}: {
  options?: PaiveOption[];
  selectedId?: string | null;
  placeholder?: boolean;
}) {
  const columns = placeholder
    ? [{ id: "placeholder", label: "—", rank: 1 }]
    : (options ?? []).map((o) => ({ id: o.assembly_id, label: o.assembly_id, rank: o.rank, option: o }));

  const rows = COMPARISON_ROWS.map((row) => ({
    ...row,
    values: placeholder
      ? ["—"]
      : (options ?? []).map((o) => row.getValue(o)),
  }));

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Criteria</TableHead>
          {columns.map((col) => {
            const selected = !placeholder && selectedId === col.id;
            return (
              <TableHead
                key={col.id}
                className={cn("normal-case tracking-normal", rankHeaderClass(col.rank, selected && !placeholder))}
              >
                {col.label}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody className={dataTableZebraClass}>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="text-muted-foreground">{row.label}</TableCell>
            {columns.map((col, colIdx) => {
              const option = "option" in col ? col.option : undefined;
              const value = row.values[colIdx] ?? "—";
              const selected = !placeholder && selectedId === col.id;
              const valueTone =
                !placeholder && option && row.valueTone ? row.valueTone(value, option) : undefined;
              return (
                <TableCell
                  key={col.id}
                  className={cn(
                    "font-medium align-top",
                    row.wrap && !row.prose && "max-w-xs leading-relaxed",
                    row.prose && "max-w-[min(100%,22rem)]",
                    !row.wrap && "tabular-nums",
                    selected && !placeholder && rankSelectedCellClass(col.rank),
                    placeholder && "text-muted-foreground",
                    valueTone,
                  )}
                >
                  {row.prose && !placeholder ? <ExpandableProseCell text={value} /> : value}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function D2BlankOptionCard({ message }: { message?: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div
        aria-hidden
        className="panel-secondary border-2 border-border p-6 text-left"
      >
        <h3 className="text-lg font-semibold text-muted-foreground">—</h3>
        <p className="mt-3 text-base text-muted-foreground">{message ?? "No ranked options yet."}</p>
        <p className="mt-6 text-xl font-bold text-muted-foreground tabular-nums">ΔV — · ΔR —</p>
        <p className="mt-2 text-base text-muted-foreground tabular-nums">U — · — min fire · Rw — dB</p>
      </div>
    </div>
  );
}

export function D2OptionsPanel({
  run,
  selectedId,
  onSelect,
}: {
  run: PaiveRun;
  selectedId: string | null;
  onSelect: (assemblyId: string) => void;
}) {
  const d2 = run.d2;
  if (!d2?.options?.length) return null;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {d2.options.map((o) => {
          const rank = rankAccent(o.rank);
          return (
          <button
            key={o.assembly_id}
            type="button"
            onClick={() => onSelect(o.assembly_id)}
            className={cn(
              "glass border-2 p-6 text-left motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5",
              rank.border,
              rankOptionGlowClass(o.rank, selectedId === o.assembly_id),
            )}
          >
            {o.rank === 1 && (
              <span className="mb-2 inline-block rounded-full bg-success px-3 py-0.5 text-base font-semibold text-white">
                Rank {o.rank} recommended
              </span>
            )}
            <h3 className="text-lg font-semibold">{o.assembly_id}</h3>
            <p className="mt-1 text-base text-muted-foreground">{o.description}</p>
            <p className="mt-3 text-xl font-bold tabular-nums">{optionValueCostLine(o)}</p>
            <p className="mt-2 text-base tabular-nums">{optionPerformanceLine(o)}</p>
            <p className="mt-2 flex items-center gap-1 text-base">
              {o.meets_all_required_targets ? (
                <>
                  <Check className="h-4 w-4 text-success" /> Meets required targets
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-destructive" /> Misses a required target
                </>
              )}
            </p>
            <p className="mt-3 text-base text-muted-foreground">{o.why}</p>
          </button>
          );
        })}
      </div>
    </div>
  );
}

export function VeReportDraft({ run }: { run: PaiveRun | null }) {
  const text = run?.ve6?.text;
  return (
    <div className="panel-secondary p-5">
      <h4 className="mb-2 text-lg font-semibold">Report draft</h4>
      {text ? (
        <p className="text-base leading-relaxed text-muted-foreground">{text}</p>
      ) : (
        <p className="text-base leading-relaxed text-muted-foreground" role="status">
          Upload an IFC model and complete value engineering to generate a report draft.
        </p>
      )}
    </div>
  );
}

export function PaiveLogTable({ entries }: { entries: PaiveLogEntry[] }) {
  return (
    <div>
      {entries.length === 0 ? (
        <p className="py-6 text-center text-base leading-relaxed text-muted-foreground" role="status">
          No decisions recorded for this project yet.
        </p>
      ) : (
      <Table className="text-base">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>When</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Run</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead>User</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={dataTableZebraClass}>
          {entries.map((e) => (
            <TableRow key={e.log_id}>
              <TableCell className="text-muted-foreground">{new Date(e.at).toLocaleString()}</TableCell>
              <TableCell>{e.event}</TableCell>
              <TableCell className="font-mono text-sm">{e.run_id ?? "—"}</TableCell>
              <TableCell>
                {e.verdict ?? e.decision ?? e.version ?? "—"} {e.reason ? `· ${e.reason}` : ""}
              </TableCell>
              <TableCell>{e.user ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
      {entries.length > 0 ? <ColorLegendRow items={DECISION_LOG_LEGEND} className="mt-4" /> : null}
    </div>
  );
}

const ve5FieldClass =
  "w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary";

export function Ve5HumanGatePanel({
  reviewer,
  onReviewerChange,
  decisionReason,
  onDecisionReasonChange,
  hasOptions,
  awaitingModel = false,
  onAccept,
  onReject,
  result,
  acceptLocked = false,
}: {
  reviewer: string;
  onReviewerChange: (value: string) => void;
  decisionReason: string;
  onDecisionReasonChange: (value: string) => void;
  hasOptions: boolean;
  /** No IFC uploaded yet — gate visible but disabled. */
  awaitingModel?: boolean;
  onAccept: () => void;
  onReject: () => void;
  result: DecideResult | null;
  /** After a successful accept, lock accept (and inputs) for this run. */
  acceptLocked?: boolean;
}) {
  const inactive = awaitingModel || !hasOptions;
  const canSubmit =
    hasOptions && !awaitingModel && reviewer.trim().length > 0 && decisionReason.trim().length > 0;
  const fieldsLocked = acceptLocked || inactive;

  return (
    <div
      className={cn(
        "rounded-xl border",
        inactive ? "border-dashed border-border/60 bg-muted/20" : "border-transparent",
      )}
    >
      <div className={cn("space-y-4", inactive && "opacity-80")}>
        {inactive ? (
          <p className="text-base leading-relaxed text-muted-foreground" role="status">
            {awaitingModel
              ? "Upload an IFC model to enable the human gate."
              : "No ranked options for this run — the gate stays inactive until VE generates alternatives."}
          </p>
        ) : !canSubmit ? (
          <p className="text-base text-muted-foreground" role="status">
            Enter reviewer and reason to enable accept or reject.
          </p>
        ) : null}
        <label className={cn("block text-base", inactive ? "text-muted-foreground/80" : "text-muted-foreground")} htmlFor="paive-reviewer">
          Reviewer
        </label>
        <input
          id="paive-reviewer"
          value={reviewer}
          onChange={(e) => onReviewerChange(e.target.value)}
          disabled={fieldsLocked}
          placeholder={inactive ? undefined : "Who is signing off?"}
          className={cn(
            ve5FieldClass,
            "max-w-md",
            fieldsLocked && "cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground",
          )}
        />
        <label className={cn("mt-2 block text-base", inactive ? "text-muted-foreground/80" : "text-muted-foreground")} htmlFor="paive-reason">
          Reason
        </label>
        <textarea
          id="paive-reason"
          value={decisionReason}
          onChange={(e) => onDecisionReasonChange(e.target.value)}
          rows={4}
          disabled={fieldsLocked}
          placeholder="Why accept or reject this option?"
          className={cn(
            ve5FieldClass,
            fieldsLocked && "cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground",
          )}
        />
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            size="lg"
            variant={inactive ? "ghost" : "default"}
            disabled={!canSubmit || acceptLocked}
            onClick={onAccept}
            className={inactive ? "text-muted-foreground" : undefined}
          >
            <Check />
            Accept
          </Button>
          <Button
            type="button"
            size="lg"
            variant={inactive ? "ghost" : "outlineDestructive"}
            disabled={!canSubmit || acceptLocked}
            onClick={onReject}
            className={inactive ? "text-muted-foreground" : undefined}
          >
            <X />
            Reject
          </Button>
        </div>
        {inactive ? (
          <p className="text-base text-muted-foreground">No changes are made to the BIM model.</p>
        ) : null}
        <DecisionNotice result={result} />
      </div>
    </div>
  );
}

export function DecisionNotice({ result }: { result: DecideResult | null }) {
  if (!result) return null;
  if ("error" in result) {
    return <p className="mt-2 text-base font-medium text-destructive">{result.error.message}</p>;
  }
  const decisionLabel =
    ("decision" in result && typeof result.decision === "string" && result.decision) ||
    result.result.decision ||
    "decision";
  return (
    <p className="mt-2 text-base text-success">
      Recorded {decisionLabel}. Log #{result.result.log_id}.
      {result.result.next_option && ` Next option: ${result.result.next_option.assembly_id}.`}
    </p>
  );
}