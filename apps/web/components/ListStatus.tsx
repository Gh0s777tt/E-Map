"use client";

import { cssPalette as palette } from "@e-logistic/ui";
import { Skeleton } from "@/components/ui";

/**
 * Jednolity stan listy: ładowanie / błąd (z „Ponów") / pusto.
 * Zwraca `null`, gdy są dane (wtedy strona renderuje właściwą listę).
 * Rozróżnia błąd sieci od „brak danych" (wcześniej `catch {}` wyglądał jak pusto).
 */
export function ListStatus({
  loading,
  error,
  empty,
  emptyText = "Brak danych.",
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        <Skeleton height={44} />
        <Skeleton height={44} style={{ opacity: 0.7 }} />
        <Skeleton height={44} style={{ opacity: 0.4 }} />
      </div>
    );
  }
  if (error) {
    return (
      <p style={{ color: palette.smoke, marginTop: 12 }}>
        <span style={{ color: palette.red }}>⚠️ Błąd ładowania.</span> {error}{" "}
        {onRetry && (
          <button type="button" onClick={onRetry} style={retryStyle}>
            Ponów
          </button>
        )}
      </p>
    );
  }
  if (empty) return <p style={{ color: palette.smoke, marginTop: 12 }}>{emptyText}</p>;
  return null;
}

const retryStyle: React.CSSProperties = {
  background: "transparent",
  color: palette.red,
  border: `1px solid ${palette.red}`,
  borderRadius: 8,
  padding: "4px 12px",
  cursor: "pointer",
  marginLeft: 6,
};
