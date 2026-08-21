"use client";

import {
  DEFAULT_PAGE_SIZE,
  listDrivers,
  listFuelLogsAll,
  listFxRates,
  listPauseEvents,
  listPenalties,
  listRates,
  listRouteExtraCosts,
  listTripEventsAll,
  toFxRates,
} from "@e-logistic/api";
import {
  attachOperatingCosts,
  buildJourneys,
  effectiveModules,
  type FxRate,
  type Journey,
  type JourneyExtra,
  type JourneyOperatingCost,
  journeyKey,
  pickFxRate,
  pickRate,
  round2,
  rowAmountEur,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useFleet } from "@/lib/useFleet";

interface TripRow {
  action: string;
  driver_id: string | null;
  vehicle_id: string | null;
  odometer_km: number | null;
  weight_kg: number | null;
  amount: number | null;
  /**
   * [#378] Waluta kwoty (serwis / „inne"). Kolumna istnieje od migracji 0100 i
   * `select("*")` i tak ją pobierał — brakowało jej tylko w typie, więc ekran
   * nie miał jak jej odczytać i każdą kwotę wliczał do kosztu jak euro.
   */
  currency: string | null;
  created_at: string;
  occurred_at: string;
}
interface FuelRow {
  vehicle_id: string | null;
  created_at: string;
  occurred_at: string;
  odometer_km: number;
  liters: number;
  price_total: number | null;
  /** [#378] Waluta tankowania — jak wyżej: pobierana, ale nieodczytywana. */
  currency: string | null;
  is_full: boolean | null;
}
interface DriverRow {
  user_id: string | null;
  first_name: string;
  last_name: string;
}
interface RateRow {
  vehicleId: string | null;
  ratePerKm: number;
  /**
   * [#378] Waluta stawki za kilometr. Interfejs w ustawieniach jest podpisany
   * „Stawka €/km" i nie daje wyboru waluty, ale kolumna w bazie ją trzyma —
   * gdyby kiedykolwiek stanęło tam coś innego niż EUR, przychód wychodziłby
   * z mnożenia kilometrów przez obcą walutę i lądował pod znakiem euro.
   */
  currency: string;
  /**
   * [#378] Dzień, od którego stawka obowiązuje. UWAGA: kolumna ma
   * `default current_date` (0001_init_schema.sql:263), więc w praktyce jest to
   * dzień WPISANIA stawki, a nie dzień wyjazdu, który ta stawka wycenia — do
   * wyboru stawki (`pickRate`) tak, do wyboru KURSU nie. Patrz `rateEurOn`.
   */
  validFrom: string;
}

/**
 * [#382] Koszt operacyjny Fazy 6 sprowadzony do jednego kształtu.
 *
 * Trzy tabele (`pause_events`, `route_extra_costs`, `penalties`) mają trzy różne
 * schematy, a wyjazdowi jest wszystko jedno, z której pochodzi pozycja zapłacona
 * po drodze — liczy się pojazd, moment i kwota. Sprowadzenie ich tutaj do jednego
 * kształtu oszczędza trzech osobnych ścieżek przeliczania waluty i przypisania.
 */
interface OpsCostRow {
  kind: "pause" | "route" | "penalty";
  vehicleId: string | null;
  occurredAt: string;
  amount: number | null;
  currency: string | null;
  /** Status kary (`open`/`paid`/`appealed`/`cancelled`). Poza karami nieużywany. */
  status: string | null;
}

/**
 * Zbiór, który nie dojechał w komplecie — razem z KSZTAŁTEM swojego obcięcia.
 *
 * `oldest` jest datą tylko tam, gdzie obcięcie ma najstarszy ogon (limit + sort malejący
 * po dacie). Przy pobieraniu stronami po `id` żadna data granicy nie opisuje, więc pole
 * jest `null` i baner mówi wprost, że braki są rozsiane po całym okresie.
 */
interface Truncation {
  label: string;
  oldest: string | null;
  /** `true` = koszt operacyjny: wyjazd pokaże się w całości, tylko tańszy niż był. */
  ops: boolean;
}

/** Karta wyjazdu wraz z liczbami, których `buildJourneys` nie może policzyć sam. */
interface JourneyView {
  j: Journey;
  /**
   * [#382] Koszt CAŁKOWITY: to, co policzył `buildJourneys` (paliwo, AdBlue,
   * kwoty przy zdarzeniach trasy) plus koszty operacyjne przypisane do okna tego
   * wyjazdu. `j.cost` sam w sobie jest zaniżony o wszystko, co kierowca płaci
   * po drodze, więc na karcie nie pokazujemy go już bezpośrednio.
   */
  cost: number;
  /** Rozbicie kosztów operacyjnych tego wyjazdu; `null` = żadnych nie przypisano. */
  extra: JourneyExtra | null;
  revenue: number | null;
  profit: number | null;
  marginPercent: number | null;
  /** `false` = w koszcie tego wyjazdu siedzi pozycja, której nie dało się przeliczyć. */
  costKnown: boolean;
  /** Stawka €/km właściwa dla pojazdu nie miała kursu na dzień wyjazdu. */
  rateSubstituted: boolean;
}

/**
 * Granica wierszy dla tabel bez wariantu stronicowanego (postoje, opłaty drogowe,
 * kary) — RÓWNA sufitowi serwera, i to jest cały sens tej liczby.
 *
 * [#378] opisało skutek trafnie: zapytanie sortuje malejąco po `occurred_at`, więc
 * obcięcie zabiera najstarszy koniec, a `buildJourneys` składa wtedy wyjazdy z połówek
 * — start bez zakończenia, zakończenie bez startu (wyjazd znika w całości), tankowania
 * w złym oknie. To nie jest „mniej danych", to są dane ZMYŚLONE. Postawiony wtedy limit
 * 5000 miał to obcięcie wykrywać (`length >= ROW_LIMIT`) i nie wykrywał NIGDY: PostgREST
 * tnie na `api.max_rows` (u Supabase 1000) bez błędu, więc odpowiedź nie miała jak dobić
 * do pięciu tysięcy. Dopiero limit równy sufitowi serwera sprawia, że pełna strona
 * naprawdę znaczy „było więcej".
 *
 * Świadomy koszt: zbiór liczący DOKŁADNIE `ROW_LIMIT` wierszy zgłosi obcięcie, którego
 * nie było. Fałszywy alarm jest tu wielokrotnie tańszy niż wyjazd poskładany z połówek,
 * pokazany bez jednego zastrzeżenia.
 */
const ROW_LIMIT = DEFAULT_PAGE_SIZE;

/** Ile miesięcy wstecz ma być pokazane w komplecie. */
const MONTHS_BACK = 12;

/**
 * [#378] Zapas pobierany PRZED oknem — regresja, którą tu naprawiamy.
 *
 * Samo okno „ostatnie 12 miesięcy" gubiło całe wyjazdy, i to po cichu:
 * `buildJourneys` pomija zdarzenia sprzed pierwszego „start", więc wyjazd
 * rozpoczęty przed granicą okna znikał W CAŁOŚCI — razem z kosztami,
 * załadunkami i tankowaniami, które leżały wewnątrz okna. Tak samo znikał
 * wyjazd wciąż trwający, jeśli zaczął się wcześniej. Zapas cofa pobranie o pół
 * roku, żeby taki wyjazd miał tu swój „start"; granica nadal istnieje, więc
 * mówimy o niej wprost (`orphanRows` niżej wykrywa, czy realnie coś odcięła).
 */
const LEAD_MONTHS = 6;

/** Pierwszy dzień miesiąca oddalonego o `back` miesięcy wstecz (`YYYY-MM-DD`, UTC). */
function monthStartBack(back: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1))
    .toISOString()
    .slice(0, 10);
}

/**
 * [#382] Etykiety rodzajów kosztu operacyjnego — rozbicie na karcie wyjazdu.
 *
 * Bez `trip`: kwoty przy zdarzeniach trasy liczy już `buildJourneys` i siedzą
 * w `j.cost`. Dorzucenie ich tutaj policzyłoby je drugi raz.
 */
const OPS_LABEL: Record<string, string> = {
  pause: "parkingi",
  route: "opłaty drogowe",
  penalty: "kary",
};

const isEur = (c: string | null | undefined) => (c ?? "EUR").trim().toUpperCase() === "EUR";

/**
 * [#378] Formatter dopisuje „€" — i dopiero teraz mówi prawdę.
 *
 * Liczby, które tu trafiają, powstają w `buildJourneys` z sumowania kwot
 * wierszy. Dopóki wiersze szły do niego surowe, sumowały się złotówki, korony
 * i euro jak jedna waluta (1200 PLN wchodziło do kosztu jako 1200 €, ~4,3× za
 * dużo), a znak euro tę pomyłkę uwiarygadniał. Kwoty przeliczamy teraz na euro
 * przy wejściu — patrz memo `journeys` niżej.
 */
const money = (n: number | null) => (n == null ? "—" : `${n} €`);
const num = (n: number | null, unit = "") => (n == null ? "—" : `${n}${unit}`);

export default function JourneysPage() {
  const t = useT();
  const { vehicles } = useFleet();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [fuel, setFuel] = useState<FuelRow[]>([]);
  const [adblue, setAdblue] = useState<FuelRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [rates, setRates] = useState<RateRow[]>([]);
  /**
   * [#382] Parkingi, opłaty drogowe i kary — to, co kierowca płaci PO DRODZE.
   * `buildJourneys` o tych tabelach nie wie, więc bez nich rachunek pojedynczej
   * trasy był zaniżony dokładnie o tę część, i to zawsze w tę samą stronę.
   */
  const [ops, setOps] = useState<OpsCostRow[]>([]);
  /** [#378] Kursy EBC — bez nich kwota w innej walucie niż euro nie ma jak wejść do sumy. */
  const [fx, setFx] = useState<FxRate[]>([]);
  /**
   * [#378] Zbiory, które wróciły dokładnie na limicie — czyli prawdopodobnie
   * obcięte. Trzymamy też datę najstarszego wiersza, który wrócił: to jest
   * realna granica obcięcia i tylko ona pozwala powiedzieć uczciwie, od kiedy
   * dane są kompletne.
   *
   * [#382] `ops` rozróżnia skutek obcięcia: obcięte zdarzenia trasy psują SKŁAD
   * wyjazdu, obcięte koszty operacyjne psują tylko jego KWOTĘ — wyjazd pokaże
   * się normalnie, po prostu tańszy niż był.
   */
  const [truncated, setTruncated] = useState<Truncation[]>([]);
  /** Data, od której faktycznie pobrano wpisy (z zapasem) — do pokazania wprost. */
  const [fetchedFrom, setFetchedFrom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) {
        setTrips([]);
        return;
      }
      const manage = m.role === "owner" || m.role === "dispatcher";
      setDenied(!manage && !effectiveModules(m.role, m.modules).includes("stats"));
      // [#378] Okno danych z zapasem. Zakres jest tu ważniejszy niż na zwykłej
      // liście: wyjazd składa się z pary zdarzeń start…zakończenie, więc
      // niekompletny zbiór nie daje krótszej listy, tylko listę z połówkami —
      // a wyjazd bez „startu" nie pojawia się w ogóle. Dlatego pobieramy
      // MONTHS_BACK + LEAD_MONTHS: wyjazd rozpoczęty przed granicą okna, a
      // zakończony (albo wciąż trwający) w jego środku, ma tu komplet zdarzeń.
      // Granicy nie da się usunąć całkowicie — dlatego niżej mierzymy, ile
      // wpisów zostało za nią odciętych, i mówimy o tym wprost.
      const from = monthStartBack(MONTHS_BACK - 1 + LEAD_MONTHS);
      const [tripsPaged, fPaged, aPaged, d, r, fxRows, pauses, routeCosts, penalties] =
        await Promise.all([
          // Trzy zbiory, z których składa się SKŁAD wyjazdu, schodzą stronami: dla nich
          // niepełny zbiór nie daje krótszej listy, tylko listę nieprawdziwą (patrz
          // `ROW_LIMIT`). Komplet albo jawne `complete: false` — nic pomiędzy.
          listTripEventsAll(sb, { from }),
          listFuelLogsAll(sb, { table: "fuel_logs", from }),
          listFuelLogsAll(sb, { table: "adblue_logs", from }),
          listDrivers(sb, m.companyId).catch(() => []),
          listRates(sb, m.companyId).catch(() => []),
          // Zapas 10 dni wstecz: kurs bierzemy z dnia zdarzenia, a EBC nie
          // publikuje w weekendy i święta — ten sam wzorzec co w /stats i /monthly.
          listFxRates(sb, {
            from: new Date(Date.parse(from) - 10 * 86_400_000).toISOString().slice(0, 10),
          }),
          // [#382] Koszty operacyjne — DOKŁADNIE ten sam zakres dat co reszta,
          // bo mają być przypisane do tych samych wyjazdów: węższy zakres
          // odjąłby koszty najstarszym wyjazdom, szerszy dokładałby pozycje
          // z tras, których ekran w ogóle nie pokazuje. Limit podany wprost, bo
          // domyślne 500 z warstwy danych ucięłoby zbiór bez słowa — a przy
          // kilkunastu miesiącach parkingi i bramki potrafią być najliczniejszą
          // tabelą z tu pobieranych.
          listPauseEvents(sb, { from, limit: ROW_LIMIT }),
          listRouteExtraCosts(sb, { from, limit: ROW_LIMIT }),
          listPenalties(sb, { from, limit: ROW_LIMIT }),
        ]);
      /*
       * Dwa dowody obcięcia — i, co ważniejsze, dwa RÓŻNE jego kształty.
       *
       * Zbiory stronicowane mówią o sobie same (`complete: false` = zadziałał twardy
       * sufit stron); przy tabelach kosztów operacyjnych, które wariantu stronicowanego
       * jeszcze nie mają, zostaje przesłanka — strona pełna co do wiersza znaczy
       * „prawie na pewno było więcej".
       *
       * Data graniczna ma sens WYŁĄCZNIE w tym drugim przypadku. Zapytanie z `limit`
       * sortuje malejąco po `occurred_at`, więc obcięcie zabiera najstarszy ogon i ostatni
       * pobrany wiersz naprawdę wyznacza moment, od którego dane są kompletne.
       * `fetchAllByKeyset` schodzi natomiast po `id` (losowy UUID): po zadziałaniu sufitu
       * w wyniku zostaje podzbiór LOSOWY względem daty, rozłożony po całym oknie, a
       * najstarszy pobrany `occurred_at` leży praktycznie na jego początku. Podanie wtedy
       * daty granicznej mówiłoby dyspozytorowi coś odwrotnego do prawdy: że wyjazdy
       * z ostatnich miesięcy są pewne, podczas gdy dziury są także we wczorajszych.
       *
       * Milczenie tutaj było najgorszą częścią błędu, ale ostrzeżenie wskazujące zły
       * kierunek jest od milczenia gorsze.
       */
      const granica = (rows: { occurred_at: string }[]) =>
        (rows[rows.length - 1]?.occurred_at ?? from).slice(0, 10);
      const ucietoStronami = (paged: { complete: boolean }, label: string): Truncation | null =>
        paged.complete ? null : { label, oldest: null, ops: false };
      const ucietoLimitem = (rows: { occurred_at: string }[], label: string): Truncation | null =>
        rows.length >= ROW_LIMIT ? { label, oldest: granica(rows), ops: true } : null;
      setTruncated(
        [
          ucietoStronami(tripsPaged, t("journeys.set.trips")),
          ucietoStronami(fPaged, t("journeys.set.fuel")),
          ucietoStronami(aPaged, t("journeys.set.adblue")),
          ucietoLimitem(pauses, t("journeys.set.pauses")),
          ucietoLimitem(routeCosts, t("journeys.set.routeCosts")),
          ucietoLimitem(penalties, t("journeys.set.penalties")),
        ].filter((x): x is Truncation => x != null),
      );
      setFetchedFrom(from);
      setTrips(tripsPaged.rows);
      setFuel(fPaged.rows);
      setAdblue(aPaged.rows);
      setDrivers(d);
      setRates(r);
      setFx(toFxRates(fxRows));
      // [#382] Trzy schematy → jeden kształt. `status` niosą tylko kary; przy
      // parkingu i opłacie drogowej nie ma czego rozstrzygać, więc `null`.
      setOps([
        ...pauses.map(
          (x): OpsCostRow => ({
            kind: "pause",
            vehicleId: x.vehicle_id,
            occurredAt: x.occurred_at,
            amount: x.price_total,
            currency: x.currency,
            status: null,
          }),
        ),
        ...routeCosts.map(
          (x): OpsCostRow => ({
            kind: "route",
            vehicleId: x.vehicle_id,
            occurredAt: x.occurred_at,
            amount: x.amount,
            currency: x.currency,
            status: null,
          }),
        ),
        ...penalties.map(
          (x): OpsCostRow => ({
            kind: "penalty",
            vehicleId: x.vehicle_id,
            occurredAt: x.occurred_at,
            amount: x.amount,
            currency: x.currency,
            status: x.status,
          }),
        ),
      ]);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : t("journeys.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const regOf = useCallback(
    (id: string | null) => (id ? (vehicles.find((v) => v.id === id)?.registration ?? "—") : "—"),
    [vehicles],
  );

  const driverName = useCallback(
    (id: string | null) => {
      if (!id) return t("journeys.unassignedDriver");
      const d = drivers.find((x) => x.user_id === id);
      return d
        ? `${d.last_name} ${d.first_name}`
        : `${t("journeys.driverPrefix")} ${id.slice(0, 8)}`;
    },
    [drivers, t],
  );

  /**
   * [#378] Wyjazdy liczone z kwot JUŻ przeliczonych na euro, po kursie z dnia
   * zdarzenia.
   *
   * `buildJourneys` w `packages/core` sumuje `priceTotal` i `amount` bez pytania
   * o walutę — i słusznie, bo to czysty silnik liczący. Waluta jest sprawą
   * granicy odczytu, więc normalizujemy tutaj, zanim dane tam trafią. Bez tego
   * tankowanie za 1200 PLN wchodziło do kosztu wyjazdu jako 1200 € i zjadało
   * cały zysk trasy (a przy koszcie serwisu potrafiło zrobić z zysku stratę).
   *
   * Pozycji bez notowania nie umiemy jednak wykluczyć z sumy: `buildJourneys`
   * robi `amount ?? 0` i `priceTotal ?? 0`, więc `null` wchodzi tam jako ZERO —
   * koszt zaniżony, a zysk i marża zawyżone. Skoro nie wolno nam ruszać rdzenia,
   * robimy DRUGI przebieg z wartością NaN w miejscu brakującego kursu: NaN
   * przechodzi przez `??` nietknięty i zaraża sumę dokładnie tego wyjazdu, do
   * którego pozycja należy. Dzięki temu wiemy, KTÓRE karty są dotknięte, i nie
   * musimy powtarzać tu reguł segmentacji z rdzenia.
   */
  const {
    list: journeys,
    missingAmountRows,
    incompleteCost,
    orphanRows,
  } = useMemo(() => {
    // Kwota jest, kursu nie ma → NaN. To co innego niż „nikt nie wpisał kwoty"
    // i nie wolno tego zlewać w jeden komunikat: „uzupełnij kwotę" jest nie do
    // wykonania dla kogoś, kto wpisał 1200 PLN — jemu brakuje notowania.
    let missingAmountRows = 0;
    const toEurAmount = (amount: number | null, currency: string | null, occurredAt: string) => {
      if (amount == null) return null;
      const eur = rowAmountEur(amount, currency, occurredAt, fx);
      if (eur == null) {
        missingAmountRows++;
        return Number.NaN;
      }
      return eur;
    };
    /** Wersja dla przebiegu „pokazywanego": NaN z powrotem na `null`. */
    const known = (v: number | null) => (v != null && Number.isNaN(v) ? null : v);

    const fuelEntry = (r: FuelRow) => ({
      vehicleId: r.vehicle_id,
      createdAt: r.occurred_at,
      odometerKm: r.odometer_km,
      liters: r.liters,
      // Data ZDARZENIA (`occurred_at`), nie `created_at`: wpis zrobiony offline
      // i zsynchronizowany trzy dni później dostałby kurs z dnia synchronizacji.
      priceTotal: toEurAmount(r.price_total, r.currency, r.occurred_at),
      isFull: r.is_full ?? true,
    });
    const tripsIn = trips.map((r) => ({
      action: r.action,
      driverId: r.driver_id,
      vehicleId: r.vehicle_id,
      odometerKm: r.odometer_km,
      weightKg: r.weight_kg,
      amount: toEurAmount(r.amount, r.currency, r.occurred_at),
      createdAt: r.occurred_at,
    }));
    const fuelIn = fuel.map(fuelEntry);
    const adblueIn = adblue.map(fuelEntry);

    // Przebieg 1 — liczby pokazywane na kartach. Bez `ratePerKmByVehicle`:
    // przychód zależy od DNIA wyjazdu (kurs stawki), a ten parametr jest jedną
    // liczbą na pojazd, więc liczymy go niżej, per wyjazd.
    const list = buildJourneys({
      trips: tripsIn.map((e) => ({ ...e, amount: known(e.amount) })),
      fuel: fuelIn.map((e) => ({ ...e, priceTotal: known(e.priceTotal) })),
      adblue: adblueIn.map((e) => ({ ...e, priceTotal: known(e.priceTotal) })),
    });

    // Przebieg 2 — tylko po to, żeby ustalić, które wyjazdy mają zaniżony koszt.
    // Segmentacja nie zależy od kwot, więc pary (pojazd, numer) są identyczne.
    // Płacimy za niego wyłącznie wtedy, gdy jest cokolwiek do oznaczenia.
    const incompleteCost = new Set<string>();
    if (missingAmountRows > 0) {
      for (const j of buildJourneys({ trips: tripsIn, fuel: fuelIn, adblue: adblueIn })) {
        if (Number.isNaN(j.cost)) incompleteCost.add(journeyKey(j));
      }
    }

    // Wpisy, które wpadły do pobranego zbioru, ale nie należą do żadnego
    // wyjazdu, bo ich „start" jest starszy niż granica pobrania (albo nigdy nie
    // został zarejestrowany). To jedyny miarodajny ślad po wyjazdach, których
    // ekran nie pokaże — bez niego okno gubiłoby dane po cichu.
    const firstStart = new Map<string, string>();
    for (const r of trips) {
      if (r.action !== "start" || !r.vehicle_id) continue;
      const cur = firstStart.get(r.vehicle_id);
      if (cur == null || r.occurred_at < cur) firstStart.set(r.vehicle_id, r.occurred_at);
    }
    const beforeFirstStart = (vehicleId: string | null, at: string) => {
      if (!vehicleId) return false; // wiersz bez pojazdu i tak nie wchodzi do wyjazdu
      const s = firstStart.get(vehicleId);
      return s == null || at < s;
    };
    let orphanRows = 0;
    for (const r of trips) {
      if (r.action !== "start" && beforeFirstStart(r.vehicle_id, r.occurred_at)) orphanRows++;
    }
    for (const r of fuel) if (beforeFirstStart(r.vehicle_id, r.occurred_at)) orphanRows++;
    for (const r of adblue) if (beforeFirstStart(r.vehicle_id, r.occurred_at)) orphanRows++;

    return { list, missingAmountRows, incompleteCost, orphanRows };
  }, [trips, fuel, adblue, fx]);

  /**
   * [#382] Koszty operacyjne dopięte do wyjazdów.
   *
   * Kwotę przeliczamy po kursie z DNIA ZDARZENIA (`occurred_at`), a nie z dnia
   * pobrania czy wpisania — bramka opłacona w kunach pół roku temu kosztowała
   * tyle, ile wtedy, i to samo robi już reszta tego pliku.
   *
   * Przypisanie robi rdzeń (`attachOperatingCosts`) po pojeździe i oknie wyjazdu,
   * bo innego wiązania w danych nie ma: parking ani mandat nie niosą numeru
   * wyjazdu. Pozycja spoza każdego okna zostaje NIEPRZYPISANA — doklejenie jej do
   * najbliższego wyjazdu wyglądałoby jak precyzja, a byłoby zgadywaniem. Mówimy
   * o niej wprost w banerze zamiast po cichu zawyżać rachunek losowej trasy.
   */
  const { opsByJourney, opsUnassigned, opsMissingRate, opsCancelled, opsAppealed, costIncomplete } =
    useMemo(() => {
      let opsMissingRate = 0;
      let opsCancelled = 0;
      let opsAppealed = 0;
      const priced: JourneyOperatingCost[] = [];
      // Pozycje z kwotą, ale bez kursu — patrz komentarz przy `probe` niżej.
      const unpriced: JourneyOperatingCost[] = [];

      for (const r of ops) {
        if (r.kind === "penalty") {
          const s = (r.status ?? "").trim().toLowerCase();
          // Kara anulowana ma w bazie kwotę jak każda inna, ale wydatku nie było —
          // doliczenie jej obciążyłoby trasę pieniędzmi, które nigdy nie wyszły.
          if (s === "cancelled") {
            opsCancelled++;
            continue;
          }
          // Kwestionowana: sprawa nierozstrzygnięta. Wliczenie jej byłoby
          // rozstrzygnięciem za użytkownika, że zapłaci — więc liczymy osobno.
          if (s === "appealed") {
            opsAppealed++;
            continue;
          }
        }
        // Brak kwoty to brak informacji, a nie zero: postój bez wpisanej ceny
        // mógł być darmowy albo tylko nieuzupełniony i nie umiemy tego rozróżnić.
        if (r.amount == null) continue;
        const eur = rowAmountEur(r.amount, r.currency, r.occurredAt, fx);
        const at = { vehicleId: r.vehicleId, occurredAt: r.occurredAt, kind: r.kind };
        if (eur == null) {
          opsMissingRate++;
          // Kwota podstawiona tylko po to, żeby wiersz przeszedł przez rdzeń —
          // `attachOperatingCosts` odrzuca wartości nieskończone jako
          // nieprzypisane, a tu chodzi o coś odwrotnego: chcemy wiedzieć, DO
          // KTÓREGO wyjazdu ta pozycja trafiłaby, gdyby dało się ją przeliczyć.
          // Sumy z tego przebiegu wyrzucamy — zero nie jest tu kwotą.
          unpriced.push({ ...at, eur: 0 });
        } else {
          priced.push({ ...at, eur });
        }
      }

      const assigned = attachOperatingCosts(journeys, priced);

      // Wyjazd z pozycją bez kursu ma koszt zaniżony dokładnie tak samo jak przy
      // tankowaniu bez notowania, więc dołącza do tego samego zbioru: gwiazdka
      // przy koszcie, zysk i marża jako „—".
      const costIncomplete = new Set(incompleteCost);
      let unpricedUnassigned = 0;
      if (unpriced.length > 0) {
        const probe = attachOperatingCosts(journeys, unpriced);
        for (const key of probe.byJourney.keys()) costIncomplete.add(key);
        unpricedUnassigned = probe.unassignedCount;
      }

      return {
        opsByJourney: assigned.byJourney,
        opsUnassigned: {
          count: assigned.unassignedCount,
          eur: assigned.unassignedEur,
          /** Nieprzypisane I bez kursu — nie znamy nawet ich kwoty, więc osobno. */
          unpriced: unpricedUnassigned,
        },
        opsMissingRate,
        opsCancelled,
        opsAppealed,
        costIncomplete,
      };
    }, [ops, journeys, fx, incompleteCost]);

  /**
   * [#378] Przychód liczony per wyjazd — po kursie z DNIA WYJAZDU.
   *
   * Wcześniej stawka w obcej walucie szła przez kurs z `r.validFrom`, a ta
   * kolumna ma w bazie `default current_date` (0001_init_schema.sql:263) — to
   * dzień WPISANIA stawki, nie dzień trasy, którą stawka wycenia. Ta sama klasa
   * błędu co „kurs z created_at", tylko po stronie przychodu. Do tego stawki
   * bywają starsze o lata, a kursy pobieramy tylko na okno ekranu; `pickFxRate`
   * wymaga `asOf <= onDate`, więc taka stawka wypadała ZAWSZE i przychód schodził
   * do „—". Data wyjazdu zawsze mieści się w oknie pobranych kursów, więc kurs
   * jest i jest właściwy.
   *
   * Fallback jest tu realny, a nie obiecany: stawka bez kursu na dany dzień
   * wypada z zestawu, więc `pickRate` sięga po starszą stawkę pojazdu, a potem po
   * domyślną firmową. Gdy i tych nie ma — przychód i zysk pokazujemy jako „—".
   */
  const { rows, rateFallbacks } = useMemo(() => {
    const unitsPerEurOn = (currency: string, onDate: string) => {
      const q = pickFxRate(fx, currency, onDate);
      return q && q.unitsPerEur > 0 ? q.unitsPerEur : null;
    };
    // Stawka, którą reguła z `pickRate` wybrałaby, gdyby waluta nie grała roli —
    // potrzebna tylko po to, żeby wiedzieć, czy realnie sięgnęliśmy po zastępczą.
    // Zamiast powtarzać tu tę regułę, przepuszczamy przez `pickRate` INDEKSY:
    // wybór zależy wyłącznie od `validFrom`, więc wraca indeks zwycięskiego wiersza.
    const indexed = rates.map((r, i) => ({
      vehicleId: r.vehicleId,
      ratePerKm: i,
      validFrom: r.validFrom,
    }));
    const intended = new Map<string, RateRow | null>();
    const intendedFor = (vehicleId: string) => {
      const cached = intended.get(vehicleId);
      if (cached !== undefined) return cached;
      const i = pickRate(indexed, vehicleId);
      const row = i == null ? null : (rates[i] ?? null);
      intended.set(vehicleId, row);
      return row;
    };
    const rateEurOn = (vehicleId: string, onDate: string) => {
      const usable: RateRow[] = [];
      for (const r of rates) {
        if (isEur(r.currency)) {
          usable.push(r);
          continue;
        }
        const units = unitsPerEurOn(r.currency, onDate);
        if (units == null) continue;
        // Bez `round2`: stawka ma w bazie cztery miejsca po przecinku i jest
        // mnożona przez tysiące kilometrów — zaokrąglenie jej do groszy
        // przesunęłoby przychód o kilka euro na trasie.
        usable.push({ ...r, ratePerKm: r.ratePerKm / units, currency: "EUR" });
      }
      return pickRate(usable, vehicleId);
    };

    let rateFallbacks = 0;
    const rows = journeys.map<JourneyView>((j) => {
      const onDate = j.startAt.slice(0, 10);
      const want = intendedFor(j.vehicleId);
      const rateSubstituted =
        want != null && !isEur(want.currency) && unitsPerEurOn(want.currency, onDate) == null;
      if (rateSubstituted) rateFallbacks++;
      const rate = rateEurOn(j.vehicleId, onDate);
      // Te same wzory co w `makeJourney` (packages/core/src/journeys.ts:128-131) —
      // powtórzone tu świadomie, bo tylko tutaj znamy datę wyjazdu, a więc i kurs.
      const revenue = j.distanceKm != null && rate != null ? round2(j.distanceKm * rate) : null;
      const costKnown = !costIncomplete.has(journeyKey(j));
      // [#382] Zysk i marża liczone od kosztu Z parkingami, myto i karami.
      // `j.profit` z rdzenia zna tylko paliwo, AdBlue i kwoty przy zdarzeniach
      // trasy, więc pokazanie go tutaj oznaczałoby zysk zawyżony o wszystko, co
      // kierowca zapłacił po drodze — i to tym bardziej, im więcej płatnych dróg.
      const extra = opsByJourney.get(journeyKey(j)) ?? null;
      const cost = round2(j.cost + (extra?.eur ?? 0));
      // Zysk i marża tylko przy ZNANYM koszcie: z kosztu zaniżonego o pozycję
      // bez kursu wyszedłby zysk wyższy niż w rzeczywistości, pokazany jako
      // twarda liczba — dokładnie ta pomyłka, którą ten ekran miał wyeliminować.
      const profit = revenue != null && costKnown ? round2(revenue - cost) : null;
      const marginPercent =
        revenue != null && revenue > 0 && costKnown
          ? round2(((revenue - cost) / revenue) * 100)
          : null;
      return { j, cost, extra, revenue, profit, marginPercent, costKnown, rateSubstituted };
    });
    return { rows, rateFallbacks };
  }, [journeys, rates, fx, costIncomplete, opsByJourney]);

  const groups = useMemo(() => {
    const byDriver = new Map<string, JourneyView[]>();
    for (const v of rows) {
      const key = v.j.driverId ?? "unassigned";
      const arr = byDriver.get(key) ?? [];
      arr.push(v);
      byDriver.set(key, arr);
    }
    return [...byDriver.entries()];
  }, [rows]);

  const ready = !loading && !loadErr;

  /**
   * [#382] Pozycje z kwotą, ale bez kursu — razem z paliwa, AdBlue, zdarzeń trasy
   * i kosztów operacyjnych. Skutek jest identyczny niezależnie od tabeli (kwota
   * nie wchodzi do kosztu, więc koszt jest zaniżony), a rozbicie tego na dwa
   * osobne komunikaty kazałoby czytać dwa razy to samo.
   */
  const missingRows = missingAmountRows + opsMissingRate;

  return (
    <div style={{ maxWidth: 920 }}>
      <PageHeader title={t("journeys.title")} subtitle={t("journeys.subtitle")} />

      {denied && <p style={{ color: palette.red, marginTop: 16 }}>{t("journeys.denied")}</p>}

      {/* [#378] Trzy różne powody, dla których liczby na dole mogą kłamać —
          rozdzielone, bo prowadzą do zupełnie innych działań. Obcięcie zbioru
          psuje SKŁAD wyjazdów (start bez zakończenia, tankowanie w złym oknie);
          granica okna USUWA całe wyjazdy; brak notowania psuje tylko KWOTĘ.
          Zlepienie ich w jedno „coś poszło nie tak" kazałoby użytkownikowi
          zgadywać, czy patrzy na niepełną listę, czy na niepełną sumę. */}
      {ready && truncated.length > 0 && (
        <div style={warn}>
          ⚠️{" "}
          {t("journeys.incomplete").replace(
            "{sets}",
            truncated
              .map((x) =>
                x.oldest == null
                  ? t("journeys.incomplete.spread").replace("{label}", x.label)
                  : t("journeys.incomplete.since")
                      .replace("{label}", x.label)
                      .replace("{date}", x.oldest),
              )
              .join(", "),
          )}
          {/* Zdanie „komplet mają wyjazdy po tej dacie" dopisujemy tylko wtedy, gdy KAŻDY
              niepełny zbiór ma datę granicy. Wystarczy jeden zbiór ucięty stronami, żeby
              stało się nieprawdą dla całego ekranu. */}
          {truncated.every((x) => x.oldest != null) && <> {t("journeys.incomplete.after")}</>}
          {/* [#382] Obcięcie kosztów operacyjnych daje inny objaw niż obcięcie
              zdarzeń trasy: wyjazd pokaże się normalnie, tylko tańszy — a to
              wygląda dokładnie jak wyjazd, który był tani naprawdę. */}
          {truncated.some((x) => x.ops) && <> {t("journeys.incomplete.ops")}</>}
        </div>
      )}

      {ready && orphanRows > 0 && fetchedFrom && (
        <div style={warn}>
          ⚠️ Część danych jest poza zakresem — {orphanRows}{" "}
          {orphanRows === 1 ? "wpis nie należy" : "wpisów nie należy"} do żadnego wyjazdu, bo ich
          „start" jest starszy niż {fetchedFrom} (albo nigdy nie został zarejestrowany). Taki wyjazd
          nie jest tu pokazany w ogóle — razem ze swoimi kosztami, załadunkami i tankowaniami, także
          tymi z ostatnich {MONTHS_BACK} miesięcy. Dotyczy to również wyjazdu wciąż trwającego,
          jeśli zaczął się przed tą datą.
        </div>
      )}

      {/* [#382] Koszty, które nie mieszczą się w oknie żadnego wyjazdu. Rdzeń
          celowo nie dokleja ich do najbliższej trasy — a skoro nie ma ich na
          żadnej karcie, to jedyne miejsce, w którym w ogóle o nich słychać. */}
      {ready && (opsUnassigned.count > 0 || opsUnassigned.unpriced > 0) && (
        <div style={warn}>
          ⚠️ Koszty poza wyjazdami —{" "}
          {opsUnassigned.count > 0 && (
            <>
              {opsUnassigned.count} {opsUnassigned.count === 1 ? "pozycja" : "pozycji"} (parkingi,
              opłaty drogowe, kary) na łącznie {money(opsUnassigned.eur)} nie mieści się w oknie
              żadnego pokazanego wyjazdu albo nie ma przypisanego pojazdu. Nie doklejamy ich do
              najbliższej trasy — to byłoby zgadywanie, a tu chodzi o rachunek konkretnego wyjazdu.
              Tych kwot nie ma więc w żadnej karcie poniżej.{" "}
            </>
          )}
          {opsUnassigned.unpriced > 0 && (
            <>
              Dodatkowo {opsUnassigned.unpriced}{" "}
              {opsUnassigned.unpriced === 1 ? "pozycja" : "pozycji"} w walucie bez notowania też
              jest poza wyjazdami — tam nie znamy nawet kwoty, więc nie ma jej w powyższej sumie.
            </>
          )}
        </div>
      )}

      {/* [#382] Kary świadomie pominięte w koszcie. Bez tej informacji ekran
          wyglądałby, jakby tych mandatów w ogóle nie było w bazie. */}
      {ready && (opsCancelled > 0 || opsAppealed > 0) && (
        <div style={warn}>
          ⚠️ Kary pominięte w kosztach wyjazdów —{" "}
          {opsCancelled > 0 && (
            <>anulowane: {opsCancelled} — wydatku nie było, więc nie obciążają żadnej trasy. </>
          )}
          {opsAppealed > 0 && (
            <>
              kwestionowane: {opsAppealed} — sprawa jest nierozstrzygnięta, więc nie wliczamy ich do
              kosztu trasy. Jeśli zapadnie decyzja o zapłacie, koszt tych wyjazdów wzrośnie, a zysk
              spadnie.
            </>
          )}
        </div>
      )}

      {ready && (missingRows > 0 || rateFallbacks > 0) && (
        <div style={warn}>
          ⚠️ Kwoty niepełne —{" "}
          {missingRows > 0 && (
            <>
              {missingRows} {missingRows === 1 ? "pozycja" : "pozycji"} w walucie bez notowania na
              dzień zdarzenia. Kwoty są wpisane, brakuje kursu — a tam, gdzie taka pozycja wchodzi
              do kosztu wyjazdu, liczy się jak zero, więc koszt jest ZANIŻONY.{" "}
              {costIncomplete.size > 0 ? (
                <>
                  Dotyczy to {costIncomplete.size}{" "}
                  {costIncomplete.size === 1 ? "wyjazdu" : "wyjazdów"}: ich koszt ma na karcie
                  gwiazdkę, a zysk i marża pokazane są jako „—", bo z zaniżonego kosztu wyszedłby
                  zawyżony zysk.{" "}
                </>
              ) : (
                <>
                  Żadna z nich nie trafiła do pokazanych wyjazdów, więc liczby na kartach są pełne.{" "}
                </>
              )}
            </>
          )}
          {rateFallbacks > 0 && (
            <>
              {rateFallbacks} {rateFallbacks === 1 ? "wyjazd ma" : "wyjazdów ma"} stawkę €/km w
              walucie bez kursu na dzień wyjazdu — przychód liczymy ze starszej stawki pojazdu albo
              z domyślnej firmowej, a gdy takiej nie ma, przychód i zysk zostają jako „—".
            </>
          )}
        </div>
      )}

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={!denied && rows.length === 0}
        emptyText={t("journeys.empty")}
        onRetry={load}
      />

      {ready && fetchedFrom && !denied && (
        <p style={{ color: palette.smoke, fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
          Zakres: wpisy od {fetchedFrom} — ostatnie {MONTHS_BACK} miesięcy plus {LEAD_MONTHS}{" "}
          miesięcy zapasu, żeby wyjazd rozpoczęty przed granicą okna miał tu swój „start". Wyjazdy
          rozpoczęte wcześniej nie są pokazywane.
        </p>
      )}

      {ready &&
        groups.map(([driverId, list]) => (
          <div key={driverId} style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>
              🧑‍✈️ {driverName(driverId === "unassigned" ? null : driverId)}
              <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 14 }}>
                {" "}
                · {list.length}{" "}
                {list.length === 1 ? t("journeys.tripSingular") : t("journeys.tripPlural")}
              </span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map(
                ({
                  j,
                  cost,
                  extra,
                  revenue,
                  profit,
                  marginPercent,
                  costKnown,
                  rateSubstituted,
                }) => (
                  <div key={journeyKey(j)} style={card}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                    >
                      <strong style={{ fontSize: 15 }}>
                        {t("journeys.cardLabel")} #{j.index} · {regOf(j.vehicleId)}
                      </strong>
                      <span style={j.open ? badgeOpen : badgeDone}>
                        {j.open ? t("journeys.statusOpen") : t("journeys.statusDone")}
                      </span>
                      <span style={{ flex: 1 }} />
                      <span style={{ color: palette.smoke, fontSize: 13 }}>
                        {j.startAt.slice(0, 10)} → {j.endAt ? j.endAt.slice(0, 10) : "…"}
                        {j.durationDays != null
                          ? ` · ${j.durationDays} ${t("journeys.daysSuffix")}`
                          : ""}
                      </span>
                    </div>
                    <div style={statRow}>
                      <span>
                        {t("journeys.distance")}: <b>{num(j.distanceKm, " km")}</b>
                      </span>
                      <span>
                        {t("journeys.consumption")}:{" "}
                        <b>{num(j.avgConsumptionLPer100km, " L/100km")}</b>
                      </span>
                      <span>
                        {t("journeys.fuelings")}: <b>{j.fuelings}</b> ({j.fuelLiters} L)
                      </span>
                      <span>
                        {t("journeys.loadsUnloads")}: <b>{j.loads}</b>/<b>{j.unloads}</b>
                      </span>
                      <span>
                        {t("journeys.loadWeight")}: <b>{j.totalLoadKg} kg</b>
                      </span>
                    </div>
                    <div style={{ ...statRow, marginTop: 4 }}>
                      <span>
                        {t("journeys.cost")}:{" "}
                        <b>
                          {money(cost)}
                          {costKnown ? "" : " *"}
                        </b>
                      </span>
                      <span>
                        {t("journeys.revenue")}: <b>{money(revenue)}</b>
                      </span>
                      <span>
                        {t("journeys.profit")}:{" "}
                        {/* [#378] „—" nie jest zyskiem, więc nie świeci na zielono —
                          wcześniej `(j.profit ?? 0) >= 0` malował brak liczby jak plus. */}
                        <b
                          style={{
                            color:
                              profit == null
                                ? palette.smoke
                                : profit >= 0
                                  ? "#22c55e"
                                  : palette.red,
                          }}
                        >
                          {money(profit)}
                        </b>
                        {marginPercent != null ? ` (${marginPercent}%)` : ""}
                      </span>
                    </div>
                    {/* [#382] Rozbicie tego, co doszło do kosztu poza paliwem —
                      bez niego karta pokazywałaby wyższą liczbę niż wczoraj i nie
                      dawałaby żadnego sposobu sprawdzenia, skąd się wzięła. */}
                    {extra && (
                      <div style={{ ...statRow, marginTop: 2, fontSize: 12 }}>
                        <span>
                          W tym koszty operacyjne:{" "}
                          {extra.byKind
                            .map((b) => `${OPS_LABEL[b.kind] ?? b.kind} ${money(b.eur)}`)
                            .join(" · ")}{" "}
                          ({extra.count} {extra.count === 1 ? "pozycja" : "pozycji"})
                        </span>
                      </div>
                    )}
                    {/* [#378] Znacznik przy KONKRETNEJ karcie — baner na górze mówi,
                      ile pozycji dotyczy, ale nie mówi, którego wyjazdu. */}
                    {!costKnown && (
                      <div style={cardNote}>
                        {/* [#382] Ta sama nota obsługuje teraz także parkingi, opłaty
                            drogowe i kary — dla użytkownika to jeden problem
                            (pozycja bez kursu), niezależnie od tabeli, z której
                            pochodzi. */}
                        * Koszt niepełny: część pozycji tego wyjazdu (tankowanie, koszt przy
                        zdarzeniu trasy albo koszt operacyjny) jest w walucie bez notowania na dzień
                        zdarzenia i nie weszła do sumy — liczy się jak zero. Dlatego zysk i marża:
                        „—".
                      </div>
                    )}
                    {rateSubstituted && (
                      <div style={cardNote}>
                        Stawka €/km tego pojazdu jest w walucie bez kursu na dzień wyjazdu —{" "}
                        {revenue == null
                          ? "i nie ma czym jej zastąpić, więc przychód i zysk zostają puste (—)."
                          : "przychód liczony ze starszej stawki pojazdu albo z domyślnej firmowej."}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

/** [#378] Baner ostrzegawczy — ten sam wygląd co `styles.rateWarn` na /stats. */
const warn: React.CSSProperties = {
  border: `1px solid ${palette.warning}`,
  borderRadius: 10,
  padding: "10px 14px",
  marginTop: 16,
  color: palette.offWhite,
  fontSize: 13,
  lineHeight: 1.5,
  background: palette.nearBlack,
};
const card: React.CSSProperties = {
  background: palette.nearBlack,
  border: `1px solid ${palette.graphite}`,
  borderRadius: 12,
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const cardNote: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  color: palette.warning,
};
const statRow: React.CSSProperties = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  fontSize: 13,
  color: palette.smoke,
};
const badgeOpen: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 999,
  background: "rgba(245,158,11,.15)",
  color: "#f59e0b",
  border: "1px solid rgba(245,158,11,.35)",
};
const badgeDone: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 999,
  background: "rgba(34,197,94,.14)",
  color: "#7ee2a0",
  border: "1px solid rgba(34,197,94,.35)",
};
