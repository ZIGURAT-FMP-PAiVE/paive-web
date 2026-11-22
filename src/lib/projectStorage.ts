import type { CostRow } from "./costFile";
import type { IfcVersion, Project, ProjectConfig, ProjectCostData } from "./projects";
import { initialProjects, pruneIfcVersionsWithoutFiles, uploadedIfcVersions } from "./projects";

const DB_NAME = "paive-web";
const DB_VERSION = 1;
const FILE_STORE = "files";
const WORKSPACE_KEY = "paive.workspace.v1";
const FILE_MANIFEST_KEY = "paive.file-manifest.v1";

type FileManifest = Record<string, { size: number; name: string }>;

function loadFileManifest(): FileManifest {
  try {
    return JSON.parse(localStorage.getItem(FILE_MANIFEST_KEY) ?? "{}") as FileManifest;
  } catch {
    return {};
  }
}

function saveFileManifest(manifest: FileManifest): void {
  localStorage.setItem(FILE_MANIFEST_KEY, JSON.stringify(manifest));
}

function fileSyncToken(file: File): { size: number; name: string } {
  return { size: file.size, name: file.name };
}

function manifestMatches(manifest: FileManifest, key: string, file: File): boolean {
  const tok = fileSyncToken(file);
  const prev = manifest[key];
  return prev != null && prev.size === tok.size && prev.name === tok.name;
}

type PersistedIfcVersion = Omit<IfcVersion, "file"> & {
  hasFile: boolean;
  elementCount?: number | null;
  ifcWallCount?: number | null;
  buildingAreaM2?: number | null;
};
type PersistedCostData = Omit<ProjectCostData, "file"> & { hasFile: boolean };
type PersistedProject = Omit<Project, "ifcVersions" | "costData"> & {
  ifcVersions: PersistedIfcVersion[];
  costData: PersistedCostData | null;
};

export type ProjectBaseline = { config: ProjectConfig; costData: ProjectCostData | null };

type PersistedBaseline = { config: ProjectConfig; costData: PersistedCostData | null };

type WorkspaceSnapshot = {
  projects: PersistedProject[];
  projectBaselines: Record<string, PersistedBaseline>;
  activeId: string;
};

type StoredBlob = { blob: Blob; name: string; mimeType: string };

const ifcFileKey = (projectId: string, version: number) => `ifc:${projectId}:${version}`;
const costFileKey = (projectId: string) => `cost:${projectId}`;

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE);
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putFile(key: string, file: File): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  const tx = db.transaction(FILE_STORE, "readwrite");
  const payload: StoredBlob = { blob: file, name: file.name, mimeType: file.type || "application/octet-stream" };
  await idbRequest(tx.objectStore(FILE_STORE).put(payload, key));
  db.close();
}

async function getFile(key: string): Promise<File | null> {
  if (!isBrowser()) return null;
  const db = await openDb();
  const tx = db.transaction(FILE_STORE, "readonly");
  const row = await idbRequest<StoredBlob | undefined>(tx.objectStore(FILE_STORE).get(key));
  db.close();
  if (!row) return null;
  return new File([row.blob], row.name, { type: row.mimeType });
}

async function deleteKeys(keys: string[]): Promise<void> {
  if (!isBrowser() || !keys.length) return;
  const db = await openDb();
  const tx = db.transaction(FILE_STORE, "readwrite");
  const store = tx.objectStore(FILE_STORE);
  await Promise.all(keys.map((key) => idbRequest(store.delete(key))));
  db.close();
}

function projectFileKeys(project: Project): string[] {
  const keys = uploadedIfcVersions(project).map((v) => ifcFileKey(project.id, v.version));
  if (project.costData?.file) keys.push(costFileKey(project.id));
  return keys;
}

export async function syncProjectFiles(projects: Project[]): Promise<void> {
  if (!isBrowser()) return;
  const wanted = new Set(projects.flatMap(projectFileKeys));
  const db = await openDb();
  const tx = db.transaction(FILE_STORE, "readonly");
  const allKeys = await idbRequest<string[]>(tx.objectStore(FILE_STORE).getAllKeys() as IDBRequest<string[]>);
  db.close();

  const orphan = allKeys.filter((k) => (k.startsWith("ifc:") || k.startsWith("cost:")) && !wanted.has(k));
  const manifest = loadFileManifest();
  let manifestDirty = false;
  if (orphan.length) {
    await deleteKeys(orphan);
    for (const key of orphan) {
      delete manifest[key];
      manifestDirty = true;
    }
  }

  const pendingPuts: Promise<void>[] = [];
  for (const p of projects) {
    for (const v of uploadedIfcVersions(p)) {
      const key = ifcFileKey(p.id, v.version);
      if (!v.file || manifestMatches(manifest, key, v.file)) continue;
      pendingPuts.push(
        putFile(key, v.file).then(() => {
          manifest[key] = fileSyncToken(v.file!);
          manifestDirty = true;
        }),
      );
    }
    const cost = p.costData?.file;
    if (cost) {
      const key = costFileKey(p.id);
      if (!manifestMatches(manifest, key, cost)) {
        pendingPuts.push(
          putFile(key, cost).then(() => {
            manifest[key] = fileSyncToken(cost);
            manifestDirty = true;
          }),
        );
      }
    }
  }
  await Promise.all(pendingPuts);
  if (manifestDirty) saveFileManifest(manifest);
}

export async function deleteAllProjectFiles(projectId: string): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  const tx = db.transaction(FILE_STORE, "readonly");
  const allKeys = await idbRequest<string[]>(tx.objectStore(FILE_STORE).getAllKeys() as IDBRequest<string[]>);
  db.close();
  const keys = allKeys.filter((k) => k.startsWith(`ifc:${projectId}:`) || k === costFileKey(projectId));
  await deleteKeys(keys);
  const manifest = loadFileManifest();
  let changed = false;
  for (const key of keys) {
    if (key in manifest) {
      delete manifest[key];
      changed = true;
    }
  }
  if (changed) saveFileManifest(manifest);
}

export async function deleteProjectIfcFiles(projectId: string): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDb();
  const tx = db.transaction(FILE_STORE, "readonly");
  const allKeys = await idbRequest<string[]>(tx.objectStore(FILE_STORE).getAllKeys() as IDBRequest<string[]>);
  db.close();
  const keys = allKeys.filter((k) => k.startsWith(`ifc:${projectId}:`));
  await deleteKeys(keys);
  const manifest = loadFileManifest();
  let changed = false;
  for (const key of keys) {
    if (key in manifest) {
      delete manifest[key];
      changed = true;
    }
  }
  if (changed) saveFileManifest(manifest);
}

function serializeIfcVersion(v: IfcVersion): PersistedIfcVersion {
  const { file, ...rest } = v;
  return {
    ...rest,
    hasFile: file != null,
    elementCount: v.elementCount ?? null,
    ifcWallCount: v.ifcWallCount ?? null,
    buildingAreaM2: v.buildingAreaM2 ?? null,
  };
}

function serializeCostData(c: ProjectCostData | null): PersistedCostData | null {
  if (!c) return null;
  const { file, ...rest } = c;
  return { ...rest, hasFile: file != null };
}

function serializeProject(p: Project): PersistedProject {
  return {
    ...p,
    ifcVersions: p.ifcVersions.map(serializeIfcVersion),
    costData: serializeCostData(p.costData),
  };
}

function serializeBaseline(b: ProjectBaseline): PersistedBaseline {
  return { config: b.config, costData: serializeCostData(b.costData) };
}

async function hydrateIfcVersion(projectId: string, v: PersistedIfcVersion): Promise<IfcVersion> {
  const file = v.hasFile ? await getFile(ifcFileKey(projectId, v.version)) : null;
  const { hasFile: _h, ...rest } = v;
  return {
    ...rest,
    file,
    elementCount: v.elementCount ?? null,
    ifcWallCount: v.ifcWallCount ?? null,
    buildingAreaM2: v.buildingAreaM2 ?? null,
  };
}

async function hydrateCostData(projectId: string, c: PersistedCostData | null): Promise<ProjectCostData | null> {
  if (!c) return null;
  const file = c.hasFile ? await getFile(costFileKey(projectId)) : null;
  const { hasFile: _h, ...rest } = c;
  return { ...rest, file };
}

async function hydrateProject(p: PersistedProject): Promise<Project> {
  const ifcVersions = await Promise.all(p.ifcVersions.map((v) => hydrateIfcVersion(p.id, v)));
  const costData = await hydrateCostData(p.id, p.costData);
  return { ...p, ifcVersions, costData };
}

function cloneTargets(targets: ProjectConfig["targets"]): ProjectConfig["targets"] {
  return targets.map((t) => ({ ...t }));
}

function cloneCostRows(rows: CostRow[]): CostRow[] {
  return rows.map((r) => ({ ...r }));
}

function cloneBaseline(b: PersistedBaseline): ProjectBaseline {
  return {
    config: { ...b.config, targets: cloneTargets(b.config.targets) },
    costData: b.costData
      ? {
          name: b.costData.name,
          sizeLabel: b.costData.sizeLabel,
          uploadedAt: b.costData.uploadedAt,
          rows: cloneCostRows(b.costData.rows),
          file: null,
        }
      : null,
  };
}

export async function saveWorkspace(projects: Project[], projectBaselines: Record<string, ProjectBaseline>, activeId: string): Promise<void> {
  if (!isBrowser()) return;
  const snapshot: WorkspaceSnapshot = {
    projects: projects.map(serializeProject),
    projectBaselines: Object.fromEntries(
      Object.entries(projectBaselines).map(([id, b]) => [id, serializeBaseline(b)]),
    ),
    activeId,
  };
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot));
  await syncProjectFiles(projects);
}

export async function loadWorkspace(): Promise<{
  projects: Project[];
  projectBaselines: Record<string, ProjectBaseline>;
  activeId: string;
} | null> {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(WORKSPACE_KEY);
  if (!raw) return null;
  try {
    const snapshot = JSON.parse(raw) as WorkspaceSnapshot;
    if (!snapshot.projects?.length) return null;
    const projects = (await Promise.all(snapshot.projects.map(hydrateProject))).map(pruneIfcVersionsWithoutFiles);
    const projectBaselines = Object.fromEntries(
      Object.entries(snapshot.projectBaselines ?? {}).map(([id, b]) => [id, cloneBaseline(b)]),
    );
    return { projects, projectBaselines, activeId: snapshot.activeId || projects[0]!.id };
  } catch {
    return null;
  }
}

export async function clearWorkspaceStorage(): Promise<void> {
  if (!isBrowser()) return;
  localStorage.removeItem(WORKSPACE_KEY);
  localStorage.removeItem(FILE_MANIFEST_KEY);
  const db = await openDb();
  const tx = db.transaction(FILE_STORE, "readwrite");
  await idbRequest(tx.objectStore(FILE_STORE).clear());
  db.close();
}

export function seedProjects(): Project[] {
  return initialProjects().map((p) => ({
    ...p,
    config: { ...p.config, targets: cloneTargets(p.config.targets) },
    ifcVersions: p.ifcVersions.map((v) => ({ ...v })),
  }));
}

export function projectBaselinesFromProjects(projects: Project[]): Record<string, ProjectBaseline> {
  return Object.fromEntries(
    projects.map((p) => [
      p.id,
      {
        config: { ...p.config, targets: cloneTargets(p.config.targets) },
        costData: p.costData
          ? { ...p.costData, rows: cloneCostRows(p.costData.rows), file: null }
          : null,
      },
    ]),
  );
}