"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { insertMapReport, listActiveMapReports } from "@e-logistic/api";
import { fuelCost, newId, REPORT_TYPES, type ReportType } from "@e-logistic/core";
import {
  fetchPois,
  type GeoHit,
  geocode,
  haversineKm,
  type LatLng,
  type Poi,
  type RouteResult,
} from "@e-logistic/maps";
import { palette } from "@e-logistic/ui";
import type { Map as MlMap, Marker as MlMarker, StyleSpecification } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type MaplibreModule = typeof import("maplibre-gl");
type RouteResponse = RouteResult & { tollEstimated?: boolean; fallback?: boolean };
type Stop = { key: string; label: string; lat: number; lng: number };
type Report = { id: string; type: ReportType; lat: number; lng: number; comment: string | null };
type BasemapKey = "dark" | "satellite" | "terrain" | "osm";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

const REPORT_LABEL: Record<ReportType, string> = {
  accident: "Wypadek",
  police: "Policja",
  closure: "Zamknięcie",
  traffic: "Korek",
  weigh: "Waga",
  hazard: "Zagrożenie",
};
const REPORT_COLOR: Record<ReportType, string> = {
  accident: palette.red,
  police: "#3b82f6",
  closure: "#f59e0b",
  traffic: "#f97316",
  weigh: "#a855f7",
  hazard: "#eab308",
};

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": palette.black } },
    { id: "osm", type: "raster", source: "osm", paint: { "raster-brightness-max": 0.85 } },
  ],
};

const mtStyle = (name: string) =>
  `https://api.maptiler.com/maps/${name}/style.json?key=${MAPTILER_KEY}`;

/** Dostępne podkłady (gdy jest klucz MapTiler — wektorowe/satelita/teren; inaczej tylko OSM). */
const BASEMAPS: { key: BasemapKey; label: string }[] = MAPTILER_KEY
  ? [
      { key: "dark", label: "Ciemna" },
      { key: "satellite", label: "Satelita" },
      { key: "terrain", label: "Teren" },
    ]
  : [{ key: "osm", label: "Mapa (OSM)" }];

function basemapStyle(key: BasemapKey): string | StyleSpecification {
  if (!MAPTILER_KEY) return OSM_STYLE;
  if (key === "satellite") return mtStyle("hybrid");
  if (key === "terrain") return mtStyle("outdoor-v2");
  return mtStyle("streets-v2-dark");
}

function routeFeature(coords: [number, number][]) {
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

function poiFeatures(pois: Poi[]) {
  return {
    type: "FeatureCollection" as const,
    features: pois.map((p) => ({
      type: "Feature" as const,
      properties: { name: p.name ?? "", type: p.type },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] as [number, number] },
    })),
  };
}

function reportFeatures(reports: Report[]) {
  return {
    type: "FeatureCollection" as const,
    features: reports.map((r) => ({
      type: "Feature" as const,
      properties: {
        label: REPORT_LABEL[r.type],
        color: REPORT_COLOR[r.type],
        comment: r.comment ?? "",
      },
      geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] as [number, number] },
    })),
  };
}

const POI_LABEL: Record<string, string> = {
  fuel_station: "Stacja paliw",
  parking: "Parking",
  company: "Firma",
  wash: "Myjnia",
  weigh: "Waga",
};

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const mlRef = useRef<MaplibreModule | null>(null);
  const reportsRef = useRef<Report[]>([]);
  const routeGeoRef = useRef<LatLng[] | null>(null);
  const poisRef = useRef<Poi[]>([]);
  const markersRef = useRef<MlMarker[]>([]);
  const reportModeRef = useRef(false);
  const reportTypeRef = useRef<ReportType>("accident");
  const terrainOnRef = useRef(true);
  const globeOnRef = useRef(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [mapReady, setMapReady] = useState(false);

  // Koszt paliwa trasy (silnik billing) + zapisane miejsca.
  const [consumption, setConsumption] = useState("30");
  const [fuelPrice, setFuelPrice] = useState("1.65");
  const [fuelDiscount, setFuelDiscount] = useState("0");
  const [saved, setSaved] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    reportModeRef.current = reportMode;
  }, [reportMode]);
  useEffect(() => {
    reportTypeRef.current = reportType;
  }, [reportType]);

  // Wczytaj zapisane miejsca + ewentualną trasę z linku (?r=lat,lng,label|…).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("elog_saved_places");
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      // brak/nieprawidłowy zapis
    }
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
  }, [applyOverlays, drawReports]);

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

  function persistSaved(next: { label: string; lat: number; lng: number }[]) {
    setSaved(next);
    try {
      localStorage.setItem("elog_saved_places", JSON.stringify(next));
    } catch {
      // brak dostępu do localStorage
    }
  }
  function saveStart() {
    const start = stops[0];
    if (!start) return;
    if (saved.some((p) => p.lat === start.lat && p.lng === start.lng)) return;
    persistSaved([{ label: start.label, lat: start.lat, lng: start.lng }, ...saved].slice(0, 20));
  }
  function addSavedAsStop(p: { label: string; lat: number; lng: number }) {
    const key = newId();
    setStops((s) => {
      const next = [...s];
      next.splice(next.length - 1, 0, { key, label: p.label, lat: p.lat, lng: p.lng });
      return next;
    });
    setQueries((q) => ({ ...q, [key]: p.label }));
  }
  function removeSaved(idx: number) {
    persistSaved(saved.filter((_, i) => i !== idx));
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
      poisRef.current = pois;
      setPoiCount(pois.length);
      drawPois(pois);
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
      const lats = geo.map((p) => p.lat);
      const lngs = geo.map((p) => p.lng);
      const all = await fetchPois({
        south: Math.min(...lats),
        west: Math.min(...lngs),
        north: Math.max(...lats),
        east: Math.max(...lngs),
      });
      // Próbkujemy linię trasy i zostawiamy POI bliżej niż 6 km od najbliższego punktu.
      const step = Math.max(1, Math.floor(geo.length / 300));
      const sample = geo.filter((_, i) => i % step === 0);
      const near = all.filter((poi) =>
        sample.some((pt) => haversineKm({ lat: poi.lat, lng: poi.lng }, pt) <= 6),
      );
      poisRef.current = near;
      setPoiCount(near.length);
      drawPois(near);
    } catch {
      setPoiCount(0);
    } finally {
      setPoiBusy(false);
    }
  }

  async function plan() {
    setBusy(true);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints: stops.map((st) => ({ lat: st.lat, lng: st.lng })),
          profile: { kind: kindHeavy ? "truck" : "van", weightKg: kindHeavy ? 24000 : 3000 },
          options: { avoidTolls, avoidFerries, avoidCountries: avoidCH ? ["CH"] : [] },
        }),
      });
      const r = (await res.json()) as RouteResponse;
      setResult(r);
      routeGeoRef.current = r.geometry;
      drawRoute(r.geometry);
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
    } finally {
      setBusy(false);
    }
  }

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
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Wyszukaj dowolne miasto/miejsce, wytycz trasę przez przystanki. Podkład wektorowy/satelita,
        teren i budynki 3D{MAPTILER_KEY ? "" : " (dodaj klucz MapTiler, by włączyć 3D)"}.
      </p>

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={styles.panel}>
          {stops.map((st, i) => {
            const role = i === 0 ? "Start" : i === stops.length - 1 ? "Cel" : `Przystanek ${i}`;
            const removable = i > 0 && i < stops.length - 1;
            const list = hits[st.key] ?? [];
            return (
              <div key={st.key} style={{ position: "relative" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                  <div style={{ ...styles.field, flex: 1 }}>
                    <span style={styles.label}>{role}</span>
                    <input
                      style={styles.input}
                      value={queries[st.key] ?? ""}
                      onChange={(e) => onQueryChange(st.key, e.target.value)}
                      placeholder="Miasto, adres lub miejsce…"
                    />
                  </div>
                  {removable && (
                    <button type="button" style={styles.remove} onClick={() => removeStop(st.key)}>
                      ✕
                    </button>
                  )}
                </div>
                {list.length > 0 && (
                  <div style={styles.suggest}>
                    {list.map((h) => (
                      <button
                        key={`${h.lat},${h.lng}`}
                        type="button"
                        style={styles.suggestItem}
                        onClick={() => pickHit(st.key, h)}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={{ ...styles.ghost, flex: 1 }} onClick={addStop}>
              ➕ Przystanek
            </button>
            <button type="button" style={{ ...styles.ghost, flex: 1 }} onClick={useMyLocation}>
              📍 Moja lokalizacja
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={{ ...styles.ghost, flex: 1 }} onClick={saveStart}>
              ⭐ Zapisz start
            </button>
            <button type="button" style={{ ...styles.ghost, flex: 1 }} onClick={shareRoute}>
              🔗 Udostępnij
            </button>
          </div>
          {shareMsg && <div style={{ fontSize: 12, color: palette.smoke }}>{shareMsg}</div>}

          {saved.length > 0 && (
            <div>
              <span style={styles.label}>Zapisane miejsca</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {saved.map((p, i) => (
                  <span key={`${p.lat},${p.lng}`} style={styles.savedChip}>
                    <button type="button" style={styles.savedAdd} onClick={() => addSavedAsStop(p)}>
                      {p.label}
                    </button>
                    <button type="button" style={styles.savedDel} onClick={() => removeSaved(i)}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 1, background: palette.graphite, margin: "4px 0" }} />

          <span style={styles.label}>Podkład</span>
          <div style={{ display: "flex", gap: 6 }}>
            {BASEMAPS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => switchBasemap(b.key)}
                style={{
                  ...styles.segment,
                  ...(basemap === b.key ? styles.segmentActive : {}),
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
          {MAPTILER_KEY && (
            <>
              <label style={styles.check}>
                <input
                  type="checkbox"
                  checked={terrain3d}
                  onChange={(e) => toggleTerrain(e.target.checked)}
                />{" "}
                Teren 3D
              </label>
              <label style={styles.check}>
                <input
                  type="checkbox"
                  checked={globe}
                  onChange={(e) => toggleGlobe(e.target.checked)}
                />{" "}
                Globus 3D
              </label>
            </>
          )}

          <div style={{ height: 1, background: palette.graphite, margin: "4px 0" }} />

          <label style={styles.check}>
            <input
              type="checkbox"
              checked={kindHeavy}
              onChange={(e) => setKindHeavy(e.target.checked)}
            />{" "}
            Ciężarówka (24 t)
          </label>
          <label style={styles.check}>
            <input
              type="checkbox"
              checked={avoidTolls}
              onChange={(e) => setAvoidTolls(e.target.checked)}
            />{" "}
            Omijaj płatne drogi
          </label>
          <label style={styles.check}>
            <input
              type="checkbox"
              checked={avoidFerries}
              onChange={(e) => setAvoidFerries(e.target.checked)}
            />{" "}
            Omijaj promy
          </label>
          <label style={styles.check}>
            <input
              type="checkbox"
              checked={avoidCH}
              onChange={(e) => setAvoidCH(e.target.checked)}
            />{" "}
            Omijaj Szwajcarię
          </label>

          <div style={{ height: 1, background: palette.graphite, margin: "4px 0" }} />
          <span style={styles.label}>Koszt paliwa (szac.)</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              style={styles.input}
              type="number"
              value={consumption}
              onChange={(e) => setConsumption(e.target.value)}
              placeholder="l/100km"
              title="Spalanie l/100km"
            />
            <input
              style={styles.input}
              type="number"
              step="0.01"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
              placeholder="€/l"
              title="Cena za litr"
            />
            <input
              style={styles.input}
              type="number"
              value={fuelDiscount}
              onChange={(e) => setFuelDiscount(e.target.value)}
              placeholder="rabat %"
              title="Rabat karty %"
            />
          </div>

          <button type="button" style={styles.primary} onClick={plan} disabled={busy}>
            {busy ? "Liczę…" : "Wytycz trasę"}
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              style={{ ...styles.ghost, flex: 1 }}
              onClick={loadPois}
              disabled={poiBusy}
            >
              {poiBusy ? "Szukam…" : "📍 POI w widoku"}
            </button>
            <button
              type="button"
              style={{ ...styles.ghost, flex: 1 }}
              onClick={loadPoisAlongRoute}
              disabled={poiBusy}
            >
              🛣️ POI wzdłuż trasy
            </button>
          </div>
          {poiCount != null && (
            <div style={{ fontSize: 12, color: palette.smoke }}>
              Znaleziono: <strong>{poiCount}</strong> ·{" "}
              <span style={{ color: palette.red }}>● stacje</span>{" "}
              <span style={{ color: "#22c55e" }}>● parkingi</span>{" "}
              <span style={{ color: "#3b82f6" }}>● firmy</span>
            </div>
          )}

          <div style={{ height: 1, background: palette.graphite, margin: "4px 0" }} />
          <label style={styles.check}>
            <input
              type="checkbox"
              checked={reportMode}
              onChange={(e) => setReportMode(e.target.checked)}
            />{" "}
            Tryb zgłoszeń (klik na mapie)
          </label>
          {reportMode && (
            <select
              style={styles.input}
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
          {reportMsg && <div style={{ fontSize: 12, color: palette.red }}>{reportMsg}</div>}

          {result && (
            <div style={styles.result}>
              <Row k="Dystans" v={`${result.distanceKm} km`} />
              <Row k="Czas" v={`${Math.round(result.durationMin)} min`} />
              <Row
                k="Myto"
                v={`${result.tollCost} ${result.currency}${result.tollEstimated ? " (szac.)" : ""}`}
              />
              <Row k="Paliwo (szac.)" v={`${fuelTotal} ${result.currency}`} />
              <div style={{ height: 1, background: palette.graphite, margin: "2px 0" }} />
              <Row k="Razem (myto+paliwo)" v={`${grandTotal} ${result.currency}`} />
              <Row k="Dostawca" v={result.provider} />
            </div>
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
            border: `1px solid ${palette.graphite}`,
          }}
        />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: palette.smoke }}>{k}</span>
      <strong>{v}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 290,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    height: "fit-content",
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: palette.smoke },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 10px",
    color: palette.offWhite,
    width: "100%",
  },
  suggest: {
    position: "absolute",
    zIndex: 5,
    top: "100%",
    left: 0,
    right: 0,
    background: palette.coal,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    marginTop: 2,
    overflow: "hidden",
    maxHeight: 220,
    overflowY: "auto",
  },
  suggestItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    color: palette.offWhite,
    border: "none",
    borderBottom: `1px solid ${palette.graphite}`,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 13,
  },
  segment: {
    flex: 1,
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "8px 6px",
    cursor: "pointer",
    fontSize: 13,
  },
  segmentActive: { background: palette.red, color: palette.white, borderColor: palette.red },
  remove: {
    background: "transparent",
    color: palette.smoke,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 11px",
    cursor: "pointer",
  },
  check: { color: palette.offWhite, fontSize: 14, display: "flex", alignItems: "center", gap: 6 },
  primary: {
    marginTop: 6,
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghost: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px",
    cursor: "pointer",
  },
  result: {
    marginTop: 8,
    paddingTop: 10,
    borderTop: `1px solid ${palette.graphite}`,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
  },
};
