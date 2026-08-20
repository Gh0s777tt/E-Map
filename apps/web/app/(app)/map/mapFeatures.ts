import type { DriverPosition, SavedPlace, Trailer } from "@e-logistic/api";
import {
  combineRigProfile,
  describeOpeningWeek,
  type FuelCardProvider,
  formatDuration,
  fuelCost,
  getOpeningHoursStatus,
  localMomentFromDate,
  type OpeningHoursMoment,
  type RouteDelta,
  SAVED_PLACE_CATEGORIES,
  type SavedPlaceCategory,
  stationMatchesProviders,
  type Weekday,
} from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import {
  ADR_TUNNEL_CODES,
  type AdrTunnelCode,
  EMISSION_CLASSES,
  type EmissionClass,
  type FuelStationPrice,
  jamSeverity,
  type LatLng,
  type Poi,
  type TollSection,
  type TrafficFlow,
  type TrafficIncident,
  type VehicleProfile,
} from "@e-logistic/maps";
import { REPORT_COLOR, REPORT_LABEL, SAVED_CAT_ICON, TRAFFIC_COLOR } from "./mapTheme";
import type { DimsFields, Report, RouteVehicle, Stop, VehicleRow } from "./mapTypes";

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

/** GeoJSON natężenia ruchu HERE — kolor odcinka wyliczony z `jamFactor` już tutaj. */
export function trafficFlowFeatures(flows: TrafficFlow[]) {
  return {
    type: "FeatureCollection" as const,
    features: flows.map((f) => ({
      type: "Feature" as const,
      properties: { color: TRAFFIC_COLOR[jamSeverity(f.jamFactor)] },
      geometry: {
        type: "LineString" as const,
        coordinates: f.shape.map((p) => [p.lng, p.lat] as [number, number]),
      },
    })),
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

/* ═══════════ profil ZESTAWU: kartoteka → formularz → żądanie ═══════════ */

/** `vehicles.adr_tunnel_code` to w bazie zwykły `text` z CHECK-iem — zawężamy do enumu. */
export function asAdrTunnelCode(v: string | null | undefined): AdrTunnelCode | null {
  return (ADR_TUNNEL_CODES as readonly string[]).includes(v ?? "") ? (v as AdrTunnelCode) : null;
}
export function asEmissionClass(v: string | null | undefined): EmissionClass | null {
  return (EMISSION_CLASSES as readonly string[]).includes(v ?? "") ? (v as EmissionClass) : null;
}

/**
 * [#406] Pojazd + PODPIĘTA NACZEPA złożone w profil ZESTAWU.
 *
 * Do tej pory do routingu szły gabaryty samego ciągnika — parametry wyglądały
 * kompletnie, tylko opisywały połowę pojazdu. Niski ciągnik z czterometrową
 * chłodnią jechał jako pojazd o wysokości 3,8 m, czyli pod wiadukt, którego
 * zestaw nie przejedzie.
 *
 * Reguły łączenia (wysokość MAX, osie SUMA, długość świadomie pominięta) siedzą
 * w `combineRigProfile` razem z uzasadnieniem i testami — tutaj tylko je stosujemy.
 */
export function toRouteVehicle(v: VehicleRow, naczepa: Trailer | null): RouteVehicle {
  const zestaw = combineRigProfile(
    {
      heightCm: v.height_cm,
      widthCm: v.width_cm,
      lengthCm: v.length_cm,
      curbWeightKg: v.curb_weight_kg,
      maxPayloadKg: v.max_payload_kg,
      axleCount: v.axle_count,
    },
    naczepa && {
      heightCm: naczepa.height_cm,
      widthCm: naczepa.width_cm,
      lengthCm: naczepa.length_cm,
      curbWeightKg: naczepa.curb_weight_kg,
      maxPayloadKg: naczepa.max_payload_kg,
      axleCount: naczepa.axle_count,
    },
  );
  return {
    id: v.id,
    registration: v.registration,
    heightCm: zestaw.heightCm,
    widthCm: zestaw.widthCm,
    lengthCm: zestaw.lengthCm,
    // Masa jest tu już policzona dla ZESTAWU, więc rozbijamy ją z powrotem na
    // parę, której oczekuje reszta ekranu: całość jako masa własna, zero jako
    // ładowność. `grossWeightKg` niżej zsumuje to do tej samej liczby.
    curbWeightKg: zestaw.grossWeightKg,
    maxPayloadKg: zestaw.grossWeightKg == null ? null : 0,
    axleCount: zestaw.axleCount,
    adrTunnelCode: asAdrTunnelCode(v.adr_tunnel_code),
    emissionClass: asEmissionClass(v.emission_class),
    trailerRegistration: naczepa?.registration ?? null,
    /** Naczepa podpięta → długości zestawu nie znamy; spedytor podaje ręcznie. */
    rigLengthUnknown: zestaw.braki.includes("dlugosc-zestawu"),
  };
}

/**
 * [#385] DMC = masa własna + ładowność. Liczymy TYLKO gdy znane są OBIE (wzorzec
 * z `apps/mobile/lib/vehicleProfile.ts`): sama masa własna zaniża wynik dla załadowanego
 * zestawu, a zaniżona masa to przejazd przez most z ograniczeniem tonażu.
 */
export function grossWeightKg(v: RouteVehicle): number | null {
  return v.curbWeightKg != null && v.maxPayloadKg != null ? v.curbWeightKg + v.maxPayloadKg : null;
}

/**
 * [#385] Pole formularza → liczba albo BRAK. Puste, ujemne i nieliczbowe dają
 * `undefined`, żeby parametr został POMINIĘTY w żądaniu zamiast polecieć jako zero.
 * Dotąd było `Number(weightT) || 24` — czyszcząc pole dostawało się w ciszy 24 tony.
 */
export function positiveNumber(v: string): number | undefined {
  const raw = v.replace(",", ".").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
export function positiveInt(v: string): number | undefined {
  const n = positiveNumber(v);
  return n == null ? undefined : Math.round(n);
}

/** Liczba do pola formularza; `null` z kartoteki zostaje pustym polem, nie zerem. */
export function fieldValue(n: number | null): string {
  return n == null ? "" : String(n);
}

/**
 * Wartości startowe formularza gabarytów — typowy zestaw 40 t, dopóki użytkownik
 * nie wybierze pojazdu z kartoteki. To jedyne miejsce, w którym wolno nam zgadywać,
 * bo panel wymiarów pokazuje te liczby wprost i można je poprawić przed liczeniem.
 */
export const DEFAULT_DIMS: DimsFields = {
  weightT: "24",
  axles: "5",
  heightCm: "400",
  widthCm: "255",
  lengthCm: "1650",
  adrTunnelCode: "",
  emissionClass: "",
};

/**
 * [#385] Profil, który NAPRAWDĘ poleci do `/api/route`: pola formularza (wypełnione
 * z kartoteki przy wyborze pojazdu, potem swobodnie nadpisywalne). Puste pole = parametr
 * POMINIĘTY, a nie zero i nie stała — dostawca ma wtedy własną wartość domyślną i to ona
 * jest uczciwsza niż nasza zmyślona.
 *
 * Pusty `adrTunnelCode` znaczy „ładunek zwykły", a nie „nie wiemy" — zestaw bez ADR to
 * normalny stan i nie ma o nim czego zgłaszać.
 */
export function buildTruckProfile(f: DimsFields): VehicleProfile {
  const tons = positiveNumber(f.weightT);
  const h = positiveInt(f.heightCm);
  const w = positiveInt(f.widthCm);
  const l = positiveInt(f.lengthCm);
  const ax = positiveInt(f.axles);
  const adr = asAdrTunnelCode(f.adrTunnelCode);
  const emission = asEmissionClass(f.emissionClass);
  return {
    kind: "truck",
    ...(tons != null ? { weightKg: Math.round(tons * 1000) } : {}),
    ...(h != null ? { heightCm: h } : {}),
    ...(w != null ? { widthCm: w } : {}),
    ...(l != null ? { lengthCm: l } : {}),
    ...(ax != null ? { axleCount: ax } : {}),
    ...(adr ? { adrTunnelCode: adr } : {}),
    ...(emission ? { emissionClass: emission } : {}),
  };
}

/**
 * [#385] Czy formularz rozjechał się z kartoteką wybranego pojazdu. Nadpisanie jest
 * dozwolone (spedytor liczy trasę dla zestawu, którego jeszcze nie ma w kartotece),
 * ale nie może wyglądać tak samo jak dane z kartoteki — dlatego mówimy o nim wprost.
 */
export function isProfileOverridden(
  vehicle: RouteVehicle | null,
  profile: VehicleProfile,
): boolean {
  if (!vehicle) return false;
  return (
    profile.heightCm !== (vehicle.heightCm ?? undefined) ||
    profile.widthCm !== (vehicle.widthCm ?? undefined) ||
    profile.lengthCm !== (vehicle.lengthCm ?? undefined) ||
    profile.axleCount !== (vehicle.axleCount ?? undefined) ||
    profile.weightKg !== (grossWeightKg(vehicle) ?? undefined) ||
    profile.adrTunnelCode !== (vehicle.adrTunnelCode ?? undefined) ||
    profile.emissionClass !== (vehicle.emissionClass ?? undefined)
  );
}

/**
 * [#385] Kartoteka wybranego pojazdu → pola formularza. Pusta kolumna zostaje PUSTYM
 * polem, żeby brak był widoczny, a nie zamaskowany dotychczasową stałą (inaczej po
 * wybraniu solówki bez wpisanej wysokości w polu dalej stałoby „400" z poprzedniego auta).
 *
 * `incomplete` mówi, czy panel wymiarów trzeba rozwinąć: zwinięty panel to dokładnie
 * ten stan, w którym użytkownik wysyłał cudzy zestaw, nie swój.
 */
export function vehicleToFields(v: RouteVehicle): { fields: DimsFields; incomplete: boolean } {
  const dmc = grossWeightKg(v);
  return {
    fields: {
      weightT: dmc == null ? "" : String(dmc / 1000),
      axles: fieldValue(v.axleCount),
      heightCm: fieldValue(v.heightCm),
      widthCm: fieldValue(v.widthCm),
      lengthCm: fieldValue(v.lengthCm),
      adrTunnelCode: v.adrTunnelCode ?? "",
      emissionClass: v.emissionClass ?? "",
    },
    incomplete: v.heightCm == null || v.widthCm == null || v.lengthCm == null || dmc == null,
  };
}

/* ═══════════════ trasa: link, koszty, korytarz wyszukiwania ═══════════════ */

/** Czytelny opis różnicy trasy po dodaniu miejsca (delta z `routeDelta`). */
export function describeDelta(name: string, d: RouteDelta, t: Translate): string {
  if (d.negligible) return `${t("mapPage.added")} „${name}" — ${t("mapPage.deltaNoChange")}.`;
  const distTxt = `${d.longer ? t("mapPage.deltaLonger") : t("mapPage.deltaShorter")} ${Math.abs(d.distanceKm)} km`;
  const timeTxt =
    d.durationMin > 0
      ? `${t("mapPage.deltaSlower")} ${formatDuration(d.durationMin)}`
      : d.durationMin < 0
        ? `${t("mapPage.deltaFaster")} ${formatDuration(-d.durationMin)}`
        : t("mapPage.deltaSameTime");
  const tollTxt =
    d.tollEur > 0
      ? `${t("mapPage.deltaPricier")} ${d.tollEur} € ${t("mapPage.deltaTollWord")}`
      : d.tollEur < 0
        ? `${t("mapPage.deltaCheaper")} ${Math.abs(d.tollEur)} € ${t("mapPage.deltaTollWord")}`
        : t("mapPage.deltaTollUnchanged");
  return `${t("mapPage.added")} „${name}": ${distTxt}, ${timeTxt}, ${tollTxt}.`;
}

/**
 * Trasa z linku `?r=lat,lng,etykieta|…`. Mniej niż dwa poprawne punkty to nie trasa,
 * więc zwracamy pustą listę — link z jednym przystankiem nie ma podmieniać celu.
 *
 * `decodeURIComponent` na uszkodzonym linku RZUCA i tak ma zostać: wywołanie jest
 * opakowane w `try` na stronie, a cichy fallback zamieniłby zepsuty link w trasę
 * z etykietami-krzakami.
 */
export function parseSharedRoute(
  raw: string | null,
): { lat: number; lng: number; label: string }[] {
  if (!raw) return [];
  const parsed = raw
    .split("|")
    .map((seg) => {
      const [lat, lng, ...rest] = seg.split(",");
      return {
        lat: Number(lat),
        lng: Number(lng),
        label: decodeURIComponent(rest.join(",")),
      };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  return parsed.length >= 2 ? parsed : [];
}

/** Odwrotność `parseSharedRoute` — parametr `r` do linku „udostępnij trasę". */
export function buildSharedRoute(stops: Stop[]): string {
  return stops
    .map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)},${encodeURIComponent(s.label)}`)
    .join("|");
}

/** Koszt paliwa i suma „myto + paliwo" dla pokazanej trasy. Bez trasy — zera. */
export function routeCostTotals(
  result: { distanceKm: number; tollCost: number } | null,
  fuel: { consumption: string; fuelPrice: string; fuelDiscount: string },
): { fuelTotal: number; grandTotal: number } {
  if (!result) return { fuelTotal: 0, grandTotal: 0 };
  const fuelTotal = fuelCost(
    (result.distanceKm * (Number(fuel.consumption) || 0)) / 100,
    Number(fuel.fuelPrice) || 0,
    Number(fuel.fuelDiscount) || 0,
  );
  return { fuelTotal, grandTotal: Math.round((result.tollCost + fuelTotal) * 100) / 100 };
}

/** Prostokąt obejmujący całą geometrię trasy — do zapytania o POI w korytarzu. */
export function geometryBbox(geometry: LatLng[]): {
  south: number;
  west: number;
  north: number;
  east: number;
} {
  // reduce zamiast Math.min(...arr) — spread wywala stos przy bardzo długich trasach.
  return geometry.reduce(
    (b, p) => ({
      south: Math.min(b.south, p.lat),
      west: Math.min(b.west, p.lng),
      north: Math.max(b.north, p.lat),
      east: Math.max(b.east, p.lng),
    }),
    { south: 90, west: 180, north: -90, east: -180 },
  );
}

/** Prostokąt widoku przycięty do `maxDeg` wokół środka — zbyt duży bbox dostawca odrzuca. */
export function clampBbox(
  b: { west: number; south: number; east: number; north: number },
  maxDeg: number,
): { west: number; south: number; east: number; north: number } {
  let { west, south, east, north } = b;
  if (east - west > maxDeg) {
    const c = (east + west) / 2;
    west = c - maxDeg / 2;
    east = c + maxDeg / 2;
  }
  if (north - south > maxDeg) {
    const c = (north + south) / 2;
    south = c - maxDeg / 2;
    north = c + maxDeg / 2;
  }
  return { west, south, east, north };
}

/**
 * Geometria trasy przerzedzona pod `tomtomSearchAlongRoute`: TomTom zwraca 400 przy
 * zbyt gęstej linii. Dzielnik 99 (nie 100): pętla daje ≤99 punktów, +1 dołożony
 * ostatni = ≤100. Pierwszy i ostatni punkt zostają zawsze — korytarz wyszukiwania
 * ma sięgać do samego celu.
 */
export function sampleGeometryForSearch(geometry: LatLng[]): LatLng[] {
  const step = Math.max(1, Math.ceil(geometry.length / 99));
  const sampled: LatLng[] = [];
  for (let i = 0; i < geometry.length; i += step) {
    const pt = geometry[i];
    if (pt) sampled.push(pt);
  }
  const last = geometry[geometry.length - 1];
  if (last && sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

/* ═══════════════════════ POI: filtr kart i legenda ═══════════════════════ */

/**
 * Filtr stacji wg akceptacji kart flotowych (poglądowy): zostawia parkingi i te stacje,
 * których marka/operator pasuje do którejkolwiek z kart użytkownika. Wyłączony filtr
 * albo pusty zestaw marek = pełna lista, bo „nie wybrano marki" nie znaczy „żadna".
 */
export function filterPoisByCards(pois: Poi[], providers: FuelCardProvider[], on: boolean): Poi[] {
  if (!on || providers.length === 0) return pois;
  return pois.filter(
    (p) =>
      p.type !== "fuel_station" ||
      stationMatchesProviders(
        `${p.tags.brand ?? ""} ${p.tags.operator ?? ""} ${p.name ?? ""}`,
        providers,
      ),
  );
}

/**
 * [#383] Legenda pokazuje LICZBY z tego, co faktycznie leży na mapie — pozycja bez
 * ani jednego punktu nie ma prawa wisieć w legendzie jako obietnica.
 */
export function countPoiKinds(pois: Poi[]): { fuel: number; parking: number } {
  return {
    fuel: pois.filter((p) => p.type === "fuel_station").length,
    parking: pois.filter((p) => p.type === "parking").length,
  };
}

/** Najtańszy diesel w okolicy: bez ceny nie ma czego pokazać, ośmiu pozycji nie przewijamy. */
export function bestDieselPrices(stations: FuelStationPrice[]): FuelStationPrice[] {
  return stations
    .filter((s) => s.diesel != null)
    .sort((a, b) => (a.diesel ?? 0) - (b.diesel ?? 0))
    .slice(0, 8);
}

/* ═══════════════════════ auta live (#324 / [#383]) ═══════════════════════ */

/** Wiek pozycji słowami — „teraz", „12 min temu", „3 h temu", „2 dni temu". */
function positionAgeLabel(minutes: number, t: Translate): string {
  if (minutes < 1) return t("mapPage.now");
  if (minutes < 60) return `${minutes} ${t("mapPage.minAgo")}`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} ${t("mapPage.hoursAgo")}`;
  return `${Math.floor(minutes / 1440)} ${t("mapPage.daysAgo")}`;
}

/**
 * [#383] Pozycje kierowców → warstwa mapy + liczniki do panelu.
 *
 * Filtr świeżości istnieje, bo pozycja sprzed godzin wyglądała dokładnie tak samo jak
 * sprzed minuty (różnił je tylko odcień kropki), więc dyspozytor planował objazd wg auta,
 * którego dawno tam nie ma. Ukryte pinezki LICZYMY i oddajemy w `hidden` — „nie wiemy,
 * gdzie jest" to informacja, a nie powód do milczenia.
 */
export function truckPositionFeatures(
  rows: DriverPosition[],
  opts: { now: number; staleAfterMin: number; freshOnly: boolean },
  t: Translate,
) {
  const aged = rows.map((r) => ({
    row: r,
    ageMin: Math.round((opts.now - new Date(r.updated_at).getTime()) / 60_000),
  }));
  const visible = opts.freshOnly ? aged.filter((a) => a.ageMin <= opts.staleAfterMin) : aged;
  const data = {
    type: "FeatureCollection" as const,
    features: visible.map(({ row: r, ageMin }) => {
      const props: Record<string, string | number> = {
        color: ageMin <= 5 ? "#22c55e" : ageMin <= 30 ? "#f59e0b" : "#6b7280",
        label: `🚛 ${positionAgeLabel(ageMin, t)}${r.speed_kmh != null ? ` · ${r.speed_kmh} km/h` : ""}`,
      };
      // [#383] `heading` (0–359°, od północy zgodnie ze wskazówkami) siedział w bazie
      // i w `select`, a mapa go nie czytała. Klucz dokładamy TYLKO gdy jest liczbą —
      // filtr warstwy strzałek to `["has","heading"]`, a `null` też „jest".
      if (r.heading != null && Number.isFinite(r.heading)) {
        props.heading = ((r.heading % 360) + 360) % 360;
      }
      return {
        type: "Feature" as const,
        properties: props,
        geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] },
      };
    }),
  };
  return { data, total: aged.length, hidden: aged.length - visible.length };
}
