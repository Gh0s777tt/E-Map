"use client";

import {
  listFuelCardsSafe,
  listFuelLogs,
  listFxRates,
  listOrders,
  listPauseEvents,
  listPenalties,
  listRouteExtraCosts,
  listTripEvents,
  listVatRates,
  listVehicleCosts,
  listVehicles,
  toFxRates,
  toVatRates,
  type VehicleCost,
} from "@e-logistic/api";
import {
  buildJourneys,
  clientProfitability,
  co2ByClient,
  co2ByVehicle,
  co2PerHundredKm,
  consumptionFullToFull,
  detectFuelAnomalies,
  dieselCo2Kg,
  type FxRate,
  fleetAlerts,
  fleetPnl,
  fleetPnlByVehicle,
  formatCo2,
  fuelConsumptionSeries,
  type JourneyFuelEntry,
  type JourneyTripEvent,
  type OperatingCostEntry,
  type OperatingCostKind,
  orderAnalytics,
  round2,
  rowAmountEur,
  sumCostsByCategory,
  summarizeFuel,
  summarizeJourneys,
  summarizeOperatingCosts,
  type VatRate,
} from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { useT } from "@/components/LocaleProvider";
import { Badge, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { AlertsBanner } from "./AlertsBanner";
import { EmissionsSection } from "./EmissionsSection";
import { ProfitabilitySection } from "./ProfitabilitySection";
import {
  countMissingRate,
  entry,
  FleetStat,
  type FuelRaw,
  makeMoneyFormatter,
  styles,
  type TripRaw,
} from "./shared";
import { type CardOpt, TopUsageSection } from "./TopUsageSection";
import { VatRefundSection } from "./VatRefundSection";
import { VehicleDetail } from "./VehicleDetail";

/** Waluty do wyboru w prezentacji — te, w których ta flota realnie rozlicza trasy. */
/**
 * [#392] Górna granica wierszy na zapytanie. Zabezpiecza przeglądarkę przed
 * wciągnięciem całej historii firmy, ale sama w sobie jest półśrodkiem:
 * po jej przekroczeniu liczby są niepełne, więc ekran MUSI o tym powiedzieć.
 */
const ROW_LIMIT = 5000;

const DISPLAY_CURRENCIES = ["EUR", "PLN", "CZK", "GBP", "SEK", "NOK", "DKK", "HUF", "RON", "CHF"];

/**
 * Rodzaj kosztu operacyjnego → klucz etykiety.
 *
 * [#382] Mapa trzyma klucze, nie gotowe napisy: stała modułowa powstaje raz,
 * przy imporcie pliku, więc przetłumaczony tekst zamrożony w niej zostałby
 * w języku, który akurat był aktywny — przełącznik języka by go nie ruszył.
 * `OperatingCostKind` jest zamkniętą czwórką, więc `Record` jest kompletny
 * i żaden rodzaj nie wypadnie z etykietą `undefined`.
 */
const OPS_LABEL: Record<OperatingCostKind, MessageKey> = {
  pause: "stats.ops.pause",
  route: "stats.ops.route",
  penalty: "stats.ops.penalty",
  trip: "stats.ops.trip",
};

export default function StatsPage() {
  const t = useT();
  const [vehicles, setVehicles] = useState<{ id: string; registration: string }[]>([]);
  const [fuel, setFuel] = useState<FuelRaw[]>([]);
  const [cards, setCards] = useState<CardOpt[]>([]);
  const [adblue, setAdblue] = useState<FuelRaw[]>([]);
  const [trips, setTrips] = useState<TripRaw[]>([]);
  const [orders, setOrders] = useState<
    {
      status: string;
      price: number | null;
      currency: string;
      shipper: string | null;
      origin: string | null;
      destination: string | null;
      vehicle_id: string | null;
      load_date: string | null;
      created_at: string;
    }[]
  >([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  /** [#378] Kursy EBC — bez nich kwota w innej walucie niż euro nie ma jak wejść do sumy. */
  const [rates, setRates] = useState<FxRate[]>([]);
  /** [#392] Czy któryś zbiór dobił do limitu — czyli czy liczby są NIEPEŁNE. */
  const [truncated, setTruncated] = useState(false);
  /** [#379] Stawki VAT per kraj — tabela wspólna dla wszystkich firm. */
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  /**
   * [#379] Waluta PREZENTACJI. Nie zmienia rachunku — ten jest i zostaje w euro,
   * po kursie z dnia zdarzenia. Zmienia tylko to, w czym pokazujemy gotowy wynik.
   */
  const [displayCurrency, setDisplayCurrency] = useState("EUR");
  /**
   * [#380] Koszty operacyjne: parkingi, opłaty drogowe, kary i kwoty przy
   * zdarzeniach Trip. Formularze zbierają je od [#375], ale żaden ekran
   * statystyk ich nie czytał — zysk floty wychodził przez to zawyżony.
   */
  const [opsRaw, setOpsRaw] = useState<OperatingCostEntry[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m) return;
        setCanManage(m.role === "owner" || m.role === "dispatcher");
        /*
         * Okno analizy: ostatnie 24 miesiące (pokrywa trend 6 mies., alerty m/m
         * i wykresy) zamiast pobierania całej historii — z limitem bezpieczeństwa.
         *
         * [#392] Limit jest potrzebny, ale jego CICHE zadziałanie już nie.
         * Przewoźnik z 45 ciągnikami generuje w dwa lata więcej niż 5000 zdarzeń
         * trasy; nadwyżka po prostu nie dojeżdżała, a ekran pokazywał zaniżone
         * spalanie, koszty i przychód jako liczby pewne. Najgorsze, że wygląda
         * to jak spadek: właściciel widzi „mniej tankowań niż rok temu" i szuka
         * przyczyny w firmie, a nie w limicie zapytania.
         *
         * Nie podnosimy limitu — po jego przekroczeniu i tak trzeba by liczyć
         * po stronie bazy. Wykrywamy OBCIĘCIE i mówimy o nim wprost, tak samo
         * jak robi to ekran /wyjazdy.
         */
        const now = new Date();
        const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23, 1))
          .toISOString()
          .slice(0, 10);
        listFuelCardsSafe(sb, m.companyId)
          .then((cs) => setCards(cs as unknown as CardOpt[]))
          .catch(() => {});
        const [f, a, tr, vs, ord, vc, fxRows, vatRows, pauses, routeCosts, penalties] =
          await Promise.all([
            listFuelLogs(sb, { from, limit: ROW_LIMIT }),
            listFuelLogs(sb, { table: "adblue_logs", from, limit: ROW_LIMIT }),
            listTripEvents(sb, { from, limit: ROW_LIMIT }),
            listVehicles(sb, m.companyId),
            listOrders(sb, m.companyId, { from, limit: ROW_LIMIT }),
            listVehicleCosts(sb, m.companyId, { from, limit: ROW_LIMIT }),
            // Zapas 10 dni wstecz: kurs bierzemy z dnia zdarzenia, a EBC nie
            // publikuje w weekendy i święta — ten sam wzorzec co w /monthly.
            listFxRates(sb, {
              from: new Date(Date.parse(from) - 10 * 86_400_000).toISOString().slice(0, 10),
            }),
            // Zbiór jest mały (kilkadziesiąt wierszy) i wspólny dla firm, więc bez filtrów.
            listVatRates(sb),
            // [#380] Koszty operacyjne. Limity jawne — ekran obejmuje 24 miesiące,
            // a domyślne 500 z warstwy danych ucięłoby dane bez słowa.
            listPauseEvents(sb, { from, limit: ROW_LIMIT }),
            listRouteExtraCosts(sb, { from, limit: ROW_LIMIT }),
            listPenalties(sb, { from, limit: ROW_LIMIT }),
          ]);
        /*
         * [#392] Zbiór dobity do limitu = najpewniej ucięty. Rozróżnienie
         * „dokładnie 5000 wierszy" od „ucięte na 5000" jest niemożliwe bez
         * dodatkowego zapytania, więc świadomie zgłaszamy oba przypadki:
         * fałszywe ostrzeżenie raz na jakiś czas jest tanie, a cicha strata
         * danych w liczbach, na których stoją decyzje o flocie — nie.
         */
        setTruncated(
          [f, a, tr, ord, vc, pauses, routeCosts, penalties].some(
            (rows) => (rows as unknown[]).length >= ROW_LIMIT,
          ),
        );
        setRates(toFxRates(fxRows));
        setVatRates(toVatRates(vatRows));
        // Trzy tabele + kwoty przy zdarzeniach Trip sprowadzone do jednego kształtu,
        // żeby silnik nie musiał znać ich osobnych schematów.
        setOpsRaw([
          ...(
            pauses as {
              occurred_at: string;
              price_total: number | null;
              currency: string;
              vehicle_id: string | null;
            }[]
          ).map(
            (r): OperatingCostEntry => ({
              kind: "pause",
              subKind: "parking",
              amount: r.price_total,
              currency: r.currency,
              occurredAt: r.occurred_at,
              vehicleId: r.vehicle_id,
            }),
          ),
          ...(
            routeCosts as {
              occurred_at: string;
              kind: string;
              amount: number;
              currency: string;
              vehicle_id: string | null;
            }[]
          ).map(
            (r): OperatingCostEntry => ({
              kind: "route",
              subKind: r.kind,
              amount: r.amount,
              currency: r.currency,
              occurredAt: r.occurred_at,
              vehicleId: r.vehicle_id,
            }),
          ),
          ...(
            penalties as {
              occurred_at: string;
              amount: number;
              currency: string;
              status: string;
              vehicle_id: string | null;
            }[]
          ).map(
            (r): OperatingCostEntry => ({
              kind: "penalty",
              subKind: "mandat",
              amount: r.amount,
              currency: r.currency,
              occurredAt: r.occurred_at,
              vehicleId: r.vehicle_id,
              status: r.status,
            }),
          ),
          // Kwoty przy zdarzeniach Trip (serwis, inne) — `trip_events.currency`
          // istnieje od migracji 0100; wcześniej to była liczba bez jednostki.
          ...(tr as TripRaw[])
            .filter((r) => r.amount != null)
            .map(
              (r): OperatingCostEntry => ({
                kind: "trip",
                subKind: r.action,
                amount: r.amount,
                currency: r.currency,
                occurredAt: r.occurred_at,
                vehicleId: r.vehicle_id,
              }),
            ),
        ]);
        setFuel(f as FuelRaw[]);
        setAdblue(a as FuelRaw[]);
        setTrips(tr as TripRaw[]);
        setCosts(vc);
        setOrders(
          ord.map((o) => ({
            status: o.status,
            price: o.price,
            currency: o.currency,
            shipper: o.shipper,
            origin: o.origin,
            destination: o.destination,
            vehicle_id: o.vehicle_id,
            load_date: o.load_date,
            created_at: o.created_at,
          })),
        );
        setVehicles(
          (vs as { id: string; registration: string }[]).map((v) => ({
            id: v.id,
            registration: v.registration,
          })),
        );
      } finally {
        setReady(true);
      }
    })();
  }, []);

  function byV<T extends { vehicle_id: string }>(rows: T[], id: string): T[] {
    return rows.filter((r) => r.vehicle_id === id);
  }

  // Agregaty per pojazd liczone raz na zmianę danych (nie co render — przy wyborze
  // pojazdu nie przeliczamy spalania wszystkich kafelków).
  const tiles = useMemo(
    () =>
      vehicles.map((v) => {
        const fEntries = fuel.filter((r) => r.vehicle_id === v.id).map((r) => entry(r, rates));
        const s = summarizeFuel(fEntries);
        // [#379] AdBlue liczony osobno, ale NIE pomijany. Dotąd ekran pobierał go
        // z bazy i przekazywał wyłącznie do karty pojazdu — kafelki, P&L i ranking
        // udawały, że flota jeździ na samym oleju napędowym.
        const aEntries = adblue.filter((r) => r.vehicle_id === v.id).map((r) => entry(r, rates));
        const a = summarizeFuel(aEntries);
        return {
          id: v.id,
          registration: v.registration,
          count: s.count,
          totalLiters: s.totalLiters,
          spend: s.totalSpend,
          adblueLiters: a.totalLiters,
          adblueSpend: a.totalSpend,
          /** Paliwo + AdBlue — to jest realny koszt płynów tego auta. */
          liquidSpend: round2(s.totalSpend + a.totalSpend),
          cons: consumptionFullToFull(fEntries),
          /** Dystans z liczników — waga przy uśrednianiu spalania floty. */
          km:
            fEntries.length > 1
              ? Math.max(...fEntries.map((e) => e.odometerKm)) -
                Math.min(...fEntries.map((e) => e.odometerKm))
              : 0,
          tripCount: trips.filter((r) => r.vehicle_id === v.id).length,
          anomalies: detectFuelAnomalies(fuelConsumptionSeries(fEntries)).length,
        };
      }),
    [vehicles, fuel, adblue, trips, rates],
  );

  /**
   * [#378] Zlecenia i koszty przeliczone na euro RAZ, u wejścia.
   *
   * Silniki w `packages/core` (`clientProfitability`, `fleetPnlByVehicle`)
   * przyjmują kwotę z walutą i same odsiewają nie-euro. Zamiast zmieniać ich
   * sygnatury i wszystkich wywołujących, normalizujemy tutaj i przekazujemy dalej
   * już jako euro — granica przeliczenia jest w jednym miejscu i widać ją wprost.
   */
  const ordersEur = useMemo(
    () =>
      orders.map((o) => ({
        ...o,
        // Data załadunku, a nie utworzenia: kurs ma odpowiadać momentowi kosztu.
        priceEur: rowAmountEur(o.price, o.currency, o.load_date ?? o.created_at, rates),
      })),
    [orders, rates],
  );

  const costsEur = useMemo(
    () =>
      costs.map((c) => ({
        ...c,
        amountEur: rowAmountEur(Number(c.amount), c.currency, c.cost_date, rates),
      })),
    [costs, rates],
  );

  const ops = useMemo(() => summarizeOperatingCosts(opsRaw, rates), [opsRaw, rates]);

  const money = useMemo(() => makeMoneyFormatter(displayCurrency, rates), [displayCurrency, rates]);

  /** Ile pozycji wypadło z sum z braku notowania — pokazujemy to wprost. */
  const missingRate = useMemo(
    () => countMissingRate(fuel, rates) + countMissingRate(adblue, rates),
    [fuel, adblue, rates],
  );

  /**
   * [#382] Skrót wyjazdów — jednym silnikiem z rdzenia, nie własnym liczydłem.
   *
   * Pełny rachunek każdej trasy powstaje na `/wyjazdy`, ale ten ekran o nim nie
   * wiedział, więc zarząd oglądał statystyki floty bez informacji, że rozbicie
   * per wyjazd w ogóle istnieje. Trzeci mechanizm sumujący to samo skończyłby
   * się dwiema różnymi liczbami dla tej samej trasy w dwóch miejscach aplikacji,
   * więc wołamy `buildJourneys` — dokładnie to, co tamten ekran.
   *
   * Wejściem jest wyłącznie to, co ekran ma już w stanie: żadnego dodatkowego
   * zapytania do bazy dla sekcji, która startuje zwinięta.
   */
  const journeys = useMemo(() => {
    /**
     * Kwota wpisana, ale bez notowania na dzień zdarzenia → do silnika idzie
     * `null`, a on robi `?? 0`. Taka pozycja ZANIŻA koszt wyjazdu, więc ją
     * zliczamy i mówimy o tym pod kafelkami. Alternatywą byłoby przemilczenie
     * różnicy — czyli pokazanie zaniżonego kosztu jako twardej liczby.
     */
    let missingRateRows = 0;
    const toEur = (amount: number | null, currency: string | null, occurredAt: string) => {
      if (amount == null) return null;
      const eur = rowAmountEur(amount, currency, occurredAt, rates);
      if (eur == null) missingRateRows++;
      return eur;
    };
    /**
     * `createdAt` karmione `occurred_at` — tak samo jak na `/wyjazdy`.
     *
     * Nazwa pola w rdzeniu mówi „utworzenie", ale wyjazd jest bramkowany
     * zdarzeniami start…zakończenie i łapie tankowania po OKNIE CZASU
     * ZDARZENIA. Wpis zrobiony offline i zsynchronizowany trzy dni później
     * wpadłby po dacie utworzenia do cudzego wyjazdu — razem z litrami
     * i kosztem. Z tego samego powodu kurs bierzemy z dnia zdarzenia.
     */
    const fuelEntry = (r: FuelRaw): JourneyFuelEntry => ({
      vehicleId: r.vehicle_id,
      createdAt: r.occurred_at,
      odometerKm: r.odometer_km,
      liters: Number(r.liters),
      priceTotal: toEur(r.price_total, r.currency, r.occurred_at),
      isFull: r.is_full !== false,
    });
    const list = buildJourneys({
      trips: trips.map(
        (r): JourneyTripEvent => ({
          action: r.action,
          // Kierowcy skrót nie pokazuje (od tego jest karta wyjazdu na
          // `/wyjazdy`), więc nie udajemy, że go tu znamy.
          driverId: null,
          vehicleId: r.vehicle_id,
          odometerKm: r.odometer_km,
          weightKg: r.weight_kg,
          amount: toEur(r.amount, r.currency, r.occurred_at),
          createdAt: r.occurred_at,
        }),
      ),
      fuel: fuel.map(fuelEntry),
      adblue: adblue.map(fuelEntry),
    });
    // Świadomie bez `ratePerKmByVehicle`: wycena kilometra wymaga stawki firmy
    // i kursu z DNIA wyjazdu, a ten rachunek prowadzi już `/wyjazdy`. Skutek
    // jest taki, że przychód, zysk i marża wracają z rdzenia puste — i tak też
    // mają wyglądać na ekranie, zamiast być tu policzone po raz drugi, innym
    // sposobem. Kafelki i podpis niżej mówią o tym wprost.
    return { digest: summarizeJourneys(list), missingRateRows };
  }, [trips, fuel, adblue, rates]);

  /** Rejestracja pojazdu do podpisania najgorszego wyjazdu (UUID nic nie mówi). */
  const regById = useMemo(() => new Map(vehicles.map((v) => [v.id, v.registration])), [vehicles]);

  // Pulpit floty — agregaty po wszystkich pojazdach (raz na zmianę danych).
  const fleet = useMemo(() => {
    /**
     * [#380] Średnia spalania floty ważona PRZEBIEGIEM, nie średnia ze średnich.
     *
     * Wcześniej `suma(cons) / liczba_pojazdów` — pojazd, który przejechał 2 000 km,
     * ważył tyle samo co ten z 200 000 km. Wynikiem była liczba, której nie
     * przejechał żaden z nich, a przy jednym aucie odstającym potrafiła zafałszować
     * cały kafelek. To samo poprawione po stronie mobilnej.
     */
    const weighted = tiles.filter((tl) => tl.cons != null && tl.km > 0);
    const consKm = weighted.reduce((a, tl) => a + tl.km, 0);
    const avgCons = consKm
      ? round2(weighted.reduce((a, tl) => a + (tl.cons as number) * tl.km, 0) / consKm)
      : null;
    // [#378] Wcześniej: `o.currency === "EUR"` — zlecenie wystawione w złotówkach
    // znikało z przychodu bez śladu, więc marża floty wychodziła zawyżona.
    // Teraz przeliczamy po kursie z dnia załadunku; nieprzeliczalne zliczamy osobno.
    const revenue = ordersEur.filter((o) => o.status === "delivered" || o.status === "invoiced");
    const ordersRevenueEur = round2(revenue.reduce((a, o) => a + (o.priceEur ?? 0), 0));
    return {
      vehicles: tiles.length,
      totalLiters: round2(tiles.reduce((a, tl) => a + tl.totalLiters, 0)),
      totalSpend: round2(tiles.reduce((a, tl) => a + tl.spend, 0)),
      adblueLiters: round2(tiles.reduce((a, tl) => a + tl.adblueLiters, 0)),
      adblueSpend: round2(tiles.reduce((a, tl) => a + tl.adblueSpend, 0)),
      totalTrips: tiles.reduce((a, tl) => a + tl.tripCount, 0),
      anomalies: tiles.reduce((a, tl) => a + tl.anomalies, 0),
      avgCons,
      ordersRevenueEur,
      /** Zlecenia z ceną, której nie dało się przeliczyć — suma jest niepełna. */
      revenueMissingRate: revenue.filter((o) => o.price != null && o.priceEur == null).length,
    };
  }, [tiles, ordersEur]);

  // Analiza zleceń: top nadawcy, najczęstsze trasy, średnia stawka (raz na zmianę zleceń).
  // [#381] `ordersEur`, nie `orders`: analiza dostawała surowe kwoty z walutą,
  // więc do „średniej stawki" i „top nadawców" wchodziły tylko zlecenia w euro.
  // Zmiana kontraktu w rdzeniu wyciągnęła to na wierzch — kompilator wskazał
  // miejsce, którego wcześniejszy przegląd nie zauważył.
  const analytics = useMemo(
    () =>
      orderAnalytics(
        ordersEur.map((o) => ({
          shipper: o.shipper,
          origin: o.origin,
          destination: o.destination,
          priceEur: o.priceEur,
          status: o.status,
        })),
        5,
      ),
    [ordersEur],
  );

  // Rentowność klientów: koszt paliwa per pojazd → przypisany do zleceń proporcjonalnie
  // do przychodu, zsumowany per nadawca. Tylko zlecenia zrealizowane w EUR.
  const profit = useMemo(() => {
    // Koszt per pojazd = paliwo + koszty pozostałe (EUR) — atrybucja proporcjonalna do przychodu.
    // [#378] Dwa błędy w jednej mapie: paliwo dodawało surową kwotę (złotówki
    // jak euro, zawyżenie ~4,3×), a koszty pojazdu w innej walucie były po cichu
    // WYRZUCANE. Obie liczby lądowały w tej samej rentowności klienta.
    // [#379] Paliwo I AdBlue — do tej pory nota pod tabelą uczciwie przyznawała,
    // że AdBlue jest pominięty. Teraz nie musi, bo wchodzi do kosztu.
    const byVeh = [...fuel, ...adblue].reduce((m, r) => {
      const eur = rowAmountEur(r.price_total, r.currency, r.occurred_at, rates);
      return eur == null ? m : m.set(r.vehicle_id, (m.get(r.vehicle_id) ?? 0) + eur);
    }, new Map<string, number>());
    for (const c of costsEur) {
      if (c.amountEur == null) continue;
      byVeh.set(c.vehicle_id, (byVeh.get(c.vehicle_id) ?? 0) + c.amountEur);
    }
    const vehicleCosts = [...byVeh].map(([vehicleId, cost]) => ({ vehicleId, cost }));
    return clientProfitability(
      ordersEur.map((o) => ({
        shipper: o.shipper,
        vehicleId: o.vehicle_id,
        priceEur: o.priceEur,
        status: o.status,
      })),
      vehicleCosts,
    );
  }, [ordersEur, fuel, adblue, costsEur, rates]);

  // Rachunek zysków i strat floty: przychód − paliwo − pozostałe koszty (tylko EUR).
  const pnl = useMemo(() => {
    // [#378] Nazwa `fuelEur` twierdziła „euro", a kod nie sprawdzał waluty ani razu.
    // Wynik szedł do kafelków „Paliwo", „Koszty razem", „Zysk netto" i „Marża".
    const sumEur = (rows: FuelRaw[]) =>
      rows.reduce(
        (a, r) => a + (rowAmountEur(r.price_total, r.currency, r.occurred_at, rates) ?? 0),
        0,
      );
    const fuelEur = sumEur(fuel);
    // [#379] AdBlue trzymany osobno do POKAZANIA, ale doliczony do kosztu:
    // ukrycie go zawyżało zysk floty o pozycję, którą realnie płaci co miesiąc.
    const adblueEur = sumEur(adblue);
    const converted = costsEur.filter(
      (c): c is typeof c & { amountEur: number } => c.amountEur != null,
    );
    // [#380] Koszty pojazdu + koszty operacyjne trasy. Bez tej drugiej części
    // „Pozostałe koszty" pomijały parkingi, myto, promy i mandaty, więc zysk
    // floty wychodził tym bardziej zawyżony, im więcej firma jeździła
    // po płatnych drogach.
    const otherEur = converted.reduce((a, c) => a + c.amountEur, 0) + ops.totalEur;
    return {
      fuelEur: round2(fuelEur),
      adblueEur: round2(adblueEur),
      result: fleetPnl(fleet.ordersRevenueEur, fuelEur + adblueEur, otherEur),
      byCategory: sumCostsByCategory(
        converted.map((c) => ({
          vehicleId: c.vehicle_id,
          category: c.category,
          amountEur: c.amountEur,
        })),
      ),
    };
  }, [fuel, adblue, costsEur, ops, rates, fleet.ordersRevenueEur]);

  // Ranking rentowności floty: P&L per pojazd (przychód − paliwo − koszty, EUR).
  const pnlRows = useMemo(() => {
    // [#379] `liquidSpend` = paliwo + AdBlue. Ranking rentowności pomijający
    // AdBlue faworyzował auta, które zużywają go najwięcej.
    const fuelByVehicle = tiles.map((tl) => ({ vehicleId: tl.id, eur: tl.liquidSpend }));
    const costsByVehicle = costsEur
      .filter((c): c is typeof c & { amountEur: number } => c.amountEur != null)
      .map((c) => ({ vehicleId: c.vehicle_id, eur: c.amountEur }));
    const regOf = new Map(vehicles.map((v) => [v.id, v.registration]));
    return fleetPnlByVehicle(
      ordersEur.map((o) => ({
        vehicleId: o.vehicle_id,
        priceEur: o.priceEur,
        status: o.status,
      })),
      fuelByVehicle,
      costsByVehicle,
    ).map((r) => ({ ...r, registration: regOf.get(r.vehicleId) ?? r.vehicleId.slice(0, 8) }));
  }, [ordersEur, tiles, costsEur, vehicles]);

  // Emisje CO₂ per pojazd (z litrów paliwa) — raport ESG, malejąco.
  const co2Rows = useMemo(
    () =>
      co2ByVehicle(
        tiles.map((t) => ({
          id: t.id,
          registration: t.registration,
          liters: t.totalLiters,
          consumption: t.cons,
        })),
      ),
    [tiles],
  );

  // Emisje CO₂ przypisane do klientów (atrybucja jak rentowność).
  const co2ClientRows = useMemo(
    () =>
      co2ByClient(
        // [#381] To samo co przy `orderAnalytics`: było `orders` z surową kwotą,
        // więc udział klienta w emisjach liczył się tylko ze zleceń w euro.
        ordersEur.map((o) => ({
          shipper: o.shipper,
          vehicleId: o.vehicle_id,
          priceEur: o.priceEur,
          status: o.status,
        })),
        tiles.map((t) => ({ vehicleId: t.id, liters: t.totalLiters })),
      ),
    [ordersEur, tiles],
  );

  // Wejście do trendu rentowności: zlecenia i koszty paliwa otagowane miesiącem
  // (zlecenie wg daty załadunku, fallback do utworzenia) + ostatnie 6 miesięcy.
  const trendInput = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - 5 + i, 1).toISOString().slice(0, 7),
    );
    const trendOrders = ordersEur.map((o) => ({
      shipper: o.shipper,
      vehicleId: o.vehicle_id,
      priceEur: o.priceEur,
      status: o.status,
      month: (o.load_date ?? o.created_at).slice(0, 7),
    }));
    const trendCosts = [
      ...fuel.map((r) => ({
        vehicleId: r.vehicle_id,
        cost: rowAmountEur(r.price_total, r.currency, r.occurred_at, rates) ?? 0,
        month: r.occurred_at.slice(0, 7),
      })),
      ...costsEur
        .filter((c): c is typeof c & { amountEur: number } => c.amountEur != null)
        .map((c) => ({
          vehicleId: c.vehicle_id,
          cost: c.amountEur,
          month: c.cost_date.slice(0, 7),
        })),
    ];
    return { months, orders: trendOrders, costs: trendCosts };
  }, [ordersEur, fuel, costsEur, rates]);

  // Alerty progowe (ujemna/niska marża, anomalie spalania, skok kosztu paliwa m/m)
  // — liczone z danych już załadowanych na tym ekranie. Tylko zarząd.
  const alerts = useMemo(() => {
    // [#376] Grupowanie po dacie ZDARZENIA — tak samo jak wykres obok.
    // Wcześniej alert liczył po `created_at`, więc kilka tankowań z końca lipca
    // zsynchronizowanych 1 sierpnia dawało „skok kosztu o 233%", którego nie
    // dało się potwierdzić na wykresie na tym samym ekranie.
    // [#378] …i po kwocie przeliczonej na euro. Bez tego jedno tankowanie
    // w złotówkach samo w sobie generowało fałszywy alert „skok kosztu paliwa".
    const byMonth = fuel.reduce((m, r) => {
      const k = r.occurred_at.slice(0, 7);
      const eur = rowAmountEur(r.price_total, r.currency, r.occurred_at, rates);
      return eur == null ? m : m.set(k, (m.get(k) ?? 0) + eur);
    }, new Map<string, number>());
    const fuelCostByMonth = [...byMonth]
      .map(([month, cost]) => ({ month, cost }))
      .sort((a, b) => a.month.localeCompare(b.month));
    return fleetAlerts({
      clients: profit.clients,
      anomalyVehicles: tiles.map((tl) => ({
        registration: tl.registration,
        anomalies: tl.anomalies,
      })),
      fuelCostByMonth,
    });
  }, [profit, tiles, fuel, rates]);

  return (
    <div>
      <PageHeader title={t("nav.stats")} subtitle={t("stats.subtitle")} />

      {/* [#379] Przełącznik waluty PREZENTACJI. Rachunek zostaje w euro, po kursie
          z dnia zdarzenia — tu zmienia się wyłącznie to, w czym pokazujemy wynik.
          Data kursu jest podana wprost, bo bez niej liczba wyglądałaby na kwotę
          historyczną, a jest przeliczeniem „ile to jest dzisiaj". */}
      <div style={styles.currencyBar}>
        <span style={{ color: palette.smoke, fontSize: 13 }}>{t("stats.currency.show")}</span>
        <select
          value={displayCurrency}
          onChange={(e) => setDisplayCurrency(e.target.value)}
          style={styles.select}
          aria-label={t("stats.currency.aria")}
        >
          {DISPLAY_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {money.asOf && (
          <span style={{ color: palette.smoke, fontSize: 12 }}>
            {t("stats.currency.asOf").replace("{date}", money.asOf)}
          </span>
        )}
        {displayCurrency !== "EUR" && !money.asOf && (
          <span style={{ color: palette.warning, fontSize: 12 }}>
            {t("stats.currency.noRate").replace("{code}", displayCurrency)}
          </span>
        )}
      </div>

      {/* [#392] Zbiór dobity do limitu — liczby niżej są NIEPEŁNE i trzeba to
          powiedzieć na górze, zanim ktokolwiek je odczyta. Milczenie tutaj było
          groźniejsze niż samo obcięcie: brakujące tankowania wyglądają jak spadek
          zużycia, a brakujące zlecenia jak spadek przychodu. */}
      {truncated && (
        <p
          style={{
            color: palette.warning,
            fontSize: 13,
            lineHeight: 1.6,
            border: `1px solid ${palette.warning}`,
            borderRadius: 10,
            padding: "10px 12px",
            marginTop: 12,
          }}
        >
          ⚠️ {t("stats.truncated")}
        </p>
      )}

      {ready && vehicles.length === 0 && (
        <p style={{ color: palette.smoke, marginTop: 24 }}>{t("stats.empty")}</p>
      )}

      {!selected ? (
        <>
          {canManage && alerts.length > 0 && <AlertsBanner alerts={alerts} />}

          {/* [#378] „Brak kwoty" i „brak kursu" to dwie różne rzeczy i nie wolno
              ich zlewać: użytkownikowi, który wpisał 1200 PLN, komunikat
              „uzupełnij kwotę" jest nie do wykonania. Tu mówimy wprost, że suma
              jest niepełna, bo brakuje notowania na dany dzień. */}
          {(missingRate > 0 || fleet.revenueMissingRate > 0) && (
            <div style={styles.rateWarn}>
              ⚠️{" "}
              {t("stats.rateWarn")
                .replace("{count}", String(missingRate + fleet.revenueMissingRate))
                .replace(
                  "{items}",
                  t(
                    missingRate + fleet.revenueMissingRate === 1
                      ? "stats.itemOne"
                      : "stats.itemMany",
                  ),
                )}
            </div>
          )}

          {fleet.vehicles > 0 && (
            <div style={styles.fleet}>
              <FleetStat label={t("nav.vehicles")} value={String(fleet.vehicles)} />
              <FleetStat label={t("stats.fleet.fuelTotal")} value={`${fleet.totalLiters} L`} />
              <FleetStat label={t("stats.fleet.fuelSpend")} value={money.fmt(fleet.totalSpend)} />
              {/* [#379] AdBlue jako osobna para kafelków, nie doklejony do paliwa:
                  to inny płyn, inne zużycie i inna cena za litr — zlanie ich
                  w jedną liczbę ukryłoby jedno i drugie. */}
              <FleetStat label="💧 AdBlue" value={`${fleet.adblueLiters} L`} />
              <FleetStat
                label={t("stats.fleet.adblueSpend")}
                value={money.fmt(fleet.adblueSpend)}
              />
              <FleetStat
                label={t("stats.fleet.avgConsumption")}
                value={fleet.avgCons != null ? `${fleet.avgCons} L/100km` : "—"}
              />
              <FleetStat label={t("stats.fleet.trips")} value={String(fleet.totalTrips)} />
              {/* [#378] Było „Przychód (zlecenia EUR)" — nazwa opisywała nie tyle
                  walutę wyniku, ile fakt, że zlecenia w innych walutach po prostu
                  wypadały. Teraz wszystko jest przeliczone, więc etykieta może być
                  uczciwa. */}
              <FleetStat
                label={t("stats.fleet.ordersRevenue")}
                value={money.fmt(fleet.ordersRevenueEur)}
                accent="#22c55e"
              />
              <FleetStat
                label={t("alerts.fuelAnomaly")}
                value={String(fleet.anomalies)}
                accent={fleet.anomalies > 0 ? palette.red : "#22c55e"}
              />
              <FleetStat
                // AdBlue świadomie poza CO₂: to reagent do redukcji tlenków azotu,
                // a nie paliwo — doliczenie go do emisji ze spalania byłoby błędem.
                label={`🌱 ${t("stats.fleet.co2")}`}
                value={formatCo2(dieselCo2Kg(fleet.totalLiters))}
              />
              <FleetStat
                label="CO₂ / 100 km"
                value={fleet.avgCons != null ? `${co2PerHundredKm(fleet.avgCons)} kg` : "—"}
              />
            </div>
          )}

          {canManage && fleet.vehicles > 0 && (
            <div style={styles.pnl}>
              <div style={styles.anHead}>
                💰 {t("stats.pnl.title")}{" "}
                {/* [#378] Było „tylko EUR" — opisywało nie walutę wyniku, lecz to,
                    że reszta wypadała z rachunku. [#379] AdBlue dopisany, bo od teraz
                    faktycznie wchodzi do kosztu. */}
                <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 12 }}>
                  {t("stats.pnl.formula")}
                </span>
              </div>
              <div style={styles.fleet}>
                <FleetStat
                  label={t("profit.total.revenue")}
                  value={money.fmt(pnl.result.revenueEur)}
                  accent="#22c55e"
                />
                <FleetStat label={t("settlements.fuel")} value={money.fmt(pnl.fuelEur)} />
                <FleetStat label="AdBlue" value={money.fmt(pnl.adblueEur)} />
                <FleetStat
                  label={t("stats.pnl.otherCosts")}
                  value={money.fmt(pnl.result.otherCostEur)}
                />
                <FleetStat
                  label={t("stats.pnl.totalCosts")}
                  value={money.fmt(pnl.result.totalCostEur)}
                />
                <FleetStat
                  label={t("stats.pnl.netProfit")}
                  value={money.fmt(pnl.result.profitEur)}
                  accent={pnl.result.profitEur >= 0 ? "#22c55e" : palette.red}
                />
                <FleetStat
                  label={t("profit.col.margin")}
                  value={pnl.result.marginPct != null ? `${pnl.result.marginPct}%` : "—"}
                  accent={
                    pnl.result.marginPct != null && pnl.result.marginPct >= 0
                      ? "#22c55e"
                      : palette.red
                  }
                />
              </div>
              {pnl.byCategory.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {pnl.byCategory.map((c) => (
                    <span key={c.category} style={styles.pnlTag}>
                      {c.label}: <strong>{money.fmt(c.amountEur)}</strong>
                    </span>
                  ))}
                </div>
              )}
              {/* [#382] Nota mówiła „Pozycje w innych walutach są pomijane w sumie",
                  co przestało być prawdą przy [#378]: `costsEur` przelicza każdą
                  kwotę po kursie z dnia zdarzenia, a odpada dopiero ta bez
                  notowania. Zdanie straszyło utratą danych, której nie ma. */}
              <p style={{ color: palette.smoke, fontSize: 12, marginTop: 8 }}>
                {t("stats.pnl.note")}
              </p>
            </div>
          )}

          {canManage && pnlRows.length > 0 && (
            <div style={styles.profitWrap}>
              <div style={styles.anHead}>
                🚚 {t("stats.rank.title")}{" "}
                <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 12 }}>
                  {t("stats.rank.formula")}
                </span>
              </div>
              <div style={{ ...styles.profitRow, color: palette.smoke, fontSize: 12 }}>
                <span style={{ flex: 1 }}>{t("common.vehicle")}</span>
                <span style={styles.profitCol}>{t("profit.col.revenue")}</span>
                <span style={styles.profitCol}>{t("settlements.fuel")}</span>
                <span style={styles.profitCol}>{t("stats.rank.costs")}</span>
                <span style={styles.profitCol}>{t("profit.col.profit")}</span>
                <span style={styles.profitCol}>{t("profit.col.margin")}</span>
              </div>
              {pnlRows.map((r) => {
                const color = r.net >= 0 ? "#22c55e" : palette.red;
                return (
                  <div key={r.vehicleId} style={styles.profitRow}>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: 700,
                      }}
                    >
                      {r.registration}
                    </span>
                    <span style={styles.profitCol}>{money.fmt(r.revenue)}</span>
                    <span style={styles.profitCol}>{money.fmt(r.fuel)}</span>
                    <span style={styles.profitCol}>{money.fmt(r.costs)}</span>
                    <span style={{ ...styles.profitCol, color, fontWeight: 700 }}>
                      {money.fmt(r.net)}
                    </span>
                    <span style={{ ...styles.profitCol, color }}>
                      {r.marginPct != null ? `${r.marginPct}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {analytics.count > 0 && (
            <div style={styles.analytics}>
              <div style={styles.anCol}>
                <div style={styles.anHead}>🏆 {t("stats.analytics.topClients")}</div>
                {analytics.topShippers.map((s) => (
                  <div key={s.name} style={styles.anRow}>
                    <span
                      style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {s.name}
                    </span>
                    <span style={{ color: palette.smoke, fontSize: 12 }}>
                      {s.count} {t("stats.analytics.ordersSuffix")}
                    </span>
                    <strong style={{ color: "#22c55e" }}>{money.fmt(s.revenueEur)}</strong>
                  </div>
                ))}
              </div>
              <div style={styles.anCol}>
                <div style={styles.anHead}>📍 {t("stats.analytics.topRoutes")}</div>
                {analytics.topRoutes.map((r) => (
                  <div key={r.route} style={styles.anRow}>
                    <span
                      style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {r.route}
                    </span>
                    <strong>{r.count}×</strong>
                  </div>
                ))}
                <div
                  style={{
                    ...styles.anRow,
                    marginTop: 8,
                    borderTop: `1px solid ${palette.graphite}`,
                  }}
                >
                  <span style={{ flex: 1, color: palette.smoke }}>
                    {t("stats.analytics.avgRate")}
                  </span>
                  <strong style={{ color: palette.red }}>{money.fmt(analytics.avgRateEur)}</strong>
                </div>
              </div>
            </div>
          )}

          {canManage && profit.clients.length > 0 && (
            <ProfitabilitySection data={profit} trend={trendInput} />
          )}

          {/* [#380] Rozbicie kosztów operacyjnych — zwijane, bo to szczegół
              do wglądu, a nie liczba, na którą patrzy się codziennie. Suma
              zostaje widoczna po złożeniu sekcji. */}
          {canManage && ops.groups.length > 0 && (
            <Collapsible title={`🅿️ ${t("stats.ops.title")}`} summary={money.fmt(ops.totalEur)}>
              <p
                style={{ color: palette.smoke, fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}
              >
                {t("stats.ops.intro")}
              </p>
              {ops.groups.map((g) => (
                <div key={g.kind} style={styles.opsGroup}>
                  <div style={styles.opsHead}>
                    <strong>{t(OPS_LABEL[g.kind])}</strong>
                    <span style={{ color: palette.smoke, fontSize: 12 }}>
                      {g.count} {t(g.count === 1 ? "stats.itemOne" : "stats.itemMany")}
                    </span>
                    <span style={{ marginLeft: "auto", fontWeight: 700 }}>{money.fmt(g.eur)}</span>
                  </div>
                  {g.bySubKind.length > 1 &&
                    g.bySubKind.map((sk) => (
                      <div key={sk.subKind} style={styles.opsSub}>
                        <span>{sk.subKind}</span>
                        <span style={{ color: palette.smoke }}>×{sk.count}</span>
                        <span style={{ marginLeft: "auto" }}>{money.fmt(sk.eur)}</span>
                      </div>
                    ))}
                </div>
              ))}

              {/* Trzy stany kar rozdzielone, bo znaczą co innego dla pieniędzy. */}
              {ops.contestedCount > 0 && (
                <p style={styles.opsNote}>
                  ⚖️{" "}
                  {t("stats.ops.contested")
                    .replace("{count}", String(ops.contestedCount))
                    .replace("{amount}", money.fmt(ops.contestedEur))}
                  <strong> {t("stats.ops.outsideTotal")}</strong>
                  {t("stats.ops.contestedReason")}
                </p>
              )}
              {ops.cancelledCount > 0 && (
                <p style={styles.opsNote}>
                  {t("stats.ops.cancelled").replace("{count}", String(ops.cancelledCount))}
                </p>
              )}
              {ops.missingRate > 0 && (
                <p style={styles.opsNote}>
                  ⚠️ {t("stats.ops.missingRate").replace("{count}", String(ops.missingRate))}
                </p>
              )}
            </Collapsible>
          )}

          {/* [#382] Skrót wyjazdów — zwijany tak samo jak koszty operacyjne wyżej:
              to wejście do osobnego ekranu, a nie liczba, na którą patrzy się
              codziennie. Po złożeniu w nagłówku zostaje liczba wyjazdów i ich
              koszt, więc zwinięcie nic nie kosztuje. Tylko zarząd — jak sąsiednie
              sekcje pieniężne. */}
          {canManage && journeys.digest.count > 0 && (
            <Collapsible
              title={`🧭 ${t("stats.journeys.title")}`}
              summary={`${journeys.digest.count} ${
                journeys.digest.count === 1
                  ? t("journeys.tripSingular")
                  : t("stats.journeys.countPlural")
              } · ${money.fmt(journeys.digest.costEur)}`}
            >
              {/* [#382] Wyłączenie parkingów, myta i kar zostaje wyróżnione, ale
                  jako całe zdanie, nie samo „nie" wycięte ze środka — inaczej
                  tłumacz dostawał trzy urwane kawałki bez szansy na poprawną
                  składnię w swoim języku. */}
              <p
                style={{ color: palette.smoke, fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}
              >
                {t("stats.journeys.introScope")} {t("stats.journeys.introCost")}{" "}
                <strong>{t("stats.journeys.introExcluded")}</strong>{" "}
                {t("stats.journeys.introWindow")}
              </p>
              <div style={{ ...styles.fleet, marginTop: 0 }}>
                <FleetStat label={t("nav.journeys")} value={String(journeys.digest.count)} />
                <FleetStat label={t("stats.journeys.open")} value={String(journeys.digest.open)} />
                {/* Dystans powstaje z liczników „start" i „zakończenie". Gdy
                    żaden wyjazd ich nie ma, rdzeń zwraca 0 — a „0 km" czytałoby
                    się jako „nie przejechał", zamiast „nie wiemy ile". */}
                <FleetStat
                  label={t("journeys.distance")}
                  value={journeys.digest.distanceKm > 0 ? `${journeys.digest.distanceKm} km` : "—"}
                />
                <FleetStat
                  label={t("stats.journeys.avgConsumption")}
                  value={
                    journeys.digest.avgConsumption != null
                      ? `${journeys.digest.avgConsumption} L/100km`
                      : "—"
                  }
                />
                <FleetStat
                  label={t("stats.journeys.cost")}
                  value={money.fmt(journeys.digest.costEur)}
                />
                {/* Przychód, zysk i marża pokazywane tylko wtedy, gdy realnie
                    są policzone. Kafelek z wiecznym „—" sugerowałby, że dane
                    są niekompletne, a tu po prostu nie jest to nasz rachunek. */}
                {journeys.digest.revenueEur != null && (
                  <>
                    <FleetStat
                      label={t("stats.journeys.revenue")}
                      value={money.fmt(journeys.digest.revenueEur)}
                      accent="#22c55e"
                    />
                    <FleetStat
                      label={t("stats.journeys.profit")}
                      value={money.fmt(journeys.digest.profitEur)}
                      accent={
                        journeys.digest.profitEur != null && journeys.digest.profitEur >= 0
                          ? "#22c55e"
                          : palette.red
                      }
                    />
                    <FleetStat
                      label={t("stats.journeys.margin")}
                      value={
                        journeys.digest.marginPercent != null
                          ? `${journeys.digest.marginPercent}%`
                          : "—"
                      }
                      accent={
                        journeys.digest.marginPercent != null && journeys.digest.marginPercent >= 0
                          ? "#22c55e"
                          : palette.red
                      }
                    />
                  </>
                )}
              </div>

              {/* Najgorsza marża, a nie średnia: średnia rozpuszcza jedną trasę
                  pod kreską w dziesięciu dobrych, a to właśnie ta jedna wymaga
                  decyzji. */}
              {journeys.digest.worst && (
                <div style={{ ...styles.line, marginTop: 12 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    📉 {t("stats.journeys.worstLabel")}{" "}
                    <strong>
                      {regById.get(journeys.digest.worst.vehicleId) ??
                        journeys.digest.worst.vehicleId.slice(0, 8)}
                    </strong>{" "}
                    ·{" "}
                    {t("stats.journeys.worstIndex").replace(
                      "{index}",
                      String(journeys.digest.worst.index),
                    )}
                  </span>
                  <strong
                    style={{
                      color: journeys.digest.worst.marginPercent >= 0 ? "#22c55e" : palette.red,
                    }}
                  >
                    {journeys.digest.worst.marginPercent}%
                  </strong>
                </div>
              )}

              {/* Nie liczymy przychodu wyjazdu i wprost to piszemy — wymaga on
                  stawki €/km i kursu z DNIA wyjazdu, czyli rachunku, który
                  prowadzi ekran „Wyjazdy". Powtórzenie go tutaj dałoby dwie
                  liczby dla tej samej trasy. */}
              {journeys.digest.revenueEur == null && (
                <p style={styles.opsNote}>{t("stats.journeys.noRevenueNote")}</p>
              )}
              {journeys.missingRateRows > 0 && (
                <p style={styles.opsNote}>
                  ⚠️{" "}
                  {t("stats.journeys.missingRate").replace(
                    "{count}",
                    String(journeys.missingRateRows),
                  )}
                </p>
              )}
              <p style={styles.opsNote}>
                <Link href="/wyjazdy" style={{ color: palette.red, fontWeight: 700 }}>
                  {t("stats.journeys.details")}
                </Link>
              </p>
            </Collapsible>
          )}

          {canManage && <TopUsageSection fuel={fuel} cards={cards} rates={rates} />}

          {/* [#379] Zwrot VAT — tylko zarząd: to podstawa wniosku do urzędu,
              a nie liczba, którą kierowca ma z czym zrobić. */}
          {canManage && <VatRefundSection fuel={fuel} vatRates={vatRates} rates={rates} />}

          {canManage && co2Rows.length > 0 && (
            <EmissionsSection rows={co2Rows} clientRows={co2ClientRows} />
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 24 }}>
            {tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => setSelected(tile.id)}
                style={styles.tile}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>{tile.registration}</div>
                {/* [#382] Ostatnie trzy polskie napisy tego ekranu. Klucze
                    `stats.tile.*` leżały w katalogu w obu językach, tylko nikt ich
                    nie wołał — po przełączeniu na angielski kafelki nadal mówiły
                    „tank." i „zdarzeń trasy", a to one są pierwszą rzeczą widoczną
                    po wejściu w statystyki, więc cały ekran wyglądał na
                    nieprzetłumaczony. Jednostki (L, L/100km) zostają dosłownie:
                    to symbole, nie tekst do przekładu. */}
                <div style={{ color: palette.smoke, fontSize: 13, marginTop: 8 }}>
                  ⛽ {tile.count} {t("stats.tile.refuels")} · {tile.totalLiters} L
                </div>
                <div style={{ color: palette.red, fontWeight: 700, marginTop: 4 }}>
                  {tile.cons != null ? `${tile.cons} L/100km` : "— L/100km"}
                </div>
                <div style={{ color: palette.smoke, fontSize: 12, marginTop: 4 }}>
                  🚚 {tile.tripCount} {t("stats.tile.tripEvents")}
                </div>
                {tile.anomalies > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Badge color={palette.red}>
                      ⚠️ {tile.anomalies} {t("stats.tile.anomalies")}
                    </Badge>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      ) : (
        <VehicleDetail
          reg={vehicles.find((v) => v.id === selected)?.registration ?? "?"}
          fuel={byV(fuel, selected)}
          adblue={byV(adblue, selected)}
          trips={byV(trips, selected)}
          rates={rates}
          onBack={() => setSelected(null)}
        />
      )}
    </div>
  );
}
