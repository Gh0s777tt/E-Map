"use client";

import { type FuelStatsEntry, summarizeFuel } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { vehicleLabel } from "@/lib/demo";
import { listOutbox, type OutboxItem } from "@/lib/outbox";

const t = createTranslator("pl");

export default function StatsPage() {
  const [items, setItems] = useState<OutboxItem[]>([]);

  useEffect(() => {
    setItems(listOutbox());
  }, []);

  const entries: FuelStatsEntry[] = items.map((i) => ({
    odometerKm: i.input.odometerKm,
    liters: i.input.liters,
    priceTotal: i.input.priceTotal,
  }));
  const overall = summarizeFuel(entries);

  const byVehicle = new Map<string, FuelStatsEntry[]>();
  for (const i of items) {
    const arr = byVehicle.get(i.input.vehicleId) ?? [];
    arr.push({
      odometerKm: i.input.odometerKm,
      liters: i.input.liters,
      priceTotal: i.input.priceTotal,
    });
    byVehicle.set(i.input.vehicleId, arr);
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.stats")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Liczone silnikiem rozliczeń <code>@e-logistic/core</code> na Twoich formularzach.
      </p>

      {items.length === 0 ? (
        <p style={{ color: palette.smoke, marginTop: 24 }}>
          Brak danych — dodaj kilka tankowań w{" "}
          <a href="/forms/fuel" style={{ color: palette.red }}>
            Formularzu Paliwowym
          </a>
          , a statystyki pojawią się tutaj.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
            <Stat label="Tankowań" value={String(overall.count)} />
            <Stat label="Litry łącznie" value={overall.totalLiters.toString()} />
            <Stat
              label="Śr. spalanie"
              value={
                overall.avgConsumptionLPer100km != null
                  ? `${overall.avgConsumptionLPer100km} L/100km`
                  : "—"
              }
            />
            <Stat label="Wydatek" value={overall.totalSpend.toString()} />
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32 }}>Wg pojazdu</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {[...byVehicle.entries()].map(([vehicleId, list]) => {
              const s = summarizeFuel(list);
              return (
                <div key={vehicleId} style={styles.row}>
                  <strong style={{ minWidth: 110 }}>{vehicleLabel(vehicleId)}</strong>
                  <span style={styles.cell}>{s.count} tank.</span>
                  <span style={styles.cell}>{s.totalLiters} L</span>
                  <span style={styles.cell}>
                    {s.avgConsumptionLPer100km != null
                      ? `${s.avgConsumptionLPer100km} L/100km`
                      : "—"}
                  </span>
                  <span style={styles.cell}>{s.totalSpend}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 150,
        padding: 18,
        borderRadius: 12,
        background: palette.nearBlack,
        border: `1px solid ${palette.graphite}`,
      }}
    >
      <div style={{ color: palette.smoke, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color: palette.red }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 10,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
  },
  cell: { color: palette.smoke, fontSize: 14, minWidth: 90 },
};
