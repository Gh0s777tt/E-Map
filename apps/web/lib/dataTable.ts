/**
 * Czysta logika tabeli danych (sort/filtr) — bez Reacta, w pełni testowalna.
 * Używana przez `<DataTable>`. Reguły: `null`/`undefined` zawsze na końcu (niezależnie
 * od kierunku); teksty porównywane wg locale PL (z `numeric` dla naturalnego porządku).
 */
export type SortDir = "asc" | "desc";

/** Filtruje wiersze po tekście (case-insensitive, podłańcuch). Pusty query → bez zmian. */
export function filterRows<T>(rows: T[], query: string, toText: (row: T) => string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => toText(row).toLowerCase().includes(q));
}

/** Sortuje (kopia — bez mutacji) wg wartości kolumny. `null`/`undefined` na końcu. */
export function sortRows<T>(
  rows: T[],
  value: (row: T) => string | number | null | undefined,
  dir: SortDir,
): T[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const aNull = va === null || va === undefined;
    const bNull = vb === null || vb === undefined;
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    const cmp =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), "pl", { numeric: true });
    return cmp * mult;
  });
}
