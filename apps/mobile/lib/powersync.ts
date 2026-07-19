/**
 * #311: PowerSync — lokalny SQLite ↔ Supabase (stack docelowy, faza M5).
 * Fala 1: infrastruktura + status. Bez `EXPO_PUBLIC_POWERSYNC_URL` w env
 * całość jest no-opem (outbox dalej robi swoje). Strumienie (auto_subscribe)
 * zdefiniowane w dashboardzie PowerSync: my_orders/my_fuel/my_adblue/my_expenses.
 *
 * WAŻNE (fix crasha iOS): natywny `@powersync/react-native` (op-sqlite) jest
 * ładowany LENIWIE — dopiero gdy `powersyncConfigured()` i realnie tworzymy bazę.
 * Wcześniej statyczny import + `new PowerSyncDatabase()` na mount Ustawień wywracał
 * całą aplikację, gdy natywny setup nie był kompletny. Ekran importujący ten moduł
 * nie dotyka już natywnego kodu, dopóki sync nie jest skonfigurowany i sprawny.
 */
import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncDatabase as PSDatabase,
} from "@powersync/react-native";
import { getSupabase, supabaseConfigured } from "./supabase";

export const POWERSYNC_URL = process.env.EXPO_PUBLIC_POWERSYNC_URL ?? "";
export const powersyncConfigured = (): boolean => Boolean(POWERSYNC_URL) && supabaseConfigured;

/** Poświadczenia = token sesji Supabase; zapisy wciąż idą outboxem (upload no-op). */
const connector: PowerSyncBackendConnector = {
  async fetchCredentials() {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    return { endpoint: POWERSYNC_URL, token };
  },
  // Fala 1: odczyt (hydracja list offline). Zapisy obsługuje istniejący outbox
  // przez Supabase — lokalne mutacje PowerSync nie są jeszcze używane.
  async uploadData(db: AbstractPowerSyncDatabase) {
    const tx = await db.getNextCrudTransaction();
    if (tx) await tx.complete();
  },
};

let db: PSDatabase | null = null;

/** Tworzy bazę PowerSync — natywny moduł importowany DOPIERO tutaj (leniwie). */
async function buildDb(): Promise<PSDatabase> {
  const { column, PowerSyncDatabase, Schema, Table } = await import("@powersync/react-native");
  // Schemat lustrzany do Sync Streams (kolumny jak w Postgresie; id dochodzi samo).
  const orders = new Table({
    company_id: column.text,
    reference_no: column.text,
    origin: column.text,
    destination: column.text,
    cargo: column.text,
    weight_kg: column.real,
    status: column.text,
    vehicle_id: column.text,
    assigned_to: column.text,
    load_date: column.text,
    unload_date: column.text,
    created_at: column.text,
  });
  const fuel_logs = new Table({
    company_id: column.text,
    driver_id: column.text,
    vehicle_id: column.text,
    liters: column.real,
    odometer_km: column.integer,
    price_total: column.real,
    station_country: column.text,
    created_at: column.text,
  });
  const adblue_logs = new Table({
    company_id: column.text,
    driver_id: column.text,
    vehicle_id: column.text,
    liters: column.real,
    odometer_km: column.integer,
    created_at: column.text,
  });
  const driver_expenses = new Table({
    company_id: column.text,
    user_id: column.text,
    vehicle_id: column.text,
    category: column.text,
    amount: column.real,
    currency: column.text,
    expense_date: column.text,
    status: column.text,
    created_at: column.text,
  });
  const schema = new Schema({ orders, fuel_logs, adblue_logs, driver_expenses });
  const instance = new PowerSyncDatabase({
    schema,
    database: { dbFilename: "elogistic.sqlite" },
  });
  await instance.init();
  await instance.connect(connector);
  return instance;
}

/** Leniwa inicjalizacja + connect; wielokrotne wywołania bezpieczne. Nigdy nie wywraca apki. */
export async function initPowerSync(): Promise<PSDatabase | null> {
  if (!powersyncConfigured()) return null;
  if (!db) {
    try {
      db = await buildDb();
    } catch (e) {
      // Natywny SQLite/PowerSync może nie być gotowy w danym buildzie — degraduj do no-op.
      console.warn("PowerSync init failed — no-op (outbox nadal działa):", e);
      return null;
    }
  }
  return db;
}

export interface PowerSyncStatusInfo {
  connected: boolean;
  lastSyncedAt: string | null;
  rows: number;
}

/** Status do Ustawień: połączenie, czas ostatniej synchronizacji, wiersze lokalnie. */
export async function powersyncStatus(): Promise<PowerSyncStatusInfo | null> {
  const ps = await initPowerSync();
  if (!ps) return null;
  const counts = await ps.getAll<{ n: number }>(
    "select (select count(*) from orders) + (select count(*) from fuel_logs) + (select count(*) from adblue_logs) + (select count(*) from driver_expenses) as n",
  );
  return {
    connected: ps.currentStatus?.connected ?? false,
    lastSyncedAt: ps.currentStatus?.lastSyncedAt?.toISOString() ?? null,
    rows: counts[0]?.n ?? 0,
  };
}
