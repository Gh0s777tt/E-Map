import type { SavedPlace } from "@e-logistic/api";
import {
  describeOpeningWeek,
  getOpeningHoursStatus,
  localMomentFromDate,
  type OpeningHoursMoment,
  SAVED_PLACE_CATEGORIES,
  type SavedPlaceCategory,
  type Weekday,
} from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import type { LatLng, Poi, TollSection, TrafficIncident } from "@e-logistic/maps";
import { REPORT_COLOR, REPORT_LABEL, SAVED_CAT_ICON } from "./mapTheme";
import type { Report } from "./mapTypes";

/** Tłumacz z `useT()` — przekazywany do buildera HTML, bo dymki powstają poza Reactem. */
type Translate = (key: MessageKey) => string;

/** GeoJSON linii trasy z pary [lng, lat]. */
export function routeFeature(coords: [number, number][]) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: coords },
      },
    ],
  };
}

/** GeoJSON punktów POI (nazwa + typ). */
export function poiFeatures(pois: Poi[]) {
  return {
    type: "FeatureCollection" as const,
    features: pois.map((p) => ({
      type: "Feature" as const,
      properties: { id: p.id, name: p.name ?? "", type: p.type },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] as [number, number] },
    })),
  };
}

/**
 * #367: GeoJSON zapisanych miejsc firmy — ikona kategorii (SAVED_CAT_ICON) leci
 * w properties jako `icon` i trafia do `text-field` warstwy symbol. `category`
 * z bazy to zwykły string, więc nieznana wartość spada na „other" (jak w chipsach).
 */
export function savedFeatures(places: SavedPlace[]) {
  return {
    type: "FeatureCollection" as const,
    features: places.map((p) => {
      const cat: SavedPlaceCategory = (SAVED_PLACE_CATEGORIES as readonly string[]).includes(
        p.category,
      )
        ? (p.category as SavedPlaceCategory)
        : "other";
      return {
        type: "Feature" as const,
        properties: { id: p.id, name: p.name, icon: SAVED_CAT_ICON[cat] },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] as [number, number] },
      };
    }),
  };
}

/** GeoJSON incydentów ruchu TomTom (punkty; kolor liczony w warstwie wg severity). */
export function incidentFeatures(incidents: TrafficIncident[]) {
  return {
    type: "FeatureCollection" as const,
    features: incidents.map((i) => ({
      type: "Feature" as const,
      properties: { id: i.id, severity: i.severity, description: i.description },
      geometry: {
        type: "Point" as const,
        coordinates: [i.point.lng, i.point.lat] as [number, number],
      },
    })),
  };
}

/**
 * [#383] Odcinki płatne trasy jako linie GeoJSON.
 *
 * `TollSection` niesie INDEKSY w `RouteResult.geometry` (obustronnie domknięte), a nie
 * gotowe współrzędne — dzięki temu odpowiedź `/api/route` nie dubluje geometrii trasy
 * (patrz komentarz przy typie w packages/maps/src/types.ts). Cena tej decyzji jest
 * płacona TUTAJ: to jedyne miejsce, które składa punkty w linię.
 *
 * Odcinek, z którego wychodzi mniej niż 2 punkty, nie jest linią i zostaje pominięty —
 * MapLibre narysowałby wtedy nic, a użytkownik odczytałby to jako „tu nie ma opłat".
 */
export function tollSectionFeatures(geometry: LatLng[], sections: TollSection[]) {
  const features = [];
  for (const s of sections) {
    const points = geometry.slice(s.startIndex, s.endIndex + 1);
    if (points.length < 2) continue;
    features.push({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: points.map((p) => [p.lng, p.lat] as [number, number]),
      },
    });
  }
  return { type: "FeatureCollection" as const, features };
}

/** GeoJSON zgłoszeń na mapie (etykieta + kolor wg typu). `t` tłumaczy etykietę do popupu. */
export function reportFeatures(reports: Report[], t: (key: MessageKey) => string) {
  return {
    type: "FeatureCollection" as const,
    features: reports.map((r) => ({
      type: "Feature" as const,
      properties: {
        label: t(REPORT_LABEL[r.type]),
        color: REPORT_COLOR[r.type],
        comment: r.comment ?? "",
      },
      geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] as [number, number] },
    })),
  };
}

/* ═══════════════════ dymki (HTML poza Reactem) — [#383] ═══════════════════ */

/**
 * #367: ucieczka HTML dla danych wstawianych do `Popup.setHTML`.
 *
 * Dotyczy KAŻDEGO tekstu spoza katalogu i18n: komentarze zgłoszeń (wolny tekst dowolnego
 * zalogowanego użytkownika, a warstwa `map_reports` jest wspólna dla wszystkich firm),
 * nazwy i tagi POI z OSM/Overpass (publicznie edytowalne), opisy incydentów TomTom
 * i etykiety przystanków z geokodera. Bez tego wystarczyłby jeden wpis z
 * `<img src=x onerror=…>`, by kod wykonał się u każdego, kto kliknie pinezkę.
 * Apostrof też uciekamy — helper bywa używany wewnątrz atrybutów.
 *
 * [#383] Przeniesione z `page.tsx` do modułu współdzielonego: bogaty dymek POI wstawia
 * teraz komplet tagów OSM (adres, marka, telefon, strona, godziny), więc builder HTML
 * i ucieczka muszą mieszkać razem — inaczej łatwo dopisać pole, które ją omija.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * [#383] Klucze, pod którymi POI z TomTom trafiają do wspólnego worka `Poi.tags`.
 * `addr:full` to prawdziwy tag OSM, więc adres z TomTom i adres z Overpassa czyta
 * ta sama gałąź. Dystans nie ma odpowiednika w OSM — prefiks `x:` mówi wprost,
 * że to pole nasze, a nie z mapy.
 */
export const POI_TAG_ADDRESS = "addr:full";
export const POI_TAG_DISTANCE_M = "x:distance_m";

/** Kolejność Mo..Su — indeks odpowiada `Weekday` z parsera godzin otwarcia. */
const WEEKDAY_LABEL: MessageKey[] = [
  "mapPage.dayMo",
  "mapPage.dayTu",
  "mapPage.dayWe",
  "mapPage.dayTh",
  "mapPage.dayFr",
  "mapPage.daySa",
  "mapPage.daySu",
];

const POPUP_MUTED = "#a3a3a3";
const POPUP_OPEN = "#22c55e";
const POPUP_CLOSED = "#E50914";

/**
 * [#383] Adres do `href` — WYŁĄCZNIE http/https.
 *
 * `escapeHtml` tu nie wystarcza: poprawnie zacytowany `javascript:alert(1)` w atrybucie
 * `href` nadal się wykonuje po kliknięciu, a `website=` w OSM może wpisać każdy.
 * Brak schematu jest w OSM częsty („example.com"), więc dokładamy `https://` — ale
 * tylko wtedy, gdy schematu NIE MA; nie podmieniamy istniejącego.
 */
function safeHttpUrl(raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  if (value === "") return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Host bez „www." — w dymku pokazujemy krótką etykietę, a nie cały adres. */
function hostLabel(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * [#383] `tel:` tylko dla czegoś, co wygląda jak numer. Gdy tag zawiera kilka numerów
 * albo komentarz, zostaje sam tekst — lepiej nie dać linku niż dać link donikąd.
 */
function safeTelHref(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  return /^\+?\d{5,15}$/.test(cleaned) ? `tel:${cleaned}` : null;
}

/** Adres z tagów: `addr:full` (TomTom/OSM) albo złożony z `addr:*`. */
function poiAddress(tags: Record<string, string>): string {
  const full = (tags[POI_TAG_ADDRESS] ?? "").trim();
  if (full) return full;
  const line1 = [tags["addr:street"], tags["addr:housenumber"]]
    .filter((v) => v?.trim())
    .join(" ")
    .trim();
  const line2 = [tags["addr:postcode"], tags["addr:city"]]
    .filter((v) => v?.trim())
    .join(" ")
    .trim();
  return [line1, line2].filter(Boolean).join(", ");
}

/** Dystans z TomTom (metry) → czytelna etykieta. Pusty/nieliczbowy = brak wiersza. */
function distanceLabel(raw: string | undefined): string | null {
  const meters = Number(raw);
  if (!Number.isFinite(meters) || meters < 0) return null;
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function weekdayLabel(day: Weekday, t: Translate): string {
  const key = WEEKDAY_LABEL[day];
  return key ? t(key) : "";
}

/** „22:00" gdy to dziś, „pt. 22:00" gdy innego dnia — bez zgadywania daty. */
function momentLabel(moment: OpeningHoursMoment, today: Weekday | null, t: Translate): string {
  const time = escapeHtml(moment.time);
  return today !== null && moment.weekday === today
    ? time
    : `${weekdayLabel(moment.weekday, t)} ${time}`;
}

/**
 * [#383] Godziny otwarcia POI: status „otwarte teraz / zamknięte / brak danych" + rozkład tygodnia.
 *
 * Trzy rzeczy, których ten kod świadomie NIE robi:
 *  1. nie zamienia braku danych na „zamknięte" — parser zwraca `unknown` i tak to pokazujemy;
 *  2. nie udaje, że rozumie napis, którego nie rozumie — pokazuje wtedy surową wartość tagu,
 *     żeby kierowca mógł przeczytać ją sam;
 *  3. nie twierdzi, że zna strefę czasową obiektu. `localMomentFromDate` bez strefy liczy
 *     wg zegara przeglądarki, więc status dostaje dopisek o tym wprost — stacja za granicą
 *     może być w innej strefie, a „otwarte do 22:00" to obietnica, za którą ktoś jedzie 40 km.
 */
function openingHoursHtml(raw: string | undefined, t: Translate, now: Date): string {
  const moment = localMomentFromDate(now);
  const status = getOpeningHoursStatus(raw, moment);
  const week = describeOpeningWeek(raw);
  const today = moment?.weekday ?? null;

  let color = POPUP_MUTED;
  let text: string;
  if (status.state === "open") {
    color = POPUP_OPEN;
    text =
      status.closesAt === null
        ? t("mapPage.hoursOpen247")
        : `${t("mapPage.hoursOpenNow")} · ${t("mapPage.hoursUntil")} ${momentLabel(status.closesAt, today, t)}`;
  } else if (status.state === "closed") {
    color = POPUP_CLOSED;
    text =
      status.opensAt === null
        ? t("mapPage.hoursClosedNow")
        : `${t("mapPage.hoursClosedNow")} · ${t("mapPage.hoursOpensAt")} ${momentLabel(status.opensAt, today, t)}`;
  } else {
    // Powód bierzemy z `describeOpeningWeek`, bo ono nie zależy od zegara: dzięki temu
    // „nie umiemy odczytać tego zapisu" nie zamienia się w mylące „brak danych".
    text =
      week.unknownReason === "unsupported-format"
        ? t("mapPage.hoursUnreadable")
        : t("mapPage.hoursNoData");
  }
  if (status.holidaysUnknown) text += ` ${t("mapPage.hoursExceptHolidays")}`;

  const lines: string[] = [
    `<div style="margin-top:6px;border-top:1px solid #2a2a2a;padding-top:6px">`,
    `<span style="color:${POPUP_MUTED}">🕒 ${t("mapPage.openingHours")}:</span> `,
    `<strong style="color:${color}">${text}</strong>`,
    `</div>`,
  ];

  if (status.state === "unknown" && week.unknownReason === "unsupported-format" && raw) {
    lines.push(
      `<div style="color:${POPUP_MUTED};font-size:11px"><code>${escapeHtml(raw)}</code></div>`,
    );
  }

  if (week.known && !week.alwaysOpen) {
    const rows = week.groups.map((g) => {
      const days =
        g.from === g.to
          ? weekdayLabel(g.from, t)
          : `${weekdayLabel(g.from, t)}–${weekdayLabel(g.to, t)}`;
      const hours =
        g.ranges.length > 0 ? escapeHtml(g.ranges.join(", ")) : t("mapPage.hoursDayClosed");
      return `<div style="display:flex;justify-content:space-between;gap:10px"><span style="color:${POPUP_MUTED}">${days}</span><span>${hours}</span></div>`;
    });
    lines.push(`<div style="margin-top:3px;font-size:12px">${rows.join("")}</div>`);
  }

  if (status.state !== "unknown") {
    lines.push(
      `<div style="color:${POPUP_MUTED};font-size:11px;margin-top:2px">${t("mapPage.hoursLocalClock")}</div>`,
    );
  }

  return lines.join("");
}

/**
 * [#383] Szczegóły POI do dymka: adres, marka/operator, telefon, strona, dystans (TomTom)
 * i godziny otwarcia ze statusem.
 *
 * DLACZEGO OSOBNA FUNKCJA, A NIE SZERSZY GeoJSON: warstwa `pois` niesie w properties tylko
 * `{id, name, type}`, bo MapLibre trzyma properties każdego punktu w pamięci GPU/JS na
 * potrzeby stylowania, a tagów OSM bywa kilkanaście na obiekt. Komplet i tak mamy w
 * `poisRef` po stronie strony, więc dymek dobiera go po `id` — dane, za które już
 * zapłaciliśmy zapytaniem, nie giną, a warstwa zostaje lekka.
 *
 * Pusty wynik gdy POI nie znaleziono (np. warstwa przeżyła zmianę filtra) — dymek
 * pokaże wtedy to, co miał wcześniej, zamiast zmyślać.
 */
export function poiDetailsHtml(poi: Poi | undefined, t: Translate, now: Date): string {
  if (!poi) return "";
  const tags = poi.tags ?? {};
  const parts: string[] = [];

  const address = poiAddress(tags);
  if (address) parts.push(`<div style="margin-top:2px">📮 ${escapeHtml(address)}</div>`);

  const brand = (tags.brand ?? "").trim();
  const operator = (tags.operator ?? "").trim();
  const owner =
    brand && operator && brand !== operator ? `${brand} · ${operator}` : brand || operator;
  if (owner) parts.push(`<div>🏷️ ${escapeHtml(owner)}</div>`);

  const phone = (tags.phone ?? tags["contact:phone"] ?? "").trim();
  if (phone) {
    const href = safeTelHref(phone);
    const body = href
      ? `<a href="${escapeHtml(href)}">${escapeHtml(phone)}</a>`
      : escapeHtml(phone);
    parts.push(`<div>📞 ${body}</div>`);
  }

  const website = safeHttpUrl(tags.website ?? tags["contact:website"] ?? tags.url);
  if (website) {
    parts.push(
      `<div>🌐 <a href="${escapeHtml(website)}" target="_blank" rel="noreferrer noopener">${escapeHtml(hostLabel(website))} ↗</a></div>`,
    );
  }

  const distance = distanceLabel(tags[POI_TAG_DISTANCE_M]);
  if (distance) parts.push(`<div>📏 ${t("mapPage.poiDistance")}: ${escapeHtml(distance)}</div>`);

  parts.push(openingHoursHtml(tags.opening_hours, t, now));
  return parts.join("");
}
