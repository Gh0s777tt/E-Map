import { palette } from "@e-logistic/ui";
import type { CSSProperties } from "react";

/** Wiersz „etykieta — wartość" w panelu wyniku trasy. */
export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: palette.smoke }}>{k}</span>
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
  suggestItem: {
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
  segment: {
    flex: 1,
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "8px 6px",
    cursor: "pointer",
    fontSize: 13,
  },
  segmentActive: { background: palette.red, color: palette.white, borderColor: palette.red },
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
  disruptions: {
    marginTop: 8,
    padding: "10px 12px",
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
  },
  disruptionRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  priceRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "7px 10px",
    cursor: "pointer",
    color: palette.offWhite,
    fontSize: 13,
    textAlign: "left",
  },
};
