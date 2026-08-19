/**
 * Sufity pobrania dla list, które nie mają własnego pliku testowego.
 *
 * Test pilnuje MECHANIZMU, nie liczb dla samych liczb. Brak `.limit()` nie
 * objawiał się błędem — PostgREST po cichu ucinał odpowiedź na własnym progu,
 * więc regresja (usunięcie limitu przy okazji innej zmiany) wróciłaby
 * niezauważona aż do klienta, u którego zbiór ten próg przekroczy. Asercja na
 * KSZTAŁT zapytania jest jedynym miejscem, w którym da się to złapać wcześniej.
 *
 * Druga asercja — nadpisanie przez `opts.limit` — chroni wsteczną zgodność
 * z drugiej strony: sufit ma być domyślną, a nie sztywną granicą, bo ekrany
 * analityczne muszą móc sięgnąć głębiej niż widok listy.
 */
import { describe, expect, it } from "vitest";
import type { TypedSupabaseClient } from "../client";
import { mockSupabase } from "../test-utils";
import { listChecklistTemplates } from "./checklists";
import { listCompanyLinks } from "./companyLinks";
import { listExpoPushTokensForUsers } from "./expoPush";
import { listActiveMapReports } from "./mapReports";
import { listOrderPhotos } from "./orderPhotos";
import { parkingSummaries } from "./parkingReviews";
import { listDriverPositions } from "./positions";
import { listRates } from "./rates";
import { listVatRates } from "./referenceRates";
import { listTachoDownloads } from "./tachoDownloads";
import { listTrailers } from "./trailers";

type Wywolanie = (client: TypedSupabaseClient, opts?: { limit?: number }) => Promise<unknown>;

/**
 * Wspólny mock z `test-utils` odtwarza tylko te ogniwa query-buildera, których
 * używały dotychczasowe testy — `listActiveMapReports` filtruje dodatkowo przez
 * `gt`/`not`. Dokładamy je TUTAJ, na instancji, zamiast rozszerzać wspólny mock:
 * reszta pakietu tych metod nie potrzebuje, a zapis nadal idzie do tej samej
 * listy `calls`, więc `argsOf` działa bez zmian.
 */
function mockZPelnymFiltrem() {
  const m = mockSupabase({ data: [], error: null });
  const builder = m.client as unknown as Record<string, unknown>;
  for (const nazwa of ["gt", "not"]) {
    builder[nazwa] = (...args: unknown[]) => {
      m.calls.push({ method: nazwa, args });
      return builder;
    };
  }
  return m;
}

const STALE: { nazwa: string; domyslny: number; wywolaj: Wywolanie }[] = [
  { nazwa: "listTrailers", domyslny: 1500, wywolaj: (c, o) => listTrailers(c, "c1", o) },
  { nazwa: "listCompanyLinks", domyslny: 200, wywolaj: (c, o) => listCompanyLinks(c, "c1", o) },
  {
    nazwa: "listTachoDownloads",
    domyslny: 2000,
    wywolaj: (c, o) => listTachoDownloads(c, "c1", o),
  },
  { nazwa: "listRates", domyslny: 2000, wywolaj: (c, o) => listRates(c, "c1", o) },
  {
    nazwa: "listDriverPositions",
    domyslny: 1000,
    wywolaj: (c, o) => listDriverPositions(c, "c1", o),
  },
  { nazwa: "listActiveMapReports", domyslny: 500, wywolaj: (c, o) => listActiveMapReports(c, o) },
  { nazwa: "listOrderPhotos", domyslny: 200, wywolaj: (c, o) => listOrderPhotos(c, "o1", o) },
  {
    nazwa: "listChecklistTemplates",
    domyslny: 200,
    wywolaj: (c, o) => listChecklistTemplates(c, "c1", o),
  },
  { nazwa: "listVatRates", domyslny: 5000, wywolaj: (c, o) => listVatRates(c, o) },
];

describe.each(STALE)("$nazwa — sufit pobrania", ({ domyslny, wywolaj }) => {
  it("nakłada domyślny limit, gdy wywołujący nic nie podał", async () => {
    const { client, argsOf } = mockZPelnymFiltrem();
    await wywolaj(client);
    expect(argsOf("limit")?.[0]).toBe(domyslny);
  });

  it("opts.limit nadpisuje domyślny", async () => {
    const { client, argsOf } = mockZPelnymFiltrem();
    await wywolaj(client, { limit: 7 });
    expect(argsOf("limit")?.[0]).toBe(7);
  });
});

/*
 * Sufity LICZONE z wejścia — osobno, bo tu stała liczba byłaby błędem.
 * Wywołujący sam decyduje, ilu adresatów/POI dotyczy zapytanie, więc próg
 * musi rosnąć razem z nim; inaczej większa wysyłka po cichu gubiłaby ogon.
 */
describe("sufity skalowane rozmiarem wejścia", () => {
  it("listExpoPushTokensForUsers: limit rośnie z liczbą adresatów", async () => {
    const maly = mockSupabase({ data: [], error: null });
    await listExpoPushTokensForUsers(maly.client, ["u1", "u2"]);
    const duzy = mockSupabase({ data: [], error: null });
    await listExpoPushTokensForUsers(
      duzy.client,
      Array.from({ length: 40 }, (_, i) => `u${i}`),
    );

    const limitMaly = maly.argsOf("limit")?.[0] as number;
    const limitDuzy = duzy.argsOf("limit")?.[0] as number;
    expect(limitMaly).toBeGreaterThanOrEqual(2);
    expect(limitDuzy).toBe(limitMaly * 20);
  });

  it("listExpoPushTokensForUsers: opts.limit nadpisuje wyliczony", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await listExpoPushTokensForUsers(client, ["u1"], { limit: 3 });
    expect(argsOf("limit")?.[0]).toBe(3);
  });

  it("parkingSummaries: limit rośnie z liczbą pytanych parkingów", async () => {
    const maly = mockSupabase({ data: [], error: null });
    await parkingSummaries(maly.client, ["p1"]);
    const duzy = mockSupabase({ data: [], error: null });
    await parkingSummaries(duzy.client, ["p1", "p2", "p3", "p4"]);
    expect(duzy.argsOf("limit")?.[0]).toBe((maly.argsOf("limit")?.[0] as number) * 4);
  });

  it("parkingSummaries: sufit liczy się od LISTY REALNIE PYTANEJ (obciętej do 200)", async () => {
    // Funkcja tnie wejście przez `slice(0, 200)`. Gdyby limit liczyć z surowego
    // `poiIds`, przy 500 POI byłby 2,5× za wysoki — pozornie nieszkodliwie,
    // ale sufit przestałby cokolwiek znaczyć dokładnie przy największym wejściu.
    const nadmiar = mockSupabase({ data: [], error: null });
    await parkingSummaries(
      nadmiar.client,
      Array.from({ length: 500 }, (_, i) => `p${i}`),
    );
    const pelny = mockSupabase({ data: [], error: null });
    await parkingSummaries(
      pelny.client,
      Array.from({ length: 200 }, (_, i) => `p${i}`),
    );
    expect(nadmiar.argsOf("limit")?.[0]).toBe(pelny.argsOf("limit")?.[0]);
  });

  it("parkingSummaries: obcięcie jest ZDETERMINOWANE (najnowsze opinie)", async () => {
    // Tu sufit nie skraca listy, tylko przekłamuje średnią — więc zapytanie bez
    // `order` dawałoby przy 150 opiniach średnią z przypadkowych 100, inną przy
    // każdym odświeżeniu. Kolejność malejąca po dacie zamienia to w zdefiniowaną
    // próbkę: te same opinie, które widać na liście parkingu.
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await parkingSummaries(client, ["p1"]);
    expect(argsOf("order")).toEqual(["created_at", { ascending: false }]);
  });

  it("parkingSummaries: opts.limit nadpisuje wyliczony", async () => {
    const { client, argsOf } = mockSupabase({ data: [], error: null });
    await parkingSummaries(client, ["p1", "p2"], { limit: 9 });
    expect(argsOf("limit")?.[0]).toBe(9);
  });
});
