import { useEffect, useRef } from "react";

export type BimElement = { id: string; type: string };

type Props = { selectedId: string | null; onSelect: (id: string) => void };

// Procedural demo model. Swap for That Open Engine / IFC.js loader later.
export function BimViewer({ selectedId, onSelect }: Props) {
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
      const w = el.clientWidth, h = el.clientHeight;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1120);
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
      camera.position.set(22, 18, 24);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(w, h);
      el.appendChild(renderer.domElement);
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
      const ro = new ResizeObserver(() => {
        const W = el.clientWidth, H = el.clientHeight;
        camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
      });
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
    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { selectRef.current(selectedId); }, [selectedId]);

  return <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />;
}
