/**
 * Warstwy MapLibre ekranu mapy: dodanie źródła i warstw albo podmiana danych
 * istniejącego źródła. Bez Reacta — instancja mapy przychodzi jawnie parametrem.
 *
 * DLACZEGO OSOBNY MODUŁ: `page.tsx` trzymał komplet specyfikacji `addLayer` (paint,
 * layout, filtry) wewnątrz `useCallback`, przez co kilkaset linii deklaratywnej
 * konfiguracji stylu mieszało się z kolejnością efektów inicjalizujących mapę —
 * a to ta kolejność jest w tym ekranie krucha. Tutaj są same warstwy.
 *
 * Bramki „mapa jest / styl wczytany" ZOSTAJĄ po stronie `page.tsx`: wynikają
 * z cyklu życia Reacta (refy, `setStyle`), a nie z samego rysowania.
 *
 * GeoJSON przychodzi gotowy z `./mapFeatures` — typy parametrów są celowo wzięte
 * przez `ReturnType`, żeby zmiana kształtu properties w builderze od razu psuła
 * warstwę, która na tych properties stoi (`["get","color"]` i podobne).
 */

import { palette } from "@e-logistic/ui";
import type { AddLayerObject, GeoJSONSource, Map as MlMap } from "maplibre-gl";
import type {
  incidentFeatures,
  poiFeatures,
  reportFeatures,
  routeFeature,
  savedFeatures,
  tollSectionFeatures,
  trafficFlowFeatures,
  truckPositionFeatures,
} from "./mapFeatures";
import { INCIDENT_COLOR, MAPTILER_KEY } from "./mapTheme";

/** Podmienia dane istniejącego źródła; `false` = źródła jeszcze nie ma i trzeba je dodać. */
function updateSource(map: MlMap, id: string, data: unknown): boolean {
  const existing = map.getSource(id);
  if (!existing) return false;
  (existing as GeoJSONSource).setData(data as Parameters<GeoJSONSource["setData"]>[0]);
  return true;
}

/** #324: auta live — kropka (kolor wg świeżości), strzałka kierunku i etykieta. */
export function drawTrucksLayer(
  map: MlMap,
  data: ReturnType<typeof truckPositionFeatures>["data"],
): void {
  if (updateSource(map, "trucks", data)) return;
  map.addSource("trucks", { type: "geojson", data });
  map.addLayer({
    id: "trucks-layer",
    type: "circle",
    source: "trucks",
    paint: {
      "circle-radius": 9,
      "circle-color": ["get", "color"],
      "circle-stroke-width": 2.5,
      "circle-stroke-color": palette.white,
    },
  } as AddLayerObject);
  try {
    // [#383] Strzałka obrócona o `heading` — kropka zostaje pod spodem CELOWO:
    // styl rastrowy (fallback OSM) nie ma glyphów i warstwa symboli się nie doda,
    // a wtedy pozycja auta nadal musi być widoczna. `text-rotation-alignment: map`
    // trzyma strzałkę zgodnie z terenem (obrót mapy jej nie przekłamuje),
    // `text-pitch-alignment: viewport` zostawia ją czytelną przy pochyleniu 3D.
    map.addLayer({
      id: "trucks-heading",
      type: "symbol",
      source: "trucks",
      filter: ["has", "heading"],
      layout: {
        "text-field": "▲",
        "text-size": 13,
        "text-rotate": ["get", "heading"],
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "viewport",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": palette.black },
    } as AddLayerObject);
  } catch {
    // styl bez glyphów — zostaje sama kropka (bez kierunku, ale bez kłamstwa)
  }
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
    } as AddLayerObject);
  } catch {
    // styl bez glyphów (fallback OSM) — same kropki wystarczą
  }
}

/** Zgłoszenia społeczności (wypadek/policja/waga…) — kolor niesie GeoJSON. */
export function drawReportsLayer(map: MlMap, data: ReturnType<typeof reportFeatures>): void {
  if (updateSource(map, "reports", data)) return;
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
  } as AddLayerObject);
}

/** Natężenie ruchu (HERE) — kolorowe odcinki POD trasą, by trasa została na wierzchu. */
export function drawTrafficLayer(map: MlMap, data: ReturnType<typeof trafficFlowFeatures>): void {
  if (updateSource(map, "traffic", data)) return;
  map.addSource("traffic", { type: "geojson", data });
  const layer = {
    id: "traffic-layer",
    type: "line",
    source: "traffic",
    paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.7 },
  } as AddLayerObject;
  if (map.getLayer("route")) map.addLayer(layer, "route");
  else map.addLayer(layer);
}

/**
 * #358: incydenty ruchu TomTom — punktowe piny kolorowane wg severity.
 * [#383] sparametryzowane źródłem/warstwą, bo te same incydenty potrafi przynieść
 * także `/api/traffic` (gdy serwer ma TomTom, a nie ma HERE) — wtedy jadą do własnej
 * warstwy, żeby wyłączenie jednego przełącznika nie kasowało pinezek drugiego.
 */
export function drawIncidentsLayer(
  map: MlMap,
  data: ReturnType<typeof incidentFeatures>,
  sourceId: string,
  layerId: string,
): void {
  if (updateSource(map, sourceId, data)) return;
  map.addSource(sourceId, { type: "geojson", data });
  map.addLayer({
    id: layerId,
    type: "circle",
    source: sourceId,
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
  } as AddLayerObject);
}

/** Wytyczona trasa — jedna linia w czerwieni marki. */
export function drawRouteLayer(map: MlMap, data: ReturnType<typeof routeFeature>): void {
  if (updateSource(map, "route", data)) return;
  map.addSource("route", { type: "geojson", data });
  map.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": palette.red, "line-width": 5 },
  });
}

/** POI (stacje/parkingi) — barwa wg typu. */
export function drawPoisLayer(map: MlMap, data: ReturnType<typeof poiFeatures>): void {
  if (updateSource(map, "pois", data)) return;
  map.addSource("pois", { type: "geojson", data });
  map.addLayer({
    id: "pois-layer",
    type: "circle",
    source: "pois",
    paint: {
      "circle-radius": 6,
      // [#383] Gałąź „company" (niebieska) usunięta: `OsmPoiType` to wyłącznie
      // `parking | fuel_station`, więc dopasowanie nigdy nie mogło się ziścić —
      // a legenda pod mapą obiecywała za nim „firmy". Zostaje szary domyślny kolor
      // jako zabezpieczenie na wypadek nowego typu bez własnej barwy.
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
  } as AddLayerObject);
}

/**
 * #367: zapisane miejsca firmy — obwódka w czerwieni marki + emoji kategorii
 * (SAVED_CAT_ICON) jako `text-field` warstwy symbol. Symbol w try/catch jak przy
 * autach live: styl rastrowy (fallback OSM) nie ma glyphów i by rzucił.
 */
export function drawSavedLayer(map: MlMap, data: ReturnType<typeof savedFeatures>): void {
  if (updateSource(map, "saved", data)) return;
  map.addSource("saved", { type: "geojson", data });
  map.addLayer({
    id: "saved-layer",
    type: "circle",
    source: "saved",
    paint: {
      "circle-radius": 9,
      "circle-color": palette.black,
      "circle-opacity": 0.85,
      "circle-stroke-width": 2,
      "circle-stroke-color": palette.red,
    },
  } as AddLayerObject);
  try {
    map.addLayer({
      id: "saved-icons",
      type: "symbol",
      source: "saved",
      layout: {
        "text-field": ["get", "icon"],
        "text-size": 13,
        "text-allow-overlap": true,
      },
    } as AddLayerObject);
  } catch {
    // styl bez glyphów (fallback OSM) — zostaje samo kółko
  }
}

/**
 * [#383] Odcinki płatne trasy — DWIE warstwy tego samego źródła: czerwona poświata
 * POD linią trasy (żeby płatny fragment było widać z oddali) i czarna szrafura NAD nią
 * (czerń na czerwieni = motyw repo; kreski na jednolicie czerwonej trasie są jedynym
 * rozróżnieniem, które nie wprowadza koloru spoza palety).
 */
export function drawTollLayer(map: MlMap, data: ReturnType<typeof tollSectionFeatures>): void {
  if (updateSource(map, "toll", data)) return;
  map.addSource("toll", { type: "geojson", data });
  const glow = {
    id: "toll-glow",
    type: "line",
    source: "toll",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": palette.red,
      "line-width": 13,
      "line-opacity": 0.3,
      "line-blur": 2,
    },
  } as AddLayerObject;
  if (map.getLayer("route")) map.addLayer(glow, "route");
  else map.addLayer(glow);
  map.addLayer({
    id: "toll-hatch",
    type: "line",
    source: "toll",
    layout: { "line-join": "round", "line-cap": "butt" },
    paint: {
      "line-color": palette.black,
      "line-width": 2.5,
      "line-dasharray": [1, 2],
      "line-opacity": 0.9,
    },
  } as AddLayerObject);
}

/** Bryły budynków (tylko styl wektorowy MapTiler) — bez klucza nie ma z czego ich wyciągnąć. */
export function add3dBuildings(map: MlMap): void {
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
    } as AddLayerObject);
  } catch {
    // styl bez warstwy budynków — pomijamy
  }
}
