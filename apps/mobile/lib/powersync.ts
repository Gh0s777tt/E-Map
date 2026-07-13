/**
 * #311: PowerSync — lokalny SQLite ↔ Supabase (stack docelowy, faza M5).
 * Fala 1: infrastruktura + status. Bez `EXPO_PUBLIC_POWERSYNC_URL` w env
 * całość jest no-opem (outbox dalej robi swoje). Strumienie (auto_subscribe)
 * zdefiniowane w dashboardzie PowerSync: my_orders/my_fuel/my_adblue/my_expenses.
 */
import {
  type AbstractPowerSyncDatabase,
  column,
  type PowerSyncBackendConnector,
  PowerSyncDatabase,
  Schema,
  Table,
} from "@powersync/react-native";
import { getSupabase, supabaseConfigured } from "./supabase";

export const POWERSYNC_URL = process.env.EXPO_PUBLIC_POWERSYNC_URL ?? "";
export const powersyncConfigured = (): boolean => Boolean(POWERSYNC_URL) && supabaseConfigured;

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

export const powersyncSchema = new Schema({ orders, fuel_logs, adblue_logs, driver_expenses });

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

let db: PowerSyncDatabase | null = null;

/** Leniwa inicjalizacja + connect; wielokrotne wywołania są bezpieczne. */
export async function initPowerSync(): Promise<PowerSyncDatabase | null> {
  if (!powersyncConfigured()) return null;
  if (!db) {
    db = new PowerSyncDatabase({
      schema: powersyncSchema,
      database: { dbFilename: "elogistic.sqlite" },
    });
    await db.init();
    await db.connect(connector);
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
