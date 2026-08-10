"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  type DriverPosition,
  type DriverRow,
  deleteSavedPlace,
  insertMapReport,
  insertSavedPlace,
  listActiveMapReports,
  listDriverPositions,
  listDrivers,
  listSavedPlaces,
  listVehicles,
  parkingSummaries,
  type SavedPlace,
  sendDriverRoute,
  upsertParkingReview,
} from "@e-logistic/api";
import {
  FUEL_CARD_PROVIDER_LABELS,
  type FuelCardProvider,
  formatDuration,
  fuelCost,
  newId,
  REPORT_TYPES,
  type ReportType,
  routeDelta,
  SAVED_PLACE_CATEGORIES,
  SAVED_PLACE_CATEGORY_LABELS,
  type SavedPlaceCategory,
  stationMatchesProviders,
} from "@e-logistic/core";
import {
  ADR_TUNNEL_CODES,
  type AdrTunnelCode,
  anyWithinKm,
  buildGridIndex,
  EMISSION_CLASSES,
  type EmissionClass,
  type FuelStationPrice,
  fetchPois,
  type GeoHit,
  geocode,
  itemsNearRoute,
  jamSeverity,
  type LatLng,
  type Poi,
  type TollSection,
  type TrafficFlow,
  type TrafficIncident,
  tomtomReverseGeocode,
  tomtomSearchAlongRoute,
  tomtomTrafficIncidents,
  type VehicleProfile,
} from "@e-logistic/maps";
import { cssPalette, palette } from "@e-logistic/ui";
import type { Map as MlMap, Marker as MlMarker } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

import {
  escapeHtml,
  incidentFeatures,
  POI_TAG_ADDRESS,
  POI_TAG_DISTANCE_M,
  poiDetailsHtml,
  poiFeatures,
  reportFeatures,
  routeFeature,
  savedFeatures,
  tollSectionFeatures,
} from "./mapFeatures";
import {
  FuelPricesPanel,
  formatProfileDims,
  MISSING_DIM_LABEL,
  missingDimensions,
  type PlannedProfile,
  RouteSummary,
  SavedPlacesChips,
  StopsEditor,
} from "./mapPanels";
import {
  BASEMAPS,
  basemapStyle,
  DEFAULT_BASEMAP,
  DISRUPTION_RADIUS_KM,
  INCIDENT_COLOR,
  INCIDENT_LABEL,
  MAPTILER_KEY,
  OSM_STYLE,
  POI_LABEL,
  REPORT_LABEL,
  SAVED_CAT_ICON,
  TOMTOM_KEY,
  TRAFFIC_COLOR,
} from "./mapTheme";
import type { BasemapKey, MaplibreModule, Report, RouteResponse, Stop } from "./mapTypes";
import { styles } from "./mapUi";

/**
 * #367: punktowe warstwy mapy — mają własne popupy (POI/zgłoszenia/incydenty/zapisane
 * miejsca) albo niosą informację (auta live). Prawy klik nad którąkolwiek z nich NIE
 * dodaje przystanku: najpierw pytamy `queryRenderedFeatures`, żeby nowa interakcja
 * nie zabierała klików istniejącym punktom.
 */
const CLICKABLE_LAYERS = [
  "pois-layer",
  "reports-layer",
  "incidents-layer",
  // [#383] warstwa ruchu w konfiguracji tylko-TomTom rysuje punktowe utrudnienia.
  "traffic-incidents-layer",
  "saved-layer",
  "saved-icons",
  "trucks-layer",
  "trucks-labels",
  // [#383] strzałka kierunku jazdy — też punkt warstwy, nie tło mapy.
  "trucks-heading",
] as const;

/**
 * [#383] Pozycja starsza niż tyle minut nie jest już informacją o tym, GDZIE JEST auto —
 * TIR w tym czasie przejeżdża kilkadziesiąt kilometrów. Domyślnie takie pinezki chowamy
 * (z licznikiem, ile ukryto), zamiast pokazywać je nieodróżnialnie od świeżych.
 */
const STALE_POSITION_MIN = 30;

/**
 * [#385] Pojazd z kartoteki w zakresie, który wchodzi do profilu routingu.
 *
 * `null` znaczy „kolumna w kartotece pusta" i MA tak zostać aż do ekranu — podstawienie
 * „typowej" wysokości 4 m czy pięciu osi byłoby zgadywaniem, a zgadywanie kończy się
 * zestawem pod niskim wiaduktem albo mytem policzonym dla cudzej klasy pojazdu.
 */
interface RouteVehicle {
  id: string;
  registration: string;
  heightCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  curbWeightKg: number | null;
  maxPayloadKg: number | null;
  axleCount: number | null;
  adrTunnelCode: AdrTunnelCode | null;
  emissionClass: EmissionClass | null;
}

type VehicleRow = Awaited<ReturnType<typeof listVehicles>>[number];

/** `vehicles.adr_tunnel_code` to w bazie zwykły `text` z CHECK-iem — zawężamy do enumu. */
function asAdrTunnelCode(v: string | null | undefined): AdrTunnelCode | null {
  return (ADR_TUNNEL_CODES as readonly string[]).includes(v ?? "") ? (v as AdrTunnelCode) : null;
}
function asEmissionClass(v: string | null | undefined): EmissionClass | null {
  return (EMISSION_CLASSES as readonly string[]).includes(v ?? "") ? (v as EmissionClass) : null;
}

function toRouteVehicle(v: VehicleRow): RouteVehicle {
  return {
    id: v.id,
    registration: v.registration,
    heightCm: v.height_cm ?? null,
    widthCm: v.width_cm ?? null,
    lengthCm: v.length_cm ?? null,
    curbWeightKg: v.curb_weight_kg ?? null,
    maxPayloadKg: v.max_payload_kg ?? null,
    axleCount: v.axle_count ?? null,
    adrTunnelCode: asAdrTunnelCode(v.adr_tunnel_code),
    emissionClass: asEmissionClass(v.emission_class),
  };
}

/**
 * [#385] DMC = masa własna + ładowność. Liczymy TYLKO gdy znane są OBIE (wzorzec
 * z `apps/mobile/lib/vehicleProfile.ts`): sama masa własna zaniża wynik dla załadowanego
 * zestawu, a zaniżona masa to przejazd przez most z ograniczeniem tonażu.
 */
function grossWeightKg(v: RouteVehicle): number | null {
  return v.curbWeightKg != null && v.maxPayloadKg != null ? v.curbWeightKg + v.maxPayloadKg : null;
}

/**
 * [#385] Pole formularza → liczba albo BRAK. Puste, ujemne i nieliczbowe dają
 * `undefined`, żeby parametr został POMINIĘTY w żądaniu zamiast polecieć jako zero.
 * Dotąd było `Number(weightT) || 24` — czyszcząc pole dostawało się w ciszy 24 tony.
 */
function positiveNumber(v: string): number | undefined {
  const raw = v.replace(",", ".").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function positiveInt(v: string): number | undefined {
  const n = positiveNumber(v);
  return n == null ? undefined : Math.round(n);
}

/** Liczba do pola formularza; `null` z kartoteki zostaje pustym polem, nie zerem. */
function fieldValue(n: number | null): string {
  return n == null ? "" : String(n);
}

export default function MapPage() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const mlRef = useRef<MaplibreModule | null>(null);
  const reportsRef = useRef<Report[]>([]);
  const routeGeoRef = useRef<LatLng[] | null>(null);
  const poisRef = useRef<Poi[]>([]);
  const allPoisRef = useRef<Poi[]>([]);
  const markersRef = useRef<MlMarker[]>([]);
  const reportModeRef = useRef(false);
  const reportTypeRef = useRef<ReportType>("accident");
  const terrainOnRef = useRef(true);
  const globeOnRef = useRef(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefillDone = useRef(false);

  const [stops, setStops] = useState<Stop[]>([
    { key: "s-start", label: "Berlin", lat: 52.52, lng: 13.405 },
    { key: "s-end", label: "Warszawa", lat: 52.2297, lng: 21.0122 },
  ]);
  const [queries, setQueries] = useState<Record<string, string>>({
    "s-start": "Berlin",
    "s-end": "Warszawa",
  });
  const [hits, setHits] = useState<Record<string, GeoHit[]>>({});
  const [basemap, setBasemap] = useState<BasemapKey>(DEFAULT_BASEMAP);
  const [terrain3d, setTerrain3d] = useState(true);
  const [globe, setGlobe] = useState(false);
  const [kindHeavy, setKindHeavy] = useState(true);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidFerries, setAvoidFerries] = useState(false);
  const [avoidCH, setAvoidCH] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [poiBusy, setPoiBusy] = useState(false);
  const [poiCount, setPoiCount] = useState<number | null>(null);
  // [#383] Rozbicie POI na typy, które mapa NAPRAWDĘ rysuje (`OsmPoiType`) — do legendy.
  const [poiKinds, setPoiKinds] = useState<{ fuel: number; parking: number }>({
    fuel: 0,
    parking: 0,
  });
  const [reportMode, setReportMode] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("accident");
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const toast = useToast();
  const [disruptions, setDisruptions] = useState<(Report & { distanceKm: number })[]>([]);
  // #309: automatyczne przeliczenie trasy, gdy realtime przyniesie NOWE utrudnienie na trasie
  const [autoReroute, setAutoReroute] = useState(true);
  const autoRerouteRef = useRef(true);
  const knownDisruptionIdsRef = useRef<Set<string>>(new Set());
  const planRef = useRef<(() => void) | null>(null);
  const rerouteBusyRef = useRef(false);
  const [trafficOn, setTrafficOn] = useState(false);
  const [trafficMsg, setTrafficMsg] = useState<string | null>(null);
  // #358: warstwa incydentów TomTom (obok ruchu HERE) — klucz-gated.
  const [incidentsOn, setIncidentsOn] = useState(false);
  const [incidentMsg, setIncidentMsg] = useState<string | null>(null);
  // #358: refy stanu warstw ruchu/incydentów — applyOverlays (po setStyle) odtwarza
  // je tylko gdy były włączone; bez refów miałby nieświeży stan w domknięciu.
  const trafficOnRef = useRef(false);
  const incidentsOnRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  // #367: warstwa zapisanych miejsc firmy na mapie (obok chipsów). Przełącznik
  // spójny z warstwami ruchu/incydentów; refy — bo applyOverlays (po setStyle)
  // i handlery mapy rejestrowane RAZ potrzebują świeżego stanu poza domknięciem.
  const [savedLayerOn, setSavedLayerOn] = useState(true);
  const savedLayerOnRef = useRef(true);
  const savedRef = useRef<SavedPlace[]>([]);
  // #367: mostki do funkcji z bieżącego renderu (popup miejsca / prawy klik w mapę).
  const addSavedStopRef = useRef<((p: SavedPlace) => void) | null>(null);
  const addStopAtRef = useRef<((lat: number, lng: number) => void) | null>(null);
  // [#383] warstwa odcinków płatnych z `RouteResult.tollSections` (TomTom je zwraca —
  // dotąd odpowiedź szła do kosza). Refy, bo `applyOverlays` po `setStyle` odtwarza
  // warstwy poza cyklem Reacta i musi znać AKTUALNY stan, nie ten z domknięcia.
  const [tollLayerOn, setTollLayerOn] = useState(false);
  const tollLayerOnRef = useRef(false);
  const routeResultRef = useRef<RouteResponse | null>(null);
  // [#383] auta live: ostatnio pobrane wiersze (do odtworzenia po zmianie podkładu)
  // + filtr świeżości pozycji.
  const trucksRef = useRef<DriverPosition[]>([]);
  const [freshOnly, setFreshOnly] = useState(true);
  const freshOnlyRef = useRef(true);
  const [staleHidden, setStaleHidden] = useState(0);
  const [truckTotal, setTruckTotal] = useState(0);

  // Koszt paliwa trasy (silnik billing) + zapisane miejsca.
  const [consumption, setConsumption] = useState("30");
  const [fuelPrice, setFuelPrice] = useState("1.65");
  const [fuelDiscount, setFuelDiscount] = useState("0");
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [savedCat, setSavedCat] = useState<SavedPlaceCategory>("company");
  const [deltaMsg, setDeltaMsg] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  // #272: wysyłka trasy do kierowcy (owner/dispatcher) — kartoteka ładowana leniwie.
  const [sendDrivers, setSendDrivers] = useState<DriverRow[] | null>(null);
  const [sendDriverId, setSendDriverId] = useState("");
  const [sendBusy, setSendBusy] = useState(false);

  // Wymiary TIR (do routingu HERE) + filtr stacji wg kart flotowych.
  const { cards } = useFleet();
  const [dimsOpen, setDimsOpen] = useState(false);
  const [weightT, setWeightT] = useState("24");
  const [heightCm, setHeightCm] = useState("400");
  const [widthCm, setWidthCm] = useState("255");
  const [lengthCm, setLengthCm] = useState("1650");
  const [axles, setAxles] = useState("5");
  /**
   * [#385] Wybór pojazdu z kartoteki. Do tej pory ekran wysyłał do routingu wyłącznie
   * powyższe stałe ze stanu komponentu (24 t / 400 / 255 / 1650 cm / 5 osi), a panel
   * wymiarów był domyślnie ZWINIĘTY — solówka i pięcioosiowy zestaw dostawały tę samą
   * trasę i to samo myto, bo nikt tych pól nie otwierał.
   *
   * Pojazdy ładujemy tutaj, a nie przez `useFleet()`: ten hook wystawia tylko
   * `{id, registration, maxPayloadKg}`, a do profilu potrzeba gabarytów, osi, ADR
   * i klasy emisji. `listVehicles` robi `select("*")`, więc te kolumny i tak przychodzą.
   */
  const [fleet, setFleet] = useState<RouteVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [adrTunnelCode, setAdrTunnelCode] = useState("");
  const [emissionClass, setEmissionClass] = useState("");
  /** Profil, którym policzono AKTUALNIE pokazaną trasę (nie ten z formularza — patrz `plan()`). */
  const [plannedProfile, setPlannedProfile] = useState<PlannedProfile | null>(null);
  const [cardFilterOn, setCardFilterOn] = useState(false);
  const [cardProviders, setCardProviders] = useState<Set<FuelCardProvider>>(new Set());
  const [fuelPrices, setFuelPrices] = useState<FuelStationPrice[]>([]);
  const [fuelPriceMsg, setFuelPriceMsg] = useState<string | null>(null);
  const [fuelPriceBusy, setFuelPriceBusy] = useState(false);

  // Marki kart użytkownika (odduplikowane) — do filtra stacji. Memo: nowa tablica tylko gdy zmienią się karty.
  const cardOptions = useMemo(() => Array.from(new Set(cards.map((c) => c.provider))), [cards]);

  const selectedVehicle = useMemo(
    () => fleet.find((v) => v.id === vehicleId) ?? null,
    [fleet, vehicleId],
  );

  /**
   * [#385] Profil, który NAPRAWDĘ poleci do `/api/route`: pola formularza (wypełnione
   * z kartoteki przy wyborze pojazdu, potem swobodnie nadpisywalne). Puste pole = parametr
   * POMINIĘTY, a nie zero i nie stała — dostawca ma wtedy własną wartość domyślną i to ona
   * jest uczciwsza niż nasza zmyślona.
   *
   * Pusty `adrTunnelCode` znaczy „ładunek zwykły", a nie „nie wiemy" — zestaw bez ADR to
   * normalny stan i nie ma o nim czego zgłaszać.
   */
  const truckProfile = useMemo<VehicleProfile>(() => {
    const tons = positiveNumber(weightT);
    const h = positiveInt(heightCm);
    const w = positiveInt(widthCm);
    const l = positiveInt(lengthCm);
    const ax = positiveInt(axles);
    const adr = asAdrTunnelCode(adrTunnelCode);
    const emission = asEmissionClass(emissionClass);
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
  }, [weightT, heightCm, widthCm, lengthCm, axles, adrTunnelCode, emissionClass]);

  /** Braki w profilu wysyłanym do dostawcy — puste przy trasie osobowej (gabaryty nieużywane). */
  const missingDims = useMemo(
    () => (kindHeavy ? missingDimensions(truckProfile) : []),
    [kindHeavy, truckProfile],
  );

  /**
   * [#385] Czy formularz rozjechał się z kartoteką wybranego pojazdu. Nadpisanie jest
   * dozwolone (spedytor liczy trasę dla zestawu, którego jeszcze nie ma w kartotece),
   * ale nie może wyglądać tak samo jak dane z kartoteki — dlatego mówimy o nim wprost.
   */
  const profileOverridden = useMemo(() => {
    const v = selectedVehicle;
    if (!v) return false;
    return (
      truckProfile.heightCm !== (v.heightCm ?? undefined) ||
      truckProfile.widthCm !== (v.widthCm ?? undefined) ||
      truckProfile.lengthCm !== (v.lengthCm ?? undefined) ||
      truckProfile.axleCount !== (v.axleCount ?? undefined) ||
      truckProfile.weightKg !== (grossWeightKg(v) ?? undefined) ||
      truckProfile.adrTunnelCode !== (v.adrTunnelCode ?? undefined) ||
      truckProfile.emissionClass !== (v.emissionClass ?? undefined)
    );
  }, [selectedVehicle, truckProfile]);

  /**
   * [#385] Wybór pojazdu przepisuje kartotekę do pól formularza. Pusta kolumna zostaje
   * PUSTYM polem — brak ma być widoczny, a nie zamaskowany dotychczasową stałą (inaczej
   * po wybraniu solówki bez wpisanej wysokości w polu dalej stałoby „400" z poprzedniego auta).
   *
   * Gdy czegoś brakuje, panel wymiarów rozwijamy — zwinięty panel to dokładnie ten stan,
   * w którym użytkownik wysyłał cudzy zestaw, nie swój.
   */
  function pickVehicle(id: string) {
    setVehicleId(id);
    const v = fleet.find((x) => x.id === id);
    // „— bez pojazdu —": pola zostają takie, jakie są. Stają się wartościami ręcznymi,
    // a pasek pod wyborem mówi wprost, że nie pochodzą z kartoteki.
    if (!v) return;
    const dmc = grossWeightKg(v);
    setWeightT(dmc == null ? "" : String(dmc / 1000));
    setHeightCm(fieldValue(v.heightCm));
    setWidthCm(fieldValue(v.widthCm));
    setLengthCm(fieldValue(v.lengthCm));
    setAxles(fieldValue(v.axleCount));
    setAdrTunnelCode(v.adrTunnelCode ?? "");
    setEmissionClass(v.emissionClass ?? "");
    const incomplete = v.heightCm == null || v.widthCm == null || v.lengthCm == null || dmc == null;
    if (incomplete && kindHeavy) setDimsOpen(true);
  }

  useEffect(() => {
    reportModeRef.current = reportMode;
  }, [reportMode]);
  useEffect(() => {
    reportTypeRef.current = reportType;
  }, [reportType]);

  // Wczytaj zapisane miejsca (z bazy — współdzielone w firmie) + trasę z linku.
  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m) return;
        setCompanyId(m.companyId);
        // [#385] Kartoteka pojazdów obok zapisanych miejsc — jedno przejście po tej samej
        // firmie. `catch` osobno dla floty: brak uprawnień do `vehicles` nie może zabrać
        // użytkownikowi zapisanych miejsc (wybór pojazdu zostaje wtedy pustą listą).
        const [places, vehicleRows] = await Promise.all([
          listSavedPlaces(sb, m.companyId),
          listVehicles(sb, m.companyId).catch(() => [] as VehicleRow[]),
        ]);
        setSaved(places);
        setFleet(vehicleRows.map(toRouteVehicle));
      } catch {
        // offline / brak firmy → brak zapisanych miejsc
      }
    })();
    try {
      const r = new URLSearchParams(window.location.search).get("r");
      if (r) {
        const parsed = r
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
        if (parsed.length >= 2) {
          const next = parsed.map((p, i) => ({
            key: i === 0 ? "s-start" : i === parsed.length - 1 ? "s-end" : newId(),
            ...p,
          }));
          setStops(next);
          setQueries(Object.fromEntries(next.map((s) => [s.key, s.label])));
        }
      }
    } catch {
      // nieprawidłowy link
    }
  }, []);

  // #324: auta live — aktualne pozycje kierowców, którzy włączyli udostępnianie
  // w aplikacji (driver_positions, upsert per kierowca). Kolor = świeżość.
  const drawTrucks = useCallback(
    (rows: DriverPosition[]) => {
      const map = mapRef.current;
      if (!map) return;
      // [#383] Zapamiętaj PRZED bramką stylu — `applyOverlays` (po `setStyle`) odtwarza
      // warstwę z tego refa; bez tego auta znikały do najbliższego odpytania (30 s).
      trucksRef.current = rows;
      // [#383] `addSource` na niewczytanym stylu rzuca („Style is not done loading.") —
      // ten sam guard co w `drawSaved`, bo odpytywanie leci z interwału, nie z eventu mapy.
      if (!map.isStyleLoaded()) return;
      const now = Date.now();
      const aged = rows.map((r) => ({
        row: r,
        ageMin: Math.round((now - new Date(r.updated_at).getTime()) / 60_000),
      }));
      // [#383] Filtr świeżości: pozycja sprzed godzin wyglądała dokładnie tak samo jak
      // sprzed minuty (różnił je tylko odcień kropki), więc dyspozytor planował objazd
      // wg auta, którego dawno tam nie ma. Ukryte pinezki liczymy i pokazujemy w panelu —
      // „nie wiemy, gdzie jest" to informacja, a nie powód do milczenia.
      const visible = freshOnlyRef.current
        ? aged.filter((a) => a.ageMin <= STALE_POSITION_MIN)
        : aged;
      setTruckTotal(aged.length);
      setStaleHidden(aged.length - visible.length);
      const ageLabel = (m: number) => {
        if (m < 1) return t("mapPage.now");
        if (m < 60) return `${m} ${t("mapPage.minAgo")}`;
        if (m < 1440) return `${Math.floor(m / 60)} ${t("mapPage.hoursAgo")}`;
        return `${Math.floor(m / 1440)} ${t("mapPage.daysAgo")}`;
      };
      const data = {
        type: "FeatureCollection" as const,
        features: visible.map(({ row: r, ageMin }) => {
          const props: Record<string, string | number> = {
            color: ageMin <= 5 ? "#22c55e" : ageMin <= 30 ? "#f59e0b" : "#6b7280",
            label: `🚛 ${ageLabel(ageMin)}${r.speed_kmh != null ? ` · ${r.speed_kmh} km/h` : ""}`,
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
      const existing = map.getSource("trucks");
      if (existing) {
        (existing as import("maplibre-gl").GeoJSONSource).setData(data);
        return;
      }
      map.addSource("trucks", { type: "geojson", data });
      map.addLayer({
        id: "trucks-layer",
        type: "circle",
        source: "trucks",
        paint: {
          "circle-radius": 9,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": palette.white,
        },
      } as import("maplibre-gl").AddLayerObject);
      try {
        // [#383] Strzałka obrócona o `heading` — kropka zostaje pod spodem CELOWO:
        // styl rastrowy (fallback OSM) nie ma glyphów i warstwa symboli się nie doda,
        // a wtedy pozycja auta nadal musi być widoczna. `text-rotation-alignment: map`
        // trzyma strzałkę zgodnie z terenem (obrót mapy jej nie przekłamuje),
        // `text-pitch-alignment: viewport` zostawia ją czytelną przy pochyleniu 3D.
        map.addLayer({
          id: "trucks-heading",
          type: "symbol",
          source: "trucks",
          filter: ["has", "heading"],
          layout: {
            "text-field": "▲",
            "text-size": 13,
            "text-rotate": ["get", "heading"],
            "text-rotation-alignment": "map",
            "text-pitch-alignment": "viewport",
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: { "text-color": palette.black },
        } as import("maplibre-gl").AddLayerObject);
      } catch {
        // styl bez glyphów — zostaje sama kropka (bez kierunku, ale bez kłamstwa)
      }
      try {
        map.addLayer({
          id: "trucks-labels",
          type: "symbol",
          source: "trucks",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-offset": [0, 1.4],
            "text-anchor": "top",
          },
          paint: { "text-color": "#ffffff", "text-halo-color": "#0a0a0a", "text-halo-width": 1.2 },
        } as import("maplibre-gl").AddLayerObject);
      } catch {
        // styl bez glyphów (fallback OSM) — same kropki wystarczą
      }
    },
    [t],
  );

  // [#383] Zmiana filtra świeżości przerysowuje auta z ostatnio pobranych danych —
  // bez ponownego odpytania bazy (te same wiersze, inny próg).
  useEffect(() => {
    freshOnlyRef.current = freshOnly;
    if (mapRef.current) drawTrucks(trucksRef.current);
  }, [freshOnly, drawTrucks]);

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    const tick = async () => {
      try {
        const rows = await listDriverPositions(getBrowserSupabase(), companyId);
        if (alive) drawTrucks(rows);
      } catch {
        // brak uprawnień/sieci — warstwa po prostu nie powstanie
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [companyId, drawTrucks]);

  // ── Rysowanie warstw (tylko add/update źródła — handlery rejestrowane raz) ──
  const drawReports = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const data = reportFeatures(reportsRef.current, t);
    const existing = map.getSource("reports");
    if (existing) {
      (existing as import("maplibre-gl").GeoJSONSource).setData(data);
      return;
    }
    map.addSource("reports", { type: "geojson", data });
    map.addLayer({
      id: "reports-layer",
      type: "circle",
      source: "reports",
      paint: {
        "circle-radius": 7,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": palette.white,
      },
    } as import("maplibre-gl").AddLayerObject);
  }, [t]);

  // Utrudnienia na trasie ze zgłoszeń społeczności (korki/wypadki/zamknięcia
  // blisko wyznaczonej trasy) — darmowa alternatywa dla płatnego API ruchu.
  const recomputeDisruptions = useCallback(() => {
    const geo = routeGeoRef.current;
    if (!geo || geo.length === 0) {
      setDisruptions([]);
      return;
    }
    const near = itemsNearRoute(reportsRef.current, geo, DISRUPTION_RADIUS_KM);
    setDisruptions(near);
    // #309: auto-reroute — reaguj tylko na utrudnienia, których wcześniej nie było
    const fresh = near.filter((d) => !knownDisruptionIdsRef.current.has(d.id));
    for (const d of near) knownDisruptionIdsRef.current.add(d.id);
    if (fresh.length > 0 && autoRerouteRef.current && !rerouteBusyRef.current && planRef.current) {
      rerouteBusyRef.current = true;
      toast(
        `🚧 ${t("mapPage.newDisruptionOnRoute")} (${fresh.length}) — ${t("mapPage.recomputingDetour")}`,
        "info",
      );
      Promise.resolve(planRef.current()).finally(() => {
        rerouteBusyRef.current = false;
      });
    }
  }, [toast, t]);

  // Warstwa natężenia ruchu (HERE Traffic) — kolorowe odcinki wg jamFactor.
  const drawTraffic = useCallback((flows: TrafficFlow[]) => {
    const map = mapRef.current;
    if (!map) return;
    // [#383] `addSource` na niewczytanym stylu rzuca — a odświeżanie ruchu leci z `moveend`
    // i potrafi trafić w okno tuż po `setStyle`. Warstwę odtworzy `switchBasemap`.
    if (!map.isStyleLoaded()) return;
    const fc = {
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
    const existing = map.getSource("traffic");
    if (existing) {
      (existing as import("maplibre-gl").GeoJSONSource).setData(fc);
      return;
    }
    map.addSource("traffic", { type: "geojson", data: fc });
    const layer = {
      id: "traffic-layer",
      type: "line",
      source: "traffic",
      paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.7 },
    } as import("maplibre-gl").AddLayerObject;
    // Pod warstwą trasy, by trasa pozostała widoczna na wierzchu.
    if (map.getLayer("route")) map.addLayer(layer, "route");
    else map.addLayer(layer);
  }, []);

  // #358: warstwa incydentów TomTom — punktowe piny kolorowane wg severity.
  // [#383] sparametryzowana źródłem/warstwą, bo te same incydenty potrafi przynieść
  // także `/api/traffic` (gdy serwer ma TomTom, a nie ma HERE) — wtedy jadą do własnej
  // warstwy, żeby wyłączenie jednego przełącznika nie kasowało pinezek drugiego.
  const drawIncidentsInto = useCallback(
    (incidents: TrafficIncident[], sourceId: string, layerId: string) => {
      const map = mapRef.current;
      if (!map) return;
      // [#383] Ten sam guard co w `drawSaved`: `addSource` na niewczytanym stylu rzuca.
      if (!map.isStyleLoaded()) return;
      const data = incidentFeatures(incidents);
      const existing = map.getSource(sourceId);
      if (existing) {
        (existing as import("maplibre-gl").GeoJSONSource).setData(data);
        return;
      }
      map.addSource(sourceId, { type: "geojson", data });
      map.addLayer({
        id: layerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "match",
            ["get", "severity"],
            "closure",
            INCIDENT_COLOR.closure,
            "major",
            INCIDENT_COLOR.major,
            "moderate",
            INCIDENT_COLOR.moderate,
            "minor",
            INCIDENT_COLOR.minor,
            INCIDENT_COLOR.unknown,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": palette.white,
        },
      } as import("maplibre-gl").AddLayerObject);
    },
    [],
  );

  /** #358: warstwa własnego przełącznika „Utrudnienia (TomTom)" (klucz po stronie klienta). */
  const drawIncidents = useCallback(
    (incidents: TrafficIncident[]) => drawIncidentsInto(incidents, "incidents", "incidents-layer"),
    [drawIncidentsInto],
  );

  /** [#383] Incydenty przyniesione przez `/api/traffic` (serwer bez HERE, z TomTomem). */
  const drawTrafficIncidents = useCallback(
    (incidents: TrafficIncident[]) =>
      drawIncidentsInto(incidents, "traffic-incidents", "traffic-incidents-layer"),
    [drawIncidentsInto],
  );

  const fetchTrafficForView = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    try {
      const res = await fetch("/api/traffic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        }),
      });
      // [#383] `/api/traffic` ma DWA kształty odpowiedzi: `flows` (HERE — linie natężenia)
      // albo `incidents` (TomTom, gdy serwer nie ma klucza HERE). Klient czytał wyłącznie
      // `flows`, więc w konfiguracji tylko-TomTom przełącznik nie rysował nic i milczał —
      // wyglądało to jak „drogi puste", a nie jak „inny dostawca, inne dane".
      const data = (await res.json().catch(() => null)) as {
        flows?: TrafficFlow[];
        incidents?: TrafficIncident[];
        configured?: boolean;
        unavailable?: boolean;
        tooLarge?: boolean;
      } | null;
      if (!data) return;
      const clear = () => {
        drawTraffic([]);
        drawTrafficIncidents([]);
      };
      if (res.status === 501 || data.configured === false) {
        setTrafficMsg(t("mapPage.trafficNeedsKey"));
        clear();
        return;
      }
      if (data.tooLarge) {
        setTrafficMsg(t("mapPage.trafficZoomIn"));
        clear();
        return;
      }
      if (data.unavailable) {
        setTrafficMsg(t("mapPage.trafficUnavailable"));
        clear();
        return;
      }
      if (Array.isArray(data.incidents)) {
        drawTraffic([]);
        // Gdy własna warstwa incydentów TomTom jest już włączona, te same pinezki
        // pojawiłyby się drugi raz w tym samym miejscu — wtedy tylko o tym mówimy.
        if (incidentsOnRef.current) {
          drawTrafficIncidents([]);
          setTrafficMsg(t("mapPage.trafficIncidentsDuplicate"));
          return;
        }
        drawTrafficIncidents(data.incidents);
        setTrafficMsg(
          data.incidents.length > 0
            ? t("mapPage.trafficIncidentsOnly")
            : t("mapPage.trafficIncidentsNone"),
        );
        return;
      }
      setTrafficMsg(null);
      drawTrafficIncidents([]);
      drawTraffic(data.flows ?? []);
    } catch {
      setTrafficMsg(t("mapPage.trafficError"));
    }
  }, [drawTraffic, drawTrafficIncidents, t]);

  const fetchIncidentsForView = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !TOMTOM_KEY) return;
    const b = map.getBounds();
    let west = b.getWest();
    let south = b.getSouth();
    let east = b.getEast();
    let north = b.getNorth();
    // Ogranicz bbox do ~2° (jak HERE), by uniknąć zbyt dużego zapytania.
    const MAX_DEG = 2;
    if (east - west > MAX_DEG) {
      const c = (east + west) / 2;
      west = c - MAX_DEG / 2;
      east = c + MAX_DEG / 2;
    }
    if (north - south > MAX_DEG) {
      const c = (north + south) / 2;
      south = c - MAX_DEG / 2;
      north = c + MAX_DEG / 2;
    }
    // bbox TomTom = "minLng,minLat,maxLng,maxLat" (kolejność lng,lat!).
    const bbox = `${west},${south},${east},${north}`;
    try {
      const incidents = await tomtomTrafficIncidents(bbox, TOMTOM_KEY);
      setIncidentMsg(incidents.length === 0 ? t("mapPage.noIncidentsInView") : null);
      drawIncidents(incidents);
    } catch {
      setIncidentMsg(t("mapPage.incidentsError"));
    }
  }, [drawIncidents, t]);

  const drawRoute = useCallback((geometry: LatLng[]) => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml || geometry.length < 2) return;
    const coords = geometry.map((p) => [p.lng, p.lat] as [number, number]);
    const data = routeFeature(coords);
    const existing = map.getSource("route");
    if (existing) {
      (existing as import("maplibre-gl").GeoJSONSource).setData(data);
    } else {
      map.addSource("route", { type: "geojson", data });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": palette.red, "line-width": 5 },
      });
    }
  }, []);

  const drawPois = useCallback((pois: Poi[]) => {
    const map = mapRef.current;
    if (!map) return;
    const data = poiFeatures(pois);
    const existing = map.getSource("pois");
    if (existing) {
      (existing as import("maplibre-gl").GeoJSONSource).setData(data);
      return;
    }
    map.addSource("pois", { type: "geojson", data });
    map.addLayer({
      id: "pois-layer",
      type: "circle",
      source: "pois",
      paint: {
        "circle-radius": 6,
        // [#383] Gałąź „company" (niebieska) usunięta: `OsmPoiType` to wyłącznie
        // `parking | fuel_station`, więc dopasowanie nigdy nie mogło się ziścić —
        // a legenda pod mapą obiecywała za nim „firmy". Zostaje szary domyślny kolor
        // jako zabezpieczenie na wypadek nowego typu bez własnej barwy.
        "circle-color": [
          "match",
          ["get", "type"],
          "fuel_station",
          palette.red,
          "parking",
          "#22c55e",
          "#9ca3af",
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": palette.black,
      },
    } as import("maplibre-gl").AddLayerObject);
  }, []);

  /**
   * #367: warstwa zapisanych miejsc firmy — obwódka w czerwieni marki + emoji
   * kategorii (SAVED_CAT_ICON) jako `text-field` warstwy symbol. Symbol w try/catch
   * jak przy autach live: styl rastrowy (fallback OSM) nie ma glyphów i by rzucił.
   */
  const drawSaved = useCallback((places: SavedPlace[]) => {
    const map = mapRef.current;
    if (!map) return;
    // #367: po `setStyle` (zmiana podkładu) stary styl znika natychmiast, a `addSource`
    // na niewczytanym stylu RZUCA („Style is not done loading."). Efekt Reacta wywołany
    // w tym oknie wysadziłby stronę do error boundary. Warstwę i tak odtworzy
    // `applyOverlays` na zdarzeniu `style.load`, czytając refy zaktualizowane wcześniej.
    if (!map.isStyleLoaded()) return;
    const data = savedFeatures(places);
    const existing = map.getSource("saved");
    if (existing) {
      (existing as import("maplibre-gl").GeoJSONSource).setData(data);
      return;
    }
    map.addSource("saved", { type: "geojson", data });
    map.addLayer({
      id: "saved-layer",
      type: "circle",
      source: "saved",
      paint: {
        "circle-radius": 9,
        "circle-color": palette.black,
        "circle-opacity": 0.85,
        "circle-stroke-width": 2,
        "circle-stroke-color": palette.red,
      },
    } as import("maplibre-gl").AddLayerObject);
    try {
      map.addLayer({
        id: "saved-icons",
        type: "symbol",
        source: "saved",
        layout: {
          "text-field": ["get", "icon"],
          "text-size": 13,
          "text-allow-overlap": true,
        },
      } as import("maplibre-gl").AddLayerObject);
    } catch {
      // styl bez glyphów (fallback OSM) — zostaje samo kółko
    }
  }, []);

  /**
   * [#383] Warstwa odcinków płatnych trasy (`RouteResult.tollSections`).
   *
   * `sectionType=tollRoad` leciał do TomTom w KAŻDYM zapytaniu o trasę, a odpowiedź
   * lądowała w koszu — płaciliśmy za dane, których nikt nie widział.
   *
   * Rysujemy dwie warstwy tego samego źródła: czerwoną poświatę POD linią trasy
   * (żeby płatny fragment było widać z oddali) i czarną szrafurę NAD nią (czerń na
   * czerwieni = motyw repo; kreski na jednolicie czerwonej trasie są jedynym
   * rozróżnieniem, które nie wprowadza koloru spoza palety).
   */
  const drawToll = useCallback((geometry: LatLng[], sections: TollSection[]) => {
    const map = mapRef.current;
    if (!map) return;
    // [#383] Ten sam guard co w `drawSaved`: `addSource` na niewczytanym stylu rzuca.
    if (!map.isStyleLoaded()) return;
    const data = tollSectionFeatures(geometry, sections);
    const existing = map.getSource("toll");
    if (existing) {
      (existing as import("maplibre-gl").GeoJSONSource).setData(data);
      return;
    }
    map.addSource("toll", { type: "geojson", data });
    const glow = {
      id: "toll-glow",
      type: "line",
      source: "toll",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": palette.red,
        "line-width": 13,
        "line-opacity": 0.3,
        "line-blur": 2,
      },
    } as import("maplibre-gl").AddLayerObject;
    if (map.getLayer("route")) map.addLayer(glow, "route");
    else map.addLayer(glow);
    map.addLayer({
      id: "toll-hatch",
      type: "line",
      source: "toll",
      layout: { "line-join": "round", "line-cap": "butt" },
      paint: {
        "line-color": palette.black,
        "line-width": 2.5,
        "line-dasharray": [1, 2],
        "line-opacity": 0.9,
      },
    } as import("maplibre-gl").AddLayerObject);
  }, []);

  const add3dBuildings = useCallback((map: MlMap) => {
    if (!MAPTILER_KEY || map.getLayer("3d-buildings")) return;
    const sources = map.getStyle().sources as Record<string, { type?: string }>;
    const vectorSrc = Object.keys(sources).find((id) => sources[id]?.type === "vector");
    if (!vectorSrc) return;
    try {
      map.addLayer({
        id: "3d-buildings",
        source: vectorSrc,
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": "#3a3a3a",
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 0],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.85,
        },
      } as import("maplibre-gl").AddLayerObject);
    } catch {
      // styl bez warstwy budynków — pomijamy
    }
  }, []);

  // ── Po (prze)ładowaniu stylu: teren, budynki, projekcja, odtworzenie warstw ──
  const applyOverlays = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (MAPTILER_KEY) {
      if (!map.getSource("terrain-dem")) {
        map.addSource("terrain-dem", {
          type: "raster-dem",
          url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
        });
      }
      map.setTerrain(terrainOnRef.current ? { source: "terrain-dem", exaggeration: 1.25 } : null);
      add3dBuildings(map);
    }
    try {
      (map as unknown as { setProjection: (p: { type: string }) => void }).setProjection({
        type: globeOnRef.current ? "globe" : "mercator",
      });
    } catch {
      // starsza wersja bez globu
    }
    drawReports();
    if (routeGeoRef.current) drawRoute(routeGeoRef.current);
    if (poisRef.current.length) drawPois(poisRef.current);
    // #367: setStyle kasuje źródła/warstwy — odtwórz zapisane miejsca, gdy warstwa włączona.
    if (savedLayerOnRef.current && savedRef.current.length) drawSaved(savedRef.current);
    // [#383] Auta live NIE były tu odtwarzane: `setStyle` kasował warstwę, a najbliższe
    // odpytanie bazy przychodziło dopiero po interwale — flota znikała z mapy nawet
    // na 30 sekund po samej zmianie podkładu. Rysujemy z ostatnio pobranych wierszy.
    if (trucksRef.current.length) drawTrucks(trucksRef.current);
    // [#383] Odcinki płatne — rysujemy tylko gdy przełącznik włączony (jak przy ruchu).
    const route = routeResultRef.current;
    if (tollLayerOnRef.current && route) drawToll(route.geometry, route.tollSections.sections);
  }, [add3dBuildings, drawReports, drawRoute, drawPois, drawSaved, drawTrucks, drawToll]);

  // ── Inicjalizacja mapy ──
  useEffect(() => {
    let map: MlMap | undefined;
    let channel: { unsubscribe: () => void } | null = null;
    (async () => {
      const ml = await import("maplibre-gl");
      mlRef.current = ml;
      if (!containerRef.current) return;
      map = new ml.Map({
        container: containerRef.current,
        style: basemapStyle(DEFAULT_BASEMAP),
        center: [15, 50],
        zoom: 4,
        pitch: 45,
        maxPitch: 80,
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");

      // #370: mapa NIGDY nie może zostać czarnym prostokątem. Podkład domyślny wybieramy
      // po tym, czy klucz jest USTAWIONY — a nie czy jest PRAWIDŁOWY. Wystarczył więc
      // placeholder w zmiennej środowiskowej (zaobserwowane na produkcji: klucz 4-znakowy,
      // kafelki wracały z 401), by cała mapa została pusta: TomTom odmawiał, a MapTiler
      // nie był skonfigurowany, więc nie było na co spaść. Jeden nieudany kafelek to nie
      // powód do przełączania (sieć bywa kapryśna), ale odmowa autoryzacji owszem —
      // wtedy schodzimy na OSM, który nie wymaga żadnego klucza.
      let basemapFellBack = false;
      map.on("error", (e) => {
        const status = (e as { error?: { status?: number } }).error?.status;
        const src = (e as { sourceId?: string }).sourceId;
        const isBasemap = src === "tomtom" || src === "osm" || src === undefined;
        if (basemapFellBack || !isBasemap) return;
        if (status !== 401 && status !== 403 && status !== 404) return;
        basemapFellBack = true;
        try {
          (map as MlMap).setStyle(OSM_STYLE);
          setBasemap("osm");
          toast(t("mapPage.basemapKeyInvalid"), "error");
        } catch {
          // nawet awaryjne przełączenie nie może wywalić ekranu mapy
        }
      });

      // Klik na mapie w trybie zgłoszeń.
      map.on("click", (e) => {
        if (!reportModeRef.current) return;
        // #367: MapLibre odpala ten handler TAKŻE przy kliknięciu w pinezkę warstwy, więc
        // otwarcie popupu POI/incydentu/zgłoszenia/zapisanego miejsca zakładało przy okazji
        // fałszywe zgłoszenie (wypadek/policja/waga) we WSPÓLNEJ tabeli `map_reports` —
        // widoczne dla wszystkich firm i nie do cofnięcia z mapy. Ten sam guard co w `contextmenu`.
        const m = map as MlMap;
        const hitLayers = CLICKABLE_LAYERS.filter((id) => m.getLayer(id));
        if (hitLayers.length > 0 && m.queryRenderedFeatures(e.point, { layers: hitLayers }).length)
          return;
        insertMapReport(getBrowserSupabase(), {
          type: reportTypeRef.current,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        }).catch(() => setReportMsg(t("mapPage.reportFailed")));
      });

      // Handlery warstw — rejestrowane RAZ (działają, gdy warstwa istnieje).
      map.on("click", "reports-layer", (e) => {
        const f = e.features?.[0];
        if (f?.geometry.type !== "Point") return;
        const p = f.properties as { label?: string; comment?: string } | null;
        const [lng, lat] = f.geometry.coordinates as [number, number];
        new ml.Popup()
          .setLngLat([lng, lat])
          .setHTML(
            `<strong>${escapeHtml(p?.label ?? t("mapPage.reportPopupFallback"))}</strong>${p?.comment ? `<br/>${escapeHtml(p.comment)}` : ""}`,
          )
          .addTo(map as MlMap);
      });

      map.on("click", "pois-layer", (e) => {
        const f = e.features?.[0];
        if (f?.geometry.type !== "Point") return;
        const props = f.properties as { id?: string; name?: string; type?: string } | null;
        const [lng, lat] = f.geometry.coordinates as [number, number];
        const poiKey = POI_LABEL[props?.type ?? ""];
        const kindLabel = poiKey ? t(poiKey) : t("mapPage.poiFallback");
        const name = props?.name || kindLabel;
        const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        // [#383] Komplet tagów (adres, marka, telefon, strona, godziny otwarcia) bierzemy
        // z `poisRef` po `id` z properties — warstwa GeoJSON niesie tylko `{id,name,type}`,
        // a dane i tak już mamy w pamięci. Bez tego kroku pobrane (i opłacone) tagi OSM
        // ginęły tuż przed renderem i dymek pokazywał samą nazwę.
        const poi = props?.id ? poisRef.current.find((p) => p.id === String(props.id)) : undefined;
        const popup = new ml.Popup({ maxWidth: "320px" })
          .setLngLat([lng, lat])
          .setHTML(
            `<strong>${escapeHtml(name)}</strong><br/>${escapeHtml(kindLabel)}` +
              poiDetailsHtml(poi, t, new Date()) +
              `<div style="margin-top:4px">📍 <code>${coords}</code></div>` +
              `<a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" rel="noreferrer">${t("mapPage.navigate")} ↗</a>` +
              `<br/><button type="button" data-add-stop style="margin-top:6px;cursor:pointer">➕ ${t("mapPage.addAsStop")}</button>` +
              (props?.type === "parking" && props?.id
                ? `<div data-rating style="margin-top:8px;border-top:1px solid #444;padding-top:6px;min-width:220px">⏳ ${t("mapPage.parkingRatingsLoading")}</div>`
                : ""),
          )
          .addTo(map as MlMap);
        // #308: oceny i udogodnienia parkingu (dane społecznościowe)
        if (props?.type === "parking" && props?.id) {
          const poiId = String(props.id);
          void (async () => {
            const box = popup.getElement()?.querySelector("[data-rating]") as HTMLElement | null;
            if (!box) return;
            const sb = getBrowserSupabase();
            const render = async () => {
              const sum = (await parkingSummaries(sb, [poiId]).catch(() => new Map())).get(poiId);
              const head = sum
                ? `★ <strong>${sum.avg}</strong>/5 (${sum.count}) · 🚿${sum.shower} 🚻${sum.wc} 🍽${sum.food} 🛡${sum.security}`
                : t("mapPage.noRatingsBeFirst");
              box.innerHTML =
                `<div>${head}</div>` +
                `<div style="margin-top:4px">${[1, 2, 3, 4, 5]
                  .map(
                    (n) =>
                      `<button type="button" data-star="${n}" style="cursor:pointer;background:none;border:none;font-size:16px;padding:1px">☆</button>`,
                  )
                  .join("")}</div>` +
                `<label style="font-size:11px;margin-right:6px"><input type="checkbox" data-am="shower"/>🚿</label>` +
                `<label style="font-size:11px;margin-right:6px"><input type="checkbox" data-am="wc"/>🚻</label>` +
                `<label style="font-size:11px;margin-right:6px"><input type="checkbox" data-am="food"/>🍽</label>` +
                `<label style="font-size:11px"><input type="checkbox" data-am="security"/>🛡</label>` +
                `<button type="button" data-save-review style="display:block;margin-top:6px;cursor:pointer">💾 ${t("mapPage.saveRating")}</button>`;
              let rating = 0;
              const stars = [...box.querySelectorAll<HTMLButtonElement>("[data-star]")];
              for (const btn of stars) {
                btn.addEventListener("click", () => {
                  rating = Number(btn.dataset.star);
                  for (const b of stars)
                    b.textContent = Number(b.dataset.star) <= rating ? "★" : "☆";
                });
              }
              box.querySelector("[data-save-review]")?.addEventListener("click", async () => {
                if (!rating) return;
                const am = (k: string) =>
                  (box.querySelector(`[data-am="${k}"]`) as HTMLInputElement | null)?.checked ??
                  false;
                try {
                  await upsertParkingReview(sb, {
                    poiId,
                    poiName: name,
                    lat,
                    lng,
                    rating,
                    hasShower: am("shower"),
                    hasWc: am("wc"),
                    hasFood: am("food"),
                    security: am("security"),
                  });
                  await render();
                } catch {
                  box.insertAdjacentHTML(
                    "beforeend",
                    `<div style="color:#e50914">${t("mapPage.notSavedLogin")}</div>`,
                  );
                }
              });
            };
            await render();
          })();
        }
        popup
          .getElement()
          ?.querySelector("[data-add-stop]")
          ?.addEventListener("click", () => {
            const key = newId();
            setStops((s) => {
              const next = [...s];
              next.splice(next.length - 1, 0, { key, label: name, lat, lng });
              return next;
            });
            setQueries((q) => ({ ...q, [key]: name }));
            popup.remove();
          });
      });
      map.on("mouseenter", "pois-layer", () => {
        (map as MlMap).getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "pois-layer", () => {
        (map as MlMap).getCanvas().style.cursor = "";
      });

      // #358: incydenty ruchu TomTom — popup z opisem na klik.
      // [#383] rejestrujemy dla OBU warstw incydentów (własny przełącznik + warstwa ruchu
      // w konfiguracji tylko-TomTom), żeby pinezki z `/api/traffic` nie były nieklikalne.
      for (const layerId of ["incidents-layer", "traffic-incidents-layer"] as const) {
        map.on("click", layerId, (e) => {
          const f = e.features?.[0];
          if (f?.geometry.type !== "Point") return;
          const props = f.properties as { severity?: string; description?: string } | null;
          const [lng, lat] = f.geometry.coordinates as [number, number];
          const sev = (props?.severity ?? "unknown") as keyof typeof INCIDENT_LABEL;
          const title = t(INCIDENT_LABEL[sev]);
          new ml.Popup()
            .setLngLat([lng, lat])
            .setHTML(
              `<strong>${escapeHtml(title)}</strong>${props?.description ? `<br/>${escapeHtml(props.description)}` : ""}`,
            )
            .addTo(map as MlMap);
        });
        map.on("mouseenter", layerId, () => {
          (map as MlMap).getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          (map as MlMap).getCanvas().style.cursor = "";
        });
      }

      // #367: zapisane miejsce firmy — popup z nazwą i dodaniem do trasy.
      // Pełny `SavedPlace` bierzemy z `savedRef` po `id` z properties, żeby użyć
      // dokładnie tej samej ścieżki co chipsy (addSavedAsStop → delta trasy).
      map.on("click", "saved-layer", (e) => {
        const f = e.features?.[0];
        if (f?.geometry.type !== "Point") return;
        const props = f.properties as { id?: string; name?: string; icon?: string } | null;
        const [lng, lat] = f.geometry.coordinates as [number, number];
        const name = props?.name || t("mapPage.savedPlaceDefault");
        const popup = new ml.Popup()
          .setLngLat([lng, lat])
          .setHTML(
            `<strong>${escapeHtml(props?.icon ?? "📍")} ${escapeHtml(name)}</strong>` +
              `<br/>📍 <code>${lat.toFixed(5)}, ${lng.toFixed(5)}</code>` +
              `<br/><button type="button" data-add-saved style="margin-top:6px;cursor:pointer">➕ ${t("mapPage.addAsStop")}</button>`,
          )
          .addTo(map as MlMap);
        popup
          .getElement()
          ?.querySelector("[data-add-saved]")
          ?.addEventListener("click", () => {
            const place = savedRef.current.find((p) => p.id === props?.id);
            if (place) addSavedStopRef.current?.(place);
            popup.remove();
          });
      });
      map.on("mouseenter", "saved-layer", () => {
        (map as MlMap).getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "saved-layer", () => {
        (map as MlMap).getCanvas().style.cursor = "";
      });

      // #367: PRAWY przycisk (contextmenu) = „dodaj przystanek tutaj" z reverse-geocode.
      // Świadomie NIE lewy: lewy jest już zajęty przez tryb zgłoszeń, a MapLibre odpala
      // handler mapy także przy kliknięciu w punkt warstwy — lewy klik dokładałby
      // przystanek przy każdym otwarciu popupu POI/zgłoszenia i przy zwykłym pudle.
      // Prawy klik nie koliduje z niczym i jest utartym wzorcem („dodaj punkt tutaj").
      map.on("contextmenu", (e) => {
        // W trybie zgłoszeń klik na mapie ma dotychczasowe znaczenie — nie mieszamy.
        if (reportModeRef.current) return;
        const m = map as MlMap;
        const layers = CLICKABLE_LAYERS.filter((id) => m.getLayer(id));
        if (layers.length > 0 && m.queryRenderedFeatures(e.point, { layers }).length > 0) return;
        e.originalEvent.preventDefault();
        addStopAtRef.current?.(e.lngLat.lat, e.lngLat.lng);
      });

      map.on("load", () => {
        applyOverlays();
        setMapReady(true);
        (async () => {
          try {
            const sb = getBrowserSupabase();
            reportsRef.current = (await listActiveMapReports(sb)) as Report[];
            drawReports();
            recomputeDisruptions();
            channel = sb
              .channel("map-reports")
              .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "map_reports" },
                (payload) => {
                  const r = payload.new as Report;
                  if (r.lat != null && r.lng != null) {
                    reportsRef.current = [...reportsRef.current.filter((x) => x.id !== r.id), r];
                    drawReports();
                    recomputeDisruptions();
                  }
                },
              )
              .subscribe();
          } catch {
            // offline → brak warstwy zgłoszeń
          }
        })();
      });
    })();
    return () => {
      channel?.unsubscribe();
      for (const m of markersRef.current) m.remove();
      map?.remove();
    };
  }, [applyOverlays, drawReports, recomputeDisruptions, t, toast]);

  // ── Warstwa ruchu HERE: pobierz dla widoku + odświeżaj przy przesuwaniu ──
  useEffect(() => {
    trafficOnRef.current = trafficOn;
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (!trafficOn) {
      drawTraffic([]);
      // [#383] warstwa ruchu potrafi rysować też punktowe utrudnienia (tylko-TomTom) —
      // wyłączenie przełącznika musi sprzątnąć OBA kształty, nie tylko linie.
      drawTrafficIncidents([]);
      setTrafficMsg(null);
      return;
    }
    let t: ReturnType<typeof setTimeout> | null = null;
    const onMove = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void fetchTrafficForView(), 600);
    };
    void fetchTrafficForView();
    map.on("moveend", onMove);
    return () => {
      if (t) clearTimeout(t);
      map.off("moveend", onMove);
    };
  }, [trafficOn, mapReady, fetchTrafficForView, drawTraffic, drawTrafficIncidents]);

  // ── Warstwa incydentów TomTom: pobierz dla widoku + odświeżaj przy ruchu mapy ──
  useEffect(() => {
    incidentsOnRef.current = incidentsOn;
    const map = mapRef.current;
    if (!mapReady || !map) return;
    // [#383] Warstwa ruchu w konfiguracji tylko-TomTom rysuje TE SAME incydenty, a decyzję
    // „rysować czy tylko powiedzieć" podejmuje po `incidentsOnRef`. Po zmianie tego
    // przełącznika trzeba ją odświeżyć, inaczej pinezki albo się zdublują, albo znikną.
    if (trafficOnRef.current) void fetchTrafficForView();
    if (!incidentsOn) {
      drawIncidents([]);
      setIncidentMsg(null);
      return;
    }
    let t: ReturnType<typeof setTimeout> | null = null;
    const onMove = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void fetchIncidentsForView(), 600);
    };
    void fetchIncidentsForView();
    map.on("moveend", onMove);
    return () => {
      if (t) clearTimeout(t);
      map.off("moveend", onMove);
    };
  }, [incidentsOn, mapReady, fetchIncidentsForView, fetchTrafficForView, drawIncidents]);

  // ── [#383] Warstwa odcinków płatnych: dane z ostatniego wyniku routingu ──
  useEffect(() => {
    tollLayerOnRef.current = tollLayerOn;
    routeResultRef.current = result;
    if (!mapReady) return;
    // Wyłączona warstwa / brak trasy = pusta kolekcja (jak przy ruchu), nie usuwanie warstwy.
    drawToll(result?.geometry ?? [], tollLayerOn && result ? result.tollSections.sections : []);
  }, [tollLayerOn, result, mapReady, drawToll]);

  // ── #367: warstwa zapisanych miejsc firmy (dane z bazy, bez zapytań do API) ──
  useEffect(() => {
    savedRef.current = saved;
    savedLayerOnRef.current = savedLayerOn;
    if (!mapReady) return;
    // Wyłączona warstwa = pusta kolekcja (jak przy ruchu/incydentach), nie usuwanie warstwy.
    drawSaved(savedLayerOn ? saved : []);
  }, [saved, savedLayerOn, mapReady, drawSaved]);

  // ── Znaczniki przystanków (DOM — przetrwają zmianę stylu) ──
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml) return;
    for (const m of markersRef.current) m.remove();
    markersRef.current = stops.map((st, i) => {
      const color = i === 0 ? "#22c55e" : i === stops.length - 1 ? palette.red : "#f59e0b";
      const role =
        i === 0
          ? t("mapPage.start")
          : i === stops.length - 1
            ? t("mapPage.destination")
            : `${t("mapPage.stop")} ${i}`;
      const popup = new ml.Popup({ offset: 24 }).setHTML(
        `<strong>${escapeHtml(role)}</strong><br/>${escapeHtml(st.label)}<br/>📍 <code>${st.lat.toFixed(5)}, ${st.lng.toFixed(5)}</code>`,
      );
      return new ml.Marker({ color }).setLngLat([st.lng, st.lat]).setPopup(popup).addTo(map);
    });
  }, [stops, mapReady, t]);

  // ── Wyszukiwarka miejsc (geokoder) ──
  function onQueryChange(key: string, value: string) {
    setQueries((q) => ({ ...q, [key]: value }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setHits((h) => ({ ...h, [key]: [] }));
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const results = await geocode(value, {
        tomtomKey: TOMTOM_KEY || undefined,
        maptilerKey: MAPTILER_KEY,
      });
      setHits((h) => ({ ...h, [key]: results }));
    }, 350);
  }

  function pickHit(key: string, hit: GeoHit) {
    setStops((s) =>
      s.map((st) =>
        st.key === key ? { ...st, label: hit.label, lat: hit.lat, lng: hit.lng } : st,
      ),
    );
    setQueries((q) => ({ ...q, [key]: hit.label }));
    setHits((h) => ({ ...h, [key]: [] }));
    mapRef.current?.flyTo({ center: [hit.lng, hit.lat], zoom: 9 });
  }

  function addStop() {
    const key = newId();
    setStops((s) => {
      const next = [...s];
      next.splice(next.length - 1, 0, { key, label: t("mapPage.newStop"), lat: 50, lng: 15 });
      return next;
    });
    setQueries((q) => ({ ...q, [key]: "" }));
  }
  function removeStop(key: string) {
    setStops((s) => (s.length > 2 ? s.filter((st) => st.key !== key) : s));
  }

  /**
   * #367: dodaje przystanek w miejscu wskazanym na mapie (prawy klik). Etykietę
   * bierze z reverse-geocode TomTom; bez `NEXT_PUBLIC_TOMTOM_KEY` albo przy błędzie
   * sieci/limitu zostają współrzędne — funkcja nigdy nie rzuca. Wstawia przed cel,
   * tak samo jak addStop()/addSavedAsStop(), więc reguły trasy zostają bez zmian.
   */
  async function addStopAt(lat: number, lng: number) {
    let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (TOMTOM_KEY) {
      try {
        // #367: język adresu zgodny z UI — domyślnie TomTom zwraca „pl-PL", więc panel
        // po angielsku dostawał polskie etykiety przystanków. `lang` ustawia `(app)/layout`.
        const uiLang = document.documentElement.lang === "en" ? "en-GB" : "pl-PL";
        const hit = await tomtomReverseGeocode(lat, lng, TOMTOM_KEY, { language: uiLang });
        const named = hit?.label || [hit?.postcode, hit?.city].filter(Boolean).join(" ").trim();
        if (named) label = named;
      } catch {
        // brak sieci / limit TomTom → zostaje etykieta ze współrzędnych
      }
    }
    const key = newId();
    setStops((s) => {
      const next = [...s];
      next.splice(next.length - 1, 0, { key, label, lat, lng });
      return next;
    });
    setQueries((q) => ({ ...q, [key]: label }));
    // useT() na webie nie ma interpolacji — sklejamy komunikat w kodzie.
    toast(`➕ ${t("mapPage.stopAdded")}: ${label}`, "success");
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setShareMsg(t("mapPage.gpsUnavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setStops((s) =>
          s.map((st, i) => (i === 0 ? { ...st, label: t("mapPage.myLocation"), lat, lng } : st)),
        );
        setQueries((q) => ({ ...q, "s-start": t("mapPage.myLocation") }));
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 11 });
      },
      () => setShareMsg(t("mapPage.locationError")),
    );
  }

  async function saveStart() {
    const start = stops[0];
    if (!start || !companyId) return;
    if (saved.some((p) => p.lat === start.lat && p.lng === start.lng)) return;
    try {
      const created = await insertSavedPlace(getBrowserSupabase(), companyId, {
        name: start.label || t("mapPage.savedPlaceDefault"),
        category: savedCat,
        lat: start.lat,
        lng: start.lng,
      });
      setSaved((s) => [...s, created].sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      setShareMsg(t("mapPage.savePlaceError"));
    }
  }

  async function removeSaved(id: string) {
    try {
      await deleteSavedPlace(getBrowserSupabase(), id);
      setSaved((s) => s.filter((p) => p.id !== id));
    } catch {
      setShareMsg(t("mapPage.removePlaceError"));
    }
  }

  // Czytelny opis różnicy trasy po dodaniu miejsca.
  function describeDelta(name: string, d: ReturnType<typeof routeDelta>): string {
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

  async function addSavedAsStop(p: SavedPlace) {
    setDeltaMsg(null);
    const before = result;
    const key = newId();
    const next = [...stops];
    next.splice(next.length - 1, 0, { key, label: p.name, lat: p.lat, lng: p.lng });
    setStops(next);
    setQueries((q) => ({ ...q, [key]: p.name }));
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 8 });
    // Jeśli trasa była już wyznaczona — przelicz i pokaż różnicę (delta).
    if (before) {
      const after = await plan(next.map((st) => ({ lat: st.lat, lng: st.lng })));
      if (after) {
        setDeltaMsg(
          describeDelta(
            p.name,
            routeDelta(
              {
                distanceKm: before.distanceKm,
                durationMin: before.durationMin,
                tollEur: before.tollCost,
              },
              {
                distanceKm: after.distanceKm,
                durationMin: after.durationMin,
                tollEur: after.tollCost,
              },
            ),
          ),
        );
      }
    }
  }

  async function openSendToDriver() {
    if (sendDrivers) {
      setSendDrivers(null);
      return;
    }
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      setSendDrivers(await listDrivers(sb, m.companyId));
    } catch {
      setShareMsg(t("mapPage.driversOwnerOnly"));
    }
  }

  async function sendRouteToDriver() {
    if (!companyId || !sendDriverId || sendBusy) return;
    const geo = routeGeoRef.current;
    setSendBusy(true);
    try {
      const first = stops[0]?.label ?? "";
      const last = stops[stops.length - 1]?.label ?? "";
      await sendDriverRoute(getBrowserSupabase(), companyId, sendDriverId, {
        name: `${first} → ${last}`,
        stops: stops.map((st) => ({ lat: st.lat, lng: st.lng, label: st.label })),
        geometry: (geo ?? []).map((pt) => [pt.lng, pt.lat] as [number, number]),
        summary: result
          ? {
              distanceKm: result.distanceKm,
              durationMin: result.durationMin,
              tollCost: result.tollCost,
              currency: result.currency,
            }
          : {},
      });
      setShareMsg(t("mapPage.routeSent"));
      setSendDrivers(null);
      setSendDriverId("");
    } catch (e) {
      setShareMsg(e instanceof Error ? e.message : t("mapPage.routeSendError"));
    } finally {
      setSendBusy(false);
    }
  }

  function shareRoute() {
    const r = stops
      .map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)},${encodeURIComponent(s.label)}`)
      .join("|");
    const url = `${window.location.origin}/map?r=${r}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => setShareMsg(t("mapPage.linkCopied")))
      .catch(() => setShareMsg(url));
  }

  function switchBasemap(key: BasemapKey) {
    setBasemap(key);
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(basemapStyle(key));
    map.once("style.load", () => {
      applyOverlays();
      // #358: setStyle wymazuje warstwy ruchu (HERE) i incydentów (TomTom) — odtwórz gdy włączone.
      if (trafficOnRef.current) void fetchTrafficForView();
      if (incidentsOnRef.current) void fetchIncidentsForView();
    });
  }

  function toggleTerrain(on: boolean) {
    setTerrain3d(on);
    terrainOnRef.current = on;
    const map = mapRef.current;
    if (!map || !MAPTILER_KEY) return;
    if (!map.getSource("terrain-dem")) {
      map.addSource("terrain-dem", {
        type: "raster-dem",
        url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
      });
    }
    map.setTerrain(on ? { source: "terrain-dem", exaggeration: 1.25 } : null);
    map.easeTo({ pitch: on ? 60 : 0, duration: 600 });
  }

  function toggleGlobe(on: boolean) {
    setGlobe(on);
    globeOnRef.current = on;
    try {
      (
        mapRef.current as unknown as { setProjection: (p: { type: string }) => void } | null
      )?.setProjection({
        type: on ? "globe" : "mercator",
      });
    } catch {
      // brak wsparcia
    }
  }

  // Filtr stacji wg akceptacji kart (poglądowy): zostawia parkingi + stacje marek z kart.
  const applyPoiFilter = useCallback(() => {
    const providers = Array.from(cardProviders);
    const active = cardFilterOn && providers.length > 0;
    const filtered = active
      ? allPoisRef.current.filter(
          (p) =>
            p.type !== "fuel_station" ||
            stationMatchesProviders(
              `${p.tags.brand ?? ""} ${p.tags.operator ?? ""} ${p.name ?? ""}`,
              providers,
            ),
        )
      : allPoisRef.current;
    poisRef.current = filtered;
    setPoiCount(filtered.length);
    // [#383] Legenda pokazuje LICZBY z tego, co faktycznie leży na mapie — pozycja bez
    // ani jednego punktu nie ma prawa wisieć w legendzie jako obietnica.
    setPoiKinds({
      fuel: filtered.filter((p) => p.type === "fuel_station").length,
      parking: filtered.filter((p) => p.type === "parking").length,
    });
    drawPois(filtered);
  }, [cardFilterOn, cardProviders, drawPois]);

  // Przełączenie filtra/marki → ponowne przeliczenie bez pobierania z Overpass.
  useEffect(() => {
    if (allPoisRef.current.length) applyPoiFilter();
  }, [applyPoiFilter]);

  async function loadPois() {
    const map = mapRef.current;
    if (!map) return;
    setPoiBusy(true);
    try {
      const b = map.getBounds();
      const pois = await fetchPois({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      });
      allPoisRef.current = pois;
      applyPoiFilter();
    } catch {
      setPoiCount(0);
    } finally {
      setPoiBusy(false);
    }
  }

  /** POI w korytarzu wzdłuż wytyczonej trasy (≤6 km od linii). */
  async function loadPoisAlongRoute() {
    const geo = routeGeoRef.current;
    if (!geo || geo.length < 2) {
      setShareMsg(t("mapPage.planRouteFirst"));
      return;
    }
    setPoiBusy(true);
    try {
      // reduce zamiast Math.min(...arr) — spread wywala stos przy bardzo długich trasach.
      const bbox = geo.reduce(
        (b, p) => ({
          south: Math.min(b.south, p.lat),
          west: Math.min(b.west, p.lng),
          north: Math.max(b.north, p.lat),
          east: Math.max(b.east, p.lng),
        }),
        { south: 90, west: 180, north: -90, east: -180 },
      );
      const all = await fetchPois(bbox);
      // Indeks kratowy (#261) zamiast O(n·m): POI zostaje, gdy ≤6 km od linii trasy.
      const index = buildGridIndex(geo, 6);
      const near = all.filter((poi) => anyWithinKm(index, { lat: poi.lat, lng: poi.lng }, 6));
      allPoisRef.current = near;
      applyPoiFilter();
    } catch {
      setPoiCount(0);
    } finally {
      setPoiBusy(false);
    }
  }

  /** #358: paliwo/parking WZDŁUŻ trasy (TomTom searchAlongRoute) — próbkowanie ≤100 pkt. */
  async function loadTomtomAlongRoute(query: "fuel" | "parking", type: "fuel_station" | "parking") {
    if (!TOMTOM_KEY) return;
    const geo = routeGeoRef.current;
    if (!geo || geo.length < 2) {
      setShareMsg(t("mapPage.planRouteFirst"));
      return;
    }
    setPoiBusy(true);
    try {
      // TomTom zwraca 400 przy zbyt gęstej geometrii — próbkuj do ≤100 pkt (1. i ostatni zawsze).
      // Dzielnik 99 (nie 100): pętla daje ≤99 punktów, +1 dołożony ostatni = ≤100.
      const step = Math.max(1, Math.ceil(geo.length / 99));
      const sampled: LatLng[] = [];
      for (let i = 0; i < geo.length; i += step) {
        const pt = geo[i];
        if (pt) sampled.push(pt);
      }
      const last = geo[geo.length - 1];
      if (last && sampled[sampled.length - 1] !== last) sampled.push(last);
      const found = await tomtomSearchAlongRoute(sampled, query, TOMTOM_KEY, {
        maxDetourSec: 600,
        limit: 20,
      });
      // TomTomPoi nie ma pola `type` — dodajemy je ręcznie do kształtu Poi.
      // [#383] `tags: {}` wyrzucało adres (`freeformAddress`) i dystans, które TomTom
      // zwrócił w TYM SAMYM (płatnym) zapytaniu — dymek pokazywał samą nazwę stacji.
      // Adres wchodzi pod `addr:full` (prawdziwy tag OSM), więc dymek czyta go tą samą
      // ścieżką co POI z Overpassa; dystans pod własnym kluczem `x:`.
      const pois: Poi[] = found.map((p) => {
        const tags: Record<string, string> = {};
        if (p.address) tags[POI_TAG_ADDRESS] = p.address;
        if (p.distanceM != null) tags[POI_TAG_DISTANCE_M] = String(p.distanceM);
        return { id: p.id, type, name: p.name, lat: p.lat, lng: p.lng, tags };
      });
      allPoisRef.current = pois;
      applyPoiFilter();
      if (pois.length === 0) setShareMsg(t("mapPage.noResultsAlongRoute"));
    } catch {
      setPoiCount(0);
    } finally {
      setPoiBusy(false);
    }
  }

  /** Ceny paliwa w okolicy środka mapy (Tankerkönig, DE) — wymaga klucza serwerowego. */
  async function loadFuelPrices() {
    const map = mapRef.current;
    if (!map) return;
    setFuelPriceBusy(true);
    setFuelPriceMsg(null);
    try {
      const c = map.getCenter();
      const res = await fetch(`/api/fuel-prices?lat=${c.lat}&lng=${c.lng}&radius=15`);
      const data = (await res.json()) as { configured: boolean; stations: FuelStationPrice[] };
      if (!data.configured) {
        setFuelPriceMsg(t("mapPage.fuelPricesNeedKey"));
        setFuelPrices([]);
        return;
      }
      const withDiesel = data.stations
        .filter((s) => s.diesel != null)
        .sort((a, b) => (a.diesel ?? 0) - (b.diesel ?? 0))
        .slice(0, 8);
      setFuelPrices(withDiesel);
      if (withDiesel.length === 0) setFuelPriceMsg(t("mapPage.noFuelPricesNearby"));
    } catch {
      setFuelPriceMsg(t("mapPage.fuelPricesError"));
    } finally {
      setFuelPriceBusy(false);
    }
  }

  // #309: recomputeDisruptions (starszy useCallback) woła plan() przez ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  planRef.current = () => void plan();
  // #367: handlery mapy rejestrowane RAZ (popup zapisanego miejsca, prawy klik)
  // sięgają po świeże funkcje przez refy — tak samo jak planRef wyżej.
  addSavedStopRef.current = (p) => void addSavedAsStop(p);
  addStopAtRef.current = (lat, lng) => void addStopAt(lat, lng);

  async function plan(override?: { lat: number; lng: number }[]): Promise<RouteResponse | null> {
    setBusy(true);
    try {
      const waypoints = override ?? stops.map((st) => ({ lat: st.lat, lng: st.lng }));
      /*
        [#385] Profil idzie z formularza zasilonego kartoteką pojazdu, a nie ze stałych
        w tym miejscu. Poprzednia wersja robiła `Number(weightT) || 24` i `|| undefined`
        na wymiarach, więc wyczyszczone pole cicho zamieniało się w 24 tony, a wpisane
        „0" znikało bez śladu. Teraz brak parametru jest brakiem — i widać go na ekranie.
      */
      const profile: VehicleProfile = kindHeavy ? truckProfile : { kind: "van", weightKg: 3000 };
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints,
          profile,
          options: { avoidTolls, avoidFerries, avoidCountries: avoidCH ? ["CH"] : [] },
        }),
      });
      // #W1: strażnik statusu — 429 (rate-limit) / 4xx zwraca `{ error }` bez geometry/segments;
      // bez tego setResult(obiekt błędu) wchodzi w render RouteSummary i wywala go na
      // `result.segments.length` (undefined). Auto-reroute (#309) może wywołać burst 429.
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        toast(e.error ?? t("mapPage.routeError"), "error");
        return null;
      }
      const r = (await res.json()) as RouteResponse;
      // #W1: waliduj kształt odpowiedzi przed użyciem — 2xx bez geometry/segments też
      // wywaliłby drawRoute/itemsNearRoute/render, a brak `catch` = nieobsłużone odrzucenie.
      if (!Array.isArray(r.geometry) || !Array.isArray(r.segments)) {
        toast(t("mapPage.routeInvalidResponse"), "error");
        return null;
      }
      setResult(r);
      /*
        [#385] Zapamiętujemy profil UŻYTY do tej trasy, a nie bieżący stan formularza:
        po przeliczeniu użytkownik może zmienić wymiary, a pasek pod wynikiem miałby
        wtedy opisywać trasę, której nikt nie liczył.
      */
      setPlannedProfile({
        registration: selectedVehicle?.registration ?? null,
        profile,
        missing: kindHeavy ? missingDimensions(profile) : [],
        heavy: kindHeavy,
      });
      /*
        [#385] Uwaga krytyczna (np. `profileDowngradedToCar`) mówi, że dostawca policzył
        trasę INNYM pojazdem niż zamówiony. Panel wyniku bywa przewinięty poza ekran,
        więc taka uwaga dostaje dodatkowo toast — to nie jest informacja do przeoczenia.
      */
      const notices = Array.isArray(r.notices) ? r.notices : [];
      for (const n of notices) {
        if ((n.severity ?? "").toLowerCase() !== "critical") continue;
        toast(`⛔ ${t("mapPage.providerNotice")}: ${n.title ?? n.code}`, "error");
      }
      routeGeoRef.current = r.geometry;
      // #309: znane utrudnienia liczymy od nowej trasy (bez ponownego reroute po własnym przeliczeniu)
      knownDisruptionIdsRef.current = new Set(
        itemsNearRoute(reportsRef.current, r.geometry, DISRUPTION_RADIUS_KM).map((d) => d.id),
      );
      drawRoute(r.geometry);
      recomputeDisruptions();
      const map = mapRef.current;
      const ml = mlRef.current;
      if (map && ml && r.geometry.length > 1) {
        const coords = r.geometry.map((p) => [p.lng, p.lat] as [number, number]);
        const first = coords[0];
        if (first) {
          const bounds = coords.reduce((bb, c) => bb.extend(c), new ml.LngLatBounds(first, first));
          map.fitBounds(bounds, { padding: 70, duration: 700 });
        }
      }
      return r;
    } catch {
      // #W1: sieć/parse/nieoczekiwany wyjątek — komunikat zamiast nieobsłużonego odrzucenia.
      toast(t("mapPage.routeError"), "error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  // Prefill trasy z parametrów ?from=...&to=... (np. „Pokaż na mapie" ze zlecenia).
  // Geokoduje oba punkty, ustawia start/koniec i automatycznie wyznacza trasę.
  // biome-ignore lint/correctness/useExhaustiveDependencies: jednorazowy prefill po gotowości mapy
  useEffect(() => {
    if (prefillDone.current || !mapReady) return;
    const sp = new URLSearchParams(window.location.search);
    const from = sp.get("from")?.trim();
    const to = sp.get("to")?.trim();
    if (!from && !to) return;
    prefillDone.current = true;
    (async () => {
      try {
        const [fh, th] = await Promise.all([
          from
            ? geocode(from, { tomtomKey: TOMTOM_KEY || undefined, maptilerKey: MAPTILER_KEY })
            : Promise.resolve([] as GeoHit[]),
          to
            ? geocode(to, { tomtomKey: TOMTOM_KEY || undefined, maptilerKey: MAPTILER_KEY })
            : Promise.resolve([] as GeoHit[]),
        ]);
        const start = fh[0];
        const end = th[0];
        setStops((s) => {
          const next = [...s];
          const first = next[0];
          const last = next[next.length - 1];
          if (first) {
            next[0] = start
              ? { ...first, label: start.label, lat: start.lat, lng: start.lng }
              : from
                ? { ...first, label: from }
                : first;
          }
          if (last) {
            next[next.length - 1] = end
              ? { ...last, label: end.label, lat: end.lat, lng: end.lng }
              : to
                ? { ...last, label: to }
                : last;
          }
          return next;
        });
        setQueries((q) => ({
          ...q,
          "s-start": start?.label ?? from ?? q["s-start"] ?? "",
          "s-end": end?.label ?? to ?? q["s-end"] ?? "",
        }));
        if (start && end) {
          await plan([
            { lat: start.lat, lng: start.lng },
            { lat: end.lat, lng: end.lng },
          ]);
        }
      } catch {
        // brak geokodowania → zostają same etykiety, użytkownik dokończy ręcznie
      }
    })();
  }, [mapReady]);

  const fuelTotal = result
    ? fuelCost(
        (result.distanceKm * (Number(consumption) || 0)) / 100,
        Number(fuelPrice) || 0,
        Number(fuelDiscount) || 0,
      )
    : 0;
  const grandTotal = result ? Math.round((result.tollCost + fuelTotal) * 100) / 100 : 0;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("mapPage.title")}</h1>
      <p style={{ color: cssPalette.smoke, marginTop: 4 }}>
        {t("mapPage.subtitle")}
        {MAPTILER_KEY ? "" : ` ${t("mapPage.subtitleAddKey")}`}.
      </p>

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div className={styles.panel}>
          <StopsEditor
            stops={stops}
            queries={queries}
            hits={hits}
            onQueryChange={onQueryChange}
            removeStop={removeStop}
            pickHit={pickHit}
          />

          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className={styles.ghost} style={{ flex: 1 }} onClick={addStop}>
              ➕ {t("mapPage.stop")}
            </button>
            <button
              type="button"
              className={styles.ghost}
              style={{ flex: 1 }}
              onClick={useMyLocation}
            >
              📍 {t("mapPage.myLocation")}
            </button>
          </div>
          {/* #367: podpowiedź do nowej interakcji — prawy klik dodaje przystanek z adresem. */}
          <div style={{ fontSize: 12, color: cssPalette.smoke }}>
            🖱️ {t("mapPage.rightClickAddStop")}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={savedCat}
              onChange={(e) => setSavedCat(e.target.value as SavedPlaceCategory)}
              className={styles.ghost}
              style={{ flex: 1 }}
              title={t("mapPage.savedCategoryTitle")}
            >
              {SAVED_PLACE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SAVED_CAT_ICON[c]} {SAVED_PLACE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <button type="button" className={styles.ghost} style={{ flex: 1 }} onClick={saveStart}>
              ⭐ {t("mapPage.saveStart")}
            </button>
          </div>
          <button
            type="button"
            className={styles.ghost}
            style={{ width: "100%" }}
            onClick={shareRoute}
          >
            🔗 {t("mapPage.shareRoute")}
          </button>
          <button type="button" className={styles.ghost} onClick={openSendToDriver}>
            📤 {t("mapPage.sendToDriver")}
          </button>
          {sendDrivers && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                style={{ flex: 1, minWidth: 0 }}
                value={sendDriverId}
                onChange={(e) => setSendDriverId(e.target.value)}
              >
                <option value="">{t("mapPage.selectDriver")}</option>
                {sendDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.ghost}
                disabled={!sendDriverId || sendBusy}
                onClick={sendRouteToDriver}
              >
                {sendBusy ? "…" : t("mapPage.send")}
              </button>
            </div>
          )}
          {shareMsg && <div style={{ fontSize: 12, color: cssPalette.smoke }}>{shareMsg}</div>}
          {deltaMsg && (
            <div
              style={{
                fontSize: 12,
                color: cssPalette.offWhite,
                background: cssPalette.black,
                border: `1px solid ${cssPalette.graphite}`,
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              📊 {deltaMsg}
            </div>
          )}

          <SavedPlacesChips saved={saved} onAdd={addSavedAsStop} onRemove={removeSaved} />
          {/* #367: przełącznik warstwy zapisanych miejsc — spójny z ruchem/incydentami. */}
          {saved.length > 0 && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={savedLayerOn}
                onChange={(e) => setSavedLayerOn(e.target.checked)}
              />{" "}
              ⭐ {t("mapPage.savedPlacesLayer")}
            </label>
          )}

          <div style={{ height: 1, background: cssPalette.graphite, margin: "4px 0" }} />

          <span className={styles.label}>{t("mapPage.basemap")}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {BASEMAPS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => switchBasemap(b.key)}
                className={`${styles.segment} ${basemap === b.key ? styles.segmentActive : ""}`}
              >
                {t(b.label)}
              </button>
            ))}
          </div>
          {MAPTILER_KEY && (
            <>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={terrain3d}
                  onChange={(e) => toggleTerrain(e.target.checked)}
                />{" "}
                {t("mapPage.terrain3d")}
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={globe}
                  onChange={(e) => toggleGlobe(e.target.checked)}
                />{" "}
                {t("mapPage.globe3d")}
              </label>
            </>
          )}

          <div style={{ height: 1, background: cssPalette.graphite, margin: "4px 0" }} />

          <label className={styles.check}>
            <input
              type="checkbox"
              checked={kindHeavy}
              onChange={(e) => setKindHeavy(e.target.checked)}
            />{" "}
            {t("mapPage.truckRouting")}
          </label>
          {kindHeavy && (
            <>
              {/*
                [#385] Wybór pojazdu z kartoteki. Bez niego jedynym źródłem gabarytów były
                stałe w kodzie, a panel poniżej — domyślnie zwinięty; typowy użytkownik
                wysyłał więc zestaw domyślny, nie swój.
              */}
              <label className={styles.field}>
                <span className={styles.label}>🚛 {t("mapPage.vehicleFromFleet")}</span>
                <select
                  className={styles.input}
                  value={vehicleId}
                  onChange={(e) => pickVehicle(e.target.value)}
                >
                  <option value="">{t("mapPage.vehicleManual")}</option>
                  {fleet.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration}
                    </option>
                  ))}
                </select>
              </label>
              {fleet.length === 0 ? (
                <div style={{ fontSize: 12, color: cssPalette.smoke }}>
                  {t("mapPage.vehicleFleetEmpty")}
                </div>
              ) : !selectedVehicle ? (
                <div style={{ fontSize: 12, color: cssPalette.smoke }}>
                  ⚠️ {t("mapPage.vehicleManualHint")}
                </div>
              ) : profileOverridden ? (
                <div style={{ fontSize: 12, color: cssPalette.smoke }}>
                  ✎ {t("mapPage.vehicleOverridden")}
                </div>
              ) : null}
              <button
                type="button"
                className={styles.ghost}
                style={{ textAlign: "left", padding: "8px 10px" }}
                onClick={() => setDimsOpen((o) => !o)}
              >
                {/*
                  [#385] Podsumowanie na zwiniętym panelu pokazuje to, co POLECI do dostawcy
                  — z „?" w miejscu braków. Dotąd było tu „{weightT} t · {axles} osie", więc
                  puste pola dawały napis „( t ·  osie)", a brak wymiarów nie był widoczny wcale.
                */}
                {dimsOpen ? "▾" : "▸"} {t("mapPage.dimsAndTonnage")} (
                {formatProfileDims(truckProfile)} · {truckProfile.axleCount ?? "?"}{" "}
                {t("mapPage.axlesSuffix")})
              </button>
              {dimsOpen && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("mapPage.grossWeightT")}</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={weightT}
                      onChange={(e) => setWeightT(e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("mapPage.axles")}</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={axles}
                      onChange={(e) => setAxles(e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("mapPage.heightCm")}</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("mapPage.widthCm")}</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={widthCm}
                      onChange={(e) => setWidthCm(e.target.value)}
                    />
                  </label>
                  <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                    <span className={styles.label}>{t("mapPage.lengthCm")}</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={lengthCm}
                      onChange={(e) => setLengthCm(e.target.value)}
                    />
                  </label>
                  {/*
                    [#385] ADR i klasa emisji też są nadpisywalne — spedytor bywa proszony
                    o trasę dla zestawu, którego nie ma jeszcze w kartotece. PUSTE ADR znaczy
                    „ładunek zwykły", nie „nie wiemy", dlatego opcja pusta ma własny podpis
                    (ten sam co w kartotece pojazdów) i nie ostrzegamy o niej.
                  */}
                  <label className={styles.field}>
                    <span className={styles.label}>{t("vehicles.fieldAdrTunnel")}</span>
                    <select
                      className={styles.input}
                      value={adrTunnelCode}
                      onChange={(e) => setAdrTunnelCode(e.target.value)}
                    >
                      <option value="">{t("vehicles.adrTunnelNone")}</option>
                      {ADR_TUNNEL_CODES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{t("vehicles.fieldEmissionClass")}</span>
                    <select
                      className={styles.input}
                      value={emissionClass}
                      onChange={(e) => setEmissionClass(e.target.value)}
                    >
                      <option value="">{t("vehicles.selectPlaceholder")}</option>
                      {EMISSION_CLASSES.map((c) => (
                        <option key={c} value={c}>
                          Euro {c.slice(4)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {/*
                [#385] Braki gabarytów WPROST, jeszcze przed liczeniem trasy — tam, gdzie da
                się je naprawić. Trasa policzona bez wysokości wygląda identycznie jak trasa
                z wysokością, a różnica jest taka, że jedna z nich prowadzi pod wiadukt.
              */}
              {missingDims.length > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: cssPalette.offWhite,
                    background: cssPalette.black,
                    border: `1px solid ${cssPalette.red}`,
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  ⚠️ {selectedVehicle ? `${selectedVehicle.registration} · ` : ""}
                  {t("mapPage.vehicleMissing")}{" "}
                  {missingDims.map((d) => t(MISSING_DIM_LABEL[d])).join(", ")} —{" "}
                  {t("mapPage.vehicleMissingTail")}
                  <div style={{ marginTop: 2, color: cssPalette.smoke }}>
                    {t("mapPage.vehicleMissingHint")}
                  </div>
                </div>
              )}
              {selectedVehicle && missingDims.length === 0 && (
                <div style={{ fontSize: 12, color: cssPalette.smoke }}>
                  ✔ {selectedVehicle.registration} · {formatProfileDims(truckProfile)}
                </div>
              )}
            </>
          )}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={autoReroute}
              onChange={(e) => {
                setAutoReroute(e.target.checked);
                autoRerouteRef.current = e.target.checked;
              }}
            />{" "}
            🔁 {t("mapPage.autoDetour")}
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={avoidTolls}
              onChange={(e) => setAvoidTolls(e.target.checked)}
            />{" "}
            {t("mapPage.avoidTolls")}
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={avoidFerries}
              onChange={(e) => setAvoidFerries(e.target.checked)}
            />{" "}
            {t("mapPage.avoidFerries")}
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={avoidCH}
              onChange={(e) => setAvoidCH(e.target.checked)}
            />{" "}
            {t("mapPage.avoidSwitzerland")}
          </label>

          <div style={{ height: 1, background: cssPalette.graphite, margin: "4px 0" }} />
          <span className={styles.label}>{t("mapPage.fuelCostEstimate")}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className={styles.input}
              type="number"
              value={consumption}
              onChange={(e) => setConsumption(e.target.value)}
              placeholder="l/100km"
              title={t("mapPage.consumptionTitle")}
            />
            <input
              className={styles.input}
              type="number"
              step="0.01"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
              placeholder="€/l"
              title={t("mapPage.pricePerLiterTitle")}
            />
            <input
              className={styles.input}
              type="number"
              value={fuelDiscount}
              onChange={(e) => setFuelDiscount(e.target.value)}
              placeholder={t("mapPage.discountPlaceholder")}
              title={t("mapPage.cardDiscountTitle")}
            />
          </div>

          <Button onClick={() => plan()} disabled={busy} style={{ marginTop: 6 }}>
            {busy ? t("mapPage.computing") : t("mapPage.planRoute")}
          </Button>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className={styles.ghost}
              style={{ flex: 1 }}
              onClick={loadPois}
              disabled={poiBusy}
            >
              {poiBusy ? t("mapPage.searching") : `📍 ${t("mapPage.poiInView")}`}
            </button>
            <button
              type="button"
              className={styles.ghost}
              style={{ flex: 1 }}
              onClick={loadPoisAlongRoute}
              disabled={poiBusy}
            >
              🛣️ {t("mapPage.poiAlongRoute")}
            </button>
          </div>
          {TOMTOM_KEY && (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className={styles.ghost}
                style={{ flex: 1 }}
                onClick={() => loadTomtomAlongRoute("fuel", "fuel_station")}
                disabled={poiBusy}
              >
                ⛽ {t("mapPage.fuelAlongRoute")}
              </button>
              <button
                type="button"
                className={styles.ghost}
                style={{ flex: 1 }}
                onClick={() => loadTomtomAlongRoute("parking", "parking")}
                disabled={poiBusy}
              >
                🅿️ {t("mapPage.parkingAlongRoute")}
              </button>
            </div>
          )}
          {/*
            [#383] Legenda wymieniała „firmy" (niebieska kropka), a `OsmPoiType` zna
            wyłącznie `parking | fuel_station` — takiego punktu nie dało się wczytać
            ŻADNYM przyciskiem powyżej, więc pozycja kłamała przy każdym imporcie.
            Zostają dwa typy, które mapa rzeczywiście rysuje, z liczbami.
          */}
          {poiCount != null && (
            <div style={{ fontSize: 12, color: cssPalette.smoke }}>
              {t("mapPage.found")} <strong>{poiCount}</strong> ·{" "}
              <span style={{ color: cssPalette.red }}>
                ● {t("mapPage.legendStations")} ({poiKinds.fuel})
              </span>{" "}
              <span style={{ color: "#22c55e" }}>
                ● {t("mapPage.legendParkings")} ({poiKinds.parking})
              </span>
            </div>
          )}

          <button
            type="button"
            className={styles.ghost}
            onClick={loadFuelPrices}
            disabled={fuelPriceBusy}
          >
            {fuelPriceBusy ? t("mapPage.loadingPrices") : `⛽ ${t("mapPage.fuelPricesDE")}`}
          </button>
          {fuelPriceMsg && (
            <div style={{ fontSize: 12, color: cssPalette.smoke }}>{fuelPriceMsg}</div>
          )}
          {fuelPrices.length > 0 && (
            <FuelPricesPanel
              prices={fuelPrices}
              onFly={(s) => mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: 13 })}
            />
          )}

          <label className={styles.check}>
            <input
              type="checkbox"
              checked={cardFilterOn}
              onChange={(e) => {
                const on = e.target.checked;
                setCardFilterOn(on);
                if (on && cardProviders.size === 0 && cardOptions.length) {
                  setCardProviders(new Set(cardOptions));
                }
              }}
            />{" "}
            {t("mapPage.onlyMyCardStations")}
          </label>
          {cardFilterOn &&
            (cardOptions.length === 0 ? (
              <div style={{ fontSize: 12, color: cssPalette.smoke }}>
                {t("mapPage.noCardsInFleet")}
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cardOptions.map((p) => {
                  const on = cardProviders.has(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`${styles.segment} ${on ? styles.segmentActive : ""}`}
                      style={{ flex: "0 0 auto" }}
                      onClick={() =>
                        setCardProviders((s) => {
                          const n = new Set(s);
                          if (n.has(p)) n.delete(p);
                          else n.add(p);
                          return n;
                        })
                      }
                    >
                      {FUEL_CARD_PROVIDER_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            ))}

          <div style={{ height: 1, background: cssPalette.graphite, margin: "4px 0" }} />
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={reportMode}
              onChange={(e) => setReportMode(e.target.checked)}
            />{" "}
            {t("mapPage.reportMode")}
          </label>
          {reportMode && (
            <select
              className={styles.input}
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              {REPORT_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {t(REPORT_LABEL[rt])}
                </option>
              ))}
            </select>
          )}
          {reportMsg && <div style={{ fontSize: 12, color: cssPalette.red }}>{reportMsg}</div>}

          <div style={{ height: 1, background: cssPalette.graphite, margin: "4px 0" }} />
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={trafficOn}
              onChange={(e) => setTrafficOn(e.target.checked)}
            />{" "}
            🚦 {t("mapPage.liveTrafficHere")}
          </label>
          {trafficOn && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11 }}>
              <span style={{ color: TRAFFIC_COLOR.free }}>● {t("mapPage.trafficFree")}</span>
              <span style={{ color: TRAFFIC_COLOR.moderate }}>
                ● {t("mapPage.trafficModerate")}
              </span>
              <span style={{ color: TRAFFIC_COLOR.heavy }}>● {t("mapPage.trafficHeavy")}</span>
              <span style={{ color: TRAFFIC_COLOR.blocked }}>● {t("mapPage.trafficBlocked")}</span>
            </div>
          )}
          {trafficMsg && <div style={{ fontSize: 12, color: cssPalette.smoke }}>{trafficMsg}</div>}

          {TOMTOM_KEY && (
            <>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={incidentsOn}
                  onChange={(e) => setIncidentsOn(e.target.checked)}
                />{" "}
                🚧 {t("mapPage.incidentsTomtom")}
              </label>
              {incidentsOn && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11 }}>
                  <span style={{ color: INCIDENT_COLOR.closure }}>
                    ● {t(INCIDENT_LABEL.closure)}
                  </span>
                  <span style={{ color: INCIDENT_COLOR.major }}>● {t(INCIDENT_LABEL.major)}</span>
                  <span style={{ color: INCIDENT_COLOR.moderate }}>
                    ● {t(INCIDENT_LABEL.moderate)}
                  </span>
                  <span style={{ color: INCIDENT_COLOR.minor }}>● {t(INCIDENT_LABEL.minor)}</span>
                  <span style={{ color: INCIDENT_COLOR.unknown }}>
                    ● {t(INCIDENT_LABEL.unknown)}
                  </span>
                </div>
              )}
              {incidentMsg && (
                <div style={{ fontSize: 12, color: cssPalette.smoke }}>{incidentMsg}</div>
              )}
            </>
          )}

          {/*
            [#383] Warstwa odcinków płatnych. `sectionType=tollRoad` leciał do TomTom
            w każdym zapytaniu o trasę, a odpowiedź szła do kosza. Kluczowe: gdy dostawca
            NIE raportuje położenia opłat (`tollSections.known === false`), mówimy to
            wprost — pusta warstwa nie może udawać „trasy bez opłat", zwłaszcza że
            `tollCost` powyżej potrafi być wtedy większy od zera.
          */}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={tollLayerOn}
              onChange={(e) => setTollLayerOn(e.target.checked)}
            />{" "}
            🛣️ {t("mapPage.tollLayer")}
          </label>
          {tollLayerOn &&
            (!result ? (
              <div style={{ fontSize: 12, color: cssPalette.smoke }}>
                {t("mapPage.planRouteFirst")}
              </div>
            ) : !result.tollSections.known ? (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: cssPalette.offWhite,
                  background: cssPalette.black,
                  border: `1px solid ${cssPalette.red}`,
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                ⚠️ {t("mapPage.tollSectionsUnknown")} ({result.provider})
              </div>
            ) : result.tollSections.sections.length === 0 ? (
              <div style={{ fontSize: 12, color: cssPalette.smoke }}>
                {t("mapPage.tollNoSections")}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: cssPalette.smoke }}>
                <span style={{ color: cssPalette.red }}>▬</span> {t("mapPage.tollLegend")} (
                {result.tollSections.sections.length})
              </div>
            ))}

          {/*
            [#383] Auta live: `heading` z bazy obraca strzałkę, a filtr świeżości chowa
            pozycje starsze niż STALE_POSITION_MIN. Blok pokazujemy tylko wtedy, gdy
            jakiekolwiek pozycje w ogóle przyszły.
          */}
          {truckTotal > 0 && (
            <>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={freshOnly}
                  onChange={(e) => setFreshOnly(e.target.checked)}
                />{" "}
                🚛 {t("mapPage.freshPositionsOnly")} (≤ {STALE_POSITION_MIN} min)
              </label>
              {staleHidden > 0 && (
                <div style={{ fontSize: 12, color: cssPalette.smoke }}>
                  {t("mapPage.stalePositionsHidden")} {STALE_POSITION_MIN} min:{" "}
                  <strong>{staleHidden}</strong>
                </div>
              )}
            </>
          )}

          {result && (
            <RouteSummary
              result={result}
              fuelTotal={fuelTotal}
              grandTotal={grandTotal}
              disruptions={disruptions}
              plan={plannedProfile}
            />
          )}
        </div>

        <div
          ref={containerRef}
          style={{
            flex: 1,
            minWidth: 320,
            height: "70vh",
            borderRadius: 12,
            overflow: "hidden",
            border: `1px solid ${cssPalette.graphite}`,
          }}
        />
      </div>
    </div>
  );
}

// `Row` i `styles` przeniesione do ./mapUi (refaktor [#161]).
