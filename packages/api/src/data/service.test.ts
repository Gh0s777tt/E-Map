import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { latestOdometers, listServiceTasks } from "./service";

describe("listServiceTasks (kształt zapytania)", () => {
  it("company_id, sort po created_at", async () => {
    const { client, called, argsOf } = mockSupabase({ data: [], error: null });
    await listServiceTasks(client, "c1");
    expect(called("from", "service_tasks")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "c1"]);
    expect(argsOf("order")?.[0]).toBe("created_at");
  });

  it("baza sortuje MALEJĄCO, a wynik wraca rosnąco", async () => {
    /*
     * Kierunek w zapytaniu decyduje, co wypada przy sufircie: malejąco → obcięcie
     * zabiera pozycje najstarsze, a nie tę dopisaną przed chwilą (dyspozytor uznałby
     * wtedy, że zapis padł, i dodał zadanie ponownie). Ekrany pokazują plan w kolejności
     * dopisywania, więc odwrócenie musi zostać po stronie klienta — te dwie rzeczy
     * trzymają się razem i tylko razem mają sens.
     */
    const { client, argsOf } = mockSupabase({
      data: [
        { id: "nowe", vehicle_id: "v1" },
        { id: "stare", vehicle_id: "v1" },
      ],
      error: null,
    });
    const rows = await listServiceTasks(client, "c1");
    expect(argsOf("order")).toEqual(["created_at", { ascending: false }]);
    expect(rows.map((r) => r.id)).toEqual(["stare", "nowe"]);
  });
});

describe("latestOdometers (agregacja max licznika per pojazd)", () => {
  it("zwraca najwyższy licznik dla każdego pojazdu", async () => {
    const { client } = mockSupabase({
      data: [
        { vehicle_id: "v1", odometer_km: 100 },
        { vehicle_id: "v1", odometer_km: 250 },
        { vehicle_id: "v2", odometer_km: 50 },
        { vehicle_id: "v1", odometer_km: 200 },
      ],
      error: null,
    });
    expect(await latestOdometers(client, "c1")).toEqual({ v1: 250, v2: 50 });
  });

  it("pomija pojazd z samym zerowym/null licznikiem (km nie > 0)", async () => {
    const { client } = mockSupabase({
      data: [{ vehicle_id: "v1", odometer_km: null }],
      error: null,
    });
    expect(await latestOdometers(client, "c1")).toEqual({});
  });
});

describe("sufity pobrania w module serwisowym", () => {
  it("listServiceTasks: plan rośnie iloczynowo z flotą, więc sufit jest wysoki", async () => {
    const domyslne = mockSupabase({ data: [], error: null });
    await listServiceTasks(domyslne.client, "c1");
    expect(domyslne.argsOf("limit")?.[0]).toBe(5000);

    const wlasne = mockSupabase({ data: [], error: null });
    await listServiceTasks(wlasne.client, "c1", { limit: 25 });
    expect(wlasne.argsOf("limit")?.[0]).toBe(25);
  });

  it("KRYTYCZNE: latestOdometers domyślnie NIE ucina wyniku", async () => {
    /*
     * Sufit z sortowaniem malejącym po liczniku wypycha z wyniku CAŁE pojazdy
     * o najniższym przebiegu — czyli te nowe. A brak przebiegu nie kończy się pustym
     * ekranem: `serviceStatus(null, …)` daje poziom „ok", więc panel „Wymaga uwagi"
     * pomija taki pojazd milcząco i przekroczony przegląd nigdy nie zapala się na czerwono.
     * Dlatego domyślnie nie ma tu ani `limit`, ani sortowania — jest komplet.
     */
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await latestOdometers(client, "c1");
    expect(argsOf("limit")).toBeUndefined();
    expect(argsOf("order")).toBeUndefined();
  });

  it("latestOdometers: jawny opts.limit tnie dopiero po sortowaniu malejącym", async () => {
    // Skoro wywołujący świadomie próbkuje, obcięcie ma co najwyżej usunąć pojazd
    // z wyniku, a nie zwrócić dla niego przebiegu ZANIŻONEGO — liczby nieodróżnialnej
    // od prawdziwej, z której plan serwisowy wyliczy termin przeglądu.
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await latestOdometers(client, "c1", { limit: 10 });
    expect(argsOf("order")).toEqual(["odometer_km", { ascending: false }]);
    expect(argsOf("limit")?.[0]).toBe(10);
  });
});
