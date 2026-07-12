"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import { useEffect, useId, useMemo, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { filterRows, type SortDir, sortRows } from "@/lib/dataTable";

/** Definicja kolumny. `sort` (wartość do porównań) czyni kolumnę sortowalną. */
export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sort?: (row: T) => string | number | null | undefined;
  align?: "left" | "right";
  width?: number | string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Tekst, po którym filtruje pole wyszukiwania. Brak → bez filtra. */
  searchText?: (row: T) => string;
  /** Klucz kolumny startowo sortowanej. */
  initialSort?: { key: string; dir: SortDir };
  /** #296: prefiks parametrów URL — filtr/sortowanie zapisywane w adresie
   *  (`?<urlKey>q=…&<urlKey>s=…`), więc widok da się wysłać linkiem. */
  urlKey?: string;
};

/**
 * Lekka, generyczna tabela danych: sortowanie kliknięciem nagłówka, filtr tekstowy,
 * licznik wyników, przyklejony nagłówek (#296). Motyw red/black przez tokeny
 * `--el-*` (reaguje na tryb jasny). Logika sort/filtr w `lib/dataTable`
 * (testowana). Bez zależności zewnętrznych.
 */
export function DataTable<T>({ columns, rows, rowKey, searchText, initialSort, urlKey }: Props<T>) {
  const t = useT();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(initialSort?.dir ?? "asc");

  // Stan z URL czytamy po montażu (bez ryzyka rozjazdu SSR/klient).
  useEffect(() => {
    if (!urlKey) return;
    const p = new URLSearchParams(window.location.search);
    const q = p.get(`${urlKey}q`);
    const s = p.get(`${urlKey}s`);
    const d = p.get(`${urlKey}d`);
    if (q) setQuery(q);
    if (s) setSortKey(s);
    if (d === "asc" || d === "desc") setSortDir(d);
  }, [urlKey]);

  // Zapis do URL przez replaceState — bez nawigacji i bez wpisów w historii.
  useEffect(() => {
    if (!urlKey) return;
    const url = new URL(window.location.href);
    const set = (k: string, v: string | null) => {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    };
    set(`${urlKey}q`, query || null);
    set(`${urlKey}s`, sortKey !== (initialSort?.key ?? null) ? sortKey : null);
    set(`${urlKey}d`, sortDir !== (initialSort?.dir ?? "asc") ? sortDir : null);
    window.history.replaceState(null, "", url.toString());
  }, [urlKey, query, sortKey, sortDir, initialSort]);

  const view = useMemo(() => {
    const filtered = searchText ? filterRows(rows, query, searchText) : rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sort) return filtered;
    return sortRows(filtered, col.sort, sortDir);
  }, [rows, query, sortKey, sortDir, columns, searchText]);

  function toggleSort(col: Column<T>) {
    if (!col.sort) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {searchText && (
        <div style={styles.toolbar}>
          <input
            id={inputId}
            style={styles.search}
            placeholder={t("table.filter")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("table.filter")}
          />
          <span style={styles.count}>
            {view.length} / {rows.length}
          </span>
        </div>
      )}
      <div style={styles.scroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sortKey === col.key;
                const sortable = Boolean(col.sort);
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active ? (sortDir === "asc" ? "ascending" : "descending") : undefined
                    }
                    style={{
                      ...styles.th,
                      textAlign: col.align ?? "left",
                      width: col.width,
                      cursor: sortable ? "pointer" : "default",
                      color: active ? palette.offWhite : palette.smoke,
                    }}
                    onClick={() => toggleSort(col)}
                  >
                    {col.header}
                    {sortable && (
                      <span aria-hidden="true" style={styles.arrow}>
                        {active ? (sortDir === "asc" ? " ▲" : " ▼") : " ⇅"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={styles.emptyCell}>
                  {t("table.empty")}
                </td>
              </tr>
            ) : (
              view.map((row) => (
                <tr key={rowKey(row)} style={styles.tr} className="el-table-row">
                  {columns.map((col) => (
                    <td key={col.key} style={{ ...styles.td, textAlign: col.align ?? "left" }}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  search: {
    flex: 1,
    maxWidth: 320,
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    outline: "none",
  },
  count: { fontSize: 12, color: palette.smoke },
  scroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: `1px solid ${palette.graphite}`,
    whiteSpace: "nowrap",
    userSelect: "none",
    // #296: nagłówek przyklejony przy przewijaniu długich tabel
    position: "sticky",
    top: 0,
    background: palette.black,
    zIndex: 1,
  },
  arrow: { fontSize: 10 },
  tr: { borderBottom: `1px solid ${palette.graphite}` },
  td: { padding: "10px 12px", color: palette.offWhite, verticalAlign: "middle" },
  emptyCell: { padding: "20px 12px", color: palette.smoke, textAlign: "center" },
};
