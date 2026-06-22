import { toCsv } from "@e-logistic/core";

/**
 * Pobiera dane jako plik CSV (Excel-friendly: BOM UTF-8 + separator z `toCsv`).
 * Wspólny helper dla wszystkich list (zlecenia, faktury, kierowcy, pojazdy, dokumenty…).
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][],
): void {
  const text = toCsv(headers, rows);
  const blob = new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Data do nazwy pliku (YYYY-MM-DD). */
export function csvDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
