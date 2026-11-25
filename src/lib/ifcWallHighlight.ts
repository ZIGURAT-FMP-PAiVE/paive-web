export type AffectedWallHighlightSpec = { colour: string; guid?: string };

export type WallHighlightAssignment = {
  spec: AffectedWallHighlightSpec;
  expressId: string;
  globalId: string;
};

/** Map PAiVE run wall rows to IfcWall express IDs via IfcGlobalId (from run results). */
export function assignWallsByFixtureGuid(
  specs: AffectedWallHighlightSpec[] | undefined,
  wallGlobalIdToExpressId: Map<string, string>,
  ifcWallIdSet: Set<string>,
): { assignments: WallHighlightAssignment[]; matched: number; requested: number } {
  if (!specs?.length) return { assignments: [], matched: 0, requested: 0 };

  const withGuid = specs.filter((s) => s.guid);
  const requested = withGuid.length;
  const claimed = new Set<string>();
  const assignments: WallHighlightAssignment[] = [];

  for (const spec of withGuid) {
    const globalId = spec.guid!;
    const expressId = wallGlobalIdToExpressId.get(globalId);
    if (!expressId || claimed.has(expressId) || !ifcWallIdSet.has(expressId)) continue;
    claimed.add(expressId);
    assignments.push({ spec, expressId, globalId });
  }

  return { assignments, matched: assignments.length, requested };
}