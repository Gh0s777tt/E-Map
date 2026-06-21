import "server-only";

/** Nazwa RP pokazywana przez przeglądarkę przy tworzeniu/uwierzytelnianiu passkey. */
export const RP_NAME = "E-Logistic";

/**
 * Wyznacza rpID (hostname bez portu), origin i flagę `secure` z żądania.
 * Działa lokalnie (localhost, http) i na produkcji (Vercel, https) — passkey
 * jest związany z domeną, więc klucz z localhost nie zadziała na produkcji (i odwrotnie).
 */
export function rpFromRequest(request: Request): { rpID: string; origin: string; secure: boolean } {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const rpID = host.split(":")[0] ?? host;
  const origin = `${proto}://${host}`;
  return { rpID, origin, secure: proto === "https" };
}

export const REG_COOKIE = "pk_reg_chal";
export const AUTH_COOKIE = "pk_auth_chal";
