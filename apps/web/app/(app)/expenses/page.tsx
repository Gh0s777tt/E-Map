"use client";

/**
 * #288: Rejestr wydatków kierowców — zarząd przegląda zgłoszenia z aplikacji
 * (opłaty drogowe, parkingi, naprawy…), otwiera paragon i zatwierdza/odrzuca
 * do rozliczenia. Kierowca widzi tu wyłącznie własne wpisy (RLS).
 */
import {
  type DriverExpense,
  EXPENSE_CATEGORY_LABELS,
  expensePhotoUrl,
  listDriverExpenses,
  setDriverExpenseStatus,
} from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useToast } from "@/components/Toast";
import { Button, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

const STATUS_META: Record<DriverExpense["status"], { label: string; color: string }> = {
  submitted: { label: "do rozliczenia", color: palette.warning },
  approved: { label: "zatwierdzony", color: palette.success },
  rejected: { label: "odrzucony", color: palette.danger },
};

export default function ExpensesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<DriverExpense[]>([]);
  const [manage, setManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | DriverExpense["status"]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      setManage(m?.role === "owner" || m?.role === "dispatcher");
      setRows(await listDriverExpenses(sb, { limit: 300 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się pobrać wydatków.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function decide(row: DriverExpense, status: "approved" | "rejected") {
    const prev = row.status;
    setRows((list) => list.map((x) => (x.id === row.id ? { ...x, status } : x)));
    try {
      await setDriverExpenseStatus(getBrowserSupabase(), row.id, status);
      // #295: decyzja odwracalna z toasta — „Cofnij" przywraca „do rozliczenia".
      toast(status === "approved" ? "Wydatek zatwierdzony." : "Wydatek odrzucony.", "success", {
        label: "Cofnij",
        onClick: () => {
          void (async () => {
            try {
              await setDriverExpenseStatus(getBrowserSupabase(), row.id, prev);
              setRows((list) => list.map((x) => (x.id === row.id ? { ...x, status: prev } : x)));
              toast("Przywrócono do rozliczenia.", "info");
            } catch {
              toast("Nie udało się cofnąć decyzji.", "error");
            }
          })();
        },
      });
    } catch (e) {
      setRows((list) => list.map((x) => (x.id === row.id ? { ...x, status: prev } : x)));
      toast(e instanceof Error ? e.message : "Błąd zmiany statusu.", "error");
    }
  }

  async function openPhoto(path: string) {
    try {
      const url = await expensePhotoUrl(getBrowserSupabase(), path);
      window.open(url, "_blank", "noopener");
    } catch {
      toast("Nie udało się otworzyć paragonu.", "error");
    }
  }

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );
  const pendingSum = useMemo(() => {
    const pending = rows.filter((r) => r.status === "submitted");
    const byCur = new Map<string, number>();
    for (const r of pending) byCur.set(r.currency, (byCur.get(r.currency) ?? 0) + r.amount);
    return [...byCur.entries()].map(([c, v]) => `${v.toFixed(2)} ${c}`).join(" · ") || "0";
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Rejestr wydatków"
        subtitle={`Zgłoszenia kierowców z aplikacji — do rozliczenia: ${pendingSum}`}
      />

      <div style={s.filters}>
        {(["all", "submitted", "approved", "rejected"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            style={{ ...s.filterBtn, ...(filter === k ? s.filterOn : {}) }}
          >
            {k === "all" ? "Wszystkie" : STATUS_META[k].label}
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
        emptyText="Brak wydatków w tym widoku."
        emptyIcon="receipt"
        onRetry={load}
      />

      <div style={s.list}>
        {visible.map((r) => {
          const st = STATUS_META[r.status];
          return (
            <div key={r.id} style={s.card}>
              <div style={s.cardHead}>
                <strong style={s.amount}>
                  {r.amount.toFixed(2)} {r.currency}
                </strong>
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
                    📷 Paragon
                  </Button>
                )}
                {manage && r.status === "submitted" && (
                  <>
                    <Button onClick={() => decide(r, "approved")}>✓ Zatwierdź</Button>
                    <Button variant="ghost" onClick={() => decide(r, "rejected")}>
                      ✗ Odrzuć
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
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
};
