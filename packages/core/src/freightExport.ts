/**
 * Eksport zleceń do publikacji na giełdach transportowych (Trans.eu / Timocom
 * itp.). Mapuje zlecenie na uniwersalny zestaw pól ogłoszenia frachtu (CSV),
 * gotowy do wklejenia/importu. Funkcje czyste, niezależne od UI.
 *
 * Uwaga: giełdy mają własne szablony importu — to wspólny mianownik pól
 * frachtowych (trasa, daty, ładunek, waga, stawka), nie format konkretnego API.
 */
import { round2 } from "./money";

export interface FreightOrderInput {
  referenceNo?: string | null;
  origin?: string | null;
  destination?: string | null;
  loadDate?: string | null;
  unloadDate?: string | null;
  cargo?: string | null;
  weightKg?: number | null;
  price?: number | null;
  currency?: string | null;
  notes?: string | null;
}

export interface FreightRow {
  reference: string;
  loadingPlace: string;
  loadingDate: string;
  unloadingPlace: string;
  unloadingDate: string;
  cargo: string;
  /** Waga w tonach (z kg, 2 miejsca) lub "" gdy brak. */
  weightT: number | "";
  price: number | "";
  currency: string;
  notes: string;
}

/** Nagłówki kolumn CSV (kolejność = `freightRowCells`). */
export const FREIGHT_EXPORT_HEADERS = [
  "Referencja",
  "Załadunek",
  "Data załadunku",
  "Rozładunek",
  "Data rozładunku",
  "Ładunek",
  "Waga (t)",
  "Stawka",
  "Waluta",
  "Uwagi",
] as const;

const s = (v: string | null | undefined): string => (v ?? "").trim();

/** Mapuje jedno zlecenie na wiersz ogłoszenia frachtu. */
export function toFreightRow(o: FreightOrderInput): FreightRow {
  return {
    reference: s(o.referenceNo),
    loadingPlace: s(o.origin),
    loadingDate: s(o.loadDate),
    unloadingPlace: s(o.destination),
    unloadingDate: s(o.unloadDate),
    cargo: s(o.cargo),
    weightT: o.weightKg != null ? round2(Math.max(0, o.weightKg) / 1000) : "",
    price: o.price != null ? round2(Math.max(0, o.price)) : "",
    currency: s(o.currency),
    notes: s(o.notes),
  };
}

/** Wartości wiersza w kolejności `FREIGHT_EXPORT_HEADERS` (do CSV). */
export function freightRowCells(r: FreightRow): (string | number)[] {
  return [
    r.reference,
    r.loadingPlace,
    r.loadingDate,
    r.unloadingPlace,
    r.unloadingDate,
    r.cargo,
    r.weightT,
    r.price,
    r.currency,
    r.notes,
  ];
}

/** Mapuje listę zleceń; pomija pozycje bez trasy (brak załadunku i rozładunku). */
export function freightExportRows(orders: FreightOrderInput[]): FreightRow[] {
  return orders.map(toFreightRow).filter((r) => r.loadingPlace !== "" || r.unloadingPlace !== "");
}
