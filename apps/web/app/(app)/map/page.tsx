"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  deleteSavedPlace,
  insertMapReport,
  insertSavedPlace,
  listActiveMapReports,
  listSavedPlaces,
  type SavedPlace,
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
  haversineKm,
  itemsNearRoute,
  jamSeverity,
  type LatLng,
  type Poi,
  type TrafficFlow,
} from "@e-logistic/maps";
import { cssPalette, palette } from "@e-logistic/ui";
import type { Map as MlMap, Marker as MlMarker } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

import { poiFeatures, reportFeatures, routeFeature } from "./mapFeatures";
import { FuelPricesPanel, RouteSummary, SavedPlacesChips, StopsEditor } from "./mapPanels";
import {
  BASEMAPS,
  basemapStyle,
  DISRUPTION_RADIUS_KM,
  MAPTILER_KEY,
  POI_LABEL,
  REPORT_LABEL,
  SAVED_CAT_ICON,
  TRAFFIC_COLOR,
} from "./mapTheme";
import type { BasemapKey, MaplibreModule, Report, RouteResponse, Stop } from "./mapTypes";
import { styles } from "./mapUi";

export default function MapPage() {
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
  const [disruptions, setDisruptions] = useState<(Report & { distanceKm: number })[]>([]);
  const [trafficOn, setTrafficOn] = useState(false);
  const [trafficMsg, setTrafficMsg] = useState<string | null>(null);
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
    setDisruptions(itemsNearRoute(reportsRef.current, geo, DISRUPTION_RADIUS_KM));
  }, []);

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
        setTrafficMsg("Ruch na żywo wymaga klucza HERE (plan z Traffic).");
        drawTraffic([]);
        return;
      }
      if (data.tooLarge) {
        setTrafficMsg("Przybliż mapę, by pobrać ruch.");
        drawTraffic([]);
        return;
      }
      if (data.unavailable) {
        setTrafficMsg("Ruch HERE chwilowo niedostępny (plan/limit).");
        drawTraffic([]);
        return;
      }
      setTrafficMsg(null);
      drawTraffic(data.flows ?? []);
    } catch {
      setTrafficMsg("Nie udało się pobrać ruchu.");
    }
  }, [drawTraffic]);

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
        }).catch(() => setReportMsg("Nie udało się zgłosić (zaloguj się)."));
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
            `<strong>${p?.label ?? "Zgłoszenie"}</strong>${p?.comment ? `<br/>${p.comment}` : ""}`,
          )
          .addTo(map as MlMap);
      });

      map.on("click", "pois-layer", (e) => {
        const f = e.features?.[0];
        if (f?.geometry.type !== "Point") return;
        const props = f.properties as { name?: string; type?: string } | null;
        const [lng, lat] = f.geometry.coordinates as [number, number];
        const kindLabel = POI_LABEL[props?.type ?? ""] ?? "Punkt";
        const name = props?.name || kindLabel;
        const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const popup = new ml.Popup()
          .setLngLat([lng, lat])
          .setHTML(
            `<strong>${name}</strong><br/>${kindLabel}<br/>📍 <code>${coords}</code>` +
              `<br/><a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" rel="noreferrer">Nawiguj ↗</a>` +
              `<br/><button type="button" data-add-stop style="margin-top:6px;cursor:pointer">➕ Dodaj jako przystanek</button>`,
          )
          .addTo(map as MlMap);
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
  }, [applyOverlays, drawReports, recomputeDisruptions]);

  // ── Warstwa ruchu HERE: pobierz dla widoku + odświeżaj przy przesuwaniu ──
  useEffect(() => {
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

  // ── Znaczniki przystanków (DOM — przetrwają zmianę stylu) ──
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml) return;
    for (const m of markersRef.current) m.remove();
    markersRef.current = stops.map((st, i) => {
      const color = i === 0 ? "#22c55e" : i === stops.length - 1 ? palette.red : "#f59e0b";
      const role = i === 0 ? "Start" : i === stops.length - 1 ? "Cel" : `Przystanek ${i}`;
      const popup = new ml.Popup({ offset: 24 }).setHTML(
        `<strong>${role}</strong><br/>${st.label}<br/>📍 <code>${st.lat.toFixed(5)}, ${st.lng.toFixed(5)}</code>`,
      );
      return new ml.Marker({ color }).setLngLat([st.lng, st.lat]).setPopup(popup).addTo(map);
    });
  }, [stops, mapReady]);

  // ── Wyszukiwarka miejsc (geokoder) ──
  function onQueryChange(key: string, value: string) {
    setQueries((q) => ({ ...q, [key]: value }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setHits((h) => ({ ...h, [key]: [] }));
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const results = await geocode(value, { maptilerKey: MAPTILER_KEY });
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
      next.splice(next.length - 1, 0, { key, label: "Nowy przystanek", lat: 50, lng: 15 });
      return next;
    });
    setQueries((q) => ({ ...q, [key]: "" }));
  }
  function removeStop(key: string) {
    setStops((s) => (s.length > 2 ? s.filter((st) => st.key !== key) : s));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setShareMsg("GPS niedostępny w tej przeglądarce.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setStops((s) =>
          s.map((st, i) => (i === 0 ? { ...st, label: "Moja lokalizacja", lat, lng } : st)),
        );
        setQueries((q) => ({ ...q, "s-start": "Moja lokalizacja" }));
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 11 });
      },
      () => setShareMsg("Nie udało się pobrać lokalizacji."),
    );
  }

  async function saveStart() {
    const start = stops[0];
    if (!start || !companyId) return;
    if (saved.some((p) => p.lat === start.lat && p.lng === start.lng)) return;
    try {
      const created = await insertSavedPlace(getBrowserSupabase(), companyId, {
        name: start.label || "Zapisane miejsce",
        category: savedCat,
        lat: start.lat,
        lng: start.lng,
      });
      setSaved((s) => [...s, created].sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      setShareMsg("Nie udało się zapisać miejsca.");
    }
  }

  async function removeSaved(id: string) {
    try {
      await deleteSavedPlace(getBrowserSupabase(), id);
      setSaved((s) => s.filter((p) => p.id !== id));
    } catch {
      setShareMsg("Nie udało się usunąć miejsca.");
    }
  }

  // Czytelny opis różnicy trasy po dodaniu miejsca (PL).
  function describeDelta(name: string, d: ReturnType<typeof routeDelta>): string {
    if (d.negligible) return `Dodano „${name}" — trasa bez istotnej zmiany.`;
    const distTxt = `${d.longer ? "dłuższa" : "krótsza"} o ${Math.abs(d.distanceKm)} km`;
    const timeTxt =
      d.durationMin > 0
        ? `dłużej o ${formatDuration(d.durationMin)}`
        : d.durationMin < 0
          ? `krócej o ${formatDuration(-d.durationMin)}`
          : "ten sam czas";
    const tollTxt =
      d.tollEur > 0
        ? `drożej o ${d.tollEur} € myta`
        : d.tollEur < 0
          ? `taniej o ${Math.abs(d.tollEur)} € myta`
          : "myto bez zmian";
    return `Dodano „${name}": ${distTxt}, ${timeTxt}, ${tollTxt}.`;
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

  function shareRoute() {
    const r = stops
      .map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)},${encodeURIComponent(s.label)}`)
      .join("|");
    const url = `${window.location.origin}/map?r=${r}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => setShareMsg("🔗 Link do trasy skopiowany."))
      .catch(() => setShareMsg(url));
  }

  function switchBasemap(key: BasemapKey) {
    setBasemap(key);
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(basemapStyle(key));
    map.once("style.load", () => applyOverlays());
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
      setShareMsg("Najpierw wytycz trasę.");
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
        setFuelPriceMsg("Ceny paliwa: dodaj klucz FUEL_PRICE_API_KEY (Tankerkönig, DE).");
        setFuelPrices([]);
        return;
      }
      const withDiesel = data.stations
        .filter((s) => s.diesel != null)
        .sort((a, b) => (a.diesel ?? 0) - (b.diesel ?? 0))
        .slice(0, 8);
      setFuelPrices(withDiesel);
      if (withDiesel.length === 0) setFuelPriceMsg("Brak cen w tej okolicy (działa dla Niemiec).");
    } catch {
      setFuelPriceMsg("Nie udało się pobrać cen paliwa.");
    } finally {
      setFuelPriceBusy(false);
    }
  }

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
      const r = (await res.json()) as RouteResponse;
      setResult(r);
      routeGeoRef.current = r.geometry;
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
          from ? geocode(from, { maptilerKey: MAPTILER_KEY }) : Promise.resolve([] as GeoHit[]),
          to ? geocode(to, { maptilerKey: MAPTILER_KEY }) : Promise.resolve([] as GeoHit[]),
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
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Mapa</h1>
      <p style={{ color: cssPalette.smoke, marginTop: 4 }}>
        Wyszukaj dowolne miasto/miejsce, wytycz trasę przez przystanki. Podkład wektorowy/satelita,
        teren i budynki 3D{MAPTILER_KEY ? "" : " (dodaj klucz MapTiler, by włączyć 3D)"}.
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
              ➕ Przystanek
            </button>
            <button
              type="button"
              className={styles.ghost}
              style={{ flex: 1 }}
              onClick={useMyLocation}
            >
              📍 Moja lokalizacja
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={savedCat}
              onChange={(e) => setSavedCat(e.target.value as SavedPlaceCategory)}
              className={styles.ghost}
              style={{ flex: 1 }}
              title="Kategoria zapisanego miejsca"
            >
              {SAVED_PLACE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SAVED_CAT_ICON[c]} {SAVED_PLACE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <button type="button" className={styles.ghost} style={{ flex: 1 }} onClick={saveStart}>
              ⭐ Zapisz start
            </button>
          </div>
          <button
            type="button"
            className={styles.ghost}
            style={{ width: "100%" }}
            onClick={shareRoute}
          >
            🔗 Udostępnij trasę
          </button>
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

          <span className={styles.label}>Podkład</span>
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
                Teren 3D
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={globe}
                  onChange={(e) => toggleGlobe(e.target.checked)}
                />{" "}
                Globus 3D
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
            Ciężarówka (TIR) — routing wg wymiarów + ruch
          </label>
          {kindHeavy && (
            <>
              <button
                type="button"
                className={styles.ghost}
                style={{ textAlign: "left", padding: "8px 10px" }}
                onClick={() => setDimsOpen((o) => !o)}
              >
                {dimsOpen ? "▾" : "▸"} Wymiary i tonaż ({weightT} t · {axles} osie)
              </button>
              {dimsOpen && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <label className={styles.field}>
                    <span className={styles.label}>Masa całk. (t)</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={weightT}
                      onChange={(e) => setWeightT(e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Osie</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={axles}
                      onChange={(e) => setAxles(e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Wysokość (cm)</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Szerokość (cm)</span>
                    <input
                      className={styles.input}
                      type="number"
                      value={widthCm}
                      onChange={(e) => setWidthCm(e.target.value)}
                    />
                  </label>
                  <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                    <span className={styles.label}>Długość (cm)</span>
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
              checked={avoidTolls}
              onChange={(e) => setAvoidTolls(e.target.checked)}
            />{" "}
            Omijaj płatne drogi
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={avoidFerries}
              onChange={(e) => setAvoidFerries(e.target.checked)}
            />{" "}
            Omijaj promy
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={avoidCH}
              onChange={(e) => setAvoidCH(e.target.checked)}
            />{" "}
            Omijaj Szwajcarię
          </label>

          <div style={{ height: 1, background: cssPalette.graphite, margin: "4px 0" }} />
          <span className={styles.label}>Koszt paliwa (szac.)</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className={styles.input}
              type="number"
              value={consumption}
              onChange={(e) => setConsumption(e.target.value)}
              placeholder="l/100km"
              title="Spalanie l/100km"
            />
            <input
              className={styles.input}
              type="number"
              step="0.01"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
              placeholder="€/l"
              title="Cena za litr"
            />
            <input
              className={styles.input}
              type="number"
              value={fuelDiscount}
              onChange={(e) => setFuelDiscount(e.target.value)}
              placeholder="rabat %"
              title="Rabat karty %"
            />
          </div>

          <Button onClick={() => plan()} disabled={busy} style={{ marginTop: 6 }}>
            {busy ? "Liczę…" : "Wytycz trasę"}
          </Button>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className={styles.ghost}
              style={{ flex: 1 }}
              onClick={loadPois}
              disabled={poiBusy}
            >
              {poiBusy ? "Szukam…" : "📍 POI w widoku"}
            </button>
            <button
              type="button"
              className={styles.ghost}
              style={{ flex: 1 }}
              onClick={loadPoisAlongRoute}
              disabled={poiBusy}
            >
              🛣️ POI wzdłuż trasy
            </button>
          </div>
          {poiCount != null && (
            <div style={{ fontSize: 12, color: cssPalette.smoke }}>
              Znaleziono: <strong>{poiCount}</strong> ·{" "}
              <span style={{ color: cssPalette.red }}>● stacje</span>{" "}
              <span style={{ color: "#22c55e" }}>● parkingi</span>{" "}
              <span style={{ color: "#3b82f6" }}>● firmy</span>
            </div>
          )}

          <button
            type="button"
            className={styles.ghost}
            onClick={loadFuelPrices}
            disabled={fuelPriceBusy}
          >
            {fuelPriceBusy ? "Pobieram ceny…" : "⛽ Ceny paliwa (DE)"}
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
            Tylko stacje akceptujące moje karty (orientacyjnie)
          </label>
          {cardFilterOn &&
            (cardOptions.length === 0 ? (
              <div style={{ fontSize: 12, color: cssPalette.smoke }}>
                Brak kart we flocie — dodaj kartę w „Karty paliwowe”.
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
            Tryb zgłoszeń (klik na mapie)
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
            🚦 Ruch na żywo (HERE)
          </label>
          {trafficOn && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11 }}>
              <span style={{ color: TRAFFIC_COLOR.free }}>● płynnie</span>
              <span style={{ color: TRAFFIC_COLOR.moderate }}>● umiarkowanie</span>
              <span style={{ color: TRAFFIC_COLOR.heavy }}>● gęsto</span>
              <span style={{ color: TRAFFIC_COLOR.blocked }}>● zator</span>
            </div>
          )}
          {trafficMsg && <div style={{ fontSize: 12, color: cssPalette.smoke }}>{trafficMsg}</div>}

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
