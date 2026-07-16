"use client";

import { type GeoHit, geocode } from "@e-logistic/maps";
import { cssPalette as palette } from "@e-logistic/ui";
import { useRef, useState } from "react";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_KEY ?? "";

/**
 * Wyszukiwarka miejsc (geokoder): wpisz miasto/adres → podpowiedzi → wybór
 * ustawia współrzędne GPS. Działa w dowolnym kraju (MapTiler; fallback Nominatim).
 */
export function PlaceSearch({
  onPick,
  placeholder = "Wpisz miasto lub adres…",
}: {
  onPick: (hit: GeoHit) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function change(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setHits(await geocode(v, { tomtomKey: TOMTOM_KEY || undefined, maptilerKey: MAPTILER_KEY }));
    }, 350);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        style={styles.input}
        value={q}
        onChange={(e) => change(e.target.value)}
        placeholder={placeholder}
      />
      {hits.length > 0 && (
        <div style={styles.suggest}>
          {hits.map((h) => (
            <button
              key={`${h.lat},${h.lng}`}
              type="button"
              style={styles.item}
              onClick={() => {
                onPick(h);
                setQ(h.label);
                setHits([]);
              }}
            >
              {h.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "10px 12px",
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
  item: {
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
};
