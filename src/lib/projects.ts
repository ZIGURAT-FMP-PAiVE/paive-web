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
};

export type Project = {
  id: string;
  code: string;
  status: "On track" | "Analyzing" | "Draft";
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

export function activeIfcVersion(project: Project): IfcVersion | undefined {
  return project.ifcVersions.find((v) => v.version === project.activeIfcVersion) ?? project.ifcVersions.at(-1);
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

export function setIfcVersionElementCount(project: Project, version: number, elementCount: number): Project {
  return {
    ...project,
    ifcVersions: project.ifcVersions.map((v) => (v.version === version ? { ...v, elementCount } : v)),
  };
}

export function appendIfcVersion(project: Project, file: File, uploadedAt = formatIfcDate(new Date())): Project {
  const version = (project.ifcVersions.at(-1)?.version ?? 0) + 1;
  const entry: IfcVersion = {
    version,
    name: file.name,
    sizeLabel: file.size < 1e6 ? `${Math.max(file.size / 1e3, 0.1).toFixed(1)} KB` : `${(file.size / 1e6).toFixed(1)} MB`,
    uploadedAt,
    file,
    elementCount: null,
  };
  return {
    ...project,
    ifc: file.name,
    ifcVersions: [...project.ifcVersions, entry],
    activeIfcVersion: version,
  };
}

function baselineIfc(name: string, uploadedAt: string): Pick<Project, "ifc" | "ifcVersions" | "activeIfcVersion"> {
  return {
    ifc: name,
    activeIfcVersion: 1,
    ifcVersions: [{ version: 1, name, sizeLabel: "—", uploadedAt, file: null, elementCount: null }],
  };
}

export const STAGES = ["Concept", "Schematic Design", "Design Development", "Construction Documents", "Construction"];

const targets = (fire = "60"): Target[] => [
  { key: "thermal", name: "Thermal performance", metric: "U-value", unit: "W/m²K", op: "Maximum", value: "0.24" },
  { key: "fire", name: "Fire resistance", metric: "Fire rating", unit: "minutes", op: "Minimum", value: fire },
  { key: "acoustic", name: "Acoustic performance", metric: "Weighted sound reduction", unit: "dB", op: "Minimum", value: "52" },
];

export function initialProjects(): Project[] {
  return [
    { id: "verona", code: "VH", status: "Analyzing", costData: null, ...baselineIfc("verona_hospital_v03.ifc", "12 Oct 2026"),
      config: { name: "Verona Hospital", stage: "Design Development", typology: "External walls", targets: targets("90"), functionWeight: 60, costSource: "DEI Prezzario 2026 – Veneto" } },
    { id: "milano", code: "MM", status: "On track", costData: null, ...baselineIfc("milano_medical_v02.ifc", "28 Oct 2026"),
      config: { name: "Milano Medical Center", stage: "Schematic Design", typology: "Facade systems", targets: targets("120"), functionWeight: 50, costSource: "rates_milano_Q3_2026.xlsx" } },
    { id: "test1", code: "T1", status: "Draft", costData: null, ...baselineIfc("test_model.ifc", "01 Nov 2026"),
      config: { name: "Test Valentina 1", stage: "Design Development", typology: "External walls", targets: targets(), functionWeight: 70, costSource: "" } },
  ];
}
