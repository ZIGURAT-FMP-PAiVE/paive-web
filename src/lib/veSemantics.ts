import { cn } from "@/lib/utils";

/** Ranked VE options: 1 = success, 2 = primary, 3+ = warning (matches option card borders). */
export function rankAccent(rank: number) {
  if (rank === 1) {
    return {
      border: "border-success",
      borderL: "border-l-success",
      borderB: "border-b-success",
      text: "text-success",
      dot: "bg-success",
      ring: "ring-success/25",
      selectedCell: "border-l-2 border-l-success bg-success/[0.04]",
    } as const;
  }
  if (rank === 2) {
    return {
      border: "border-primary",
      borderL: "border-l-primary",
      borderB: "border-b-primary",
      text: "text-primary",
      dot: "bg-primary",
      ring: "ring-primary/25",
      selectedCell: "border-l-2 border-l-primary bg-primary/[0.04]",
    } as const;
  }
  return {
    border: "border-warning",
    borderL: "border-l-warning",
    borderB: "border-b-warning",
    text: "text-warning",
    dot: "bg-warning",
    ring: "ring-warning/25",
    selectedCell: "border-l-2 border-l-warning bg-warning/[0.04]",
  } as const;
}

export function rankHeaderClass(rank: number, selected = false) {
  const a = rankAccent(rank);
  return cn(a.text, selected && `border-b-2 ${a.borderB} pb-2`);
}

export function rankSelectedCellClass(rank: number) {
  return rankAccent(rank).selectedCell;
}

/** Wall row health (fixture `walls[].colour`). */
export function wallHealthRowClass(colour: string): string {
  if (colour === "red") return "border-l-4 border-l-destructive bg-destructive/[0.04]";
  if (colour === "amber") return "border-l-4 border-l-warning bg-warning/[0.04]";
  if (colour === "green") return "border-l-4 border-l-success bg-success/[0.04]";
  return "border-l-4 border-l-muted-foreground/40 bg-muted/[0.15] opacity-95";
}

export function wallHealthDotClass(colour: string): string {
  if (colour === "red") return "bg-destructive";
  if (colour === "amber") return "bg-warning";
  if (colour === "green") return "bg-success";
  return "bg-muted-foreground/60";
}

/** IFC version timeline: current = primary, earlier stored = success. */
export function ifcVersionDotClass(isActive: boolean) {
  return isActive ? rankAccent(2).dot : rankAccent(1).dot;
}