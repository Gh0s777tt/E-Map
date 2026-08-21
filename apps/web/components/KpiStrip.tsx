"use client";

import {
  listDriverPayoutsAll,
  listFuelLogsAll,
  listFxRates,
  listOrdersAll,
  listPerDiemTripsAll,
  toFxRates,
} from "@e-logistic/api";
import {
  computePerDiem,
  monthlyFleetSummary,
  type OrderStatus,
  rowAmountEur,
  settleDriverPayouts,
  sumPerDiem,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { getCachedMembership } from "@/lib/membership";
import { monthWindow } from "@/lib/monthWindow";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Kpi {
  inProgress: number;
  toInvoice: number;
  revenue: number;
  net: number;
  perDiem: string;
  payout: string;
  /**
   * [#378] Pozycje z tego miesiąca, które mają kwotę, ale nie miały kursu na
   * dzień zdarzenia — silnik policzył je jako zero. Bez tego licznika wynik
   * wyglądałby na kompletny; suma niepełna udająca pełną jest gorsza niż
   * suma podpisana jako niepełna.
   */
  noRate: number;
  /**
   * Zbiory, z których liczy się wynik miesiąca (zlecenia, paliwo, AdBlue), urwały się
   * na sufit pobrania — przychód i wynik są zaniżone o nieznaną wartość. To inna klasa
   * braku niż `noRate`: tam wiadomo, ilu pozycji brakuje i dlaczego, tu nie wiadomo
   * nawet tego. Milczenie nie wchodzi w grę, bo obcięta suma wygląda dokładnie tak
   * samo jak pełna.
   */
  incomplete: boolean;
  /**
   * Osobne znaczniki dla diet i sald wypłat — każdy stoi przy SWOIM kafelku.
   *
   * Wspólna flaga kazałaby podpisać jako niepełne wszystkie trzy liczby naraz albo
   * żadnej: diety liczą się z `per_diem_trips`, saldo z `driver_payouts`, a wynik
   * miesiąca z trzech zupełnie innych tabel. Obcięcie jednej z nich nie mówi nic
   * o pozostałych, a fałszywe ostrzeżenie przy prawdziwej kwocie uczy je ignorować.
   */
  perDiemIncomplete: boolean;
  payoutIncomplete: boolean;
}

/**
 * Statusy „w toku". Ta sama lista jedzie do bazy jako filtr zapytania, więc jest
 * tablicą typu `OrderStatus`, a nie luźnym `Set<string>` — literówka w statusie ma
 * wywalić się na kompilacji, a nie po cichu zwrócić pusty licznik.
 */
const OPEN: OrderStatus[] = ["new", "assigned", "in_progress"];
const OPEN_SET = new Set<string>(OPEN);

/**
 * Statusy wchodzące do przychodu — filtr jedzie DO BAZY.
 *
 * `monthlyFleetSummary` i tak odsiewa resztę w pamięci, więc oferty i zlecenia
 * anulowane nie zmieniały ani jednej kwoty na pasku — tylko zbliżały zbiór do sufitu
 * pobrania i wypychały z niego zlecenia, które przychód tworzą.
 */
const COUNTED: OrderStatus[] = ["delivered", "invoiced"];

type CostRow = {
  vehicle_id: string;
  price_total: number | null;
  currency: string | null;
  occurred_at: string;
};

/**
 * Pasek KPI na pulpit (owner/dispatcher) — operacyjny skrót na start dnia:
 * zlecenia w toku, do zafakturowania, wynik bieżącego miesiąca (EUR), należne
 * diety i saldo do wypłaty. Liczony na żywo; dla kierowcy nic nie renderuje.
 *
 * [#378] Kwoty w innych walutach (zlecenia, paliwo, AdBlue) przeliczane na EUR
 * po kursie z dnia zdarzenia — tak samo jak na /monthly, żeby oba ekrany podawały
 * dla tego samego miesiąca tę samą liczbę.
 */
export function KpiStrip() {
  const t = useT();
  const [kpi, setKpi] = useState<Kpi | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m || (m.role !== "owner" && m.role !== "dispatcher")) return;
        const month = new Date().toISOString().slice(0, 7);
        const from = `${month}-01`;
        // Okno zleceń SZERSZE niż sam miesiąc i identyczne z /monthly — patrz
        // `lib/monthWindow.ts`. Zapytanie filtruje po `created_at`, a o miesiącu
        // rozstrzyga data załadunku, więc okno przycięte do miesiąca gubiłoby
        // zlecenia wprowadzone wcześniej, a wiezione teraz.
        const okno = monthWindow(month);
        const to = okno.to;
        // Okno JEDNOMIESIĘCZNE dla diet: ich przynależność rozstrzyga `trip_date`, więc
        // zapytanie umie zawęzić je dokładnie do pokazywanego miesiąca — w odróżnieniu
        // od zleceń, które trzeba brać z szerszego okna, bo filtrują się po `created_at`.
        const oknoDiet = monthWindow(month, 1);
        const [ordersPaged, otwartePaged, fPaged, aPaged, pdPaged, payPaged, fxRows] =
          await Promise.all([
            // STRONAMI, nie jednym zapytaniem: bez tego obowiązywał sufit `api.max_rows`
            // PostgREST (domyślnie 1000, bez błędu i bez śladu), a z tych wierszy liczy się
            // przychód i wynik miesiąca. Kafelek pokazywałby kwotę zaniżoną o nieznaną
            // wartość — i inną niż /monthly dla tego samego miesiąca.
            listOrdersAll(sb, m.companyId, { from: okno.from, to: okno.to, statuses: COUNTED }),
            // Liczniki operacyjne biorą CAŁĄ historię, ale tylko interesujące statusy:
            // zlecenie otwarte od roku dalej jest otwarte, a zawężenie po statusie
            // trzyma zbiór przy jednej stronie, zamiast ściągać archiwum firmy.
            listOrdersAll(sb, m.companyId, { statuses: [...OPEN, "delivered"] }),
            // Paliwo i AdBlue też stronami: `limit: 5000` był liczbą, która nigdy nie
            // działała — sufit `api.max_rows` (domyślnie 1000) jest niższy i przycina
            // odpowiedź bez błędu, a sortowanie malejące zabiera wtedy wiersze najstarsze
            // z okna. Wynik miesiąca wychodził z tego ZAWYŻONY (mniej kosztu), czyli
            // pomyłka w najbardziej mylącą stronę.
            listFuelLogsAll(sb, { from, to }),
            listFuelLogsAll(sb, { table: "adblue_logs", from, to }),
            // Diety: zakres dat jedzie DO BAZY. Dotąd szła tu cała historia firmy
            // z `limit: 5000`, a miesiąc odsiewała przeglądarka — więc po przekroczeniu
            // sufitu kafelek pokazywał kwotę zaniżoną albo pustą, nie do odróżnienia
            // od miesiąca, w którym nikt nie jeździł.
            listPerDiemTripsAll(sb, m.companyId, { from: oknoDiet.from, to: oknoDiet.to }),
            // Saldo wypłat to CAŁA historia wpłat i wypłat — okna czasowego mieć nie może,
            // bo saldo policzone z wycinka nie jest saldem. Tym bardziej musi schodzić
            // stronami: obcięcie zbioru zmienia tu kwotę „do wypłaty" w dowolną liczbę.
            listDriverPayoutsAll(sb, m.companyId),
            // Kursy z zapasem wstecz: kurs bierzemy z DNIA zdarzenia, a EBC nie
            // publikuje w weekendy, więc wpis z 1. dnia miesiąca może potrzebować
            // notowania sprzed kilku dni.
            listFxRates(sb, {
              from: new Date(Date.parse(from) - 10 * 86_400_000).toISOString().slice(0, 10),
            }),
          ]);
        const rates = toFxRates(fxRows);
        const orders = ordersPaged.rows;
        const inMonth = (d: string) => d.slice(0, 7) === month;
        // [#378] Liczymy pozycje, które mają kwotę, ale przepadły na braku
        // notowania — tylko te z bieżącego miesiąca, bo tylko one wchodzą do KPI.
        let noRate = 0;
        const toCost = (r: CostRow) => {
          // [#376] Kwota przeliczona na EUR. Wcześniej wchodziła tu surowa
          // wartość `price_total` — koszt w PLN sumował się jak euro.
          const priceTotal = rowAmountEur(r.price_total, r.currency, r.occurred_at, rates);
          if (r.price_total != null && priceTotal == null && inMonth(r.occurred_at)) noRate++;
          return {
            vehicleId: r.vehicle_id,
            priceTotal,
            // [#376] Data ZDARZENIA. Okno zapytania działa na `occurred_at`, więc
            // grupowanie po `created_at` sprawiało, że wpis zsynchronizowany
            // w kolejnym miesiącu nie trafiał do KPI w ŻADNYM miesiącu.
            date: r.occurred_at.slice(0, 10),
          };
        };
        // [#378] Zlecenia normalizowane do euro TU, na granicy odczytu — ten sam
        // wzorzec co w /monthly i /stats. Wcześniej szła tu surowa `price` z surową
        // `currency`, a `monthlyFleetSummary` odsiewa wszystko poza EUR: przychód
        // z faktury w złotówkach po prostu znikał. Efekt był gorszy niż sama
        // zaniżona liczba — pulpit i /monthly pokazywały dla tego samego miesiąca
        // dwie różne kwoty. Silnika nie ruszamy: dostaje kwotę już przeliczoną
        // i walutę „EUR", więc granica przeliczenia zostaje w jednym miejscu.
        const orderEntries = orders.map((o) => {
          // Data ZAŁADUNKU (fallback: utworzenie) — kurs ma odpowiadać zdarzeniu.
          const date = o.load_date ?? o.created_at.slice(0, 10);
          const price = rowAmountEur(o.price, o.currency, date, rates);
          // Bez sprawdzania statusu: zapytanie oddaje wyłącznie `COUNTED`.
          if (o.price != null && price == null && inMonth(date)) noRate++;
          return {
            vehicleId: o.vehicle_id,
            priceEur: price,
            status: o.status,
            date,
          };
        });
        const summary = monthlyFleetSummary({
          month,
          orders: orderEntries,
          fuel: (fPaged.rows as CostRow[]).map(toCost),
          adblue: (aPaged.rows as CostRow[]).map(toCost),
        });
        const pdTotals = sumPerDiem(
          pdPaged.rows
            // Filtr zostaje mimo zawężenia w zapytaniu: warstwa danych CELOWO przepuszcza
            // podróże bez `trip_date` (nie da się ich umiejscowić w czasie, więc zakres
            // ich nie ukrywa), a do kwoty miesiąca wchodzić nie mogą.
            .filter((p) => p.trip_date?.startsWith(month))
            .map((p) =>
              computePerDiem({
                destination: p.destination ?? "",
                mode: p.mode,
                hours: p.hours,
                dailyRate: p.daily_rate,
                currency: p.currency,
              }),
            ),
        );
        const payBalances = settleDriverPayouts(
          payPaged.rows.map((p) => ({ kind: p.kind, amount: p.amount, currency: p.currency })),
        ).filter((b) => b.balance !== 0);
        setKpi({
          inProgress: otwartePaged.rows.filter((o) => OPEN_SET.has(o.status)).length,
          toInvoice: otwartePaged.rows.filter((o) => o.status === "delivered").length,
          revenue: summary.totals.revenueEur,
          net: summary.totals.net,
          perDiem: pdTotals.length
            ? pdTotals.map((t) => `${t.amount} ${t.currency}`).join(" · ")
            : "—",
          payout: payBalances.length
            ? payBalances.map((b) => `${b.balance} ${b.currency}`).join(" · ")
            : "—",
          noRate,
          incomplete:
            !ordersPaged.complete || !otwartePaged.complete || !fPaged.complete || !aPaged.complete,
          perDiemIncomplete: !pdPaged.complete,
          payoutIncomplete: !payPaged.complete,
        });
      } catch {
        // offline / brak dostępu → ukryj pasek
      }
    })();
  }, []);

  if (!kpi) return null;
  const month = new Date().toISOString().slice(0, 7);
  /**
   * Ostrzeżenie idzie przez katalog komunikatów, choć etykiety kafelków są w tym pliku
   * po polsku na sztywno. Rozjazd jest świadomy: „Diety (mies.)" da się odgadnąć z kwoty
   * obok, a zdanie „ta kwota jest nieprawdziwa" — nie. Podpis, którego użytkownik nie
   * czyta w swoim języku, nie ostrzega przed niczym.
   */
  const niepelne = `⚠️ ${t("dashboard.kpi.incomplete")}`;

  return (
    <div style={styles.strip}>
      <Card href="/orders" label="Zlecenia w toku" value={String(kpi.inProgress)} />
      <Card href="/orders" label="Do zafakturowania" value={String(kpi.toInvoice)} accentZero />
      <Card
        href="/monthly"
        label={`Wynik ${month} (EUR)`}
        value={`${kpi.net} €`}
        accent={kpi.net >= 0 ? palette.success : palette.red}
        // [#378] Gdy czegoś nie dało się przeliczyć, mówimy to wprost. Kafelek bez
        // tego dopisku obiecywałby pełny wynik miesiąca, którym nie jest.
        sub={[
          `przychód ${kpi.revenue} €`,
          kpi.noRate > 0 ? `${kpi.noRate} poz. bez kursu (nie wliczono)` : "",
          // Sufit pobrania unieważnia liczbę nad tym podpisem, więc mówi o tym
          // wprost, zamiast pozwolić jej wyglądać na kompletną.
          kpi.incomplete ? niepelne : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <Card
        href="/per-diem"
        label="Diety (mies.)"
        value={kpi.perDiem}
        small
        sub={kpi.perDiemIncomplete ? niepelne : undefined}
      />
      <Card
        href="/payouts"
        label="Saldo do wypłaty"
        value={kpi.payout}
        small
        sub={kpi.payoutIncomplete ? niepelne : undefined}
      />
    </div>
  );
}

function Card({
  href,
  label,
  value,
  sub,
  accent,
  accentZero,
  small,
}: {
  href: string;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  accentZero?: boolean;
  small?: boolean;
}) {
  const isZero = value === "0";
  return (
    <Link href={href} style={styles.card}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div
        style={{
          fontSize: small ? 18 : 24,
          fontWeight: 800,
          marginTop: 4,
          color: accent ?? (accentZero && !isZero ? palette.warning : palette.offWhite),
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: palette.smoke, marginTop: 2 }}>{sub}</div>}
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  strip: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 },
  card: {
    flex: 1,
    minWidth: 160,
    padding: "14px 18px",
    borderRadius: 12,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    color: palette.offWhite,
    textDecoration: "none",
  },
};
