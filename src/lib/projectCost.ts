import { toast } from "sonner";
import { parseCostFile, type CostRow } from "@/lib/costFile";
import { storeProjectCostFile, type Project } from "@/lib/projects";

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-US")}`;

export async function loadProjectCostFile(file: File): Promise<{ file: File; rows: CostRow[] } | null> {
  try {
    const rows = await parseCostFile(file);
    if (!rows.length) {
      toast.error("No cost rows found in this file");
      return null;
    }
    return { file, rows };
  } catch (e) {
    console.error(e);
    toast.error("Could not read this cost file");
    return null;
  }
}

export function applyProjectCostFile(project: Project, file: File, rows: CostRow[]): Project {
  const next = storeProjectCostFile(project, file, rows);
  const total = rows.reduce((a, r) => a + r.total, 0);
  toast.success(`Cost data "${file.name}" stored`, { description: `${rows.length} items · ${eur(total)}` });
  return next;
}