import type { PaiveRun, PaiveWall } from "@/lib/paive/types";

/** First model version (baseline): all in-scope walls are new — nothing to list as affected. */
export function affectedWallsForRun(run: PaiveRun | null | undefined): PaiveWall[] {
  if (!run?.walls?.length) return [];
  if (run.d1?.verdict === "baseline" || run.input?.compare_to == null) return [];
  return run.walls;
}