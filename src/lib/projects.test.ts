import { describe, expect, it } from "vitest";
import {
  appendIfcVersion,
  clearProjectIfcVersions,
  activeIfcVersion,
  ifcVersionLabel,
  initialProjects,
  previousUploadedIfcVersion,
  resetProjectToDefaults,
  setIfcVersionModelStats,
  storeProjectCostFile,
} from "./projects";

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

describe("IFC model stats", () => {
  it("stores element and IfcWall counts on a version", () => {
    const project = appendIfcVersion(initialProjects()[0]!, new File(["ifc"], "walls.ifc"));
    const active = project.activeIfcVersion;
    const next = setIfcVersionModelStats(project, active, { elementCount: 120, ifcWallCount: 5, buildingAreaM2: 473.3 });
    const v = next.ifcVersions.find((x) => x.version === active)!;
    expect(v.elementCount).toBe(120);
    expect(v.ifcWallCount).toBe(5);
    expect(v.buildingAreaM2).toBe(473.3);
  });
});

describe("IFC version compare", () => {
  it("picks the latest uploaded file before the active version", () => {
    let project = appendIfcVersion(initialProjects()[2]!, new File(["a"], "v1.ifc"), "d1");
    project = appendIfcVersion(project, new File(["b"], "v2.ifc"), "d2");
    const current = activeIfcVersion(project)!;
    const prev = previousUploadedIfcVersion(project, current);
    expect(current.version).toBe(3);
    expect(prev?.version).toBe(2);
    expect(prev?.name).toBe("v1.ifc");
  });
});

describe("reset project", () => {
  it("clears IFC versions so the next upload can start at version 01", () => {
    let project = appendIfcVersion(initialProjects()[0]!, new File(["ifc"], "a.ifc"), "today");
    project = appendIfcVersion(project, new File(["ifc"], "b.ifc"), "today");
    const cleared = clearProjectIfcVersions(project);
    expect(cleared.ifcVersions).toEqual([]);
    expect(cleared.activeIfcVersion).toBe(0);
    const again = appendIfcVersion(cleared, new File(["ifc"], "c.ifc"), "today");
    expect(again.activeIfcVersion).toBe(1);
  });

  it("resets configuration fields and removes cost data", () => {
    const project = storeProjectCostFile(initialProjects()[0]!, new File([], "cost.csv"), []);
    const reset = resetProjectToDefaults(project);
    expect(reset.costData).toBeNull();
    expect(reset.ifcVersions).toEqual([]);
    expect(reset.config.typology).toBe("");
    expect(reset.config.name).toBe("Verona Hospital");
  });
});
