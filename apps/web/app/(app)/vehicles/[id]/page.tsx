"use client";

import {
  deleteVehicleCost,
  getCompany,
  insertVehicleCost,
  latestOdometers,
  listFuelCardsByVehicle,
  listFuelLogsAll,
  listFxRates,
  listOrdersAll,
  listServiceTasks,
  listVehicleCostsAll,
  listVehicles,
  type Order,
  type ServiceTask,
  toFxRates,
  type VehicleCost,
} from "@e-logistic/api";
import {
  consumptionFullToFull,
  currencyForCountry,
  detectFuelAnomalies,
  type ExpiryLevel,
  expiryStatus,
  FUEL_CARD_PROVIDER_LABELS,
  type FuelCardProvider,
  type FxRate,
  formatCardExpiry,
  fuelByMonth,
  fuelConsumptionSeries,
  maskCardNumber,
  monthsEndingAt,
  round2,
  rowAmountEur,
  serviceStatus,
  sumCostsByCategory,
  summarizeFuel,
  VEHICLE_COST_CATEGORIES,
  VEHICLE_COST_CATEGORY_LABELS,
  type VehicleCostCategory,
  vehicleCostSchema,
  vehiclePnl,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { Badge, BarChart, Button, PageHeader } from "@/components/ui";
import { orderStatusLabel } from "@/lib/labels";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { CURRENCIES } from "../../forms/formShared";

// Intersekcja z naczepą (#250): kolumny dochodzą migracją 0055 — opcjonalne (schema-safe).
type DbVehicle = Awaited<ReturnType<typeof listVehicles>>[number] & {
  trailer_registration?: string | null;
  trailer_type?: string | null;
};
type FuelCard = {
  id: string;
  provider: string;
  card_number_masked: string | null;
  valid_until: string | null;
};
type FuelRaw = {
  odometer_km: number;
  liters: number;
  price_total: number | null;
  /**
   * [#378] Waluta kwoty. Typ jej nie deklarował, choć `listFuelLogs` robi
   * `select("*")` i i tak ją pobierał — kolumna leżała w pamięci nieodczytana,
   * a karta pojazdu sumowała tankowanie za 1200 PLN jak 1200 €.
   */
  currency: string | null;
  is_full: boolean | null;
  created_at: string;
  occurred_at: string;
};

const EXPIRY_COLOR: Record<ExpiryLevel, string> = {
  expired: palette.red,
  soon: "#f59e0b",
  ok: "#22c55e",
};
const VEH_DOCS: { key: "inspection_expiry" | "insurance_expiry" | "leasing_end"; label: string }[] =
  [
    { key: "inspection_expiry", label: "Przegląd" },
    { key: "insurance_expiry", label: "OC" },
    { key: "leasing_end", label: "Leasing" },
  ];

export default function VehicleCardPage() {
  const t = useT();
  const confirm = useConfirm();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [vehicle, setVehicle] = useState<DbVehicle | null>(null);
  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [odo, setOdo] = useState<Record<string, number>>({});
  const [cards, setCards] = useState<FuelCard[]>([]);
  const [fuel, setFuel] = useState<FuelRaw[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  /**
   * Którykolwiek ze zbiorów tej karty urwał się na sufit pobrania.
   *
   * Karta pokazuje P&L CAŁEGO ŻYCIA pojazdu — przychód, paliwo i koszty bez pola
   * „od–do". Obcięcie jednego z tych zbiorów nie da się zauważyć po samych liczbach:
   * wynik netto po prostu wychodzi inny, czasem ujemny dla auta, które zarabia.
   * Dlatego trzymamy osobny znacznik i piszemy o nim nad kafelkami.
   */
  const [incomplete, setIncomplete] = useState(false);
  /** [#378] Kursy EBC — bez nich kwota w walucie innej niż euro nie ma jak wejść do sumy. */
  const [rates, setRates] = useState<FxRate[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  /** [#378] Kraj firmy — służy wyłącznie do podpowiedzi waluty w formularzu kosztu. */
  const [companyCountry, setCompanyCountry] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Formularz kosztu
  const [costCategory, setCostCategory] = useState<VehicleCostCategory>("repair");
  const [costAmount, setCostAmount] = useState("");
  /**
   * [#378] `null` = użytkownik jeszcze nic nie wybrał, więc obowiązuje podpowiedź
   * z kraju firmy. Trzymanie tego jako `null` zamiast dosypywania wartości efektem
   * po wczytaniu firmy ma znaczenie: `load()` biegnie ponownie po każdym zapisie,
   * a efekt „ustaw domyślną" nadpisałby walutę wybraną ręcznie przy kolejnej pozycji.
   */
  const [costCurrency, setCostCurrency] = useState<string | null>(null);
  const [costDate, setCostDate] = useState("");
  const [costDesc, setCostDesc] = useState("");
  const [costMsg, setCostMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    setIncomplete(false);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      setCanManage(m.role === "owner" || m.role === "dispatcher");
      // [#378] Ekran nie ma pola „od–do" — pokazuje całą historię pojazdu, więc okno
      // kursów dobieramy z zapasem: 36 miesięcy wstecz. Wiersze w euro przeliczają się
      // bez notowania (kurs 1:1 z definicji), więc okno dotyczy wyłącznie walut obcych;
      // starsze pozycje w PLN/CZK trafią do licznika „brak kursu" i zobaczy je pasek
      // nad kafelkami, zamiast po cichu wpaść do sumy po złej wartości.
      const now = new Date();
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 35, 1))
        .toISOString()
        .slice(0, 10);
      const [vs, st, od, cd, fPaged, ordPaged, vcPaged, fxRows, comp] = await Promise.all([
        listVehicles(sb, m.companyId),
        listServiceTasks(sb, m.companyId),
        latestOdometers(sb, m.companyId),
        listFuelCardsByVehicle(sb, id),
        // Trzy zbiory, z których liczy się P&L, schodzą STRONAMI i są zawężone do tego
        // pojazdu PO STRONIE BAZY. Wcześniej zlecenia szły jednym zapytaniem o całą
        // firmę (sufit `api.max_rows`, domyślnie 1000, bez błędu i bez śladu), a filtr
        // po pojeździe robiła przeglądarka: przy flocie 20 aut mieściło się w tym kilka
        // tygodni historii, więc przychód był zaniżony o rząd wielkości, podczas gdy
        // koszty liczyły się z innego, pełniejszego zakresu.
        listFuelLogsAll(sb, { vehicleId: id }),
        listOrdersAll(sb, m.companyId, { vehicleId: id }),
        listVehicleCostsAll(sb, m.companyId, { vehicleId: id }),
        // Zapas 10 dni wstecz: kurs bierzemy z dnia zdarzenia, a EBC nie publikuje
        // w weekendy i święta — ten sam wzorzec co w /stats i /monthly.
        listFxRates(sb, {
          from: new Date(Date.parse(from) - 10 * 86_400_000).toISOString().slice(0, 10),
        }),
        // [#378] Kraj firmy — z niego bierze się podpowiedź waluty w formularzu kosztu.
        getCompany(sb, m.companyId),
      ]);
      setRates(toFxRates(fxRows));
      setCompanyCountry(comp?.country ?? null);
      setVehicle((vs as DbVehicle[]).find((v) => v.id === id) ?? null);
      setTasks(st.filter((t) => t.vehicle_id === id));
      setOdo(od);
      setCards(cd as FuelCard[]);
      setFuel(fPaged.rows as FuelRaw[]);
      setOrders(ordPaged.rows);
      setCosts(vcPaged.rows);
      setIncomplete(!fPaged.complete || !ordPaged.complete || !vcPaged.complete);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać danych pojazdu.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const currentKm = odo[id] ?? null;

  const fuelStats = useMemo(() => {
    const entries = fuel.map((r) => ({
      odometerKm: r.odometer_km,
      liters: Number(r.liters),
      /**
       * [#378] Wcześniej: `Number(r.price_total)` bez jednego spojrzenia na walutę.
       * Tankowanie za 1200 PLN wchodziło do kafelka „Wydatek" jako 1200 €, czyli
       * ~4,3× za dużo, i tą samą drogą do P&L pojazdu — auto wyglądało na
       * niedochodowe, choć zarabiało. Teraz kwota jest przeliczana po kursie
       * z dnia tankowania (`occurred_at`, nie `created_at`: wpis zrobiony offline
       * i zsynchronizowany trzy dni później dostałby kurs z innego dnia).
       *
       * `undefined` przy braku kursu jest świadome: `summarizeFuel` po prostu
       * pominie taką pozycję, a zero udawałoby „zatankowano za darmo".
       */
      priceTotal: rowAmountEur(r.price_total, r.currency, r.occurred_at, rates) ?? undefined,
      isFull: r.is_full !== false,
    }));
    const s = summarizeFuel(entries);
    return {
      count: s.count,
      liters: s.totalLiters,
      spend: s.totalSpend,
      cons: consumptionFullToFull(entries),
      anomalies: detectFuelAnomalies(fuelConsumptionSeries(entries)).length,
      /**
       * Tankowania z kwotą, której nie dało się przeliczyć — to NIE to samo co
       * „brak kwoty" i nie wolno zlewać obu w jeden komunikat: kierowcy, który
       * wpisał 1200 PLN, podpowiedź „uzupełnij kwotę" jest nie do wykonania.
       */
      missingRate: fuel.filter(
        (r) =>
          r.price_total != null &&
          rowAmountEur(r.price_total, r.currency, r.occurred_at, rates) === null,
      ).length,
    };
  }, [fuel, rates]);

  // Wydatek na paliwo per miesiąc — ostatnie 6 mies. (wykres na karcie).
  const fuelMonths = useMemo(() => {
    const months = monthsEndingAt(new Date().toISOString().slice(0, 7), 6);
    return fuelByMonth(
      fuel.map((r) => ({
        date: r.occurred_at.slice(0, 10),
        liters: Number(r.liters),
        /**
         * [#378] Było `Number(r.price_total ?? 0)` — surowa kwota bez waluty, więc
         * miesiąc z jednym tankowaniem w złotówkach wyrastał na wykresie ponad
         * cztery razy za wysoko i wyglądał jak realny skok kosztów.
         *
         * Zero tutaj (przy braku kursu) dotyczy WYŁĄCZNIE słupka — ten nie ma jak
         * narysować „nie wiem", a liczba takich pozycji jest wypisana w pasku nad
         * kafelkami, więc niższy słupek nie udaje kompletnego. Do sum pieniężnych
         * (kafelek „Wydatek", P&L) te wiersze nie wchodzą wcale.
         */
        spend: rowAmountEur(r.price_total, r.currency, r.occurred_at, rates) ?? 0,
      })),
      months,
    );
  }, [fuel, rates]);

  const orderStats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "delivered" || o.status === "invoiced");
    /**
     * [#378] Wcześniej filtr `o.currency === "EUR"` po cichu wyrzucał z przychodu
     * zlecenia wystawione w złotówkach — na karcie pojazdu, gdzie ten sam widok
     * doliczał paliwo w PLN jak euro. Wynik był błędny w obie strony naraz:
     * przychód zaniżony, koszt zawyżony, a „Zysk" i „Marża" schodziły na minus
     * bez żadnego śladu, że czegokolwiek brakuje.
     *
     * Kurs z daty załadunku (fallback: utworzenia) — z momentu wykonania zlecenia,
     * nie z dzisiaj.
     */
    const priced = delivered.map((o) => ({
      price: o.price,
      eur: rowAmountEur(o.price, o.currency, o.load_date ?? o.created_at, rates),
    }));
    const revenueEur = round2(priced.reduce((a, p) => a + (p.eur ?? 0), 0));
    return {
      total: orders.length,
      delivered: delivered.length,
      revenueEur,
      /** Zlecenia z ceną, ale bez notowania na ten dzień — przychód jest niepełny. */
      missingRate: priced.filter((p) => p.price != null && p.eur == null).length,
    };
  }, [orders, rates]);

  // Koszty inne niż paliwo — przeliczone na euro po kursie z dnia poniesienia.
  const costSummary = useMemo(() => {
    // [#378] Było `costs.filter((c) => c.currency === "EUR")` — naprawa opłacona
    // w złotówkach znikała i z kafelka „Koszty razem", i z podziału na kategorie,
    // przez co pojazd wychodził tańszy w utrzymaniu, niż był naprawdę.
    const converted = costs
      .map((c) => ({
        ...c,
        amountEur: rowAmountEur(Number(c.amount), c.currency, c.cost_date, rates),
      }))
      .filter((c): c is typeof c & { amountEur: number } => c.amountEur != null);
    const totalEur = round2(converted.reduce((a, c) => a + c.amountEur, 0));
    const byCategory = sumCostsByCategory(
      converted.map((c) => ({
        vehicleId: c.vehicle_id,
        category: c.category,
        amountEur: c.amountEur,
      })),
    );
    // `amount` w tabeli kosztów jest kolumną NOT NULL, więc każdy odpadający wiersz
    // odpada z powodu braku kursu, nie braku kwoty.
    return { totalEur, byCategory, missingRate: costs.length - converted.length };
  }, [costs, rates]);

  // Koszty (bez paliwa) per miesiąc — ostatnie 6 mies. (wykres na karcie).
  const costMonths = useMemo(() => {
    const months = monthsEndingAt(new Date().toISOString().slice(0, 7), 6);
    return fuelByMonth(
      // [#378] Filtr `c.currency === "EUR"` kasował ze słupków całe miesiące kosztów
      // rozliczanych w złotówkach — wykres pokazywał wtedy pustkę zamiast wydatku.
      // Zero przy braku kursu jak wyżej: dotyczy tylko wysokości słupka.
      costs.map((c) => ({
        date: c.cost_date,
        liters: 0,
        spend: rowAmountEur(Number(c.amount), c.currency, c.cost_date, rates) ?? 0,
      })),
      months,
    );
  }, [costs, rates]);

  /** Ile pozycji wypadło z sum z braku notowania — mówimy to wprost, zamiast milczeć. */
  const missingRate = fuelStats.missingRate + orderStats.missingRate + costSummary.missingRate;

  // Mini P&L pojazdu: przychód − paliwo − koszty (EUR).
  const pnl = useMemo(
    () =>
      vehiclePnl({
        revenueEur: orderStats.revenueEur,
        fuelEur: fuelStats.spend,
        costsEur: costSummary.totalEur,
      }),
    [orderStats.revenueEur, fuelStats.spend, costSummary.totalEur],
  );

  /**
   * [#378] Waluta wpisywanego kosztu. Formularz zapisywał na sztywno `"EUR"` przy
   * polu z podpisem „kwota €", więc naprawa opłacona w złotówkach szła do bazy jako
   * euro — i wchodziła do sum 1:1, czyli ~4,3× za wysoko. Gorzej: wiersz był
   * formalnie poprawnym EUR, więc pasek „suma niepełna" go nie łapał i nikt nie
   * dostawał sygnału, że liczba na ekranie jest zmyślona.
   *
   * Podpowiedź z kraju firmy przepuszczamy przez listę `CURRENCIES`: `currencyForCountry`
   * zna też waluty spoza niej (BGN, UAH, TRY…), a wartość `<select>`a bez pasującej
   * opcji pokazałaby w polu „EUR", zapisując co innego — dokładnie ten rozjazd między
   * ekranem a zapisem, który tu likwidujemy.
   */
  const suggestedCurrency = useMemo(() => {
    const hint = currencyForCountry(companyCountry);
    return (CURRENCIES as readonly string[]).includes(hint) ? hint : "EUR";
  }, [companyCountry]);
  const currency = costCurrency ?? suggestedCurrency;

  async function saveCost() {
    setCostMsg(null);
    const parsed = vehicleCostSchema.safeParse({
      vehicleId: id,
      category: costCategory,
      amount: costAmount ? Number(costAmount) : Number.NaN,
      currency,
      costDate: costDate || today,
      description: costDesc.trim() || undefined,
    });
    if (!parsed.success) {
      setCostMsg("Podaj kwotę i datę kosztu.");
      return;
    }
    if (!companyId) {
      setCostMsg("Brak firmy.");
      return;
    }
    try {
      await insertVehicleCost(getBrowserSupabase(), parsed.data, companyId);
      setCostAmount("");
      setCostDesc("");
      setCostMsg("✅ Koszt dodany.");
      await load();
    } catch (e) {
      setCostMsg(e instanceof Error ? e.message : "Błąd zapisu kosztu.");
    }
  }

  async function removeCost(c: VehicleCost) {
    if (!(await confirm("Usunąć ten koszt?"))) return;
    try {
      await deleteVehicleCost(getBrowserSupabase(), c.id);
      await load();
    } catch (e) {
      setCostMsg(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/vehicles" className="app-navlink" style={{ fontSize: 13 }}>
          ← Pojazdy
        </Link>
      </div>

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={!loading && !vehicle}
        emptyText="Nie znaleziono pojazdu."
        onRetry={load}
      />

      {!loading && vehicle && (
        <>
          <PageHeader
            title={vehicle.registration}
            subtitle={`${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}${
              vehicle.year ? ` · ${vehicle.year}` : ""
            } · ${vehicle.vehicle_type ?? "—"}`}
          />

          {/* Sufit pobrania unieważnia każdą liczbę na tej karcie, więc komunikat idzie
              NAD ostrzeżeniem o kursach: tam brakuje konkretnych pozycji i wiadomo
              których, tu nie wiadomo nawet ilu. */}
          {incomplete && (
            <div style={styles.rateWarn}>
              ⚠️ Dane pojazdu są niepełne — historia przekroczyła sufit pobrania. Przychód, koszty i
              wynik P&L poniżej są zaniżone o nieznaną kwotę. Zgłoś to, zanim użyjesz tych liczb do
              rozliczenia.
            </div>
          )}

          {/* [#378] „Brak kwoty" i „brak kursu" to dwie różne rzeczy i nie wolno ich
              zlewać: temu, kto wpisał 1200 PLN, komunikat „uzupełnij kwotę" nic nie
              mówi. Tu piszemy wprost, że kwoty są, brakuje notowania na dany dzień —
              i że przez to suma na tej karcie jest niepełna. */}
          {missingRate > 0 && (
            <div style={styles.rateWarn}>
              ⚠️ Suma niepełna — {missingRate} {missingRate === 1 ? "pozycja" : "pozycji"} w walucie
              bez notowania na dzień zdarzenia. Kwoty są wpisane; brakuje kursu, więc nie weszły do
              przeliczenia.
            </div>
          )}

          {/* Mini P&L pojazdu */}
          <h2 style={styles.h2}>
            💰 Zysk pojazdu (P&L){" "}
            <span style={styles.dim}>
              {/* [#378] Było „…, EUR" — dopisek opisywał nie walutę wyniku, tylko to,
                  że zlecenia w innych walutach wypadały z rachunku. Teraz wszystko jest
                  przeliczane, więc podpis może być uczciwy. */}
              · zlecenia dostarczone/zafakturowane · kwoty przeliczone na EUR po kursie z dnia
              zdarzenia
            </span>
          </h2>
          <div style={styles.statsRow}>
            <Stat label="Przychód" value={`${pnl.revenue} €`} accent="#22c55e" />
            <Stat label="− Paliwo" value={`${pnl.fuel} €`} />
            <Stat label="− Koszty" value={`${pnl.costs} €`} />
            <Stat
              label="Zysk"
              value={`${pnl.net} €`}
              accent={pnl.net >= 0 ? "#22c55e" : palette.red}
            />
            <Stat
              label="Marża"
              value={pnl.marginPct != null ? `${pnl.marginPct}%` : "—"}
              accent={pnl.net >= 0 ? "#22c55e" : palette.red}
            />
          </div>

          {/* Dokumenty / terminy */}
          <h2 style={styles.h2}>Dokumenty i terminy</h2>
          <div style={styles.grid}>
            {VEH_DOCS.map((doc) => {
              const date = vehicle[doc.key] as string | null;
              const st = date ? expiryStatus(date, today) : null;
              return (
                <div key={doc.key} style={styles.docCard}>
                  <div style={styles.dim}>{doc.label}</div>
                  <div style={{ fontWeight: 700 }}>{date ?? "— brak —"}</div>
                  {st && (
                    <Badge color={EXPIRY_COLOR[st.level]}>
                      {st.level === "expired"
                        ? `po terminie (${-st.daysLeft} dni)`
                        : st.level === "soon"
                          ? `za ${st.daysLeft} dni`
                          : "ważny"}
                    </Badge>
                  )}
                </div>
              );
            })}
            <div style={styles.docCard}>
              <div style={styles.dim}>Ubezpieczyciel</div>
              <div style={{ fontWeight: 700 }}>{vehicle.insurer ?? "—"}</div>
              {vehicle.vin && <div style={styles.dim}>VIN {vehicle.vin}</div>}
            </div>
            {/* #250: naczepa (jeśli auto ją posiada) */}
            <div style={styles.docCard}>
              <div style={styles.dim}>🛻 Naczepa</div>
              <div style={{ fontWeight: 700 }}>{vehicle.trailer_registration ?? "— brak —"}</div>
              {vehicle.trailer_type && <div style={styles.dim}>{vehicle.trailer_type}</div>}
            </div>
          </div>

          {/* Serwis */}
          <h2 style={styles.h2}>
            Serwis {currentKm != null && <span style={styles.dim}>· przebieg {currentKm} km</span>}
          </h2>
          {tasks.length === 0 ? (
            <p style={styles.dim}>Brak zaplanowanych zadań serwisowych.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tasks.map((t) => {
                const st = serviceStatus(currentKm, t.last_done_km, t.interval_km);
                return (
                  <div key={t.id} style={styles.lineRow}>
                    <strong style={{ minWidth: 140 }}>{t.name}</strong>
                    {t.interval_km && <span style={styles.dim}>co {t.interval_km} km</span>}
                    <span style={{ flex: 1 }} />
                    {st.kmLeft != null && (
                      <Badge color={EXPIRY_COLOR[st.level]}>
                        {st.kmLeft < 0 ? `przekroczono o ${-st.kmLeft} km` : `za ${st.kmLeft} km`}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Karty paliwowe */}
          <h2 style={styles.h2}>Karty paliwowe</h2>
          {cards.length === 0 ? (
            <p style={styles.dim}>Brak kart przypisanych do pojazdu.</p>
          ) : (
            <div style={styles.body}>
              {cards.map((c) => (
                <span key={c.id} style={styles.tag}>
                  💳 {FUEL_CARD_PROVIDER_LABELS[c.provider as FuelCardProvider] ?? c.provider}{" "}
                  {maskCardNumber(c.card_number_masked)}
                  {c.valid_until ? ` · do ${formatCardExpiry(c.valid_until)}` : ""}
                </span>
              ))}
            </div>
          )}

          {/* Paliwo */}
          <h2 style={styles.h2}>Paliwo</h2>
          <div style={styles.statsRow}>
            <Stat label="Tankowań" value={String(fuelStats.count)} />
            <Stat label="Litry" value={`${fuelStats.liters} L`} />
            <Stat label="Wydatek" value={`${fuelStats.spend} €`} />
            <Stat
              label="Śr. spalanie"
              value={fuelStats.cons != null ? `${fuelStats.cons} L/100km` : "—"}
            />
            <Stat
              label="Anomalie"
              value={String(fuelStats.anomalies)}
              accent={fuelStats.anomalies > 0 ? palette.red : "#22c55e"}
            />
          </div>
          {fuelMonths.some((p) => p.spend > 0) && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...styles.dim, marginBottom: 6 }}>
                Wydatek na paliwo — ostatnie 6 mies.
              </div>
              <BarChart
                data={fuelMonths.map((p) => ({
                  label: `${p.month.slice(5)}.${p.month.slice(2, 4)}`,
                  value: p.spend,
                }))}
                unit=" €"
              />
            </div>
          )}

          {/* Koszty (inne niż paliwo) */}
          <h2 style={styles.h2}>Koszty (naprawy, leasing, ubezpieczenie…)</h2>
          <div style={styles.statsRow}>
            {/* [#378] Było „Koszty razem (EUR)" — czytało się jak jednostka, a znaczyło
                „tylko te w EUR, reszty tu nie ma". */}
            <Stat label="Koszty razem" value={`${costSummary.totalEur} €`} accent={palette.red} />
            {costSummary.byCategory.slice(0, 4).map((c) => (
              <Stat key={c.category} label={c.label} value={`${c.amountEur} €`} />
            ))}
          </div>
          {costMonths.some((p) => p.spend > 0) && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...styles.dim, marginBottom: 6 }}>
                Koszty (bez paliwa) — ostatnie 6 mies. · EUR
              </div>
              <BarChart
                data={costMonths.map((p) => ({
                  label: `${p.month.slice(5)}.${p.month.slice(2, 4)}`,
                  value: p.spend,
                }))}
                unit=" €"
              />
            </div>
          )}

          {canManage && (
            <div style={styles.costForm}>
              <select
                style={styles.costInput}
                value={costCategory}
                onChange={(e) => setCostCategory(e.target.value as VehicleCostCategory)}
              >
                {VEHICLE_COST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {VEHICLE_COST_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              {/* [#378] Podpis „kwota €" przy zapisie na sztywno w EUR był obietnicą,
                  której kod dotrzymywał w najgorszy możliwy sposób: kwota z paragonu
                  w złotówkach lądowała w bazie jako euro. Teraz jednostkę wybiera się
                  obok pola, więc placeholder nie musi jej udawać. */}
              <input
                style={{ ...styles.costInput, maxWidth: 120 }}
                type="number"
                inputMode="decimal"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="kwota"
              />
              <select
                style={{ ...styles.costInput, maxWidth: 100 }}
                value={currency}
                onChange={(e) => setCostCurrency(e.target.value)}
                aria-label="Waluta kosztu"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                style={{ ...styles.costInput, maxWidth: 160 }}
                type="date"
                value={costDate}
                onChange={(e) => setCostDate(e.target.value)}
              />
              <input
                style={styles.costInput}
                value={costDesc}
                onChange={(e) => setCostDesc(e.target.value)}
                placeholder="opis (opcjonalnie)"
              />
              <Button onClick={saveCost}>Dodaj</Button>
            </div>
          )}
          {costMsg && <p style={styles.dim}>{costMsg}</p>}

          {costs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {costs.slice(0, 30).map((c) => (
                <div key={c.id} style={styles.lineRow}>
                  <strong style={{ minWidth: 130 }}>
                    {VEHICLE_COST_CATEGORY_LABELS[c.category as VehicleCostCategory] ?? c.category}
                  </strong>
                  <span style={{ minWidth: 90, fontWeight: 700 }}>
                    {round2(Number(c.amount))} {c.currency}
                  </span>
                  <span style={styles.dim}>{c.cost_date}</span>
                  {c.description && <span style={styles.dim}>· {c.description}</span>}
                  <span style={{ flex: 1 }} />
                  {canManage && (
                    <Button variant="danger" onClick={() => removeCost(c)}>
                      🗑️
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Zlecenia */}
          <h2 style={styles.h2}>Zlecenia</h2>
          <div style={styles.statsRow}>
            <Stat label="Zleceń" value={String(orderStats.total)} />
            <Stat label="Dostarczone" value={String(orderStats.delivered)} />
            {/* [#378] Było „Przychód (EUR)" — nawias sugerował jednostkę, a w praktyce
                oznaczał, że zlecenia w PLN nie są tu w ogóle liczone. */}
            <Stat label="Przychód" value={`${orderStats.revenueEur} €`} accent="#22c55e" />
          </div>
          {orders.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {orders.slice(0, 12).map((o) => (
                <div key={o.id} style={styles.lineRow}>
                  <strong style={{ minWidth: 110 }}>{o.reference_no || "(bez nr)"}</strong>
                  <Badge color={palette.smoke}>{orderStatusLabel(t, o.status)}</Badge>
                  <span style={styles.dim}>
                    {o.origin || "?"} → {o.destination || "?"}
                  </span>
                  <span style={{ flex: 1 }} />
                  {o.load_date && <span style={styles.dim}>{o.load_date}</span>}
                </div>
              ))}
              {orders.length > 12 && <span style={styles.dim}>…i {orders.length - 12} więcej</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ?? palette.offWhite }}>
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: 15, fontWeight: 700, marginTop: 24, marginBottom: 8 },
  /** [#378] Pasek „suma niepełna" — ten sam wygląd co na /stats. */
  rateWarn: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 10,
    padding: "10px 14px",
    marginTop: 14,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 1.5,
    background: palette.nearBlack,
  },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  docCard: {
    flex: 1,
    minWidth: 150,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  body: { display: "flex", gap: 8, flexWrap: "wrap", fontSize: 14, alignItems: "center" },
  dim: { color: palette.smoke, fontSize: 13 },
  tag: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 13,
  },
  statsRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  costForm: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 },
  costInput: {
    flex: 1,
    minWidth: 120,
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: palette.offWhite,
  },
  statCard: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "10px 16px",
    minWidth: 110,
  },
  lineRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 8,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
};
