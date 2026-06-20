"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { fetchPois, type LatLng, type Poi, type RouteResult } from "@e-logistic/maps";
import { palette } from "@e-logistic/ui";
import type { Map as MlMap, StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

type MaplibreModule = typeof import("maplibre-gl");
type RouteResponse = RouteResult & { tollEstimated?: boolean; fallback?: boolean };

const CITIES = [
  { id: "berlin", label: "Berlin", lat: 52.52, lng: 13.405 },
  { id: "warszawa", label: "Warszawa", lat: 52.2297, lng: 21.0122 },
  { id: "wieden", label: "Wiedeń", lat: 48.2082, lng: 16.3738 },
  { id: "paryz", label: "Paryż", lat: 48.8566, lng: 2.3522 },
  { id: "madryt", label: "Madryt", lat: 40.4168, lng: -3.7038 },
  { id: "zurych", label: "Zurych", lat: 47.3769, lng: 8.5417 },
] as const;

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

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const mlRef = useRef<MaplibreModule | null>(null);

  const [start, setStart] = useState("berlin");
  const [end, setEnd] = useState("warszawa");
  const [kindHeavy, setKindHeavy] = useState(true);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidFerries, setAvoidFerries] = useState(false);
  const [avoidCH, setAvoidCH] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [poiBusy, setPoiBusy] = useState(false);
  const [poiCount, setPoiCount] = useState<number | null>(null);

  useEffect(() => {
    let map: MlMap | undefined;
    (async () => {
      const ml = await import("maplibre-gl");
      mlRef.current = ml;
      if (!containerRef.current) return;
      map = new ml.Map({
        container: containerRef.current,
        style: OSM_STYLE,
        center: [15, 50],
        zoom: 3.6,
      });
      mapRef.current = map;
    })();
    return () => map?.remove();
  }, []);

  function city(id: string): LatLng {
    const c = CITIES.find((x) => x.id === id) ?? CITIES[0];
    return { lat: c.lat, lng: c.lng };
  }

  function drawRoute(geometry: LatLng[]) {
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
        paint: { "line-color": palette.red, "line-width": 5 },
      });
    }

    const first = coords[0];
    if (!first) return;
    const bounds = coords.reduce((b, c) => b.extend(c), new ml.LngLatBounds(first, first));
    map.fitBounds(bounds, { padding: 60, duration: 600 });
  }

  function drawPois(pois: Poi[]) {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml) return;
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
          "#9ca3af",
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": palette.black,
      },
    } as import("maplibre-gl").AddLayerObject);

    map.on("click", "pois-layer", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      if (f.geometry.type !== "Point") return;
      const props = f.properties as { name?: string; type?: string } | null;
      const [lng, lat] = f.geometry.coordinates as [number, number];
      const label = props?.type === "fuel_station" ? "Stacja" : "Parking";
      new ml.Popup()
        .setLngLat([lng, lat])
        .setHTML(`<strong>${props?.name || label}</strong><br/>${label}`)
        .addTo(map);
    });
    map.on("mouseenter", "pois-layer", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "pois-layer", () => {
      map.getCanvas().style.cursor = "";
    });
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
      setPoiCount(pois.length);
      drawPois(pois);
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
          waypoints: [city(start), city(end)],
          profile: { kind: kindHeavy ? "truck" : "van", weightKg: kindHeavy ? 24000 : 3000 },
          options: { avoidTolls, avoidFerries, avoidCountries: avoidCH ? ["CH"] : [] },
        }),
      });
      const r = (await res.json()) as RouteResponse;
      setResult(r);
      drawRoute(r.geometry);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Mapa</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Render MapLibre + routing serwerowy (GraphHopper). Profil samochodowy — TIR wymaga planu
        płatnego; myto doszacowane.
      </p>

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={styles.panel}>
          <label style={styles.field}>
            <span style={styles.label}>Start</span>
            <select style={styles.input} value={start} onChange={(e) => setStart(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Cel</span>
            <select style={styles.input} value={end} onChange={(e) => setEnd(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

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

          <button type="button" style={styles.primary} onClick={plan} disabled={busy}>
            {busy ? "Liczę…" : "Wytycz trasę"}
          </button>

          <button type="button" style={styles.ghost} onClick={loadPois} disabled={poiBusy}>
            {poiBusy ? "Szukam…" : "📍 POI w widoku (OSM)"}
          </button>
          {poiCount != null && (
            <div style={{ fontSize: 12, color: palette.smoke }}>
              Znaleziono: <strong>{poiCount}</strong> ·{" "}
              <span style={{ color: palette.red }}>● stacje</span>{" "}
              <span style={{ color: "#22c55e" }}>● parkingi</span>
            </div>
          )}

          {result && (
            <div style={styles.result}>
              <Row k="Dystans" v={`${result.distanceKm} km`} />
              <Row k="Czas" v={`${Math.round(result.durationMin)} min`} />
              <Row
                k="Myto"
                v={`${result.tollCost} ${result.currency}${result.tollEstimated ? " (szac.)" : ""}`}
              />
              <Row k="Dostawca" v={result.provider} />
            </div>
          )}
        </div>

        <div
          ref={containerRef}
          style={{
            flex: 1,
            minWidth: 320,
            height: "62vh",
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
    width: 260,
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
