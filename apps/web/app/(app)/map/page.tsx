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
  anyWithinKm,
  buildGridIndex,
  type FuelStationPrice,
  fetchPois,
  type GeoHit,
  geocode,
  itemsNearRoute,
  jamSeverity,
  type LatLng,
  type Poi,
  type TrafficFlow,
  type TrafficIncident,
  tomtomSearchAlongRoute,
  tomtomTrafficIncidents,
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

import { incidentFeatures, poiFeatures, reportFeatures, routeFeature } from "./mapFeatures";
import { FuelPricesPanel, RouteSummary, SavedPlacesChips, StopsEditor } from "./mapPanels";
import {
  BASEMAPS,
  basemapStyle,
  DISRUPTION_RADIUS_KM,
  INCIDENT_COLOR,
  INCIDENT_LABEL,
  MAPTILER_KEY,
  POI_LABEL,
  REPORT_LABEL,
  SAVED_CAT_ICON,
  TOMTOM_KEY,
  TRAFFIC_COLOR,
} from "./mapTheme";
import type { BasemapKey, MaplibreModule, Report, RouteResponse, Stop } from "./mapTypes";
import { styles } from "./mapUi";

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
  const [basemap, setBasemap] = useState<BasemapKey>(MAPTILER_KEY ? "dark" : "osm");
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
  const [cardFilterOn, setCardFilterOn] = useState(false);
  const [cardProviders, setCardProviders] = useState<Set<FuelCardProvider>>(new Set());
  const [fuelPrices, setFuelPrices] = useState<FuelStationPrice[]>([]);
  const [fuelPriceMsg, setFuelPriceMsg] = useState<string | null>(null);
  const [fuelPriceBusy, setFuelPriceBusy] = useState(false);

  // Marki kart użytkownika (odduplikowane) — do filtra stacji. Memo: nowa tablica tylko gdy zmienią się karty.
  const cardOptions = useMemo(() => Array.from(new Set(cards.map((c) => c.provider))), [cards]);

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
        setSaved(await listSavedPlaces(sb, m.companyId));
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
      const now = Date.now();
      const data = {
        type: "FeatureCollection" as const,
        features: rows.map((r) => {
          const ageMin = Math.round((now - new Date(r.updated_at).getTime()) / 60_000);
          return {
            type: "Feature" as const,
            properties: {
              color: ageMin <= 5 ? "#22c55e" : ageMin <= 30 ? "#f59e0b" : "#6b7280",
              label: `🚛 ${ageMin < 1 ? t("mapPage.now") : `${ageMin} ${t("mapPage.minAgo")}`}${r.speed_kmh != null ? ` · ${r.speed_kmh} km/h` : ""}`,
            },
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
          "circle-radius": 8,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": palette.white,
        },
      } as import("maplibre-gl").AddLayerObject);
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
    const data = reportFeatures(reportsRef.current);
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
  }, []);

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
      const data = (await res.json().catch(() => null)) as {
        flows?: TrafficFlow[];
        configured?: boolean;
        unavailable?: boolean;
        tooLarge?: boolean;
      } | null;
      if (!data) return;
      if (res.status === 501 || data.configured === false) {
        setTrafficMsg(t("mapPage.trafficNeedsKey"));
        drawTraffic([]);
        return;
      }
      if (data.tooLarge) {
        setTrafficMsg(t("mapPage.trafficZoomIn"));
        drawTraffic([]);
        return;
      }
      if (data.unavailable) {
        setTrafficMsg(t("mapPage.trafficUnavailable"));
        drawTraffic([]);
        return;
      }
      setTrafficMsg(null);
      drawTraffic(data.flows ?? []);
    } catch {
      setTrafficMsg(t("mapPage.trafficError"));
    }
  }, [drawTraffic, t]);

  // #358: warstwa incydentów TomTom — punktowe piny kolorowane wg severity.
  const drawIncidents = useCallback((incidents: TrafficIncident[]) => {
    const map = mapRef.current;
    if (!map) return;
    const data = incidentFeatures(incidents);
    const existing = map.getSource("incidents");
    if (existing) {
      (existing as import("maplibre-gl").GeoJSONSource).setData(data);
      return;
    }
    map.addSource("incidents", { type: "geojson", data });
    map.addLayer({
      id: "incidents-layer",
      type: "circle",
      source: "incidents",
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
  }, []);

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
        "circle-color": [
          "match",
          ["get", "type"],
          "fuel_station",
          palette.red,
          "parking",
          "#22c55e",
          "company",
          "#3b82f6",
          "#9ca3af",
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": palette.black,
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
  }, [add3dBuildings, drawReports, drawRoute, drawPois]);

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
        style: basemapStyle(MAPTILER_KEY ? "dark" : "osm"),
        center: [15, 50],
        zoom: 4,
        pitch: 45,
        maxPitch: 80,
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");

      // Klik na mapie w trybie zgłoszeń.
      map.on("click", (e) => {
        if (!reportModeRef.current) return;
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
            `<strong>${p?.label ?? t("mapPage.reportPopupFallback")}</strong>${p?.comment ? `<br/>${p.comment}` : ""}`,
          )
          .addTo(map as MlMap);
      });

      map.on("click", "pois-layer", (e) => {
        const f = e.features?.[0];
        if (f?.geometry.type !== "Point") return;
        const props = f.properties as { id?: string; name?: string; type?: string } | null;
        const [lng, lat] = f.geometry.coordinates as [number, number];
        const kindLabel = POI_LABEL[props?.type ?? ""] ?? t("mapPage.poiFallback");
        const name = props?.name || kindLabel;
        const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const popup = new ml.Popup()
          .setLngLat([lng, lat])
          .setHTML(
            `<strong>${name}</strong><br/>${kindLabel}<br/>📍 <code>${coords}</code>` +
              `<br/><a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" rel="noreferrer">${t("mapPage.navigate")} ↗</a>` +
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
      map.on("click", "incidents-layer", (e) => {
        const f = e.features?.[0];
        if (f?.geometry.type !== "Point") return;
        const props = f.properties as { severity?: string; description?: string } | null;
        const [lng, lat] = f.geometry.coordinates as [number, number];
        const sev = (props?.severity ?? "unknown") as keyof typeof INCIDENT_LABEL;
        const title = INCIDENT_LABEL[sev];
        new ml.Popup()
          .setLngLat([lng, lat])
          .setHTML(
            `<strong>${title}</strong>${props?.description ? `<br/>${props.description}` : ""}`,
          )
          .addTo(map as MlMap);
      });
      map.on("mouseenter", "incidents-layer", () => {
        (map as MlMap).getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "incidents-layer", () => {
        (map as MlMap).getCanvas().style.cursor = "";
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
  }, [applyOverlays, drawReports, recomputeDisruptions, t]);

  // ── Warstwa ruchu HERE: pobierz dla widoku + odświeżaj przy przesuwaniu ──
  useEffect(() => {
    trafficOnRef.current = trafficOn;
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (!trafficOn) {
      drawTraffic([]);
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
  }, [trafficOn, mapReady, fetchTrafficForView, drawTraffic]);

  // ── Warstwa incydentów TomTom: pobierz dla widoku + odświeżaj przy ruchu mapy ──
  useEffect(() => {
    incidentsOnRef.current = incidentsOn;
    const map = mapRef.current;
    if (!mapReady || !map) return;
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
  }, [incidentsOn, mapReady, fetchIncidentsForView, drawIncidents]);

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
        `<strong>${role}</strong><br/>${st.label}<br/>📍 <code>${st.lat.toFixed(5)}, ${st.lng.toFixed(5)}</code>`,
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
      // TomTomPoi nie ma pola `type` — dodajemy je ręcznie do kształtu Poi (+ puste tags).
      const pois: Poi[] = found.map((p) => ({
        id: p.id,
        type,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        tags: {},
      }));
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

  async function plan(override?: { lat: number; lng: number }[]): Promise<RouteResponse | null> {
    setBusy(true);
    try {
      const waypoints = override ?? stops.map((st) => ({ lat: st.lat, lng: st.lng }));
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints,
          profile: kindHeavy
            ? {
                kind: "truck",
                weightKg: Math.round((Number(weightT) || 24) * 1000),
                heightCm: Number(heightCm) || undefined,
                widthCm: Number(widthCm) || undefined,
                lengthCm: Number(lengthCm) || undefined,
                axleCount: Number(axles) || undefined,
              }
            : { kind: "van", weightKg: 3000 },
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
                {b.label}
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
              <button
                type="button"
                className={styles.ghost}
                style={{ textAlign: "left", padding: "8px 10px" }}
                onClick={() => setDimsOpen((o) => !o)}
              >
                {dimsOpen ? "▾" : "▸"} {t("mapPage.dimsAndTonnage")} ({weightT} t · {axles}{" "}
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
          {poiCount != null && (
            <div style={{ fontSize: 12, color: cssPalette.smoke }}>
              {t("mapPage.found")} <strong>{poiCount}</strong> ·{" "}
              <span style={{ color: cssPalette.red }}>● {t("mapPage.legendStations")}</span>{" "}
              <span style={{ color: "#22c55e" }}>● {t("mapPage.legendParkings")}</span>{" "}
              <span style={{ color: "#3b82f6" }}>● {t("mapPage.legendCompanies")}</span>
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
                  {REPORT_LABEL[rt]}
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
                  <span style={{ color: INCIDENT_COLOR.closure }}>● {INCIDENT_LABEL.closure}</span>
                  <span style={{ color: INCIDENT_COLOR.major }}>● {INCIDENT_LABEL.major}</span>
                  <span style={{ color: INCIDENT_COLOR.moderate }}>
                    ● {INCIDENT_LABEL.moderate}
                  </span>
                  <span style={{ color: INCIDENT_COLOR.minor }}>● {INCIDENT_LABEL.minor}</span>
                  <span style={{ color: INCIDENT_COLOR.unknown }}>● {INCIDENT_LABEL.unknown}</span>
                </div>
              )}
              {incidentMsg && (
                <div style={{ fontSize: 12, color: cssPalette.smoke }}>{incidentMsg}</div>
              )}
            </>
          )}

          {result && (
            <RouteSummary
              result={result}
              fuelTotal={fuelTotal}
              grandTotal={grandTotal}
              disruptions={disruptions}
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
