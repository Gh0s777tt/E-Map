"use client";

import type { FuelLogInput, TripEventInput } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { vehicleLabel } from "@/lib/demo";
import { listOutbox, type OutboxItem, trySync } from "@/lib/outbox";

const t = createTranslator("pl");

const STATUS: Record<OutboxItem["status"], { label: string; color: string }> = {
  queued: { label: "W kolejce", color: palette.warning },
  synced: { label: "Zsynchronizowano", color: palette.success },
  error: { label: "Błąd", color: palette.red },
};

const KIND_LABEL: Record<OutboxItem["kind"], string> = {
  fuel: "Paliwo",
  adblue: "AdBlue",
  trip: "Trip",
};

function summary(item: OutboxItem): { vehicleId: string; country: string; line: string } {
  if (item.kind === "trip") {
    const i = item.input as TripEventInput;
    const w = "weightKg" in i ? ` · ${i.weightKg} kg` : "";
    return {
      vehicleId: i.vehicleId,
      country: i.place.country,
      line: `${t(`trip.action.${i.action}`)} · ${i.odometerKm} km${w}`,
    };
  }
  const i = item.input as FuelLogInput;
  return {
    vehicleId: i.vehicleId,
    country: i.station.country,
    line: `${i.liters} L · ${i.odometerKm} km`,
  };
}

export default function FormsHistoryPage() {
  const [items, setItems] = useState<OutboxItem[]>([]);

  useEffect(() => {
    setItems(listOutbox());
  }, []);

  async function resync(id: string) {
    await trySync(id);
    setItems(listOutbox());
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("common.history")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Twoje wysłane formularze (offline-first). Status i ponowna synchronizacja.
      </p>

      {items.length === 0 ? (
        <p style={{ color: palette.smoke, marginTop: 24 }}>Brak zapisanych formularzy.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {items.map((item) => {
            const st = STATUS[item.status];
            const s = summary(item);
            return (
              <div key={item.id} style={styles.row}>
                <span style={styles.kind}>{KIND_LABEL[item.kind]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>
                    {vehicleLabel(s.vehicleId)} · {s.line}
                  </div>
                  <div style={{ color: palette.smoke, fontSize: 13 }}>
                    {s.country} · {new Date(item.createdAt).toLocaleString("pl-PL")}
                  </div>
                  {item.error && (
                    <div style={{ color: palette.red, fontSize: 12 }}>{item.error}</div>
                  )}
                </div>
                <span style={{ ...styles.badge, color: st.color, borderColor: st.color }}>
                  {st.label}
                </span>
                {item.status !== "synced" && (
                  <button type="button" style={styles.btn} onClick={() => resync(item.id)}>
                    Ponów
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  kind: {
    fontSize: 11,
    color: palette.red,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 6,
    padding: "3px 8px",
    minWidth: 56,
    textAlign: "center",
  },
  badge: { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid" },
  btn: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
  },
};
