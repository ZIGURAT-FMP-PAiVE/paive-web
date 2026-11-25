import { describe, expect, it } from "vitest";
import { changedWallGlobalIds, type WallIndexEntry } from "./ifcWallDiff";

function entry(id: string, name: string, objectType = "", tag = ""): WallIndexEntry {
  return { globalId: id, expressId: "1", name, objectType, tag };
}

describe("changedWallGlobalIds", () => {
  it("includes new walls and walls with edited identity", () => {
    const base = new Map<string, WallIndexEntry>([
      ["A", entry("A", "Wall A")],
      ["B", entry("B", "Wall B")],
    ]);
    const current = new Map<string, WallIndexEntry>([
      ["A", entry("A", "Wall A")],
      ["B", entry("B", "Wall B renamed")],
      ["C", entry("C", "Wall C")],
    ]);
    expect(changedWallGlobalIds(base, current)).toEqual(["B", "C"]);
  });
});