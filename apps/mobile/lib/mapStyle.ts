import { palette } from "@e-logistic/ui";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";

/**
 * Styl mapy dla ekranu mobilnego — odpowiednik webowego `map/mapTheme.ts`:
 * MapTiler dark (gdy jest `EXPO_PUBLIC_MAPTILER_KEY`), inaczej raster OSM
 * przyciemniony pod motyw red/black. Mapa świadomie ciemna (jak na web).
 */
const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? "";

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

/** URL stylu (MapTiler) albo obiekt StyleSpecification (fallback OSM). */
export function mapStyle(): string | StyleSpecification {
  if (MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`;
  }
  return OSM_STYLE;
}

/** Centrum Europy — start, gdy brak zgody na lokalizację. */
export const EUROPE_CENTER: [number, number] = [13.4, 50.1];
export const EUROPE_ZOOM = 4;
