/**
 * #306: Sentry w przeglądarce — błędy paneli klientów (React, fetch, nawigacja).
 * Bez `NEXT_PUBLIC_SENTRY_DSN` — no-op.
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
