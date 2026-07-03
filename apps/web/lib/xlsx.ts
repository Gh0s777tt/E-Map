/**
 * Odczyt/zapis plików `.xlsx` w przeglądarce przez **exceljs**, ładowany
 * **dynamicznie** (`await import`) — biblioteka jest ciężka, więc trzymamy ją poza
 * głównym bundlem: doładowuje się dopiero, gdy użytkownik faktycznie importuje/eksportuje xlsx.
 */

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
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 60);
  });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
