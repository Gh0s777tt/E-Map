"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { getTheme, type ThemeMode, toggleTheme } from "@/lib/theme";

/**
 * Przełącznik trybu jasny/ciemny. Logika w `lib/theme` (współdzielona z paletą
 * poleceń). Stan początkowy czytany z DOM (ustawionego skryptem anty-FOUC w
 * layout) dopiero po montażu — bez niezgodności hydratacji.
 */
export function ThemeToggle() {
  const t = useT();
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    setMode(getTheme());
  }, []);

  // Etykieta = akcja: w trybie ciemnym przycisk oferuje „Tryb jasny" (i odwrotnie).
  return (
    <button
      type="button"
      onClick={() => setMode(toggleTheme())}
      className="el-btn el-btn-ghost"
      aria-label={t("theme.toggle")}
      title={t("theme.toggle")}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <span aria-hidden="true">{mode === "dark" ? "☀️" : "🌙"}</span>
      {mode === "dark" ? t("theme.light") : t("theme.dark")}
    </button>
  );
}
