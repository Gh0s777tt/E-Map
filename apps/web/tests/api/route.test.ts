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

const { POST } = await import("@/app/api/route/route");

const req = (body: unknown) =>
  new Request("http://localhost/api/route", { method: "POST", body: JSON.stringify(body) });

const twoPoints = {
  waypoints: [
    { lat: 1, lng: 1 },
    { lat: 2, lng: 2 },
  ],
};

beforeEach(() => {
  rateLimit.mockReset();
  rateLimit.mockResolvedValue({ ok: true });
  authenticateRequest.mockReset();
  authenticateRequest.mockResolvedValue("user-1"); // domyślnie zalogowany
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
