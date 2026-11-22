import { describe, expect, it } from "vitest";
import {
  appendIfcVersion,
  clearProjectIfcVersions,
  activeIfcVersion,
  ifcVersionLabel,
  initialProjects,
  previousUploadedIfcVersion,
  pruneIfcVersionsWithoutFiles,
  pruneToMaxUploadedIfcVersions,
  resetProjectToDefaults,
  setIfcVersionModelStats,
  storeProjectCostFile,
} from "./projects";

describe("IFC versions", () => {
  it("starts with no stored versions until a file is uploaded", () => {
    const project = initialProjects()[0]!;
    expect(project.ifcVersions).toEqual([]);
    expect(project.activeIfcVersion).toBe(0);
  });

  it("stores the first upload as v01 and the next as v02", () => {
    const project = initialProjects()[0]!;
    const v1 = appendIfcVersion(project, new File(["IFC"], "wall_a.ifc"), "19 Nov 2026");
    expect(v1.ifcVersions.map((v) => `${ifcVersionLabel(v.version)} ${v.name}`)).toEqual(["v01 wall_a.ifc"]);
    expect(v1.activeIfcVersion).toBe(1);

    const v2 = appendIfcVersion(v1, new File(["IFC"], "wall_b.ifc"), "20 Nov 2026");
    expect(v2.ifcVersions.map((v) => `${ifcVersionLabel(v.version)} ${v.name}`)).toEqual([
      "v01 wall_a.ifc",
      "v02 wall_b.ifc",
    ]);
    expect(v2.activeIfcVersion).toBe(2);
    expect(v2.ifcVersions.every((v) => v.file)).toBe(true);
  });

  it("keeps only the latest two uploads when a third is added", () => {
    let project = appendIfcVersion(initialProjects()[0]!, new File(["1"], "a.ifc"));
    project = appendIfcVersion(project, new File(["2"], "b.ifc"));
    project = appendIfcVersion(project, new File(["3"], "c.ifc"));
    expect(project.ifcVersions.map((v) => v.version)).toEqual([2, 3]);
    expect(project.ifcVersions.map((v) => v.name)).toEqual(["b.ifc", "c.ifc"]);
    expect(project.activeIfcVersion).toBe(3);
  });

  it("prunes legacy workspaces with more than two stored versions", () => {
    let project = initialProjects()[0]!;
    for (let i = 1; i <= 4; i++) {
      project = {
        ...project,
        ifcVersions: [
          ...project.ifcVersions,
          {
            version: i,
            name: `v${i}.ifc`,
            sizeLabel: "1 KB",
            uploadedAt: "today",
            file: new File([String(i)], `v${i}.ifc`),
            elementCount: null,
            ifcWallCount: null,
            buildingAreaM2: null,
          },
        ],
        activeIfcVersion: i,
        ifc: `v${i}.ifc`,
      };
    }
    const pruned = pruneToMaxUploadedIfcVersions(project);
    expect(pruned.ifcVersions.map((v) => v.version)).toEqual([3, 4]);
    expect(pruned.activeIfcVersion).toBe(4);
  });

  it("drops placeholder versions without a file on append", () => {
    const withPlaceholder = {
      ...initialProjects()[0]!,
      ifc: "demo.ifc",
      activeIfcVersion: 1,
      ifcVersions: [
        {
          version: 1,
          name: "demo.ifc",
          sizeLabel: "—",
          uploadedAt: "01 Jan 2026",
          file: null,
          elementCount: null,
          ifcWallCount: null,
          buildingAreaM2: null,
        },
      ],
    };
    const stored = appendIfcVersion(withPlaceholder, new File(["IFC"], "real.ifc"));
    expect(stored.ifcVersions).toHaveLength(1);
    expect(stored.ifcVersions[0]!.name).toBe("real.ifc");
    expect(stored.activeIfcVersion).toBe(1);
  });

  it("prunes file-less versions when loading legacy workspace data", () => {
    const legacy = {
      ...initialProjects()[0]!,
      ifcVersions: [
        {
          version: 1,
          name: "placeholder.ifc",
          sizeLabel: "—",
          uploadedAt: "old",
          file: null,
          elementCount: null,
          ifcWallCount: null,
          buildingAreaM2: null,
        },
        {
          version: 2,
          name: "real.ifc",
          sizeLabel: "1.0 MB",
          uploadedAt: "today",
          file: new File(["x"], "real.ifc"),
          elementCount: null,
          ifcWallCount: null,
          buildingAreaM2: null,
        },
      ],
      activeIfcVersion: 2,
    };
    const pruned = pruneIfcVersionsWithoutFiles(legacy);
    expect(pruned.ifcVersions).toHaveLength(1);
    expect(pruned.ifcVersions[0]!.version).toBe(2);
    expect(pruned.activeIfcVersion).toBe(2);
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
    expect(current.version).toBe(2);
    expect(prev?.version).toBe(1);
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