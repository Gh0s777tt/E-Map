"use client";

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

export default function FuelHistoryPage() {
  const [items, setItems] = useState<OutboxItem[]>([]);

  useEffect(() => {
    setItems(listOutbox());
  }, []);

  async function resync(id: string) {
    await trySync(id);
    setItems(listOutbox());
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
        {t("form.fuel.title")} — {t("common.history")}
      </h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Twoje wysłane formularze (offline-first). Status i ponowna synchronizacja.
      </p>

      {items.length === 0 ? (
        <p style={{ color: palette.smoke, marginTop: 24 }}>Brak zapisanych formularzy.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {items.map((i) => {
            const st = STATUS[i.status];
            return (
              <div key={i.id} style={styles.row}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>
                    {vehicleLabel(i.input.vehicleId)} · {i.input.liters} L · {i.input.odometerKm} km
                  </div>
                  <div style={{ color: palette.smoke, fontSize: 13 }}>
                    {i.input.station.country}
                    {i.input.station.city ? `, ${i.input.station.city}` : ""} ·{" "}
                    {new Date(i.createdAt).toLocaleString("pl-PL")}
                  </div>
                  {i.error && <div style={{ color: palette.red, fontSize: 12 }}>{i.error}</div>}
                </div>
                <span style={{ ...styles.badge, color: st.color, borderColor: st.color }}>
                  {st.label}
                </span>
                {i.status !== "synced" && (
                  <button type="button" style={styles.btn} onClick={() => resync(i.id)}>
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
  badge: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
  },
  btn: {
    background: "transparent",
    color: palette.offWhite,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
  },
};
