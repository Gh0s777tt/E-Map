import { type DriverRoute, listMyDriverRoutes } from "@e-logistic/api";
import { createTranslator } from "@e-logistic/i18n";
import { fetchPois, type Poi } from "@e-logistic/maps";
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
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EUROPE_CENTER, EUROPE_ZOOM, mapStyle } from "../../lib/mapStyle";
import { getSupabase, supabaseConfigured } from "../../lib/supabase";

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
      </MapLibreMap>

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
      {selected ? (
        <View style={styles.infoBar}>
          <Text style={styles.infoIcon}>{selected.type === "fuel_station" ? "⛽" : "🅿️"}</Text>
          <Text style={styles.infoText} numberOfLines={2}>
            {selected.name ||
              (selected.type === "fuel_station"
                ? t("mobileMap.poiFuel")
                : t("mobileMap.poiParking"))}
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
  routesBar: { position: "absolute", top: 10, left: 0, right: 0, maxHeight: 44 },
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
