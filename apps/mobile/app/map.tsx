import { type DriverRoute, listMyDriverRoutes } from "@e-logistic/api";
import { estimateRouteFuel } from "@e-logistic/core";
import {
  fetchPois,
  type GeoHit,
  geocode,
  type Poi,
  type TomTomPoi,
  TomTomRoutingProvider,
  type TrafficIncident,
  tomtomSearchAlongRoute,
  tomtomTrafficIncidents,
} from "@e-logistic/maps";
import { palette } from "@e-logistic/ui";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  type MapRef,
  type PressEventWithFeatures,
  UserLocation,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ParkingReviewCard } from "../components/ParkingReviewCard";
import { WEB_BASE_URL } from "../lib/config";
import { useT } from "../lib/i18n";
import { EUROPE_CENTER, EUROPE_ZOOM, mapStyle } from "../lib/mapStyle";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

// #356: klucz TomTom (klient-side, EXPO_PUBLIC). Pusty → mapa działa jak dotąd
// (geokoder MapTiler/Nominatim, routing przez web /api/route). Ustawiony → lepsze
// wyszukiwanie, routing TIR z ruchem na żywo po stronie klienta oraz „POI po drodze".
const TOMTOM_KEY = process.env.EXPO_PUBLIC_TOMTOM_KEY ?? "";

// #358: bbox "minLng,minLat,maxLng,maxLat" z geometrii [lng,lat][] — do zapytań o ruch
// dla obszaru wytyczonej trasy (nie zależy od stanu animacji kamery).
function bboxOf(geometry: [number, number][]): string {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const [lng, lat] of geometry) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return `${minLng},${minLat},${maxLng},${maxLat}`;
}

/**
 * Faza M3 (fala 1): render mapy + „moja lokalizacja" + POI TIR (parkingi hgv /
 * stacje paliw) z Overpass przez `@e-logistic/maps`. Routing TIR na mapie —
 * fala 2 (web ma go w `/api/route`; tu dojdzie po QA renderu na urządzeniu).
 */
export default function MapScreen() {
  const t = useT();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Poi | null>(null);
  const [located, setLocated] = useState(false);
  // #272 (M3 fala 2): trasy wysłane przez spedytora — web liczy, mobile rysuje.
  const [routes, setRoutes] = useState<DriverRoute[]>([]);
  const [activeRoute, setActiveRoute] = useState<DriverRoute | null>(null);
  // #341: wyszukiwanie adresu + wyznaczanie trasy TIR z web /api/route
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [dest, setDest] = useState<GeoHit | null>(null);
  const [planned, setPlanned] = useState<{
    geometry: [number, number][];
    distanceKm: number;
    durationMin: number;
    tollCost: number;
    currency: string;
  } | null>(null);
  const [planning, setPlanning] = useState(false);
  // #356: POI TomTom wzdłuż wytyczonej trasy (paliwo/parking po drodze).
  const [alongPois, setAlongPois] = useState<TomTomPoi[]>([]);
  const [alongKind, setAlongKind] = useState<"fuel" | "parking" | null>(null);
  const [alongBusy, setAlongBusy] = useState(false);
  const [selectedAlong, setSelectedAlong] = useState<TomTomPoi | null>(null);
  // #358: warstwa ruchu — incydenty TomTom (wypadki, roboty, zamknięcia) w widoku.
  const [trafficOn, setTrafficOn] = useState(false);
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [trafficBusy, setTrafficBusy] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    listMyDriverRoutes(getSupabase())
      .then(setRoutes)
      .catch(() => {});
  }, []);

  const showRoute = useCallback((r: DriverRoute) => {
    setActiveRoute(r);
    const mid = r.geometry[Math.floor(r.geometry.length / 2)];
    if (mid) cameraRef.current?.easeTo({ center: mid, zoom: 6.2, duration: 700 });
  }, []);

  const locate = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setNotice(t("m.map.permissionDenied"));
      return;
    }
    setNotice(null);
    setLocated(true);
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    cameraRef.current?.easeTo({
      center: [pos.coords.longitude, pos.coords.latitude],
      zoom: 11,
      duration: 600,
    });
  }, [t]);

  const searchAddress = useCallback(async () => {
    if (searching) return;
    // #354: krótkie zapytanie i „brak wyników" muszą dać widoczny komunikat —
    // wcześniej cichy early-return / puste `geocode` wyglądały jak martwy przycisk.
    if (query.trim().length < 2) {
      setNotice(t("m.map.searchTooShort"));
      return;
    }
    setSearching(true);
    setNotice(null);
    try {
      const hits = await geocode(query.trim(), {
        limit: 6,
        tomtomKey: TOMTOM_KEY || undefined,
      });
      setResults(hits);
      if (hits.length === 0) setNotice(t("m.map.noResults"));
    } catch {
      setNotice(t("m.map.searchError"));
    } finally {
      setSearching(false);
    }
  }, [query, searching, t]);

  const selectDest = useCallback((hit: GeoHit) => {
    setDest(hit);
    setResults([]);
    setQuery(hit.label);
    cameraRef.current?.easeTo({ center: [hit.lng, hit.lat], zoom: 9, duration: 700 });
  }, []);

  // #358: pobierz incydenty ruchu dla bieżącego widoku. bbox = "minLng,minLat,maxLng,maxLat"
  // (getBounds() zwraca [west, south, east, north]). Bez klucza — no-op.
  const refreshTraffic = useCallback(
    async (bboxOverride?: string) => {
      const map = mapRef.current;
      if (!map || !TOMTOM_KEY) return;
      try {
        // Po wytyczeniu trasy kamera dopiero animuje — bierzemy bbox trasy (override),
        // inaczej getBounds() zwróciłby jeszcze stary kadr (#358, przegląd).
        let bbox = bboxOverride;
        if (!bbox) {
          const [west, south, east, north] = await map.getBounds();
          bbox = `${west},${south},${east},${north}`;
        }
        const found = await tomtomTrafficIncidents(bbox, TOMTOM_KEY);
        setIncidents(found);
        if (found.length === 0) setNotice(t("m.map.trafficNone"));
      } catch {
        setNotice(t("m.map.trafficError"));
      }
    },
    [t],
  );

  const planRoute = useCallback(async () => {
    if (!dest || planning) return;
    setPlanning(true);
    setNotice(null);
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      const req = perm.granted ? perm : await Location.requestForegroundPermissionsAsync();
      if (!req.granted) {
        setNotice(t("m.map.permissionDenied"));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const waypoints = [
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        { lat: dest.lat, lng: dest.lng },
      ];

      // #356: z kluczem TomTom liczymy trasę TIR z ruchem na żywo bezpośrednio na
      // urządzeniu (bez zależności od web /api/route). Fallback do web przy błędzie.
      if (TOMTOM_KEY) {
        try {
          const rr = await new TomTomRoutingProvider(TOMTOM_KEY).route({
            waypoints,
            profile: { kind: "truck", weightKg: 24000 },
            currency: "EUR",
          });
          if (rr.geometry.length >= 2) {
            const geometry = rr.geometry.map((g) => [g.lng, g.lat] as [number, number]);
            setPlanned({
              geometry,
              distanceKm: rr.distanceKm,
              durationMin: rr.durationMin,
              tollCost: rr.tollCost,
              currency: rr.currency,
            });
            setAlongPois([]);
            setAlongKind(null);
            setActiveRoute(null);
            const mid = geometry[Math.floor(geometry.length / 2)];
            if (mid) cameraRef.current?.easeTo({ center: mid, zoom: 6, duration: 700 });
            if (trafficOn) void refreshTraffic(bboxOf(geometry));
            return;
          }
        } catch {
          // spadamy do web /api/route poniżej
        }
      }

      // #audyt Ś16: /api/route wymaga teraz uwierzytelnienia — dołącz token sesji.
      const token = supabaseConfigured
        ? (await getSupabase().auth.getSession()).data.session?.access_token
        : undefined;
      const res = await fetch(`${WEB_BASE_URL}/api/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          waypoints,
          profile: { kind: "truck", weightKg: 24000 },
          options: {},
        }),
      });
      if (!res.ok) {
        setNotice(t("m.map.routeError"));
        return;
      }
      const r = (await res.json()) as {
        geometry: [number, number][];
        distanceKm: number;
        durationMin: number;
        tollCost: number;
        currency: string;
      };
      if (!r.geometry || r.geometry.length < 2) {
        setNotice(t("m.map.routeError"));
        return;
      }
      setPlanned(r);
      setAlongPois([]);
      setAlongKind(null);
      setActiveRoute(null);
      const mid = r.geometry[Math.floor(r.geometry.length / 2)];
      if (mid) cameraRef.current?.easeTo({ center: mid, zoom: 6, duration: 700 });
      if (trafficOn) void refreshTraffic(bboxOf(r.geometry));
    } catch {
      setNotice(t("m.map.routeError"));
    } finally {
      setPlanning(false);
    }
  }, [dest, planning, trafficOn, refreshTraffic, t]);

  const clearRoute = useCallback(() => {
    setPlanned(null);
    setDest(null);
    setQuery("");
    setResults([]);
    setAlongPois([]);
    setAlongKind(null);
    setSelectedAlong(null);
  }, []);

  // #356/#358: „po drodze" — POI TomTom (paliwo/parking) wzdłuż trasy (do 10 min objazdu).
  const findAlongRoute = useCallback(
    async (kind: "fuel" | "parking") => {
      if (!planned || alongBusy || !TOMTOM_KEY) return;
      setAlongKind(kind);
      setAlongBusy(true);
      setNotice(null);
      try {
        // TomTom searchAlongRoute ma limit punktów trasy — próbkujemy do ≤100
        // równomiernie (zachowując pierwszy i ostatni), by nie dostać 400 na długiej trasie.
        // Dzielnik 99 (nie 100): filtr daje ≤99 punktów bazowych, +1 dołożony ostatni = ≤100.
        const geo = planned.geometry;
        const step = Math.max(1, Math.ceil(geo.length / 99));
        const sampled = geo.filter((_, i) => i % step === 0 || i === geo.length - 1);
        const routePoints = sampled.map((g) => ({ lat: g[1], lng: g[0] }));
        const found = await tomtomSearchAlongRoute(routePoints, kind, TOMTOM_KEY, {
          maxDetourSec: 600,
          limit: 20,
        });
        setAlongPois(found);
        if (found.length === 0) setNotice(t("m.map.alongEmpty"));
      } catch {
        setNotice(t("m.map.poiError"));
      } finally {
        setAlongBusy(false);
      }
    },
    [planned, alongBusy, t],
  );

  // #358: włącz/wyłącz warstwę incydentów ruchu TomTom dla bieżącego widoku.
  const toggleTraffic = useCallback(async () => {
    if (!TOMTOM_KEY) return;
    if (trafficOn) {
      setTrafficOn(false);
      setIncidents([]);
      return;
    }
    setTrafficOn(true);
    setTrafficBusy(true);
    setNotice(null);
    await refreshTraffic();
    setTrafficBusy(false);
  }, [trafficOn, refreshTraffic]);

  const loadPois = useCallback(async () => {
    const map = mapRef.current;
    if (!map || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const [west, south, east, north] = await map.getBounds();
      const found = await fetchPois({ south, west, north, east });
      setPois(found);
    } catch {
      setNotice(t("m.map.poiError"));
    } finally {
      setBusy(false);
    }
  }, [busy, t]);

  const poiGeoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: pois.map((p) => ({
      type: "Feature",
      id: p.id,
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id, kind: p.type, name: p.name ?? "" },
    })),
  };

  const onPoiPress = (e: NativeSyntheticEvent<PressEventWithFeatures>) => {
    const id = e.nativeEvent.features[0]?.properties?.id;
    setSelected(pois.find((p) => p.id === id) ?? null);
    setSelectedAlong(null);
  };

  const onAlongPress = (e: NativeSyntheticEvent<PressEventWithFeatures>) => {
    const id = e.nativeEvent.features[0]?.properties?.id;
    setSelectedAlong(alongPois.find((p) => p.id === id) ?? null);
    setSelected(null);
  };

  return (
    <View style={styles.container}>
      <MapLibreMap ref={mapRef} style={styles.map} mapStyle={mapStyle()}>
        <Camera ref={cameraRef} initialViewState={{ center: EUROPE_CENTER, zoom: EUROPE_ZOOM }} />
        {located ? <UserLocation /> : null}
        <GeoJSONSource id="pois" data={poiGeoJson} onPress={onPoiPress}>
          <Layer
            type="circle"
            id="poi-circles"
            style={{
              circleRadius: 6,
              circleColor: ["match", ["get", "kind"], "fuel_station", palette.red, "#3b82f6"],
              circleStrokeColor: palette.black,
              circleStrokeWidth: 1.5,
            }}
          />
        </GeoJSONSource>
        {activeRoute && activeRoute.geometry.length >= 2 && (
          <GeoJSONSource
            id="driver-route"
            data={{
              type: "Feature",
              geometry: { type: "LineString", coordinates: activeRoute.geometry },
              properties: {},
            }}
          >
            <Layer
              type="line"
              id="driver-route-line"
              style={{ lineColor: palette.red, lineWidth: 4, lineOpacity: 0.9 }}
            />
          </GeoJSONSource>
        )}
        {activeRoute && activeRoute.stops.length > 0 && (
          <GeoJSONSource
            id="driver-route-stops"
            data={{
              type: "FeatureCollection",
              features: activeRoute.stops.map((st, i) => ({
                type: "Feature",
                id: `stop-${i}`,
                geometry: { type: "Point", coordinates: [st.lng, st.lat] },
                properties: { label: st.label },
              })),
            }}
          >
            <Layer
              type="circle"
              id="driver-route-stops-circles"
              style={{
                circleRadius: 7,
                circleColor: palette.white,
                circleStrokeColor: palette.red,
                circleStrokeWidth: 3,
              }}
            />
          </GeoJSONSource>
        )}
        {/* #341: wyznaczona trasa TIR (z web /api/route) */}
        {planned && planned.geometry.length >= 2 && (
          <GeoJSONSource
            id="planned-route"
            data={{
              type: "Feature",
              geometry: { type: "LineString", coordinates: planned.geometry },
              properties: {},
            }}
          >
            <Layer
              type="line"
              id="planned-route-line"
              style={{ lineColor: "#3b82f6", lineWidth: 5, lineOpacity: 0.9 }}
            />
          </GeoJSONSource>
        )}
        {/* #356/#358: POI TomTom wzdłuż trasy — paliwo (zielone) / parking (niebieskie) */}
        {alongPois.length > 0 && (
          <GeoJSONSource
            id="along-pois"
            data={{
              type: "FeatureCollection",
              features: alongPois.map((p) => ({
                type: "Feature",
                id: p.id,
                geometry: { type: "Point", coordinates: [p.lng, p.lat] },
                properties: { id: p.id, name: p.name, kind: alongKind ?? "fuel" },
              })),
            }}
            onPress={onAlongPress}
          >
            <Layer
              type="circle"
              id="along-pois-circle"
              style={{
                circleRadius: 6,
                circleColor: ["match", ["get", "kind"], "parking", "#3b82f6", "#22c55e"],
                circleStrokeColor: palette.black,
                circleStrokeWidth: 1.5,
              }}
            />
          </GeoJSONSource>
        )}
        {/* #358: warstwa ruchu — incydenty TomTom kolorowane wg severity */}
        {trafficOn && incidents.length > 0 && (
          <GeoJSONSource
            id="traffic-incidents"
            data={{
              type: "FeatureCollection",
              features: incidents.map((inc) => ({
                type: "Feature",
                id: inc.id,
                geometry: { type: "Point", coordinates: [inc.point.lng, inc.point.lat] },
                properties: { id: inc.id, severity: inc.severity },
              })),
            }}
          >
            <Layer
              type="circle"
              id="traffic-incidents-circle"
              style={{
                circleRadius: 7,
                circleColor: [
                  "match",
                  ["get", "severity"],
                  "closure",
                  palette.red,
                  "major",
                  "#f97316",
                  "moderate",
                  "#eab308",
                  "minor",
                  "#3b82f6",
                  "#9ca3af",
                ],
                circleStrokeColor: palette.black,
                circleStrokeWidth: 1.5,
              }}
            />
          </GeoJSONSource>
        )}
        {dest && (
          <GeoJSONSource
            id="dest-pin"
            data={{
              type: "Feature",
              geometry: { type: "Point", coordinates: [dest.lng, dest.lat] },
              properties: {},
            }}
          >
            <Layer
              type="circle"
              id="dest-pin-circle"
              style={{
                circleRadius: 8,
                circleColor: palette.red,
                circleStrokeColor: palette.white,
                circleStrokeWidth: 2,
              }}
            />
          </GeoJSONSource>
        )}
      </MapLibreMap>

      {/* #341: pasek wyszukiwania adresu + wyznaczanie trasy */}
      <View style={styles.searchBar}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchAddress}
            placeholder={t("m.map.searchPlaceholder")}
            placeholderTextColor={palette.smoke}
            returnKeyType="search"
          />
          <Pressable style={styles.searchBtn} onPress={searchAddress}>
            {searching ? (
              <ActivityIndicator color={palette.white} size="small" />
            ) : (
              <Text style={styles.searchBtnText}>🔍</Text>
            )}
          </Pressable>
        </View>
        {results.length > 0 && (
          <View style={styles.results}>
            {results.map((r) => (
              <Pressable
                key={`${r.lat},${r.lng}`}
                style={styles.resultRow}
                onPress={() => selectDest(r)}
              >
                <Text style={styles.resultText} numberOfLines={1}>
                  📍 {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {dest && results.length === 0 && (
          <Pressable
            style={[styles.planBtn, planning && styles.buttonBusy]}
            onPress={planRoute}
            disabled={planning}
          >
            <Text style={styles.planBtnText}>
              {planning ? `${t("m.map.planning")}…` : `🧭 ${t("m.map.planRoute")}`}
            </Text>
          </Pressable>
        )}
      </View>

      {planned && (
        <View style={styles.planInfo}>
          <Text style={styles.planInfoText} numberOfLines={2}>
            {planned.distanceKm} km · ~{Math.round(planned.durationMin / 60)} h{" "}
            {Math.round(planned.durationMin % 60)} min
            {planned.tollCost > 0
              ? ` · ${t("m.map.toll")} ${planned.tollCost} ${planned.currency}`
              : ""}
            {(() => {
              const eco = estimateRouteFuel({ distanceKm: planned.distanceKm, fuelPricePerL: 0 });
              return ` · ${eco.fuelLiters} l · 🌿 ${eco.co2Kg} kg CO₂`;
            })()}
          </Text>
          {TOMTOM_KEY ? (
            <>
              <Pressable
                onPress={() => findAlongRoute("fuel")}
                disabled={alongBusy}
                hitSlop={6}
                accessibilityLabel={t("m.map.alongFuel")}
              >
                <Text style={styles.alongBtn}>
                  {alongBusy && alongKind === "fuel" ? "…" : "⛽"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => findAlongRoute("parking")}
                disabled={alongBusy}
                hitSlop={6}
                accessibilityLabel={t("m.map.alongParking")}
              >
                <Text style={styles.alongBtn}>
                  {alongBusy && alongKind === "parking" ? "…" : "🅿️"}
                </Text>
              </Pressable>
            </>
          ) : null}
          <Pressable onPress={clearRoute} hitSlop={8}>
            <Text style={styles.planClose}>✕</Text>
          </Pressable>
        </View>
      )}

      {routes.length > 0 && (
        <ScrollView horizontal style={styles.routesBar} contentContainerStyle={styles.routesBarIn}>
          {routes.map((r) => (
            <Pressable
              key={r.id}
              style={[styles.routeChip, activeRoute?.id === r.id && styles.routeChipOn]}
              onPress={() => (activeRoute?.id === r.id ? setActiveRoute(null) : showRoute(r))}
            >
              <Text
                style={activeRoute?.id === r.id ? styles.routeChipTextOn : styles.routeChipText}
                numberOfLines={1}
              >
                🧭 {r.name || r.created_at.slice(0, 10)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {activeRoute && (
        <View style={styles.routeInfo}>
          <Text style={styles.routeInfoText} numberOfLines={2}>
            {activeRoute.name}
            {activeRoute.summary.distanceKm != null && `  ·  ${activeRoute.summary.distanceKm} km`}
            {activeRoute.summary.durationMin != null &&
              `  ·  ~${Math.round((activeRoute.summary.durationMin ?? 0) / 60)} h ${Math.round((activeRoute.summary.durationMin ?? 0) % 60)} min`}
            {activeRoute.summary.tollCost != null &&
              `  ·  ${t("m.map.toll")} ${activeRoute.summary.tollCost} ${activeRoute.summary.currency ?? ""}`}
          </Text>
        </View>
      )}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {/* #323: parking → karta z ocenami społeczności; stacja → prosty pasek. */}
      {selected && selected.type !== "fuel_station" ? (
        <ParkingReviewCard poi={selected} onClose={() => setSelected(null)} />
      ) : selected ? (
        <View style={styles.infoBar}>
          <Text style={styles.infoIcon}>⛽</Text>
          <Text style={styles.infoText} numberOfLines={2}>
            {selected.name || t("m.map.poiFuel")}
          </Text>
          <Pressable onPress={() => setSelected(null)} hitSlop={8}>
            <Text style={styles.infoClose}>✕</Text>
          </Pressable>
        </View>
      ) : null}
      {/* #356: wybrany POI wzdłuż trasy (paliwo po drodze) */}
      {selectedAlong ? (
        <View style={styles.infoBar}>
          <Text style={styles.infoIcon}>{alongKind === "parking" ? "🅿️" : "⛽"}</Text>
          <Text style={styles.infoText} numberOfLines={2}>
            {selectedAlong.name}
            {selectedAlong.address ? ` · ${selectedAlong.address}` : ""}
          </Text>
          <Pressable onPress={() => setSelectedAlong(null)} hitSlop={8}>
            <Text style={styles.infoClose}>✕</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={locate}>
          <Text style={styles.buttonText}>📍 {t("m.map.locate")}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary, busy && styles.buttonBusy]}
          onPress={loadPois}
          disabled={busy}
        >
          <Text style={styles.buttonText}>{busy ? "…" : `🅿️ ${t("m.map.poiLoad")}`}</Text>
        </Pressable>
        {TOMTOM_KEY ? (
          <Pressable
            style={[
              styles.button,
              !trafficOn && styles.buttonSecondary,
              trafficBusy && styles.buttonBusy,
            ]}
            onPress={toggleTraffic}
            disabled={trafficBusy}
          >
            <Text style={styles.buttonText}>
              {trafficBusy
                ? "…"
                : `🚦 ${trafficOn ? t("m.map.trafficHide") : t("m.map.trafficShow")}`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.black },
  searchBar: { position: "absolute", top: 12, left: 12, right: 12, gap: 6 },
  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.92)",
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: palette.offWhite,
    fontSize: 14,
  },
  searchBtn: {
    width: 46,
    backgroundColor: palette.red,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: { fontSize: 18 },
  results: {
    backgroundColor: "rgba(10,10,10,0.96)",
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  resultRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomColor: palette.graphite,
    borderBottomWidth: 1,
  },
  resultText: { color: palette.offWhite, fontSize: 13.5 },
  planBtn: {
    backgroundColor: palette.red,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  planBtnText: { color: palette.white, fontWeight: "800", fontSize: 14 },
  planInfo: {
    position: "absolute",
    bottom: 84,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(59,130,246,0.16)",
    borderColor: "#3b82f6",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  planInfoText: { color: palette.offWhite, flex: 1, fontSize: 13, fontWeight: "600" },
  alongBtn: { fontSize: 18 },
  planClose: { color: "#3b82f6", fontSize: 16, fontWeight: "800" },
  routesBar: { position: "absolute", top: 66, left: 0, right: 0, maxHeight: 44 },
  routesBarIn: { paddingHorizontal: 12, gap: 8 },
  routeChip: {
    backgroundColor: "rgba(10,10,10,0.85)",
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 260,
  },
  routeChipOn: { backgroundColor: palette.red, borderColor: palette.red },
  routeChipText: { color: palette.offWhite, fontSize: 13 },
  routeChipTextOn: { color: palette.white, fontSize: 13, fontWeight: "700" },
  routeInfo: {
    position: "absolute",
    bottom: 84,
    left: 16,
    right: 16,
    backgroundColor: "rgba(10,10,10,0.92)",
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  routeInfoText: { color: palette.offWhite, fontSize: 13 },
  map: { flex: 1 },
  controls: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  button: {
    backgroundColor: palette.red,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonSecondary: { backgroundColor: palette.graphite },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: palette.white, fontWeight: "700", fontSize: 14 },
  notice: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    color: palette.offWhite,
    backgroundColor: "rgba(10,10,10,0.85)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 13,
  },
  infoBar: {
    position: "absolute",
    bottom: 84,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(10,10,10,0.92)",
    borderColor: palette.graphite,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoIcon: { fontSize: 18 },
  infoText: { color: palette.offWhite, flex: 1, fontSize: 14 },
  infoClose: { color: palette.red, fontSize: 16, fontWeight: "700" },
});
