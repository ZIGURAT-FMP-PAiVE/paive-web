import { useRef, useState, type ReactNode } from "react";
import { Box, ChevronDown, Maximize2, RotateCcw, ScanSearch } from "lucide-react";
import { BimViewer, type BimViewerHandle, type IfcInfo } from "@/components/BimViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { PaiveWall } from "@/lib/paive/types";
import type { AffectedWallHighlight } from "@/components/BimViewer";
import { cn } from "@/lib/utils";

function PropGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, v], i) => (
        <div key={k + i}>
          <dt className="text-sm text-muted-foreground">{k}</dt>
          <dd className="break-all font-medium">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function PropertySection({
  title,
  defaultOpen = true,
  hint,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border last:border-b-0">
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-3 text-left font-semibold text-foreground transition-colors hover:text-primary">
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        <span className="flex-1">{title}</span>
        {hint ? <span className="text-sm font-normal text-muted-foreground">{hint}</span> : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4 data-[state=closed]:animate-none">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function PropertiesEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[min(40vh,320px)] flex-col items-center justify-center px-4 py-10 text-center">
      <div className="relative mb-5 flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
        <Box className="h-12 w-12 text-muted-foreground/50" strokeWidth={1.25} />
        <ScanSearch className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border border-border bg-card p-1.5 text-primary" />
      </div>
      <p className="max-w-[16rem] text-base leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}

function ElementPropertiesContent({
  ifcFile,
  info,
  paiveWall,
}: {
  ifcFile: File | null;
  info: IfcInfo | null;
  paiveWall: PaiveWall | null | undefined;
}) {
  if (!ifcFile) {
    return (
      <>
        <h3 className="mb-2 text-xl font-semibold tracking-tight">Element Properties</h3>
        <PropertiesEmptyState message="Upload an IFC model to inspect elements in the viewer." />
      </>
    );
  }

  if (!info) {
    return (
      <>
        <h3 className="mb-2 text-xl font-semibold tracking-tight">Element Properties</h3>
        <PropertiesEmptyState message="Click an element in the model to see identification, quantities, and PAiVE context." />
      </>
    );
  }

  const quantityGroups = info.groups.filter((g) => /qto|quantit/i.test(g.name));
  const otherGroups = info.groups.filter((g) => !quantityGroups.includes(g));

  const generalRows: [string, string][] = [
    ["Name", info.name || "—"],
    ["IFC Class", info.ifcClass],
    ["GUID", info.guid],
    ["Express ID", info.expressId],
    ["Object Type", info.objectType || "—"],
    ["Tag", info.tag || "—"],
  ];

  const paiveRows: [string, string][] | null = paiveWall
    ? [
        ["Wall", paiveWall.name],
        ["Change", paiveWall.change],
        ["Type", paiveWall.type ?? "—"],
        ["Area", `${paiveWall.area_m2} m²`],
        ["U · Fire · Rw", `${paiveWall.u_value ?? "—"} / ${paiveWall.fire_min ?? "—"} / ${paiveWall.rw_db ?? "—"}`],
        ["Cost", paiveWall.cost_eur != null ? `€${Math.round(paiveWall.cost_eur).toLocaleString("en-US")}` : "—"],
        ["VE2 status", paiveWall.ve2.status],
        ...(paiveWall.ve2.reason ? ([["Note", paiveWall.ve2.reason]] as [string, string][]) : []),
      ]
    : null;

  return (
    <>
      <h3 className="mb-1 text-xl font-semibold tracking-tight">Element Properties</h3>
      <p className="mb-3 truncate text-sm text-muted-foreground">
        {info.name || info.ifcClass} · {info.expressId}
      </p>
      <div className="divide-y divide-border rounded-lg border border-border bg-background/30 px-4">
        <PropertySection title="General" defaultOpen>
          <PropGrid rows={generalRows} />
        </PropertySection>
        <PropertySection
          title="Quantities"
          defaultOpen
          hint={quantityGroups.length ? `${quantityGroups.length} set${quantityGroups.length === 1 ? "" : "s"}` : undefined}
        >
          {quantityGroups.length === 0 && otherGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quantity or property sets on this element.</p>
          ) : (
            <div className="space-y-4">
              {quantityGroups.map((g, i) => (
                <div key={g.name + i}>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">{g.name}</p>
                  <PropGrid rows={g.props} />
                </div>
              ))}
              {otherGroups.map((g, i) => (
                <div key={g.name + i}>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">{g.name}</p>
                  <PropGrid rows={g.props} />
                </div>
              ))}
            </div>
          )}
        </PropertySection>
        <PropertySection title="PAiVE" defaultOpen={Boolean(paiveWall)}>
          {paiveRows ? (
            <PropGrid rows={paiveRows} />
          ) : (
            <p className="text-sm text-muted-foreground">This element is not in the current VE wall scope.</p>
          )}
        </PropertySection>
      </div>
    </>
  );
}

export function BimModelViewerPanel({
  ifcFile,
  projectId,
  activeVersion,
  selectedId,
  onSelect,
  onInspect,
  onModelLoaded,
  info,
  paiveWall,
  affectedWalls,
  compareIfcFile,
}: {
  ifcFile: File | null;
  projectId: string;
  activeVersion: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInspect: (info: IfcInfo | null) => void;
  onModelLoaded: (stats: { elementCount: number; ifcWallCount: number; buildingAreaM2: number }) => void;
  info: IfcInfo | null;
  paiveWall?: PaiveWall | null;
  affectedWalls?: AffectedWallHighlight[];
  compareIfcFile?: File | null;
}) {
  const viewerRef = useRef<BimViewerHandle>(null);

  return (
    <div className="glass flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Box className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold tracking-tight">BIM Model Viewer</h3>
        </div>
        <Badge variant="muted" className="max-w-[min(100%,14rem)] truncate text-sm font-medium">
          {ifcFile ? ifcFile.name : "No model"}
        </Badge>
      </div>
      <div className="flex min-h-[min(58vh,680px)] flex-col lg:min-h-[480px] lg:flex-row">
        <div className="flex min-h-[480px] flex-1 flex-col border-border p-4 lg:min-h-0 lg:border-r">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-[#0b1120] shadow-inner">
            <div className="flex items-center justify-end gap-0.5 border-b border-white/10 bg-black/25 px-1.5 py-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                title="Fit to model"
                aria-label="Fit to model"
                onClick={() => viewerRef.current?.fitView()}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                title="Reset view"
                aria-label="Reset view"
                onClick={() => viewerRef.current?.resetView()}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative min-h-[420px] flex-1 p-px">
              <div className="relative h-full min-h-[418px] overflow-hidden rounded-[calc(1rem-2px)] ring-1 ring-inset ring-border/70">
                <BimViewer
                  ref={viewerRef}
                  key={`${projectId}-${activeVersion}-${ifcFile?.name ?? "no-ifc"}`}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  file={ifcFile}
                  onInspect={onInspect}
                  onModelLoaded={onModelLoaded}
                  affectedWalls={affectedWalls}
                  compareFile={compareIfcFile ?? null}
                />
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-black/55 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                Drag to orbit · Scroll to zoom · Click to select
              </div>
            </div>
          </div>
        </div>
        <div className="max-h-[min(40vh,420px)] shrink-0 overflow-y-auto bg-background/40 p-6 lg:max-h-none lg:w-[min(100%,24rem)] lg:border-r-0 xl:w-[28rem]">
          <ElementPropertiesContent ifcFile={ifcFile} info={info} paiveWall={paiveWall} />
        </div>
      </div>
    </div>
  );
}