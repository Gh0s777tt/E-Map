import "server-only";

/** Nazwa RP pokazywana przez przeglądarkę przy tworzeniu/uwierzytelnianiu passkey. */
export const RP_NAME = "E-Logistic";

/**
 * Wyznacza rpID (hostname bez portu), origin i flagę `secure`.
 *
 * BEZPIECZEŃSTWO: na produkcji rpID/origin pochodzą ze STAŁEJ zaufanej domeny
 * (`NEXT_PUBLIC_SITE_URL`), a NIE z nagłówków żądania (`x-forwarded-*`), które są
 * sterowane przez klienta — inaczej weryfikacja WebAuthn potwierdzałaby origin
 * podstawiony przez atakującego (utrata ochrony antyphishingowej passkey).
 * Lokalnie (localhost/127.0.0.1) dopuszczamy wyznaczenie z żądania (dev).
 */
export function rpFromRequest(request: Request): { rpID: string; origin: string; secure: boolean } {
  const url = new URL(request.url);
  const reqHost = request.headers.get("x-forwarded-host") ?? url.host;
  const reqProto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const isLocal = reqHost.startsWith("localhost") || reqHost.startsWith("127.0.0.1");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!isLocal && siteUrl) {
    const u = new URL(siteUrl);
    return {
      rpID: u.hostname,
      origin: `${u.protocol}//${u.host}`,
      secure: u.protocol === "https:",
    };
  }

  const rpID = reqHost.split(":")[0] ?? reqHost;
  return { rpID, origin: `${reqProto}://${reqHost}`, secure: reqProto === "https" };
}

export const REG_COOKIE = "pk_reg_chal";
export const AUTH_COOKIE = "pk_auth_chal";
