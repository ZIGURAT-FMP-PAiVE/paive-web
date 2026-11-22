import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { Upload, FileBox, FileSpreadsheet, CheckCircle2, Box, Download, Save, Check, RotateCcw, X, Layers } from "lucide-react";
import { BimViewer, type IfcInfo } from "@/components/BimViewer";
import { findCost, type CostRow } from "@/lib/costFile";
import { cn } from "@/lib/utils";
import {
  activeIfcVersion,
  appendIfcVersion,
  clearProjectIfcVersions,
  defaultProjectConfig,
  ifcVersionLabel,
  resetProjectToDefaults,
  PROJECT_STATUSES,
  setIfcVersionModelStats,
  type Project,
  type ProjectCostData,
  type ProjectStatus,
} from "@/lib/projects";
import { applyProjectCostFile, loadProjectCostFile } from "@/lib/projectCost";
import {
  deleteAllProjectFiles,
  deleteProjectIfcFiles,
  loadWorkspace,
  projectBaselinesFromProjects,
  saveWorkspace,
  seedProjects,
  type ProjectBaseline,
} from "@/lib/projectStorage";
import { ProjectConfigPanel } from "@/components/ProjectConfigPanel";
import { PanelLeftClose, PanelLeftOpen, Plus, Settings2, LayoutDashboard } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TruncatedText } from "@/components/TruncatedText";
import {
  D1BlockedPanel,
  D1ResultPanel,
  D2OptionsPanel,
  DecisionNotice,
  PaiveLogTable,
  PaiveWallsTable,
  VeReportBlock,
} from "@/components/paive/PaiveRunUI";
import { decide, getLog, getRun, paiveRun } from "@/lib/paive/fakeBackend";
import type { DecideResult, PaiveRun } from "@/lib/paive/types";

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
      <h2 className="text-[18px] font-semibold">{children}</h2>
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

function ElementPropertiesCard({
  ifcFile,
  info,
  costRows,
  formatEur,
}: {
  ifcFile: File | null;
  info: IfcInfo | null;
  costRows: CostRow[];
  formatEur: (n: number) => string;
}) {
  const Grid = ({ rows }: { rows: [string, string][] }) => (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
      {rows.map(([k, v], i) => (
        <div key={k + i}>
          <dt className="text-sm text-muted-foreground">{k}</dt>
          <dd className="break-all font-medium">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );

  const cost = findCost(costRows, [info?.tag, info?.guid, info?.name, info?.expressId]);

  return (
    <Card>
      <SectionTitle>Element Properties</SectionTitle>
      {!ifcFile ? null : !info ? (
        <p className="text-muted-foreground">Click an element in the model to see its properties.</p>
      ) : (
        <div className="max-h-[520px] space-y-5 overflow-y-auto pr-2">
          <div>
            <h4 className="mb-3 font-semibold text-primary">Identification</h4>
            <Grid
              rows={[
                ["Name", info.name || "—"],
                ["IFC Class", info.ifcClass],
                ["GUID", info.guid],
                ["Express ID", info.expressId],
                ["Object Type", info.objectType || "—"],
                ["Tag", info.tag || "—"],
              ]}
            />
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="mb-3 font-semibold text-primary">Cost Data</h4>
            {cost ? (
              <Grid
                rows={[
                  ["Description", cost.description],
                  ["Cost Code", cost.code],
                  ["Quantity", cost.quantity != null ? `${cost.quantity} ${cost.unit}` : ""],
                  ["Unit Rate", cost.rate != null ? formatEur(cost.rate) : ""],
                  ["Total Cost", formatEur(cost.total)],
                ]}
              />
            ) : (
              <p className="text-muted-foreground">
                {costRows.length
                  ? "No matching row in the cost file (matched by Element ID, Tag, GUID or Name)."
                  : "Upload a cost file to link costs."}
              </p>
            )}
          </div>
          {info.groups.map((g, i) => (
            <details key={g.name + i} className="border-t border-border pt-4" open={i < 2}>
              <summary className="mb-3 cursor-pointer font-semibold">
                {g.name} <span className="text-sm text-muted-foreground">({g.props.length})</span>
              </summary>
              <Grid rows={g.props} />
            </details>
          ))}
          {!info.groups.length && (
            <p className="border-t border-border pt-4 text-muted-foreground">No property sets on this element.</p>
          )}
        </div>
      )}
    </Card>
  );
}

function Workflow({
  project,
  onStoreIfc,
  onStoreCost,
  onClearIfcVersions,
  onIfcModelStats,
}: {
  project: Project;
  onStoreIfc: (file: File) => void;
  onStoreCost: (file: File, rows: CostRow[]) => void;
  onClearIfcVersions: () => void;
  onIfcModelStats: (version: number, stats: { elementCount: number; ifcWallCount: number; buildingAreaM2: number }) => void;
}) {
  const currentIfc = activeIfcVersion(project);
  const ifcFile = currentIfc?.file ?? null;
  const costRows = project.costData?.rows ?? [];
  const costDataset = project.costData?.name ?? (project.config.costSource || null);
  const [drag, setDrag] = useState(false);
  const [info, setInfo] = useState<IfcInfo | null>(null);
  const eur = (n: number) => `€${Math.round(n).toLocaleString("en-US")}`;
  const handleCost = async (f?: File) => {
    if (!f) return;
    const loaded = await loadProjectCostFile(f);
    if (!loaded) return;
    onStoreCost(loaded.file, loaded.rows);
  };
  const [sel, setSel] = useState<string | null>(null);
  const [opt, setOpt] = useState<string>("B");
  const [decision, setDecision] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [fixtureRun, setFixtureRun] = useState<PaiveRun | null>(null);
  const [wallGuid, setWallGuid] = useState<string | null>(null);
  const [selectedAssembly, setSelectedAssembly] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState("Valentina");
  const [decisionReason, setDecisionReason] = useState("");
  const [decideResult, setDecideResult] = useState<DecideResult | null>(null);
  const [paiveLog, setPaiveLog] = useState(() => getLog());
  const [ifcElementCount, setIfcElementCount] = useState<number | null>(currentIfc?.elementCount ?? null);
  const ifcInput = useRef<HTMLInputElement>(null);
  const costInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIfcElementCount(currentIfc?.elementCount ?? null);
    setInfo(null);
  }, [project.id, project.activeIfcVersion, currentIfc?.elementCount, ifcFile?.name]);

  useEffect(() => {
    if (!ifcFile) {
      setFixtureRun(null);
      setWallGuid(null);
      setSelectedAssembly(null);
      setDecideResult(null);
      return;
    }
    const runId = paiveRun(ifcFile.name);
    const run = getRun(runId);
    setFixtureRun(run);
    setDecideResult(null);
    setDecisionReason("");
    const firstWall = run.walls?.[0]?.guid ?? null;
    setWallGuid(firstWall);
    setSel(firstWall);
    const firstOpt = run.d2?.options?.[0]?.assembly_id ?? null;
    setSelectedAssembly(firstOpt);
  }, [ifcFile?.name, project.activeIfcVersion]);

  const useFixtureUi = Boolean(fixtureRun && ifcFile);
  const viewerSelection = useFixtureUi && wallGuid ? wallGuid : sel;

  const submitPaiveDecision = (kind: "accept" | "reject") => {
    if (!fixtureRun) return;
    const res = decide(fixtureRun.run_id, kind, reviewer, decisionReason, selectedAssembly);
    setDecideResult(res);
    if ("error" in res) {
      toast.error(res.error.message);
      return;
    }
    setPaiveLog(getLog());
    toast.success(kind === "accept" ? "Option accepted" : "Option rejected");
    if (kind === "reject" && res.result.next_option) {
      setSelectedAssembly(res.result.next_option.assembly_id);
    }
  };

  const elementCountLabel = (() => {
    if (currentIfc?.elementCount != null) return currentIfc.elementCount.toLocaleString("en-US");
    if (ifcElementCount != null) return ifcElementCount.toLocaleString("en-US");
    if (ifcFile) return "Loading…";
    return "—";
  })();

  const costItemsLabel = (() => {
    if (currentIfc?.ifcWallCount != null) return currentIfc.ifcWallCount.toLocaleString("en-US");
    if (ifcFile) return "Loading…";
    return "—";
  })();

  const buildingAreaLabel = (() => {
    if (currentIfc?.buildingAreaM2 != null) {
      return `${currentIfc.buildingAreaM2.toLocaleString("en-US", { maximumFractionDigits: 1 })} m²`;
    }
    if (ifcFile) return "Loading…";
    return "—";
  })();

  const handleIfc = (f?: File) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".ifc")) { toast.error("Please select an .ifc file"); return; }
    const version = (project.ifcVersions.at(-1)?.version ?? 0) + 1;
    onStoreIfc(f);
    toast.success(`IFC model stored as ${ifcVersionLabel(version)}`, { description: `${f.name} · previous versions stay on this project` });
  };

  return (
    <div>
      <main className="space-y-14 pb-20">
        <div>
          <h1 className="text-[27px] font-bold tracking-tight">{project.config.name} — Change Workflow</h1>
          <p className="mt-2 text-lg text-muted-foreground">Upload, analyse, compare and approve design changes in one place.</p>
        </div>

        {/* Section 1 */}
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <SectionTitle sub="Each upload is kept. The model already on the project is version 1; the next file is version 2.">
                1. Upload IFC Model
              </SectionTitle>
              {project.ifcVersions.length > 0 && (
                <button
                  type="button"
                  onClick={onClearIfcVersions}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-2 text-base font-medium text-muted-foreground hover:border-warning hover:text-warning"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear IFC versions
                </button>
              )}
            </div>
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
              <input ref={ifcInput} type="file" accept=".ifc" hidden onChange={(e) => { handleIfc(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            {project.ifcVersions.length > 0 && (
              <ul className="mt-5 space-y-3">
                {project.ifcVersions.map((v) => {
                  const current = v.version === project.activeIfcVersion;
                  return (
                    <li key={v.version} className={cn("flex items-center justify-between rounded-xl border p-4", current ? "border-primary bg-primary/10" : "border-border bg-background/40")}>
                      <div className="flex min-w-0 items-center gap-3">
                        <FileBox className="h-6 w-6 shrink-0 text-primary" />
                        <span className="font-semibold">{ifcVersionLabel(v.version)}</span>
                        <span className="truncate">{v.name}</span>
                        <span className="shrink-0 text-base text-muted-foreground">{v.file ? v.sizeLabel : v.uploadedAt}</span>
                      </div>
                      {current ? <Badge tone="success"><CheckCircle2 className="mr-1 h-4 w-4" />Current</Badge> : <Badge tone="muted">Stored</Badge>}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button onClick={() => costInput.current?.click()} className="flex items-center gap-2 rounded-xl border border-secondary px-5 py-3 font-medium text-foreground hover:bg-secondary/15">
                <FileSpreadsheet className="h-5 w-5 text-secondary" /> Upload Cost File
              </button>
              <input ref={costInput} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { void handleCost(e.target.files?.[0]); e.target.value = ""; }} />
              {project.costData ? (
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-base text-muted-foreground">
                  <span className="shrink-0">Loaded:</span>
                  <TruncatedText
                    text={project.costData.name}
                    maxWidthClass="max-w-[min(100%,16rem)]"
                    className="font-semibold text-foreground"
                  />
                  <span className="shrink-0">· {costRows.length} items</span>
                </span>
              ) : (
                <span className="text-base text-muted-foreground">Supports .xlsx, .xls, .csv</span>
              )}
            </div>
          </Card>
          <Card>
            <SectionTitle>Project Summary</SectionTitle>
            <dl className="space-y-5">
              {[
                ["Stage", project.config.stage],
                ["Model Version", currentIfc ? `${ifcVersionLabel(currentIfc.version)} · ${currentIfc.uploadedAt}` : "—"],
                ["Number of Elements", elementCountLabel],
                ["Building Area", buildingAreaLabel],
                [
                  "Cost Dataset",
                  costDataset ? (
                    <TruncatedText
                      text={costDataset}
                      maxWidthClass="max-w-[min(100%,14rem)]"
                      className="ml-auto font-semibold text-foreground"
                    />
                  ) : (
                    "—"
                  ),
                ],
                ["Cost Items", costItemsLabel],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0">
                  <dt className="shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="mb-6 text-[18px] font-semibold">2. Change Analysis</h2>
          <div className="grid gap-6 lg:grid-cols-[5fr_7fr]">
            <div className="space-y-6">
              <Card>
                {fixtureRun?.status === "blocked" && fixtureRun.blocked ? (
                  <D1BlockedPanel run={fixtureRun} />
                ) : fixtureRun?.d1 ? (
                  <D1ResultPanel run={fixtureRun} />
                ) : null}
              </Card>
              <Card>
                <SectionTitle sub="Red = failed target · amber = changed · green = OK · grey = unmapped.">
                  Affected Elements
                </SectionTitle>
                <PaiveWallsTable
                  walls={fixtureRun?.walls ?? []}
                  selectedGuid={wallGuid}
                  onSelect={(g) => {
                    setWallGuid(g);
                    setSel(g);
                  }}
                />
              </Card>
            </div>
            <div className="space-y-6">
              <div className="glass overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Box className="h-6 w-6 text-primary" />
                    <h3 className="text-[18px] font-semibold">BIM Model Viewer</h3>
                  </div>
                  <Badge tone="muted">{ifcFile ? ifcFile.name : "No model"}</Badge>
                </div>
                <div className="relative h-[700px]">
                  <BimViewer
                    key={`${project.id}-${project.activeIfcVersion}-${ifcFile?.name ?? "no-ifc"}`}
                    selectedId={viewerSelection}
                    onSelect={(id) => {
                      setSel(id);
                      setWallGuid(id);
                    }}
                    file={ifcFile}
                    onInspect={setInfo}
                    onModelLoaded={(stats) => {
                      setIfcElementCount(stats.elementCount);
                      if (ifcFile) onIfcModelStats(project.activeIfcVersion, stats);
                    }}
                  />
                  <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-background/80 px-3 py-2 text-base text-muted-foreground">
                    Drag to orbit · Scroll to zoom · Click to select
                  </div>
                </div>
              </div>
              <ElementPropertiesCard ifcFile={ifcFile} info={info} costRows={costRows} formatEur={eur} />
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          {useFixtureUi && fixtureRun && fixtureRun.status !== "blocked" ? (
            <>
              <SectionTitle sub="Ranked assemblies from D2 (fixture data).">
                3. Options and decision
              </SectionTitle>
              {fixtureRun.d2?.options?.length ? (
                <D2OptionsPanel
                  run={fixtureRun}
                  selectedId={selectedAssembly}
                  onSelect={setSelectedAssembly}
                />
              ) : (
                <Card>
                  <p className="text-base text-muted-foreground">
                    {fixtureRun.d2?.note ?? "No alternatives required for this run."}
                  </p>
                </Card>
              )}
              <Card className="mt-6">
                <SectionTitle sub="Reason is required. Calls decide() on the fixture back end.">
                  Human gate (VE5)
                </SectionTitle>
                <label className="block text-base text-muted-foreground" htmlFor="paive-reviewer">
                  Reviewer
                </label>
                <input
                  id="paive-reviewer"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  className="mt-2 w-full max-w-md rounded-xl border border-input bg-background/50 px-4 py-3 text-lg outline-none focus:border-primary"
                />
                <label className="mt-4 block text-base text-muted-foreground" htmlFor="paive-reason">
                  Reason
                </label>
                <textarea
                  id="paive-reason"
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  rows={4}
                  placeholder="Why accept or reject this option?"
                  className="mt-2 w-full rounded-xl border border-input bg-background/50 p-4 text-lg outline-none placeholder:text-muted-foreground focus:border-primary"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!decisionReason.trim() || !fixtureRun.d2?.options?.length}
                    onClick={() => submitPaiveDecision("accept")}
                    className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="h-5 w-5" />
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={!decisionReason.trim() || !fixtureRun.d2?.options?.length}
                    onClick={() => submitPaiveDecision("reject")}
                    className="flex items-center gap-2 rounded-xl border border-destructive px-6 py-3 font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                    Reject
                  </button>
                </div>
                <p className="mt-3 text-base text-muted-foreground">No changes are made to the BIM model.</p>
                <DecisionNotice result={decideResult} />
              </Card>
            </>
          ) : (
            <>
          <SectionTitle sub="AI-generated alternatives for the detected model changes.">
            3. Value Engineering Analysis
          </SectionTitle>
          <div className="grid gap-6 md:grid-cols-3">
            {OPTIONS.map((o) => (
              <button key={o.key} onClick={() => setOpt(o.key)} className={cn("glass relative border-2 p-8 text-left transition-transform hover:-translate-y-1", toneBorder[o.tone], opt === o.key ? "ring-4 ring-primary/30" : "opacity-80")}>
                {"rec" in o && <span className="absolute -top-4 right-6 rounded-full bg-primary px-4 py-1 text-base font-semibold text-primary-foreground">Recommended</span>}
                <div className="flex items-center justify-between">
                  <span className={cn("text-lg font-semibold", toneText[o.tone])}>Option {o.key}</span>
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2", toneBorder[o.tone], opt === o.key && "bg-primary")}>{opt === o.key && <Check className="h-4 w-4 text-primary-foreground" />}</span>
                </div>
                <h3 className="mt-2 text-[18px] font-semibold">{o.name}</h3>
                <p className="mt-4 text-[24px] font-bold">{o.cost}</p>
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
            </>
          )}
        </section>

        {/* Section 4 */}
        <section>
          {useFixtureUi && fixtureRun && fixtureRun.status !== "blocked" ? (
            <>
              <SectionTitle sub="VE6 draft and decision log from get_log().">
                4. Report and history
              </SectionTitle>
              <VeReportBlock run={fixtureRun} />
              <Card className="mt-6">
                <SectionTitle>Decision log</SectionTitle>
                <PaiveLogTable entries={paiveLog} />
              </Card>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled
                  title="PDF export will use the same JSON later"
                  className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-medium opacity-50"
                >
                  <Download className="h-5 w-5" />
                  Export PDF (coming soon)
                </button>
              </div>
            </>
          ) : (
            <>
          <SectionTitle>4. Decision & Approval</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-[18px] font-semibold">Decision</h3>
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
              <h3 className="mb-6 text-[18px] font-semibold">Version History</h3>
              <ol className="relative space-y-7 border-l-2 border-border pl-8">
                {project.ifcVersions.map((v) => {
                  const cur = v.version === project.activeIfcVersion;
                  return (
                    <li key={v.version} className="relative">
                      <span className={cn("absolute -left-[42px] top-1 h-5 w-5 rounded-full border-4 border-background", cur ? "bg-primary" : "bg-muted-foreground")} />
                      <div className="font-semibold">{ifcVersionLabel(v.version)} · {v.name}</div>
                      <div className="text-base text-muted-foreground">{v.uploadedAt}{v.file ? ` · ${v.sizeLabel}` : ""}{cur && " · Current"}</div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              onClick={() =>
                toast.success("PDF report generated", {
                  description: `PAiVE_${project.code}_${ifcVersionLabel(project.activeIfcVersion)}_report.pdf`,
                })
              }
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-medium hover:border-primary"
            >
              <Download className="h-5 w-5" />
              Export PDF Report
            </button>
            <button onClick={() => {
              const csv = "Criteria,Option A,Option B,Option C\n" + [["Cost", "cost"], ["Schedule", "sched"], ["Risk", "risk"], ["Carbon", "carbon"]].map(([l, k]) => [l, ...OPTIONS.map((o) => o[k as "cost"])].join(",")).join("\n");
              const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "paive_comparison.csv"; a.click();
              toast.success("CSV exported");
            }} className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 font-medium hover:border-primary"><FileSpreadsheet className="h-5 w-5" />Export CSV</button>
            <button onClick={() => decision ? toast.success("Decision saved", { description: `${decision} · Option ${opt}` }) : toast.warning("Choose Approve, Request Revision or Reject first")} className="flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 font-semibold text-secondary-foreground hover:opacity-90"><Save className="h-5 w-5" />Save Decision</button>
          </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

const statusTone = { "On track": "success", Analyzing: "warning", Draft: "muted" } as const;
const statusSelectClass: Record<ProjectStatus, string> = {
  "On track": "bg-success/15 text-success border-success/40",
  Analyzing: "bg-warning/15 text-warning border-warning/40",
  Draft: "bg-muted text-muted-foreground border-border",
};

function ProjectStatusSelect({ value, onChange }: { value: ProjectStatus; onChange: (status: ProjectStatus) => void }) {
  return (
    <select
      value={value}
      aria-label="Project status"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as ProjectStatus)}
      className={cn(
        "mt-1 max-w-full cursor-pointer rounded-full border px-3 py-1 text-base font-medium outline-none focus:ring-2 focus:ring-primary/50",
        statusSelectClass[value],
      )}
    >
      {PROJECT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

function projectBaseline(p: Project): ProjectBaseline {
  return {
    config: { ...p.config, targets: p.config.targets.map((t) => ({ ...t })) },
    costData: p.costData ? { ...p.costData, rows: [...p.costData.rows], file: null } : null,
  };
}

function Index() {
  const [projects, setProjects] = useState<Project[]>(() => seedProjects());
  const [projectBaselines, setProjectBaselines] = useState<Record<string, ProjectBaseline>>(() =>
    projectBaselinesFromProjects(seedProjects()),
  );
  const [activeId, setActiveId] = useState("verona");
  const [view, setView] = useState<"workflow" | "config">("workflow");
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const active = (projects.find((p) => p.id === activeId) ?? projects[0])!;
  const activeBaseline = projectBaselines[active.id] ?? projectBaseline(active);

  useEffect(() => {
    let cancelled = false;
    void loadWorkspace().then((ws) => {
      if (cancelled) return;
      if (ws) {
        setProjects(ws.projects);
        setProjectBaselines(ws.projectBaselines);
        setActiveId(ws.activeId);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      void saveWorkspace(projects, projectBaselines, activeId);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [projects, projectBaselines, activeId, hydrated]);

  const updateConfig = (config: Project["config"]) => {
    setProjects((ps) => ps.map((p) => (p.id === activeId ? { ...p, config } : p)));
  };

  const updateCostData = (costData: ProjectCostData | null) => {
    setProjects((ps) => ps.map((p) => (p.id === activeId ? { ...p, costData } : p)));
  };

  const updateProjectStatus = (id: string, status: ProjectStatus) => {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const storeCostOnProject = (file: File, rows: CostRow[]) => {
    setProjects((ps) => ps.map((p) => (p.id === activeId ? applyProjectCostFile(p, file, rows) : p)));
  };

  const uploadProjectCost = async (file: File) => {
    const loaded = await loadProjectCostFile(file);
    if (!loaded) return;
    storeCostOnProject(loaded.file, loaded.rows);
  };

  const addProject = () => {
    const n = projects.length + 1;
    const p: Project = {
      id: `p${Date.now()}`,
      code: `P${n}`,
      status: "Draft",
      ifc: "",
      ifcVersions: [],
      activeIfcVersion: 0,
      costData: null,
      config: defaultProjectConfig(`New Project ${n}`),
    };
    setProjects((ps) => [...ps, p]);
    setProjectBaselines((b) => ({ ...b, [p.id]: projectBaseline(p) }));
    setActiveId(p.id);
    setView("config");
    toast.success("Project created — complete its configuration");
  };

  const resetActiveProjectDefaults = async () => {
    const id = activeId;
    await deleteAllProjectFiles(id);
    setProjects((ps) => {
      const next = ps.map((p) => (p.id === id ? resetProjectToDefaults(p) : p));
      const fresh = next.find((p) => p.id === id)!;
      setProjectBaselines((b) => ({ ...b, [id]: projectBaseline(fresh) }));
      return next;
    });
    toast.success("Project reset", {
      description: "Configuration cleared, cost file removed, and IFC versions reset to zero",
    });
  };

  const clearActiveIfcVersions = async () => {
    const id = activeId;
    await deleteProjectIfcFiles(id);
    setProjects((ps) => ps.map((p) => (p.id === id ? clearProjectIfcVersions(p) : p)));
    toast.success("IFC versions cleared", { description: "Next upload will start again at version 01" });
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-lg text-muted-foreground">
        Loading projects…
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen bg-background text-lg">
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { fontSize: 12 } }} />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0 rounded-lg bg-white px-3 py-1.5 shadow-sm ring-1 ring-border/40">
              <img src="/paive-logo.png" alt="PAiVE" className="h-9 w-auto" width={120} height={36} />
            </div>
            <button onClick={() => setOpen(!open)} aria-label="Toggle projects panel" className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
              {open ? <PanelLeftClose className="h-6 w-6" /> : <PanelLeftOpen className="h-6 w-6" />}
            </button>
            <div className="hidden border-l border-border pl-4 text-[28px] leading-tight text-muted-foreground lg:block">
              Project AI Value Engineering
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
                      <ProjectStatusSelect value={p.status} onChange={(status) => updateProjectStatus(p.id, status)} />
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
            <div className={view === "workflow" ? undefined : "hidden"}>
              <Workflow
                key={active.id}
                project={active}
                onStoreIfc={(file) => setProjects((ps) => ps.map((p) => (p.id === active.id ? appendIfcVersion(p, file) : p)))}
                onStoreCost={storeCostOnProject}
                onClearIfcVersions={() => void clearActiveIfcVersions()}
                onIfcModelStats={(version, stats) =>
                  setProjects((ps) => ps.map((p) => (p.id === active.id ? setIfcVersionModelStats(p, version, stats) : p)))
                }
              />
            </div>
            <div className={cn("pb-20", view !== "config" && "hidden")}>
              <ProjectConfigPanel
                key={active.id}
                config={active.config}
                baseline={activeBaseline.config}
                costData={active.costData}
                baselineCostData={activeBaseline.costData}
                onChange={updateConfig}
                onCostUpload={uploadProjectCost}
                onCostDataChange={updateCostData}
                onSave={() => setProjectBaselines((b) => ({ ...b, [active.id]: projectBaseline(active) }))}
                onResetDefaults={() => void resetActiveProjectDefaults()}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
