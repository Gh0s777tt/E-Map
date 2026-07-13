/**
 * #328: Parser odczytu karty kierowcy (.ddd / .esm) — Gen1 i Gen2.
 * Czyta bloki TLV pliku pobrania (FID + typ + długość), wyciąga
 * EF_Identification (imię i nazwisko posiadacza) oraz
 * EF_Driver_Activity_Data (bufor cykliczny dziennych rejestrów aktywności)
 * i zamienia je na dni z minutami jazdy/pracy/dyspozycji/odpoczynku
 * + wykrywa naruszenia 561/2006 (jazda ciągła >4h30, dobowa >9h/10h).
 *
 * Struktury wg zał. 1B/1C rozporządzenia 3821/85 / 165/2014 (ESM).
 * Parser jest TOLERANCYJNY: nieznane bloki pomija, uszkodzone rekordy
 * ucina — zawsze zwraca to, co dało się odczytać.
 */

export type DddActivity = "rest" | "availability" | "work" | "driving";

export interface DddActivityChange {
  /** Minuta doby UTC (0–1439). */
  minute: number;
  activity: DddActivity;
  /** Slot karty: 0 = kierowca, 1 = drugi kierowca. */
  slot: 0 | 1;
  /** Karta wyjęta w tym okresie (wpis manualny / brak karty). */
  cardAbsent: boolean;
}

export interface DddDay {
  /** Data doby (YYYY-MM-DD, UTC). */
  date: string;
  /** Dystans dobowy z licznika karty [km]. */
  distanceKm: number;
  changes: DddActivityChange[];
  /** Sumy minut per aktywność (do końca doby). */
  totals: Record<DddActivity, number>;
  /** Naruszenia wykryte w tej dobie. */
  violations: string[];
}

export interface DddParseResult {
  holderName: string | null;
  generation: 1 | 2 | null;
  days: DddDay[];
  /** Ostrzeżenia parsera (np. ucięty bufor). */
  warnings: string[];
}

const FID_IDENTIFICATION = 0x0520;
const FID_ACTIVITY = 0x0504;

const ACTIVITIES: DddActivity[] = ["rest", "availability", "work", "driving"];

function u16(b: Uint8Array, o: number): number {
  return ((b[o] ?? 0) << 8) | (b[o + 1] ?? 0);
}

/** Nazwa z pola Name (1 bajt strony kodowej + 35 znaków latin1). */
function readName(b: Uint8Array, o: number): string {
  let out = "";
  for (let i = o + 1; i < o + 36 && i < b.length; i++) {
    const c = b[i] ?? 0;
    out += c >= 32 && c !== 0xff ? String.fromCharCode(c) : " ";
  }
  return out.trim().replace(/\s+/g, " ");
}

function dateOf(epochSec: number): string {
  return new Date(epochSec * 1000).toISOString().slice(0, 10);
}

/** Dekoduje 2-bajtowy ActivityChangeInfo: 'scpaat tttttttttt'. */
export function decodeActivityChange(word: number): DddActivityChange {
  return {
    slot: ((word >> 15) & 1) as 0 | 1,
    cardAbsent: ((word >> 13) & 1) === 1,
    activity: ACTIVITIES[(word >> 11) & 0b11] as DddActivity,
    minute: word & 0x7ff,
  };
}

/** Sumy minut i naruszenia 561 dla jednej doby. */
function summarizeDay(date: string, distanceKm: number, changes: DddActivityChange[]): DddDay {
  const sorted = [...changes].sort((a, b) => a.minute - b.minute);
  const totals: Record<DddActivity, number> = { rest: 0, availability: 0, work: 0, driving: 0 };
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (!cur || cur.minute > 1439) continue;
    const next = sorted[i + 1];
    const end = next ? Math.min(next.minute, 1440) : 1440;
    totals[cur.activity] += Math.max(0, end - cur.minute);
  }

  const violations: string[] = [];
  if (totals.driving > 600) violations.push("daily-driving-over-10h");
  // Jazda ciągła: licz do przerwy kwalifikowanej (45 min lub 15+30).
  let acc = 0;
  let splitFirst = false;
  let flagged = false;
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (!cur) continue;
    const next = sorted[i + 1];
    const dur = (next ? Math.min(next.minute, 1440) : 1440) - cur.minute;
    if (dur <= 0) continue;
    if (cur.activity === "driving") {
      acc += dur;
      if (acc > 270 && !flagged) {
        violations.push("continuous-driving-over-4h30");
        flagged = true;
      }
    } else if (cur.activity === "rest" || cur.activity === "availability") {
      if (dur >= 45 || (splitFirst && dur >= 30)) {
        acc = 0;
        splitFirst = false;
        flagged = false;
      } else if (dur >= 15) {
        splitFirst = true;
      }
    }
  }
  return { date, distanceKm, changes: sorted, totals, violations };
}

/** Parsuje EF_Driver_Activity_Data (bufor cykliczny dziennych rejestrów). */
function parseActivityData(data: Uint8Array, warnings: string[]): DddDay[] {
  if (data.length < 8) return [];
  const oldest = u16(data, 0);
  const buf = data.subarray(4);
  const len = buf.length;
  const days: DddDay[] = [];
  let ptr = oldest % Math.max(1, len);
  const read = (o: number) => buf[o % len] ?? 0;
  const readU16 = (o: number) => (read(o) << 8) | read(o + 1);
  const readU32 = (o: number) =>
    read(o) * 0x1000000 + ((read(o + 1) << 16) | (read(o + 2) << 8) | read(o + 3));

  for (let guard = 0; guard < 400; guard++) {
    const recLen = readU16(ptr + 2);
    if (recLen < 12 || recLen > len) break;
    const epoch = readU32(ptr + 4);
    // sensowny zakres dat: 2000–2100
    if (epoch > 946684800 && epoch < 4102444800) {
      const distanceKm = readU16(ptr + 10);
      const nChanges = Math.floor((recLen - 12) / 2);
      const changes: DddActivityChange[] = [];
      for (let i = 0; i < nChanges; i++) {
        const word = readU16(ptr + 12 + i * 2);
        const ch = decodeActivityChange(word);
        if (ch.minute <= 1439) changes.push(ch);
      }
      days.push(summarizeDay(dateOf(epoch), distanceKm, changes));
    } else if (days.length > 0) {
      break; // koniec sensownych rekordów
    }
    ptr = (ptr + recLen) % len;
    if (days.length >= 370) {
      warnings.push("activity-buffer-truncated");
      break;
    }
  }
  // dedup po dacie (bufor cykliczny może zahaczyć o nadpisane) + sort
  const byDate = new Map<string, DddDay>();
  for (const d of days) byDate.set(d.date, d);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Parsuje cały plik .ddd karty kierowcy (Gen1 + Gen2). */
export function parseDddDriverCard(bytes: Uint8Array): DddParseResult {
  const warnings: string[] = [];
  let holderName: string | null = null;
  let generation: 1 | 2 | null = null;
  let days: DddDay[] = [];

  let o = 0;
  let guard = 0;
  while (o + 5 <= bytes.length && guard++ < 10_000) {
    const fid = u16(bytes, o);
    const type = bytes[o + 2] ?? 0;
    const len = u16(bytes, o + 3);
    const payload = bytes.subarray(o + 5, o + 5 + len);
    if (payload.length < len) {
      warnings.push("file-truncated");
      break;
    }
    const isData = type === 0x00 || type === 0x02;
    if (isData && fid === FID_IDENTIFICATION && payload.length >= 65 + 72) {
      // CardIdentification (65 B) + DriverCardHolderIdentification (nazwisko 36 + imiona 36)
      const surname = readName(payload, 65);
      const first = readName(payload, 65 + 36);
      const name = `${first} ${surname}`.trim();
      if (name) holderName = name;
    }
    if (isData && fid === FID_ACTIVITY && payload.length > 12) {
      generation = type === 0x02 ? 2 : 1;
      const parsed = parseActivityData(payload, warnings);
      if (parsed.length > days.length) days = parsed; // preferuj bogatszy zapis (gen2)
    }
    o += 5 + len;
  }
  if (o === 0 || (days.length === 0 && !holderName)) warnings.push("no-known-blocks");
  return { holderName, generation, days, warnings };
}
