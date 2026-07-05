import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { REG_COOKIE, rpFromRequest } from "@/lib/passkey";
import { rateLimit } from "@/lib/ratelimit";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Weryfikuje rejestrację passkey i zapisuje klucz dla zalogowanego użytkownika. */
export async function POST(request: Request) {
  // #267: limit prób rejestracji passkey (anty brute-force / enumeracja).
  if (!(await rateLimit(request, "passkey-reg")).ok) {
    return NextResponse.json({ error: "Za dużo prób — spróbuj za chwilę." }, { status: 429 });
  }
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });

  // Walidacja kształtu (P2 #8) — bez Zod, by nie obciąć pól odpowiedzi WebAuthn.
  const raw = (await request.json().catch(() => null)) as {
    response?: unknown;
    name?: unknown;
  } | null;
  if (!raw || typeof raw.response !== "object" || raw.response === null) {
    return NextResponse.json({ error: "Brak danych rejestracji." }, { status: 400 });
  }
  const body = {
    response: raw.response as RegistrationResponseJSON,
    name: typeof raw.name === "string" ? raw.name : undefined,
  };
  const expectedChallenge = request.headers.get("cookie")?.match(/pk_reg_chal=([^;]+)/)?.[1];
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Brak wyzwania (spróbuj ponownie)" }, { status: 400 });
  }

  const { rpID, origin } = rpFromRequest(request);
  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: decodeURIComponent(expectedChallenge),
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (e) {
    return NextResponse.json(
      { verified: false, error: e instanceof Error ? e.message : "Błąd weryfikacji" },
      { status: 400 },
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  const cred = verification.registrationInfo.credential;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("passkeys").insert({
    user_id: user.id,
    credential_id: cred.id,
    public_key: Buffer.from(cred.publicKey).toString("base64url"),
    counter: cred.counter,
    transports: cred.transports ?? null,
    name: body.name?.trim() || "Klucz dostępu",
  });
  if (error) return NextResponse.json({ verified: false, error: error.message }, { status: 400 });

  const res = NextResponse.json({ verified: true });
  res.cookies.set(REG_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
