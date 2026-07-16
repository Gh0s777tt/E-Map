import "server-only";

/** Nazwa RP pokazywana przez przeglądarkę przy tworzeniu/uwierzytelnianiu passkey. */
export const RP_NAME = "E-Logistic";

/**
 * Wyznacza rpID (hostname bez portu), origin i flagę `secure`.
 *
 * BEZPIECZEŃSTWO (audyt N20): na produkcji rpID/origin pochodzą WYŁĄCZNIE ze stałej
 * zaufanej domeny (`NEXT_PUBLIC_SITE_URL`) — nigdy z nagłówków żądania (`x-forwarded-*`),
 * które są sterowane przez klienta (inaczej weryfikacja WebAuthn potwierdzałaby origin
 * podstawiony przez atakującego → utrata ochrony antyphishingowej passkey). Brak zmiennej
 * na produkcji = twardy błąd (fail-closed), a NIE cichy fallback do nagłówków. Wyznaczenie
 * z żądania dopuszczamy tylko poza produkcją (dev/localhost) i bramkujemy przez `NODE_ENV`,
 * a nie przez spoofowalny `x-forwarded-host`.
 */
export function rpFromRequest(request: Request): { rpID: string; origin: string; secure: boolean } {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (process.env.NODE_ENV === "production") {
    if (!siteUrl) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL jest wymagany na produkcji (zaufany origin passkey/WebAuthn).",
      );
    }
    const u = new URL(siteUrl);
    return {
      rpID: u.hostname,
      origin: `${u.protocol}//${u.host}`,
      secure: u.protocol === "https:",
    };
  }

  // Dev/test: wyznacz z żądania (localhost). Bezpieczne, bo poza produkcją.
  const url = new URL(request.url);
  const reqHost = request.headers.get("x-forwarded-host") ?? url.host;
  const reqProto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const rpID = reqHost.split(":")[0] ?? reqHost;
  return { rpID, origin: `${reqProto}://${reqHost}`, secure: reqProto === "https" };
}

export const REG_COOKIE = "pk_reg_chal";
export const AUTH_COOKIE = "pk_auth_chal";
