"use client";

import { type ClientCo2, formatCo2, round2, type VehicleCo2Row } from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useT } from "@/components/LocaleProvider";
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
  const t = useT();
  const totalKg = round2(rows.reduce((a, r) => a + r.co2Kg, 0));
  const totalLiters = round2(rows.reduce((a, r) => a + r.liters, 0));

  function exportCsv() {
    // [#382] Nagłówki CSV też idą przez katalog — plik trafia do księgowości
    // albo do raportu ESG, więc nie może być po polsku, gdy reszta ekranu jest
    // po angielsku. Jednostki (CO2, kg, km) zostają dosłownie: to symbole,
    // nie tekst do przetłumaczenia.
    const headers = [t("common.vehicle"), t("form.field.liters"), "CO2 (kg)", "CO2/100km (kg)"];
    const body: (string | number)[][] = rows.map((r) => [
      r.registration,
      r.liters,
      r.co2Kg,
      r.co2Per100Km != null ? r.co2Per100Km : "",
    ]);
    body.push([t("common.total"), totalLiters, totalKg, ""]);
    if (clientRows.length > 0) {
      body.push([]);
      body.push([t("stats.co2.byClient"), t("stats.co2.litersAttributed"), "CO2 (kg)", ""]);
      for (const c of clientRows) body.push([c.client, c.liters, c.co2Kg, ""]);
    }
    downloadCsv(`emisje_co2_${csvDateStamp()}.csv`, headers, body);
  }

  return (
    <div style={styles.profitWrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={styles.anHead}>
          🌱 {t("stats.co2.title")}{" "}
          <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 12 }}>
            {t("stats.co2.basis")}
          </span>
        </div>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" onClick={exportCsv}>
          ⬇️ CSV
        </Button>
      </div>

      <div style={styles.profitTotals}>
        <FleetStat label={t("stats.co2.fleetTotal")} value={formatCo2(totalKg)} />
        <FleetStat label={t("stats.fleet.fuelTotal")} value={`${totalLiters} L`} />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ ...styles.profitRow, color: palette.smoke, fontSize: 12 }}>
          <span style={{ flex: 1 }}>{t("common.vehicle")}</span>
          <span style={styles.profitCol}>{t("form.field.liters")}</span>
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
            👥 {t("stats.co2.byClient")}{" "}
            <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 12 }}>
              {t("stats.co2.attribution")}
            </span>
          </div>
          <div style={{ ...styles.profitRow, color: palette.smoke, fontSize: 12 }}>
            <span style={{ flex: 1 }}>{t("profit.col.client")}</span>
            <span style={styles.profitCol}>{t("stats.co2.litersAttributed")}</span>
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
