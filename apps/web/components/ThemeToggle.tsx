"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";

type Mode = "dark" | "light";

/**
 * Przełącznik trybu jasny/ciemny. Zapisuje wybór w localStorage ("el-theme")
 * i ustawia `data-theme` na <html> — tokeny `--el-*` (z layout.tsx) reagują
 * natychmiast, bez reloadu. Stan początkowy czytany z DOM (ustawionego skryptem
 * anty-FOUC w layout) dopiero po montażu — bez niezgodności hydratacji.
 */
export function ThemeToggle() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    setMode(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("el-theme", next);
    } catch {
      // brak localStorage (tryb prywatny) — zmiana zadziała do przeładowania
    }
    setMode(next);
  }

  // Etykieta = akcja: w trybie ciemnym przycisk oferuje „Tryb jasny" (i odwrotnie).
  return (
    <button
      type="button"
      onClick={toggle}
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
