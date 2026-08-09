"use client";

import { type FxRate, maskedCardLabel, rowAmountEur } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import type { FuelRaw } from "./shared";

/**
 * #275: najczęściej używane karty paliwowe i najczęstsze stacje (miasto+kraj)
 * z tankowań okna analizy. Ranking po liczbie tankowań, z litrami i kwotą.
 *
 * [#378] Kwota jest w euro — przeliczana po kursie z dnia tankowania. Kolejność
 * rankingu wyznacza nadal liczba tankowań, więc przeliczenie jej nie zmienia;
 * naprawia wyłącznie liczbę, którą użytkownik porównuje między kartami i stacjami.
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
  /**
   * Tankowania, przy których kwota JEST wpisana, ale nie ma notowania na dzień
   * tankowania. To co innego niż „nie podano kwoty" i nie wolno tego zlewać
   * w jeden licznik — kierowcy, który wpisał 800 PLN, nie da się kazać
   * „uzupełnić kwoty". Suma poniżej jest o te pozycje niepełna.
   */
  missingRate: number;
}

/**
 * [#378] Pole nazywało się `totalEur`, a kod sumował `price_total` prosto z bazy,
 * nie patrząc na walutę ani razu. Tankowanie za 800 PLN wchodziło do rankingu jako
 * 800 EUR, czyli ponad czterokrotnie za dużo — i to akurat w tabeli, na podstawie
 * której firma decyduje, którą kartą i na której stacji tankuje taniej. Karta
 * używana głównie w Polsce wyglądała na najdroższą w flocie wyłącznie z powodu
 * kursu.
 *
 * Teraz każdy wiersz przeliczamy osobno po kursie z dnia tankowania (`occurred_at`,
 * nie `created_at` — kurs ma odpowiadać momentowi poniesienia kosztu). Wiersz bez
 * notowania jest POMIJANY, a nie wliczany jako zero: zero znaczyłoby „zatankowano
 * za darmo" i zaniżało koszt tak samo cicho, jak wcześniej zawyżała go złotówka
 * liczona jak euro.
 */
function rank(
  rows: FuelRaw[],
  keyOf: (r: FuelRaw) => string | null,
  rates: readonly FxRate[],
): RankRow[] {
  const map = new Map<string, RankRow>();
  for (const r of rows) {
    const label = keyOf(r);
    if (!label) continue;
    const cur = map.get(label) ?? { label, count: 0, liters: 0, totalEur: 0, missingRate: 0 };
    cur.count += 1;
    cur.liters += Number(r.liters ?? 0);
    const eur = rowAmountEur(r.price_total, r.currency, r.occurred_at, rates);
    if (eur != null) cur.totalEur += eur;
    else if (r.price_total != null) cur.missingRate += 1;
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
              {/* [#378] Kwota szła na ekran jako goła liczba, bez symbolu waluty —
                  „410" przy stacji w Polsce i „410" przy stacji w Niemczech
                  wyglądały identycznie, choć znaczyły zupełnie co innego. Teraz
                  to zawsze euro i jest to napisane wprost. Osobny licznik mówi,
                  ile tankowań wypadło z sumy z braku kursu, żeby liczba nie
                  udawała kompletnej. */}
              <span
                style={{ color: palette.smoke }}
                title={
                  r.missingRate > 0
                    ? `${r.missingRate} tankowań ma kwotę w walucie bez notowania na dzień tankowania — nie weszły do sumy.`
                    : undefined
                }
              >
                {r.count}× · {Math.round(r.liters)} l
                {r.totalEur > 0 ? ` · ${r.totalEur.toFixed(0)} €` : ""}
                {r.missingRate > 0 ? ` · +${r.missingRate} bez kursu` : ""}
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

export function TopUsageSection({
  fuel,
  cards,
  rates,
}: {
  fuel: FuelRaw[];
  cards: CardOpt[];
  /**
   * [#378] Kursy EBC z ekranu nadrzędnego. Bez nich kwota w innej walucie niż
   * euro nie ma jak wejść do rankingu — a wcześniej wchodziła, po kursie 1:1.
   */
  rates: readonly FxRate[];
}) {
  const cardLabel = new Map(
    cards.map((c) => [c.id, maskedCardLabel(c.provider, c.card_number_masked)]),
  );
  const topCards = rank(
    fuel,
    (r) => {
      const id = (r as { fuel_card_id?: string | null }).fuel_card_id;
      return id ? (cardLabel.get(id) ?? "karta (usunięta)") : null;
    },
    rates,
  );
  const topStations = rank(
    fuel,
    (r) => {
      const city = (r as { station_city?: string | null }).station_city;
      return city ? `${city}, ${r.station_country}` : r.station_country || null;
    },
    rates,
  );

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
