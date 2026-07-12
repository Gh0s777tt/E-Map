"use client";

import { type IconName, cssPalette as palette } from "@e-logistic/ui";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/ui";

/**
 * Jednolity stan listy: ładowanie / błąd (z „Ponów") / pusto.
 * Zwraca `null`, gdy są dane (wtedy strona renderuje właściwą listę).
 * Rozróżnia błąd sieci od „brak danych" (wcześniej `catch {}` wyglądał jak pusto).
 * #295: pusty stan jako karta z ikoną i opcjonalną akcją („Dodaj pierwszy…").
 */
export function ListStatus({
  loading,
  error,
  empty,
  emptyText = "Brak danych.",
  emptyIcon = "folder",
  emptyAction,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyText?: string;
  emptyIcon?: IconName;
  emptyAction?: { label: string; onClick: () => void };
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
  if (empty) {
    return (
      <div style={emptyBox}>
        <span style={{ color: palette.smoke, opacity: 0.6 }}>
          <Icon name={emptyIcon} size={30} strokeWidth={1.5} />
        </span>
        <p style={{ color: palette.smoke, margin: 0, textAlign: "center" }}>{emptyText}</p>
        {emptyAction && (
          <button type="button" onClick={emptyAction.onClick} style={actionStyle}>
            {emptyAction.label}
          </button>
        )}
      </div>
    );
  }
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

const emptyBox: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  border: `1px dashed ${palette.graphite}`,
  borderRadius: 14,
  padding: "28px 20px",
  marginTop: 12,
};

const actionStyle: React.CSSProperties = {
  background: palette.red,
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "8px 18px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
