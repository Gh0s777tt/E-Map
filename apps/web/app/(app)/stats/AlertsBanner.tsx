"use client";

import type { FleetAlert } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useT } from "@/components/LocaleProvider";
import { styles } from "./shared";

export function AlertsBanner({ alerts }: { alerts: FleetAlert[] }) {
  const t = useT();
  const fmt = (a: FleetAlert) =>
    a.kind === "fuelAnomaly"
      ? `${a.value}×`
      : a.kind === "fuelSpike"
        ? `+${a.value}%`
        : `${a.value}%`;
  return (
    <div style={styles.alertWrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 800 }}>🔔 {t("alerts.title")}</span>
        <span style={styles.alertPill}>{alerts.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {alerts.map((a) => {
          const color = a.severity === "critical" ? palette.red : palette.warning;
          return (
            <div key={a.key} style={styles.alertRow}>
              <span
                style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }}
              />
              <span style={{ color: palette.smoke, minWidth: 150, fontSize: 13 }}>
                {t(`alerts.${a.kind}`)}
              </span>
              <strong style={{ flex: 1, minWidth: 0 }}>{a.label}</strong>
              <span style={{ color, fontWeight: 700, fontSize: 13 }}>{fmt(a)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
