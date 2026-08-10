/** Wspólne typy, helpery i style ekranu statystyk (współdzielone przez page + podkomponenty). */
import {
  BASE_CURRENCY,
  type FuelStatsEntry,
  type FxRate,
  round2,
  rowAmountEur,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";

export type FuelRaw = {
  id: string;
  vehicle_id: string;
  odometer_km: number;
  liters: number;
  price_total: number | null;
  /**
   * [#378] Waluta kwoty. Typ jej nie deklarował, mimo że `select("*")` i tak ją
   * pobierał — dane leżały w pamięci przeglądarki nieodczytane, a ekran sumował
   * złotówki razem z euro jak jedną walutę.
   */
  currency: string | null;
  price_net: number | null;
  vat_rate: number | null;
  fuel_card_id: string | null;
  is_full?: boolean;
  station_country: string;
  station_city?: string | null;
  created_at: string;
  occurred_at: string;
};
export type TripRaw = {
  id: string;
  vehicle_id: string;
  action: string;
  /**
   * [#382] Stan licznika przy zdarzeniu. Kolumna jest `not null` od migracji
   * 0001 i `select("*")` i tak ją pobierał — brakowało jej wyłącznie w typie.
   * Bez niej wyjazd nie ma licznika startu ani zakończenia, więc jego dystans
   * wychodzi pusty, a średnie spalanie ważone dystansem nie ma czym ważyć:
   * skrót wyjazdów pokazywałby „—" mimo kompletu danych w pamięci.
   */
  odometer_km: number;
  weight_kg: number | null;
  amount: number | null;
  currency: string | null;
  country: string;
  created_at: string;
  occurred_at: string;
};

/**
 * [#378] Wiersz z bazy → wpis dla silnika liczącego, z kwotą JUŻ przeliczoną na euro
 * po kursie z dnia zdarzenia.
 *
 * Przeliczenie siedzi tutaj, na granicy odczytu, a nie w każdym miejscu sumowania:
 * `summarizeFuel`, kafelki, P&L i wykres miesięczny biorą dane właśnie stąd, więc
 * jedna poprawka prostuje je wszystkie naraz. Kiedy kursu brakuje, `priceTotal`
 * zostaje `undefined` — świadomie, bo zero znaczyłoby „tankowanie za darmo",
 * a kurs 1:1 zawyżyłby koszt złotówkowy ponad czterokrotnie.
 */
export const entry = (
  r: FuelRaw,
  // Parametr celowo WYMAGANY, choć wartość domyślna byłaby wygodniejsza:
  // przy `= []` zapis `.map(entry)` kompiluje się i przekazuje indeks tablicy
  // jako kursy, po cichu wracając do sumowania bez przeliczeń. Tak było napisane
  // w trzech miejscach — TypeScript zgłasza to tylko wtedy, gdy pole jest wymagane.
  rates: readonly FxRate[],
): FuelStatsEntry & { isFull?: boolean } => ({
  odometerKm: r.odometer_km,
  liters: Number(r.liters),
  priceTotal: rowAmountEur(r.price_total, r.currency, r.occurred_at, rates) ?? undefined,
  isFull: r.is_full !== false,
});

/**
 * Ile wierszy ma kwotę, ale nie da się jej przeliczyć na euro.
 *
 * To NIE to samo co „brak kwoty" i nie wolno tego zlewać w jeden licznik:
 * użytkownikowi, który wpisał 1200 PLN, komunikat „uzupełnij kwotę" jest
 * nie do wykonania. Tu chodzi o brak notowania na dany dzień.
 */
export function countMissingRate(rows: FuelRaw[], rates: readonly FxRate[]): number {
  return rows.filter(
    (r) =>
      r.price_total != null &&
      rowAmountEur(r.price_total, r.currency, r.occurred_at, rates) === null,
  ).length;
}

/**
 * [#379] Formatowanie kwoty w walucie WYBRANEJ DO POKAZANIA.
 *
 * Cały rachunek prowadzimy w euro (przeliczenie po kursie z dnia zdarzenia —
 * to wymóg księgowy). Przełącznik nad ekranem zmienia wyłącznie sposób
 * prezentacji: bierze najświeższy znany kurs i przelicza gotowy wynik.
 *
 * To celowo INNY kurs niż ten użyty do rachunku i tak jest poprawnie — pytanie
 * „ile to jest w złotówkach" dotyczy dzisiaj, a nie dnia każdego tankowania
 * z osobna. Ekran mówi o tym wprost, bo bez tego liczba wyglądałaby jak kwota
 * historyczna.
 */
export function makeMoneyFormatter(
  currency: string,
  rates: readonly FxRate[],
): { fmt: (eur: number | null | undefined) => string; asOf: string | null; code: string } {
  const code = currency.trim().toUpperCase();
  if (code === BASE_CURRENCY) {
    return { fmt: (v) => (v == null ? "—" : `${round2(v)} €`), asOf: null, code };
  }
  // Najświeższe notowanie, jakie mamy — nie „dzisiaj", bo w weekend notowania
  // nie ma, a udawanie że jest dałoby cichy fallback do kursu 1:1.
  const latest = rates
    .filter((r) => r.currency.toUpperCase() === code)
    .reduce<FxRate | null>((best, r) => (!best || r.asOf > best.asOf ? r : best), null);
  if (!latest) {
    // Brak kursu → zostajemy przy euro. Pokazanie liczby z nieprawdziwym
    // symbolem waluty byłoby gorsze niż nieprzełączenie się.
    return { fmt: (v) => (v == null ? "—" : `${round2(v)} €`), asOf: null, code: BASE_CURRENCY };
  }
  return {
    fmt: (v) => (v == null ? "—" : `${round2(v * latest.unitsPerEur)} ${code}`),
    asOf: latest.asOf,
    code,
  };
}

/** Suma kosztów wg miesiąca (ostatnie 6) — do wykresu słupkowego. W euro. */
export function monthlyCost(
  rows: FuelRaw[],
  rates: readonly FxRate[],
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const eur = rowAmountEur(r.price_total, r.currency, r.occurred_at, rates);
    if (eur == null) continue;
    const m = r.occurred_at.slice(0, 7);
    map.set(m, (map.get(m) ?? 0) + eur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, v]) => ({ label: `${m.slice(5)}.${m.slice(2, 4)}`, value: round2(v) }));
}

export function FleetStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 130,
        padding: 14,
        borderRadius: 12,
        background: palette.nearBlack,
        border: `1px solid ${palette.graphite}`,
      }}
    >
      <div style={{ color: palette.smoke, fontSize: 12 }}>{label}</div>
      <div
        style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: accent ?? palette.offWhite }}
      >
        {value}
      </div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 140,
        padding: 14,
        borderRadius: 12,
        background: palette.nearBlack,
        border: `1px solid ${palette.graphite}`,
      }}
    >
      <div style={{ color: palette.smoke, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: palette.red }}>{value}</div>
    </div>
  );
}

export const styles: Record<string, React.CSSProperties> = {
  opsGroup: { marginBottom: 10 },
  opsHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 0",
    borderBottom: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
  opsSub: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "4px 0 4px 16px",
    fontSize: 13,
    color: palette.offWhite,
  },
  opsNote: { color: palette.smoke, fontSize: 12, lineHeight: 1.6, marginTop: 8 },
  currencyBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    margin: "14px 0 4px",
  },
  select: {
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
  },
  rateWarn: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 14,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 1.5,
    background: palette.nearBlack,
  },
  fleet: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 },
  analytics: { display: "flex", gap: 14, flexWrap: "wrap", marginTop: 24 },
  anCol: {
    flex: 1,
    minWidth: 280,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "12px 16px",
  },
  anHead: { fontWeight: 800, fontSize: 14, marginBottom: 8 },
  anRow: { display: "flex", gap: 10, alignItems: "center", padding: "5px 0", fontSize: 14 },
  pnl: {
    marginTop: 24,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "14px 16px",
  },
  pnlTag: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 13,
  },
  profitWrap: {
    marginTop: 24,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "14px 16px",
  },
  profitTotals: { display: "flex", gap: 12, flexWrap: "wrap" },
  profitRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "6px 0",
    fontSize: 14,
    borderBottom: `1px solid ${palette.graphite}`,
  },
  profitCol: { width: 84, textAlign: "right", flexShrink: 0 },
  profitNote: { color: palette.smoke, fontSize: 12, marginTop: 10, lineHeight: 1.5 },
  trendSelect: {
    background: palette.black,
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    maxWidth: 220,
  },
  alertWrap: {
    marginTop: 24,
    padding: "14px 16px",
    borderRadius: 12,
    background: "#2a0d0d",
    border: `1px solid ${palette.red}`,
  },
  alertPill: {
    background: palette.red,
    color: palette.white,
    borderRadius: 999,
    padding: "1px 9px",
    fontSize: 12,
    fontWeight: 700,
  },
  alertRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "6px 0",
    fontSize: 14,
    borderBottom: `1px solid ${palette.graphite}`,
  },
  anomalyBox: {
    background: "#2a0d0d",
    border: `1px solid ${palette.red}`,
    borderRadius: 12,
    padding: "12px 16px",
    color: palette.offWhite,
    fontSize: 14,
  },
  tile: {
    minWidth: 200,
    textAlign: "left",
    padding: 18,
    borderRadius: 14,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    cursor: "pointer",
  },
  back: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
  },
  line: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: 8,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
  dim: { color: palette.smoke, fontSize: 13 },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 999, border: "1px solid" },
};
