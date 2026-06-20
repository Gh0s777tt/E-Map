"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { createRoutingProvider, type LatLng, type RouteResult } from "@e-logistic/maps";
import { palette } from "@e-logistic/ui";
import type { Map as MlMap, StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

type MaplibreModule = typeof import("maplibre-gl");

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
  const [result, setResult] = useState<RouteResult | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function plan() {
    setBusy(true);
    try {
      const provider = createRoutingProvider(); // mock (bez klucza)
      const r = await provider.route({
        waypoints: [city(start), city(end)],
        profile: { kind: kindHeavy ? "truck" : "van", weightKg: kindHeavy ? 24000 : 3000 },
        options: { avoidTolls, avoidFerries, avoidCountries: avoidCH ? ["CH"] : [] },
      });
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
        Render MapLibre + routing przez <code>RoutingProvider</code> (mock — bez klucza).
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

          {result && (
            <div style={styles.result}>
              <Row k="Dystans" v={`${result.distanceKm} km`} />
              <Row k="Czas" v={`${Math.round(result.durationMin)} min`} />
              <Row k="Myto" v={`${result.tollCost} ${result.currency}`} />
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
