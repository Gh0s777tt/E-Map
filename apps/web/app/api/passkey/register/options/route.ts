import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { REG_COOKIE, RP_NAME, rpFromRequest } from "@/lib/passkey";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Generuje opcje rejestracji passkey dla zalogowanego użytkownika. */
export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });

  const { rpID, secure } = rpFromRequest(request);
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("passkeys")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: user.email ?? user.id,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map(
      (c: { credential_id: string; transports: string[] | null }) => ({
        id: c.credential_id,
        transports: (c.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
      }),
    ),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });

  const res = NextResponse.json(options);
  res.cookies.set(REG_COOKIE, options.challenge, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return res;
}
