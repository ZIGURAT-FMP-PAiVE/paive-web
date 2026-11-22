import { useEffect, useRef, useState } from "react";
import { footprintAreaM2, measureBuildingAreaM2 } from "@/lib/ifcBuildingArea";

export type BimElement = { id: string; type: string };

export type PropGroup = { name: string; props: [string, string][] };
export type IfcInfo = { expressId: string; ifcClass: string; guid: string; name: string; objectType: string; tag: string; groups: PropGroup[] };

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  file?: File | null;
  onInspect?: (info: IfcInfo | null) => void;
  onModelLoaded?: (stats: { elementCount: number; ifcWallCount: number; buildingAreaM2: number }) => void;
};

const val = (x: unknown): string => {
  if (x == null) return "";
  if (typeof x === "object" && "value" in (x as object)) return val((x as { value: unknown }).value);
  if (typeof x === "number") return Number.isInteger(x) ? String(x) : x.toFixed(3);
  return String(x);
};

// Procedural demo model. Swap for That Open Engine / IFC.js loader later.
export function BimViewer({ selectedId, onSelect, file, onInspect, onModelLoaded }: Props) {
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
  const selectRef = useRef<(id: string | null) => void>(() => {});
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

      const highlight = (id: string | null) => {
        meshes.forEach((m) => {
          const mat = m.material as InstanceType<typeof THREE.MeshStandardMaterial>;
          const on = m.userData['id'] === id;
          mat.color.setHex(on ? 0x00b3ff : m.userData['base']);
          mat.emissive.setHex(on ? 0x003a55 : 0x000000);
        });
      };
      selectRef.current = highlight;

      const demoGroup = [...meshes];
      let ifcGroup: InstanceType<typeof THREE.Group> | null = null;
      const showEmpty = () => {
        demoGroup.forEach((m) => (m.visible = false));
        if (ifcGroup) {
          scene.remove(ifcGroup);
          ifcGroup = null;
        }
        meshes.length = 0;
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
          camera.near = size / 1000; camera.far = size * 20; camera.updateProjectionMatrix();
          camera.position.copy(center).add(new THREE.Vector3(size * 0.6, size * 0.45, size * 0.6));
          grid.position.y = box.min.y;
          const wallIds = api.GetLineIDsWithType(modelID, WebIFC.IFCWALL);
          const measured = measureBuildingAreaM2(api, modelID, WebIFC.IFCQUANTITYAREA);
          const buildingAreaM2 = measured ?? footprintAreaM2(box);
          setStatus(null);
          onModelLoadedRef.current?.({
            elementCount: elementIds.size,
            ifcWallCount: wallIds.size(),
            buildingAreaM2,
          });
          onSelectRef.current(String(newMeshes[0]!.userData['id']));
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
        if (hit) onSelectRef.current(hit.object.userData['id']);
      };
      renderer.domElement.addEventListener("pointerdown", pd);
      renderer.domElement.addEventListener("pointerup", pu);
      const ro = new ResizeObserver(() => fitCanvas());
      ro.observe(el);
      let raf = 0;
      const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
      loop();
      highlight(selectedId);
      cleanup = () => {
        cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose();
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

  useEffect(() => { selectRef.current(selectedId); inspectRef.current(selectedId); }, [selectedId]);
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
}
