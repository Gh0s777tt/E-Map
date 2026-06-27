import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}));
const rateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({ rateLimit }));

const { POST } = await import("@/app/api/route/route");

const req = (body: unknown) =>
  new Request("http://localhost/api/route", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => rateLimit.mockReset());

describe("POST /api/route — rate-limit i walidacja", () => {
  it("429 przy przekroczeniu limitu", async () => {
    rateLimit.mockResolvedValue({ ok: false });
    const res = await POST(
      req({
        waypoints: [
          { lat: 1, lng: 1 },
          { lat: 2, lng: 2 },
        ],
      }),
    );
    expect(res.status).toBe(429);
  });

  it("400 dla mniej niż 2 punktów", async () => {
    rateLimit.mockResolvedValue({ ok: true });
    expect((await POST(req({ waypoints: [{ lat: 1, lng: 1 }] }))).status).toBe(400);
  });

  it("400 dla pustego/niepoprawnego body", async () => {
    rateLimit.mockResolvedValue({ ok: true });
    expect((await POST(req(null))).status).toBe(400);
  });
});
