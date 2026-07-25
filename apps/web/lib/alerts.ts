/**
 * #292: serwerowy silnik alertów właściciela — uruchamiany z crona (admin client,
 * omija RLS; INSERT-y z dedup_key są idempotentne dzięki unikalnemu indeksowi
 * (user_id, dedup_key) + ON CONFLICT DO NOTHING z migracji 0017).
 *
 * Reguły:
 *  • opóźniona dostawa  — zlecenie w trasie/przypisane po planowanej dacie rozładunku,
 *  • AETR               — wczorajsza jazda > 9 h (warning) / > 10 h (danger),
 *  • terminy pojazdów   — przegląd / OC / leasing w ciągu 30 dni,
 *  • #368 terminy kierowców — prawo jazdy / kod 95 / badania / psychotechnika / ADR (30 dni),
 *  • #368 karty paliwowe    — `valid_until` w ciągu 30 dni,
 *  • #368 usterki krytyczne — otwarte zgłoszenie „high" lub z kontrolką na desce,
 *  • raport tygodniowy  — poniedziałkowe podsumowanie: dostawy, paliwo, wydatki.
 *
 * #368: dedup_key terminów jest CELOWO w formacie SQL-owej funkcji
 * `generate_expiry_notifications` (0031) — `veh:<id>:<kind>:<YYYYMMDD>`,
 * `drv:…`, `card:…`. Ta funkcja odpala się z przeglądarki (NotificationBell),
 * cron z admin clienta; wspólny klucz sprawia, że oba źródła są dla siebie
 * idempotentne i właściciel nie dostaje tego samego alertu dwa razy.
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

/** `YYYY-MM-DD` → `YYYYMMDD` — format daty w dedup_key (zgodny z SQL `to_char`). */
function compactDate(iso: string): string {
  return iso.replaceAll("-", "");
}

async function insertAlerts(admin: Admin, rows: AlertRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  // #368 KRYTYCZNE: BEZ `onConflict`. Indeks `notifications_dedup` (0017) jest CZĘŚCIOWY
  // (`where dedup_key is not null`), a Postgres nie potrafi dopasować częściowego indeksu do
  // jawnego celu `ON CONFLICT (user_id, dedup_key)` bez powtórzenia predykatu — rzucał 42P10
  // („no unique or exclusion constraint matching the ON CONFLICT specification"), co cron
  // połykał (`.catch(() => -1)`) i zwracał 200. Efekt: silnik alertów NIGDY nic nie wstawiał
  // (opóźnienia, AETR, terminy pojazdów). Potwierdzone empirycznie na produkcji: wariant
  // z celem → 42P10, wariant nietargetowany → OK. Nietargetowane `ON CONFLICT DO NOTHING`
  // korzysta z każdego indeksu unikalnego, w tym częściowego. Ta sama pułapka co w 0018/0069.
  const { error, count } = await admin
    .from("notifications")
    .upsert(rows, { ignoreDuplicates: true, count: "exact" });
  if (error) throw error;
  return count ?? rows.length;
}

/** Alerty operacyjne (codziennie). Zwraca liczbę wstawionych wierszy. */
export async function generateOperationalAlerts(admin: Admin): Promise<number> {
  const managers = await managersByCompany(admin);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  // #368: horyzont ostrzegania jest USTAWIENIEM FIRMY (`companies.notify_days_ahead`,
  // 1–90, edytowalne w Ustawieniach) i respektuje go bliźniacza funkcja SQL
  // `generate_expiry_notifications` (0074). Cron miał 30 dni na sztywno, więc po
  // ujednoliceniu `dedup_key` z tą funkcją nadpisywałby wybór właściciela (firma
  // z ustawionymi 7 dniami i tak dostawałaby alerty na 30 dni naprzód).
  const dayMs = 86_400_000;
  const horizonDefault = new Date(Date.now() + 30 * dayMs).toISOString().slice(0, 10);
  const { data: horizonRows } = await admin.from("companies").select("id, notify_days_ahead");
  const horizonOf = new Map(
    (horizonRows ?? []).map((c) => [
      c.id as string,
      new Date(Date.now() + (Number(c.notify_days_ahead) || 30) * dayMs).toISOString().slice(0, 10),
    ]),
  );
  const horizonFor = (companyId: string) => horizonOf.get(companyId) ?? horizonDefault;
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
      severity: (w.driving as number) > 600 ? "danger" : "warning",
      dedup_key: `aetr-${w.id}`,
    });
  }

  // 3) Terminy pojazdów w ≤30 dni (dedup per pojazd+rodzaj+data → nowy alert po zmianie daty).
  const { data: vehicles } = await admin
    .from("vehicles")
    .select("id, company_id, registration, inspection_expiry, insurance_expiry, leasing_end");
  const regOf = new Map((vehicles ?? []).map((v) => [v.id as string, v.registration as string]));
  const fields = [
    ["inspection_expiry", "inspection", "przegląd techniczny"],
    ["insurance_expiry", "insurance", "ubezpieczenie OC"],
    ["leasing_end", "leasing", "koniec leasingu"],
  ] as const;
  for (const v of vehicles ?? []) {
    for (const [field, kind, label] of fields) {
      const date = v[field] as string | null;
      if (!date || date > horizonFor(v.company_id as string)) continue;
      const overdue = date < today;
      fanout(v.company_id as string, {
        type: "vehicle_expiry",
        title: `${overdue ? "🔴" : "🟡"} ${v.registration}: ${label} ${overdue ? "po terminie" : "wkrótce"}`,
        body: `Termin: ${date}.`,
        severity: overdue ? "danger" : "warning",
        dedup_key: `veh:${v.id}:${kind}:${compactDate(date)}`,
      });
    }
  }

  // 4) #368 Terminy dokumentów kierowców w ≤30 dni. Świadomie BEZ imienia
  //    i nazwiska — PII jest szyfrowane w bazie (0022), a service-role przez
  //    PostgREST i tak go nie odszyfruje; identycznie robi SQL-owa reguła w 0031.
  const { data: drivers } = await admin
    .from("drivers")
    .select(
      "id, company_id, license_expiry, code95_expiry, medical_expiry, psychotech_expiry, adr_expiry",
    );
  const driverFields = [
    ["license_expiry", "license", "prawo jazdy"],
    ["code95_expiry", "code95", "kod 95"],
    ["medical_expiry", "medical", "badania lekarskie"],
    ["psychotech_expiry", "psychotech", "badania psychotechniczne"],
    ["adr_expiry", "adr", "uprawnienia ADR"],
  ] as const;
  for (const d of drivers ?? []) {
    for (const [field, kind, label] of driverFields) {
      const date = d[field] as string | null;
      if (!date || date > horizonFor(d.company_id as string)) continue;
      const overdue = date < today;
      fanout(d.company_id as string, {
        type: "driver_document_expiry",
        title: `${overdue ? "🔴" : "🟡"} Kierowca: ${label} ${overdue ? "po terminie" : "wkrótce"}`,
        body: `Termin: ${date}. Sprawdź kartotekę: panel → Kierowcy.`,
        severity: overdue ? "danger" : "warning",
        dedup_key: `drv:${d.id}:${kind}:${compactDate(date)}`,
      });
    }
  }

  // 5) #368 Karty paliwowe — ważność `valid_until` w ≤30 dni.
  const { data: cards } = await admin
    .from("fuel_cards")
    .select("id, company_id, provider, card_number_masked, valid_until, vehicle_id");
  for (const c of cards ?? []) {
    const date = c.valid_until as string | null;
    if (!date || date > horizonFor(c.company_id as string)) continue;
    const overdue = date < today;
    const reg = c.vehicle_id ? regOf.get(c.vehicle_id as string) : null;
    const cardLabel = [String(c.provider).toUpperCase(), c.card_number_masked ?? ""]
      .filter(Boolean)
      .join(" ");
    fanout(c.company_id as string, {
      type: "card_expiry",
      title: `${overdue ? "🔴" : "🟡"} Karta ${cardLabel} ${
        overdue ? "nieważna" : "wkrótce wygasa"
      }`,
      body: `Ważna do: ${date}.${reg ? ` Pojazd: ${reg}.` : ""}`,
      severity: overdue ? "danger" : "warning",
      dedup_key: `card:${c.id}:${compactDate(date)}`,
    });
  }

  // 6) #368 Usterki krytyczne — otwarte zgłoszenie kierowcy o wadze „high"
  //    albo z zapaloną kontrolką na desce. Dedup po samym id usterki (bez daty),
  //    więc każde zgłoszenie alarmuje DOKŁADNIE RAZ, a nie w każdym cyklu crona.
  //    Okno 30 dni: status „open" bywa porzucany na latach, więc bez dolnej granicy
  //    PIERWSZY cykl po wdrożeniu wysłałby lawinę alertów `danger` o zdarzeniach
  //    sprzed miesięcy. Cron ma sygnalizować NOWE rzeczy — całą zaległość i tak widać
  //    w panelu „Co wymaga uwagi".
  const defectsSince = new Date(Date.now() - 30 * dayMs).toISOString();
  const { data: defects } = await admin
    .from("vehicle_defects")
    .select("id, company_id, vehicle_id, part, severity, dashboard_light, description")
    .eq("status", "open")
    .gte("created_at", defectsSince)
    .or("severity.eq.high,dashboard_light.is.true");
  for (const d of defects ?? []) {
    const reg = regOf.get(d.vehicle_id as string) ?? "pojazd";
    const light = d.dashboard_light === true;
    const desc = String(d.description ?? "").slice(0, 160);
    fanout(d.company_id as string, {
      type: "defect_critical",
      title: `🔧 ${reg}: usterka ${d.part}${light ? " (kontrolka)" : ""}`,
      body: `${desc || "Zgłoszenie kierowcy."} Szczegóły: panel → Raporty.`,
      severity: "danger",
      dedup_key: `defect:${d.id}`,
    });
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
