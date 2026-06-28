import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { rpFromRequest } from "@/lib/passkey";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

type PasskeyRow = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[] | null;
};

/**
 * Weryfikuje asercję WebAuthn i — po sukcesie — mintuje sesję Supabase:
 * generuje magic-link (service-role) i zwraca `tokenHash`, który klient
 * wymienia na sesję przez `verifyOtp`. Bez poprawnego klucza nie ma tokena.
 */
export async function POST(request: Request) {
  if (!(await rateLimit(request, "passkey-auth")).ok) {
    return NextResponse.json({ error: "Za dużo prób — spróbuj za chwilę." }, { status: 429 });
  }
  // Walidacja kształtu (P2 #8) — `response.id` musi istnieć (używane do wyszukania klucza);
  // bez Zod, by nie obciąć pól odpowiedzi WebAuthn.
  const raw = (await request.json().catch(() => null)) as {
    response?: { id?: unknown };
  } | null;
  if (
    !raw ||
    typeof raw.response !== "object" ||
    raw.response === null ||
    typeof raw.response.id !== "string"
  ) {
    return NextResponse.json({ error: "Brak danych asercji." }, { status: 400 });
  }
  const body = { response: raw.response as AuthenticationResponseJSON };
  const expectedChallenge = request.headers.get("cookie")?.match(/pk_auth_chal=([^;]+)/)?.[1];
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Brak wyzwania (spróbuj ponownie)" }, { status: 400 });
  }

  const { rpID, origin } = rpFromRequest(request);
  const admin = createSupabaseAdminClient();

  const { data: pk } = await admin
    .from("passkeys")
    .select("id, user_id, credential_id, public_key, counter, transports")
    .eq("credential_id", body.response.id)
    .maybeSingle<PasskeyRow>();
  if (!pk) return NextResponse.json({ verified: false, error: "Nieznany klucz" }, { status: 400 });

  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: decodeURIComponent(expectedChallenge),
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: pk.credential_id,
        publicKey: new Uint8Array(Buffer.from(pk.public_key, "base64url")),
        counter: Number(pk.counter),
        transports: (pk.transports ?? undefined) as never,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { verified: false, error: e instanceof Error ? e.message : "Błąd weryfikacji" },
      { status: 400 },
    );
  }

  if (!verification.verified) return NextResponse.json({ verified: false }, { status: 400 });

  await admin
    .from("passkeys")
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq("id", pk.id);

  const { data: udata } = await admin.auth.admin.getUserById(pk.user_id);
  const email = udata.user?.email;
  if (!email) return NextResponse.json({ verified: false, error: "Brak e-maila" }, { status: 400 });

  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !link.properties) {
    return NextResponse.json(
      { verified: false, error: "Nie udało się utworzyć sesji" },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ verified: true, tokenHash: link.properties.hashed_token, email });
  res.cookies.set("pk_auth_chal", "", { path: "/", maxAge: 0 });
  return res;
}
