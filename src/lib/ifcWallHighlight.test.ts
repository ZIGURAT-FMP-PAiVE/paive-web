import { describe, expect, it } from "vitest";
import { assignWallsByFixtureGuid } from "./ifcWallHighlight";

describe("assignWallsByFixtureGuid", () => {
  it("maps run-result IfcGUIDs to express IDs", () => {
    const map = new Map([
      ["guid-a", "101"],
      ["guid-b", "202"],
    ]);
    const walls = new Set(["101", "202", "303"]);
    const { assignments, matched, requested } = assignWallsByFixtureGuid(
      [
        { guid: "guid-a", colour: "red" },
        { guid: "guid-b", colour: "green" },
        { guid: "missing", colour: "yellow" },
      ],
      map,
      walls,
    );
    expect(requested).toBe(3);
    expect(matched).toBe(2);
    expect(assignments).toEqual([
      { spec: { guid: "guid-a", colour: "red" }, expressId: "101", globalId: "guid-a" },
      { spec: { guid: "guid-b", colour: "green" }, expressId: "202", globalId: "guid-b" },
    ]);
  });
});