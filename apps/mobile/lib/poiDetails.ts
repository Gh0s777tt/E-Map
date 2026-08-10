/**
 * [#383] Szczegóły POI z mapy — z tagów, które JUŻ przychodzą z Overpass.
 *
 * DLACZEGO TO ISTNIEJE: `Poi.tags` (packages/maps/src/poi.ts) niesie komplet tagów OSM
 * — `addr:*`, `brand`, `operator`, `phone`, `website`, `opening_hours` — a karta na
 * telefonie pokazywała z tego jedną linijkę: nazwę. Dane były pobrane i wyrzucone tuż
 * przed renderem. Kierowca stojący 40 km od stacji nie wiedział ani czy jest otwarta,
 * ani pod jaki numer zadzwonić.
 *
 * Zasada: nie dopowiadamy. Brak tagu = brak wiersza; brak `opening_hours` = „brak
 * danych o godzinach", nigdy „zamknięte". Parsowanie godzin robi `@e-logistic/core`
 * (`getOpeningHoursStatus`), które przy zapisie spoza swojego podzbioru zwraca
 * `unknown` — wtedy pokazujemy surowy zapis z OSM zamiast zgadywać jego znaczenie.
 */
import {
  describeOpeningWeek,
  getOpeningHoursStatus,
  localMomentFromDate,
  type OpeningHoursStatus,
  type OpeningHoursWeek,
} from "@e-logistic/core";
import type { Poi } from "@e-logistic/maps";

export interface PoiContact {
  /** Marka sieci (`brand`) lub operator (`operator`) — kierowca tankuje „na markę". */
  brand: string | null;
  /** Adres złożony z `addr:*`; `null` gdy OSM go nie ma. */
  address: string | null;
  /** Numer do pokazania (pierwszy z listy `;`, tak jak zapisano w OSM). */
  phone: string | null;
  /** Ten sam numer w formie `tel:` — `null`, jeśli w zapisie nie ma cyfr do wybrania. */
  phoneUri: string | null;
  /** Strona bez schematu (do pokazania) i z pełnym URL (do otwarcia). */
  website: string | null;
  websiteUri: string | null;
}

export interface PoiHours {
  /** Surowa wartość tagu `opening_hours` — pokazujemy ją, gdy parser jej nie rozumie. */
  raw: string | null;
  status: OpeningHoursStatus;
  week: OpeningHoursWeek;
}

/** Pierwsza niepusta wartość spośród podanych tagów. */
function firstTag(tags: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * OSM dopuszcza kilka numerów rozdzielonych `;`. Bierzemy pierwszy — lista w jednej
 * linijce karty i tak byłaby nieczytelna, a dzwoni się pod jeden.
 */
function firstOf(value: string): string {
  const head = value.split(";")[0]?.trim() ?? "";
  return head || value.trim();
}

/**
 * `tel:` przyjmuje tylko `+` i cyfry — reszta (spacje, nawiasy, myślniki) rozwala
 * intent na części telefonów. Bez ani jednej cyfry nie ma czego wybierać, więc `null`
 * i przycisk się nie pojawia (martwy przycisk jest gorszy niż jego brak).
 */
export function telUri(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.length < 3) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/** Adres z `addr:*` — „ulica numer, kod miasto". Puste człony pomijamy. */
export function poiAddress(tags: Record<string, string>): string | null {
  const street = tags["addr:street"]?.trim() ?? "";
  const house = tags["addr:housenumber"]?.trim() ?? "";
  const postcode = tags["addr:postcode"]?.trim() ?? "";
  const city = (tags["addr:city"] ?? tags["addr:place"])?.trim() ?? "";
  const line1 = [street, house].filter(Boolean).join(" ");
  const line2 = [postcode, city].filter(Boolean).join(" ");
  const full = [line1, line2].filter(Boolean).join(", ");
  return full || null;
}

export function poiContact(tags: Record<string, string>): PoiContact {
  const phoneRaw = firstTag(tags, ["phone", "contact:phone"]);
  const phone = phoneRaw ? firstOf(phoneRaw) : null;
  const siteRaw = firstTag(tags, ["website", "contact:website"]);
  const site = siteRaw ? firstOf(siteRaw) : null;
  return {
    brand: firstTag(tags, ["brand", "operator"]),
    address: poiAddress(tags),
    phone,
    phoneUri: phone ? telUri(phone) : null,
    website: site ? site.replace(/^https?:\/\//i, "").replace(/\/$/, "") : null,
    websiteUri: site ? (/^https?:\/\//i.test(site) ? site : `https://${site}`) : null,
  };
}

/**
 * Godziny otwarcia POI.
 *
 * `now` jest parametrem, a nie `new Date()` w środku — dzięki temu wynik da się
 * przetestować, a wołający świadomie decyduje, jaki czas przykłada. Strefy POI nie
 * znamy (OSM jej nie podaje), więc status liczymy wg zegara telefonu i UI MUSI to
 * napisać wprost — inaczej „otwarte do 22:00" udawałoby wiedzę, której nie mamy
 * dla stacji po drugiej stronie granicy czasowej.
 */
export function poiHours(tags: Record<string, string>, now: Date): PoiHours {
  const raw = tags.opening_hours?.trim() || null;
  return {
    raw,
    status: getOpeningHoursStatus(raw, localMomentFromDate(now)),
    week: describeOpeningWeek(raw),
  };
}

/** Wygodny skrót dla karty POI: kontakt + godziny w jednym wywołaniu. */
export function poiDetails(poi: Poi, now: Date): { contact: PoiContact; hours: PoiHours } {
  return { contact: poiContact(poi.tags), hours: poiHours(poi.tags, now) };
}
