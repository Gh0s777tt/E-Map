/**
 * #292: serwerowy silnik alertów właściciela — uruchamiany z crona (admin client,
 * omija RLS; INSERT-y z dedup_key są idempotentne dzięki unikalnemu indeksowi
 * (user_id, dedup_key) + ON CONFLICT DO NOTHING z migracji 0017).
 *
 * Reguły:
 *  • opóźniona dostawa  — zlecenie w trasie/przypisane po planowanej dacie rozładunku,
 *  • AETR               — wczorajsza jazda > 9 h (warning) / > 10 h (alert),
 *  • terminy pojazdów   — przegląd / OC / leasing w ciągu 30 dni,
 *  • raport tygodniowy  — poniedziałkowe podsumowanie: dostawy, paliwo, wydatki.
 */
import type { createSupabaseAdminClient } from "@e-logistic/api/admin";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Zarząd (owner/dispatcher, aktywni) per firma — adresaci alertów. */
async function managersByCompany(admin: Admin): Promise<Map<string, string[]>> {
  const { data } = await admin
    .from("memberships")
    .select("company_id, user_id, role, status")
    .eq("status", "active")
    .in("role", ["owner", "dispatcher"]);
  const map = new Map<string, string[]>();
  for (const m of data ?? []) {
    const list = map.get(m.company_id as string) ?? [];
    list.push(m.user_id as string);
    map.set(m.company_id as string, list);
  }
  return map;
}

interface AlertRow {
  company_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  severity: string;
  dedup_key: string;
}

async function insertAlerts(admin: Admin, rows: AlertRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  // upsert ignoreDuplicates = ON CONFLICT DO NOTHING na (user_id, dedup_key).
  const { error, count } = await admin
    .from("notifications")
    .upsert(rows, { onConflict: "user_id,dedup_key", ignoreDuplicates: true, count: "exact" });
  if (error) throw error;
  return count ?? rows.length;
}

/** Alerty operacyjne (codziennie). Zwraca liczbę wstawionych wierszy. */
export async function generateOperationalAlerts(admin: Admin): Promise<number> {
  const managers = await managersByCompany(admin);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const rows: AlertRow[] = [];
  const fanout = (companyId: string, partial: Omit<AlertRow, "company_id" | "user_id">) => {
    for (const userId of managers.get(companyId) ?? []) {
      rows.push({ company_id: companyId, user_id: userId, ...partial });
    }
  };

  // 1) Opóźnione dostawy.
  const { data: late } = await admin
    .from("orders")
    .select("id, company_id, reference_no, origin, destination, unload_date, status")
    .in("status", ["assigned", "in_progress"])
    .lt("unload_date", today);
  for (const o of late ?? []) {
    fanout(o.company_id as string, {
      type: "order_late",
      title: `⏰ Opóźniona dostawa: ${o.origin ?? "?"} → ${o.destination ?? "?"}`,
      body: `${o.reference_no ?? "Zlecenie"} — planowany rozładunek ${o.unload_date}, nadal ${
        o.status === "in_progress" ? "w trasie" : "nierozpoczęte"
      }.`,
      severity: "warning",
      dedup_key: `late-${o.id}-${today}`,
    });
  }

  // 2) AETR — wczorajsza jazda ponad normę (driving w minutach).
  const { data: aetr } = await admin
    .from("work_time_entries")
    .select("id, company_id, driver_name, work_date, driving")
    .eq("work_date", yesterday)
    .gt("driving", 540);
  for (const w of aetr ?? []) {
    const h = Math.floor((w.driving as number) / 60);
    const m = (w.driving as number) % 60;
    fanout(w.company_id as string, {
      type: "aetr",
      title: `🚛 Czas jazdy przekroczony: ${w.driver_name ?? "kierowca"}`,
      body: `${w.work_date}: ${h} h ${m} m jazdy (norma AETR: 9 h, wyjątkowo 10 h).`,
      severity: (w.driving as number) > 600 ? "alert" : "warning",
      dedup_key: `aetr-${w.id}`,
    });
  }

  // 3) Terminy pojazdów w ≤30 dni (dedup per pojazd+pole+data → nowy alert po zmianie daty).
  const { data: vehicles } = await admin
    .from("vehicles")
    .select("id, company_id, registration, inspection_expiry, insurance_expiry, leasing_end");
  const fields = [
    ["inspection_expiry", "przegląd techniczny"],
    ["insurance_expiry", "ubezpieczenie OC"],
    ["leasing_end", "koniec leasingu"],
  ] as const;
  for (const v of vehicles ?? []) {
    for (const [field, label] of fields) {
      const date = v[field] as string | null;
      if (!date || date > horizon) continue;
      const overdue = date < today;
      fanout(v.company_id as string, {
        type: "vehicle_expiry",
        title: `${overdue ? "🔴" : "🟡"} ${v.registration}: ${label} ${overdue ? "po terminie" : "wkrótce"}`,
        body: `Termin: ${date}.`,
        severity: overdue ? "alert" : "warning",
        dedup_key: `veh-${v.id}-${field}-${date}`,
      });
    }
  }

  return insertAlerts(admin, rows);
}

/** Numer tygodnia ISO (do dedup raportu). */
function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Raport tygodniowy (wywoływać w poniedziałki): podsumowanie minionego tygodnia. */
/** #301: dane raportu per firma — do wysyłki e-mailem z PDF-em. */
export interface WeeklyCompanyReport {
  companyId: string;
  companyName: string;
  emails: string[];
  fromDate: string;
  toDate: string;
  delivered: number;
  liters: number;
  fuelCost: number;
  expenses: number;
}

export async function generateWeeklyReports(
  admin: Admin,
): Promise<{ inserted: number; reports: WeeklyCompanyReport[] }> {
  const managers = await managersByCompany(admin);
  const to = new Date();
  const from = new Date(Date.now() - 7 * 86_400_000);
  const fromIso = from.toISOString();
  const week = isoWeek(from);
  const rows: AlertRow[] = [];
  const reports: WeeklyCompanyReport[] = [];

  // Nazwy firm + e-maile zarządu (auth.admin) — do stopki maila i adresatów.
  const { data: companies } = await admin.from("companies").select("id, name");
  const companyName = new Map((companies ?? []).map((c) => [c.id as string, c.name as string]));
  const emailOf = async (userId: string): Promise<string | null> => {
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      return data.user?.email ?? null;
    } catch {
      return null;
    }
  };

  for (const [companyId, userIds] of managers) {
    const [orders, fuel, expenses] = await Promise.all([
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("status", ["delivered", "invoiced"])
        .gte("created_at", fromIso),
      admin
        .from("fuel_logs")
        .select("liters, price_total")
        .eq("company_id", companyId)
        .gte("created_at", fromIso),
      admin
        .from("driver_expenses")
        .select("amount, currency, status")
        .eq("company_id", companyId)
        .gte("created_at", fromIso),
    ]);
    const liters = (fuel.data ?? []).reduce((a, r) => a + (Number(r.liters) || 0), 0);
    const fuelCost = (fuel.data ?? []).reduce((a, r) => a + (Number(r.price_total) || 0), 0);
    const expSubmitted = (expenses.data ?? []).length;
    const body = [
      `Dostawy zakończone: ${orders.count ?? 0}`,
      `Paliwo: ${Math.round(liters)} l (koszt wg wpisów: ${Math.round(fuelCost)})`,
      `Wydatki kierowców: ${expSubmitted} zgłoszeń`,
      "Szczegóły: panel → Raporty / Statystyki / Rejestr wydatków.",
    ].join("\n");
    for (const userId of userIds) {
      rows.push({
        company_id: companyId,
        user_id: userId,
        type: "weekly_report",
        title: `📊 Raport tygodniowy (${from.toISOString().slice(5, 10)}–${to
          .toISOString()
          .slice(5, 10)})`,
        body,
        severity: "info",
        dedup_key: `weekly-${companyId}-${week}`,
      });
    }

    const emails = (await Promise.all(userIds.map(emailOf))).filter((e): e is string => Boolean(e));
    reports.push({
      companyId,
      companyName: companyName.get(companyId) ?? "Firma",
      emails,
      fromDate: fromIso.slice(0, 10),
      toDate: to.toISOString().slice(0, 10),
      delivered: orders.count ?? 0,
      liters,
      fuelCost,
      expenses: expSubmitted,
    });
  }
  return { inserted: await insertAlerts(admin, rows), reports };
}
