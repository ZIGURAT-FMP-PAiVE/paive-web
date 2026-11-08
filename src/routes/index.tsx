import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { Upload, FileBox, FileSpreadsheet, CheckCircle2, Box, Download, Save, Check, RotateCcw, X, Layers } from "lucide-react";
import { BimViewer } from "@/components/BimViewer";
import { cn } from "@/lib/utils";
import { initialProjects, type Project } from "@/lib/projects";
import { ProjectConfigPanel } from "@/components/ProjectConfigPanel";
import { PanelLeftClose, PanelLeftOpen, Plus, Settings2, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PAiVE — Project AI Value Engineering Dashboard" },
      { name: "description", content: "Upload IFC models, analyse design changes and compare value engineering options." },
      { property: "og:title", content: "PAiVE — Project AI Value Engineering" },
      { property: "og:description", content: "BIM change analysis and AI value engineering in one workflow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type El = { id: string; type: string; cost: number; guid: string; code: string; current: number; status: string };
const ELEMENTS: El[] = [
  { id: "W-101", type: "IfcWall", cost: 5200, guid: "2O2Fr$t4X7Zf8NOew3FLOH", code: "C-21.10.01", current: 48600, status: "Modified" },
  { id: "D-11", type: "IfcDoor", cost: 1000, guid: "1hT9qkP2v0aB6xWzR8LmN3", code: "C-23.20.04", current: 2400, status: "Relocated" },
  { id: "WIN-07", type: "IfcWindow", cost: 800, guid: "3kLp0Qw7Ys2Df5GhJ9ZxC1", code: "C-23.30.02", current: 1850, status: "Relocated" },
  { id: "SLAB-01", type: "IfcSlab", cost: 3400, guid: "0vB4nM8cX1zA7sD2fG6hJ5", code: "C-22.10.01", current: 96200, status: "Extended" },
];

const OPTIONS = [
  { key: "A", name: "Lowest Cost", cost: "+ €27,000", sched: "+5 Days", risk: "Low", carbon: "+4.2 tCO₂e", tone: "success" },
  { key: "B", name: "Balanced Option", cost: "+ €35,000", sched: "+2 Days", risk: "Low", carbon: "+3.1 tCO₂e", tone: "primary", rec: true },
  { key: "C", name: "Schedule Optimized", cost: "+ €61,000", sched: "0 Days", risk: "Medium", carbon: "+5.8 tCO₂e", tone: "warning" },
] as const;

const toneBorder = { success: "border-success", primary: "border-primary", warning: "border-warning" };
const toneText = { success: "text-success", primary: "text-primary", warning: "text-warning" };

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("glass p-8", className)}>{children}</div>;
}
function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[24px] font-semibold">{children}</h2>
      {sub && <p className="mt-1 text-lg text-muted-foreground">{sub}</p>}
    </div>
  );
}
function Badge({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "success" | "warning" | "muted" }) {
  const map = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    muted: "bg-muted text-muted-foreground",
  };
  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-base font-medium", map[tone])}>{children}</span>;
}

function Workflow({ project }: { project: Project }) {
  const [ifc, setIfc] = useState<{ name: string; size: string } | null>({ name: project.ifc, size: "184.2 MB" });
  const [cost, setCost] = useState<string | null>(project.config.costSource || null);
  const [drag, setDrag] = useState(false);
  const [sel, setSel] = useState<string | null>("W-101");
  const [opt, setOpt] = useState<string>("B");
  const [decision, setDecision] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const ifcInput = useRef<HTMLInputElement>(null);
  const costInput = useRef<HTMLInputElement>(null);

  const selected = ELEMENTS.find((e) => e.id === sel);
  const handleIfc = (f?: File) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".ifc")) { toast.error("Please select an .ifc file"); return; }
    setIfc({ name: f.name, size: `${(f.size / 1e6).toFixed(1)} MB` });
    toast.success(`IFC model "${f.name}" uploaded`);
  };

  return (
    <div>
      <main className="space-y-14 pb-20">
        <div>
          <h1 className="text-[36px] font-bold tracking-tight">{project.config.name} — Change Workflow</h1>
          <p className="mt-2 text-lg text-muted-foreground">Upload, analyse, compare and approve design changes in one place.</p>
        </div>

        {/* Section 1 */}
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <SectionTitle sub="Upload a new IFC version and associated cost data.">1. Upload IFC Model</SectionTitle>
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleIfc(e.dataTransfer.files[0]); }}
              className={cn("flex flex-col items-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors", drag ? "border-primary bg-primary/10" : "border-border bg-background/40")}
            >
              <Upload className="h-12 w-12 text-primary" />
              <p className="mt-4 text-xl font-medium">Drag & drop your IFC file here</p>
              <p className="text-base text-muted-foreground">IFC 2x3 / IFC4 · up to 500 MB</p>
              <button onClick={() => ifcInput.current?.click()} className="mt-5 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90">Select IFC File</button>
              <input ref={ifcInput} type="file" accept=".ifc" hidden onChange={(e) => handleIfc(e.target.files?.[0])} />
            </div>
            {ifc && (
              <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-center gap-3"><FileBox className="h-6 w-6 text-primary" /><span>{ifc.name}</span><span className="text-base text-muted-foreground">{ifc.size}</span></div>
                <Badge tone="success"><CheckCircle2 className="mr-1 h-4 w-4" />Parsed</Badge>
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button onClick={() => costInput.current?.click()} className="flex items-center gap-2 rounded-xl border border-secondary px-5 py-3 font-medium text-foreground hover:bg-secondary/15">
                <FileSpreadsheet className="h-5 w-5 text-secondary" /> Upload Cost File
              </button>
              <input ref={costInput} type="file" accept=".xlsx,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCost(f.name); toast.success(`Cost data "${f.name}" uploaded`); } }} />
              <span className="text-base text-muted-foreground">{cost ? `Loaded: ${cost}` : "Supports .xlsx, .csv"}</span>
            </div>
          </Card>
          <Card>
            <SectionTitle>Project Summary</SectionTitle>
            <dl className="space-y-5">
              {[["Stage", project.config.stage], ["Model Version", "v03 · 08 Nov 2026"], ["Number of Elements", "12,486"], ["Building Area", "18,450 m²"], ["Cost Dataset", cost ?? "—"], ["Total Budget", "€ 42.8 M"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border pb-4 last:border-0">
                  <dt className="text-muted-foreground">{k}</dt><dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="mb-6 text-[24px] font-semibold">2. Change Analysis</h2>
          <div className="grid gap-6 lg:grid-cols-[5fr_7fr]">
            <div className="space-y-6">
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <SectionTitle>Change Requirement</SectionTitle>
                  <Badge tone="warning"><span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-warning" />Analyzing</Badge>
                </div>
                <p className="text-xl font-medium">Move external wall by 2 meters</p>
                <div className="mt-4 flex flex-wrap gap-3 text-muted-foreground">
                  <span>Submitted by: <span className="text-foreground">Client</span></span>
                  <span>·</span><span>CR-0142</span><span>·</span><Badge tone="primary">High Priority</Badge>
                </div>
              </Card>
              <Card>
                <SectionTitle sub="Click a row to locate it in the model.">Affected Elements</SectionTitle>
                <table className="w-full text-left">
                  <thead className="text-base text-muted-foreground">
                    <tr className="border-b border-border"><th className="pb-3 font-medium">Element</th><th className="pb-3 font-medium">Type</th><th className="pb-3 text-right font-medium">Cost Impact</th></tr>
                  </thead>
                  <tbody>
                    {ELEMENTS.map((e) => (
                      <tr key={e.id} onClick={() => setSel(e.id)} className={cn("cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-accent", sel === e.id && "bg-primary/10")}>
                        <td className={cn("py-4 pl-2 font-medium", sel === e.id && "text-primary")}>{e.id.startsWith("W-") ? "Wall" : e.id.startsWith("D-") ? "Door" : e.id.startsWith("WIN") ? "Window" : "Slab"} {e.id}</td>
                        <td className="py-4 font-mono text-muted-foreground">{e.type}</td>
                        <td className="py-4 pr-2 text-right font-semibold text-warning">+ €{e.cost.toLocaleString("en-US")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex justify-between border-t border-border pt-4 font-semibold"><span>Total</span><span className="text-warning">+ €10,400</span></div>
              </Card>
            </div>
            <div className="space-y-6">
              <div className="glass overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3"><Box className="h-6 w-6 text-primary" /><h3 className="text-[24px] font-semibold">BIM Model Viewer</h3></div>
                  <Badge tone="muted">Ready for That Open Engine / IFC.js</Badge>
                </div>
                <div className="relative h-[700px]">
                  <BimViewer selectedId={sel} onSelect={setSel} />
                  <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-background/80 px-3 py-2 text-base text-muted-foreground">Drag to orbit · Scroll to zoom · Click to select</div>
                </div>
              </div>
              <Card>
                <SectionTitle>Element Properties</SectionTitle>
                {selected ? (
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {[["GUID", selected.guid], ["Element Type", selected.type], ["Cost Code", selected.code], ["Current Cost", `€${selected.current.toLocaleString("en-US")}`]].map(([k, v]) => (
                      <div key={k}><dt className="text-base text-muted-foreground">{k}</dt><dd className="break-all font-medium">{v}</dd></div>
                    ))}
                    <div><dt className="text-base text-muted-foreground">Status</dt><dd className="mt-1"><Badge tone="warning">{selected.status}</Badge></dd></div>
                    <div><dt className="text-base text-muted-foreground">Element</dt><dd className="font-medium text-primary">{selected.id}</dd></div>
                  </dl>
                ) : (
                  <p className="text-muted-foreground">Selected: <span className="text-primary">{sel ?? "none"}</span> — not affected by this change.</p>
                )}
              </Card>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <SectionTitle sub="AI-generated alternatives for change request CR-0142.">3. Value Engineering Analysis</SectionTitle>
          <div className="grid gap-6 md:grid-cols-3">
            {OPTIONS.map((o) => (
              <button key={o.key} onClick={() => setOpt(o.key)} className={cn("glass relative border-2 p-8 text-left transition-transform hover:-translate-y-1", toneBorder[o.tone], opt === o.key ? "ring-4 ring-primary/30" : "opacity-80")}>
                {"rec" in o && <span className="absolute -top-4 right-6 rounded-full bg-primary px-4 py-1 text-base font-semibold text-primary-foreground">Recommended</span>}
                <div className="flex items-center justify-between">
                  <span className={cn("text-lg font-semibold", toneText[o.tone])}>Option {o.key}</span>
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2", toneBorder[o.tone], opt === o.key && "bg-primary")}>{opt === o.key && <Check className="h-4 w-4 text-primary-foreground" />}</span>
                </div>
                <h3 className="mt-2 text-[24px] font-semibold">{o.name}</h3>
                <p className="mt-4 text-[32px] font-bold">{o.cost}</p>
                <ul className="mt-5 space-y-3">
                  <li className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span>{o.sched}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Risk</span><Badge tone={o.risk === "Low" ? "success" : "warning"}>{o.risk}</Badge></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Compliance</span><Badge tone="success">Pass</Badge></li>
                </ul>
              </button>
            ))}
          </div>
          <Card className="mt-6">
            <SectionTitle>Comparison Matrix</SectionTitle>
            <table className="w-full text-left">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="pb-3 font-medium">Criteria</th>{OPTIONS.map((o) => <th key={o.key} className={cn("pb-3 font-semibold", opt === o.key ? "text-primary" : toneText[o.tone])}>Option {o.key}</th>)}</tr></thead>
              <tbody>
                {([["Cost", "cost"], ["Schedule", "sched"], ["Risk", "risk"], ["Compliance", null], ["Carbon Impact", "carbon"]] as const).map(([label, k]) => (
                  <tr key={label} className="border-b border-border last:border-0">
                    <td className="py-4 text-muted-foreground">{label}</td>
                    {OPTIONS.map((o) => <td key={o.key} className={cn("py-4 font-medium", opt === o.key && "bg-primary/10")}>{k ? o[k] : "Pass"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        {/* Section 4 */}
        <section>
          <SectionTitle>4. Decision & Approval</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-[24px] font-semibold">Decision</h3>
                <span className="text-muted-foreground">Selected: <span className="font-semibold text-primary">Option {opt}</span>{decision && <> · <Badge tone={decision === "Approved" ? "success" : "warning"}>{decision}</Badge></>}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => { setDecision("Approved"); toast.success(`Option ${opt} approved`); }} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"><Check className="h-5 w-5" />Approve</button>
                <button onClick={() => { setDecision("Revision Requested"); toast.info("Revision requested from design team"); }} className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-medium hover:bg-accent"><RotateCcw className="h-5 w-5" />Request Revision</button>
                <button onClick={() => { setDecision("Rejected"); toast.error("Change request rejected"); }} className="flex items-center gap-2 rounded-xl border border-destructive px-6 py-3 font-medium text-destructive hover:bg-destructive/10"><X className="h-5 w-5" />Reject</button>
              </div>
              <label className="mt-6 block text-base text-muted-foreground" htmlFor="rat">Decision Rationale</label>
              <textarea id="rat" value={rationale} onChange={(e) => setRationale(e.target.value)} rows={5} placeholder="Provide decision rationale..." className="mt-2 w-full rounded-xl border border-input bg-background/50 p-4 text-lg outline-none placeholder:text-muted-foreground focus:border-primary" />
            </Card>
            <Card>
              <h3 className="mb-6 text-[24px] font-semibold">Version History</h3>
              <ol className="relative space-y-7 border-l-2 border-border pl-8">
                {[["Version 01", "Initial Upload", "12 Oct 2026", false], ["Version 02", "Wall Modification", "28 Oct 2026", false], ["Version 03", "Value Engineering Review", "08 Nov 2026", true]].map(([v, t, d, cur]) => (
                  <li key={v as string} className="relative">
                    <span className={cn("absolute -left-[42px] top-1 h-5 w-5 rounded-full border-4 border-background", cur ? "bg-primary" : "bg-muted-foreground")} />
                    <div className="font-semibold">{v} · {t}</div>
                    <div className="text-base text-muted-foreground">{d}{cur && " · Current"}</div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button onClick={() => toast.success("PDF report generated", { description: "PAiVE_CR-0142_report.pdf" })} className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-medium hover:border-primary"><Download className="h-5 w-5" />Export PDF Report</button>
            <button onClick={() => {
              const csv = "Criteria,Option A,Option B,Option C\n" + [["Cost", "cost"], ["Schedule", "sched"], ["Risk", "risk"], ["Carbon", "carbon"]].map(([l, k]) => [l, ...OPTIONS.map((o) => o[k as "cost"])].join(",")).join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "paive_comparison.csv"; a.click();
              toast.success("CSV exported");
            }} className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-medium hover:border-primary"><FileSpreadsheet className="h-5 w-5" />Export CSV</button>
            <button onClick={() => decision ? toast.success("Decision saved", { description: `${decision} · Option ${opt}` }) : toast.warning("Choose Approve, Request Revision or Reject first")} className="flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 font-semibold text-secondary-foreground hover:opacity-90"><Save className="h-5 w-5" />Save Decision</button>
          </div>
        </section>
      </main>
    </div>
  );
}

const statusTone = { "On track": "success", Analyzing: "warning", Draft: "muted" } as const;

function Index() {
  const [projects, setProjects] = useState<Project[]>(() => initialProjects());
  const [activeId, setActiveId] = useState("verona");
  const [view, setView] = useState<"workflow" | "config">("workflow");
  const [open, setOpen] = useState(true);
  const active = (projects.find((p) => p.id === activeId) ?? projects[0])!;

  const addProject = () => {
    const n = projects.length + 1;
    const p: Project = { id: `p${Date.now()}`, code: `P${n}`, status: "Draft", ifc: "new_model.ifc",
      config: { ...initialProjects()[2].config, name: `New Project ${n}`, costSource: "" } };
    setProjects((ps) => [...ps, p]); setActiveId(p.id); setView("config");
    toast.success("Project created — complete its configuration");
  };

  return (
    <div className="min-h-screen bg-background text-lg">
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { fontSize: 16 } }} />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setOpen(!open)} aria-label="Toggle projects panel" className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
              {open ? <PanelLeftClose className="h-6 w-6" /> : <PanelLeftOpen className="h-6 w-6" />}
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
              <Layers className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">PA<span className="text-primary">i</span>VE</div>
              <div className="text-base text-muted-foreground">Project AI Value Engineering</div>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {([["workflow", "Workflow", LayoutDashboard], ["config", "Configuration", Settings2]] as const).map(([k, l, I]) => (
              <button key={k} onClick={() => setView(k)} className={cn("flex items-center gap-2 rounded-lg px-4 py-2", view === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><I className="h-5 w-5" />{l}</button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-lg">
              <span className="h-2 w-2 rounded-full bg-success" /> {active.config.name}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground">VV</div>
          </div>
        </div>
      </header>

      <div className="flex pt-20">
        <aside className={cn("sticky top-20 h-[calc(100vh-5rem)] shrink-0 overflow-y-auto border-r border-border bg-card/40 transition-all", open ? "w-80 p-5" : "w-20 p-3")}>
          {open && <div className="mb-4 px-1 text-base font-bold tracking-widest text-muted-foreground">PROJECTS</div>}
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button onClick={() => setActiveId(p.id)} title={p.config.name}
                  className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors", p.id === active.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent")}>
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-bold", p.id === active.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>{p.code}</span>
                  {open && (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.config.name}</span>
                      <span className="block truncate text-base text-muted-foreground">{p.config.stage}</span>
                      <span className="mt-1 block"><Badge tone={statusTone[p.status]}>{p.status}</Badge></span>
                    </span>
                  )}
                </button>
              </li>
            ))}
            <li>
              <button onClick={addProject} title="New Project" className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border p-3 text-muted-foreground hover:border-primary hover:text-primary">
                <span className="flex h-11 w-11 items-center justify-center"><Plus className="h-6 w-6" /></span>{open && "New Project"}
              </button>
            </li>
          </ul>
        </aside>
        <main className="min-w-0 flex-1 px-8 pt-10">
          <div className="mx-auto max-w-[1400px]">
            {view === "workflow" ? (
              <Workflow key={active.id} project={active} />
            ) : (
              <div className="pb-20">
                <ProjectConfigPanel key={active.id} config={active.config}
                  onSave={(c) => setProjects((ps) => ps.map((p) => (p.id === active.id ? { ...p, config: c } : p)))} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
