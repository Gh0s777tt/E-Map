/**
 * Wspólne presety stylów formularzy/list (web, React DOM — CSSProperties).
 * Budowane z palety + tokenów z `@e-logistic/ui`. Cel: koniec powielania tych
 * samych obiektów `styles` na każdej stronie (input/pole/etykieta/karta/wiersz).
 * Mobile używa tych samych tokenów liczbowych, ale własnych stylów RN.
 */
import { fontSize, palette, radius, space } from "@e-logistic/ui";
import type { CSSProperties } from "react";

/** Kolumna formularza (label + kontrolka). */
export const field: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space.xs,
  flex: 1,
};

/** Etykieta pola. */
export const label: CSSProperties = { fontSize: fontSize.sm, color: palette.smoke };

/** Pole tekstowe / select. */
export const input: CSSProperties = {
  background: palette.black,
  border: `1px solid ${palette.graphite}`,
  borderRadius: radius.md,
  padding: "10px 12px",
  color: palette.offWhite,
  width: "100%",
};

/** Wiersz formularza w układzie poziomym. */
export const grid: CSSProperties = { display: "flex", gap: space.lg };

/** Kontener formularza (pionowy). */
export const formWrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  marginTop: 20,
  maxWidth: 560,
};

/** Karta elementu listy. */
export const card: CSSProperties = {
  borderRadius: radius.lg,
  background: palette.nearBlack,
  border: `1px solid ${palette.graphite}`,
  overflow: "hidden",
};

/** Wiersz wewnątrz karty listy. */
export const listRow: CSSProperties = {
  display: "flex",
  gap: space.lg,
  alignItems: "center",
  padding: "10px 14px",
};

/** Komórka pomocnicza w wierszu (szara, stała min-szerokość). */
export const cell: CSSProperties = { color: palette.smoke, fontSize: fontSize.base, minWidth: 90 };

/** Drobny meta-tekst. */
export const meta: CSSProperties = { color: palette.smoke, fontSize: fontSize.sm };
