"use client";

import { getActiveMembership, listFuelLogs, listVehicles } from "@e-logistic/api";
import { type FuelLogInput, type FuelStatsEntry, summarizeFuel } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import { useEffect, useState } from "react";
import { vehicleLabel } from "@/lib/demo";
import { listOutbox } from "@/lib/outbox";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

type Group = { id: string; label: string; entries: FuelStatsEntry[] };

export default function StatsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [source, setSource] = useState<"baza" | "lokalne">("lokalne");

  useEffect(() => {
    (async () => {
      // 1) Próba: dane z bazy (autorytatywne) dla zalogowanej firmy.
      try {
        const sb = getBrowserSupabase();
        const m = await getActiveMembership(sb);
        if (m) {
          const [logs, vehicles] = await Promise.all([
            listFuelLogs(sb),
            listVehicles(sb, m.companyId),
          ]);
          const labelOf = new Map(
            (vehicles as { id: string; registration: string }[]).map((v) => [v.id, v.registration]),
          );
          const byV = new Map<string, FuelStatsEntry[]>();
          for (const r of logs as {
            vehicle_id: string;
            odometer_km: number;
            liters: number;
            price_total: number | null;
          }[]) {
            const arr = byV.get(r.vehicle_id) ?? [];
            arr.push({
              odometerKm: r.odometer_km,
              liters: Number(r.liters),
              priceTotal: r.price_total != null ? Number(r.price_total) : undefined,
            });
            byV.set(r.vehicle_id, arr);
          }
          setGroups(
            [...byV.entries()].map(([id, entries]) => ({
              id,
              label: labelOf.get(id) ?? id.slice(0, 8),
              entries,
            })),
          );
          setSource("baza");
          return;
        }
      } catch {
        // brak konfiguracji / sesji → lokalne
      }

      // 2) Fallback: outbox (offline).
      const items = listOutbox().filter((i) => i.kind !== "trip");
      const byV = new Map<string, FuelStatsEntry[]>();
      for (const i of items) {
        const inp = i.input as FuelLogInput;
        const arr = byV.get(inp.vehicleId) ?? [];
        arr.push({ odometerKm: inp.odometerKm, liters: inp.liters, priceTotal: inp.priceTotal });
        byV.set(inp.vehicleId, arr);
      }
      setGroups(
        [...byV.entries()].map(([id, entries]) => ({ id, label: vehicleLabel(id), entries })),
      );
      setSource("lokalne");
    })();
  }, []);

  const overall = summarizeFuel(groups.flatMap((g) => g.entries));

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("nav.stats")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Liczone silnikiem <code>@e-logistic/core</code> · źródło danych: <strong>{source}</strong>.
      </p>

      {groups.length === 0 ? (
        <p style={{ color: palette.smoke, marginTop: 24 }}>
          Brak danych — dodaj tankowania w{" "}
          <a href="/forms/fuel" style={{ color: palette.red }}>
            Formularzu Paliwowym
          </a>
          .
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
            {groups.map((g) => {
              const s = summarizeFuel(g.entries);
              return (
                <div key={g.id} style={styles.row}>
                  <strong style={{ minWidth: 110 }}>{g.label}</strong>
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
