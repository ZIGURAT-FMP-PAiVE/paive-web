import { useRef, type ReactNode } from "react";
import { Briefcase, ShieldCheck, Activity, Database, Save, RotateCcw, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { STAGES, type ProjectConfig, type ProjectCostData, type Op } from "@/lib/projects";
import { TruncatedText } from "@/components/TruncatedText";
import { cn } from "@/lib/utils";

const field = "w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-lg outline-none placeholder:text-muted-foreground focus:border-primary";

function Block({ n, label, title, desc, icon, children }: { n: string; label: string; title: string; desc?: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="glass p-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-bold tracking-widest text-primary">{n} / {label}</div>
          <h3 className="mt-1 text-[18px] font-semibold">{title}</h3>
          {desc && <p className="mt-1 text-base text-muted-foreground">{desc}</p>}
        </div>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function ProjectConfigPanel({
  config,
  baseline,
  costData,
  baselineCostData,
  onChange,
  onCostUpload,
  onCostDataChange,
  onSave,
  onResetDefaults,
}: {
  config: ProjectConfig;
  baseline: ProjectConfig;
  costData: ProjectCostData | null;
  baselineCostData: ProjectCostData | null;
  onChange: (c: ProjectConfig) => void;
  onCostUpload: (file: File) => Promise<void>;
  onCostDataChange: (costData: ProjectCostData | null) => void;
  onSave: () => void;
  onResetDefaults: () => void;
}) {
  const costInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ProjectConfig>(k: K, v: ProjectConfig[K]) => onChange({ ...config, [k]: v });
  const fw = config.functionWeight;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-base font-bold tracking-widest text-muted-foreground">CONFIGURATION · PROJECT</div>
        <h1 className="mt-2 text-[27px] font-bold tracking-tight">Project setup</h1>
        <p className="mt-1 text-lg text-muted-foreground">Define the project brief, client priorities and cost source.</p>
      </div>

      <Block n="01" label="PROJECT" title="Project information" icon={<Briefcase className="h-7 w-7" />}>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block"><span className="mb-2 block text-base font-medium">Project name</span>
            <input className={field} value={config.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="block"><span className="mb-2 block text-base font-medium">Project stage</span>
            <select className={field} value={config.stage} onChange={(e) => set("stage", e.target.value)}>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-base font-medium">Typology</span>
            <input className={field} value={config.typology} onChange={(e) => set("typology", e.target.value)} placeholder="e.g. External walls" /></label>
        </div>
      </Block>

      <Block n="02" label="PERFORMANCE" title="Function targets" desc="Enter targets from the approved project brief. Leave blank if not applicable." icon={<ShieldCheck className="h-7 w-7" />}>
        <div className="space-y-3">
          <div className="hidden grid-cols-[2fr_1fr_1fr_100px] gap-4 px-2 text-base font-medium text-muted-foreground md:grid">
            <span>Function / Metric</span><span>Operator</span><span>Target</span><span>Unit</span>
          </div>
          {config.targets.map((t, i) => {
            const upd = (patch: Partial<typeof t>) =>
              onChange({ ...config, targets: config.targets.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={t.key} className="grid items-center gap-4 rounded-xl border border-border bg-background/40 p-4 md:grid-cols-[2fr_1fr_1fr_100px]">
                <div><div className="font-semibold">{t.name}</div><div className="text-base text-muted-foreground">{t.metric}</div></div>
                <select className={field} value={t.op} onChange={(e) => upd({ op: e.target.value as Op })}>
                  {["Maximum", "Minimum", "Equal"].map((o) => <option key={o}>{o}</option>)}
                </select>
                <input className={field} value={t.value} placeholder="Add target" inputMode="decimal" onChange={(e) => upd({ value: e.target.value })} />
                <span className="text-muted-foreground">{t.unit}</span>
              </div>
            );
          })}
        </div>
      </Block>

      <Block n="03" label="PRIORITIES" title="Client priorities" desc="Drag the slider to split weights. They always total 100%." icon={<Activity className="h-7 w-7" />}>
        <div className="flex justify-between text-lg">
          <div><div className="font-semibold text-primary">Function performance · {fw}%</div><div className="text-base text-muted-foreground">How well the element meets the brief</div></div>
          <div className="text-right"><div className="font-semibold text-success">Resource efficiency · {100 - fw}%</div><div className="text-base text-muted-foreground">Quantity × unit rate</div></div>
        </div>
        <div className="mt-5 flex h-4 overflow-hidden rounded-full">
          <div className="bg-gradient-to-r from-secondary to-primary transition-all" style={{ width: `${fw}%` }} />
          <div className="flex-1 bg-success" />
        </div>
        <input type="range" min={0} max={100} step={5} value={fw} onChange={(e) => set("functionWeight", Number(e.target.value))} className="mt-4 w-full accent-primary" aria-label="Function performance weight" />
      </Block>

      <Block n="04" label="COST DATA" title="Cost source" desc="Upload a rate file for this project. The file is kept for workflow analysis." icon={<Database className="h-7 w-7" />}>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => costInput.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-secondary px-5 py-3 font-medium text-foreground hover:bg-secondary/15"
          >
            <FileSpreadsheet className="h-5 w-5 text-secondary" />
            Upload cost file
          </button>
          <input
            ref={costInput}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onCostUpload(file);
            }}
          />
          <span className="text-base text-muted-foreground">Supports .xlsx, .xls, .csv</span>
        </div>
        {costData && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary bg-primary/10 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 shrink-0 text-primary" />
              <TruncatedText text={costData.name} maxWidthClass="max-w-[min(100%,18rem)]" className="font-semibold text-foreground" />
              <span className="shrink-0 text-base text-muted-foreground">
                {costData.sizeLabel} · {costData.rows.length} items · {costData.uploadedAt}
              </span>
            </div>
            <span className={cn("inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-base font-medium text-success")}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Stored
            </span>
          </div>
        )}
      </Block>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onResetDefaults}
          className="flex items-center gap-2 rounded-xl border border-warning/40 px-6 py-3 font-medium text-warning hover:bg-warning/10"
        >
          <RotateCcw className="h-5 w-5" />
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(baseline);
            onCostDataChange(baselineCostData);
            toast.info("Reverted to last saved configuration");
          }}
          className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-medium hover:bg-accent"
        >
          <RotateCcw className="h-5 w-5" />
          Undo unsaved changes
        </button>
        <button onClick={() => { if (!config.name.trim()) { toast.error("Project name is required"); return; } onSave(); toast.success("Configuration updated", { description: config.name }); }} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"><Save className="h-5 w-5" />Save Configuration</button>
      </div>
    </div>
  );
}
