import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}));

const getUser = vi.fn();
const invMaybeSingle = vi.fn();
const sb = {
  auth: { getUser },
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: invMaybeSingle, order: async () => ({ data: [] }) }),
    }),
  }),
};
vi.mock("@/lib/supabase/server", () => ({ getServerSupabase: async () => sb }));

const getActiveMembership = vi.fn();
vi.mock("@e-logistic/api", () => ({ getActiveMembership }));
vi.mock("@e-logistic/core", () => ({ toFakturowniaInvoice: () => ({}) }));

const { POST } = await import("@/app/api/fakturownia/export/route");

const ID = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown) =>
  new Request("http://localhost/api/fakturownia/export", {
    method: "POST",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  getUser.mockReset();
  getActiveMembership.mockReset();
  invMaybeSingle.mockReset();
  vi.stubEnv("FAKTUROWNIA_API_TOKEN", "t");
  vi.stubEnv("FAKTUROWNIA_DOMAIN", "d");
});

describe("POST /api/fakturownia/export — auth-guard i izolacja firm", () => {
  it("501 bez konfiguracji (token/domena)", async () => {
    vi.stubEnv("FAKTUROWNIA_API_TOKEN", "");
    expect((await POST(req({ invoiceId: ID }))).status).toBe(501);
  });

  it("401 bez sesji", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(req({ invoiceId: ID }))).status).toBe(401);
  });

  it("403 dla roli kierowcy", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1", role: "driver" });
    expect((await POST(req({ invoiceId: ID }))).status).toBe(403);
  });

  it("400 dla invoiceId niebędącego UUID", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1", role: "owner" });
    expect((await POST(req({ invoiceId: "abc" }))).status).toBe(400);
  });

  it("404 dla faktury z innej firmy (izolacja multi-tenant)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    getActiveMembership.mockResolvedValue({ companyId: "c1", role: "owner" });
    invMaybeSingle.mockResolvedValue({ data: { id: ID, company_id: "INNA-FIRMA" } });
    expect((await POST(req({ invoiceId: ID }))).status).toBe(404);
  });
});
