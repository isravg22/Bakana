import type { Catalog } from "@/types";
import { normalizeText } from "@/lib/format";

const SHEET_ID = "1WjzKu-Go7SZzMFQiq5fREGeYJivSMv8AG5VR5GVfA-g";

type GoogleCell = { v?: string | number | null; f?: string | null };
type GoogleRow = { c?: Array<GoogleCell | null> };
type GoogleTable = { rows?: GoogleRow[] };

function cell(row: GoogleRow, index: number) {
  const value = row.c?.[index];
  return value?.v ?? value?.f ?? "";
}

function parsePrice(value: string | number) {
  if (typeof value === "number") return value;
  return parseFloat(String(value).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
}

function isSummaryRow(category: string) {
  const normalized = normalizeText(category);
  return (
    normalized.startsWith("subtotal") ||
    normalized.startsWith("% beneficio") ||
    normalized.startsWith("base imponible") ||
    normalized.startsWith("iva") ||
    normalized.includes("total presupuesto") ||
    normalized.includes("instrucciones")
  );
}

export function catalogFromGoogleTable(table: GoogleTable): Catalog {
  const catalog: Catalog = {};

  for (const row of table.rows || []) {
    const cat = String(cell(row, 0)).trim();
    const desc = String(cell(row, 1)).trim();
    const unid = String(cell(row, 2)).trim();
    const precio = parsePrice(cell(row, 4));

    if (!cat || !desc || normalizeText(cat) === "categoria" || isSummaryRow(cat)) continue;
    if (!catalog[cat]) catalog[cat] = [];
    catalog[cat].push({ desc, unid: unid || "ud", precio });
  }

  return catalog;
}

export function loadCatalogFromGoogle(): Promise<Catalog> {
  return new Promise((resolve, reject) => {
    const callback = `bakanaCatalog_${Date.now()}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets tardó demasiado en responder"));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callback];
    }

    (window as unknown as Record<string, unknown>)[callback] = (data: { table: GoogleTable }) => {
      cleanup();
      const catalog = catalogFromGoogleTable(data.table);
      if (Object.keys(catalog).length === 0) {
        reject(new Error("La hoja no contiene partidas válidas"));
        return;
      }
      resolve(catalog);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("No se pudo conectar con Google Sheets"));
    };

    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${callback}&_=${Date.now()}`;
    document.head.appendChild(script);
  });
}
