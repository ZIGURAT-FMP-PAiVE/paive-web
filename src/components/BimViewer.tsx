import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  assignWallsByCardinalCycle,
  collectIfcWallExpressIds,
  type FootprintBox,
  type WallCenter,
} from "@/lib/ifcWallAssignment";
import { footprintAreaM2, measureBuildingAreaM2 } from "@/lib/ifcBuildingArea";
import { wallColourEmissiveHex, wallColourHex } from "@/lib/veSemantics";

export type BimElement = { id: string; type: string };

export type PropGroup = { name: string; props: [string, string][] };
export type IfcInfo = { expressId: string; ifcClass: string; guid: string; name: string; objectType: string; tag: string; groups: PropGroup[] };

export type BimViewerHandle = {
  fitView: () => void;
  resetView: () => void;
};

export type AffectedWallHighlight = { colour: string; guid?: string };

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  file?: File | null;
  onInspect?: (info: IfcInfo | null) => void;
  onModelLoaded?: (stats: { elementCount: number; ifcWallCount: number; buildingAreaM2: number }) => void;
  /** Map IFC walls to PAiVE wall health colours (same count as table). */
  affectedWalls?: AffectedWallHighlight[];
};

const val = (x: unknown): string => {
  if (x == null) return "";
  if (typeof x === "object" && "value" in (x as object)) return val((x as { value: unknown }).value);
  if (typeof x === "number") return Number.isInteger(x) ? String(x) : x.toFixed(3);
  return String(x);
};

// Procedural demo model. Swap for That Open Engine / IFC.js loader later.
export const BimViewer = forwardRef<BimViewerHandle, Props>(function BimViewer(
  { selectedId, onSelect, file, onInspect, onModelLoaded, affectedWalls },
  ref,
) {
  const viewApiRef = useRef<{ fitView: () => void; resetView: () => void } | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      fitView: () => viewApiRef.current?.fitView(),
      resetView: () => viewApiRef.current?.resetView(),
    }),
    [],
  );
  const inspectRef = useRef<(id: string | null) => void>(() => onInspectRef.current?.(null));
  const onInspectRef = useRef(onInspect);
  onInspectRef.current = onInspect;
  const onModelLoadedRef = useRef(onModelLoaded);
  onModelLoadedRef.current = onModelLoaded;
  const loadRef = useRef<(f: File) => Promise<void>>(async () => {});
  const clearViewerRef = useRef<() => void>(() => {});
  const pendingRef = useRef<File | null>(null);
  const viewerReadyRef = useRef(false);
  const [status, setStatus] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const paintMeshesRef = useRef<(id: string | null) => void>(() => {});
  const rebuildAffectedRef = useRef<() => void>(() => {});
  const focusOnElementRef = useRef<(id: string | null) => void>(() => {});
  const resolveExpressIdRef = useRef<(id: string | null) => string | null>(() => null);
  const affectedWallsRef = useRef(affectedWalls);
  affectedWallsRef.current = affectedWalls;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const el = mountRef.current;
      if (!el || disposed) return;
      await new Promise<void>((resolve) => {
        const wait = (attempt = 0) => {
          if (disposed) {
            resolve();
            return;
          }
          if (el.clientWidth > 40 && el.clientHeight > 40) {
            resolve();
            return;
          }
          if (attempt > 90) {
            resolve();
            return;
          }
          requestAnimationFrame(() => wait(attempt + 1));
        };
        wait();
      });
      if (disposed || !mountRef.current) return;
      const w = Math.max(el.clientWidth, 1);
      const h = Math.max(el.clientHeight, 1);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1120);
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
      camera.position.set(22, 18, 24);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(w, h);
      el.appendChild(renderer.domElement);
      const fitCanvas = () => {
        const W = Math.max(el.clientWidth, 1);
        const H = Math.max(el.clientHeight, 1);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
      };
      fitCanvas();
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 3, 0);
      const homeCamera = { position: camera.position.clone(), target: controls.target.clone() };
      const saveHomeFromScene = () => {
        homeCamera.position.copy(camera.position);
        homeCamera.target.copy(controls.target);
      };
      const fitView = () => {
        if (!meshes.length) return;
        const box = new THREE.Box3();
        for (const m of meshes) {
          if (m.visible) box.expandByObject(m);
        }
        if (box.isEmpty()) return;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();
        controls.target.copy(center);
        camera.near = Math.max(size / 1000, 0.1);
        camera.far = Math.max(size * 20, 500);
        camera.updateProjectionMatrix();
        camera.position.copy(center).add(new THREE.Vector3(size * 0.6, size * 0.45, size * 0.6));
        saveHomeFromScene();
      };
      const resetView = () => {
        camera.position.copy(homeCamera.position);
        controls.target.copy(homeCamera.target);
        controls.update();
      };
      viewApiRef.current = { fitView, resetView };
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dl = new THREE.DirectionalLight(0xffffff, 1.1);
      dl.position.set(20, 30, 10);
      scene.add(dl);
      const grid = new THREE.GridHelper(60, 30, 0x1e3a5f, 0x16243a);
      scene.add(grid);

      const meshes: InstanceType<typeof THREE.Mesh>[] = [];
      const add = (id: string, color: number, size: [number, number, number], pos: [number, number, number], opacity = 1) => {
        const mat = new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.7 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
        m.position.set(...pos);
        m.userData = { id, base: color };
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x0b1120 }));
        m.add(edges);
        scene.add(m);
        meshes.push(m);
      };
      for (let f = 0; f < 2; f++) {
        const y = f * 4;
        add(`SLAB-0${f + 1}`, 0x64748b, [16, 0.4, 12], [0, y, 0]);
        add(f === 0 ? "W-101" : "W-201", 0xcbd5e1, [16, 3.6, 0.3], [0, y + 2.2, 6]);
        add(`W-10${2 + f * 2}`, 0xcbd5e1, [16, 3.6, 0.3], [0, y + 2.2, -6]);
        add(`W-10${3 + f * 2}`, 0xcbd5e1, [0.3, 3.6, 12], [-8, y + 2.2, 0]);
        add(`W-1${f}9`, 0xcbd5e1, [0.3, 3.6, 12], [8, y + 2.2, 0]);
        add(f === 0 ? "WIN-07" : "WIN-12", 0x7dd3fc, [2.4, 1.4, 0.4], [4, y + 2.4, 6], 0.7);
        add(`WIN-0${8 + f}`, 0x7dd3fc, [2.4, 1.4, 0.4], [-4, y + 2.4, -6], 0.7);
      }
      add("SLAB-ROOF", 0x475569, [16.4, 0.4, 12.4], [0, 8, 0]);
      add("D-11", 0xb45309, [1.4, 2.4, 0.4], [-3, 1.4, 6]);

      const wallPool: string[] = [];
      const ifcWallIdSet = new Set<string>();
      const wallCenterCache = new Map<string, WallCenter>();
      const footprintBox: FootprintBox = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
      const affectedIdToColour = new Map<string, string>();
      const guidToExpressId = new Map<string, string>();
      const expressToGuid = new Map<string, string>();

      const computeWallCenters = () => {
        wallCenterCache.clear();
        const wallSet = new Set(wallPool);
        const boxes = new Map<string, InstanceType<typeof THREE.Box3>>();
        for (const m of meshes) {
          const id = m.userData["id"] as string;
          if (!wallSet.has(id)) continue;
          const piece = new THREE.Box3().setFromObject(m);
          const existing = boxes.get(id);
          if (existing) existing.union(piece);
          else boxes.set(id, piece);
        }
        for (const [id, b] of boxes) {
          const c = b.getCenter(new THREE.Vector3());
          wallCenterCache.set(id, { id, x: c.x, z: c.z });
        }
      };

      const refreshFootprint = () => {
        if (!meshes.length) return;
        const box = new THREE.Box3();
        for (const m of meshes) box.expandByObject(m);
        footprintBox.minX = box.min.x;
        footprintBox.maxX = box.max.x;
        footprintBox.minZ = box.min.z;
        footprintBox.maxZ = box.max.z;
      };

      const resolveExpressId = (selectionKey: string | null): string | null => {
        if (!selectionKey) return null;
        const expressId = guidToExpressId.get(selectionKey) ?? (/^\d+$/.test(selectionKey) ? selectionKey : null);
        if (!expressId) return null;
        if (ifcWallIdSet.size > 0 && !ifcWallIdSet.has(expressId)) return null;
        return expressId;
      };

      const rebuildAffectedHighlights = () => {
        affectedIdToColour.clear();
        guidToExpressId.clear();
        expressToGuid.clear();
        const specs = affectedWallsRef.current;
        if (!specs?.length || !wallPool.length) return;
        computeWallCenters();
        refreshFootprint();
        const picked = assignWallsByCardinalCycle(wallPool, wallCenterCache, footprintBox, specs.length);
        picked.forEach((expressId, i) => {
          const spec = specs[i];
          if (!spec) return;
          affectedIdToColour.set(expressId, spec.colour);
          if (spec.guid) {
            guidToExpressId.set(spec.guid, expressId);
            expressToGuid.set(expressId, spec.guid);
          }
        });
      };

      const paintMeshes = (selectionKey: string | null) => {
        const focusExpressId = resolveExpressId(selectionKey);
        meshes.forEach((m) => {
          const mat = m.material as InstanceType<typeof THREE.MeshStandardMaterial>;
          const id = m.userData["id"] as string;
          const veCol = affectedIdToColour.get(id);
          if (focusExpressId && id === focusExpressId) {
            mat.color.setHex(0x00b3ff);
            mat.emissive.setHex(0x003a55);
          } else if (veCol) {
            mat.color.setHex(wallColourHex(veCol));
            mat.emissive.setHex(wallColourEmissiveHex(veCol));
          } else {
            mat.color.setHex(m.userData["base"] as number);
            mat.emissive.setHex(0x000000);
          }
        });
      };

      const focusOnElement = (selectionKey: string | null) => {
        const expressId = resolveExpressId(selectionKey);
        if (!expressId) return;
        const parts = meshes.filter((m) => (m.userData["id"] as string) === expressId);
        if (!parts.length) return;
        const box = new THREE.Box3();
        for (const m of parts) box.expandByObject(m);
        if (box.isEmpty()) return;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();
        controls.target.copy(center);
        const offset = Math.max(size * 1.15, 2.5);
        camera.position.copy(center).add(new THREE.Vector3(offset * 0.65, offset * 0.5, offset * 0.65));
        camera.near = Math.max(size / 80, 0.1);
        camera.far = Math.max(size * 30, camera.far);
        camera.updateProjectionMatrix();
        controls.update();
      };

      rebuildAffectedRef.current = rebuildAffectedHighlights;
      paintMeshesRef.current = paintMeshes;
      focusOnElementRef.current = focusOnElement;
      resolveExpressIdRef.current = resolveExpressId;

      const demoGroup = [...meshes];
      let ifcGroup: InstanceType<typeof THREE.Group> | null = null;
      const showEmpty = () => {
        demoGroup.forEach((m) => (m.visible = false));
        if (ifcGroup) {
          scene.remove(ifcGroup);
          ifcGroup = null;
        }
        meshes.length = 0;
        wallPool.length = 0;
        ifcWallIdSet.clear();
        wallCenterCache.clear();
        affectedIdToColour.clear();
        guidToExpressId.clear();
        expressToGuid.clear();
        inspectRef.current = (sid) => {
          if (!sid) onInspectRef.current?.(null);
        };
        setStatus(null);
      };
      clearViewerRef.current = showEmpty;

      loadRef.current = async (f: File) => {
        setStatus("Loading IFC model…");
        try {
          const WebIFC = await import("web-ifc");
          const api = new WebIFC.IfcAPI();
          api.SetWasmPath("/wasm/");
          await api.Init();
          const data = new Uint8Array(await f.arrayBuffer());
          const modelID = api.OpenModel(data);
          const group = new THREE.Group();
          const newMeshes: InstanceType<typeof THREE.Mesh>[] = [];
          const elementIds = new Set<number>();
          api.StreamAllMeshes(modelID, (fm) => {
            elementIds.add(fm.expressID);
            const id = String(fm.expressID);
            for (let i = 0; i < fm.geometries.size(); i++) {
              const pg = fm.geometries.get(i);
              const geo = api.GetGeometry(modelID, pg.geometryExpressID);
              const verts = api.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize());
              const idx = api.GetIndexArray(geo.GetIndexData(), geo.GetIndexDataSize());
              const pos = new Float32Array(verts.length / 2), nor = new Float32Array(verts.length / 2);
              for (let k = 0; k < verts.length; k += 6) {
                const j = k / 2;
                pos[j] = verts[k]!; pos[j + 1] = verts[k + 1]!; pos[j + 2] = verts[k + 2]!;
                nor[j] = verts[k + 3]!; nor[j + 1] = verts[k + 4]!; nor[j + 2] = verts[k + 5]!;
              }
              const g = new THREE.BufferGeometry();
              g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
              g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
              g.setIndex(new THREE.BufferAttribute(idx, 1));
              const c = pg.color;
              const col = new THREE.Color(c.x, c.y, c.z);
              const mat = new THREE.MeshStandardMaterial({ color: col, transparent: c.w < 1, opacity: c.w, side: THREE.DoubleSide, roughness: 0.7 });
              const m = new THREE.Mesh(g, mat);
              m.applyMatrix4(new THREE.Matrix4().fromArray(pg.flatTransformation));
              m.userData = { id, base: col.getHex() };
              group.add(m); newMeshes.push(m);
              geo.delete();
            }
          });
          if (!newMeshes.length) { api.CloseModel(modelID); throw new Error("No geometry found in this IFC file"); }
          // Map element -> property definitions
          const relMap = new Map<number, number[]>();
          const rels = api.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES);
          for (let i = 0; i < rels.size(); i++) {
            const rel = api.GetLine(modelID, rels.get(i), false);
            const def = rel.RelatingPropertyDefinition?.value;
            for (const o of rel.RelatedObjects ?? []) {
              const arr = relMap.get(o.value) ?? []; arr.push(def); relMap.set(o.value, arr);
            }
          }
          inspectRef.current = (sid) => {
            if (!sid) { onInspectRef.current?.(null); return; }
            try {
              const eid = Number(sid);
              const line = api.GetLine(modelID, eid, false);
              const groups: PropGroup[] = [];
              for (const pid of relMap.get(eid) ?? []) {
                const ps = api.GetLine(modelID, pid, false);
                const props: [string, string][] = [];
                for (const h of ps.HasProperties ?? []) {
                  const pr = api.GetLine(modelID, h.value, false);
                  props.push([val(pr.Name), val(pr.NominalValue) || val(pr.EnumerationValues?.[0])]);
                }
                for (const q of ps.Quantities ?? []) {
                  const qu = api.GetLine(modelID, q.value, false);
                  const v = qu.LengthValue ?? qu.AreaValue ?? qu.VolumeValue ?? qu.CountValue ?? qu.WeightValue ?? qu.TimeValue;
                  props.push([val(qu.Name), val(v)]);
                }
                if (props.length) groups.push({ name: val(ps.Name) || "Properties", props });
              }
              onInspectRef.current?.({
                expressId: sid, ifcClass: api.GetNameFromTypeCode(api.GetLineType(modelID, eid)),
                guid: val(line.GlobalId), name: val(line.Name), objectType: val(line.ObjectType), tag: val(line.Tag), groups,
              });
            } catch (err) { console.error(err); onInspectRef.current?.(null); }
          };
          demoGroup.forEach((m) => (m.visible = false));
          if (ifcGroup) scene.remove(ifcGroup);
          ifcGroup = group; scene.add(group);
          meshes.length = 0; meshes.push(...newMeshes);
          const box = new THREE.Box3().setFromObject(group);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3()).length();
          controls.target.copy(center);
          camera.near = size / 1000;
          camera.far = size * 20;
          camera.updateProjectionMatrix();
          camera.position.copy(center).add(new THREE.Vector3(size * 0.6, size * 0.45, size * 0.6));
          saveHomeFromScene();
          grid.position.y = box.min.y;
          const wallTypeCodes = [
            WebIFC.IFCWALL,
            (WebIFC as { IFCWALLSTANDARDCASE?: number }).IFCWALLSTANDARDCASE,
            (WebIFC as { IFCWALLELEMENTEDCASE?: number }).IFCWALLELEMENTEDCASE,
          ].filter((code): code is number => typeof code === "number");
          const meshExpressIds = new Set(newMeshes.map((m) => String(m.userData["id"])));
          const ifcWallIds = collectIfcWallExpressIds((type) => api.GetLineIDsWithType(modelID, type), wallTypeCodes).filter(
            (id) => meshExpressIds.has(id),
          );
          wallPool.length = 0;
          ifcWallIdSet.clear();
          for (const id of ifcWallIds) {
            wallPool.push(id);
            ifcWallIdSet.add(id);
          }
          const wallIds = api.GetLineIDsWithType(modelID, WebIFC.IFCWALL);
          rebuildAffectedHighlights();
          const activeSelection = selectedIdRef.current;
          paintMeshes(activeSelection);
          focusOnElement(activeSelection);
          const measured = measureBuildingAreaM2(api, modelID, WebIFC.IFCQUANTITYAREA);
          const buildingAreaM2 = measured ?? footprintAreaM2(box);
          setStatus(null);
          onModelLoadedRef.current?.({
            elementCount: elementIds.size,
            ifcWallCount: wallIds.size(),
            buildingAreaM2,
          });
          fitCanvas();
        } catch (err) {
          console.error(err);
          setStatus("Could not read this IFC file: " + (err instanceof Error ? err.message : String(err)));
        }
      };
      viewerReadyRef.current = true;
      if (pendingRef.current) {
        const p = pendingRef.current;
        pendingRef.current = null;
        void loadRef.current(p);
      } else {
        showEmpty();
      }

      const ray = new THREE.Raycaster();
      const v = new THREE.Vector2();
      let down = { x: 0, y: 0 };
      const pd = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
      const pu = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
        const r = renderer.domElement.getBoundingClientRect();
        v.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(v, camera);
        const hit = ray.intersectObjects(meshes, false)[0];
        if (hit) {
          const expressId = hit.object.userData["id"] as string;
          onSelectRef.current(expressToGuid.get(expressId) ?? expressId);
        }
      };
      renderer.domElement.addEventListener("pointerdown", pd);
      renderer.domElement.addEventListener("pointerup", pu);
      const ro = new ResizeObserver(() => fitCanvas());
      ro.observe(el);
      let raf = 0;
      const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
      loop();
      paintMeshes(selectedId);
      saveHomeFromScene();
      cleanup = () => {
        viewApiRef.current = null;
        cancelAnimationFrame(raf);
        ro.disconnect();
        controls.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();
    return () => {
      disposed = true;
      viewerReadyRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const expressId = resolveExpressIdRef.current(selectedId);
    paintMeshesRef.current(selectedId);
    if (expressId) inspectRef.current(expressId);
    else if (selectedId && /^\d+$/.test(selectedId)) inspectRef.current(selectedId);
    else inspectRef.current(null);
    focusOnElementRef.current(selectedId);
  }, [selectedId]);
  useEffect(() => {
    rebuildAffectedRef.current();
    paintMeshesRef.current(selectedId);
    focusOnElementRef.current(selectedId);
  }, [affectedWalls, selectedId]);
  useEffect(() => {
    if (!file) {
      pendingRef.current = null;
      if (viewerReadyRef.current) clearViewerRef.current();
      return;
    }
    pendingRef.current = file;
    if (viewerReadyRef.current) void loadRef.current(file);
  }, [file]);

  return (
    <div className="relative h-full min-h-[480px] w-full">
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      {!file && !status && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-base text-muted-foreground">
          Upload an IFC model to view it here.
        </div>
      )}
      {status && <div className="absolute inset-x-0 top-4 mx-auto w-fit rounded-lg bg-background/90 px-4 py-2 text-sm text-foreground">{status}</div>}
    </div>
  );
});
