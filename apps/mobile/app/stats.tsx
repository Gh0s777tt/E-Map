/**
 * Statystyki — restyle LogiFlow (#286): KPI z czerwonymi wartościami,
 * wykres słupkowy litrów z 14 dni i lista tankowań z 30 dni.
 */
import { listFuelLogs, listFxRates, toFxRates } from "@e-logistic/api";
import { consumptionFullToFull, type FxRate, round2, rowAmountEur } from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, SectionTitle, wide } from "../components/ui";
import { useT } from "../lib/i18n";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { useFleet } from "../lib/useFleet";

interface FuelRow {
  id: string;
  vehicle_id: string | null;
  liters: number | null;
  price_total: number | null;
  /**
   * [#378] Waluta kwoty. `select("*")` pobierał ją od zawsze, ale typ jej nie
   * deklarował, więc dane leżały w pamięci nieodczytane, a ekran sumował
   * złotówki razem z euro jak jedną liczbę: 1200 zł wchodziło do „Kosztu"
   * jako 1200 € — zawyżenie ponad czterokrotne.
   */
  currency: string | null;
  station_country: string | null;
  station_city: string | null;
  /**
   * [#380] Przebieg i „do pełna" — bez tych dwóch pól spalania nie da się policzyć.
   * Kolumny istniały od zawsze, ale typ ich nie deklarował, więc kierowca miał
   * na ekranie litry i koszt, a jedyną liczbę, którą realnie kontroluje w trasie,
   * musiał liczyć w głowie.
   */
  odometer_km: number | null;
  is_full: boolean | null;
  /**
   * [#378] Data ZDARZENIA — po niej bierzemy kurs, po niej grupujemy słupki i ją
   * pokazujemy przy pozycji. `created_at` to moment synchronizacji: tankowanie
   * zrobione offline w niedzielę, a wysłane w środę, przeliczyłoby się kursem ze
   * środy, czyli innym niż na paragonie.
   *
   * `created_at` celowo NIE ma tu deklaracji: dopóki było w typie, kolejne
   * miejsca sięgały po nie odruchowo i ekran przeczył sam sobie — pokazywał dzień
   * wysyłki, a liczył po dniu tankowania. Kolumna nadal przychodzi z `select("*")`,
   * ale żeby jej użyć, trzeba ją tu świadomie dopisać.
   */
  occurred_at: string;
}

const DAYS = 14;
/** Ile wpisów najwyżej pobieramy — patrz komentarz przy `listFuelLogs`. */
const LIMIT = 2000;

/**
 * [#378] Kod waluty do pokazania. Brak wartości traktujemy jak euro — tak samo
 * jak `rowAmountEur`, żeby etykieta nie kłamała o tym, co weszło do sumy.
 */
const cur = (c: string | null) => (c ?? "EUR").trim().toUpperCase();

export default function StatsScreen() {
  const { vehicles } = useFleet();
  const t = useT();
  const [logs, setLogs] = useState<FuelRow[]>([]);
  const [adblue, setAdblue] = useState<FuelRow[]>([]);
  /** [#378] Kursy EBC — bez nich tankowanie w innej walucie niż euro nie ma jak wejść do sumy. */
  const [rates, setRates] = useState<FxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const sb = getSupabase();
      const from = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const [rows, adblueRows, fxRows] = await Promise.all([
        // [#380] Limit podniesiony ze 100: przy dwóch tankowaniach dziennie
        // trzydziestodniowe okno mieściło się w nim ledwo, a obcięcie było ciche.
        listFuelLogs(sb, { from, limit: LIMIT }),
        listFuelLogs(sb, { table: "adblue_logs", from, limit: LIMIT }),
        // [#378] Zapas 10 dni wstecz: kurs bierzemy z dnia tankowania, a EBC nie
        // publikuje w weekendy i święta. Bez zapasu tankowanie z soboty na starszym
        // końcu okna zostawałoby bez notowania i wypadało z sumy.
        listFxRates(sb, {
          from: new Date(Date.parse(from) - 10 * 86_400_000).toISOString().slice(0, 10),
        }),
      ]);
      setLogs(rows as FuelRow[]);
      setAdblue(adblueRows as FuelRow[]);
      setRates(toFxRates(fxRows));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("m.stats.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const liters = logs.reduce((a, l) => a + (l.liters ?? 0), 0);

  /**
   * [#378] Koszt liczony wiersz po wierszu, każdy po kursie z dnia SWOJEGO tankowania.
   *
   * Wcześniej `a + (l.price_total ?? 0)` sumowało kwoty z różnych krajów jak jedną
   * walutę, a kafelek pokazywał gołe `Math.round(cost)` bez jednostki — kierowca po
   * trasie Polska→Niemcy widział liczbę, która nie zgadzała się z żadnym paragonem
   * i nie miał jak zgadnąć, w czym jest wyrażona.
   *
   * Pozycji bez kursu NIE wliczamy: zero znaczyłoby „zatankował za darmo",
   * a kurs 1:1 zawyżyłby złotówki ponad czterokrotnie. Liczymy je osobno i mówimy
   * o nich wprost pod kafelkami.
   */
  const priced = logs.map((l) => ({
    log: l,
    eur: rowAmountEur(l.price_total, l.currency, l.occurred_at, rates),
  }));
  const cost = priced.reduce((a, p) => a + (p.eur ?? 0), 0);
  /**
   * Kwota jest wpisana, brakuje notowania — to co innego niż „nie wpisał kwoty".
   * Kierowcy, który wbił 1200 zł, komunikat „uzupełnij kwotę" byłby nie do wykonania.
   */
  const missingRate = priced.filter((p) => p.eur == null && p.log.price_total != null).length;
  const regOf = (id: string | null) =>
    id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—";

  /**
   * [#380] Spalanie L/100 km — jedyna liczba na tym ekranie, którą kierowca
   * realnie kontroluje w trasie, a której dotąd nie było.
   *
   * Liczone PER POJAZD i dopiero potem uśredniane po przejechanych kilometrach,
   * a nie jako średnia ze średnich: przy jednym aucie z 2 000 km i drugim
   * z 20 000 km średnia arytmetyczna po autach dałaby liczbę, której nie
   * przejechał żaden z nich. Metoda „od pełna do pełna" — tankowanie częściowe
   * nie zamyka odcinka, więc nie da się z niego policzyć zużycia.
   */
  const byVehicle = (() => {
    const ids = [...new Set(logs.map((l) => l.vehicle_id).filter((v): v is string => !!v))];
    return ids
      .map((id) => {
        const mine = logs.filter((l) => l.vehicle_id === id);
        const entries = mine.map((l) => ({
          odometerKm: l.odometer_km ?? 0,
          liters: Number(l.liters ?? 0),
          isFull: l.is_full !== false,
        }));
        const km = entries.length
          ? Math.max(...entries.map((e) => e.odometerKm)) -
            Math.min(...entries.map((e) => e.odometerKm))
          : 0;
        return {
          id,
          reg: regOf(id),
          liters: round2(mine.reduce((a, l) => a + Number(l.liters ?? 0), 0)),
          adblueLiters: round2(
            adblue
              .filter((l) => l.vehicle_id === id)
              .reduce((a, l) => a + Number(l.liters ?? 0), 0),
          ),
          cons: consumptionFullToFull(entries),
          km,
        };
      })
      .sort((a, b) => b.liters - a.liters);
  })();

  /** Średnia floty ważona kilometrami — patrz komentarz wyżej. */
  const fleetCons = (() => {
    const usable = byVehicle.filter((v) => v.cons != null && v.km > 0);
    if (usable.length === 0) return null;
    const km = usable.reduce((a, v) => a + v.km, 0);
    if (km === 0) return null;
    return round2(usable.reduce((a, v) => a + (v.cons as number) * v.km, 0) / km);
  })();

  const adblueLiters = round2(adblue.reduce((a, l) => a + Number(l.liters ?? 0), 0));
  /** Czy zapytanie mogło uciąć dane — mówimy o tym, zamiast milczeć. */
  const truncated = logs.length >= LIMIT || adblue.length >= LIMIT;

  // Słupki: suma litrów per dzień, ostatnie DAYS dni (najstarszy z lewej).
  const days: { key: string; label: string; liters: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    // [#378] Podpis liczony z `key`, nie z `getDate()`. Kubełek jest dniem UTC —
    // tak samo jak `occurred_at.slice(0, 10)` i dzień kursu w `rowAmountEur` —
    // a `getDate()` zwraca dzień lokalny. Po północy czasu lokalnego słupek
    // dostawał podpis o dzień wyprzedzający to, co faktycznie w nim siedziało.
    days.push({ key, label: String(Number(key.slice(8, 10))), liters: 0 });
  }
  for (const l of logs) {
    // [#378] Grupujemy po dniu ZDARZENIA. Z `created_at` tankowanie zrobione
    // offline w niedzielę, a zsynchronizowane w środę, dokładało litry do środy:
    // wykres rysował kierowcy tydzień, którego nie przejechał.
    const day = days.find((d) => d.key === l.occurred_at.slice(0, 10));
    if (day) day.liters += l.liters ?? 0;
  }
  const maxLiters = Math.max(1, ...days.map((d) => d.liters));

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, wide]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.red} />
      }
    >
      <SectionTitle>{t("m.stats.last30")}</SectionTitle>
      <View style={s.row}>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>{t("m.stats.refuels")}</Text>
          <Text style={s.kpiValue}>{logs.length}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>{t("m.stats.liters")}</Text>
          <Text style={s.kpiValueRed}>{Math.round(liters)}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>{t("m.stats.cost")}</Text>
          {/* [#378] Jednostka przy liczbie, nie w domyśle: bez „€" ta sama wartość
              czytała się raz jako złotówki, raz jako euro — zależnie od tego, gdzie
              kierowca ostatnio tankował. */}
          <Text style={s.kpiValueRed}>{Math.round(cost)} €</Text>
        </Card>
      </View>

      {/* [#380] Spalanie i AdBlue — drugi rząd kafelków. Spalanie stoi obok litrów,
          bo to ta sama wielkość widziana z dwóch stron, a kierowca porównuje je odruchowo. */}
      <View style={s.row}>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>{t("m.stats.consumption")}</Text>
          <Text style={s.kpiValueRed}>{fleetCons != null ? `${fleetCons}` : "—"}</Text>
          <Text style={s.kpiUnit}>L/100 km</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>{t("m.stats.adblue")}</Text>
          <Text style={s.kpiValue}>{Math.round(adblueLiters)}</Text>
          <Text style={s.kpiUnit}>L</Text>
        </Card>
      </View>
      {logs.length > 0 && (
        <Text style={s.hint}>
          {fleetCons != null ? t("m.stats.consumptionNote") : t("m.stats.consumptionNone")}
        </Text>
      )}

      {/* [#380] Rozbicie na pojazdy — kierowca jeżdżący dwoma autami nie miał jak
          zobaczyć, które z nich pali więcej. */}
      {byVehicle.length > 1 && (
        <>
          <SectionTitle>{t("m.stats.perVehicle")}</SectionTitle>
          <Card style={{ gap: 8 }}>
            {byVehicle.map((v) => (
              <View key={v.id} style={s.vehRow}>
                <Text style={s.vehReg}>{v.reg}</Text>
                <Text style={s.vehCell}>{Math.round(v.liters)} L</Text>
                {v.adblueLiters > 0 && (
                  <Text style={s.vehCellDim}>+{Math.round(v.adblueLiters)} L AdBlue</Text>
                )}
                <Text style={s.vehCons}>{v.cons != null ? `${v.cons} L/100` : "—"}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {logs.length > 0 && <Text style={s.hint}>{t("m.stats.costEurNote")}</Text>}
      {truncated && <Text style={s.rateWarn}>⚠️ {t("m.stats.truncated", { n: LIMIT })}</Text>}
      {/* [#378] „Brak kwoty" i „brak kursu" to dwie różne sprawy i nie wolno ich
          zlewać — tu mówimy wprost, że suma jest niepełna z braku notowania. */}
      {missingRate > 0 && (
        <Text style={s.rateWarn}>⚠️ {t("m.stats.rateMissing", { n: missingRate })}</Text>
      )}

      <SectionTitle>{t("m.stats.litersDaily")}</SectionTitle>
      <Card style={s.chartCard}>
        <View style={s.chart}>
          {days.map((d) => (
            <View key={d.key} style={s.barCol}>
              <View
                style={[
                  s.bar,
                  {
                    height: Math.max(3, Math.round((d.liters / maxLiters) * 120)),
                    backgroundColor: d.liters > 0 ? palette.red : palette.graphite,
                  },
                ]}
              />
              <Text style={s.barLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {err && <Text style={s.err}>{err}</Text>}
      {!loading && !err && logs.length === 0 && <Text style={s.note}>{t("m.stats.empty")}</Text>}

      <SectionTitle>{t("m.stats.refuels")}</SectionTitle>
      {priced.slice(0, 30).map(({ log: l, eur }) => (
        <Card key={l.id} style={s.entry}>
          <View style={s.entryHead}>
            <Text style={s.entryTitle}>
              ⛽ {l.liters ?? "—"} L · {regOf(l.vehicle_id)}
            </Text>
            {/* [#378] Kwota z paragonu razem z walutą, którą kierowca faktycznie
                zapłacił. Samo „320" przy tankowaniu w Czechach nie mówiło nic —
                a właśnie ta pozycja ma się zgadzać z papierkiem w ręce. */}
            <Text style={s.entryPrice}>
              {l.price_total != null ? `${l.price_total} ${cur(l.currency)}` : "—"}
            </Text>
          </View>
          <Text style={s.entryMeta}>
            {[
              [l.station_city, l.station_country].filter(Boolean).join(", "),
              // [#378] Data ZDARZENIA — dokładnie ta, z której wzięliśmy kurs
              // (`rowAmountEur` wyżej). Z `created_at` ekran przeczył sam sobie:
              // pokazywał dzień wysyłki, a przeliczał po dniu tankowania, więc
              // notka „kurs z dnia tankowania" obiecywała coś, czego z widocznej
              // daty nie dało się sprawdzić w tabeli kursów — a to właśnie ta
              // pozycja ma być dla kierowcy dowodem.
              l.occurred_at.slice(0, 10),
              // Równowartość w euro pokazujemy tylko tam, gdzie coś wnosi (waluta
              // obca) — inaczej powtarzałaby liczbę stojącą obok.
              eur != null && cur(l.currency) !== "EUR" ? `≈ ${eur} €` : "",
              // Wiersz, który nie wszedł do kafelka „Koszt" — widać to przy nim,
              // a nie tylko w zbiorczym liczniku na górze.
              l.price_total != null && eur == null ? t("m.stats.noRate") : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.black },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  row: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, gap: 4 },
  kpiUnit: { color: palette.smoke, fontSize: 11, marginTop: 2 },
  vehRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  vehReg: { color: palette.offWhite, fontSize: 15, fontWeight: "700", minWidth: 90 },
  vehCell: { color: palette.offWhite, fontSize: 14 },
  vehCellDim: { color: palette.smoke, fontSize: 12 },
  vehCons: { color: palette.red, fontSize: 14, fontWeight: "700", marginLeft: "auto" },
  kpiLabel: { color: palette.smoke, fontSize: 12 },
  kpiValue: { color: palette.offWhite, fontSize: 24, fontWeight: "800" },
  kpiValueRed: { color: palette.red, fontSize: 24, fontWeight: "800" },
  chartCard: { paddingVertical: 18 },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 148,
    gap: 3,
  },
  barCol: { flex: 1, alignItems: "center", gap: 5 },
  bar: { width: "70%", borderRadius: 4 },
  barLabel: { color: palette.smoke, fontSize: 9 },
  hint: { color: palette.smoke, fontSize: 12, lineHeight: 17 },
  rateWarn: {
    borderWidth: 1,
    borderColor: palette.warning,
    borderRadius: 10,
    backgroundColor: palette.nearBlack,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 18,
  },
  err: { color: palette.red, fontSize: 13 },
  note: { color: palette.smoke, fontSize: 14, textAlign: "center", marginTop: 8 },
  entry: { gap: 4 },
  entryHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  entryTitle: { color: palette.offWhite, fontWeight: "700", fontSize: 15 },
  entryPrice: { color: palette.offWhite, fontSize: 14, fontWeight: "600" },
  entryMeta: { color: palette.smoke, fontSize: 13 },
});
