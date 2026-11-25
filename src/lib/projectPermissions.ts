import { getDemoUserEmail, loginRoleForEmail } from "@/lib/demoAuth";
import type { Project, ProjectRole } from "@/lib/projects";

export type Permission =
  | "upload_ifc"
  | "upload_cost"
  | "clear_ifc"
  | "edit_config"
  | "save_config"
  | "reset_config"
  | "delete_project"
  | "manage_roles"
  | "submit_decision"
  | "create_project"
  | "download_report";

const ADMIN_PERMISSIONS: Permission[] = [
  "upload_ifc",
  "upload_cost",
  "clear_ifc",
  "edit_config",
  "save_config",
  "reset_config",
  "delete_project",
  "manage_roles",
  "submit_decision",
  "create_project",
  "download_report",
];

const VIEWER_PERMISSIONS: Permission[] = ["download_report"];

const BY_ROLE: Record<ProjectRole, Set<Permission>> = {
  admin: new Set(ADMIN_PERMISSIONS),
  viewer: new Set(VIEWER_PERMISSIONS),
};

export function effectiveProjectRole(project: Project, userEmail: string): ProjectRole {
  const email = userEmail.trim().toLowerCase();
  const member = project.members?.find((m) => m.email.toLowerCase() === email);
  if (member) return member.role;
  return loginRoleForEmail(email);
}

export type ProjectAccess = {
  email: string;
  role: ProjectRole;
  can: (permission: Permission) => boolean;
};

export function projectAccess(project: Project, userEmail?: string | null): ProjectAccess {
  const email = userEmail?.trim() ?? getDemoUserEmail() ?? "";
  const role = effectiveProjectRole(project, email);
  const allowed = BY_ROLE[role];
  return {
    email,
    role,
    can: (permission) => allowed.has(permission),
  };
}

export const ROLE_LABELS: Record<ProjectRole, string> = {
  admin: "BIM Manager / Admin",
  viewer: "Viewer",
};