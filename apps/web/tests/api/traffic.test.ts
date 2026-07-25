import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}));
const rateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({ rateLimit }));
const authenticateRequest = vi.fn();
vi.mock("@/lib/apiAuth", () => ({ authenticateRequest }));

const { POST } = await import("@/app/api/traffic/route");
const { hereFlowCache, tomtomIncidentCache } = await import("@/app/api/traffic/cache");

const req = (body: unknown) =>
  new Request("http://localhost/api/traffic", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  rateLimit.mockResolvedValue({ ok: true });
  authenticateRequest.mockReset();
  authenticateRequest.mockResolvedValue("user-1"); // domyślnie zalogowany
  // #368: cache jest modułowy — bez czyszczenia wyniki przeciekałyby między testami.
  hereFlowCache.clear();
  tomtomIncidentCache.clear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/traffic", () => {
  it("429 przy przekroczeniu limitu", async () => {
    rateLimit.mockResolvedValue({ ok: false });
    expect((await POST(req({}))).status).toBe(429);
  });

  it("401 bez sesji (audyt Ś16)", async () => {
    authenticateRequest.mockResolvedValue(null);
    expect((await POST(req({ west: 1, south: 1, east: 1.5, north: 1.5 }))).status).toBe(401);
  });

  it("501 bez HERE_API_KEY", async () => {
    vi.stubEnv("HERE_API_KEY", "");
    expect((await POST(req({ west: 1, south: 1, east: 1.5, north: 1.5 }))).status).toBe(501);
  });

  it("400 dla niepoprawnego bbox", async () => {
    vi.stubEnv("HERE_API_KEY", "k");
    expect((await POST(req({ west: 1 }))).status).toBe(400);
  });

  it("tooLarge dla okna > 2° (łagodna degradacja)", async () => {
    vi.stubEnv("HERE_API_KEY", "k");
    const res = await POST(req({ west: 0, south: 0, east: 5, north: 1 }));
    expect(res.status).toBe(200);
    expect((await res.json()).tooLarge).toBe(true);
  });
});

describe("POST /api/traffic — pamięć podręczna (#368)", () => {
  /** Stub HERE Traffic v7 — liczymy wywołania płatnego API. */
  function stubHere() {
    const fn = vi.fn<(url: string, init?: unknown) => Promise<unknown>>();
    fn.mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [] }) });
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("drobne przesunięcie mapy trafia w ten sam wpis (jedno zapytanie)", async () => {
    vi.stubEnv("HERE_API_KEY", "k");
    const fetchFn = stubHere();
    await POST(req({ west: 13.372, south: 52.481, east: 13.428, north: 52.533 }));
    await POST(req({ west: 13.374, south: 52.483, east: 13.429, north: 52.534 }));
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("przesunięcie o pełną komórkę siatki = nowe zapytanie", async () => {
    vi.stubEnv("HERE_API_KEY", "k");
    const fetchFn = stubHere();
    await POST(req({ west: 13.372, south: 52.481, east: 13.428, north: 52.533 }));
    await POST(req({ west: 13.472, south: 52.581, east: 13.528, north: 52.633 }));
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("do dostawcy leci PRZYCIĄGNIĘTY prostokąt — obejmuje cały widok użytkownika", async () => {
    vi.stubEnv("HERE_API_KEY", "k");
    const fetchFn = stubHere();
    await POST(req({ west: 13.372, south: 52.481, east: 13.428, north: 52.533 }));
    const url = String(fetchFn.mock.calls[0]?.[0]);
    expect(url).toContain("bbox%3A13.35%2C52.45%2C13.45%2C52.55");
  });

  it("awaria dostawcy NIE jest pamiętana — po naprawie warstwa wraca od razu", async () => {
    vi.stubEnv("HERE_API_KEY", "k");
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              currentFlow: { jamFactor: 5 },
              location: {
                shape: {
                  links: [
                    {
                      points: [
                        { lat: 52.5, lng: 13.4 },
                        { lat: 52.51, lng: 13.41 },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchFn);
    const box = { west: 13.372, south: 52.481, east: 13.428, north: 52.533 };
    expect((await (await POST(req(box))).json()).unavailable).toBe(true);
    const second = await (await POST(req(box))).json();
    expect(second.unavailable).toBeUndefined();
    expect(second.flows).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
