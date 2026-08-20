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
  listTrailers,
  listVehicles,
  parkingSummaries,
  type SavedPlace,
  sendDriverRoute,
  type Trailer,
  upsertParkingReview,
} from "@e-logistic/api";
import {
  type FuelCardProvider,
  newId,
  type ReportType,
  routeDelta,
  SAVED_PLACE_CATEGORIES,
  SAVED_PLACE_CATEGORY_LABELS,
  type SavedPlaceCategory,
} from "@e-logistic/core";
import {
  anyWithinKm,
  buildGridIndex,
  type FuelStationPrice,
  fetchPois,
  type GeoHit,
  geocode,
  itemsNearRoute,
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
  bestDieselPrices,
  buildSharedRoute,
  buildTruckProfile,
  clampBbox,
  countPoiKinds,
  DEFAULT_DIMS,
  describeDelta,
  escapeHtml,
  filterPoisByCards,
  geometryBbox,
  incidentFeatures,
  isProfileOverridden,
  POI_TAG_ADDRESS,
  POI_TAG_DISTANCE_M,
  parseSharedRoute,
  poiDetailsHtml,
  poiFeatures,
  reportFeatures,
  routeCostTotals,
  routeFeature,
  sampleGeometryForSearch,
  savedFeatures,
  tollSectionFeatures,
  toRouteVehicle,
  trafficFlowFeatures,
  truckPositionFeatures,
  vehicleToFields,
} from "./mapFeatures";
import {
  add3dBuildings,
  drawIncidentsLayer,
  drawPoisLayer,
  drawReportsLayer,
  drawRouteLayer,
  drawSavedLayer,
  drawTollLayer,
  drawTrafficLayer,
  drawTrucksLayer,
} from "./mapLayers";
import {
  BasemapPicker,
  CardFilter,
  FuelCostInputs,
  FuelPricesPanel,
  IncidentsToggle,
  LiveTrucksPanel,
  missingDimensions,
  type PlannedProfile,
  PoiTools,
  ReportModePanel,
  RouteOptions,
  RouteSummary,
  SavedPlacesChips,
  StopsEditor,
  TollLayerToggle,
  TrafficToggle,
  TruckProfileForm,
} from "./mapPanels";
import {
  basemapStyle,
  DEFAULT_BASEMAP,
  DISRUPTION_RADIUS_KM,
  INCIDENT_LABEL,
  MAPTILER_KEY,
  OSM_STYLE,
  POI_LABEL,
  SAVED_CAT_ICON,
  TOMTOM_KEY,
} from "./mapTheme";
import type {
  BasemapKey,
  DimsFields,
  MaplibreModule,
  Report,
  RouteResponse,
  RouteVehicle,
  Stop,
  VehicleRow,
} from "./mapTypes";
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
  /**
   * Gabaryty jako JEDEN stan (`DimsFields`) — komplet i tak leci razem do `/api/route`
   * i razem jest nadpisywany przy wyborze pojazdu, więc siedem osobnych `useState`
   * było siedmioma miejscami do zapomnienia przy każdej kolejnej fali funkcji.
   */
  const [dims, setDims] = useState<DimsFields>(DEFAULT_DIMS);
  const setDimsField = useCallback((key: keyof DimsFields, value: string) => {
    setDims((d) => ({ ...d, [key]: value }));
  }, []);
  /**
   * [#385] Wybór pojazdu z kartoteki. Do tej pory ekran wysyłał do routingu wyłącznie
   * wartości startowe formularza (`DEFAULT_DIMS`: 24 t / 400 / 255 / 1650 cm / 5 osi), a panel
   * wymiarów był domyślnie ZWINIĘTY — solówka i pięcioosiowy zestaw dostawały tę samą
   * trasę i to samo myto, bo nikt tych pól nie otwierał.
   *
   * Pojazdy ładujemy tutaj, a nie przez `useFleet()`, i po [#387] powód jest już
   * inny niż na starcie: hook wystawia komplet gabarytów, więc nie chodzi o zakres
   * danych, tylko o **odporność ekranu**. Tutejsze pobranie ma własny `catch` —
   * brak uprawnień do `vehicles` zabiera wyłącznie listę wyboru pojazdu, a mapa,
   * zapisane miejsca i planowanie trasy działają dalej. Hook przy błędzie gasi
   * cały swój stan, więc na ekranie, który ma działać także po awarii jednego
   * zapytania, zostaje osobne pobranie.
   */
  const [fleet, setFleet] = useState<RouteVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
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

  /** Profil, który NAPRAWDĘ poleci do `/api/route` — reguły i uzasadnienie w `buildTruckProfile`. */
  const truckProfile = useMemo<VehicleProfile>(() => buildTruckProfile(dims), [dims]);

  /** Braki w profilu wysyłanym do dostawcy — puste przy trasie osobowej (gabaryty nieużywane). */
  const missingDims = useMemo(
    () => (kindHeavy ? missingDimensions(truckProfile) : []),
    [kindHeavy, truckProfile],
  );

  /** Czy formularz rozjechał się z kartoteką wybranego pojazdu (pasek „✎ nadpisane"). */
  const profileOverridden = useMemo(
    () => isProfileOverridden(selectedVehicle, truckProfile),
    [selectedVehicle, truckProfile],
  );

  /**
   * [#385] Wybór pojazdu przepisuje kartotekę do pól formularza — z brakami zostawionymi
   * jako puste pola (patrz `vehicleToFields`). Gdy czegoś brakuje, panel wymiarów
   * rozwijamy: zwinięty panel to dokładnie ten stan, w którym użytkownik wysyłał
   * cudzy zestaw, nie swój.
   */
  function pickVehicle(id: string) {
    setVehicleId(id);
    const v = fleet.find((x) => x.id === id);
    // „— bez pojazdu —": pola zostają takie, jakie są. Stają się wartościami ręcznymi,
    // a pasek pod wyborem mówi wprost, że nie pochodzą z kartoteki.
    if (!v) return;
    const { fields, incomplete } = vehicleToFields(v);
    setDims(fields);
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
        // [#406] Naczepy pobierane razem z pojazdami: profil zestawu potrzebuje
        // obu stron, a osobne zapytanie po wyborze auta oznaczałoby, że pierwsza
        // policzona trasa idzie bez naczepy.
        const naczepy = await listTrailers(sb, m.companyId).catch(() => [] as Trailer[]);
        const wgId = new Map(naczepy.map((x) => [x.id, x]));
        setFleet(vehicleRows.map((v) => toRouteVehicle(v, wgId.get(v.trailer_id ?? "") ?? null)));
      } catch {
        // offline / brak firmy → brak zapisanych miejsc
      }
    })();
    try {
      const parsed = parseSharedRoute(new URLSearchParams(window.location.search).get("r"));
      if (parsed.length >= 2) {
        const next = parsed.map((p, i) => ({
          key: i === 0 ? "s-start" : i === parsed.length - 1 ? "s-end" : newId(),
          ...p,
        }));
        setStops(next);
        setQueries(Object.fromEntries(next.map((s) => [s.key, s.label])));
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
      const view = truckPositionFeatures(
        rows,
        { now: Date.now(), staleAfterMin: STALE_POSITION_MIN, freshOnly: freshOnlyRef.current },
        t,
      );
      setTruckTotal(view.total);
      setStaleHidden(view.hidden);
      drawTrucksLayer(map, view.data);
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
    drawReportsLayer(map, reportFeatures(reportsRef.current, t));
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
    drawTrafficLayer(map, trafficFlowFeatures(flows));
  }, []);

  // #358: warstwa incydentów TomTom — punktowe piny kolorowane wg severity.
  const drawIncidentsInto = useCallback(
    (incidents: TrafficIncident[], sourceId: string, layerId: string) => {
      const map = mapRef.current;
      if (!map) return;
      // [#383] Ten sam guard co w `drawSaved`: `addSource` na niewczytanym stylu rzuca.
      if (!map.isStyleLoaded()) return;
      drawIncidentsLayer(map, incidentFeatures(incidents), sourceId, layerId);
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
    // Ogranicz bbox do ~2° (jak HERE), by uniknąć zbyt dużego zapytania.
    const { west, south, east, north } = clampBbox(
      { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
      2,
    );
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
    if (!map || !mlRef.current || geometry.length < 2) return;
    drawRouteLayer(map, routeFeature(geometry.map((p) => [p.lng, p.lat] as [number, number])));
  }, []);

  const drawPois = useCallback((pois: Poi[]) => {
    const map = mapRef.current;
    if (!map) return;
    drawPoisLayer(map, poiFeatures(pois));
  }, []);

  const drawSaved = useCallback((places: SavedPlace[]) => {
    const map = mapRef.current;
    if (!map) return;
    // #367: po `setStyle` (zmiana podkładu) stary styl znika natychmiast, a `addSource`
    // na niewczytanym stylu RZUCA („Style is not done loading."). Efekt Reacta wywołany
    // w tym oknie wysadziłby stronę do error boundary. Warstwę i tak odtworzy
    // `applyOverlays` na zdarzeniu `style.load`, czytając refy zaktualizowane wcześniej.
    if (!map.isStyleLoaded()) return;
    drawSavedLayer(map, savedFeatures(places));
  }, []);

  /** [#383] Warstwa odcinków płatnych ostatniej trasy — kształt i uzasadnienie w `drawTollLayer`. */
  const drawToll = useCallback((geometry: LatLng[], sections: TollSection[]) => {
    const map = mapRef.current;
    if (!map) return;
    // [#383] Ten sam guard co w `drawSaved`: `addSource` na niewczytanym stylu rzuca.
    if (!map.isStyleLoaded()) return;
    drawTollLayer(map, tollSectionFeatures(geometry, sections));
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
  }, [drawReports, drawRoute, drawPois, drawSaved, drawTrucks, drawToll]);

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
            t,
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

  /** #309: przełącznik auto-objazdu ma też ref — `recomputeDisruptions` czyta go poza renderem. */
  function toggleAutoReroute(on: boolean) {
    setAutoReroute(on);
    autoRerouteRef.current = on;
  }

  /**
   * Włączenie filtra bez wybranej marki nie odfiltrowałoby niczego, więc przy pierwszym
   * włączeniu zaznaczamy komplet kart użytkownika — inaczej przełącznik wyglądałby
   * na zepsuty.
   */
  function toggleCardFilter(on: boolean) {
    setCardFilterOn(on);
    if (on && cardProviders.size === 0 && cardOptions.length) {
      setCardProviders(new Set(cardOptions));
    }
  }

  function toggleCardProvider(provider: FuelCardProvider) {
    setCardProviders((s) => {
      const n = new Set(s);
      if (n.has(provider)) n.delete(provider);
      else n.add(provider);
      return n;
    });
  }

  function shareRoute() {
    const url = `${window.location.origin}/map?r=${buildSharedRoute(stops)}`;
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
    const filtered = filterPoisByCards(allPoisRef.current, Array.from(cardProviders), cardFilterOn);
    poisRef.current = filtered;
    setPoiCount(filtered.length);
    setPoiKinds(countPoiKinds(filtered));
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
      const all = await fetchPois(geometryBbox(geo));
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
      const found = await tomtomSearchAlongRoute(sampleGeometryForSearch(geo), query, TOMTOM_KEY, {
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
      const withDiesel = bestDieselPrices(data.stations);
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

  const { fuelTotal, grandTotal } = routeCostTotals(result, {
    consumption,
    fuelPrice,
    fuelDiscount,
  });

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

          <BasemapPicker
            current={basemap}
            onSwitch={switchBasemap}
            terrain={terrain3d}
            onTerrain={toggleTerrain}
            globe={globe}
            onGlobe={toggleGlobe}
          />

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
            <TruckProfileForm
              fleet={fleet}
              vehicleId={vehicleId}
              onPickVehicle={pickVehicle}
              selectedVehicle={selectedVehicle}
              profileOverridden={profileOverridden}
              dimsOpen={dimsOpen}
              onToggleDims={() => setDimsOpen((o) => !o)}
              fields={dims}
              onFieldChange={setDimsField}
              profile={truckProfile}
              missing={missingDims}
            />
          )}
          <RouteOptions
            autoReroute={autoReroute}
            onAutoReroute={toggleAutoReroute}
            avoidTolls={avoidTolls}
            onAvoidTolls={setAvoidTolls}
            avoidFerries={avoidFerries}
            onAvoidFerries={setAvoidFerries}
            avoidCH={avoidCH}
            onAvoidCH={setAvoidCH}
          />

          <div style={{ height: 1, background: cssPalette.graphite, margin: "4px 0" }} />
          <FuelCostInputs
            consumption={consumption}
            onConsumption={setConsumption}
            fuelPrice={fuelPrice}
            onFuelPrice={setFuelPrice}
            fuelDiscount={fuelDiscount}
            onDiscount={setFuelDiscount}
          />

          <Button onClick={() => plan()} disabled={busy} style={{ marginTop: 6 }}>
            {busy ? t("mapPage.computing") : t("mapPage.planRoute")}
          </Button>

          <PoiTools
            busy={poiBusy}
            onInView={loadPois}
            onAlongRoute={loadPoisAlongRoute}
            onTomtom={loadTomtomAlongRoute}
            count={poiCount}
            kinds={poiKinds}
          />

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

          <CardFilter
            on={cardFilterOn}
            onToggle={toggleCardFilter}
            options={cardOptions}
            providers={cardProviders}
            onToggleProvider={toggleCardProvider}
          />

          <div style={{ height: 1, background: cssPalette.graphite, margin: "4px 0" }} />
          <ReportModePanel
            on={reportMode}
            onToggle={setReportMode}
            type={reportType}
            onType={setReportType}
            msg={reportMsg}
          />

          <div style={{ height: 1, background: cssPalette.graphite, margin: "4px 0" }} />
          <TrafficToggle on={trafficOn} onToggle={setTrafficOn} msg={trafficMsg} />

          <IncidentsToggle on={incidentsOn} onToggle={setIncidentsOn} msg={incidentMsg} />

          <TollLayerToggle on={tollLayerOn} onToggle={setTollLayerOn} result={result} />

          <LiveTrucksPanel
            total={truckTotal}
            freshOnly={freshOnly}
            onToggle={setFreshOnly}
            staleHidden={staleHidden}
            staleAfterMin={STALE_POSITION_MIN}
          />

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
