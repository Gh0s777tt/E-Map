"use client";

import { palette } from "@e-logistic/ui";

/**
 * Wspólne prymitywy UI (web/DOM). Centralizują powtarzane inline-style z ~21 stron
 * (motyw red/black). `packages/ui` jest współdzielony z mobile (RN), więc komponenty
 * DOM żyją tutaj. Adopcja przyrostowa — bez zmiany wyglądu.
 */

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ color: palette.smoke, marginTop: 4 }}>{subtitle}</p>}
    </>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: palette.red,
    color: palette.white,
    border: "none",
    borderRadius: 8,
    padding: "11px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghost: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 12px",
    cursor: "pointer",
  },
  danger: {
    background: "transparent",
    color: palette.red,
    border: `1px solid ${palette.red}`,
    borderRadius: 8,
    padding: "8px 11px",
    cursor: "pointer",
  },
};

export function Button({
  variant = "primary",
  style,
  ...props
}: { variant?: ButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" style={{ ...buttonStyles[variant], ...style }} {...props} />;
}

/**
 * Lekki wykres słupkowy (CSS, bez zależności). Responsywny, motyw red/black.
 * Dane: lista `{ label, value }`; wysokość słupka proporcjonalna do maksimum.
 */
export function BarChart({
  data,
  unit = "",
  color = palette.red,
  height = 160,
}: {
  data: { label: string; value: number }[];
  unit?: string;
  color?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return <p style={{ color: palette.smoke, fontSize: 13 }}>Brak danych do wykresu.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        height,
        padding: "8px 4px",
        borderBottom: `1px solid ${palette.graphite}`,
      }}
    >
      {data.map((d) => (
        <div
          key={d.label}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            height: "100%",
            minWidth: 0,
          }}
          title={`${d.label}: ${d.value}${unit}`}
        >
          <span style={{ fontSize: 11, color: palette.smoke }}>
            {d.value}
            {unit}
          </span>
          <div
            style={{
              width: "70%",
              background: color,
              height: `${Math.max((d.value / max) * 100, 2)}%`,
              borderRadius: "4px 4px 0 0",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: palette.smoke,
              marginTop: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Kolorowy „pill" statusu/etykiety (np. severity, status). */
export function Badge({
  color = palette.smoke,
  children,
}: {
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "3px 9px",
        borderRadius: 999,
        border: `1px solid ${color}`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
