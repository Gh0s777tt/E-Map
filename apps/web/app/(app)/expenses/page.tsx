"use client";

/**
 * #288: Rejestr wydatków kierowców — zarząd przegląda zgłoszenia z aplikacji
 * (opłaty drogowe, parkingi, naprawy…), otwiera paragon i zatwierdza/odrzuca
 * do rozliczenia. Kierowca widzi tu wyłącznie własne wpisy (RLS).
 */
import {
  DEFAULT_PAGE_SIZE,
  type DriverExpense,
  EXPENSE_CATEGORY_LABELS,
  expensePhotoUrl,
  listDriverExpenses,
  listDriverExpensesAll,
  type PagedRows,
  setDriverExpenseStatus,
} from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { ShowMore } from "@/components/ShowMore";
import { useToast } from "@/components/Toast";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { queryErrorMessage } from "@/lib/queryError";
import { queryKeys } from "@/lib/queryKeys";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useRenderWindow } from "@/lib/useRenderWindow";

/**
 * Okno archiwum decyzji — RÓWNE sufitowi serwera i to jest cały sens tej liczby.
 *
 * Wyższa wartość nie da więcej wierszy (`api.max_rows` PostgREST przycina odpowiedź bez
 * błędu), za to sprawi, że pełna strona przestanie znaczyć „było więcej" — czyli zabierze
 * jedyny sygnał, po którym da się poznać, że archiwum jest ucięte.
 */
const HISTORY_LIMIT = DEFAULT_PAGE_SIZE;

export default function ExpensesPage() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  // #288: etykiety statusów przez t() (kolor bez zmian); mapa lokalna, bo używa tłumacza.
  const STATUS_META: Record<DriverExpense["status"], { label: string; color: string }> = {
    submitted: { label: t("expenses.status.submitted"), color: palette.warning },
    approved: { label: t("expenses.status.approved"), color: palette.success },
    rejected: { label: t("expenses.status.rejected"), color: palette.danger },
  };
  const [filter, setFilter] = useState<"all" | DriverExpense["status"]>("all");
  // #297: zaznaczanie zgłoszeń „do rozliczenia" → hurtowe Zatwierdź/Odrzuć
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // #310: TanStack Query — cache + refetch zamiast ręcznych useState/useEffect.
  const membership = useQuery({
    queryKey: queryKeys.membership(),
    queryFn: () => getCachedMembership(getBrowserSupabase()),
  });
  const manage = membership.data?.role === "owner" || membership.data?.role === "dispatcher";
  // Fala 2: klucz listy niesie firmę. `listDriverExpenses` nie przyjmuje `companyId`
  // (zasięg wierszy daje RLS), więc pod gołym kluczem wpis cache przeżyłby zmianę
  // członkostwa i przez `staleTime` pokazywał zgłoszenia poprzedniej firmy.
  const expensesKey = queryKeys.driverExpenses(membership.data?.companyId ?? null);
  /**
   * Zgłoszenia CZEKAJĄCE na decyzję — stronami, czyli w komplecie.
   *
   * Ten zbiór i tylko ten musi być pełny: z niego liczy się suma w nagłówku i on jest
   * pracą do wykonania na tym ekranie. Dawne `limit: 300` bolało podwójnie — suma z okna
   * 300 najnowszych wpisów jest po prostu inną kwotą, a najstarsze zgłoszenia to
   * dokładnie te, które najdłużej czekają na decyzję: wypadały z listy zamiast trafić
   * na jej górę. Zawężenie statusu idzie do BAZY, więc komplet znaczy „komplet
   * nierozpatrzonych", a nie „cała historia wydatków firmy".
   */
  const pendingQuery = useQuery({
    queryKey: [...expensesKey, "submitted"],
    queryFn: () => listDriverExpensesAll(getBrowserSupabase(), { status: "submitted" }),
    // Dopiero po rozstrzygnięciu członkostwa — inaczej dane wylądowałyby pod kluczem `null`
    // i zaraz potem trzeba by je pobrać drugi raz pod właściwym.
    enabled: !membership.isPending,
  });
  /**
   * Archiwum decyzji — świadome OKNO, nie komplet.
   *
   * Zatwierdzone i odrzucone wpisy nie wchodzą do żadnej sumy na tym ekranie i nikt na
   * nie nie czeka; pobieranie stronami całej historii firmy oznaczałoby kilkadziesiąt
   * sekwencyjnych zapytań i kilkadziesiąt tysięcy kart przy każdym wejściu. Limit równy
   * sufitowi serwera (`api.max_rows`), bo tylko wtedy pełna strona naprawdę znaczy
   * „było więcej" — i tylko wtedy da się to powiedzieć zamiast przemilczeć.
   */
  const historyQuery = useQuery({
    queryKey: [...expensesKey, "decided"],
    queryFn: () => listDriverExpenses(getBrowserSupabase(), { limit: HISTORY_LIMIT }),
    enabled: !membership.isPending,
  });
  const pending = useMemo(() => pendingQuery.data?.rows ?? [], [pendingQuery.data]);
  const historyRaw = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);
  /** Rozpatrzone wpisy z okna archiwum — `submitted` przychodzą z kompletnego zbioru wyżej. */
  const decided = useMemo(() => historyRaw.filter((r) => r.status !== "submitted"), [historyRaw]);
  /*
   * Złączenie z odsianiem powtórzeń po `id`.
   *
   * Oba zapytania mają rozłączne statusy, ale tylko w spoczynku: między optymistyczną
   * decyzją a odświeżeniem `pendingQuery` ten sam wiersz ma w cache status „approved",
   * a w archiwum może już figurować z bazy. Bez odsiania React dostałby dwa węzły
   * z tym samym kluczem, a suma policzyłaby wpis dwa razy.
   */
  const rows = useMemo(() => {
    const byId = new Map(pending.map((r) => [r.id, r]));
    for (const r of decided) if (!byId.has(r.id)) byId.set(r.id, r);
    return [...byId.values()];
  }, [pending, decided]);
  /** Nierozpatrzone nie dojechały w komplecie — suma w nagłówku jest zaniżona. */
  const incomplete = pendingQuery.data?.complete === false;
  /** Archiwum dobiło do sufitu serwera — starsze decyzje są poza oknem tego ekranu. */
  const historyTruncated = historyRaw.length >= HISTORY_LIMIT;
  const loading = membership.isPending || pendingQuery.isPending || historyQuery.isPending;
  // Błąd odczytu członkostwa był tu dotąd POŁYKANY: `manage` schodziło cicho na false,
  // więc właściciel dostawał listę bez przycisków Zatwierdź/Odrzuć i żadnego komunikatu —
  // ekran wyglądał jak brak uprawnień, a był to błąd sieci. Łączymy oba błędy, jak
  // pozostałe ekrany fali 2. `queryErrorMessage` zamiast `??`, bo `??` nie łapie pustego
  // `message` (Error z pustym komunikatem dałby „⚠️ Błąd ładowania." bez zdania).
  const error = queryErrorMessage(
    membership.error ?? pendingQuery.error ?? historyQuery.error,
    t("expenses.loadError"),
  );
  /** „Ponów": błąd mógł pochodzić z odczytu członkostwa, więc ponawiamy wszystkie zapytania. */
  const load = () => {
    void membership.refetch();
    void pendingQuery.refetch();
    void historyQuery.refetch();
  };
  /**
   * Optymistyczna aktualizacja cache — w zbiorze NIEROZPATRZONYCH.
   *
   * Decyzja zmienia status wiersza, a nie to, którym zapytaniem przyszedł, więc wiersz
   * zostaje tam, gdzie był, tylko z nowym statusem — i „Cofnij" ma co przywrócić.
   * Podmieniamy wyłącznie `rows`, zachowując `complete` i `pages`: zgubienie tego
   * znacznika po pierwszej decyzji schowałoby ostrzeżenie o zaniżonej sumie.
   */
  const setRows = (up: (list: DriverExpense[]) => DriverExpense[]) =>
    qc.setQueryData<PagedRows<DriverExpense>>([...expensesKey, "submitted"], (old) =>
      old ? { ...old, rows: up(old.rows) } : old,
    );

  async function decide(row: DriverExpense, status: "approved" | "rejected") {
    const prev = row.status;
    setRows((list) => list.map((x) => (x.id === row.id ? { ...x, status } : x)));
    try {
      await setDriverExpenseStatus(getBrowserSupabase(), row.id, status);
      // #295: decyzja odwracalna z toasta — „Cofnij" przywraca „do rozliczenia".
      toast(
        status === "approved" ? t("expenses.approvedToast") : t("expenses.rejectedToast"),
        "success",
        {
          label: t("expenses.undo"),
          onClick: () => {
            void (async () => {
              try {
                await setDriverExpenseStatus(getBrowserSupabase(), row.id, prev);
                setRows((list) => list.map((x) => (x.id === row.id ? { ...x, status: prev } : x)));
                toast(t("expenses.restoredOne"), "info");
              } catch {
                toast(t("expenses.undoError"), "error");
              }
            })();
          },
        },
      );
    } catch (e) {
      setRows((list) => list.map((x) => (x.id === row.id ? { ...x, status: prev } : x)));
      toast(e instanceof Error ? e.message : t("expenses.statusError"), "error");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** #297: decyzja hurtem — z „Cofnij" przywracającym całą udaną partię. */
  async function bulkDecide(status: "approved" | "rejected") {
    const ids = [...selected];
    if (ids.length === 0) return;
    setRows((list) => list.map((x) => (selected.has(x.id) ? { ...x, status } : x)));
    setSelected(new Set());
    const sb = getBrowserSupabase();
    const results = await Promise.allSettled(
      ids.map((id) => setDriverExpenseStatus(sb, id, status)),
    );
    const ok = ids.filter((_, i) => results[i]?.status === "fulfilled");
    const failed = ids.filter((_, i) => results[i]?.status === "rejected");
    if (failed.length > 0) {
      setRows((list) =>
        list.map((x) => (failed.includes(x.id) ? { ...x, status: "submitted" } : x)),
      );
    }
    const verb = status === "approved" ? t("expenses.bulkApproved") : t("expenses.bulkRejected");
    toast(
      failed.length > 0
        ? `${verb} ${ok.length}/${ids.length}${t("expenses.bulkPartialSuffix")}`
        : `${verb} ${ok.length} ${t("expenses.bulkDoneSuffix")}`,
      failed.length > 0 ? "error" : "success",
      ok.length > 0
        ? {
            label: t("expenses.undo"),
            onClick: () => {
              void (async () => {
                const back = await Promise.allSettled(
                  ok.map((id) => setDriverExpenseStatus(sb, id, "submitted")),
                );
                const restored = ok.filter((_, i) => back[i]?.status === "fulfilled");
                setRows((list) =>
                  list.map((x) => (restored.includes(x.id) ? { ...x, status: "submitted" } : x)),
                );
                toast(
                  `${t("expenses.restoredBulkPrefix")}${restored.length}${t("expenses.restoredBulkSuffix")}`,
                  "info",
                );
              })();
            },
          }
        : undefined,
    );
  }

  async function openPhoto(path: string) {
    try {
      const url = await expensePhotoUrl(getBrowserSupabase(), path);
      window.open(url, "_blank", "noopener");
    } catch {
      toast(t("expenses.photoError"), "error");
    }
  }

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );
  /**
   * Okno renderowania. Filtry i suma liczą się z kompletu (`rows`), a w DOM ląduje tylko
   * tyle kart, ile ktoś przegląda — każda niesie checkbox i przycisk paragonu, więc
   * flota zgłaszająca kilkadziesiąt paragonów dziennie montowała ich tu dziesiątki tysięcy.
   */
  const okno = useRenderWindow(visible);
  const pendingSum = useMemo(() => {
    const byCur = new Map<string, number>();
    for (const r of rows.filter((x) => x.status === "submitted")) {
      byCur.set(r.currency, (byCur.get(r.currency) ?? 0) + r.amount);
    }
    return [...byCur.entries()].map(([c, v]) => `${v.toFixed(2)} ${c}`).join(" · ") || "0";
  }, [rows]);

  return (
    <div>
      <PageHeader
        title={t("nav.expenses")}
        subtitle={`${t("expenses.subtitlePrefix")}${pendingSum}`}
      />

      {/* Pod nagłówkiem, bo unieważnia przede wszystkim kwotę, która w nim stoi. */}
      {incomplete && <div style={s.incomplete}>⚠️ {t("expenses.incomplete")}</div>}
      {/* Osobno od sumy: archiwum decyzji jest oknem świadomie, a nie awaryjnie —
          ale okno przemilczane wygląda dokładnie jak komplet. */}
      {historyTruncated && filter !== "submitted" && (
        <div style={s.incomplete}>
          ℹ️ {t("expenses.historyWindow").replace("{n}", String(HISTORY_LIMIT))}
        </div>
      )}

      <div style={s.filters}>
        {(["all", "submitted", "approved", "rejected"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            style={{ ...s.filterBtn, ...(filter === k ? s.filterOn : {}) }}
          >
            {k === "all" ? t("common.all") : STATUS_META[k].label}
            {k === "submitted" && rows.some((r) => r.status === "submitted")
              ? ` (${rows.filter((r) => r.status === "submitted").length})`
              : ""}
          </button>
        ))}
      </div>

      <ListStatus
        loading={loading}
        error={error}
        empty={!loading && visible.length === 0}
        emptyText={t("expenses.empty")}
        emptyIcon="receipt"
        onRetry={load}
      />

      <div style={s.list}>
        {okno.visible.map((r) => {
          const st = STATUS_META[r.status];
          return (
            <div key={r.id} style={s.card}>
              <div style={s.cardHead}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {manage && r.status === "submitted" && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      aria-label={t("expenses.selectAria")}
                      style={s.selectBox}
                    />
                  )}
                  <strong style={s.amount}>
                    {r.amount.toFixed(2)} {r.currency}
                  </strong>
                </span>
                <span style={{ ...s.status, color: st.color, borderColor: st.color }}>
                  {st.label}
                </span>
              </div>
              <div style={s.meta}>
                {EXPENSE_CATEGORY_LABELS[r.category]} · {r.expense_date}
                {r.note ? ` · ${r.note}` : ""}
              </div>
              <div style={s.actions}>
                {r.photo_path && (
                  <Button variant="ghost" onClick={() => openPhoto(r.photo_path as string)}>
                    {t("expenses.receipt")}
                  </Button>
                )}
                {manage && r.status === "submitted" && (
                  <>
                    <Button onClick={() => decide(r, "approved")}>{t("expenses.approve")}</Button>
                    <Button variant="ghost" onClick={() => decide(r, "rejected")}>
                      {t("expenses.reject")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <ShowMore hidden={okno.hidden} onShowMore={okno.showMore} />
      </div>

      {/* #297: pływający pasek akcji zbiorczych */}
      {manage && selected.size > 0 && (
        <div style={s.bulkBar}>
          <strong>
            {selected.size} {t("expenses.selectedShort")}
          </strong>
          <Button onClick={() => bulkDecide("approved")}>{t("expenses.approve")}</Button>
          <Button variant="ghost" onClick={() => bulkDecide("rejected")}>
            {t("expenses.reject")}
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setSelected(new Set(rows.filter((r) => r.status === "submitted").map((r) => r.id)))
            }
          >
            {t("common.all")}
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            {t("expenses.clear")}
          </Button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  /** Ta sama ramka ostrzeżenia co na pozostałych ekranach z niepełnym zbiorem. */
  incomplete: {
    border: `1px solid ${palette.warning}`,
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 12,
    color: palette.offWhite,
    fontSize: 13,
    lineHeight: 1.5,
  },
  filters: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  filterBtn: {
    background: "transparent",
    border: `1px solid ${palette.graphite}`,
    color: palette.smoke,
    borderRadius: 999,
    padding: "7px 14px",
    cursor: "pointer",
    fontSize: 13,
  },
  filterOn: { background: palette.red, borderColor: palette.red, color: "#fff", fontWeight: 700 },
  list: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" },
  card: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 14,
    padding: 16,
    display: "grid",
    gap: 8,
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  amount: { fontSize: 20 },
  status: {
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid",
    borderRadius: 999,
    padding: "3px 10px",
  },
  meta: { color: palette.smoke, fontSize: 13 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  selectBox: { width: 16, height: 16, accentColor: palette.red, cursor: "pointer" },
  bulkBar: {
    position: "fixed",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 60,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "10px 16px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
  },
};
