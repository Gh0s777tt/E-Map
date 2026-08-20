/**
 * [#403] Statystyki usterek — z danych, które leżą w bazie od dawna.
 *
 * Zgłoszenia usterek (`vehicle_defects`) zbierały się od czasu wprowadzenia
 * modułu kontroli pojazdu: kierowca zgłasza, mechanik zamyka. Powstała z tego
 * historia awaryjności całej floty — i nikt jej dotąd nie czytał. Ekran zgłoszeń
 * pokazuje listę, panel uwag pokazuje otwarte pozycje, ale żadne miejsce nie
 * odpowiada na pytania, które przewoźnik zadaje sobie przy planowaniu wymian:
 *
 *   • który ciągnik psuje się częściej niż reszta floty,
 *   • co się psuje najczęściej (czyli co warto trzymać w magazynie),
 *   • ile średnio auto czeka na naprawę,
 *   • czy najstarsze otwarte zgłoszenie nie leży od pół roku.
 *
 * Zasady liczenia — spisane, bo każda z nich to decyzja, nie oczywistość:
 *
 * 1. NIE liczymy „awaryjności na 100 tys. km", choć to najbardziej naturalna
 *    miara. Przebieg pochodzi z tankowań, których wiele wpisów nie ma, a wskaźnik
 *    policzony z niepełnego licznika wygląda tak samo jak policzony z pełnego.
 *    Zamiast wskaźnika opartego na zgadywanym mianowniku dajemy liczby surowe —
 *    porównywalne między pojazdami tej samej floty, bo dotyczą tego samego okresu.
 *
 * 2. Czas naprawy liczymy WYŁĄCZNIE dla zgłoszeń zamkniętych i mających obie
 *    daty. Zgłoszenie otwarte nie ma czasu naprawy — ma wiek, a to inna wielkość
 *    i pokazujemy ją osobno. Wliczenie otwartych jako „0 dni" zaniżałoby średnią
 *    dokładnie tam, gdzie problem jest największy.
 *
 * 3. Wiek najstarszego otwartego zgłoszenia jest osobną liczbą, nie średnią.
 *    Średnia wieku otwartych zgłoszeń jest myląca: dziesięć świeżych ukryje
 *    jedno leżące od pół roku, a to właśnie ono jest informacją.
 */

import type { DefectSeverity, DefectStatus } from "./enums";

/** Zgłoszenie w postaci, w jakiej liczy je ten moduł (bez zależności od bazy). */
export interface DefectEntry {
  vehicleId: string | null;
  /** Nazwa części — tekst wpisywany przez kierowcę, więc normalizujemy przy grupowaniu. */
  part: string | null;
  severity: DefectSeverity | null;
  status: DefectStatus | null;
  /** Zapalona kontrolka na desce — sygnał, że usterka jest widoczna dla kierowcy. */
  dashboardLight?: boolean | null;
  /** Data zgłoszenia (ISO). */
  createdAt: string;
  /** Data zamknięcia (ISO) — tylko dla `resolved`. */
  resolvedAt?: string | null;
}

export interface VehicleDefectStats {
  vehicleId: string;
  wszystkie: number;
  otwarte: number;
  wTrakcie: number;
  zamkniete: number;
  powazne: number;
  zKontrolka: number;
  /** Średni czas naprawy w dniach — `null`, gdy nie zamknięto ani jednego zgłoszenia. */
  sredniCzasNaprawyDni: number | null;
  /** Wiek najstarszego NIEZAMKNIĘTEGO zgłoszenia w dniach — `null`, gdy brak otwartych. */
  najstarszeOtwarteDni: number | null;
}

export interface PartDefectStats {
  /** Nazwa części po normalizacji (małe litery, bez zbędnych spacji). */
  czesc: string;
  /** Zapis oryginalny — do pokazania człowiekowi. */
  etykieta: string;
  wszystkie: number;
  otwarte: number;
  powazne: number;
  sredniCzasNaprawyDni: number | null;
}

export interface DefectSummary {
  wszystkie: number;
  otwarte: number;
  wTrakcie: number;
  zamkniete: number;
  powazne: number;
  zKontrolka: number;
  sredniCzasNaprawyDni: number | null;
  najstarszeOtwarteDni: number | null;
  /** Ile zgłoszeń nie ma przypisanego pojazdu — nie da się ich policzyć per auto. */
  bezPojazdu: number;
  wgPojazdu: VehicleDefectStats[];
  wgCzesci: PartDefectStats[];
}

const DZIEN_MS = 86_400_000;

/** Różnica w pełnych dniach; `null`, gdy któraś data jest nieczytelna. */
function dni(od: string, do_: string): number | null {
  const a = Date.parse(od);
  const b = Date.parse(do_);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  // Ujemna różnica znaczy, że dane są sprzeczne (zamknięto przed zgłoszeniem).
  // Zwracamy `null` zamiast liczby ujemnej: taki wpis ma zniknąć ze średniej,
  // a nie ją zaniżać.
  const roznica = b - a;
  return roznica < 0 ? null : Math.round(roznica / DZIEN_MS);
}

function srednia(wartosci: number[]): number | null {
  if (wartosci.length === 0) return null;
  const suma = wartosci.reduce((a, b) => a + b, 0);
  return Math.round((suma / wartosci.length) * 10) / 10;
}

/** Normalizacja nazwy części — kierowcy piszą „Hamulce", „hamulce ", „HAMULCE". */
function kluczCzesci(part: string | null): string | null {
  const t = (part ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return t.length > 0 ? t : null;
}

/**
 * Podsumowanie usterek floty.
 *
 * @param teraz moment odniesienia dla wieku otwartych zgłoszeń (ISO). Podawany
 *   jawnie, a nie brany z `Date.now()`, żeby wynik był powtarzalny w testach
 *   i identyczny dla całego renderu — inaczej dwie sekcje tego samego ekranu
 *   potrafiłyby pokazać wiek różniący się o dzień.
 */
export function summarizeDefects(entries: readonly DefectEntry[], teraz: string): DefectSummary {
  const perPojazd = new Map<
    string,
    { wpisy: DefectEntry[]; naprawy: number[]; wiekOtwartych: number[] }
  >();
  const perCzesc = new Map<string, { etykieta: string; wpisy: DefectEntry[]; naprawy: number[] }>();

  const naprawyOgolem: number[] = [];
  let najstarszeOtwarte: number | null = null;
  let bezPojazdu = 0;

  const jestOtwarte = (e: DefectEntry) => e.status !== "resolved";

  for (const e of entries) {
    const czasNaprawy =
      e.status === "resolved" && e.resolvedAt ? dni(e.createdAt, e.resolvedAt) : null;
    if (czasNaprawy != null) naprawyOgolem.push(czasNaprawy);

    if (jestOtwarte(e)) {
      const wiek = dni(e.createdAt, teraz);
      if (wiek != null && (najstarszeOtwarte == null || wiek > najstarszeOtwarte)) {
        najstarszeOtwarte = wiek;
      }
    }

    if (e.vehicleId) {
      const biezacy = perPojazd.get(e.vehicleId) ?? { wpisy: [], naprawy: [], wiekOtwartych: [] };
      biezacy.wpisy.push(e);
      if (czasNaprawy != null) biezacy.naprawy.push(czasNaprawy);
      if (jestOtwarte(e)) {
        const wiek = dni(e.createdAt, teraz);
        if (wiek != null) biezacy.wiekOtwartych.push(wiek);
      }
      perPojazd.set(e.vehicleId, biezacy);
    } else {
      // Zgłoszenie bez pojazdu nie znika z sumy ogólnej — ale liczymy je osobno,
      // żeby suma po pojazdach nie wyglądała na niezgodną z sumą całkowitą.
      bezPojazdu += 1;
    }

    const klucz = kluczCzesci(e.part);
    if (klucz) {
      const biezaca = perCzesc.get(klucz) ?? {
        etykieta: (e.part ?? "").trim(),
        wpisy: [],
        naprawy: [],
      };
      biezaca.wpisy.push(e);
      if (czasNaprawy != null) biezaca.naprawy.push(czasNaprawy);
      perCzesc.set(klucz, biezaca);
    }
  }

  const wgPojazdu: VehicleDefectStats[] = [...perPojazd.entries()]
    .map(([vehicleId, v]) => ({
      vehicleId,
      wszystkie: v.wpisy.length,
      otwarte: v.wpisy.filter((e) => e.status === "open").length,
      wTrakcie: v.wpisy.filter((e) => e.status === "in_progress").length,
      zamkniete: v.wpisy.filter((e) => e.status === "resolved").length,
      powazne: v.wpisy.filter((e) => e.severity === "high").length,
      zKontrolka: v.wpisy.filter((e) => e.dashboardLight === true).length,
      sredniCzasNaprawyDni: srednia(v.naprawy),
      najstarszeOtwarteDni: v.wiekOtwartych.length > 0 ? Math.max(...v.wiekOtwartych) : null,
    }))
    // Sortowanie po liczbie zgłoszeń: pierwszy wiersz ma być tym pojazdem,
    // o którym właściciel naprawdę powinien porozmawiać z mechanikiem.
    .sort((a, b) => b.wszystkie - a.wszystkie || a.vehicleId.localeCompare(b.vehicleId));

  const wgCzesci: PartDefectStats[] = [...perCzesc.entries()]
    .map(([czesc, v]) => ({
      czesc,
      etykieta: v.etykieta,
      wszystkie: v.wpisy.length,
      otwarte: v.wpisy.filter(jestOtwarte).length,
      powazne: v.wpisy.filter((e) => e.severity === "high").length,
      sredniCzasNaprawyDni: srednia(v.naprawy),
    }))
    .sort((a, b) => b.wszystkie - a.wszystkie || a.czesc.localeCompare(b.czesc));

  return {
    wszystkie: entries.length,
    otwarte: entries.filter((e) => e.status === "open").length,
    wTrakcie: entries.filter((e) => e.status === "in_progress").length,
    zamkniete: entries.filter((e) => e.status === "resolved").length,
    powazne: entries.filter((e) => e.severity === "high").length,
    zKontrolka: entries.filter((e) => e.dashboardLight === true).length,
    sredniCzasNaprawyDni: srednia(naprawyOgolem),
    najstarszeOtwarteDni: najstarszeOtwarte,
    bezPojazdu,
    wgPojazdu,
    wgCzesci,
  };
}
