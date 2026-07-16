import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Cron dosyłający push — testujemy bramkę `Authorization: Bearer CRON_SECRET`
// (503 bez sekretu, 401 zły token, 200 z poprawnym) bez runtime Next/Supabase.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), { status: init?.status ?? 200 }),
  },
}));

// admin.from("notifications").select(...).is(...).gte(...).order(...) → brak nieprzeczytanych.
const admin = {
  from: () => ({
    select: () => ({
      is: () => ({ gte: () => ({ order: async () => ({ data: [], error: null }) }) }),
    }),
  }),
};
vi.mock("@e-logistic/api", () => ({
  listExpoPushTokensForUsers: async () => [],
  listPushSubscriptionsForDelivery: async () => [],
}));
vi.mock("@e-logistic/api/admin", () => ({ createSupabaseAdminClient: () => admin }));
vi.mock("@/lib/alerts", () => ({
  generateOperationalAlerts: async () => 0,
  generateWeeklyReports: async () => ({ inserted: 0, reports: [] }),
}));
vi.mock("@/lib/email", () => ({
  emailConfigured: () => false,
  sendEmail: async () => ({ ok: true }),
}));
vi.mock("@/lib/expoPush", () => ({ sendExpoPush: async () => ({ sent: 0 }) }));
vi.mock("@/lib/push", () => ({
  pushConfigured: () => false,
  sendPushTo: async () => ({ sent: 0, removed: 0 }),
}));
vi.mock("@/lib/weeklyPdf", () => ({ weeklyReportPdf: async () => Buffer.from("") }));

const { GET } = await import("@/app/api/cron/notify/route");

const req = (auth?: string) =>
  new Request("http://localhost/api/cron/notify", {
    headers: auth ? { authorization: auth } : {},
  });

beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret"));
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/notify — bramka CRON_SECRET", () => {
  it("503 gdy CRON_SECRET nieustawiony", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req("Bearer s3cret"))).status).toBe(503);
  });

  it("401 dla złego tokenu Bearer", async () => {
    expect((await GET(req("Bearer zly"))).status).toBe(401);
  });

  it("401 bez nagłówka Authorization", async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it("200 dla poprawnego Bearer CRON_SECRET", async () => {
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect((await res.json()).users).toBe(0);
  });
});
