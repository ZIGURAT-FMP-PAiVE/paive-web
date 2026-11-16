import { describe, it, expect } from "vitest";
import { rowsFromRecords, toNum } from "./costFile";

describe("cost file", () => {
  it("computes total from quantity x rate when total missing", () => {
    const [r] = rowsFromRecords([{ "Element ID": "W-101", Qty: 120, "Unit Rate": 280 }]);
    expect(r!.total).toBe(33600);
  });
  it("parses european number format", () => {
    expect(toNum("€ 1.234,50")).toBe(1234.5);
  });
});
