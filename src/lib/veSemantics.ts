import { cn } from "@/lib/utils";

export type RankAccentTokens = {
  border: string;
  borderL: string;
  borderB: string;
  borderT: string;
  text: string;
  dot: string;
  ring: string;
  selectedCell: string;
  glowHover: string;
  glowSelected: string;
};

/** Distinct accent per VE option rank (up to six Snowdon options; cycles after that). */
const RANK_ACCENTS: RankAccentTokens[] = [
  {
    border: "border-success",
    borderL: "border-l-success",
    borderB: "border-b-success",
    borderT: "border-t-success",
    text: "text-success",
    dot: "bg-success",
    ring: "ring-success/25",
    selectedCell: "border-l-2 border-l-success bg-success/[0.06]",
    glowHover: "hover:shadow-[0_0_22px_-8px] hover:shadow-success/45",
    glowSelected: "shadow-[0_0_26px_-6px] shadow-success/50",
  },
  {
    border: "border-primary",
    borderL: "border-l-primary",
    borderB: "border-b-primary",
    borderT: "border-t-primary",
    text: "text-primary",
    dot: "bg-primary",
    ring: "ring-primary/25",
    selectedCell: "border-l-2 border-l-primary bg-primary/[0.06]",
    glowHover: "hover:shadow-[0_0_22px_-8px] hover:shadow-primary/45",
    glowSelected: "shadow-[0_0_26px_-6px] shadow-primary/50",
  },
  {
    border: "border-warning",
    borderL: "border-l-warning",
    borderB: "border-b-warning",
    borderT: "border-t-warning",
    text: "text-warning",
    dot: "bg-warning",
    ring: "ring-warning/25",
    selectedCell: "border-l-2 border-l-warning bg-warning/[0.06]",
    glowHover: "hover:shadow-[0_0_22px_-8px] hover:shadow-warning/45",
    glowSelected: "shadow-[0_0_26px_-6px] shadow-warning/50",
  },
  {
    border: "border-secondary",
    borderL: "border-l-secondary",
    borderB: "border-b-secondary",
    borderT: "border-t-secondary",
    text: "text-secondary",
    dot: "bg-secondary",
    ring: "ring-secondary/25",
    selectedCell: "border-l-2 border-l-secondary bg-secondary/[0.08]",
    glowHover: "hover:shadow-[0_0_22px_-8px] hover:shadow-secondary/45",
    glowSelected: "shadow-[0_0_26px_-6px] shadow-secondary/50",
  },
  {
    border: "border-destructive",
    borderL: "border-l-destructive",
    borderB: "border-b-destructive",
    borderT: "border-t-destructive",
    text: "text-destructive",
    dot: "bg-destructive",
    ring: "ring-destructive/25",
    selectedCell: "border-l-2 border-l-destructive bg-destructive/[0.06]",
    glowHover: "hover:shadow-[0_0_22px_-8px] hover:shadow-destructive/45",
    glowSelected: "shadow-[0_0_26px_-6px] shadow-destructive/50",
  },
  {
    border: "border-option-rank-6",
    borderL: "border-l-option-rank-6",
    borderB: "border-b-option-rank-6",
    borderT: "border-t-option-rank-6",
    text: "text-option-rank-6",
    dot: "bg-option-rank-6",
    ring: "ring-option-rank-6/25",
    selectedCell: "border-l-2 border-l-option-rank-6 bg-option-rank-6/[0.08]",
    glowHover: "hover:shadow-[0_0_22px_-8px] hover:shadow-option-rank-6/45",
    glowSelected: "shadow-[0_0_26px_-6px] shadow-option-rank-6/50",
  },
];

export function rankAccent(rank: number): RankAccentTokens {
  const idx = Math.max(0, rank - 1) % RANK_ACCENTS.length;
  return RANK_ACCENTS[idx]!;
}

export function rankHeaderClass(rank: number, selected = false) {
  const a = rankAccent(rank);
  return cn(
    a.text,
    `border-b-2 ${a.borderB}`,
    `border-t-2 ${a.borderT}`,
    selected && cn(a.selectedCell, "pb-2"),
  );
}

export function rankSelectedCellClass(rank: number) {
  return rankAccent(rank).selectedCell;
}

/** Coloured column edge in the comparison matrix. */
export function rankMatrixColumnClass(rank: number, selected: boolean) {
  const a = rankAccent(rank);
  return cn(`border-l-2 ${a.borderL}`, selected && a.selectedCell);
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

/** Three.js mesh tint for fixture wall health colours. */
export function wallColourHex(colour: string): number {
  if (colour === "red") return 0xdc2626;
  if (colour === "amber") return 0xd97706;
  if (colour === "green") return 0x16a34a;
  return 0x64748b;
}

export function wallColourEmissiveHex(colour: string): number {
  if (colour === "red") return 0x450a0a;
  if (colour === "amber") return 0x451a03;
  if (colour === "green") return 0x052e16;
  return 0x0f172a;
}

/** IFC version timeline: current = primary, earlier stored = success. */
export function ifcVersionDotClass(isActive: boolean) {
  return isActive ? rankAccent(2).dot : rankAccent(1).dot;
}

/** Hover / selected glow for clickable ranked option cards (no resting ring). */
export function rankOptionGlowClass(rank: number, selected: boolean) {
  const a = rankAccent(rank);
  return cn(a.glowHover, selected && a.glowSelected);
}