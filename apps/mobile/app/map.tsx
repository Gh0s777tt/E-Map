import { type DriverRoute, listMyDriverRoutes } from "@e-logistic/api";
import { estimateRouteFuel } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { fetchPois, type GeoHit, geocode, type Poi } from "@e-logistic/maps";
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
import { EUROPE_CENTER, EUROPE_ZOOM, mapStyle } from "../lib/mapStyle";
import { getSupabase, supabaseConfigured } from "../lib/supabase";

const t = createTranslator("pl");

/**
 * Faza M3 (fala 1): render mapy + „moja lokalizacja" + POI TIR (parkingi hgv /
 * stacje paliw) z Overpass przez `@e-logistic/maps`. Routing TIR na mapie —
 * fala 2 (web ma go w `/api/route`; tu dojdzie po QA renderu na urządzeniu).
 */
export default function MapScreen() {
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
      setNotice(t("mobileMap.permissionDenied"));
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
  }, []);

  const searchAddress = useCallback(async () => {
    if (searching) return;
    // #354: krótkie zapytanie i „brak wyników" muszą dać widoczny komunikat —
    // wcześniej cichy early-return / puste `geocode` wyglądały jak martwy przycisk.
    if (query.trim().length < 2) {
      setNotice(t("mobileMap.searchTooShort"));
      return;
    }
    setSearching(true);
    setNotice(null);
    try {
      const hits = await geocode(query.trim(), { limit: 6 });
      setResults(hits);
      if (hits.length === 0) setNotice(t("mobileMap.noResults"));
    } catch {
      setNotice(t("mobileMap.searchError"));
    } finally {
      setSearching(false);
    }
  }, [query, searching]);

  const selectDest = useCallback((hit: GeoHit) => {
    setDest(hit);
    setResults([]);
    setQuery(hit.label);
    cameraRef.current?.easeTo({ center: [hit.lng, hit.lat], zoom: 9, duration: 700 });
  }, []);

  const planRoute = useCallback(async () => {
    if (!dest || planning) return;
    setPlanning(true);
    setNotice(null);
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      const req = perm.granted ? perm : await Location.requestForegroundPermissionsAsync();
      if (!req.granted) {
        setNotice(t("mobileMap.permissionDenied"));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = await fetch("https://e-logistic-one.vercel.app/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints: [
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            { lat: dest.lat, lng: dest.lng },
          ],
          profile: { kind: "truck", weightKg: 24000 },
          options: {},
        }),
      });
      const r = (await res.json()) as {
        geometry: [number, number][];
        distanceKm: number;
        durationMin: number;
        tollCost: number;
        currency: string;
      };
      if (!r.geometry || r.geometry.length < 2) {
        setNotice(t("mobileMap.routeError"));
        return;
      }
      setPlanned(r);
      setActiveRoute(null);
      const mid = r.geometry[Math.floor(r.geometry.length / 2)];
      if (mid) cameraRef.current?.easeTo({ center: mid, zoom: 6, duration: 700 });
    } catch {
      setNotice(t("mobileMap.routeError"));
    } finally {
      setPlanning(false);
    }
  }, [dest, planning]);

  const clearRoute = useCallback(() => {
    setPlanned(null);
    setDest(null);
    setQuery("");
    setResults([]);
  }, []);

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
      setNotice(t("mobileMap.poiError"));
    } finally {
      setBusy(false);
    }
  }, [busy]);

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
            placeholder={t("mobileMap.searchPlaceholder")}
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
              {planning ? `${t("mobileMap.planning")}…` : `🧭 ${t("mobileMap.planRoute")}`}
            </Text>
          </Pressable>
        )}
      </View>

      {planned && (
        <View style={styles.planInfo}>
          <Text style={styles.planInfoText} numberOfLines={2}>
            {planned.distanceKm} km · ~{Math.round(planned.durationMin / 60)} h{" "}
            {Math.round(planned.durationMin % 60)} min
            {planned.tollCost > 0 ? ` · myto ${planned.tollCost} ${planned.currency}` : ""}
            {(() => {
              const eco = estimateRouteFuel({ distanceKm: planned.distanceKm, fuelPricePerL: 0 });
              return ` · ${eco.fuelLiters} l · 🌿 ${eco.co2Kg} kg CO₂`;
            })()}
          </Text>
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
              `  ·  myto ${activeRoute.summary.tollCost} ${activeRoute.summary.currency ?? ""}`}
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
            {selected.name || t("mobileMap.poiFuel")}
          </Text>
          <Pressable onPress={() => setSelected(null)} hitSlop={8}>
            <Text style={styles.infoClose}>✕</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={locate}>
          <Text style={styles.buttonText}>📍 {t("mobileMap.locate")}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary, busy && styles.buttonBusy]}
          onPress={loadPois}
          disabled={busy}
        >
          <Text style={styles.buttonText}>{busy ? "…" : `🅿️ ${t("mobileMap.poiLoad")}`}</Text>
        </Pressable>
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
