import type { DecideResult, PaiveRun, PaiveWall } from "@/lib/paive/types";
import { verdictBadgeClass, wallRowClass } from "@/lib/paive/fakeBackend";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export function VeRunSteps({ run }: { run: PaiveRun }) {
  return (
    <div className="space-y-4">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {run.steps.map((s) => (
          <li
            key={s.step}
            className={cn(
              "rounded-xl border px-4 py-3 text-base",
              s.status === "done" && "border-success/40 bg-success/10",
              s.status === "waiting" && "border-warning/40 bg-warning/10",
              s.status === "draft" && "border-primary/30 bg-primary/5",
              s.status === "blocked" && "border-destructive/40 bg-destructive/10",
              (s.status === "not_run" || !s.status) && "border-border bg-background/40",
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
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function D1ResultPanel({ run }: { run: PaiveRun }) {
  const d1 = run.d1;
  if (!d1) return null;
  return (
    <div className="space-y-4">
      <VerdictBadge label={d1.verdict_label} className={verdictBadgeClass(d1.verdict_label)} />
      <p className="text-lg text-muted-foreground">{d1.reason}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          label="Achievement"
          value={`${d1.achievement_previous_pct}% → ${d1.achievement_current_pct}%`}
        />
        <MetricTile label="ΔV" value={`${d1.dV_pct > 0 ? "+" : ""}${d1.dV_pct}%`} />
        <MetricTile label="ΔR" value={`${d1.dR_eur > 0 ? "+" : ""}€${Math.round(d1.dR_eur).toLocaleString("en-US")}`} />
      </div>
      {d1.required_targets_failed.length > 0 && (
        <ul className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
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
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function VerdictBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-4 py-1.5 text-lg font-semibold", className)}>{label}</span>
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-base">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th className="pb-3 font-medium">Wall</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Change</th>
            <th className="pb-3 font-medium">U / Fire / Rw</th>
            <th className="pb-3 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {walls.map((w) => (
            <tr
              key={w.guid}
              onClick={() => onSelect(w.guid)}
              className={cn(
                "cursor-pointer border-b border-border transition-colors hover:bg-accent",
                wallRowClass(w.colour),
                selectedGuid === w.guid && "bg-primary/10",
              )}
            >
              <td className="py-3 pr-2 font-medium">{w.name}</td>
              <td className="py-3 text-muted-foreground">{w.type ?? "—"}</td>
              <td className="py-3 capitalize">{w.change}</td>
              <td className="py-3 font-mono text-sm text-muted-foreground">
                {w.u_value ?? "—"} / {w.fire_min ?? "—"} / {w.rw_db ?? "—"}
              </td>
              <td className="py-3 text-right font-semibold">{w.cost_eur != null ? `€${Math.round(w.cost_eur).toLocaleString("en-US")}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {walls.some((w) => w.ve2.status === "unmapped") && (
        <p className="mt-3 text-base text-muted-foreground">
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
      {d2.stability && d2.current_design && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-border bg-card px-3 py-1 text-base">
            Ranking: {d2.stability.label}
          </span>
          <span className="text-muted-foreground">
            Current design ({d2.current_design.price_code}) · V {d2.current_design.V.toFixed(4)} · R €
            {Math.round(d2.current_design.R_eur).toLocaleString("en-US")}
          </span>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {d2.options.map((o) => (
          <button
            key={o.assembly_id}
            type="button"
            onClick={() => onSelect(o.assembly_id)}
            className={cn(
              "glass border-2 p-6 text-left transition-transform hover:-translate-y-0.5",
              selectedId === o.assembly_id ? "border-primary ring-4 ring-primary/20" : "border-border",
              o.rank === 1 && "border-success/50",
            )}
          >
            {o.rank === 1 && (
              <span className="mb-2 inline-block rounded-full bg-primary px-3 py-0.5 text-base font-semibold text-primary-foreground">
                Rank {o.rank} recommended
              </span>
            )}
            <h3 className="text-[18px] font-semibold">{o.assembly_id}</h3>
            <p className="mt-1 text-base text-muted-foreground">{o.description}</p>
            <p className="mt-3 text-xl font-bold">
              ΔV {o.dV_vs_current_pct > 0 ? "+" : ""}
              {o.dV_vs_current_pct}% · ΔR {o.dR_vs_current_eur > 0 ? "+" : ""}€
              {Math.round(o.dR_vs_current_eur).toLocaleString("en-US")}
            </p>
            <p className="mt-2 text-base">
              U {o.performance.u_value} · {o.performance.fire_min} min fire · Rw {o.performance.rw_db} dB
            </p>
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
        ))}
      </div>
      {run.ve3?.excluded?.length ? (
        <div>
          <h4 className="mb-2 font-semibold text-muted-foreground">Excluded options</h4>
          <ul className="space-y-2 opacity-75">
            {run.ve3.excluded.map((e) => (
              <li key={e.assembly_id} className="rounded-lg border border-dashed border-border p-3 text-base">
                <span className="font-medium">{e.assembly_id}</span> — {e.description}
                <div className="text-muted-foreground">{e.reason}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function VeReportBlock({ run }: { run: PaiveRun }) {
  if (!run.ve6?.text) return null;
  return (
    <div className="rounded-xl border border-border bg-background/40 p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="font-semibold">Report draft (VE6)</h4>
        {run.ve6.number_check.passed && <span className="text-base text-success">Numbers checked ✓</span>}
      </div>
      <p className="text-base leading-relaxed text-muted-foreground">{run.ve6.text}</p>
    </div>
  );
}

export function PaiveLogTable({ entries }: { entries: ReturnType<typeof import("@/lib/paive/fakeBackend").getLog> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-base">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th className="pb-2 font-medium">When</th>
            <th className="pb-2 font-medium">Event</th>
            <th className="pb-2 font-medium">Run</th>
            <th className="pb-2 font-medium">Detail</th>
            <th className="pb-2 font-medium">User</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.log_id} className="border-b border-border">
              <td className="py-3 text-muted-foreground">{new Date(e.at).toLocaleString()}</td>
              <td className="py-3">{e.event}</td>
              <td className="py-3 font-mono text-sm">{e.run_id ?? "—"}</td>
              <td className="py-3">{e.verdict ?? e.decision ?? e.version ?? "—"} {e.reason ? `· ${e.reason}` : ""}</td>
              <td className="py-3">{e.user ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DecisionNotice({ result }: { result: DecideResult | null }) {
  if (!result) return null;
  if ("error" in result) {
    return <p className="mt-2 text-base font-medium text-destructive">{result.error.message}</p>;
  }
  return (
    <p className="mt-2 text-base text-success">
      Recorded {result.result.decision}. Log #{result.result.log_id}.
      {result.result.next_option && ` Next option: ${result.result.next_option.assembly_id}.`}
    </p>
  );
}