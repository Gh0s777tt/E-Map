/**
 * Generowanie CSV (RFC 4180) z domyślnym separatorem `;` (Excel PL).
 * Funkcje czyste — bez zależności od przeglądarki (pobranie pliku robi warstwa web).
 */

export type CsvCell = string | number | boolean | null | undefined;

/** Escapuje pojedynczą komórkę: cudzysłów/separator/nowa linia → w cudzysłowach. */
export function csvEscape(value: CsvCell, sep = ";"): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes('"') || s.includes(sep) || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Buduje dokument CSV z nagłówków i wierszy (CRLF; separator domyślnie `;`). */
export function toCsv(headers: string[], rows: CsvCell[][], sep = ";"): string {
  const lines = [headers, ...rows].map((row) => row.map((c) => csvEscape(c, sep)).join(sep));
  return lines.join("\r\n");
}
