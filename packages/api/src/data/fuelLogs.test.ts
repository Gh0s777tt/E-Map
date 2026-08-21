import type { FuelLogInput } from "@e-logistic/core";
import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
import { fuelLogToRow, insertFuelLog, listFuelLogKeys, listFuelLogs } from "./fuelLogs";

const baseInput: FuelLogInput = {
  vehicleId: "veh-1",
  station: { country: "PL", city: "Warszawa", location: "Stacja X", lat: 52.2, lng: 21.0 },
  odometerKm: 100000,
  liters: 300,
  isFull: true,
  paymentMethod: "cash",
};
const ctx = { id: "uuid-1", companyId: "comp-1", driverId: "drv-1", deviceId: "dev-1" };

describe("fuelLogToRow (czysta funkcja)", () => {
  it("mapuje input na wiersz snake_case z kontekstem", () => {
    const row = fuelLogToRow(baseInput, ctx);
    expect(row.id).toBe("uuid-1");
    expect(row.company_id).toBe("comp-1");
    expect(row.driver_id).toBe("drv-1");
    expect(row.vehicle_id).toBe("veh-1");
    expect(row.liters).toBe(300);
    expect(row.payment_method).toBe("cash");
    expect(row.device_id).toBe("dev-1");
  });

  it("buduje WKT POINT(lng lat) gdy są współrzędne", () => {
    expect(fuelLogToRow(baseInput, ctx).geo).toBe("POINT(21 52.2)");
  });

  it("geo = null bez współrzędnych", () => {
    const row = fuelLogToRow({ ...baseInput, station: { country: "PL" } }, ctx);
    expect(row.geo).toBeNull();
  });

  it("is_full domyślnie true; pola opcjonalne → null", () => {
    const row = fuelLogToRow(
      {
        vehicleId: "v",
        station: { country: "DE" },
        odometerKm: 1,
        liters: 1,
        isFull: true,
        paymentMethod: "cash",
      },
      { id: "i", companyId: "c", driverId: "d" },
    );
    expect(row.is_full).toBe(true);
    expect(row.fuel_card_id).toBeNull();
    expect(row.price_total).toBeNull();
    expect(row.device_id).toBeNull();
  });
});

describe("listFuelLogs (kształt zapytania)", () => {
  // [#373] Zakres i sortowanie idą po `occurred_at`, nie `created_at`. Wpis zrobiony
  // offline i zsynchronizowany później miał datę ZAPISU, więc wypadał poza zapytany
  // miesiąc i cicho znikał z zestawienia. Ten test pilnuje, żeby nie wrócić do
  // filtrowania po dacie zapisu.
  it("domyślnie tabela fuel_logs, sort occurred_at desc, bez filtrów", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listFuelLogs(client);
    expect(called("from", "fuel_logs")).toBe(true);
    expect(argsOf("order")?.[0]).toBe("occurred_at");
    expect(called("eq")).toBe(false);
    expect(called("limit")).toBe(false);
  });

  it("stosuje vehicleId/from/to/limit i tabelę adblue gdy podane", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listFuelLogs(client, {
      table: "adblue_logs",
      vehicleId: "veh-9",
      from: "2026-01-01",
      to: "2026-02-01",
      limit: 500,
    });
    expect(called("from", "adblue_logs")).toBe(true);
    expect(argsOf("eq")).toEqual(["vehicle_id", "veh-9"]);
    expect(argsOf("gte")).toEqual(["occurred_at", "2026-01-01"]);
    expect(argsOf("lte")).toEqual(["occurred_at", "2026-02-01"]);
    expect(argsOf("limit")?.[0]).toBe(500);
  });

  it("rzuca, gdy Supabase zwróci błąd", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("RLS") });
    await expect(listFuelLogs(client)).rejects.toThrow("RLS");
  });
});

describe("insertFuelLog (idempotentny upsert — offline-first)", () => {
  it("upsert z onConflict id + ignoreDuplicates, id z ctx (PK klienta)", async () => {
    const { client, called, argsOf } = mockSupabase({ data: { id: "uuid-1" }, error: null });
    await insertFuelLog(client, baseInput, ctx);
    expect(called("from", "fuel_logs")).toBe(true);
    const [row, opts] = argsOf("upsert") as [Record<string, unknown>, unknown];
    expect(row.id).toBe("uuid-1");
    expect(opts).toEqual({ onConflict: "id", ignoreDuplicates: true });
  });

  it("kieruje do adblue_logs gdy wskazano tabelę", async () => {
    const { client, called } = mockSupabase({ data: null, error: null });
    await insertFuelLog(client, baseInput, ctx, "adblue_logs");
    expect(called("from", "adblue_logs")).toBe(true);
  });

  it("re-sync (konflikt → DO NOTHING → maybeSingle null) zwraca null bez błędu", async () => {
    const { client } = mockSupabase({ data: null, error: null });
    expect(await insertFuelLog(client, baseInput, ctx)).toBeNull();
  });

  it("rzuca przy realnym błędzie zapisu (nie-konflikt)", async () => {
    const { client } = mockSupabase({ data: null, error: new Error("RLS") });
    await expect(insertFuelLog(client, baseInput, ctx)).rejects.toThrow("RLS");
  });
});

describe("fuelLogToRow — data zdarzenia i waluta [#373]", () => {
  const base = {
    vehicleId: "11111111-1111-4111-8111-111111111111",
    station: { country: "PL" },
    odometerKm: 1000,
    liters: 100,
    isFull: true,
    paymentMethod: "cash" as const,
  };
  const ctx = { id: "id-1", companyId: "c-1", driverId: "d-1" };

  it("brak occurredAt NIE trafia do wiersza — baza ma zostawić `default now()`", () => {
    // Stare buildy mobile w sklepach nie znają tego pola. Wysłanie `null`
    // nadpisałoby wartość domyślną i wywróciło ograniczenie NOT NULL.
    expect("occurred_at" in fuelLogToRow(base, ctx)).toBe(false);
  });

  it("podane occurredAt jest normalizowane do ISO/UTC", () => {
    const row = fuelLogToRow({ ...base, occurredAt: "2026-07-15T08:30:00.000Z" }, ctx);
    expect(row.occurred_at).toBe("2026-07-15T08:30:00.000Z");
  });

  it("waluta domyślnie EUR — założenie, na którym opierał się dotychczasowy kod", () => {
    expect(fuelLogToRow(base, ctx).currency).toBe("EUR");
  });

  it("VAT liczony jako różnica brutto − netto, żeby suma zawsze się spinała", () => {
    const row = fuelLogToRow({ ...base, priceTotal: 123, priceNet: 100, vatRate: 23 }, ctx);
    expect(row.price_total).toBe(123);
    expect(row.price_net).toBe(100);
    expect(row.vat_amount).toBe(23);
  });

  it("samo brutto zostawia netto i VAT puste — nic nie dorabiamy", () => {
    const row = fuelLogToRow({ ...base, priceTotal: 500 }, ctx);
    expect(row.price_net).toBeNull();
    expect(row.vat_amount).toBeNull();
  });
});

describe("listFuelLogKeys — zbiór odniesienia importu", () => {
  it("pobiera CZTERY kolumny, nie cały wiersz", async () => {
    /*
     * Do klucza duplikatu wchodzą pojazd, moment i litry. `fuelLogsFilter` bierze
     * `select("*")`, więc import ściągał do przeglądarki także geolokalizację,
     * komentarze i rozbicie VAT każdego tankowania sprzed lat — po to, żeby policzyć
     * z nich jeden ciąg znaków. Ten sam wzorzec, co `listOrderReferences`.
     */
    const paged = mockSupabasePaged([[]]);
    await listFuelLogKeys(paged.client, { table: "adblue_logs" });
    expect(paged.called("from", "adblue_logs")).toBe(true);
    expect(paged.argsOf("select")).toEqual(["id, vehicle_id, occurred_at, liters"]);
    expect(paged.argsOf("order")).toEqual(["id", { ascending: true }]);
  });

  it("sufit stron jest wyższy niż domyślny, bo odmowa importu byłaby trwała", async () => {
    /*
     * `onImport` przy `complete: false` ODMAWIA importu. Przy domyślnych 50 stronach
     * firma, której `fuel_logs` przekroczy 50 tys. wierszy, traciłaby funkcję na stałe:
     * odświeżenie strony (do którego zachęca komunikat) pobiera dokładnie to samo.
     */
    const strona = Array.from({ length: 1000 }, (_, i) => ({
      id: `id-${String(i).padStart(4, "0")}`,
      vehicle_id: "v1",
      occurred_at: "2026-01-01T00:00:00Z",
      liters: 10,
    }));
    // 51 pełnych stron: przy domyślnym suficie pobranie stanęłoby na pięćdziesiątej.
    const paged = mockSupabasePaged([
      ...Array.from({ length: 51 }, (_, s) =>
        strona.map((r) => ({ ...r, id: `s${String(s).padStart(3, "0")}-${r.id}` })),
      ),
      [],
    ]);
    const wynik = await listFuelLogKeys(paged.client);
    expect(wynik.complete).toBe(true);
    expect(wynik.pages).toBe(52);
  });
});
