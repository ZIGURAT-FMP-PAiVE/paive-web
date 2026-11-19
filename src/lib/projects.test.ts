import { describe, expect, it } from "vitest";
import { appendIfcVersion, ifcVersionLabel, initialProjects } from "./projects";

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
