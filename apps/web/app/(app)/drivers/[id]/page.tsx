"use client";

import {
  type CompanyMember,
  type DriverRow,
  linkDriverUser,
  listCompanyMembers,
  listDrivers,
  listFxRates,
  listOrdersAll,
  type Order,
  toFxRates,
} from "@e-logistic/api";
import {
  type ExpiryLevel,
  expiryStatus,
  type FxRate,
  round2,
  rowAmountEur,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { MemberPermissionsEditor } from "@/components/MemberPermissionsEditor";
import { useToast } from "@/components/Toast";
import { Badge, PageHeader } from "@/components/ui";
import { orderStatusLabel } from "@/lib/labels";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const EXPIRY_DOCS: { key: keyof DriverRow; label: string }[] = [
  { key: "license_expiry", label: "Prawo jazdy" },
  { key: "code95_expiry", label: "Kod 95" },
  { key: "medical_expiry", label: "Badania lekarskie" },
  { key: "psychotech_expiry", label: "Psychotechniczne" },
  { key: "adr_expiry", label: "ADR" },
];
const EXPIRY_COLOR: Record<ExpiryLevel, string> = {
  expired: palette.red,
  soon: "#f59e0b",
  ok: "#22c55e",
};

export default function DriverCardPage() {
  const t = useT();
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  /**
   * Historia zleceń kierowcy nie zmieściła się w sufit pobrania.
   *
   * Przychód kierowcy bywa podstawą rozmowy o premii, a zaniżony wygląda identycznie
   * jak prawdziwy; trzymamy więc znacznik i piszemy o tym przy liczbach.
   */
  const [ordersIncomplete, setOrdersIncomplete] = useState(false);
  /** [#378] Kursy EBC — bez nich zlecenie w walucie innej niż euro nie ma jak wejść do przychodu. */
  const [rates, setRates] = useState<FxRate[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    setOrdersIncomplete(false);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      if (m.role !== "owner" && m.role !== "dispatcher") {
        setDenied(true);
        return;
      }
      setCompanyId(m.companyId);
      // [#378] Okno notowań. Ten ekran nie ogranicza zleceń datą, a przed pobraniem
      // nie wiemy, jak stare jest najstarsze zlecenie kierowcy — bierzemy więc
      // 36 miesięcy wstecz (dłużej niż typowy staż na jednym pojeździe) plus
      // 10 dni zapasu, bo kurs bierzemy z dnia zdarzenia, a EBC nie publikuje
      // w weekendy i święta. Ten sam wzorzec co w /stats i /monthly. Gdyby mimo
      // to jakiejś pozycji zabrakło kursu, mówimy o tym wprost pod kafelkami,
      // zamiast po cichu zaniżać sumę.
      const now = new Date();
      const fxFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 35, 1))
        .toISOString()
        .slice(0, 10);
      const [drivers, mem, fxRows] = await Promise.all([
        listDrivers(sb, m.companyId),
        listCompanyMembers(sb),
        listFxRates(sb, {
          from: new Date(Date.parse(fxFrom) - 10 * 86_400_000).toISOString().slice(0, 10),
        }),
      ]);
      const kartoteka = drivers.find((d) => d.id === id) ?? null;
      setDriver(kartoteka);
      setMembers(mem);
      setRates(toFxRates(fxRows));
      /**
       * Zlecenia dopiero w drugiej fali — bo dopiero teraz znamy `user_id` kierowcy,
       * a filtr `assigned_to` należy do BAZY, nie do przeglądarki.
       *
       * Wcześniej ekran ściągał całą historię firmy stronami (u firmy z 25 000 zleceń
       * 26 kolejnych zapytań po 1000 wierszy) i odsiewał z niej jednego kierowcę, żeby
       * pokazać 15 pozycji i trzy kafelki. Jedno dodatkowe okrążenie kosztuje mniej niż
       * kilkadziesiąt sekund białego ekranu na telefonie — a wynik jest ten sam, tylko
       * kompletny dla kierowcy, zamiast kompletnego dla firmy i ucinanego na sufit.
       */
      const ordPaged = kartoteka?.user_id
        ? await listOrdersAll(sb, m.companyId, { assignedTo: kartoteka.user_id })
        : null;
      setOrders(ordPaged?.rows ?? []);
      setOrdersIncomplete(ordPaged ? !ordPaged.complete : false);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać kartoteki.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const drivers = useMemo(
    () => members.filter((mb) => mb.status === "active" && mb.role === "driver"),
    [members],
  );
  /**
   * Zbiór jest już zawężony do tego kierowcy przez zapytanie (`assigned_to`), więc
   * `orders` i „zlecenia kierowcy" to od tej pory to samo. Alias zostaje, bo pod tą
   * nazwą czyta go cała reszta ekranu.
   */
  const myOrders = orders;
  /**
   * [#378] Przychód kierowcy z dostarczonych zleceń — w euro, po kursie z dnia załadunku.
   *
   * Wcześniej filtr `o.currency === "EUR"` po cichu wyrzucał każde zlecenie
   * rozliczane w złotówkach, koronach czy forintach. Kierowca jeżdżący na
   * trasach krajowych widział przychód zaniżony — w skrajnym przypadku 0 € przy
   * kilkudziesięciu dostarczonych zleceniach — i nie było jak tego zauważyć, bo
   * licznik „Dostarczone" obok pokazywał komplet. Ta liczba bywa podstawą
   * rozmowy o premii, więc cicha strata jest tu najgorszym możliwym zachowaniem.
   */
  const stats = useMemo(() => {
    const delivered = myOrders.filter((o) => o.status === "delivered" || o.status === "invoiced");
    // Data ZDARZENIA (załadunek), a nie utworzenia wpisu: kurs ma odpowiadać
    // momentowi wykonania trasy, nie chwili, w której ktoś wklepał zlecenie do
    // systemu — te dwie daty potrafią dzielić tygodnie i kilka groszy na euro.
    const priced = delivered.map((o) => ({
      hasPrice: o.price != null,
      eur: rowAmountEur(o.price, o.currency, o.load_date ?? o.created_at, rates),
    }));
    // `eur === null` NIE zamieniamy na 0 w cichy sposób: zero znaczyłoby „trasa
    // za darmo". Pomijamy pozycję w sumie i liczymy, ile takich było.
    const revenueEur = round2(priced.reduce((a, o) => a + (o.eur ?? 0), 0));
    return {
      total: myOrders.length,
      delivered: delivered.length,
      revenueEur,
      /**
       * Zlecenia, które MAJĄ wpisaną kwotę, ale brakuje notowania na dany dzień.
       * To co innego niż „brak kwoty" i nie wolno tego zlewać w jeden licznik:
       * komunikat „uzupełnij kwotę" jest nie do wykonania dla kogoś, kto już
       * wpisał 1200 PLN — jemu brakuje kursu, nie danych.
       */
      missingRate: priced.filter((o) => o.hasPrice && o.eur == null).length,
    };
  }, [myOrders, rates]);

  async function changeLink(userId: string) {
    try {
      await linkDriverUser(getBrowserSupabase(), id, companyId, userId || null);
      toast("Zapisano powiązanie konta.", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Błąd powiązania.", "error");
    }
  }

  if (denied) {
    return (
      <div style={{ maxWidth: 820 }}>
        <PageHeader title="Karta kierowcy" subtitle="" />
        <p style={{ color: palette.red, marginTop: 16 }}>
          ⛔ Dostęp do kartoteki kierowców mają tylko właściciel/spedytor.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/drivers" className="app-navlink" style={{ fontSize: 13 }}>
          ← Kierowcy
        </Link>
      </div>

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={!loading && !driver}
        emptyText="Nie znaleziono kierowcy."
        onRetry={load}
      />

      {!loading && driver && (
        <>
          <PageHeader
            title={`${driver.last_name} ${driver.first_name}`.trim() || "Kierowca"}
            subtitle="Karta kierowcy: dokumenty i terminy, powiązane konto oraz historia zleceń."
          />

          {/* Dokumenty / terminy */}
          <h2 style={styles.h2}>Dokumenty i terminy</h2>
          <div style={styles.grid}>
            {EXPIRY_DOCS.map((doc) => {
              const date = driver[doc.key] as string | null;
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
          </div>

          {/* Uprawnienia */}
          <h2 style={styles.h2}>Uprawnienia</h2>
          <div style={{ ...styles.body, marginBottom: 4 }}>
            <span style={styles.dim}>Kategorie:</span>{" "}
            {driver.license_categories.length ? driver.license_categories.join(", ") : "—"}
          </div>
          <div style={styles.body}>
            {driver.qualifications.length ? (
              driver.qualifications.map((q) => (
                <span key={q} style={styles.tag}>
                  {q}
                </span>
              ))
            ) : (
              <span style={styles.dim}>Brak dodatkowych uprawnień.</span>
            )}
          </div>
          {driver.notes && <p style={{ ...styles.dim, marginTop: 8 }}>📝 {driver.notes}</p>}

          {/* Powiązane konto */}
          <h2 style={styles.h2}>Konto w aplikacji</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              style={styles.input}
              value={driver.user_id ?? ""}
              onChange={(e) => changeLink(e.target.value)}
            >
              <option value="">— niepowiązane —</option>
              {drivers.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.email}
                </option>
              ))}
            </select>
            <span style={styles.dim}>
              Powiązanie łączy kartotekę z kontem (do historii zleceń).
            </span>
          </div>

          {driver.user_id && companyId && (
            <MemberPermissionsEditor companyId={companyId} userId={driver.user_id} />
          )}

          {/* Historia zleceń */}
          <h2 style={styles.h2}>Historia zleceń</h2>
          {!driver.user_id ? (
            <p style={styles.dim}>
              Powiąż konto, aby zobaczyć zlecenia przypisane do tego kierowcy.
            </p>
          ) : (
            <>
              <div style={styles.statsRow}>
                <Stat label="Zleceń" value={String(stats.total)} />
                <Stat label="Dostarczone" value={String(stats.delivered)} />
                {/* [#378] Etykieta mówiła „Przychód (EUR)", ale opisywała nie walutę
                    wyniku, tylko to, że zlecenia w innych walutach w ogóle nie były
                    liczone. Teraz wszystko jest przeliczone, więc nazwa może być
                    uczciwa, a jednostkę widać przy samej kwocie. */}
                <Stat label="Przychód" value={`${stats.revenueEur} €`} accent="#22c55e" />
              </div>
              {/* Obcięcie na sufit pobrania unieważnia WSZYSTKIE trzy kafelki naraz —
                  także licznik zleceń, nie tylko sumę — więc komunikat idzie przed
                  ostrzeżeniem o brakującym kursie, które dotyczy pojedynczych pozycji. */}
              {ordersIncomplete && (
                <div style={styles.rateWarn}>
                  ⛔ Dane niepełne — historia zleceń tego kierowcy przekroczyła sufit pobrania, więc
                  część kursów w ogóle tu nie dotarła. Liczniki i przychód są zaniżone o nieznaną
                  wartość; nie opieraj na nich rozliczenia.
                </div>
              )}
              {/* [#378] „Brak kwoty" i „brak kursu" to dwie różne rzeczy — tu chodzi
                  wyłącznie o to drugie. Kwoty są wpisane, brakuje notowania na dzień
                  załadunku, więc suma jest niepełna i mówimy o tym wprost, zamiast
                  pokazywać zaniżoną liczbę jako komplet. */}
              {stats.missingRate > 0 && (
                <div style={styles.rateWarn}>
                  ⚠️ Suma niepełna — {stats.missingRate}{" "}
                  {stats.missingRate === 1 ? "zlecenie" : "zleceń"} w walucie bez notowania na dzień
                  załadunku. Kwoty są wpisane; brakuje kursu, więc nie weszły do przeliczenia.
                </div>
              )}
              {myOrders.length === 0 ? (
                <p style={styles.dim}>Brak zleceń przypisanych do tego kierowcy.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {myOrders.slice(0, 15).map((o) => (
                    <div key={o.id} style={styles.orderRow}>
                      <strong style={{ minWidth: 110 }}>{o.reference_no || "(bez nr)"}</strong>
                      <Badge color={palette.smoke}>{orderStatusLabel(t, o.status)}</Badge>
                      <span style={styles.dim}>
                        {o.origin || "?"} → {o.destination || "?"}
                      </span>
                      <span style={{ flex: 1 }} />
                      {o.price != null && (
                        <span style={styles.dim}>
                          {o.price} {o.currency}
                        </span>
                      )}
                      {o.load_date && <span style={styles.dim}>{o.load_date}</span>}
                    </div>
                  ))}
                  {myOrders.length > 15 && (
                    <span style={styles.dim}>…i {myOrders.length - 15} więcej</span>
                  )}
                </div>
              )}
            </>
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
    padding: "2px 10px",
    fontSize: 12,
  },
  input: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: palette.offWhite,
    minWidth: 220,
  },
  statsRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  /** [#378] Ostrzeżenie o niepełnej sumie — ten sam styl co na ekranie statystyk. */
  rateWarn: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 10,
    padding: "10px 14px",
    marginTop: 12,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 1.5,
    background: palette.nearBlack,
  },
  statCard: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "10px 16px",
    minWidth: 120,
  },
  orderRow: {
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
