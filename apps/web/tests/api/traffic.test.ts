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

const req = (body: unknown) =>
  new Request("http://localhost/api/traffic", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  rateLimit.mockResolvedValue({ ok: true });
  authenticateRequest.mockReset();
  authenticateRequest.mockResolvedValue("user-1"); // domyślnie zalogowany
});
afterEach(() => vi.unstubAllEnvs());

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
