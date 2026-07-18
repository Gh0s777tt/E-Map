/**
 * Kalendarz obowiązkowych sczytań tachografu — pilnuje terminów pobrania danych:
 * KARTA KIEROWCY co ≤ 28 dni, JEDNOSTKA POJAZDOWA (tachograf) co ≤ 90 dni
 * (rozp. (UE) 581/2010). Brak sczytania w terminie = mandat na kontroli ITD oraz
 * utrata danych po nadpisaniu w pamięci. Funkcje czyste — `now` podajesz z zewnątrz.
 * Pomoc orientacyjna, nie interpretacja prawna.
 */

export type DownloadKind = "card" | "vu";

export const DOWNLOAD_LIMITS = {
  /** Karta kierowcy — nie rzadziej niż co 28 dni. */
  cardDays: 28,
  /** Jednostka pojazdowa (tachograf) — nie rzadziej niż co 90 dni. */
  vuDays: 90,
  /** Ile dni przed terminem status robi się „wkrótce". */
  soonDays: 7,
} as const;

export type DownloadStatus = "ok" | "soon" | "overdue";

export interface DownloadCheck {
  kind: DownloadKind;
  /** Znormalizowana data ostatniego sczytania (YYYY-MM-DD) lub "" gdy brak. */
  lastISO: string;
  /** Termin następnego sczytania (YYYY-MM-DD) lub "" gdy brak daty bazowej. */
  dueISO: string;
  /** Dni do terminu; < 0 = po terminie. */
  daysLeft: number;
  status: DownloadStatus;
}

const DAY = 86_400_000;
/** Brak daty bazowej sortuje się na samą górę (najpilniejsze). */
const NO_DATE = -9999;

const toUtc = (iso: string): number => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const fromUtc = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const limitDays = (kind: DownloadKind): number =>
  kind === "card" ? DOWNLOAD_LIMITS.cardDays : DOWNLOAD_LIMITS.vuDays;

/** Status pojedynczego obowiązku sczytania względem `nowISO`. */
export function checkDownload(
  kind: DownloadKind,
  lastISO: string | null,
  nowISO: string,
): DownloadCheck {
  const lastMs = lastISO ? toUtc(lastISO) : Number.NaN;
  if (Number.isNaN(lastMs)) {
    // Nigdy nie sczytano (lub błędna data) → traktuj jak po terminie.
    return { kind, lastISO: "", dueISO: "", daysLeft: NO_DATE, status: "overdue" };
  }
  const dueMs = lastMs + limitDays(kind) * DAY;
  const daysLeft = Math.round((dueMs - toUtc(nowISO)) / DAY);
  const status: DownloadStatus =
    daysLeft < 0 ? "overdue" : daysLeft <= DOWNLOAD_LIMITS.soonDays ? "soon" : "ok";
  return { kind, lastISO: fromUtc(lastMs), dueISO: fromUtc(dueMs), daysLeft, status };
}

export interface DownloadItem {
  kind: DownloadKind;
  lastISO: string | null;
  /** Etykieta do UI (rejestracja / nazwisko kierowcy). */
  label?: string;
}

export interface DownloadReport {
  /** Posortowane rosnąco po `daysLeft` (najpilniejsze pierwsze). */
  items: (DownloadCheck & { label?: string })[];
  overdue: number;
  soon: number;
  ok: number;
  /** Najgorszy status w zestawie (pusty zestaw → "ok"). */
  worst: DownloadStatus;
}

/** Zbiorczy przegląd terminów sczytań dla floty/kierowców. */
export function checkDownloads(items: DownloadItem[], nowISO: string): DownloadReport {
  const checked = items
    .map((it) => ({ ...checkDownload(it.kind, it.lastISO, nowISO), label: it.label }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const overdue = checked.filter((c) => c.status === "overdue").length;
  const soon = checked.filter((c) => c.status === "soon").length;
  const ok = checked.length - overdue - soon;
  const worst: DownloadStatus = overdue ? "overdue" : soon ? "soon" : "ok";
  return { items: checked, overdue, soon, ok, worst };
}
