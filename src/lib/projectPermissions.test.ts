import { describe, expect, it } from "vitest";
import { initialProjects } from "./projects";
import { effectiveProjectRole, projectAccess } from "./projectPermissions";

describe("projectPermissions", () => {
  const project = {
    ...initialProjects()[0]!,
    members: [
      { id: "1", email: "user@paive.eu", name: "Admin", role: "admin" as const },
      { id: "2", email: "viewer@paive.eu", name: "Viewer", role: "viewer" as const },
    ],
  };

  it("uses project member role when listed", () => {
    expect(effectiveProjectRole(project, "viewer@paive.eu")).toBe("viewer");
    expect(effectiveProjectRole(project, "user@paive.eu")).toBe("admin");
  });

  it("grants viewer download only", () => {
    const viewer = projectAccess(project, "viewer@paive.eu");
    expect(viewer.can("download_report")).toBe(true);
    expect(viewer.can("upload_ifc")).toBe(false);
    expect(viewer.can("manage_roles")).toBe(false);
  });

  it("grants admin full workflow permissions", () => {
    const admin = projectAccess(project, "user@paive.eu");
    expect(admin.can("upload_ifc")).toBe(true);
    expect(admin.can("submit_decision")).toBe(true);
  });
});