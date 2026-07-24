"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui";

/**
 * Error boundary grupy `(app)` — łapie wyjątki renderu stron panelu (41 z 49 to komponenty
 * klienckie), renderując się WEWNĄTRZ root layoutu, więc nawigacja i motyw zostają. Motyw
 * #E50914/#0a0a0a; `reset()` ponawia render segmentu bez utraty sesji. #Ś1.
 *
 * #367: raport do Sentry. Granice błędów Reacta ZATRZYMUJĄ propagację do `window.onerror`,
 * więc globalny handler (#306) ich nie widzi — bez tego `captureException` najpoważniejsze
 * crashe renderu (te, które ubijają stronę) nie trafiały do Sentry wcale.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: "60vh",
        gap: 12,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 44 }}>⚠️</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: palette.red }}>
        Coś poszło nie tak
      </h1>
      <p style={{ color: palette.smoke, margin: 0, maxWidth: 420, lineHeight: 1.5 }}>
        Ta strona napotkała nieoczekiwany błąd. Możesz spróbować ponownie bez utraty sesji.
      </p>
      {error.digest && (
        <p style={{ color: palette.smoke, fontSize: 12, margin: 0, opacity: 0.7 }}>
          Kod błędu: <code>{error.digest}</code>
        </p>
      )}
      <Button onClick={() => reset()} style={{ marginTop: 8 }}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}
