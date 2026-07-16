import { beforeEach, describe, expect, it, vi } from "vitest";

// Push czatu (Expo) — testujemy autoryzację Bearer tokenem i izolację wątku po
// firmie (l.59) bez runtime Next/Supabase/Expo.
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
vi.mock("@e-logistic/api", () => ({ listExpoPushTokensForUsers: async () => [] }));

const getUser = vi.fn();
const memberMaybeSingle = vi.fn();
const threadMaybeSingle = vi.fn();
const admin = {
  auth: { getUser },
  from: (table: string) => {
    if (table === "chat_threads") {
      // .select("company_id").eq("id", threadId).maybeSingle()
      return { select: () => ({ eq: () => ({ maybeSingle: threadMaybeSingle }) }) };
    }
    // memberships: .select("company_id").eq("user_id").eq("status","active").limit(1).maybeSingle()
    return {
      select: () => ({
        eq: () => ({ eq: () => ({ limit: () => ({ maybeSingle: memberMaybeSingle }) }) }),
      }),
    };
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
  memberMaybeSingle.mockReset();
  threadMaybeSingle.mockReset();
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
    memberMaybeSingle.mockResolvedValue({ data: { company_id: "c1" } });
    threadMaybeSingle.mockResolvedValue({ data: { company_id: "INNA-FIRMA" } });
    expect((await POST(req({ threadId: ID, preview: "hej" }, "tok"))).status).toBe(404);
  });
});
