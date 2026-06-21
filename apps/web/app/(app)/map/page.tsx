"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { insertMapReport, listActiveMapReports } from "@e-logistic/api";
import { newId, REPORT_TYPES, type ReportType } from "@e-logistic/core";
import { fetchPois, type LatLng, type Poi, type RouteResult } from "@e-logistic/maps";
import { palette } from "@e-logistic/ui";
import type { Map as MlMap, StyleSpecification } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type MaplibreModule = typeof import("maplibre-gl");
type RouteResponse = RouteResult & { tollEstimated?: boolean; fallback?: boolean };
type Stop = { key: string; label: string; lat: number; lng: number; cityId?: string };
type Report = { id: string; type: ReportType; lat: number; lng: number; comment: string | null };

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

function reportFeatures(reports: Report[]) {
  return {
    type: "FeatureCollection" as const,
    features: reports.map((r) => ({
      type: "Feature" as const,
      properties: {
        type: r.type,
        label: REPORT_LABEL[r.type],
        color: REPORT_COLOR[r.type],
        comment: r.comment ?? "",
      },
      geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] as [number, number] },
    })),
  };
}

const CITIES = [
  { id: "berlin", label: "Berlin", lat: 52.52, lng: 13.405 },
  { id: "warszawa", label: "Warszawa", lat: 52.2297, lng: 21.0122 },
  { id: "wieden", label: "Wiedeń", lat: 48.2082, lng: 16.3738 },
  { id: "paryz", label: "Paryż", lat: 48.8566, lng: 2.3522 },
  { id: "madryt", label: "Madryt", lat: 40.4168, lng: -3.7038 },
  { id: "zurych", label: "Zurych", lat: 47.3769, lng: 8.5417 },
] as const;

function cityStop(key: string, cityId: string): Stop {
  const c = CITIES.find((x) => x.id === cityId) ?? CITIES[0];
  return { key, cityId, label: c.label, lat: c.lat, lng: c.lng };
}

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
  const reportsRef = useRef<Report[]>([]);
  const reportModeRef = useRef(false);
  const reportTypeRef = useRef<ReportType>("accident");

  const [stops, setStops] = useState<Stop[]>([
    cityStop("s-start", "berlin"),
    cityStop("s-end", "warszawa"),
  ]);
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

  useEffect(() => {
    reportModeRef.current = reportMode;
  }, [reportMode]);
  useEffect(() => {
    reportTypeRef.current = reportType;
  }, [reportType]);

  const drawReports = useCallback(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml) return;
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
    map.on("click", "reports-layer", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      if (f.geometry.type !== "Point") return;
      const p = f.properties as { label?: string; comment?: string } | null;
      const [lng, lat] = f.geometry.coordinates as [number, number];
      new ml.Popup()
        .setLngLat([lng, lat])
        .setHTML(
          `<strong>${p?.label ?? "Zgłoszenie"}</strong>${p?.comment ? `<br/>${p.comment}` : ""}`,
        )
        .addTo(map);
    });
  }, []);

  useEffect(() => {
    let map: MlMap | undefined;
    let channel: { unsubscribe: () => void } | null = null;
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

      map.on("click", (e) => {
        if (!reportModeRef.current) return;
        insertMapReport(getBrowserSupabase(), {
          type: reportTypeRef.current,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        }).catch(() => setReportMsg("Nie udało się zgłosić (zaloguj się)."));
      });

      map.on("load", () => {
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
      map?.remove();
    };
  }, [drawReports]);

  function setStopCity(key: string, cityId: string) {
    setStops((s) => s.map((st) => (st.key === key ? cityStop(key, cityId) : st)));
  }
  function addStop() {
    setStops((s) => {
      const next = [...s];
      next.splice(next.length - 1, 0, cityStop(newId(), "wieden"));
      return next;
    });
  }
  function addPoiStop(label: string, lat: number, lng: number) {
    setStops((s) => {
      const next = [...s];
      next.splice(next.length - 1, 0, { key: newId(), label, lat, lng });
      return next;
    });
  }
  function removeStop(key: string) {
    setStops((s) => (s.length > 2 ? s.filter((st) => st.key !== key) : s));
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
      const kindLabel = props?.type === "fuel_station" ? "Stacja" : "Parking";
      const name = props?.name || kindLabel;
      const popup = new ml.Popup()
        .setLngLat([lng, lat])
        .setHTML(
          `<strong>${name}</strong><br/>${kindLabel}<br/><button type="button" data-add-stop style="margin-top:6px;cursor:pointer">➕ Dodaj jako przystanek</button>`,
        )
        .addTo(map);
      popup
        .getElement()
        ?.querySelector("[data-add-stop]")
        ?.addEventListener("click", () => {
          addPoiStop(name, lat, lng);
          popup.remove();
        });
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
          waypoints: stops.map((st) => ({ lat: st.lat, lng: st.lng })),
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
        Routing serwerowy (GraphHopper) z przystankami. Profil samochodowy — TIR wymaga planu
        płatnego; myto doszacowane per odcinek.
      </p>

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={styles.panel}>
          {stops.map((st, i) => {
            const role = i === 0 ? "Start" : i === stops.length - 1 ? "Cel" : `Przystanek ${i}`;
            const removable = i > 0 && i < stops.length - 1;
            return (
              <div key={st.key} style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                <div style={{ ...styles.field, flex: 1 }}>
                  <span style={styles.label}>{role}</span>
                  {st.cityId !== undefined ? (
                    <select
                      style={styles.input}
                      value={st.cityId}
                      onChange={(e) => setStopCity(st.key, e.target.value)}
                    >
                      {CITIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ ...styles.input, paddingTop: 11, paddingBottom: 11 }}>
                      📍 {st.label}
                    </div>
                  )}
                </div>
                {removable && (
                  <button type="button" style={styles.remove} onClick={() => removeStop(st.key)}>
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          <button type="button" style={styles.ghost} onClick={addStop}>
            ➕ Dodaj przystanek
          </button>

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
              <Row k="Dostawca" v={result.provider} />
              {result.segments.length > 1 && (
                <div
                  style={{
                    marginTop: 6,
                    borderTop: `1px solid ${palette.graphite}`,
                    paddingTop: 6,
                  }}
                >
                  <div style={{ fontSize: 12, color: palette.smoke, marginBottom: 4 }}>
                    Odcinki:
                  </div>
                  {result.segments.map((s, i) => (
                    <div
                      key={`${s.from.lat},${s.from.lng}->${s.to.lat},${s.to.lng}`}
                      style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
                    >
                      <span style={{ color: palette.smoke }}>
                        #{i + 1} · {s.distanceKm} km
                      </span>
                      <span>
                        {s.tollCost} {result.currency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
    width: 280,
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
