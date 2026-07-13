"use client";

/**
 * #288: Scoring kierowców (mockup 11) — ranking liczony z realnych danych
 * ostatnich 90 dni: terminowość dostaw (dostarczone ≤ planowanego rozładunku),
 * dyscyplina checklist i aktywność (zlecenia). Wynik 1–5 gwiazdek:
 *   60% terminowość + 30% checklisty + 10% wolumen (znormalizowany).
 */
import {
  type CompanyMember,
  listChecklistSubmissions,
  listCompanyMembers,
  listOrders,
} from "@e-logistic/api";
import { computeDriverGamification } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
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

// #334: nazwy rang (klucz silnika gamifikacji → etykieta PL).
const RANK_LABEL: Record<string, string> = {
  rookie: "Nowicjusz",
  driver: "Kierowca",
  pro: "Zawodowiec",
  veteran: "Weteran",
  master: "Mistrz",
  legend: "Legenda",
};

function stars(n: number): string {
  const full = Math.round(Math.max(0, Math.min(5, n)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function ScoringPage() {
  const [rows, setRows] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error("Brak aktywnej firmy.");
      const from = new Date(Date.now() - 90 * 86_400_000).toISOString();
      const [members, orders, subs] = await Promise.all([
        listCompanyMembers(sb),
        listOrders(sb, m.companyId, { from, limit: 2000 }),
        listChecklistSubmissions(sb, m.companyId, { limit: 1000 }),
      ]);

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
        const myChecklists = subs.filter((c) => c.driver_label === d.email).length;

        const cScore = Math.min(1, myChecklists / 20);
        const vScore = finished.length / maxDelivered;
        const base = (onTimePct ?? 0.7) * 0.6 + cScore * 0.3 + vScore * 0.1;
        // #334: profil gamifikacji z tych samych statystyk (bez km/spalania tutaj).
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
      setRows(scored);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się policzyć rankingu.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Scoring kierowców"
        subtitle="Ranking z ostatnich 90 dni: poziomy i punkty, terminowość dostaw, checklisty i aktywność"
      />

      <ListStatus
        loading={loading}
        error={error}
        empty={!loading && rows.length === 0}
        emptyText="Brak kierowców do oceny — zaproś zespół i przypisuj zlecenia."
        onRetry={load}
      />

      {rows.length > 0 && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  "#",
                  "Kierowca",
                  "Poziom",
                  "Punkty",
                  "Dostawy",
                  "Terminowość",
                  "Checklisty",
                  "Ocena",
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
                      {r.level} · {RANK_LABEL[r.rank] ?? r.rank}
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

      <p style={s.note}>
        Wynik = 60% terminowość (dostarczone do planowanej daty rozładunku) + 30% dyscyplina
        checklist + 10% liczba dostaw. Kierowcy bez mierzalnej terminowości startują z neutralnym
        70%.
      </p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
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
