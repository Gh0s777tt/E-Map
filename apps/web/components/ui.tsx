"use client";

import { setupMessage } from "@e-logistic/core";
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

/**
 * Przycisk — wygląd i stany (hover/active/focus/disabled) w klasach CSS (`globals.css`),
 * dzięki czemu mamy płynne przejścia i dostępny focus. `style` nadal nadpisuje punktowo.
 */
export function Button({
  variant = "primary",
  className,
  ...props
}: { variant?: ButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`el-btn el-btn-${variant}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

/** Placeholder ładowania (shimmer) — postrzegana szybkość zamiast spinnera. */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return <div className="el-skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

/** Wskaźnik ładowania (obracające się kółko). */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="el-spin"
      role="status"
      aria-label="Ładowanie"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${palette.graphite}`,
        borderTopColor: palette.red,
        borderRadius: "50%",
      }}
    />
  );
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
            className="el-bar"
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

/**
 * Komunikat onboardingu (brak firmy / brak pojazdów) — wcześniej kopiowany 3×.
 * `source` z `useFleet`/membership; teksty nadpisywalne per strona.
 */
export function SetupNotice({
  source,
  noCompany = "Najpierw utwórz firmę na Pulpicie.",
  noVehicles = "Dodaj pojazd w zakładce Pojazdy, aby kontynuować.",
}: {
  source: string;
  noCompany?: string;
  noVehicles?: string;
}) {
  const msg = setupMessage(source, { noCompany, noVehicles });
  if (!msg) return null;
  return <p style={{ color: palette.red, marginTop: 12 }}>⚠️ {msg}</p>;
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
