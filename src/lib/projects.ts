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
export type IfcVersion = {
  version: number;
  name: string;
  sizeLabel: string;
  uploadedAt: string;
  file: File | null;
};

export type Project = {
  id: string;
  code: string;
  status: "On track" | "Analyzing" | "Draft";
  ifc: string;
  ifcVersions: IfcVersion[];
  activeIfcVersion: number;
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
export function appendIfcVersion(project: Project, file: File, uploadedAt = formatIfcDate(new Date())): Project {
  const version = (project.ifcVersions.at(-1)?.version ?? 0) + 1;
  const entry: IfcVersion = {
    version,
    name: file.name,
    sizeLabel: `${(file.size / 1e6).toFixed(1)} MB`,
    uploadedAt,
    file,
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
    ifcVersions: [{ version: 1, name, sizeLabel: "—", uploadedAt, file: null }],
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
    { id: "verona", code: "VH", status: "Analyzing", ...baselineIfc("verona_hospital_v03.ifc", "12 Oct 2026"),
      config: { name: "Verona Hospital", stage: "Design Development", typology: "External walls", targets: targets("90"), functionWeight: 60, costSource: "DEI Prezzario 2026 – Veneto" } },
    { id: "milano", code: "MM", status: "On track", ...baselineIfc("milano_medical_v02.ifc", "28 Oct 2026"),
      config: { name: "Milano Medical Center", stage: "Schematic Design", typology: "Facade systems", targets: targets("120"), functionWeight: 50, costSource: "rates_milano_Q3_2026.xlsx" } },
    { id: "test1", code: "T1", status: "Draft", ...baselineIfc("test_model.ifc", "01 Nov 2026"),
      config: { name: "Test Valentina 1", stage: "Design Development", typology: "External walls", targets: targets(), functionWeight: 70, costSource: "" } },
  ];
}
