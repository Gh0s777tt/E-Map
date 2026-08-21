"use client";

/**
 * #288: Scoring kierowców (mockup 11) — ranking liczony z realnych danych
 * ostatnich 90 dni: terminowość dostaw (dostarczone ≤ planowanego rozładunku),
 * dyscyplina checklist i aktywność (zlecenia). Wynik 1–5 gwiazdek:
 *   60% terminowość + 30% checklisty + 10% wolumen (znormalizowany).
 */
import {
  type CompanyMember,
  listChecklistSubmissionsAll,
  listCompanyMembers,
  listOrdersAll,
} from "@e-logistic/api";
import { computeDriverGamification } from "@e-logistic/core";
import type { MessageKey } from "@e-logistic/i18n";
import { cssPalette as palette } from "@e-logistic/ui";
import { useQuery } from "@tanstack/react-query";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { queryErrorMessage } from "@/lib/queryError";
import { queryKeys } from "@/lib/queryKeys";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Score {
  userId: string;
  label: string;
  delivered: number;
  onTimePct: number | null;
  checklists: number;
  stars: number;
  level: number;
  rank: string;
  points: number;
}

// #334: nazwy rang (klucz silnika gamifikacji → klucz i18n).
const RANK_LABEL: Record<string, MessageKey> = {
  rookie: "scoring.rank.rookie",
  driver: "scoring.rank.driver",
  pro: "scoring.rank.pro",
  veteran: "scoring.rank.veteran",
  master: "scoring.rank.master",
  legend: "scoring.rank.legend",
};

/**
 * Wynik rankingu razem z informacją o kompletności zbiorów.
 *
 * Kompletność jedzie w tym samym obiekcie co wiersze, bo dotyczy dokładnie ich:
 * osobny stan dałoby się przeoczyć przy renderowaniu tabeli, a tabela bez tej
 * informacji wygląda jak ranking, nie jak szacunek.
 */
interface Ranking {
  rows: Score[];
  /** Zlecenia albo checklisty urwały się na sufit pobrania — patrz baner. */
  incomplete: boolean;
}

function stars(n: number): string {
  const full = Math.round(Math.max(0, Math.min(5, n)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function ScoringPage() {
  const t = useT();

  const rankLabel = (r: string) => {
    const key = RANK_LABEL[r];
    return key ? t(key) : r;
  };

  // #310 (fala 2): ranking przez TanStack Query. To najdroższy odczyt w panelu —
  // zlecenia z 90 dni i checklisty, oba pobierane stronami, plus przeliczenie
  // gamifikacji; bez cache płaci się je od nowa przy każdym wejściu na zakładkę.
  const membership = useQuery({
    queryKey: queryKeys.membership(),
    queryFn: () => getCachedMembership(getBrowserSupabase()),
  });
  const companyId = membership.data?.companyId ?? null;

  const scoringQuery = useQuery({
    queryKey: queryKeys.driverScoring(companyId),
    queryFn: async (): Promise<Ranking> => {
      const sb = getBrowserSupabase();
      // Brak firmy to tutaj błąd, nie pusta lista — rankingu nie ma z czego policzyć.
      if (!companyId) throw new Error(t("scoring.noCompany"));
      const from = new Date(Date.now() - 90 * 86_400_000).toISOString();
      // Oba zbiory stronami. Dawne `limit: 2000` i `limit: 1000` nie chroniły przed
      // niczym — powyżej `api.max_rows` (1000) PostgREST i tak przycinał odpowiedź
      // bez błędu. Tu obcięcie psuje MIANOWNIK: terminowość i dyscyplina checklist to
      // odsetki, a tysiąc najnowszych wpisów całej firmy należy głównie do kierowców
      // jeżdżących najczęściej. Rzadziej jeżdżący dostawał ocenę z kilku przypadkowych
      // zleceń — i wypadał w rankingu niżej z powodu sposobu pobrania danych.
      /*
       * Okno 90 dni idzie do BAZY dla OBU zbiorów — także dla checklist.
       *
       * Domknięcie go w przeglądarce kosztowało dwa razy. Raz transferem: zgłoszenie
       * niesie kolumnę `answers` (JSON), więc firma z trzyletnią historią ściągała
       * dziesiątki megabajtów po to, żeby odrzucić 97% wierszy. Drugi raz — i gorzej —
       * znaczeniem `complete`: flaga opisywała CAŁĄ historię firmy, a nie okno, które
       * ekran liczy, więc baner „ranking jest niepełny, nie opieraj na nim premii"
       * zapalał się na stałe u firmy, której 90 dni mieści się w jednej stronie.
       */
      const [members, ordPaged, subsPaged] = await Promise.all([
        listCompanyMembers(sb),
        listOrdersAll(sb, companyId, { from }),
        listChecklistSubmissionsAll(sb, companyId, { from }),
      ]);
      const orders = ordPaged.rows;
      const subs = subsPaged.rows;

      const drivers = (members as CompanyMember[]).filter((x) => x.role === "driver");
      const pool = drivers.length > 0 ? drivers : (members as CompanyMember[]);

      const today = new Date().toISOString().slice(0, 10);
      const maxDelivered = Math.max(
        1,
        ...pool.map(
          (d) =>
            orders.filter((o) => o.assigned_to === d.user_id && o.status !== "cancelled").length,
        ),
      );

      const scored: Score[] = pool.map((d) => {
        const mine = orders.filter((o) => o.assigned_to === d.user_id);
        const finished = mine.filter((o) => o.status === "delivered" || o.status === "invoiced");
        // Terminowość: zlecenia z minioną datą rozładunku, które są domknięte.
        const due = mine.filter(
          (o) => o.unload_date && o.unload_date < today && o.status !== "cancelled",
        );
        const onTime = due.filter(
          (o) => o.status === "delivered" || o.status === "invoiced",
        ).length;
        const onTimePct = due.length > 0 ? onTime / due.length : null;
        // #audyt B1: złącz po driver_user_id (= auth.uid wypełniającego = user_id członka).
        // NIE po driver_label (to imię/nazwisko, nie e-mail) ani driver_id (to FK do
        // drivers(id), inna przestrzeń niż user_id) — inaczej składnik checklist (30%) = 0.
        const myChecklists = subs.filter((c) => c.driver_user_id === d.user_id).length;

        const cScore = Math.min(1, myChecklists / 20);

        const vScore = finished.length / maxDelivered;
        const base = (onTimePct ?? 0.7) * 0.6 + cScore * 0.3 + vScore * 0.1;
        /*
         * #334: profil gamifikacji z tych samych statystyk (bez km/spalania tutaj).
         *
         * Wszystkie metryki tego ekranu są z okna 90 dni — dostawy były nim objęte od
         * początku, checklisty dołączyły razem z zejściem filtra do bazy. Progi odznak
         * w `gamification.ts` są skalibrowane pod licznik SKUMULOWANY, więc odznaka
         * policzona tutaj mówi o formie z kwartału, a nie o dorobku kierowcy. To jest
         * ta sama liczba, którą ekran deklaruje w podtytule i w nagłówku kolumny —
         * i dlatego nagłówek mówi „(90 dni)" wprost, zamiast zostawiać domysł.
         */
        const g = computeDriverGamification({
          deliveries: finished.length,
          onTimePct,
          checklists: myChecklists,
          km: 0,
          avgConsumption: null,
          tenureMonths: 0,
          defectsReported: 0,
          activeStreakDays: 0,
        });
        return {
          userId: d.user_id,
          label: d.email,
          delivered: finished.length,
          onTimePct,
          checklists: myChecklists,
          stars: 1 + base * 4,
          level: g.level,
          rank: g.rankKey,
          points: g.points,
        };
      });

      scored.sort((a, b) => b.points - a.points || b.stars - a.stars);
      return { rows: scored, incomplete: !ordPaged.complete || !subsPaged.complete };
    },
    enabled: !membership.isPending,
  });
  const rows = scoringQuery.data?.rows ?? [];
  const loading = membership.isPending || scoringQuery.isPending;
  const error = queryErrorMessage(membership.error ?? scoringQuery.error, t("scoring.loadError"));
  /** „Ponów": błąd mógł pochodzić z odczytu członkostwa, więc ponawiamy oba zapytania. */
  const retry = () => {
    void membership.refetch();
    void scoringQuery.refetch();
  };

  return (
    <div>
      <PageHeader title={t("scoring.title")} subtitle={t("scoring.subtitle")} />

      {/* Nad tabelą, bo unieważnia nie pojedynczy wiersz, tylko KOLEJNOŚĆ — a po niej
          właśnie czyta się ten ekran. */}
      {scoringQuery.data?.incomplete && <div style={s.warn}>⛔ {t("scoring.incomplete")}</div>}

      <ListStatus
        loading={loading}
        error={error}
        empty={!loading && rows.length === 0}
        emptyText={t("scoring.empty")}
        onRetry={retry}
      />

      {rows.length > 0 && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  "#",
                  t("scoring.colDriver"),
                  t("scoring.colLevel"),
                  t("scoring.colPoints"),
                  t("scoring.colDeliveries"),
                  t("scoring.colOnTime"),
                  t("scoring.colChecklists"),
                  t("scoring.colRating"),
                ].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} style={i === 0 ? s.topRow : undefined}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>
                    {i === 0 ? "🏆 " : ""}
                    {r.label}
                  </td>
                  <td style={s.td}>
                    <span style={s.rankPill}>
                      {r.level} · {rankLabel(r.rank)}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {r.points}
                  </td>
                  <td style={s.td}>{r.delivered}</td>
                  <td style={s.td}>
                    {r.onTimePct === null ? "—" : `${Math.round(r.onTimePct * 100)}%`}
                  </td>
                  <td style={s.td}>{r.checklists}</td>
                  <td style={{ ...s.td, color: palette.red, letterSpacing: 2 }}>
                    {stars(r.stars)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={s.note}>{t("scoring.note")}</p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  /** Ostrzeżenie o niepełnym zbiorze — ten sam styl co na /monthly i /vehicles/[id]. */
  warn: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 12,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 1.5,
    background: palette.nearBlack,
  },
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
  topRow: { background: "rgba(229, 9, 20, 0.08)" },
  rankPill: {
    display: "inline-block",
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  note: { color: palette.smoke, fontSize: 12.5, marginTop: 16, lineHeight: 1.6 },
};
