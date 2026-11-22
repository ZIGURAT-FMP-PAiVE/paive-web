import { describe, expect, it } from "vitest";
import { footprintAreaM2 } from "./ifcBuildingArea";

describe("footprintAreaM2", () => {
  it("uses the horizontal extent of the model bounding box", () => {
    expect(footprintAreaM2({ min: { x: 0, z: 0 }, max: { x: 12, z: 8 } })).toBe(96);
  });
});