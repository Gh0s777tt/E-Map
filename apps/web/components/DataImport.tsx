"use client";

import { parseCsv } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import type React from "react";
import { useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { downloadCsv } from "@/lib/csv";

/** Definicja kolumny importu: klucz kanoniczny + nagłówek + akceptowane warianty nagłówka. */
export interface ImportColumn {
  key: string;
  /** Nagłówek w szablonie (jak w eksporcie). */
  label: string;
  /** Dodatkowe akceptowane nagłówki (dopasowanie bez wielkości liter). */
  aliases?: string[];
  required?: boolean;
}

export interface ImportResult {
  inserted: number;
  failed: number;
  errors: string[];
}

export interface DataImportProps<T> {
  columns: ImportColumn[];
  /** Waliduje surowy rekord (klucz→string) → wartość gotowa do zapisu albo błąd. */
  validate: (rec: Record<string, string>) => { ok: true; value: T } | { ok: false; error: string };
  /** Zapisuje poprawne rekordy (hurtowo). */
  onImport: (values: T[]) => Promise<ImportResult>;
  /** Baza nazwy pliku szablonu, np. `"kontrahenci"`. */
  templateBase: string;
  /** Wywołane po udanym imporcie (odśwież listę). */
  onDone?: () => void;
}

interface Preview<T> {
  fileName: string;
  total: number;
  valid: T[];
  errors: { row: number; error: string }[];
  missingCols: string[];
}

function headerMatches(cell: string, col: ImportColumn): boolean {
  const c = cell.trim().toLowerCase();
  if (c === col.label.trim().toLowerCase()) return true;
  return (col.aliases ?? []).some((a) => a.trim().toLowerCase() === c);
}

/** Odczyt wierszy z pliku: CSV (rdzeń, bez zależności) albo `.xlsx` (exceljs, dynamicznie). */
async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const { parseXlsx } = await import("@/lib/xlsx");
    return parseXlsx(file);
  }
  return parseCsv(await file.text());
}

/**
 * Generyczny import danych z pliku CSV/Excel: wczytanie → dopasowanie nagłówków →
 * walidacja wiersz po wierszu → podgląd (ile OK / ile błędnych) → hurtowy zapis.
 * Reużywalny dla kontrahentów, pojazdów, kierowców, zleceń/kosztów.
 */
export function DataImport<T>({
  columns,
  validate,
  onImport,
  templateBase,
  onDone,
}: DataImportProps<T>) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview<T> | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    try {
      const rows = await readRows(file);
      if (rows.length < 2) {
        toast("Plik jest pusty lub zawiera tylko nagłówek.", "error");
        return;
      }
      const header = rows[0] ?? [];
      const colIndex = new Map<string, number>();
      for (const col of columns) {
        const idx = header.findIndex((h) => headerMatches(h, col));
        if (idx >= 0) colIndex.set(col.key, idx);
      }
      const missingCols = columns
        .filter((c) => c.required && !colIndex.has(c.key))
        .map((c) => c.label);

      const valid: T[] = [];
      const errors: { row: number; error: string }[] = [];
      if (missingCols.length === 0) {
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r] ?? [];
          const rec: Record<string, string> = {};
          for (const col of columns) {
            const idx = colIndex.get(col.key);
            rec[col.key] = idx != null ? (row[idx] ?? "").trim() : "";
          }
          const res = validate(rec);
          if (res.ok) valid.push(res.value);
          else errors.push({ row: r + 1, error: res.error });
        }
      }
      setPreview({ fileName: file.name, total: rows.length - 1, valid, errors, missingCols });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nie udało się wczytać pliku.", "error");
    }
  }

  async function doImport() {
    if (!preview || preview.valid.length === 0) return;
    setBusy(true);
    try {
      const res = await onImport(preview.valid);
      toast(
        `Zaimportowano ${res.inserted}${res.failed ? ` · błędów zapisu: ${res.failed}` : ""}.`,
        res.failed ? "info" : "success",
      );
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      onDone?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd importu.", "error");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    downloadCsv(
      `${templateBase}_szablon.csv`,
      columns.map((c) => c.label),
      [],
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => {
            const fl = e.target.files?.[0];
            if (fl) onFile(fl);
          }}
        />
        <button type="button" style={primaryBtn} onClick={() => inputRef.current?.click()}>
          ⬆️ Importuj z pliku (CSV / Excel)
        </button>
        <button type="button" style={ghostBtn} onClick={downloadTemplate}>
          Pobierz szablon
        </button>
      </div>

      {preview && (
        <div style={box}>
          <div style={{ fontWeight: 700 }}>{preview.fileName}</div>
          {preview.missingCols.length > 0 ? (
            <div style={{ color: palette.red, fontSize: 13 }}>
              Brak wymaganych kolumn: <strong>{preview.missingCols.join(", ")}</strong>. Sprawdź
              nagłówki pliku (pobierz szablon jako wzór).
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13 }}>
                Wierszy: {preview.total} ·{" "}
                <span style={{ color: "#22c55e" }}>poprawnych: {preview.valid.length}</span>
                {preview.errors.length > 0 && (
                  <span style={{ color: palette.red }}> · z błędami: {preview.errors.length}</span>
                )}
              </div>
              {preview.errors.slice(0, 8).map((e) => (
                <div key={e.row} style={{ fontSize: 12, color: palette.smoke }}>
                  wiersz {e.row}: {e.error}
                </div>
              ))}
              {preview.errors.length > 8 && (
                <div style={{ fontSize: 12, color: palette.smoke }}>
                  …i {preview.errors.length - 8} więcej
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  style={{ ...primaryBtn, opacity: busy || preview.valid.length === 0 ? 0.5 : 1 }}
                  disabled={busy || preview.valid.length === 0}
                  onClick={doImport}
                >
                  {busy ? "Importuję…" : `Importuj ${preview.valid.length}`}
                </button>
                <button type="button" style={ghostBtn} onClick={() => setPreview(null)}>
                  Anuluj
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: palette.red,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "9px 14px",
  fontWeight: 700,
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: palette.offWhite,
  border: `1px solid ${palette.graphite}`,
  borderRadius: 8,
  padding: "9px 14px",
  cursor: "pointer",
};
const box: React.CSSProperties = {
  border: `1px solid ${palette.graphite}`,
  borderRadius: 10,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  background: palette.nearBlack,
};
