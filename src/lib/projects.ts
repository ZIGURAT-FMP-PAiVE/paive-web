import type { CostRow } from "./costFile";

export type Op = "Maximum" | "Minimum" | "Equal";
export type Target = { key: string; name: string; metric: string; unit: string; op: Op; value: string };
export type ProjectConfig = {
  name: string;
  stage: string;
  typology: string;
  targets: Target[];
  functionWeight: number; // resource efficiency = 100 - functionWeight
  costSource: string;
};
export type ProjectCostData = {
  name: string;
  sizeLabel: string;
  uploadedAt: string;
  file: File | null;
  rows: CostRow[];
};

export type IfcVersion = {
  version: number;
  name: string;
  sizeLabel: string;
  uploadedAt: string;
  file: File | null;
  elementCount: number | null;
  ifcWallCount: number | null;
  buildingAreaM2: number | null;
};

export const PROJECT_STATUSES = ["Analyzing", "On track", "Draft"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type Project = {
  id: string;
  code: string;
  status: ProjectStatus;
  ifc: string;
  ifcVersions: IfcVersion[];
  activeIfcVersion: number;
  costData: ProjectCostData | null;
  config: ProjectConfig;
};

export function ifcVersionLabel(version: number): string {
  return `v${String(version).padStart(2, "0")}`;
}

export function formatIfcDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function uploadedIfcVersions(project: Project): IfcVersion[] {
  return project.ifcVersions.filter((v) => v.file != null);
}

export function activeIfcVersion(project: Project): IfcVersion | undefined {
  const uploaded = uploadedIfcVersions(project);
  return uploaded.find((v) => v.version === project.activeIfcVersion) ?? uploaded.at(-1);
}

/** Latest uploaded IFC file before the active version (for version-to-version change detection). */
export function previousUploadedIfcVersion(project: Project, current = activeIfcVersion(project)): IfcVersion | undefined {
  if (!current) return undefined;
  const withFile = project.ifcVersions.filter((v) => v.file);
  return [...withFile].reverse().find((v) => v.version < current.version);
}

/** Keep the previous model and store this file as the next version (version 2 on the first upload). */
export function storeProjectCostFile(
  project: Project,
  file: File,
  rows: CostRow[],
  uploadedAt = formatIfcDate(new Date()),
): Project {
  return {
    ...project,
    costData: {
      name: file.name,
      sizeLabel: file.size < 1e6 ? `${Math.max(file.size / 1e3, 0.1).toFixed(1)} KB` : `${(file.size / 1e6).toFixed(1)} MB`,
      uploadedAt,
      file,
      rows,
    },
    config: { ...project.config, costSource: file.name },
  };
}

export function defaultProjectConfig(name: string): ProjectConfig {
  return {
    name,
    stage: "Design Development",
    typology: "",
    targets: targets(),
    functionWeight: 60,
    costSource: "",
  };
}

/** Empty configuration, no IFC versions, and no cost file — next IFC upload becomes v01. */
export function resetProjectToDefaults(project: Project): Project {
  return {
    ...project,
    status: "Draft",
    ifc: "",
    ifcVersions: [],
    activeIfcVersion: 0,
    costData: null,
    config: defaultProjectConfig(project.config.name.trim() || `Project ${project.code}`),
  };
}

export function clearProjectIfcVersions(project: Project): Project {
  return { ...project, ifc: "", ifcVersions: [], activeIfcVersion: 0 };
}

export function setIfcVersionModelStats(
  project: Project,
  version: number,
  stats: { elementCount: number; ifcWallCount: number; buildingAreaM2: number },
): Project {
  return {
    ...project,
    ifcVersions: project.ifcVersions.map((v) =>
      v.version === version
        ? { ...v, elementCount: stats.elementCount, ifcWallCount: stats.ifcWallCount, buildingAreaM2: stats.buildingAreaM2 }
        : v,
    ),
  };
}

export function pruneIfcVersionsWithoutFiles(project: Project): Project {
  const uploaded = uploadedIfcVersions(project);
  if (uploaded.length === project.ifcVersions.length) return project;
  const activeStillThere = uploaded.some((v) => v.version === project.activeIfcVersion);
  const activeIfcVersion = activeStillThere ? project.activeIfcVersion : (uploaded.at(-1)?.version ?? 0);
  return {
    ...project,
    ifcVersions: uploaded,
    activeIfcVersion,
    ifc: uploaded.at(-1)?.name ?? "",
  };
}

export function appendIfcVersion(project: Project, file: File, uploadedAt = formatIfcDate(new Date())): Project {
  const uploaded = uploadedIfcVersions(project);
  const version = (uploaded.at(-1)?.version ?? 0) + 1;
  const entry: IfcVersion = {
    version,
    name: file.name,
    sizeLabel: file.size < 1e6 ? `${Math.max(file.size / 1e3, 0.1).toFixed(1)} KB` : `${(file.size / 1e6).toFixed(1)} MB`,
    uploadedAt,
    file,
    elementCount: null,
    ifcWallCount: null,
    buildingAreaM2: null,
  };
  return {
    ...project,
    ifc: file.name,
    ifcVersions: [...uploaded, entry],
    activeIfcVersion: version,
  };
}

const emptyIfc: Pick<Project, "ifc" | "ifcVersions" | "activeIfcVersion"> = {
  ifc: "",
  activeIfcVersion: 0,
  ifcVersions: [],
};

export const STAGES = ["Concept", "Schematic Design", "Design Development", "Construction Documents", "Construction"];

const targets = (fire = "60"): Target[] => [
  { key: "thermal", name: "Thermal performance", metric: "U-value", unit: "W/m²K", op: "Maximum", value: "0.24" },
  { key: "fire", name: "Fire resistance", metric: "Fire rating", unit: "minutes", op: "Minimum", value: fire },
  { key: "acoustic", name: "Acoustic performance", metric: "Weighted sound reduction", unit: "dB", op: "Minimum", value: "52" },
];

export function initialProjects(): Project[] {
  return [
    { id: "verona", code: "VH", status: "Analyzing", costData: null, ...emptyIfc,
      config: { name: "Verona Hospital", stage: "Design Development", typology: "External walls", targets: targets("90"), functionWeight: 60, costSource: "DEI Prezzario 2026 – Veneto" } },
    { id: "milano", code: "MM", status: "On track", costData: null, ...emptyIfc,
      config: { name: "Milano Medical Center", stage: "Schematic Design", typology: "Facade systems", targets: targets("120"), functionWeight: 50, costSource: "rates_milano_Q3_2026.xlsx" } },
    { id: "test1", code: "T1", status: "Draft", costData: null, ...emptyIfc,
      config: { name: "Test Valentina 1", stage: "Design Development", typology: "External walls", targets: targets(), functionWeight: 70, costSource: "" } },
  ];
}
