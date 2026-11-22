import { describe, expect, it } from "vitest";
import {
  assignWallsByCardinalCycle,
  footprintFromWallBounds,
  isExternalWall,
  isVerticalWall,
  type WallBounds,
} from "./ifcWallAssignment";

function wall(id: string, x: number, z: number, height: number, spanX: number, spanZ: number): WallBounds {
  return { id, x, z, height, spanX, spanZ };
}

describe("isVerticalWall", () => {
  it("rejects slab-like horizontal geometry", () => {
    expect(isVerticalWall(wall("s", 0, 0, 0.3, 12, 8))).toBe(false);
  });

  it("accepts typical façade wall proportions", () => {
    expect(isVerticalWall(wall("w", 0, 0, 3.2, 0.25, 12))).toBe(true);
  });
});

describe("assignWallsByCardinalCycle", () => {
  it("assigns distinct external walls in S-N-W-E order", () => {
    const footprint = footprintFromWallBounds([
      wall("s1", 0, 10, 3, 8, 0.25),
      wall("n1", 0, -10, 3, 8, 0.25),
      wall("w1", -10, 0, 3, 0.25, 8),
      wall("e1", 10, 0, 3, 0.25, 8),
      wall("s2", 2, 10, 3, 8, 0.25),
    ]);
    expect(footprint).not.toBeNull();

    const box = footprint!;
    expect(isExternalWall({ id: "s1", x: 0, z: 10 }, box)).toBe(true);

    const bounds = new Map<string, WallBounds>([
      ["s1", wall("s1", 0, 10, 3, 8, 0.25)],
      ["n1", wall("n1", 0, -10, 3, 8, 0.25)],
      ["w1", wall("w1", -10, 0, 3, 0.25, 8)],
      ["e1", wall("e1", 10, 0, 3, 0.25, 8)],
      ["s2", wall("s2", 2, 10, 3, 8, 0.25)],
      ["slab", wall("slab", 0, 10, 0.25, 12, 8)],
    ]);

    const picked = assignWallsByCardinalCycle(["s1", "n1", "w1", "e1", "s2", "slab"], bounds, 5);
    expect(picked).toEqual(["s1", "n1", "w1", "e1", "s2"]);
    expect(new Set(picked).size).toBe(5);
  });
});