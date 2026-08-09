"use client";

import { listFxRates, listOrders, toFxRates } from "@e-logistic/api";
import { monthlyFleetTrend, monthsEndingAt, rowAmountEur } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { BarChart } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Point {
  label: string;
  value: number;
}

interface Trend {
  points: Point[];
  /**
   * [#378] Zlecenia z okna wykresu, które mają kwotę, ale nie miały kursu na dzień
   * załadunku — silnik policzył je jako zero. Słupek bez tej adnotacji wyglądałby
   * na pełny miesiąc.
   */
  noRate: number;
}

/**
 * Mini-wykres przychodu floty (6 mies.) na pulpicie — owner/dispatcher.
 * Przychód ze zleceń dostarczonych/zafakturowanych per miesiąc, przeliczony na
 * EUR po kursie z dnia załadunku (rdzeń `monthlyFleetTrend`; paliwo/AdBlue
 * pominięte — liczymy tylko przychód).
 * Liczony na żywo; brak danych / kierowca → nic nie renderuje.
 */
export function RevenueTrend() {
  const [trend, setTrend] = useState<Trend | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m || (m.role !== "owner" && m.role !== "dispatcher")) return;
        const month = new Date().toISOString().slice(0, 7);
        const months = monthsEndingAt(month, 6);
        const from = months.length ? `${months[0]}-01` : undefined;
        const [ord, fxRows] = await Promise.all([
          listOrders(sb, m.companyId, { from, limit: 5000 }),
          // [#378] Kursy z zapasem 10 dni wstecz: kurs bierzemy z DNIA załadunku,
          // a EBC nie publikuje w weekendy i święta, więc zlecenie z 1. dnia okna
          // może potrzebować notowania sprzed kilku dni.
          listFxRates(sb, {
            from: from
              ? new Date(Date.parse(from) - 10 * 86_400_000).toISOString().slice(0, 10)
              : undefined,
          }),
        ]);
        const rates = toFxRates(fxRows);
        const inWindow = (d: string) => months.includes(d.slice(0, 7));
        // [#378] Liczymy zlecenia z kwotą, które przepadły na braku notowania.
        let noRate = 0;
        // [#378] Zlecenia normalizowane do euro TU, na granicy odczytu. Wcześniej
        // szła tu surowa `price` z surową `currency`, a `monthlyFleetTrend` (przez
        // `monthlyFleetSummary`) odsiewa wszystko poza EUR — przychód z faktury
        // w złotówkach wypadał z wykresu bez śladu. Pulpit pokazywał wtedy inną
        // kwotę niż /monthly za ten sam miesiąc. Silnika nie ruszamy: dostaje kwotę
        // już przeliczoną i walutę „EUR".
        const orders = ord.map((o) => {
          // Data ZAŁADUNKU (fallback: utworzenie) — kurs ma odpowiadać zdarzeniu.
          const date = o.load_date ?? o.created_at.slice(0, 10);
          const price = rowAmountEur(o.price, o.currency, date, rates);
          const counted = o.status === "delivered" || o.status === "invoiced";
          if (counted && o.price != null && price == null && inWindow(date)) noRate++;
          return {
            vehicleId: o.vehicle_id,
            price,
            currency: "EUR",
            status: o.status,
            date,
          };
        });
        const series = monthlyFleetTrend({ months, orders, fuel: [], adblue: [] });
        setTrend({
          points: series.map((t) => ({
            label: `${t.month.slice(5)}.${t.month.slice(2, 4)}`,
            value: t.revenueEur,
          })),
          noRate,
        });
      } catch {
        // offline / brak dostępu → ukryj
      }
    })();
  }, []);

  if (!trend) return null;
  // [#378] Same zera chowamy tylko wtedy, gdy naprawdę nie ma czego pokazać.
  // Jeśli zera wzięły się z braku kursów, wykres musi zostać razem z adnotacją —
  // inaczej ukrywalibyśmy przed użytkownikiem to, że dane są niepełne.
  if (trend.points.every((p) => p.value === 0) && trend.noRate === 0) return null;

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        📈 Przychód — ostatnie {trend.points.length} mies.{" "}
        <span style={{ color: palette.smoke, fontSize: 12, fontWeight: 400 }}>
          {/* [#378] Było „zlecenia EUR" — po przeliczeniu wchodzą wszystkie waluty,
              a podpis musi mówić to, co robi kod. */}
          (dostarczone/zafakturowane · przeliczone na EUR po kursie z dnia załadunku)
        </span>
      </div>
      <BarChart data={trend.points} unit=" €" />
      {trend.noRate > 0 && (
        <div style={{ color: palette.warning, fontSize: 12, marginTop: 8 }}>
          {trend.noRate} zlec. bez kursu na dzień załadunku — nie wliczono do słupków.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  head: { fontWeight: 800, marginBottom: 10 },
};
