"use client";

/**
 * [#380] Sekcja zwijana.
 *
 * Ekran statystyk urósł do kilkunastu bloków i wymagał przewijania przez rzeczy,
 * na które akurat się nie patrzy. Zamiast ukrywać dane, pozwalamy je złożyć.
 *
 * Świadomie na natywnym `<details>`, a nie na własnym stanie React:
 *   • działa bez JavaScriptu i przed hydratacją;
 *   • przeglądarka sama daje obsługę klawiatury i rolę dla czytników ekranu;
 *   • **wyszukiwanie w stronie (Ctrl+F) znajduje tekst w zwiniętej sekcji**
 *     i sama ją rozwija — z `display: none` na własnym stanie tekst byłby
 *     nieosiągalny, a użytkownik szukający numeru rejestracyjnego dostałby
 *     „brak wyników" mimo że dane są na ekranie.
 *
 * Podsumowanie w nagłówku jest po to, żeby zwinięcie nie kosztowało informacji:
 * po złożeniu sekcji nadal widać jej najważniejszą liczbę.
 */
import { cssPalette as palette } from "@e-logistic/ui";
import type { ReactNode } from "react";

export function Collapsible({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  /** Liczba lub etykieta widoczna także po zwinięciu. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} style={styles.details}>
      <summary style={styles.summary}>
        <span style={{ fontWeight: 700 }}>{title}</span>
        {summary != null && <span style={styles.badge}>{summary}</span>}
      </summary>
      <div style={{ marginTop: 12 }}>{children}</div>
    </details>
  );
}

const styles: Record<string, React.CSSProperties> = {
  details: {
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "12px 16px",
    background: palette.nearBlack,
    marginTop: 16,
  },
  summary: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    listStyle: "revert",
    color: palette.offWhite,
    fontSize: 16,
  },
  badge: {
    marginLeft: "auto",
    color: palette.smoke,
    fontSize: 13,
    fontWeight: 600,
  },
};
