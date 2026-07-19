"use client";

/**
 * #288: Harmonogram serwisów i terminów (mockup 12) — jedna oś czasu z
 * WSZYSTKIMI zbliżającymi się terminami firmy: przeglądy/OC/leasing pojazdów,
 * badania kierowców (lekarskie/psychotesty/ADR/kod 95/prawo jazdy) i zadania
 * serwisowe wg przebiegu. Kolor = pilność (po terminie / <14 dni / ok).
 */
import {
  type DriverRow,
  latestOdometers,
  listDrivers,
  listServiceTasks,
  listVehiclesExpiry,
} from "@e-logistic/api";
import { cssPalette as palette } from "@e-logistic/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface Deadline {
  key: string;
  date: string | null;
  kmLeft?: number | null;
  what: string;
  who: string;
  kind: "pojazd" | "kierowca" | "serwis";
}

function daysLeft(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}
function urgencyColor(days: number | null): string {
  if (days === null) return palette.smoke;
  if (days < 0) return palette.danger;
  if (days <= 14) return palette.warning;
  return palette.success;
}
// #audyt B2: „po terminie" obejmuje też pozycje km-owe (serwis wg przebiegu),
// gdzie date===null — przeterminowane, gdy przejechano ponad interwał (kmLeft<=0).
function isOverdue(d: Deadline): boolean {
  if (d.date) return (daysLeft(d.date) ?? 1) < 0;
  return d.kmLeft != null && d.kmLeft <= 0;
}

export default function SchedulePage() {
  const t = useT();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) throw new Error(t("schedule.noCompany"));
      const out: Deadline[] = [];

      // Pojazdy: przegląd / OC / leasing.
      const vehicles = (await listVehiclesExpiry(sb, m.companyId)) as {
        id: string;
        registration: string;
        inspection_expiry: string | null;
        insurance_expiry: string | null;
        leasing_end: string | null;
      }[];
      for (const v of vehicles) {
        for (const [what, date] of [
          [t("schedule.vehicleInspection"), v.inspection_expiry],
          [t("schedule.vehicleInsurance"), v.insurance_expiry],
          [t("schedule.vehicleLeasingEnd"), v.leasing_end],
        ] as const) {
          if (date) {
            out.push({
              key: `${v.id}-${what}`,
              date,
              what,
              who: v.registration,
              kind: "pojazd",
            });
          }
        }
      }

      // Kierowcy: badania i uprawnienia (RPC deszyfrujące — owner/dispatcher).
      try {
        const drivers: DriverRow[] = await listDrivers(sb, m.companyId);
        for (const d of drivers) {
          const who = `${d.first_name} ${d.last_name}`;
          for (const [what, date] of [
            [t("schedule.driverLicense"), d.license_expiry],
            [t("schedule.driverCode95"), d.code95_expiry],
            [t("schedule.driverMedical"), d.medical_expiry],
            [t("schedule.driverPsych"), d.psychotech_expiry],
            [t("schedule.driverAdr"), d.adr_expiry],
          ] as const) {
            if (date) {
              out.push({ key: `${d.id}-${what}`, date, what, who, kind: "kierowca" });
            }
          }
        }
      } catch {
        // kierowca bez uprawnień do kartoteki — pokaże tylko pojazdy/serwis
      }

      // Serwis wg przebiegu: km do następnego zadania.
      try {
        const [tasks, odos] = await Promise.all([
          listServiceTasks(sb, m.companyId),
          latestOdometers(sb, m.companyId),
        ]);
        const reg = new Map(vehicles.map((v) => [v.id, v.registration]));
        for (const task of tasks) {
          if (task.interval_km && task.last_done_km != null) {
            const cur = odos[task.vehicle_id];
            if (cur != null) {
              out.push({
                key: `srv-${task.id}`,
                date: null,
                kmLeft: task.last_done_km + task.interval_km - cur,
                what: task.name,
                who: reg.get(task.vehicle_id) ?? "—",
                kind: "serwis",
              });
            }
          }
        }
      } catch {
        // brak zadań serwisowych — pomijamy sekcję
      }

      out.sort((a, b) => {
        const da = a.date ? (daysLeft(a.date) ?? 9999) : (a.kmLeft ?? 999999) < 1000 ? 0 : 500;
        const db = b.date ? (daysLeft(b.date) ?? 9999) : (b.kmLeft ?? 999999) < 1000 ? 0 : 500;
        return da - db;
      });
      setDeadlines(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("schedule.buildError"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);

  const overdue = useMemo(() => deadlines.filter(isOverdue).length, [deadlines]);

  return (
    <div>
      <PageHeader
        title={t("schedule.title")}
        subtitle={`${t("schedule.subtitle")}${overdue ? ` — ${overdue} ${t("schedule.overdueSuffix")}` : ""}`}
      />

      <ListStatus
        loading={loading}
        error={error}
        empty={!loading && deadlines.length === 0}
        emptyText={t("schedule.empty")}
        onRetry={load}
      />

      <div style={s.list}>
        {deadlines.map((d) => {
          const days = daysLeft(d.date);
          const color = d.date
            ? urgencyColor(days)
            : urgencyColor(
                d.kmLeft != null && d.kmLeft <= 0 ? -1 : (d.kmLeft ?? 99999) < 1000 ? 7 : 60,
              );
          return (
            <div key={d.key} style={{ ...s.row, borderLeft: `4px solid ${color}` }}>
              <div style={s.rowMain}>
                <strong>{d.what}</strong>
                <span style={s.who}>
                  {d.kind === "pojazd" ? "🚛" : d.kind === "kierowca" ? "🧑‍✈️" : "🔧"} {d.who}
                </span>
              </div>
              <div style={{ ...s.when, color }}>
                {d.date
                  ? days != null && days < 0
                    ? `${d.date} · ${-days} ${t("schedule.daysOverdue")}`
                    : `${d.date} · ${t("schedule.inPrefix")} ${days} ${t("schedule.daysSuffix")}`
                  : d.kmLeft != null
                    ? d.kmLeft <= 0
                      ? `${t("schedule.drovePrefix")} ${-d.kmLeft} ${t("schedule.kmOverInterval")}`
                      : `${t("schedule.inPrefix")} ${d.kmLeft} km`
                    : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  list: { display: "grid", gap: 8 },
  row: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 12,
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  rowMain: { display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" },
  who: { color: palette.smoke, fontSize: 13 },
  when: { fontSize: 13, fontWeight: 700 },
};
