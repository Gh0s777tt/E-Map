import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}));

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => ({ auth: { getUser } }),
}));

const getActiveMembership = vi.fn();
const orderMaybeSingle = vi.fn();
// admin.from("orders").select(...).eq(...).maybeSingle()
const adminClient = {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: orderMaybeSingle }) }) }),
};
vi.mock("@e-logistic/api", () => ({
  getActiveMembership,
  listExpoPushTokensForUsers: async () => [],
  listPushSubscriptionsForDelivery: async () => [],
}));
vi.mock("@e-logistic/api/admin", () => ({ createSupabaseAdminClient: () => adminClient }));
vi.mock("@/lib/push", () => ({
  pushConfigured: () => false,
  sendPushTo: async () => ({ sent: 0 }),
}));
vi.mock("@/lib/expoPush", () => ({ sendExpoPush: async () => ({ sent: 0 }) }));

const { POST } = await import("@/app/api/orders/notify-assignment/route");

const ID = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown) =>
  new Request("http://localhost/api/orders/notify-assignment", {
    method: "POST",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  getUser.mockReset();
  getActiveMembership.mockReset();
  orderMaybeSingle.mockReset();
});

describe("POST /api/orders/notify-assignment — auth-guard i izolacja firm", () => {
  it("401 bez sesji", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(req({ orderId: ID }))).status).toBe(401);
  });

  it("403 dla roli kierowcy", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1", role: "driver" });
    expect((await POST(req({ orderId: ID }))).status).toBe(403);
  });

  it("400 dla orderId niebędącego UUID", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1", role: "owner" });
    expect((await POST(req({ orderId: "abc" }))).status).toBe(400);
  });

  it("404 gdy zlecenie należy do innej firmy (izolacja multi-tenant)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1", role: "owner" });
    orderMaybeSingle.mockResolvedValue({
      data: { id: ID, company_id: "INNA-FIRMA", assigned_to: "u2" },
    });
    expect((await POST(req({ orderId: ID }))).status).toBe(404);
  });
});
