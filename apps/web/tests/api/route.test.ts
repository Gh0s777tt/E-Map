import type { RouteRequest, RouteResult } from "@e-logistic/maps";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// #368: podstawiony dostawca — liczymy, ILE RAZY handler sięgnął po (płatną) trasę.
const providerRoute = vi.fn<(req: RouteRequest) => Promise<RouteResult>>();
vi.mock("@e-logistic/maps", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@e-logistic/maps")>();
  return {
    ...actual,
    createRoutingProvider: () => ({ name: "test", route: providerRoute }),
  };
});

const { POST } = await import("@/app/api/route/route");
const { routeCache } = await import("@/app/api/route/cache");

const req = (body: unknown) =>
  new Request("http://localhost/api/route", { method: "POST", body: JSON.stringify(body) });

const twoPoints = {
  waypoints: [
    { lat: 1, lng: 1 },
    { lat: 2, lng: 2 },
  ],
};

const leg = (): RouteResult => ({
  distanceKm: 100,
  durationMin: 90,
  tollCost: 0,
  currency: "EUR",
  segments: [],
  geometry: [
    { lat: 1, lng: 1 },
    { lat: 2, lng: 2 },
  ],
  // #383: podstawiony dostawca nie raportuje odcinków płatnych — `known: false`.
  notices: [],
  tollSections: { known: false, sections: [] },
  provider: "test",
});

beforeEach(() => {
  rateLimit.mockReset();
  rateLimit.mockResolvedValue({ ok: true });
  authenticateRequest.mockReset();
  authenticateRequest.mockResolvedValue("user-1"); // domyślnie zalogowany
  providerRoute.mockReset();
  providerRoute.mockImplementation(async () => leg());
  routeCache.clear();
});

describe("POST /api/route — rate-limit, auth i walidacja", () => {
  it("429 przy przekroczeniu limitu", async () => {
    rateLimit.mockResolvedValue({ ok: false });
    expect((await POST(req(twoPoints))).status).toBe(429);
  });

  it("401 bez sesji (audyt Ś16)", async () => {
    authenticateRequest.mockResolvedValue(null);
    expect((await POST(req(twoPoints))).status).toBe(401);
  });

  it("400 dla mniej niż 2 punktów", async () => {
    expect((await POST(req({ waypoints: [{ lat: 1, lng: 1 }] }))).status).toBe(400);
  });

  it("400 dla pustego/niepoprawnego body", async () => {
    expect((await POST(req(null))).status).toBe(400);
  });
});

describe("POST /api/route — pamięć podręczna (#368)", () => {
  it("powtórzone zapytanie o tę samą trasę nie woła dostawcy drugi raz", async () => {
    const firstRes = await POST(req(twoPoints));
    const secondRes = await POST(req(twoPoints));
    const first = await firstRes.json();
    const second = await secondRes.json();
    expect(providerRoute).toHaveBeenCalledTimes(1);
    expect(second.distanceKm).toBe(first.distanceKm);
    // #368: trafienie w cache raportujemy NAGŁÓWKIEM (i tylko poza produkcją) — w treści
    // odpowiedzi zdradzałoby innym najemcom, że ktoś przed chwilą liczył tę samą trasę.
    expect(first.cached).toBeUndefined();
    expect(second.cached).toBeUndefined();
    expect(firstRes.headers.get("x-route-cache")).toBe("miss");
    expect(secondRes.headers.get("x-route-cache")).toBe("hit");
  });

  it("równoległy auto-reroute (#309) dzieli jedno wywołanie", async () => {
    await Promise.all([POST(req(twoPoints)), POST(req(twoPoints))]);
    expect(providerRoute).toHaveBeenCalledTimes(1);
  });

  it("zmiana profilu pojazdu omija cache", async () => {
    await POST(req({ ...twoPoints, profile: { kind: "truck", weightKg: 12_000 } }));
    await POST(req({ ...twoPoints, profile: { kind: "truck", weightKg: 40_000 } }));
    expect(providerRoute).toHaveBeenCalledTimes(2);
  });

  it("zmiana opcji avoid* omija cache", async () => {
    await POST(req({ ...twoPoints, options: { avoidTolls: true } }));
    await POST(req({ ...twoPoints, options: { avoidTolls: false } }));
    await POST(req({ ...twoPoints, options: { avoidTolls: true, avoidFerries: true } }));
    expect(providerRoute).toHaveBeenCalledTimes(3);
  });

  it("awaria dostawcy nie zostaje w pamięci (fallback na mock, potem świeża próba)", async () => {
    providerRoute.mockRejectedValueOnce(new Error("HERE padło"));
    const failed = await (await POST(req(twoPoints))).json();
    expect(failed.fallback).toBe(true);
    const okRes = await POST(req(twoPoints));
    const ok = await okRes.json();
    expect(ok.fallback).toBeUndefined();
    expect(okRes.headers.get("x-route-cache")).toBe("miss");
  });
});
