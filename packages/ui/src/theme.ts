/**
 * Motyw E-Logistic — głęboka czerwień na czerni (styl Netflix) + tryb jasny.
 * Tokeny czyste (TS) → współdzielone przez web (CSS vars / Tailwind) i mobile (RN).
 * Kanon kolorów: #E50914 (czerwień) na #0a0a0a (czerń).
 *
 * Dwa kanały konsumpcji:
 *  - `palette` (surowe hex) — mobile (RN), canvas, MapLibre, dokumenty drukowane.
 *  - `cssPalette` (var(--el-*)) — web/DOM, reaguje na tryb jasny/ciemny.
 */

/** Surowa paleta — wartości bazowe (hex). Bez zmian: używana przez mobile/canvas/druk. */
export const palette = {
  red: "#E50914",
  redDark: "#B20710",
  redLight: "#F6121D",
  black: "#0a0a0a",
  nearBlack: "#141414",
  coal: "#1f1f1f",
  graphite: "#2a2a2a",
  ash: "#3a3a3a",
  smoke: "#a3a3a3",
  fog: "#d4d4d4",
  white: "#ffffff",
  offWhite: "#f5f5f5",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
} as const;

/**
 * Paleta jako CSS variables — **tylko web/DOM/SVG**. Te same klucze co `palette`,
 * ale wartości wskazują na `--el-*` (z fallbackiem do hex dla SSR/druku), dzięki
 * czemu `cssPalette.black` itp. automatycznie reaguje na `[data-theme="light"]`.
 *
 * Mapowanie nazwa-koloru → rola semantyczna (motyw projektowany „ciemny":
 * black/nearBlack/coal = tła, offWhite/smoke = teksty, graphite/ash = obramowania):
 *  - `white` zostaje stałym #fff (tekst na czerwieni — onPrimary, ten sam w obu trybach),
 *  - canvas/MapLibre/dokumenty drukowane używają `palette` (var() tam nie działa).
 */
export const cssPalette = {
  red: "var(--el-red, #E50914)",
  redDark: "var(--el-red-strong, #B20710)",
  redLight: "var(--el-red-strong, #F6121D)",
  black: "var(--el-background, #0a0a0a)",
  nearBlack: "var(--el-surface, #141414)",
  coal: "var(--el-surface-hover, #1f1f1f)",
  graphite: "var(--el-border, #2a2a2a)",
  ash: "var(--el-border-strong, #3a3a3a)",
  smoke: "var(--el-muted, #a3a3a3)",
  fog: "var(--el-border-strong, #d4d4d4)",
  white: "#ffffff",
  offWhite: "var(--el-text, #f5f5f5)",
  success: "var(--el-success, #22c55e)",
  warning: "var(--el-warning, #f59e0b)",
  danger: "var(--el-danger, #ef4444)",
} satisfies Record<keyof typeof palette, string>;

/**
 * Semantyczne tokeny motywu (jeden kontrakt dla obu trybów). Klucze mapują się
 * 1:1 na CSS variables `--el-<kebab>` przez `themeToCssVars`.
 */
export interface Theme {
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderStrong: string;
  text: string;
  muted: string;
  red: string;
  redStrong: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
}

/** Tryb ciemny (domyślny) — kanon red/black. */
export const darkTheme: Theme = {
  background: palette.black,
  surface: palette.nearBlack,
  surfaceHover: palette.coal,
  border: palette.graphite,
  borderStrong: palette.ash,
  text: palette.offWhite,
  muted: palette.smoke,
  red: palette.red,
  redStrong: "#ff0f1a",
  onPrimary: palette.white,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
};

/** Tryb jasny — czerwień na bieli (kontrast WCAG AA dla tekstu i obramowań). */
export const lightTheme: Theme = {
  background: "#f4f4f5",
  surface: "#ffffff",
  surfaceHover: "#ececef",
  border: "#e3e3e8",
  borderStrong: "#cfcfd6",
  text: "#18181b",
  muted: "#61616a",
  red: palette.red,
  redStrong: "#c20710",
  onPrimary: palette.white,
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
};

export type ThemeMode = "dark" | "light";

export const themes: Record<ThemeMode, Theme> = {
  dark: darkTheme,
  light: lightTheme,
};

/**
 * Generuje deklaracje CSS variables (`--el-*`) dla danego motywu.
 * Użycie web: wstrzyknij wynik w `:root[data-theme="…"]`.
 */
export function themeToCssVars(theme: Theme): string {
  return Object.entries(theme)
    .map(([key, value]) => `--el-${kebab(key)}: ${value};`)
    .join("\n");
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
