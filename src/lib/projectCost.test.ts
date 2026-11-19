import { describe, expect, it } from "vitest";
import { initialProjects } from "./projects";
import { applyProjectCostFile, loadProjectCostFile } from "./projectCost";

describe("loadProjectCostFile", () => {
  it("accepts an empty file with zero rows", async () => {
    const file = new File([], "empty_costs.csv", { type: "text/csv" });
    const loaded = await loadProjectCostFile(file);
    expect(loaded).toEqual({ file, rows: [] });
  });
});

describe("applyProjectCostFile", () => {
  it("stores cost metadata even when there are no rows", () => {
    const project = initialProjects()[2]!;
    const file = new File([], "empty_costs.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const next = applyProjectCostFile(project, file, []);
    expect(next.costData?.name).toBe("empty_costs.xlsx");
    expect(next.costData?.rows).toEqual([]);
  });
});