import { describe, expect, it } from "vitest";
import run001 from "./fixtures/run_001_baseline_v01.json";
import run002 from "./fixtures/run_002_v02_value_down.json";
import type { PaiveRun } from "./types";
import { affectedWallsForRun } from "./affectedElements";

describe("affectedWallsForRun", () => {
  it("returns no walls on baseline v01", () => {
    expect(affectedWallsForRun(run001 as PaiveRun)).toEqual([]);
  });

  it("returns walls when comparing to a prior version", () => {
    const walls = affectedWallsForRun(run002 as PaiveRun);
    expect(walls.length).toBe(5);
  });
});