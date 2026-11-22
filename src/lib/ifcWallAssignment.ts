export type CardinalSide = "south" | "north" | "west" | "east";

/** Assignment order for affected rows: S → N → W → E, then repeat. */
export const CARDINAL_ASSIGN_CYCLE: CardinalSide[] = ["south", "north", "west", "east"];

export type FootprintBox = { minX: number; maxX: number; minZ: number; maxZ: number };

export type WallCenter = { id: string; x: number; z: number };

export type WallBounds = WallCenter & {
  height: number;
  spanX: number;
  spanZ: number;
};

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

export function footprintFromWallBounds(bounds: Iterable<WallBounds>): FootprintBox | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let n = 0;
  for (const b of bounds) {
    minX = Math.min(minX, b.x);
    maxX = Math.max(maxX, b.x);
    minZ = Math.min(minZ, b.z);
    maxZ = Math.max(maxZ, b.z);
    n++;
  }
  if (n === 0) return null;
  return { minX, maxX, minZ, maxZ };
}

/** Reject horizontal floor/roof-like geometry (slabs) even when typed as IfcWall. */
export function isVerticalWall(bounds: WallBounds, minHeightM = 1.0): boolean {
  const minDim = Math.min(bounds.spanX, bounds.height, bounds.spanZ);
  if (bounds.height < minHeightM) return false;
  return bounds.height > minDim * 1.25;
}

export function isExternalWall(center: WallCenter, box: FootprintBox, marginRatio = 0.1): boolean {
  const spanX = box.maxX - box.minX;
  const spanZ = box.maxZ - box.minZ;
  const span = Math.min(spanX, spanZ);
  if (span <= 0) return false;
  const margin = span * marginRatio;
  const edgeDistances = [
    center.x - box.minX,
    box.maxX - center.x,
    center.z - box.minZ,
    box.maxZ - center.z,
  ];
  const minEdge = Math.min(...edgeDistances);
  if (minEdge > margin) return false;
  const sorted = [...edgeDistances].sort((a, b) => a - b);
  return sorted[0]! <= sorted[1]! * 0.65;
}

export function wallCardinal(center: WallCenter, box: FootprintBox): CardinalSide {
  const midX = (box.minX + box.maxX) / 2;
  const midZ = (box.minZ + box.maxZ) / 2;
  const dx = center.x - midX;
  const dz = center.z - midZ;
  if (Math.abs(dx) >= Math.abs(dz)) return dx >= 0 ? "east" : "west";
  return dz >= 0 ? "south" : "north";
}

function externalWallCandidates(
  wallIds: string[],
  bounds: Map<string, WallBounds>,
  box: FootprintBox,
): Record<CardinalSide, string[]> {
  const buckets: Record<CardinalSide, string[]> = { south: [], north: [], west: [], east: [] };
  for (const id of wallIds) {
    const b = bounds.get(id);
    if (!b || !isVerticalWall(b) || !isExternalWall(b, box)) continue;
    buckets[wallCardinal(b, box)].push(id);
  }
  for (const side of CARDINAL_ASSIGN_CYCLE) {
    buckets[side].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  return buckets;
}

/**
 * Pick one distinct external vertical wall per table row, cycling S → N → W → E.
 * Never falls back to internal or horizontal elements.
 */
export function assignWallsByCardinalCycle(
  wallIds: string[],
  bounds: Map<string, WallBounds>,
  count: number,
): string[] {
  if (count <= 0 || wallIds.length === 0) return [];

  const verticalIds = wallIds.filter((id) => {
    const b = bounds.get(id);
    return b && isVerticalWall(b);
  });
  const footprint = footprintFromWallBounds(verticalIds.map((id) => bounds.get(id)!));
  if (!footprint) return [];

  const buckets = externalWallCandidates(wallIds, bounds, footprint);
  const used = new Set<string>();
  const result: string[] = [];

  let cycle = 0;
  let attempts = 0;
  const maxAttempts = Math.max(count * CARDINAL_ASSIGN_CYCLE.length * 4, 32);

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

  if (result.length < count) {
    const spare: string[] = [];
    for (const side of CARDINAL_ASSIGN_CYCLE) {
      for (const id of buckets[side]) {
        if (!used.has(id)) spare.push(id);
      }
    }
    spare.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    for (const id of spare) {
      if (result.length >= count) break;
      used.add(id);
      result.push(id);
    }
  }

  return result;
}