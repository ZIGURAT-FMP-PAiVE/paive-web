import { cn } from "@/lib/utils";

export type LegendTone = "destructive" | "warning" | "success" | "primary" | "muted";

export type LegendItem = {
  label: string;
  tone: LegendTone;
  description: string;
};

const dotClass: Record<LegendTone, string> = {
  destructive: "bg-destructive",
  warning: "bg-warning",
  success: "bg-success",
  primary: "bg-primary",
  muted: "bg-muted-foreground/60",
};

const labelClass: Record<LegendTone, string> = {
  destructive: "text-destructive",
  warning: "text-warning",
  success: "text-success",
  primary: "text-primary",
  muted: "text-foreground/50",
};

export const WALL_HEALTH_LEGEND: LegendItem[] = [
  { label: "Red", tone: "destructive", description: "failed target" },
  { label: "Amber", tone: "warning", description: "changed" },
  { label: "Green", tone: "success", description: "success" },
  { label: "Grey", tone: "muted", description: "unmapped" },
];

export const D1_VERDICT_LEGEND: LegendItem[] = [
  { label: "Value up", tone: "success", description: "improved vs prior" },
  { label: "Value down", tone: "destructive", description: "worse vs prior" },
  { label: "Baseline", tone: "primary", description: "reference run" },
];

export const DECISION_LOG_LEGEND: LegendItem[] = [
  { label: "Accept", tone: "success", description: "approved option" },
  { label: "Reject", tone: "destructive", description: "declined" },
  { label: "Run", tone: "primary", description: "workflow event" },
];

export function ColorLegendRow({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="list" aria-label="Color legend">
      {items.map((item) => (
        <span
          key={`${item.tone}-${item.label}`}
          role="listitem"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1 text-sm"
        >
          <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass[item.tone])} aria-hidden />
          <span className={cn("font-semibold", labelClass[item.tone])}>{item.label}</span>
          <span className="text-muted-foreground">{item.description}</span>
        </span>
      ))}
    </div>
  );
}