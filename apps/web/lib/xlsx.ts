/**
 * Odczyt/zapis plików `.xlsx` w przeglądarce przez **exceljs**, ładowany
 * **dynamicznie** (`await import`) — biblioteka jest ciężka, więc trzymamy ją poza
 * głównym bundlem: doładowuje się dopiero, gdy użytkownik faktycznie importuje/eksportuje xlsx.
 */

// Import wyłącznie typów (usuwany w buildzie) — nie wciąga exceljs do bundla; runtime = dynamic import.
import type { Worksheet } from "exceljs";

/** Zamienia wartość komórki exceljs (string/number/Date/formuła/hyperlink/richText) na string. */
function cellToString(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return o.text; // hyperlink
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    }
    if ("result" in o) return o.result == null ? "" : String(o.result); // formuła
    return "";
  }
  return String(v);
}

/** Parsuje pierwszy arkusz pliku `.xlsx` do wierszy `string[][]` (nagłówki + dane). */
export async function parseXlsx(file: File): Promise<string[][]> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[]; // indeks 0 zawsze pusty (1-indexed)
    const cells: string[] = [];
    for (let i = 1; i < values.length; i++) cells.push(cellToString(values[i]));
    rows.push(cells);
  });
  return rows;
}

/** Jeden arkusz zbiorczego skoroszytu (nazwa ≤ 31 znaków wg limitu Excela). */
export interface XlsxSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function triggerDownload(buf: ArrayBuffer, filename: string): void {
  const blob = new Blob([buf], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function autoWidth(ws: Worksheet): void {
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 60);
  });
}

/** Pobiera dane jako plik `.xlsx` (jeden arkusz, pogrubione nagłówki, auto-szerokość kolumn). */
export async function downloadXlsx(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][],
  sheetName = "Dane",
): Promise<void> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(headers).font = { bold: true };
  for (const r of rows) ws.addRow(r);
  autoWidth(ws);
  triggerDownload((await wb.xlsx.writeBuffer()) as ArrayBuffer, filename);
}

/** Pobiera **wieloarkuszowy** skoroszyt `.xlsx` — jeden arkusz na moduł (eksport zbiorczy). */
export async function downloadXlsxWorkbook(filename: string, sheets: XlsxSheet[]): Promise<void> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    ws.addRow(s.headers).font = { bold: true };
    for (const r of s.rows) ws.addRow(r);
    autoWidth(ws);
  }
  triggerDownload((await wb.xlsx.writeBuffer()) as ArrayBuffer, filename);
}
