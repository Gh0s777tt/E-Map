import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, rpFromRequest } from "@/lib/passkey";

export const dynamic = "force-dynamic";

/** Opcje logowania passkey (discoverable — przeglądarka pokaże dostępne klucze). */
export async function POST(request: Request) {
  const { rpID, secure } = rpFromRequest(request);
  const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });

  const res = NextResponse.json(options);
  res.cookies.set(AUTH_COOKIE, options.challenge, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return res;
}
