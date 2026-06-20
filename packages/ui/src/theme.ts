/**
 * Motyw E-Logistic — głęboka czerwień na czerni (styl Netflix).
 * Tokeny czyste (TS) → współdzielone przez web (CSS vars / Tailwind) i mobile (RN).
 * Kanon kolorów: #E50914 (czerwień) na #0a0a0a (czerń).
 */

/** Surowa paleta — wartości bazowe. */
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

/** Semantyczne tokeny motywu (jeden kontrakt dla obu trybów). */
export interface Theme {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  onPrimary: string;
  success: string;
  warning: string;
  danger: string;
}

/** Tryb ciemny (domyślny). */
export const darkTheme: Theme = {
  background: palette.black,
  surface: palette.nearBlack,
  surfaceAlt: palette.coal,
  border: palette.graphite,
  text: palette.offWhite,
  textMuted: palette.smoke,
  primary: palette.red,
  primaryHover: palette.redLight,
  onPrimary: palette.white,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
};

/** Tryb jasny. */
export const lightTheme: Theme = {
  background: palette.offWhite,
  surface: palette.white,
  surfaceAlt: palette.fog,
  border: palette.fog,
  text: palette.black,
  textMuted: "#525252",
  primary: palette.red,
  primaryHover: palette.redDark,
  onPrimary: palette.white,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
};

export type ThemeMode = "dark" | "light";

export const themes: Record<ThemeMode, Theme> = {
  dark: darkTheme,
  light: lightTheme,
};

/**
 * Generuje deklaracje CSS variables (`--el-*`) dla danego motywu.
 * Użycie web: wstrzyknij wynik w `:root` / `[data-theme]`.
 */
export function themeToCssVars(theme: Theme): string {
  return Object.entries(theme)
    .map(([key, value]) => `--el-${kebab(key)}: ${value};`)
    .join("\n");
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
