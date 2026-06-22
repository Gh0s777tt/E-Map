/**
 * Tokeny wymiarów (liczby) — współdzielone przez web (px w CSSProperties) i
 * mobile (dp w React Native StyleSheet). Kolory są w `palette` (theme.ts).
 * Jeden kanon skali, by chipy/inputy/karty były spójne w obu aplikacjach.
 */

/** Promienie zaokrągleń. `pill` = pełne (999). */
export const radius = { sm: 6, md: 8, lg: 10, xl: 12, pill: 999 } as const;

/** Skala odstępów (gap/padding/margin). */
export const space = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, xxl: 24 } as const;

/** Skala rozmiarów czcionki. */
export const fontSize = { xs: 11, sm: 12, md: 13, base: 14, lg: 16, xl: 18 } as const;
