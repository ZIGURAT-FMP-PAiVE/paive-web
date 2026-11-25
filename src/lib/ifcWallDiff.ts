import { collectIfcWallExpressIds } from "@/lib/ifcWallAssignment";

export type WallIndexEntry = {
  globalId: string;
  expressId: string;
  name: string;
  objectType: string;
  tag: string;
};

const ifcScalar = (x: unknown): string => {
  if (x == null) return "";
  if (typeof x === "object" && "value" in (x as object)) return ifcScalar((x as { value: unknown }).value);
  if (typeof x === "number") return Number.isInteger(x) ? String(x) : x.toFixed(3);
  return String(x);
};

/** Index IfcWall GlobalIds and light identity fields from an IFC file. */
export async function indexIfcWalls(file: File): Promise<Map<string, WallIndexEntry>> {
  const WebIFC = await import("web-ifc");
  const api = new WebIFC.IfcAPI();
  api.SetWasmPath("/wasm/");
  await api.Init();
  const data = new Uint8Array(await file.arrayBuffer());
  const modelID = api.OpenModel(data);
  const wallTypeCodes = [
    WebIFC.IFCWALL,
    (WebIFC as { IFCWALLSTANDARDCASE?: number }).IFCWALLSTANDARDCASE,
    (WebIFC as { IFCWALLELEMENTEDCASE?: number }).IFCWALLELEMENTEDCASE,
  ].filter((code): code is number => typeof code === "number");

  const ids = collectIfcWallExpressIds((type) => api.GetLineIDsWithType(modelID, type), wallTypeCodes);
  const map = new Map<string, WallIndexEntry>();
  for (const expressId of ids) {
    try {
      const line = api.GetLine(modelID, Number(expressId), false);
      const globalId = ifcScalar(line.GlobalId);
      if (!globalId) continue;
      map.set(globalId, {
        globalId,
        expressId,
        name: ifcScalar(line.Name),
        objectType: ifcScalar(line.ObjectType),
        tag: ifcScalar(line.Tag),
      });
    } catch {
      /* skip malformed line */
    }
  }
  api.CloseModel(modelID);
  return map;
}

/** Walls new or edited between baseline (v01) and current (v02). */
export function changedWallGlobalIds(
  baseline: Map<string, WallIndexEntry>,
  current: Map<string, WallIndexEntry>,
): string[] {
  const changed: string[] = [];
  for (const [gid, cur] of current) {
    const base = baseline.get(gid);
    if (!base) {
      changed.push(gid);
      continue;
    }
    if (base.name !== cur.name || base.objectType !== cur.objectType || base.tag !== cur.tag) {
      changed.push(gid);
    }
  }
  return changed.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}