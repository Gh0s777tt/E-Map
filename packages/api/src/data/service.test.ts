import { describe, expect, it } from "vitest";
import { mockSupabase, mockSupabasePaged } from "../test-utils";
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
    const { client } = mockSupabasePaged([
      [
        { id: "a", vehicle_id: "v1", odometer_km: 100 },
        { id: "b", vehicle_id: "v1", odometer_km: 250 },
        { id: "c", vehicle_id: "v2", odometer_km: 50 },
        { id: "d", vehicle_id: "v1", odometer_km: 200 },
      ],
    ]);
    const odo = await latestOdometers(client, "c1");
    expect(odo.byVehicle).toEqual({ v1: 250, v2: 50 });
    expect(odo.complete).toBe(true);
  });

  it("pomija pojazd z samym zerowym/null licznikiem (km nie > 0)", async () => {
    const { client } = mockSupabasePaged([[{ id: "a", vehicle_id: "v1", odometer_km: null }]]);
    expect((await latestOdometers(client, "c1")).byVehicle).toEqual({});
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

  it("KRYTYCZNE: latestOdometers schodzi STRONAMI, a nie jednym zapytaniem bez limitu", async () => {
    /*
     * Zapytanie bez `limit` nie było kompletem, tylko sufitem `api.max_rows` (1000)
     * egzekwowanym bez błędu — i bez sortowania, czyli w kolejności nieokreślonej.
     * Firma z dwoma latami tankowań dostawała maksimum z przypadkowego tysiąca wierszy,
     * a `serviceStatus(zaniżony, …)` odpowiadał na to poziomem „ok": panel „Wymaga uwagi"
     * milczał identycznie jak przy flocie w normie. Stąd kursor po `id` i trzy kolumny.
     */
    const strona = (od: number) =>
      Array.from({ length: 1000 }, (_, i) => ({
        id: `id-${String(od + i).padStart(5, "0")}`,
        vehicle_id: "v1",
        odometer_km: od + i,
      }));
    const paged = mockSupabasePaged([strona(0), strona(1000), []]);
    const odo = await latestOdometers(paged.client, "c1");
    expect(paged.stron()).toBe(3);
    expect(paged.kursory()).toEqual([
      ["id", "id-00999"],
      ["id", "id-01999"],
    ]);
    expect(paged.argsOf("order")).toEqual(["id", { ascending: true }]);
    // Bez stronicowania maksimum kończyłoby się na 999 — czyli tysiąc kilometrów
    // za nisko dla planu serwisowego, który liczy interwał od tej liczby.
    expect(odo.byVehicle.v1).toBe(1999);
  });

  it("latestOdometers: sufit stron zgłasza się jako complete: false", async () => {
    // Zaniżony przebieg wygląda dokładnie jak niższy przebieg, więc jedynym śladem
    // po obcięciu jest ta flaga — a wywołujący nie ma jak jej ominąć.
    const strona = Array.from({ length: 1000 }, (_, i) => ({
      id: `id-${String(i).padStart(4, "0")}`,
      vehicle_id: "v1",
      odometer_km: i,
    }));
    const paged = mockSupabasePaged([strona, strona.map((r) => ({ ...r, id: `x${r.id}` }))]);
    const odo = await latestOdometers(paged.client, "c1", { maxPages: 2 });
    expect(odo.complete).toBe(false);
  });
});
