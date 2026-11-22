export type CardinalSide = "south" | "north" | "west" | "east";

/** Assignment order for affected rows: S → N → W → E, then repeat. */
export const CARDINAL_ASSIGN_CYCLE: CardinalSide[] = ["south", "north", "west", "east"];

export type FootprintBox = { minX: number; maxX: number; minZ: number; maxZ: number };

export type WallCenter = { id: string; x: number; z: number };

type IfcIdList = { size: () => number; get: (index: number) => number };

/** Union express IDs for all provided IFC wall entity type codes (IfcWall and subtypes). */
export function collectIfcWallExpressIds(getIdsForType: (typeCode: number) => IfcIdList, wallTypeCodes: number[]): string[] {
  const seen = new Set<string>();
  for (const code of wallTypeCodes) {
    const ids = getIdsForType(code);
    for (let i = 0; i < ids.size(); i++) seen.add(String(ids.get(i)));
  }
  return [...seen];
}

export function isExternalWall(center: WallCenter, box: FootprintBox, marginRatio = 0.12): boolean {
  const spanX = box.maxX - box.minX;
  const spanZ = box.maxZ - box.minZ;
  const span = Math.min(spanX, spanZ);
  if (span <= 0) return true;
  const margin = span * marginRatio;
  const edgeDist = Math.min(
    center.x - box.minX,
    box.maxX - center.x,
    center.z - box.minZ,
    box.maxZ - center.z,
  );
  return edgeDist <= margin;
}

export function wallCardinal(center: WallCenter, box: FootprintBox): CardinalSide {
  const midX = (box.minX + box.maxX) / 2;
  const midZ = (box.minZ + box.maxZ) / 2;
  const dx = center.x - midX;
  const dz = center.z - midZ;
  if (Math.abs(dx) >= Math.abs(dz)) return dx >= 0 ? "east" : "west";
  return dz >= 0 ? "south" : "north";
}

export function assignWallsByCardinalCycle(
  wallIds: string[],
  centers: Map<string, WallCenter>,
  box: FootprintBox,
  count: number,
): string[] {
  if (count <= 0 || wallIds.length === 0) return [];

  const buckets: Record<CardinalSide, string[]> = { south: [], north: [], west: [], east: [] };
  const external: string[] = [];

  for (const id of wallIds) {
    const center = centers.get(id);
    if (!center) continue;
    if (!isExternalWall(center, box)) continue;
    external.push(id);
    buckets[wallCardinal(center, box)].push(id);
  }

  for (const side of CARDINAL_ASSIGN_CYCLE) {
    buckets[side].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  const used = new Set<string>();
  const result: string[] = [];
  let cycle = 0;
  let attempts = 0;
  const maxAttempts = Math.max(count * 8, 32);

  while (result.length < count && attempts < maxAttempts) {
    attempts++;
    const side = CARDINAL_ASSIGN_CYCLE[cycle % CARDINAL_ASSIGN_CYCLE.length]!;
    cycle++;
    const candidate = buckets[side].find((id) => !used.has(id));
    if (candidate) {
      used.add(candidate);
      result.push(candidate);
    }
  }

  const fallback = [
    ...external.filter((id) => !used.has(id)),
    ...wallIds.filter((id) => !used.has(id) && !external.includes(id)),
  ];
  for (const id of fallback) {
    if (result.length >= count) break;
    used.add(id);
    result.push(id);
  }

  return result;
}