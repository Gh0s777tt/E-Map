"use client";

import {
  FUEL_CARD_PROVIDER_LABELS,
  type FuelCardProvider,
  formatCardExpiry,
} from "@e-logistic/core";

/**
 * Stylizowana grafika karty flotowej w barwach danego dostawcy.
 * Używamy własnej, markowej kolorystyki (bez kopiowania logotypów) — bezpieczne
 * prawnie, a wizualnie odróżnia DKV / Eurowag / IQ Card / Shell itd.
 */
const BRAND: Record<string, { from: string; to: string; fg: string }> = {
  dkv: { from: "#0a66c2", to: "#062b52", fg: "#fff" },
  eurowag: { from: "#6d28d9", to: "#2a1248", fg: "#fff" },
  shell: { from: "#f7b500", to: "#ed1c24", fg: "#1a1a1a" },
  bp: { from: "#11a64a", to: "#04421f", fg: "#fff" },
  circlek: { from: "#ff7a00", to: "#e4002b", fg: "#fff" },
  e100: { from: "#1452c9", to: "#0a1f4d", fg: "#fff" },
  uta: { from: "#e2001a", to: "#6e0010", fg: "#fff" },
  as24: { from: "#1f5fd0", to: "#0a2350", fg: "#fff" },
  aral: { from: "#00a3e0", to: "#00385a", fg: "#fff" },
  omv: { from: "#0a57d0", to: "#001f4d", fg: "#fff" },
  routex: { from: "#2447a8", to: "#0a1f4d", fg: "#fff" },
  logpay: { from: "#e2001a", to: "#2a2a2a", fg: "#fff" },
  esso: { from: "#0033a0", to: "#c8102e", fg: "#fff" },
  totalenergies: { from: "#fdb913", to: "#ed0000", fg: "#1a1a1a" },
  tankpool24: { from: "#0a66a3", to: "#022a45", fg: "#fff" },
  morganfuels: { from: "#2e7d32", to: "#0a2a12", fg: "#fff" },
  iqcard: { from: "#00b3a8", to: "#004f49", fg: "#fff" },
  other: { from: "#3a3a3a", to: "#111", fg: "#fff" },
};

const FALLBACK = { from: "#3a3a3a", to: "#111", fg: "#fff" };

export function CardArt({
  provider,
  masked,
  validUntil,
  registration,
  width = 150,
}: {
  provider: string;
  masked?: string;
  validUntil?: string | null;
  registration?: string | null;
  width?: number;
}) {
  const b = BRAND[provider] ?? FALLBACK;
  const label = FUEL_CARD_PROVIDER_LABELS[provider as FuelCardProvider] ?? provider.toUpperCase();
  const h = Math.round(width * 0.63);

  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: width * 0.06,
        background: `linear-gradient(135deg, ${b.from}, ${b.to})`,
        color: b.fg,
        padding: width * 0.07,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontWeight: 800, fontSize: width * 0.1, letterSpacing: 0.3 }}>{label}</span>
        <span style={{ fontSize: width * 0.05, opacity: 0.85 }}>KARTA FLOTOWA</span>
      </div>

      {/* chip */}
      <div
        style={{
          width: width * 0.16,
          height: width * 0.12,
          borderRadius: width * 0.02,
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,255,255,0.7)",
        }}
      />

      <div>
        <div style={{ fontSize: width * 0.085, letterSpacing: 1, fontFamily: "monospace" }}>
          {masked || "•••• ••••"}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: width * 0.052,
            opacity: 0.9,
          }}
        >
          <span>{registration ? `🚚 ${registration}` : ""}</span>
          <span>{validUntil ? formatCardExpiry(validUntil) : ""}</span>
        </div>
      </div>
    </div>
  );
}
