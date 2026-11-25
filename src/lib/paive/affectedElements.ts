import type { PaiveRun, PaiveWall } from "@/lib/paive/types";

const AFFECTED_WALL_CAP = 50;

/** First model version (baseline): all in-scope walls are new — nothing to list as affected. */
export function affectedWallsForRun(run: PaiveRun | null | undefined): PaiveWall[] {
  if (!run?.walls?.length) return [];
  if (run.d1?.verdict === "baseline" || run.input?.compare_to == null) return [];
  if (run.walls.length > AFFECTED_WALL_CAP) {
    return run.walls.filter((w) => w.change !== "unchanged");
  }
  return run.walls;
}