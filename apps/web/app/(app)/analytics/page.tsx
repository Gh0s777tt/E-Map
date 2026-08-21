"use client";

/**
 * #335: Analityka floty — insighty właściciela liczone z realnych danych
 * (bez zewnętrznego AI): trend i prognoza kosztu paliwa, pojazdy odstające
 * spalaniem i szacunek możliwych oszczędności. Silnik `buildFleetInsights`.
 */
import { listFuelLogsAll, listFxRates, listVehicles, toFxRates } from "@e-logistic/api";
import {
  buildFleetInsights,
  consumptionFullToFull,
  type FleetInsights,
  type MonthlyPoint,
  rowAmountEur,
  type VehicleConsumption,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { BarChart, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface FuelRow {
  vehicle_id: string | null;
  liters: number | null;
  odometer_km: number | null;
  price_total: number | null;
  /**
   * [#378] Waluta kwoty. Typ jej nie deklarował, choć `select("*")` i tak ją
   * pobierał — kolumna leżała w pamięci przeglądarki nieodczytana, a ekran
   * sumował złotówki razem z euro jak jedną walutę.
   */
  currency: string | null;
  created_at: string;
  /** [#373] Data zdarzenia — po niej grupujemy miesiace. */
  occurred_at: string;
  /** [#372] Potrzebne do metody full-to-full — patrz `consumptionFullToFull`. */
  is_full: boolean | null;
}

/** Ile wierszy wypadło z sumy i dlaczego — dwa różne powody, dwa liczniki. */
interface FxGap {
  /** Kwota jest, ale nie ma notowania waluty na dzień tankowania. */
  missingRate: number;
  /** Kwoty w ogóle nie wpisano — to jedyny przypadek, który user może naprawić wpisem. */
  missingAmount: number;
}

/**
 * [#378] Ekran formatował kwoty jako złotówki, choć tankowania są w mieszanych
 * walutach, a cała reszta repo (/stats, /monthly, rozliczenia) liczy w euro.
 * Etykieta „zł" przy sumie z niemieckich i polskich tankowań kłamała podwójnie:
 * ani to nie były złotówki, ani jedna waluta.
 */
const eur = (n: number) => `${n.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} €`;

/**
 * Awaryjna cena paliwa, gdy nie da się jej policzyć z danych — TERAZ W EURO.
 * Wcześniej stało tu 6.5, czyli cena litra w złotówkach; wstawiona do wzoru
 * liczącego w euro dawała ~28 zł/l, więc „potencjalne oszczędności" i „dodatkowy
 * koszt" pojazdu odstającego wychodziły ponad czterokrotnie zawyżone.
 */
const FALLBACK_FUEL_PRICE_EUR_PER_L = 1.5;

export default function AnalyticsPage() {
  const t = useT();
  const [insights, setInsights] = useState<FleetInsights | null>(null);
  const [series, setSeries] = useState<MonthlyPoint[]>([]);
  /** [#378] Ile tankowań nie weszło do liczb na ekranie — mówimy to wprost. */
  const [fxGap, setFxGap] = useState<FxGap>({ missingRate: 0, missingAmount: 0 });
  /**
   * Zbiór tankowań urwał się na sufit pobrania — wszystkie liczby niżej są policzone
   * z jego części.
   *
   * Osobny znacznik od `fxGap`, bo to inna klasa braku i inne działanie użytkownika:
   * tam wiadomo, ile pozycji wypadło i dlaczego (da się je uzupełnić), tu nie wiadomo
   * nawet ile. Skutek jest tu zresztą groźniejszy niż zaniżona suma: brakujące
   * tankowania z najstarszych miesięcy okna spłaszczają trend, więc prognoza kosztu
   * na kolejny miesiąc wychodzi zaniżona, a „potencjalne oszczędności" — policzone
   * z niepełnego mianownika.
   */
  const [incomplete, setIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIncomplete(false);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error(t("analytics.noCompany"));
      const from = new Date(Date.now() - 190 * 86_400_000).toISOString();
      const [logsPaged, vehicles, fxRows] = await Promise.all([
        // STRONAMI, nie jednym zapytaniem: `limit: 5000` nigdy nie działał, bo sufit
        // `api.max_rows` PostgREST (domyślnie 1000) jest niższy i przycina odpowiedź
        // bez błędu. Zapytanie sortuje malejąco po dacie, więc ucięcie zabierało
        // NAJSTARSZE miesiące okna — czyli dokładnie te, na których stoi trend
        // i regresja liczące prognozę.
        listFuelLogsAll(sb, { from }),
        listVehicles(sb, m.companyId) as Promise<{ id: string; registration: string }[]>,
        // Zapas 10 dni wstecz: kurs bierzemy z dnia tankowania, a EBC nie publikuje
        // w weekendy i święta — bez zapasu tankowanie z 1. dnia okna zostałoby bez
        // notowania. Ten sam wzorzec co w /stats i /monthly.
        listFxRates(sb, {
          from: new Date(Date.parse(from) - 10 * 86_400_000).toISOString().slice(0, 10),
        }),
      ]);
      const rates = toFxRates(fxRows);
      const logs = logsPaged.rows as FuelRow[];
      setIncomplete(!logsPaged.complete);

      /**
       * [#378] Miesięczny koszt paliwa (ostatnie 6 miesięcy z danymi) — w EURO.
       *
       * Wcześniej sumowało się tu surowe `price_total ?? 0` bez spojrzenia na
       * walutę: tankowanie za 900 PLN wchodziło do sumy jak 900 €, czyli ~4,3×
       * za dużo. Z tej sumy bierze się WSZYSTKO na tym ekranie — trend, prognoza
       * na kolejny miesiąc i cena paliwa użyta do wyceny pojazdów odstających —
       * więc jedno polskie tankowanie w miesiącu potrafiło wygenerować „wzrost
       * kosztu o 300%", którego nie dało się z niczym uzgodnić.
       *
       * Wiersz bez przeliczenia jest POMIJANY, nie zerowany: zero znaczy „paliwo
       * za darmo" i zaniża trend tak samo cicho, jak wcześniej zawyżały go
       * złotówki. Przy okazji znika efekt uboczny starego kodu — miesiąc, w którym
       * żadne tankowanie nie miało kwoty, tworzył słupek 0 zł i ciągnął regresję w dół.
       */
      const byMonth = new Map<string, number>();
      let totalLiters = 0;
      let totalCost = 0;
      const gap: FxGap = { missingRate: 0, missingAmount: 0 };
      for (const l of logs) {
        const eurAmount = rowAmountEur(l.price_total, l.currency, l.occurred_at, rates);
        if (eurAmount == null) {
          if (l.price_total == null) gap.missingAmount += 1;
          else gap.missingRate += 1;
          continue;
        }
        const month = l.occurred_at.slice(0, 7);
        byMonth.set(month, (byMonth.get(month) ?? 0) + eurAmount);
        // Litry liczymy z tych samych wierszy co koszt — inaczej litry tankowania,
        // którego kwoty nie znamy, zaniżałyby wyliczoną niżej cenę za litr.
        totalLiters += l.liters ?? 0;
        totalCost += eurAmount;
      }
      setFxGap(gap);
      const monthlyFuelCost: MonthlyPoint[] = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, value]) => ({ month, value: Math.round(value) }));
      setSeries(monthlyFuelCost);

      // Cena paliwa €/l z realnych tankowań (kwota w euro ÷ litry).
      const fuelPricePerL =
        totalLiters > 0 && totalCost > 0 ? totalCost / totalLiters : FALLBACK_FUEL_PRICE_EUR_PER_L;

      // [#372] Spalanie liczone metodą full-to-full — tą samą, której używa /stats.
      // Wcześniej ten ekran miał własny wzór inline (wszystkie litry / rozpiętość
      // licznika), który ZAWYŻA wynik: wliczał pierwsze tankowanie, choć napędziło
      // ono drogę sprzed pierwszego odczytu licznika. Dwie zakładki pokazywały
      // różne liczby z tych samych danych i nie było wiadomo, której wierzyć.
      const regOf = new Map(vehicles.map((v) => [v.id, v.registration]));
      const perVehicle = new Map<
        string,
        { odometerKm: number; liters: number; isFull: boolean }[]
      >();
      for (const l of logs) {
        if (!l.vehicle_id) continue;
        if (typeof l.odometer_km !== "number" || l.odometer_km <= 0) continue;
        const cur = perVehicle.get(l.vehicle_id) ?? [];
        cur.push({
          odometerKm: l.odometer_km,
          liters: l.liters ?? 0,
          // Wpisy sprzed kolumny `is_full` traktujemy jak pełny bak — tak samo
          // jak `consumptionFullToFull` interpretuje brak wartości.
          isFull: l.is_full !== false,
        });
        perVehicle.set(l.vehicle_id, cur);
      }
      const vehicleConsumption: VehicleConsumption[] = [...perVehicle.entries()].map(
        ([id, entries]) => {
          const odos = entries.map((e) => e.odometerKm);
          const km = odos.length >= 2 ? Math.max(...odos) - Math.min(...odos) : 0;
          return {
            registration: regOf.get(id) ?? "—",
            avgConsumption: consumptionFullToFull(entries),
            km,
          };
        },
      );

      setInsights(
        buildFleetInsights({ monthlyFuelCost, vehicles: vehicleConsumption, fuelPricePerL }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("analytics.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const trend = insights?.fuelTrend ?? null;
  const trendIcon = trend
    ? trend.direction === "up"
      ? "📈"
      : trend.direction === "down"
        ? "📉"
        : "➖"
    : "";
  const trendColor = trend
    ? trend.direction === "up"
      ? palette.danger
      : trend.direction === "down"
        ? palette.success
        : palette.smoke
    : palette.smoke;

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader title={t("analytics.title")} subtitle={t("analytics.subtitle")} />

      {/* Sufit pobrania unieważnia KAŻDĄ liczbę niżej, więc komunikat idzie nad
          pozostałe — i nad status listy, bo ekran z obciętym zbiorem potrafi wyglądać
          na pusty i doradzać „dodaj tankowania", których w bazie są tysiące. */}
      {!loading && !error && incomplete && (
        <div style={s.rateWarn}>⚠️ {t("analytics.incomplete")}</div>
      )}

      {/* [#378] „Brak kwoty" i „brak kursu" to dwie różne rzeczy i nie wolno ich
          zlewać w jeden komunikat. Ekran w skrajnym przypadku (same tankowania
          w walucie bez notowania) nie ma czego pokazać i wyświetla „dodaj
          tankowania z kwotami" — rada nie do wykonania dla kogoś, kto kwoty
          wpisał w złotówkach. Dlatego ta ramka stoi NAD statusem listy: najpierw
          prawdziwy powód, potem stan pusty. */}
      {!loading && !error && (fxGap.missingRate > 0 || fxGap.missingAmount > 0) && (
        <div style={s.rateWarn}>
          {fxGap.missingRate > 0 && (
            <div>
              ⚠️ Suma niepełna — {fxGap.missingRate}{" "}
              {fxGap.missingRate === 1 ? "pozycja" : "pozycji"} w walucie bez notowania na dzień
              tankowania. Kwoty są wpisane; brakuje kursu, więc nie weszły do przeliczenia na euro.
            </div>
          )}
          {fxGap.missingAmount > 0 && (
            <div style={{ marginTop: fxGap.missingRate > 0 ? 6 : 0 }}>
              ℹ️ {fxGap.missingAmount} {fxGap.missingAmount === 1 ? "tankowanie" : "tankowań"} bez
              wpisanej kwoty — tutaj wystarczy uzupełnić kwotę przy wpisie.
            </div>
          )}
        </div>
      )}

      <ListStatus
        loading={loading}
        error={error}
        empty={!loading && !error && series.length === 0}
        emptyText={t("analytics.empty")}
        onRetry={load}
      />

      {insights && series.length > 0 && (
        <>
          <div style={s.kpiRow}>
            <div style={s.kpi}>
              <div style={{ ...s.kpiVal, color: trendColor }}>
                {trendIcon} {trend ? `${trend.changePct > 0 ? "+" : ""}${trend.changePct}%` : "—"}
              </div>
              <div style={s.kpiLbl}>{t("analytics.kpiTrend")}</div>
            </div>
            <div style={s.kpi}>
              <div style={s.kpiVal}>{trend ? eur(trend.forecastNext) : "—"}</div>
              <div style={s.kpiLbl}>{t("analytics.kpiForecast")}</div>
            </div>
            <div style={s.kpi}>
              <div
                style={{
                  ...s.kpiVal,
                  color: insights.potentialSavings > 0 ? palette.red : palette.success,
                }}
              >
                {eur(insights.potentialSavings)}
              </div>
              <div style={s.kpiLbl}>{t("analytics.kpiSavings")}</div>
            </div>
          </div>

          <h3 style={s.h3}>{t("analytics.monthlyFuelCost")}</h3>
          <BarChart
            data={series.map((p) => ({ label: p.month.slice(5), value: p.value }))}
            unit=" €"
            color={palette.red}
          />

          <h3 style={s.h3}>{t("analytics.outliersHeading")}</h3>
          {insights.outliers.length === 0 ? (
            <p style={s.dim}>
              ✅ {t("analytics.noOutliers")}
              {insights.outliers.length === 0 && series.length > 0 ? "." : ""}{" "}
              {t("analytics.fleetUniform")}
            </p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {[
                      t("analytics.colVehicle"),
                      t("analytics.colConsumption"),
                      t("analytics.colFleetMedian"),
                      t("analytics.colAbove"),
                      t("analytics.colExtraCost"),
                    ].map((h) => (
                      <th key={h} style={s.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {insights.outliers.map((o) => (
                    <tr key={o.registration}>
                      <td style={{ ...s.td, fontWeight: 700 }}>{o.registration}</td>
                      <td style={s.td}>{o.avgConsumption} l/100</td>
                      <td style={s.td}>{o.fleetMedian} l/100</td>
                      <td style={{ ...s.td, color: palette.danger, fontWeight: 700 }}>
                        +{o.overMedianPct}%
                      </td>
                      <td style={{ ...s.td, color: palette.red, fontWeight: 700 }}>
                        {eur(o.extraCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={s.note}>{t("analytics.note")}</p>
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  /** [#378] Ta sama ramka co ostrzeżenie o brakujących kursach na /stats. */
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
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginTop: 8,
  },
  kpi: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 14,
    padding: "16px 18px",
  },
  kpiVal: { fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  kpiLbl: { color: palette.smoke, fontSize: 12, marginTop: 4 },
  h3: { fontSize: 16, fontWeight: 700, margin: "28px 0 12px" },
  dim: { color: palette.smoke, fontSize: 14 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    textAlign: "left",
    color: palette.smoke,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    padding: "10px 12px",
    borderBottom: `1px solid ${palette.graphite}`,
  },
  td: { padding: "12px", borderBottom: `1px solid ${palette.graphite}` },
  note: { color: palette.smoke, fontSize: 12.5, marginTop: 18, lineHeight: 1.6 },
};
