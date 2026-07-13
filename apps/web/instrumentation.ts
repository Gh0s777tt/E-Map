/**
 * #306: Sentry po stronie serwera (Next instrumentation hook).
 * Bez `NEXT_PUBLIC_SENTRY_DSN` w env — kompletny no-op (zero narzutu).
 */
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? "development",
  });
}

export async function onRequestError(...args: unknown[]) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  // @ts-expect-error — sygnatura przekazywana 1:1 do Sentry (typy Next instrumentation)
  Sentry.captureRequestError(...args);
}
