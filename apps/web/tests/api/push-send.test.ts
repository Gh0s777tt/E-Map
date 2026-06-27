import { beforeEach, describe, expect, it, vi } from "vitest";

// Trasa importuje `server-only`, `next/server` i moduły serwerowe — mockujemy je,
// by testować logikę handlera (auth-guard, role, walidacja) bez runtime Next/Supabase.
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  },
}));

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => ({ auth: { getUser } }),
}));

const getActiveMembership = vi.fn();
vi.mock("@e-logistic/api", () => ({
  getActiveMembership,
  createSupabaseAdminClient: () => ({}),
  listPushSubscriptionsForDelivery: async () => [],
}));

let pushOn = true;
const sendPushTo = vi.fn(async () => ({ sent: 0 }));
vi.mock("@/lib/push", () => ({
  pushConfigured: () => pushOn,
  sendPushTo,
}));

// `@/lib/pushUrl` NIE jest mockowany — chcemy sprawdzić realną walidację URL.
const { POST } = await import("@/app/api/push/send/route");

const req = (body: unknown) =>
  new Request("http://localhost/api/push/send", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  pushOn = true;
  getUser.mockReset();
  getActiveMembership.mockReset();
  sendPushTo.mockClear();
});

describe("POST /api/push/send — auth-guard i walidacja", () => {
  it("503 gdy push nieskonfigurowany (brak VAPID)", async () => {
    pushOn = false;
    expect((await POST(req({}))).status).toBe(503);
  });

  it("401 bez sesji", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(req({}))).status).toBe(401);
  });

  it("403 dla roli kierowcy (tylko owner/dispatcher)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1", role: "driver" });
    expect((await POST(req({}))).status).toBe(403);
  });

  it("400 dla niebezpiecznego url (open-redirect)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1", role: "owner" });
    expect((await POST(req({ url: "//evil.com" }))).status).toBe(400);
  });

  it("200 dla ownera/dispatchera z poprawnymi danymi → wywołuje sendPushTo", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1", role: "dispatcher" });
    const res = await POST(req({ title: "T", url: "/dashboard" }));
    expect(res.status).toBe(200);
    expect(sendPushTo).toHaveBeenCalledTimes(1);
  });
});
