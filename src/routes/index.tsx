import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Upload, FileBox, FileSpreadsheet, CheckCircle2, Download, Save, Check, RotateCcw, X, Layers } from "lucide-react";
import type { IfcInfo } from "@/components/BimViewer";
import { BimModelViewerPanel } from "@/components/BimModelViewerPanel";
import type { CostRow } from "@/lib/costFile";
import { cn } from "@/lib/utils";
import {
  ifcVersionDotClass,
  rankAccent,
  rankHeaderClass,
  rankOptionGlowClass,
  rankSelectedCellClass,
} from "@/lib/veSemantics";
import {
  activeIfcVersion,
  appendIfcVersion,
  uploadedIfcVersions,
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
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Plus, Settings2, LayoutDashboard, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  dataTableZebraClass,
} from "@/components/ui/table";
import { TruncatedText } from "@/components/TruncatedText";
import {
  D1BaselinePlaceholder,
  D1BlockedPanel,
  D1ResultPanel,
  D2BlankOptionCard,
  D2ComparisonMatrix,
  D2OptionsPanel,
  PaiveLogTable,
  Ve5HumanGatePanel,
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
  { key: "A", name: "Lowest Cost", cost: "+ €27,000", sched: "+5 Days", risk: "Low", carbon: "+4.2 tCO₂e", tone: "success", rank: 1 },
  { key: "B", name: "Balanced Option", cost: "+ €35,000", sched: "+2 Days", risk: "Low", carbon: "+3.1 tCO₂e", tone: "primary", rec: true, rank: 2 },
  { key: "C", name: "Schedule Optimized", cost: "+ €61,000", sched: "0 Days", risk: "Medium", carbon: "+5.8 tCO₂e", tone: "warning", rank: 3 },
] as const;

const toneBorder = { success: "border-success", primary: "border-primary", warning: "border-warning" };
const toneText = { success: "text-success", primary: "text-primary", warning: "text-warning" };

function Card({
  children,
  className,
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <div className={cn(variant === "primary" ? "glass p-8" : "panel-secondary p-8", className)}>{children}</div>
  );
}
const workflowSectionClass = "border-t border-border pt-10";

function SectionTitle({
  children,
  sub,
  variant = "card",
}: {
  children: ReactNode;
  sub?: ReactNode;
  variant?: "workflow" | "card";
}) {
  if (variant === "workflow") {
    return (
      <div className="mb-6 flex gap-3">
        <div className="w-1 shrink-0 self-stretch rounded-full bg-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold tracking-tight">{children}</h2>
          {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
        </div>
      </div>
    );
  }
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold">{children}</h2>
      {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function IfcVersionHistoryCard({ project }: { project: Project }) {
  const uploaded = uploadedIfcVersions(project);
  return (
    <Card variant="secondary">
      <h3 className="mb-6 text-lg font-semibold">Version History</h3>
      {uploaded.length === 0 ? (
        <p className="text-base text-muted-foreground">No IFC versions uploaded yet.</p>
      ) : (
        <ol className="relative space-y-7 border-l-2 border-border pl-8">
          {uploaded.map((v) => {
            const cur = v.version === project.activeIfcVersion;
            return (
              <li key={v.version} className="relative">
                <span
                  className={cn(
                    "absolute -left-[42px] top-1 h-5 w-5 rounded-full border-4 border-background",
                    ifcVersionDotClass(cur),
                  )}
                />
                <div className="font-semibold">
                  {ifcVersionLabel(v.version)} · {v.name}
                </div>
                <div className="text-base text-muted-foreground">
                  {v.uploadedAt}
                  {v.sizeLabel ? ` · ${v.sizeLabel}` : ""}
                  {cur && " · Current"}
                </div>
              </li>
            );
          })}
        </ol>
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
  /** Legacy §4 “Selected: Option X” only when §3 shows demo A/B/C cards (blocked run). */
  const legacyOptionSelectionActive = Boolean(ifcFile && fixtureRun?.status === "blocked");

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
    const version = (uploadedIfcVersions(project).at(-1)?.version ?? 0) + 1;
    onStoreIfc(f);
    toast.success(`IFC model stored as ${ifcVersionLabel(version)}`, { description: `${f.name} · previous versions stay on this project` });
  };

  return (
    <div>
      <main className="space-y-0 pb-20">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">{project.config.name} - VE Workflow</h1>
          <p className="mt-2 text-base text-muted-foreground">Upload, analyse, compare and approve design changes in one place.</p>
        </div>

        {/* Section 1 */}
        <section>
          <SectionTitle
            variant="workflow"
            sub="Each upload is kept as the next version (v01, v02, …). Only files you upload are stored."
          >
            1. Upload IFC Model
          </SectionTitle>
          <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            {uploadedIfcVersions(project).length > 0 && (
              <div className="mb-6 flex flex-wrap justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClearIfcVersions}
                  className="shrink-0 text-muted-foreground hover:border-warning hover:text-warning"
                >
                  <RotateCcw />
                  Clear IFC versions
                </Button>
              </div>
            )}
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleIfc(e.dataTransfer.files[0]); }}
              className={cn(
                "relative flex flex-col items-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
                drag ? "border-primary bg-primary/10" : "border-border bg-background/40",
              )}
            >
              {drag && (
                <span
                  className="pointer-events-none absolute inset-4 animate-pulse rounded-xl border border-dashed border-primary/60"
                  aria-hidden
                />
              )}
              <Upload
                className={cn("relative z-[1] h-12 w-12 text-primary transition-transform duration-200", drag && "scale-110")}
              />
              <p className="relative z-[1] mt-4 text-lg font-medium">Drag & drop your IFC file here</p>
              <p className="relative z-[1] text-base text-muted-foreground">IFC 2x3 / IFC4 · up to 500 MB</p>
              <Button
                type="button"
                size="lg"
                className="relative z-[1] mt-5"
                onClick={() => ifcInput.current?.click()}
              >
                Select IFC File
              </Button>
              <input ref={ifcInput} type="file" accept=".ifc" hidden onChange={(e) => { handleIfc(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            {uploadedIfcVersions(project).length > 0 && (
              <ul className="mt-5 space-y-3">
                {uploadedIfcVersions(project).map((v) => {
                  const current = v.version === project.activeIfcVersion;
                  return (
                    <li
                      key={v.version}
                      className={cn(
                        "flex items-center justify-between rounded-xl border border-border p-4",
                        current
                          ? "border-l-4 border-l-primary bg-primary/[0.04]"
                          : "border-l-4 border-l-success/50 bg-success/[0.03]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileBox className="h-6 w-6 shrink-0 text-primary" />
                        <span className="font-semibold">{ifcVersionLabel(v.version)}</span>
                        <span className="truncate">{v.name}</span>
                        <span className="shrink-0 text-base text-muted-foreground">{v.sizeLabel}</span>
                      </div>
                      {current ? (
                        <Badge variant="success" className="gap-1 text-sm font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Current
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="text-sm font-medium">
                          Stored
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button type="button" variant="outline" onClick={() => costInput.current?.click()}>
                <FileSpreadsheet className="text-secondary" />
                Upload Cost File
              </Button>
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
          <Card variant="secondary">
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
                  <dd className="min-w-0 text-right font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          </div>
        </section>

        {/* Section 2 */}
        <section className={workflowSectionClass}>
          <SectionTitle variant="workflow">2. Change Analysis</SectionTitle>
          <div className="space-y-6">
            <div className="space-y-6">
              <Card>
                {fixtureRun?.status === "blocked" && fixtureRun.blocked ? (
                  <>
                    <SectionTitle>Blocked</SectionTitle>
                    <D1BlockedPanel run={fixtureRun} />
                  </>
                ) : fixtureRun?.d1 ? (
                  <D1ResultPanel run={fixtureRun} />
                ) : (
                  <>
                    <SectionTitle>Baseline</SectionTitle>
                    {ifcFile ? (
                      <D1BaselinePlaceholder />
                    ) : (
                      <p className="text-sm text-muted-foreground">Upload an IFC model to start change analysis.</p>
                    )}
                  </>
                )}
              </Card>
              <Card>
                <SectionTitle>Affected Elements</SectionTitle>
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
            <BimModelViewerPanel
              ifcFile={ifcFile}
              projectId={project.id}
              activeVersion={project.activeIfcVersion}
              selectedId={viewerSelection}
              onSelect={(id) => {
                setSel(id);
                setWallGuid(id);
              }}
              onInspect={setInfo}
              onModelLoaded={(stats) => {
                setIfcElementCount(stats.elementCount);
                if (ifcFile) onIfcModelStats(project.activeIfcVersion, stats);
              }}
              info={info}
              paiveWall={
                fixtureRun?.walls?.find(
                  (w) =>
                    (info != null && (w.guid === info.guid || w.guid === info.expressId)) ||
                    (viewerSelection != null &&
                      (w.guid === viewerSelection || String(w.guid) === viewerSelection)),
                ) ?? null
              }
            />
          </div>
        </section>

        {/* Section 3 */}
        <section className={workflowSectionClass}>
          {useFixtureUi && fixtureRun && fixtureRun.status !== "blocked" ? (
            <>
              <SectionTitle variant="workflow" sub="AI-generated alternatives for the detected model changes.">
                3. Value Engineering Analysis
              </SectionTitle>
              {fixtureRun.d2?.options?.length ? (
                <D2OptionsPanel
                  run={fixtureRun}
                  selectedId={selectedAssembly}
                  onSelect={setSelectedAssembly}
                />
              ) : (
                <D2BlankOptionCard
                  message={fixtureRun.d2?.note ?? "No alternatives required for this run."}
                />
              )}
              <Card variant="secondary" className="mt-6">
                <SectionTitle>Comparison Matrix</SectionTitle>
                {fixtureRun.d2?.options?.length ? (
                  <D2ComparisonMatrix options={fixtureRun.d2.options} selectedId={selectedAssembly} />
                ) : (
                  <D2ComparisonMatrix placeholder />
                )}
              </Card>
              <Card
                variant="secondary"
                className={cn("mt-6", !fixtureRun.d2?.options?.length && "opacity-95")}
              >
                <SectionTitle sub="Reason is required. Calls decide() on the fixture back end.">
                  Human gate (VE5)
                </SectionTitle>
                <Ve5HumanGatePanel
                  reviewer={reviewer}
                  onReviewerChange={setReviewer}
                  decisionReason={decisionReason}
                  onDecisionReasonChange={setDecisionReason}
                  hasOptions={Boolean(fixtureRun.d2?.options?.length)}
                  onAccept={() => submitPaiveDecision("accept")}
                  onReject={() => submitPaiveDecision("reject")}
                  result={decideResult}
                />
              </Card>
            </>
          ) : !ifcFile ? (
            <>
              <SectionTitle variant="workflow" sub="AI-generated alternatives for the detected model changes.">
                3. Value Engineering Analysis
              </SectionTitle>
              <D2BlankOptionCard message="Upload an IFC model to generate ranked alternatives." />
              <Card variant="secondary" className="mt-6">
                <SectionTitle>Comparison Matrix</SectionTitle>
                <D2ComparisonMatrix placeholder />
              </Card>
            </>
          ) : (
            <>
              <SectionTitle variant="workflow" sub="AI-generated alternatives for the detected model changes.">
                3. Value Engineering Analysis
              </SectionTitle>
              <div className="grid gap-6 md:grid-cols-3">
                {OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setOpt(o.key)}
                    className={cn(
                      "glass relative border-2 p-8 text-left motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-1",
                      rankAccent(o.rank).border,
                      rankOptionGlowClass(o.rank, opt === o.key),
                      opt !== o.key && "opacity-90",
                    )}
                  >
                    {"rec" in o && (
                      <span className="absolute -top-4 right-6 rounded-full bg-primary px-4 py-1 text-base font-semibold text-primary-foreground">
                        Recommended
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={cn("text-lg font-semibold", toneText[o.tone])}>Option {o.key}</span>
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border-2",
                          toneBorder[o.tone],
                          opt === o.key && "bg-primary",
                        )}
                      >
                        {opt === o.key && <Check className="h-4 w-4 text-primary-foreground" />}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{o.name}</h3>
                    <p className="mt-4 text-xl font-bold tabular-nums">{o.cost}</p>
                    <ul className="mt-5 space-y-3">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Schedule</span>
                        <span>{o.sched}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Risk</span>
                        <Badge variant={o.risk === "Low" ? "success" : "warning"} className="text-sm font-medium">
                          {o.risk}
                        </Badge>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Compliance</span>
                        <Badge variant="success" className="text-sm font-medium">
                          Pass
                        </Badge>
                      </li>
                    </ul>
                  </button>
                ))}
              </div>
              <Card variant="secondary" className="mt-6">
                <SectionTitle>Comparison Matrix</SectionTitle>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Criteria</TableHead>
                      {OPTIONS.map((o) => (
                        <TableHead
                          key={o.key}
                          className={cn("normal-case tracking-normal", rankHeaderClass(o.rank, opt === o.key))}
                        >
                          Option {o.key}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className={dataTableZebraClass}>
                    {(
                      [
                        ["Cost", "cost"],
                        ["Schedule", "sched"],
                        ["Risk", "risk"],
                        ["Compliance", null],
                        ["Carbon Impact", "carbon"],
                      ] as const
                    ).map(([label, k]) => (
                      <TableRow key={label}>
                        <TableCell className="text-muted-foreground">{label}</TableCell>
                        {OPTIONS.map((o) => (
                          <TableCell
                            key={o.key}
                            className={cn("font-medium", k && "tabular-nums", opt === o.key && rankSelectedCellClass(o.rank))}
                          >
                            {k ? o[k] : "Pass"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </section>

        {/* Section 4 */}
        <section className={workflowSectionClass}>
          {useFixtureUi && fixtureRun && fixtureRun.status !== "blocked" ? (
            <>
              <SectionTitle variant="workflow">4. Decision & Approval</SectionTitle>
              <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                <div className="space-y-6">
                  <VeReportBlock run={fixtureRun} />
                  <Card variant="secondary">
                    <SectionTitle>Decision log</SectionTitle>
                    <PaiveLogTable entries={paiveLog} />
                  </Card>
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="lg" disabled title="PDF export will use the same JSON later">
                      <Download />
                      Export PDF (coming soon)
                    </Button>
                  </div>
                </div>
                <IfcVersionHistoryCard project={project} />
              </div>
            </>
          ) : (
            <>
          <SectionTitle variant="workflow">4. Decision & Approval</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Decision</h3>
                <span className="text-muted-foreground">
                  Selected:
                  {legacyOptionSelectionActive ? (
                    <>
                      {" "}
                      <span className="font-semibold text-primary">Option {opt}</span>
                    </>
                  ) : null}
                  {decision && (
                    <>
                      {legacyOptionSelectionActive ? " · " : " "}
                      <Badge variant={decision === "Approved" ? "success" : "warning"} className="text-sm font-medium">
                        {decision}
                      </Badge>
                    </>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={() => { setDecision("Approved"); toast.success(`Option ${opt} approved`); }}>
                  <Check />
                  Approve
                </Button>
                <Button size="lg" variant="outline" onClick={() => { setDecision("Revision Requested"); toast.info("Revision requested from design team"); }}>
                  <RotateCcw />
                  Request Revision
                </Button>
                <Button size="lg" variant="outlineDestructive" onClick={() => { setDecision("Rejected"); toast.error("Change request rejected"); }}>
                  <X />
                  Reject
                </Button>
              </div>
              <label className="mt-6 block text-base text-muted-foreground" htmlFor="rat">Decision Rationale</label>
              <textarea id="rat" value={rationale} onChange={(e) => setRationale(e.target.value)} rows={5} placeholder="Provide decision rationale..." className="mt-2 w-full rounded-xl border border-input bg-background/50 p-4 text-lg outline-none placeholder:text-muted-foreground focus:border-primary" />
            </Card>
            <IfcVersionHistoryCard project={project} />
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                toast.success("PDF report generated", {
                  description: `PAiVE_${project.code}_${ifcVersionLabel(project.activeIfcVersion)}_report.pdf`,
                })
              }
            >
              <Download />
              Export PDF Report
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const csv = "Criteria,Option A,Option B,Option C\n" + [["Cost", "cost"], ["Schedule", "sched"], ["Risk", "risk"], ["Carbon", "carbon"]].map(([l, k]) => [l, ...OPTIONS.map((o) => o[k as "cost"])].join(",")).join("\n");
                const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "paive_comparison.csv"; a.click();
                toast.success("CSV exported");
              }}
            >
              <FileSpreadsheet />
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => decision ? toast.success("Decision saved", { description: `${decision} · Option ${opt}` }) : toast.warning("Choose Approve, Request Revision or Reject first")}
            >
              <Save />
              Save Decision
            </Button>
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
  const chevronTone =
    value === "On track" ? "text-success" : value === "Analyzing" ? "text-warning" : "text-muted-foreground";
  return (
    <div className="relative mt-2 block w-full">
      <select
        value={value}
        aria-label="Project status"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value as ProjectStatus)}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-full border py-1 pl-3 pr-7 text-base font-medium outline-none focus:ring-2 focus:ring-primary/50",
          statusSelectClass[value],
        )}
      >
        {PROJECT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className={cn("pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2", chevronTone)}
      />
    </div>
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
    }, 900);
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

  const deleteProject = async (id: string) => {
    if (projects.length <= 1) {
      toast.error("You must keep at least one project");
      return;
    }
    const target = projects.find((p) => p.id === id);
    const label = target?.config.name?.trim() || "this project";
    const ok = window.confirm(
      `Delete “${label}” permanently?\n\nStored IFC versions, cost files, and configuration for this project will be removed.`,
    );
    if (!ok) return;
    await deleteAllProjectFiles(id);
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    setProjectBaselines((b) => {
      const { [id]: _removed, ...rest } = b;
      return rest;
    });
    if (activeId === id) setActiveId(remaining[0]!.id);
    toast.success("Project deleted", { description: label });
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
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { fontSize: 12 } }} closeButton />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/85 shadow-[inset_0_-1px_0_0] shadow-primary/20 backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0 rounded-lg bg-card px-3 py-1.5 shadow-sm ring-1 ring-border">
              <img src="/paive-logo.png" alt="PAiVE" className="h-9 w-auto" width={120} height={36} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(!open)}
              aria-label="Toggle projects panel"
              className="text-muted-foreground"
            >
              {open ? <PanelLeftClose className="h-6 w-6" /> : <PanelLeftOpen className="h-6 w-6" />}
            </Button>
            <div className="hidden border-l border-border pl-4 text-2xl leading-tight text-muted-foreground lg:block">
              Project AI Value Engineering
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {([["workflow", "Workflow", LayoutDashboard], ["config", "Configuration", Settings2]] as const).map(([k, l, I]) => (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={view === k ? "default" : "ghost"}
                onClick={() => setView(k)}
                className={view === k ? undefined : "text-muted-foreground"}
              >
                <I className="h-5 w-5" />
                {l}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden />
              <div className="min-w-0 leading-tight">
                <div className="truncate font-semibold text-foreground">{active.config.name}</div>
                <p className="truncate text-xs text-muted-foreground">
                  {active.code} · {active.config.stage}
                </p>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground">VV</div>
          </div>
        </div>
      </header>

      <div className="flex pt-20">
        <aside className={cn("sticky top-20 h-[calc(100vh-5rem)] shrink-0 overflow-y-auto border-r border-border bg-card/40 transition-all", open ? "w-80 p-5" : "w-20 p-3")}>
          {open && <div className="mb-4 px-1 text-base font-bold tracking-widest text-muted-foreground">PROJECTS</div>}
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <div
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border p-3 transition-colors",
                    p.id === active.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    title={p.config.name}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-bold",
                        p.id === active.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      {p.code}
                    </span>
                    {open && (
                      <span className="min-w-0 flex-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate font-semibold">{p.config.name}</span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            {p.config.name}
                          </TooltipContent>
                        </Tooltip>
                        <span className="block truncate text-sm text-muted-foreground">{p.config.stage}</span>
                        <ProjectStatusSelect value={p.status} onChange={(status) => updateProjectStatus(p.id, status)} />
                      </span>
                    )}
                  </button>
                  {open && projects.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void deleteProject(p.id)}
                      title={`Delete ${p.config.name}`}
                      aria-label={`Delete ${p.config.name}`}
                      className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
            <li>
              <Button
                type="button"
                variant="outline"
                onClick={addProject}
                title="New Project"
                className="h-auto w-full justify-start gap-3 border-dashed p-3 text-muted-foreground hover:border-primary hover:text-primary"
              >
                <span className="flex h-11 w-11 items-center justify-center">
                  <Plus className="h-6 w-6" />
                </span>
                {open && "New Project"}
              </Button>
            </li>
          </ul>
        </aside>
        <main className="min-w-0 flex-1 px-8 pt-10">
          <div className="mx-auto w-full max-w-[min(1400px,100%)]">
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
                onDeleteProject={() => void deleteProject(active.id)}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
