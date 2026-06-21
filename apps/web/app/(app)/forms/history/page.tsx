"use client";

import { getActiveMembership, listFuelLogs, listTripEvents, listVehicles } from "@e-logistic/api";
import type { FuelLogInput, TripEventInput } from "@e-logistic/core";
import { createTranslator } from "@e-logistic/i18n";
import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { vehicleLabel } from "@/lib/demo";
import { listOutbox, type OutboxItem, removeOutbox, trySync } from "@/lib/outbox";
import { getBrowserSupabase } from "@/lib/supabase/client";

const t = createTranslator("pl");

type Kind = "fuel" | "adblue" | "trip";
type Status = "queued" | "synced" | "error";

type Row = {
  key: string;
  kind: Kind;
  title: string;
  sub: string;
  status: Status;
  error?: string;
  outboxId?: string;
  dbId?: string;
};

const STATUS: Record<Status, { label: string; color: string }> = {
  queued: { label: "W kolejce", color: palette.warning },
  synced: { label: "Zsynchronizowano", color: palette.success },
  error: { label: "Błąd", color: palette.red },
};
const KIND_LABEL: Record<Kind, string> = { fuel: "Paliwo", adblue: "AdBlue", trip: "Trip" };
const ACTION_PL: Record<string, string> = {
  load: "Załadunek",
  unload: "Rozładunek",
  start: "Rozpoczęcie",
  end: "Zakończenie",
  service: "Serwis",
  other: "Inne",
};

function localRow(item: OutboxItem, labelOf: (id: string) => string): Row {
  const when = new Date(item.createdAt).toLocaleString("pl-PL");
  if (item.kind === "trip") {
    const i = item.input as TripEventInput;
    const w = "weightKg" in i ? ` · ${i.weightKg} kg` : "";
    return {
      key: `local/${item.id}`,
      kind: "trip",
      title: `${labelOf(i.vehicleId)} · ${ACTION_PL[i.action] ?? i.action} · ${i.odometerKm} km${w}`,
      sub: `${i.place.country} · ${when}`,
      status: item.status,
      error: item.error,
      outboxId: item.id,
    };
  }
  const i = item.input as FuelLogInput;
  return {
    key: `local/${item.id}`,
    kind: item.kind,
    title: `${labelOf(i.vehicleId)} · ${i.liters} L · ${i.odometerKm} km`,
    sub: `${i.station.country} · ${when}`,
    status: item.status,
    error: item.error,
    outboxId: item.id,
  };
}

export default function FormsHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [source, setSource] = useState<"baza" | "lokalne">("lokalne");

  const load = useCallback(async () => {
    const outbox = listOutbox();
    try {
      const sb = getBrowserSupabase();
      const m = await getActiveMembership(sb);
      if (m) {
        const [fuel, adblue, trips, vehicles] = await Promise.all([
          listFuelLogs(sb),
          listFuelLogs(sb, { table: "adblue_logs" }),
          listTripEvents(sb),
          listVehicles(sb, m.companyId),
        ]);
        const map = new Map(
          (vehicles as { id: string; registration: string }[]).map((v) => [v.id, v.registration]),
        );
        const labelOf = (id: string) => map.get(id) ?? vehicleLabel(id);
        const fuelRows = (kind: Kind, logs: unknown[]) =>
          (
            logs as {
              id: string;
              vehicle_id: string;
              liters: number;
              odometer_km: number;
              station_country: string;
              created_at: string;
            }[]
          ).map<Row>((r) => ({
            key: `${kind}/${r.id}`,
            kind,
            title: `${labelOf(r.vehicle_id)} · ${r.liters} L · ${r.odometer_km} km`,
            sub: `${r.station_country} · ${new Date(r.created_at).toLocaleString("pl-PL")}`,
            status: "synced",
            dbId: r.id,
          }));
        const tripRows = (
          trips as {
            id: string;
            vehicle_id: string;
            action: string;
            odometer_km: number;
            weight_kg: number | null;
            country: string;
            created_at: string;
          }[]
        ).map<Row>((r) => ({
          key: `trip/${r.id}`,
          kind: "trip",
          title: `${labelOf(r.vehicle_id)} · ${ACTION_PL[r.action] ?? r.action} · ${r.odometer_km} km${r.weight_kg != null ? ` · ${r.weight_kg} kg` : ""}`,
          sub: `${r.country} · ${new Date(r.created_at).toLocaleString("pl-PL")}`,
          status: "synced",
          dbId: r.id,
        }));

        const pending = outbox
          .filter((i) => i.status !== "synced")
          .map((i) => localRow(i, labelOf));

        setRows(
          [...pending, ...fuelRows("fuel", fuel), ...fuelRows("adblue", adblue), ...tripRows].sort(
            (a, b) => b.sub.localeCompare(a.sub),
          ),
        );
        setSource("baza");
        return;
      }
    } catch {
      // offline → lokalne
    }
    setRows(outbox.map((i) => localRow(i, vehicleLabel)));
    setSource("lokalne");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resync(outboxId: string) {
    await trySync(outboxId);
    await load();
  }

  function remove(outboxId: string) {
    removeOutbox(outboxId);
    void load();
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{t("common.history")}</h1>
      <p style={{ color: palette.smoke, marginTop: 4 }}>
        Wysłane formularze · źródło: <strong>{source}</strong> (offline-first).
      </p>

      {rows.length === 0 ? (
        <p style={{ color: palette.smoke, marginTop: 24 }}>Brak zapisanych formularzy.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {rows.map((r) => {
            const st = STATUS[r.status];
            return (
              <div key={r.key} style={styles.row}>
                <span style={styles.kind}>{KIND_LABEL[r.kind]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div style={{ color: palette.smoke, fontSize: 13 }}>{r.sub}</div>
                  {r.error && <div style={{ color: palette.red, fontSize: 12 }}>{r.error}</div>}
                </div>
                <span style={{ ...styles.badge, color: st.color, borderColor: st.color }}>
                  {st.label}
                </span>
                {r.status === "synced" && r.dbId && (
                  <Link
                    href={`/forms/${r.kind}?edit=${r.dbId}`}
                    style={{ ...styles.btn, textDecoration: "none" }}
                  >
                    Edytuj
                  </Link>
                )}
                {r.status !== "synced" && r.outboxId && (
                  <>
                    <button
                      type="button"
                      style={styles.btn}
                      onClick={() => resync(r.outboxId as string)}
                    >
                      Ponów
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.btn, color: palette.red, borderColor: palette.red }}
                      onClick={() => remove(r.outboxId as string)}
                    >
                      Usuń
                    </button>
                  </>
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
