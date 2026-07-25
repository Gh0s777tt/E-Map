import { beforeEach, describe, expect, it, vi } from "vitest";

// Powiadomienie o wiadomości czatu (Expo + Web Push + wpis do notifications, #368)
// — testujemy autoryzację Bearer tokenem i izolację wątku po firmie, bez runtime
// Next/Supabase/Expo/web-push.
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}));

const rateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({ rateLimit }));
vi.mock("@/lib/expoPush", () => ({ sendExpoPush: async () => ({ sent: 0 }) }));
vi.mock("@/lib/push", () => ({
  pushConfigured: () => false,
  sendPushTo: async () => ({ sent: 0, removed: 0 }),
}));
vi.mock("@e-logistic/api", () => ({
  listExpoPushTokensForUsers: async () => [],
  listPushSubscriptionsForDelivery: async () => [],
}));

const getUser = vi.fn();
/** #368: lista AKTYWNYCH członkostw nadawcy (firmy już nie zgadujemy przez limit(1)). */
const memberships = vi.fn();
const threadMaybeSingle = vi.fn();
const threadMembers = vi.fn();
const admin = {
  auth: { getUser },
  from: (table: string) => {
    if (table === "chat_threads") {
      // .select("company_id, name, created_by").eq("id", threadId).maybeSingle()
      return { select: () => ({ eq: () => ({ maybeSingle: threadMaybeSingle }) }) };
    }
    if (table === "chat_members") {
      // .select("user_id").eq("thread_id", threadId) → awaitable
      return { select: () => ({ eq: () => threadMembers() }) };
    }
    // memberships: .select("company_id, role").eq("user_id").eq("status","active") → awaitable
    return { select: () => ({ eq: () => ({ eq: () => memberships() }) }) };
  },
};
vi.mock("@e-logistic/api/admin", () => ({ createSupabaseAdminClient: () => admin }));

const { POST } = await import("@/app/api/chat/notify/route");

const ID = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown, token?: string) =>
  new Request("http://localhost/api/chat/notify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

beforeEach(() => {
  rateLimit.mockResolvedValue({ ok: true });
  getUser.mockReset();
  memberships.mockReset();
  threadMaybeSingle.mockReset();
  threadMembers.mockReset();
  threadMembers.mockResolvedValue({ data: [] });
});

describe("POST /api/chat/notify — autoryzacja Bearer i izolacja wątku", () => {
  it("401 bez tokenu (brak nagłówka Authorization)", async () => {
    expect((await POST(req({ preview: "hej" }))).status).toBe(401);
  });

  it("401 dla nieważnego tokenu (getUser bez usera)", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(req({ preview: "hej" }, "tok"))).status).toBe(401);
  });

  it("404 dla wątku z innej firmy (izolacja multi-tenant)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    memberships.mockResolvedValue({ data: [{ company_id: "c1", role: "driver" }] });
    threadMaybeSingle.mockResolvedValue({ data: { company_id: "INNA-FIRMA" } });
    expect((await POST(req({ threadId: ID, preview: "hej" }, "tok"))).status).toBe(404);
  });

  // #368: konto w DWÓCH firmach — bez jawnego companyId serwer zgadywał firmę przez
  // `limit(1)` i potrafił rozesłać podgląd treści członkom niewłaściwej z nich.
  it("403 gdy nadawca należy do wielu firm i nie poda companyId", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    memberships.mockResolvedValue({
      data: [
        { company_id: "c1", role: "driver" },
        { company_id: "c2", role: "driver" },
      ],
    });
    expect((await POST(req({ preview: "hej" }, "tok"))).status).toBe(403);
  });

  it("403 gdy podana firma nie jest firmą nadawcy", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    memberships.mockResolvedValue({ data: [{ company_id: "c1", role: "owner" }] });
    const body = { preview: "hej", companyId: "22222222-2222-4222-8222-222222222222" };
    expect((await POST(req(body, "tok"))).status).toBe(403);
  });

  // #368: sama przynależność wątku do firmy NIE wystarczy — kierowca spoza kanału
  // mógł wstrzyknąć treść do powiadomień jego członków i poznać ich liczbę.
  it("403 gdy kierowca nie jest członkiem prywatnego wątku", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    memberships.mockResolvedValue({ data: [{ company_id: "c1", role: "driver" }] });
    threadMaybeSingle.mockResolvedValue({
      data: { company_id: "c1", name: "Prywatny", created_by: "ktos-inny" },
    });
    threadMembers.mockResolvedValue({ data: [{ user_id: "u2" }, { user_id: "u3" }] });
    expect((await POST(req({ threadId: ID, preview: "hej" }, "tok"))).status).toBe(403);
  });
});
