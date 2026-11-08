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
export type Project = {
  id: string;
  code: string;
  status: "On track" | "Analyzing" | "Draft";
  ifc: string;
  config: ProjectConfig;
};

export const STAGES = ["Concept", "Schematic Design", "Design Development", "Construction Documents", "Construction"];

const targets = (fire = "60"): Target[] => [
  { key: "thermal", name: "Thermal performance", metric: "U-value", unit: "W/m²K", op: "Maximum", value: "0.24" },
  { key: "fire", name: "Fire resistance", metric: "Fire rating", unit: "minutes", op: "Minimum", value: fire },
  { key: "acoustic", name: "Acoustic performance", metric: "Weighted sound reduction", unit: "dB", op: "Minimum", value: "52" },
];

export function initialProjects(): Project[] {
  return [
    { id: "verona", code: "VH", status: "Analyzing", ifc: "verona_hospital_v03.ifc",
      config: { name: "Verona Hospital", stage: "Design Development", typology: "External walls", targets: targets("90"), functionWeight: 60, costSource: "DEI Prezzario 2026 – Veneto" } },
    { id: "milano", code: "MM", status: "On track", ifc: "milano_medical_v02.ifc",
      config: { name: "Milano Medical Center", stage: "Schematic Design", typology: "Facade systems", targets: targets("120"), functionWeight: 50, costSource: "rates_milano_Q3_2026.xlsx" } },
    { id: "test1", code: "T1", status: "Draft", ifc: "test_model.ifc",
      config: { name: "Test Valentina 1", stage: "Design Development", typology: "External walls", targets: targets(), functionWeight: 70, costSource: "" } },
  ];
}
