export type CostRow = { id: string; description: string; code: string; quantity: number | null; unit: string; rate: number | null; total: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES: Record<keyof CostRow, string[]> = {
  id: ["elementid", "element", "id", "guid", "globalid", "tag", "mark", "ref", "reference"],
  description: ["description", "desc", "name", "item", "elementname"],
  code: ["costcode", "code", "uniclass", "wbs", "itemcode"],
  quantity: ["quantity", "qty", "qta", "quantita"],
  unit: ["unit", "uom", "um", "unita"],
  rate: ["unitrate", "rate", "unitcost", "unitprice", "price", "prezzo"],
  total: ["totalcost", "total", "cost", "amount", "importo", "totale"],
};

export function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || !v.trim()) return null;
  let s = v.replace(/[€$£\s]/g, "");
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function rowsFromRecords(records: Record<string, unknown>[]): CostRow[] {
  if (!records.length) return [];
  const headers = Object.keys(records[0]!);
  const pick = (k: keyof CostRow) => {
    for (const a of ALIASES[k]) { const h = headers.find((x) => norm(x) === a); if (h) return h; }
    return undefined;
  };
  const col = Object.fromEntries((Object.keys(ALIASES) as (keyof CostRow)[]).map((k) => [k, pick(k)])) as Record<keyof CostRow, string | undefined>;
  return records.map((r, i) => {
    const g = (k: keyof CostRow) => (col[k] ? r[col[k]!] : undefined);
    const quantity = toNum(g("quantity")), rate = toNum(g("rate"));
    const total = toNum(g("total")) ?? (quantity != null && rate != null ? quantity * rate : 0);
    return {
      id: String(g("id") ?? `ROW-${i + 1}`).trim(),
      description: String(g("description") ?? "").trim(),
      code: String(g("code") ?? "").trim(),
      quantity, unit: String(g("unit") ?? "").trim(), rate, total,
    };
  }).filter((r) => r.id || r.description);
}

export async function parseCostFile(file: File): Promise<CostRow[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) return [];
  return rowsFromRecords(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }));
}

export function findCost(rows: CostRow[], keys: (string | undefined | null)[]): CostRow | undefined {
  const ks = keys.filter(Boolean).map((k) => String(k).toLowerCase());
  return rows.find((r) => ks.includes(r.id.toLowerCase()));
}
