/** Derive building-area total (m²) from floor/slab quantity names when the IFC defines them. */
export function measureBuildingAreaM2(
  api: {
    GetLineIDsWithType: (modelID: number, type: number) => { size: () => number; get: (i: number) => number };
    GetLine: (modelID: number, id: number, flat: boolean) => Record<string, unknown>;
  },
  modelID: number,
  IFCQUANTITYAREA: number,
): number | null {
  const areaNames = new Set(["grossfloorarea", "netfloorarea", "grossarea", "netarea"]);
  let total = 0;
  let hits = 0;

  const qAreas = api.GetLineIDsWithType(modelID, IFCQUANTITYAREA);
  for (let i = 0; i < qAreas.size(); i++) {
    const q = api.GetLine(modelID, qAreas.get(i), false);
    const name = String((q.Name as { value?: string })?.value ?? q.Name ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    if (!areaNames.has(name)) continue;
    const raw = (q.AreaValue as { value?: number })?.value ?? q.AreaValue;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      total += raw;
      hits++;
    }
  }
  return hits > 0 && total > 0 ? total : null;
}

export function footprintAreaM2(box: { min: { x: number; z: number }; max: { x: number; z: number } }): number {
  return Math.abs(box.max.x - box.min.x) * Math.abs(box.max.z - box.min.z);
}