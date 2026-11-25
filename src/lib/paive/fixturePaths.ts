/** Detect Snowdon pipeline fixtures (v01b / v02b IFC exports). Typology uploads stay on bundled fixtures. */
export function usesSnowdonFixtures(ifcFileName: string): boolean {
  const n = ifcFileName.toLowerCase();
  return n.includes("snowdon") || n.includes("v01b") || n.includes("v02b");
}

export const SNOWDON_RUN_FILES: Record<string, string> = {
  run_001_snowdon: "/fixtures/snowdon/run_001_baseline_v01b.json",
  run_002_snowdon: "/fixtures/snowdon/run_002_v02b.json",
};