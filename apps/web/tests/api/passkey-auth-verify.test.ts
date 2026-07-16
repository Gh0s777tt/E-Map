import { beforeEach, describe, expect, it, vi } from "vitest";

// Trasa mintuje sesję Supabase z asercji WebAuthn — testujemy bramki logiki
// (wyzwanie, wyszukanie klucza, verified) bez runtime Next/Supabase/WebAuthn.
vi.mock("server-only", () => ({}));

// `NextResponse.json` zwraca Response z atrapą `cookies.set` — ścieżka 200 czyści
// cookie `pk_auth_chal` (res.cookies.set(...)), więc atrapa musi to unieść.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => {
      const res = new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
      }) as Response & { cookies: { set: (...a: unknown[]) => void } };
      res.cookies = { set: () => {} };
      return res;
    },
  },
}));

const rateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({ rateLimit }));
vi.mock("@/lib/passkey", () => ({
  rpFromRequest: () => ({ rpID: "localhost", origin: "http://localhost", secure: false }),
}));

const verifyAuthenticationResponse = vi.fn();
vi.mock("@simplewebauthn/server", () => ({ verifyAuthenticationResponse }));

const pkMaybeSingle = vi.fn();
// admin.from("passkeys").select(...).eq(...).maybeSingle() + .update(...).eq(...)
const admin = {
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: pkMaybeSingle }) }),
    update: () => ({ eq: async () => ({}) }),
  }),
  auth: {
    admin: {
      getUserById: async () => ({ data: { user: { email: "kierowca@e-logistic.pl" } } }),
      generateLink: async () => ({
        data: { properties: { hashed_token: "HASH-123" } },
        error: null,
      }),
    },
  },
};
vi.mock("@e-logistic/api/admin", () => ({ createSupabaseAdminClient: () => admin }));

const { POST } = await import("@/app/api/passkey/auth/verify/route");

const PK = {
  id: "pk-1",
  user_id: "u1",
  credential_id: "cred-1",
  public_key: Buffer.from("public-key").toString("base64url"),
  counter: 0,
  transports: null,
};

const req = (body: unknown, opts?: { cookie?: boolean }) =>
  new Request("http://localhost/api/passkey/auth/verify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: opts?.cookie ? { cookie: "pk_auth_chal=CHAL" } : {},
  });
const assertion = { response: { id: "cred-1" } };

beforeEach(() => {
  rateLimit.mockResolvedValue({ ok: true });
  verifyAuthenticationResponse.mockReset();
  pkMaybeSingle.mockReset();
});

describe("POST /api/passkey/auth/verify — bramki auth i mint sesji", () => {
  // Handler zwraca 400 (nie 401) przy braku cookie `pk_auth_chal` — test broni realnej logiki (l.43-45).
  it("400 bez wyzwania (brak cookie pk_auth_chal)", async () => {
    expect((await POST(req(assertion))).status).toBe(400);
  });

  it("400 dla nieznanego klucza (brak wiersza passkeys)", async () => {
    pkMaybeSingle.mockResolvedValue({ data: null });
    expect((await POST(req(assertion, { cookie: true }))).status).toBe(400);
  });

  it("400 gdy weryfikacja WebAuthn nieudana (!verified)", async () => {
    pkMaybeSingle.mockResolvedValue({ data: PK });
    verifyAuthenticationResponse.mockResolvedValue({ verified: false });
    expect((await POST(req(assertion, { cookie: true }))).status).toBe(400);
  });

  it("200 mintuje tokenHash przy poprawnej asercji", async () => {
    pkMaybeSingle.mockResolvedValue({ data: PK });
    verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 7 },
    });
    const res = await POST(req(assertion, { cookie: true }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { verified: boolean; tokenHash: string };
    expect(json.verified).toBe(true);
    expect(json.tokenHash).toBe("HASH-123");
  });
});
