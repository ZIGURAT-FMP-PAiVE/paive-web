import { describe, expect, it } from "vitest";
import { appendIfcVersion, ifcVersionLabel, initialProjects, storeProjectCostFile } from "./projects";

describe("IFC versions", () => {
  it("keeps the current model as version 1 and stores the next upload as version 2", () => {
    const project = initialProjects()[0]!;
    expect(project.ifcVersions.map((v) => v.version)).toEqual([1]);
    expect(project.activeIfcVersion).toBe(1);

    const stored = appendIfcVersion(project, new File(["IFC"], "wall_move.ifc"), "19 Nov 2026");

    expect(stored.ifcVersions.map((v) => `${ifcVersionLabel(v.version)} ${v.name}`)).toEqual([
      "v01 verona_hospital_v03.ifc",
      "v02 wall_move.ifc",
    ]);
    expect(stored.activeIfcVersion).toBe(2);
    expect(stored.ifcVersions[0]!.file).toBeNull();
    expect(stored.ifcVersions[1]!.file?.name).toBe("wall_move.ifc");
    expect(project.ifcVersions).toHaveLength(1);
  });
});

describe("project cost file", () => {
  it("stores parsed rows and filename on the project", () => {
    const project = initialProjects()[0]!;
    const file = new File(["x"], "verona_costs.csv", { type: "text/csv" });
    const rows = [{ id: "W-101", description: "Wall", code: "C-1", quantity: 1, unit: "m2", rate: 100, total: 100 }];
    const next = storeProjectCostFile(project, file, rows, "19 Nov 2026");

    expect(next.costData?.name).toBe("verona_costs.csv");
    expect(next.costData?.rows).toHaveLength(1);
    expect(next.config.costSource).toBe("verona_costs.csv");
    expect(project.costData).toBeNull();
  });
});
