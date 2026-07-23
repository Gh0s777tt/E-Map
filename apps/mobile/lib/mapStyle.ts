import { palette } from "@e-logistic/ui";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";

/**
 * Styl mapy dla ekranu mobilnego — odpowiednik webowego `map/mapTheme.ts`.
 * Priorytet podkładu wg dostępnych kluczy: **TomTom** (raster „night", gdy jest
 * `EXPO_PUBLIC_TOMTOM_KEY`) → MapTiler dark (`EXPO_PUBLIC_MAPTILER_KEY`) →
 * raster OSM przyciemniony. Mapa świadomie ciemna (motyw red/black, jak na web).
 */
const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? "";
const TOMTOM_KEY = process.env.EXPO_PUBLIC_TOMTOM_KEY ?? "";

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

/** Podkład TomTom (raster, styl „night" pod motyw red/black) — gdy jest klucz TomTom. */
const tomtomStyle = (): StyleSpecification => ({
  version: 8,
  sources: {
    tomtom: {
      type: "raster",
      tiles: [`https://api.tomtom.com/map/1/tile/basic/night/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`],
      tileSize: 256,
      attribution: "© TomTom",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": palette.black } },
    { id: "tomtom", type: "raster", source: "tomtom" },
  ],
});

/** URL stylu (MapTiler) albo obiekt StyleSpecification (TomTom / fallback OSM). */
export function mapStyle(): string | StyleSpecification {
  if (TOMTOM_KEY) return tomtomStyle();
  if (MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`;
  }
  return OSM_STYLE;
}

/** Centrum Europy — start, gdy brak zgody na lokalizację. */
export const EUROPE_CENTER: [number, number] = [13.4, 50.1];
export const EUROPE_ZOOM = 4;
