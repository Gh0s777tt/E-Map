"use client";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui";

/**
 * Przycisk dorenderowania kolejnej porcji wierszy — para do `lib/useRenderWindow.ts`.
 *
 * Osobny komponent, a nie trzy kopie tego samego `<Button>`, bo razem z przyciskiem
 * musi jechać LICZBA ukrytych wierszy. Bez niej okno renderowania wygląda dokładnie jak
 * ucięta lista — czyli dokładnie jak to, przed czym broni się reszta tej gałęzi.
 */
export function ShowMore({ hidden, onShowMore }: { hidden: number; onShowMore: () => void }) {
  const t = useT();
  if (hidden <= 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
      <Button variant="ghost" onClick={onShowMore}>
        {t("common.showMore").replace("{n}", String(hidden))}
      </Button>
    </div>
  );
}
