"use client";

/**
 * Globalny error boundary (App Router) — ostatnia siatka bezpieczeństwa dla wyjątków
 * renderu, które ubiją ROOT layout. global-error ZASTĘPUJE root layout, więc renderuje
 * własne <html>/<body> i style inline (globals.css może być niedostępny). Motyw #E50914
 * na #0a0a0a; `reset()` ponawia render. #Ś1: apka dotąd nie miała żadnego boundary.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "#E50914" }}>
            Coś poszło nie tak
          </h1>
          <p style={{ color: "#a3a3a3", margin: "0 0 20px", lineHeight: 1.5 }}>
            Wystąpił nieoczekiwany błąd aplikacji. Spróbuj ponownie — jeśli problem wróci, odśwież
            stronę.
          </p>
          {error.digest && (
            <p style={{ color: "#a3a3a3", fontSize: 12, margin: "0 0 20px", opacity: 0.7 }}>
              Kod błędu: <code>{error.digest}</code>
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#E50914",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "10px 22px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Spróbuj ponownie
          </button>
        </div>
      </body>
    </html>
  );
}
