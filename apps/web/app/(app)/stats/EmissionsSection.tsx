"use client";

import { type ClientCo2, formatCo2, round2, type VehicleCo2Row } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { Button } from "@/components/ui";
import { csvDateStamp, downloadCsv } from "@/lib/csv";
import { FleetStat, styles } from "./shared";

/** Raport emisji CO₂ per pojazd + per klient (ESG/CSRD) + eksport CSV. */
export function EmissionsSection({
  rows,
  clientRows = [],
}: {
  rows: VehicleCo2Row[];
  clientRows?: ClientCo2[];
}) {
  const totalKg = round2(rows.reduce((a, r) => a + r.co2Kg, 0));
  const totalLiters = round2(rows.reduce((a, r) => a + r.liters, 0));

  function exportCsv() {
    const headers = ["Pojazd", "Litry", "CO2 (kg)", "CO2/100km (kg)"];
    const body: (string | number)[][] = rows.map((r) => [
      r.registration,
      r.liters,
      r.co2Kg,
      r.co2Per100Km != null ? r.co2Per100Km : "",
    ]);
    body.push(["RAZEM", totalLiters, totalKg, ""]);
    if (clientRows.length > 0) {
      body.push([]);
      body.push(["Wg klienta (nadawcy)", "Litry (przyp.)", "CO2 (kg)", ""]);
      for (const c of clientRows) body.push([c.client, c.liters, c.co2Kg, ""]);
    }
    downloadCsv(`emisje_co2_${csvDateStamp()}.csv`, headers, body);
  }

  return (
    <div style={styles.profitWrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={styles.anHead}>
          🌱 Emisje CO₂{" "}
          <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 12 }}>
            (z paliwa · 2,64 kg/L · ESG/CSRD)
          </span>
        </div>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={exportCsv}>
          ⬇️ CSV
        </Button>
      </div>

      <div style={styles.profitTotals}>
        <FleetStat label="Ślad węglowy floty" value={formatCo2(totalKg)} />
        <FleetStat label="Paliwo łącznie" value={`${totalLiters} L`} />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ ...styles.profitRow, color: palette.smoke, fontSize: 12 }}>
          <span style={{ flex: 1 }}>Pojazd</span>
          <span style={styles.profitCol}>Litry</span>
          <span style={styles.profitCol}>CO₂</span>
          <span style={styles.profitCol}>CO₂/100km</span>
        </div>
        {rows.map((r) => (
          <div key={r.id} style={styles.profitRow}>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.registration}
            </span>
            <span style={styles.profitCol}>{r.liters} L</span>
            <span style={styles.profitCol}>{formatCo2(r.co2Kg)}</span>
            <span style={styles.profitCol}>
              {r.co2Per100Km != null ? `${r.co2Per100Km} kg` : "—"}
            </span>
          </div>
        ))}
      </div>

      {clientRows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            👥 Wg klienta (nadawcy){" "}
            <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 12 }}>
              (atrybucja proporcjonalna do przychodu)
            </span>
          </div>
          <div style={{ ...styles.profitRow, color: palette.smoke, fontSize: 12 }}>
            <span style={{ flex: 1 }}>Klient</span>
            <span style={styles.profitCol}>Litry (przyp.)</span>
            <span style={styles.profitCol}>CO₂</span>
          </div>
          {clientRows.map((c) => (
            <div key={c.client} style={styles.profitRow}>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.client}
              </span>
              <span style={styles.profitCol}>{c.liters} L</span>
              <span style={styles.profitCol}>{formatCo2(c.co2Kg)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
