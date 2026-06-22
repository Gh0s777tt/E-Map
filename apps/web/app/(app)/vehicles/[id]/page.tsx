"use client";

import {
  latestOdometers,
  listFuelCardsByVehicle,
  listFuelLogs,
  listOrders,
  listServiceTasks,
  listVehicles,
  type Order,
  type ServiceTask,
} from "@e-logistic/api";
import {
  consumptionFullToFull,
  detectFuelAnomalies,
  type ExpiryLevel,
  expiryStatus,
  FUEL_CARD_PROVIDER_LABELS,
  type FuelCardProvider,
  fuelConsumptionSeries,
  ORDER_STATUS_LABELS,
  round2,
  serviceStatus,
  summarizeFuel,
} from "@e-logistic/core";
import { palette } from "@e-logistic/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListStatus } from "@/components/ListStatus";
import { Badge, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";

type DbVehicle = Awaited<ReturnType<typeof listVehicles>>[number];
type FuelCard = {
  id: string;
  provider: string;
  card_number_masked: string | null;
  valid_until: string | null;
};
type FuelRaw = {
  odometer_km: number;
  liters: number;
  price_total: number | null;
  is_full: boolean | null;
};

const EXPIRY_COLOR: Record<ExpiryLevel, string> = {
  expired: palette.red,
  soon: "#f59e0b",
  ok: "#22c55e",
};
const VEH_DOCS: { key: "inspection_expiry" | "insurance_expiry" | "leasing_end"; label: string }[] =
  [
    { key: "inspection_expiry", label: "Przegląd" },
    { key: "insurance_expiry", label: "OC" },
    { key: "leasing_end", label: "Leasing" },
  ];

export default function VehicleCardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [vehicle, setVehicle] = useState<DbVehicle | null>(null);
  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [odo, setOdo] = useState<Record<string, number>>({});
  const [cards, setCards] = useState<FuelCard[]>([]);
  const [fuel, setFuel] = useState<FuelRaw[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      const [vs, st, od, cd, f, ord] = await Promise.all([
        listVehicles(sb, m.companyId),
        listServiceTasks(sb, m.companyId),
        latestOdometers(sb, m.companyId),
        listFuelCardsByVehicle(sb, id),
        listFuelLogs(sb, { vehicleId: id, limit: 2000 }),
        listOrders(sb, m.companyId),
      ]);
      setVehicle((vs as DbVehicle[]).find((v) => v.id === id) ?? null);
      setTasks(st.filter((t) => t.vehicle_id === id));
      setOdo(od);
      setCards(cd as FuelCard[]);
      setFuel(f as FuelRaw[]);
      setOrders((ord as Order[]).filter((o) => o.vehicle_id === id));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Nie udało się pobrać danych pojazdu.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const currentKm = odo[id] ?? null;

  const fuelStats = useMemo(() => {
    const entries = fuel.map((r) => ({
      odometerKm: r.odometer_km,
      liters: Number(r.liters),
      priceTotal: r.price_total != null ? Number(r.price_total) : undefined,
      isFull: r.is_full !== false,
    }));
    const s = summarizeFuel(entries);
    return {
      count: s.count,
      liters: s.totalLiters,
      spend: s.totalSpend,
      cons: consumptionFullToFull(entries),
      anomalies: detectFuelAnomalies(fuelConsumptionSeries(entries)).length,
    };
  }, [fuel]);

  const orderStats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "delivered" || o.status === "invoiced");
    const revenueEur = round2(
      delivered.filter((o) => o.currency === "EUR").reduce((a, o) => a + (o.price ?? 0), 0),
    );
    return { total: orders.length, delivered: delivered.length, revenueEur };
  }, [orders]);

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/vehicles" className="app-navlink" style={{ fontSize: 13 }}>
          ← Pojazdy
        </Link>
      </div>

      <ListStatus
        loading={loading}
        error={loadErr}
        empty={!loading && !vehicle}
        emptyText="Nie znaleziono pojazdu."
        onRetry={load}
      />

      {!loading && vehicle && (
        <>
          <PageHeader
            title={vehicle.registration}
            subtitle={`${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}${
              vehicle.year ? ` · ${vehicle.year}` : ""
            } · ${vehicle.vehicle_type ?? "—"}`}
          />

          {/* Dokumenty / terminy */}
          <h2 style={styles.h2}>Dokumenty i terminy</h2>
          <div style={styles.grid}>
            {VEH_DOCS.map((doc) => {
              const date = vehicle[doc.key] as string | null;
              const st = date ? expiryStatus(date, today) : null;
              return (
                <div key={doc.key} style={styles.docCard}>
                  <div style={styles.dim}>{doc.label}</div>
                  <div style={{ fontWeight: 700 }}>{date ?? "— brak —"}</div>
                  {st && (
                    <Badge color={EXPIRY_COLOR[st.level]}>
                      {st.level === "expired"
                        ? `po terminie (${-st.daysLeft} dni)`
                        : st.level === "soon"
                          ? `za ${st.daysLeft} dni`
                          : "ważny"}
                    </Badge>
                  )}
                </div>
              );
            })}
            <div style={styles.docCard}>
              <div style={styles.dim}>Ubezpieczyciel</div>
              <div style={{ fontWeight: 700 }}>{vehicle.insurer ?? "—"}</div>
              {vehicle.vin && <div style={styles.dim}>VIN {vehicle.vin}</div>}
            </div>
          </div>

          {/* Serwis */}
          <h2 style={styles.h2}>
            Serwis {currentKm != null && <span style={styles.dim}>· przebieg {currentKm} km</span>}
          </h2>
          {tasks.length === 0 ? (
            <p style={styles.dim}>Brak zaplanowanych zadań serwisowych.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tasks.map((t) => {
                const st = serviceStatus(currentKm, t.last_done_km, t.interval_km);
                return (
                  <div key={t.id} style={styles.lineRow}>
                    <strong style={{ minWidth: 140 }}>{t.name}</strong>
                    {t.interval_km && <span style={styles.dim}>co {t.interval_km} km</span>}
                    <span style={{ flex: 1 }} />
                    {st.kmLeft != null && (
                      <Badge color={EXPIRY_COLOR[st.level]}>
                        {st.kmLeft < 0 ? `przekroczono o ${-st.kmLeft} km` : `za ${st.kmLeft} km`}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Karty paliwowe */}
          <h2 style={styles.h2}>Karty paliwowe</h2>
          {cards.length === 0 ? (
            <p style={styles.dim}>Brak kart przypisanych do pojazdu.</p>
          ) : (
            <div style={styles.body}>
              {cards.map((c) => (
                <span key={c.id} style={styles.tag}>
                  💳 {FUEL_CARD_PROVIDER_LABELS[c.provider as FuelCardProvider] ?? c.provider}{" "}
                  {c.card_number_masked ?? ""}
                  {c.valid_until ? ` · do ${c.valid_until}` : ""}
                </span>
              ))}
            </div>
          )}

          {/* Paliwo */}
          <h2 style={styles.h2}>Paliwo</h2>
          <div style={styles.statsRow}>
            <Stat label="Tankowań" value={String(fuelStats.count)} />
            <Stat label="Litry" value={`${fuelStats.liters} L`} />
            <Stat label="Wydatek" value={`${fuelStats.spend} €`} />
            <Stat
              label="Śr. spalanie"
              value={fuelStats.cons != null ? `${fuelStats.cons} L/100km` : "—"}
            />
            <Stat
              label="Anomalie"
              value={String(fuelStats.anomalies)}
              accent={fuelStats.anomalies > 0 ? palette.red : "#22c55e"}
            />
          </div>

          {/* Zlecenia */}
          <h2 style={styles.h2}>Zlecenia</h2>
          <div style={styles.statsRow}>
            <Stat label="Zleceń" value={String(orderStats.total)} />
            <Stat label="Dostarczone" value={String(orderStats.delivered)} />
            <Stat label="Przychód (EUR)" value={`${orderStats.revenueEur} €`} accent="#22c55e" />
          </div>
          {orders.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {orders.slice(0, 12).map((o) => (
                <div key={o.id} style={styles.lineRow}>
                  <strong style={{ minWidth: 110 }}>{o.reference_no || "(bez nr)"}</strong>
                  <Badge color={palette.smoke}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                  <span style={styles.dim}>
                    {o.origin || "?"} → {o.destination || "?"}
                  </span>
                  <span style={{ flex: 1 }} />
                  {o.load_date && <span style={styles.dim}>{o.load_date}</span>}
                </div>
              ))}
              {orders.length > 12 && <span style={styles.dim}>…i {orders.length - 12} więcej</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ fontSize: 12, color: palette.smoke }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ?? palette.offWhite }}>
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h2: { fontSize: 15, fontWeight: 700, marginTop: 24, marginBottom: 8 },
  grid: { display: "flex", gap: 12, flexWrap: "wrap" },
  docCard: {
    flex: 1,
    minWidth: 150,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  body: { display: "flex", gap: 8, flexWrap: "wrap", fontSize: 14, alignItems: "center" },
  dim: { color: palette.smoke, fontSize: 13 },
  tag: {
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 13,
  },
  statsRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  statCard: {
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 10,
    padding: "10px 16px",
    minWidth: 110,
  },
  lineRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 8,
    background: palette.nearBlack,
    border: `1px solid ${palette.graphite}`,
    fontSize: 14,
  },
};
