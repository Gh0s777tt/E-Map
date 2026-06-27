/**
 * Sterowanie trybem jasny/ciemny po stronie klienta. Jedna logika dla przełącznika
 * (`ThemeToggle`) i palety poleceń (`GlobalSearch`). Tokeny `--el-*` (z layout.tsx)
 * reagują na `data-theme` na <html> natychmiast; wybór zapisywany w localStorage.
 */
export type ThemeMode = "dark" | "light";

const KEY = "el-theme";

/** Aktualny tryb z DOM (ustawiony skryptem anty-FOUC lub przełącznikiem). */
export function getTheme(): ThemeMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Ustawia tryb na <html> i zapisuje w localStorage. */
export function setTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // brak localStorage (tryb prywatny) — zmiana zadziała do przeładowania
  }
}

/** Przełącza i zwraca nowy tryb. */
export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
