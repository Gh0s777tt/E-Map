"use client";

import { listDrivers, listFuelCardsSafe, listOrders, listVehicles } from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Step = { key: string; label: string; href: string; done: boolean };

/**
 * Lista startowa dla nowej firmy (owner/dispatcher): pojazd → kierowca → karta →
 * pierwsze zlecenie. Każdy krok linkuje do modułu. Znika, gdy wszystko zrobione.
 */
export function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m || (m.role !== "owner" && m.role !== "dispatcher")) return;
        const [vehicles, drivers, cards, orders] = await Promise.all([
          listVehicles(sb, m.companyId),
          listDrivers(sb, m.companyId),
          listFuelCardsSafe(sb, m.companyId),
          listOrders(sb, m.companyId),
        ]);
        setSteps([
          {
            key: "veh",
            label: "Dodaj pierwszy pojazd",
            href: "/vehicles",
            done: vehicles.length > 0,
          },
          {
            key: "drv",
            label: "Dodaj kierowcę (kartoteka lub zaproszenie)",
            href: "/drivers",
            done: drivers.length > 0,
          },
          { key: "card", label: "Dodaj kartę paliwową", href: "/cards", done: cards.length > 0 },
          {
            key: "ord",
            label: "Utwórz pierwsze zlecenie",
            href: "/orders",
            done: orders.length > 0,
          },
        ]);
      } catch {
        // brak dostępu / offline → nie pokazuj
      }
    })();
  }, []);

  if (!steps) return null;
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null; // wszystko gotowe → ukryj

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        <span style={{ fontWeight: 800 }}>🚀 Pierwsze kroki</span>
        <span style={styles.count}>
          {doneCount}/{steps.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {steps.map((s) =>
          s.done ? (
            <div key={s.key} style={{ ...styles.row, color: palette.smoke }}>
              <span style={{ width: 22 }}>✅</span>
              <span style={{ textDecoration: "line-through" }}>{s.label}</span>
            </div>
          ) : (
            <Link key={s.key} href={s.href} style={{ ...styles.row, color: palette.offWhite }}>
              <span style={{ width: 22 }}>⬜</span>
              <span>{s.label}</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: palette.red, fontSize: 13, fontWeight: 700 }}>Przejdź →</span>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.red}`,
  },
  head: { display: "flex", gap: 10, alignItems: "center", marginBottom: 10 },
  count: {
    background: palette.red,
    color: palette.white,
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "7px 8px",
    borderRadius: 8,
    textDecoration: "none",
  },
};
