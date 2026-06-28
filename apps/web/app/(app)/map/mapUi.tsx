import { cssPalette } from "@e-logistic/ui";
import type { CSSProperties } from "react";

/** Wiersz „etykieta — wartość" w panelu wyniku trasy. */
export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: cssPalette.smoke }}>{k}</span>
      <strong>{v}</strong>
    </div>
  );
}

export const styles: Record<string, CSSProperties> = {
  panel: {
    width: 290,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    background: cssPalette.nearBlack,
    border: `1px solid ${cssPalette.graphite}`,
    height: "fit-content",
  },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: cssPalette.smoke },
  input: {
    background: cssPalette.black,
    border: `1px solid ${cssPalette.graphite}`,
    borderRadius: 8,
    padding: "9px 10px",
    color: cssPalette.offWhite,
    width: "100%",
  },
  suggest: {
    position: "absolute",
    zIndex: 5,
    top: "100%",
    left: 0,
    right: 0,
    background: cssPalette.coal,
    border: `1px solid ${cssPalette.graphite}`,
    borderRadius: 8,
    marginTop: 2,
    overflow: "hidden",
    maxHeight: 220,
    overflowY: "auto",
  },
  suggestItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    color: cssPalette.offWhite,
    border: "none",
    borderBottom: `1px solid ${cssPalette.graphite}`,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 13,
  },
  segment: {
    flex: 1,
    background: cssPalette.black,
    color: cssPalette.offWhite,
    border: `1px solid ${cssPalette.graphite}`,
    borderRadius: 8,
    padding: "8px 6px",
    cursor: "pointer",
    fontSize: 13,
  },
  segmentActive: {
    background: cssPalette.red,
    color: cssPalette.white,
    borderColor: cssPalette.red,
  },
  remove: {
    background: "transparent",
    color: cssPalette.smoke,
    border: `1px solid ${cssPalette.graphite}`,
    borderRadius: 8,
    padding: "9px 11px",
    cursor: "pointer",
  },
  check: {
    color: cssPalette.offWhite,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  primary: {
    marginTop: 6,
    background: cssPalette.red,
    color: cssPalette.white,
    border: "none",
    borderRadius: 8,
    padding: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghost: {
    background: "transparent",
    color: cssPalette.offWhite,
    border: `1px solid ${cssPalette.graphite}`,
    borderRadius: 8,
    padding: "10px",
    cursor: "pointer",
  },
  result: {
    marginTop: 8,
    paddingTop: 10,
    borderTop: `1px solid ${cssPalette.graphite}`,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
  },
  disruptions: {
    marginTop: 8,
    padding: "10px 12px",
    background: cssPalette.black,
    border: `1px solid ${cssPalette.graphite}`,
    borderRadius: 8,
  },
  disruptionRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  priceRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    background: cssPalette.black,
    border: `1px solid ${cssPalette.graphite}`,
    borderRadius: 8,
    padding: "7px 10px",
    cursor: "pointer",
    color: cssPalette.offWhite,
    fontSize: 13,
    textAlign: "left",
  },
};
