"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import type { FuelRaw } from "./shared";

/**
 * #275: najczęściej używane karty paliwowe i najczęstsze stacje (miasto+kraj)
 * z tankowań okna analizy. Ranking po liczbie tankowań, z litrami i kwotą.
 */

export interface CardOpt {
  id: string;
  provider: string;
  card_number_masked: string;
}

interface RankRow {
  label: string;
  count: number;
  liters: number;
  totalEur: number;
}

function rank(rows: FuelRaw[], keyOf: (r: FuelRaw) => string | null): RankRow[] {
  const map = new Map<string, RankRow>();
  for (const r of rows) {
    const label = keyOf(r);
    if (!label) continue;
    const cur = map.get(label) ?? { label, count: 0, liters: 0, totalEur: 0 };
    cur.count += 1;
    cur.liters += Number(r.liters ?? 0);
    cur.totalEur += Number(r.price_total ?? 0);
    map.set(label, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

function RankList({ title, rows, empty }: { title: string; rows: RankRow[]; empty: string }) {
  const max = rows[0]?.count ?? 1;
  return (
    <div style={{ flex: 1, minWidth: 300 }}>
      <strong style={{ fontSize: 15 }}>{title}</strong>
      {rows.length === 0 && <p style={{ color: palette.smoke, fontSize: 13 }}>{empty}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {rows.map((r) => (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: palette.offWhite }}>{r.label}</span>
              <span style={{ color: palette.smoke }}>
                {r.count}× · {Math.round(r.liters)} l
                {r.totalEur > 0 ? ` · ${r.totalEur.toFixed(0)}` : ""}
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: palette.red,
                opacity: 0.85,
                width: `${Math.max(6, (r.count / max) * 100)}%`,
                marginTop: 3,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopUsageSection({ fuel, cards }: { fuel: FuelRaw[]; cards: CardOpt[] }) {
  const cardLabel = new Map(
    cards.map((c) => [c.id, `${c.provider.toUpperCase()} ${c.card_number_masked}`]),
  );
  const topCards = rank(fuel, (r) => {
    const id = (r as { fuel_card_id?: string | null }).fuel_card_id;
    return id ? (cardLabel.get(id) ?? "karta (usunięta)") : null;
  });
  const topStations = rank(fuel, (r) => {
    const city = (r as { station_city?: string | null }).station_city;
    return city ? `${city}, ${r.station_country}` : r.station_country || null;
  });

  return (
    <section style={styles.card}>
      <h2 style={styles.h2}>⛽ Karty i stacje (okno analizy)</h2>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        <RankList
          title="💳 Najczęściej używane karty"
          rows={topCards}
          empty="Brak tankowań z przypisaną kartą."
        />
        <RankList
          title="📍 Najczęstsze stacje"
          rows={topStations}
          empty="Brak danych o stacjach (kraj/miasto w formularzu Paliwo)."
        />
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginTop: 20,
    padding: 18,
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  h2: { fontSize: 17, fontWeight: 800, margin: "0 0 10px" },
};
