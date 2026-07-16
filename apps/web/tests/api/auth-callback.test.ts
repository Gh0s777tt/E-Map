import { beforeEach, describe, expect, it, vi } from "vitest";

// Callback wymienia kod na sesję i przekierowuje — testujemy ochronę open-redirect
// parametru `next` (l.16) bez runtime Next/Supabase. Mock `NextResponse.redirect`
// zwraca Response z nagłówkiem `location`, który asertujemy.
vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: string | URL) =>
      new Response(null, { status: 307, headers: { location: String(url) } }),
  },
}));

const exchangeCodeForSession = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => ({ auth: { exchangeCodeForSession } }),
}));

const { GET } = await import("@/app/auth/callback/route");

const req = (query: string) => new Request(`http://localhost/auth/callback${query}`);
const dest = async (query: string) => (await GET(req(query))).headers.get("location");

beforeEach(() => exchangeCodeForSession.mockClear());

describe("GET /auth/callback — ochrona open-redirect parametru next", () => {
  it("redirect na /dashboard dla złego next (zewnętrzny URL)", async () => {
    expect(await dest("?code=abc&next=https://evil.com")).toBe("http://localhost/dashboard");
  });

  it("dozwolony next ze ścieżką wewnętrzną (/reset)", async () => {
    expect(await dest("?code=abc&next=/reset")).toBe("http://localhost/reset");
  });

  it("odrzucony next protocol-relative (//evil.com) → /dashboard", async () => {
    const location = await dest("?next=//evil.com");
    expect(location).toBe("http://localhost/dashboard");
    expect(location).not.toContain("evil.com");
  });

  it("brak next → /dashboard", async () => {
    expect(await dest("?code=abc")).toBe("http://localhost/dashboard");
  });
});
