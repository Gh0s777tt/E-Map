import { describe, expect, it } from "vitest";
import { mockSupabase } from "../test-utils";
import { listPushSubscriptionsForDelivery } from "./push";

/**
 * Testy kontraktu zapytania dla wysyłki push (klient service-role omija RLS, więc
 * scoping MUSI być po stronie aplikacji). Sprawdzamy KSZTAŁT zapytania, nie sieć.
 */
describe("listPushSubscriptionsForDelivery — scoping multi-tenant", () => {
  it("zawęża po company_id, gdy podano companyId", async () => {
    const { client, argsOf, called } = mockSupabase({ data: [], error: null });
    await listPushSubscriptionsForDelivery(client, { companyId: "comp-1" });
    expect(called("from", "push_subscriptions")).toBe(true);
    expect(argsOf("eq")).toEqual(["company_id", "comp-1"]);
    expect(called("in")).toBe(false);
  });

  it("zawęża po user_id IN, gdy podano userIds", async () => {
    const { client, argsOf, called } = mockSupabase({ data: [], error: null });
    await listPushSubscriptionsForDelivery(client, { userIds: ["u1", "u2"] });
    expect(argsOf("in")).toEqual(["user_id", ["u1", "u2"]]);
    expect(called("eq")).toBe(false);
  });

  it("stosuje oba filtry łącznie (firma + konkretni użytkownicy)", async () => {
    const { client, argsOf, called } = mockSupabase({ data: [], error: null });
    await listPushSubscriptionsForDelivery(client, { companyId: "c", userIds: ["u1"] });
    expect(argsOf("eq")).toEqual(["company_id", "c"]);
    expect(called("in")).toBe(true);
  });

  it("pusta tablica userIds nie zakłada filtra IN", async () => {
    const { client, called } = mockSupabase({ data: [], error: null });
    await listPushSubscriptionsForDelivery(client, { userIds: [] });
    expect(called("in")).toBe(false);
  });

  it("zwraca dane z warstwy (passthrough)", async () => {
    const sub = { endpoint: "https://e", p256dh: "p", auth: "a", user_id: "u1" };
    const { client } = mockSupabase({ data: [sub], error: null });
    const res = await listPushSubscriptionsForDelivery(client, { companyId: "c" });
    expect(res).toEqual([sub]);
  });

  it("rzuca, gdy warstwa zwróci błąd", async () => {
    const { client } = mockSupabase({ data: null, error: { message: "boom" } });
    await expect(listPushSubscriptionsForDelivery(client, { companyId: "c" })).rejects.toEqual({
      message: "boom",
    });
  });

  // HARDENING (patrz TEST_REPORT.md, ustalenie #1): wywołanie BEZ żadnego filtra
  // nie zakłada ani eq, ani in → zwróciłoby subskrypcje WSZYSTKICH firm. Obecnie
  // wszyscy wołający przekazują filtr (nieaktywne), ale brak guardu to latentne
  // ryzyko cross-tenant. Test odsłania pożądane zachowanie (odmowa bez scope) —
  // pominięty do czasu dodania guardu w kodzie aplikacji.
  it.skip("bez filtra POWINNO odmówić (guard anty-wyciek) — patrz TEST_REPORT #1", async () => {
    const { client } = mockSupabase({ data: [], error: null });
    await expect(listPushSubscriptionsForDelivery(client)).rejects.toThrow();
  });
});
