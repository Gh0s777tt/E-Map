"use client";

import {
  deleteVehicleCost,
  insertVehicleCost,
  latestOdometers,
  listFuelCardsByVehicle,
  listFuelLogs,
  listOrders,
  listServiceTasks,
  listVehicleCosts,
  listVehicles,
  type Order,
  type ServiceTask,
  type VehicleCost,
} from "@e-logistic/api";
import {
  consumptionFullToFull,
  detectFuelAnomalies,
  type ExpiryLevel,
  expiryStatus,
  FUEL_CARD_PROVIDER_LABELS,
  type FuelCardProvider,
  formatCardExpiry,
  fuelByMonth,
  fuelConsumptionSeries,
  monthsEndingAt,
  round2,
  serviceStatus,
  sumCostsByCategory,
  summarizeFuel,
  VEHICLE_COST_CATEGORIES,
  VEHICLE_COST_CATEGORY_LABELS,
  type VehicleCostCategory,
  vehicleCostSchema,
  vehiclePnl,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { ListStatus } from "@/components/ListStatus";
import { useT } from "@/components/LocaleProvider";
import { Badge, BarChart, Button, PageHeader } from "@/components/ui";
import { orderStatusLabel } from "@/lib/labels";
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
  created_at: string;
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
  const t = useT();
  const confirm = useConfirm();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [vehicle, setVehicle] = useState<DbVehicle | null>(null);
  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [odo, setOdo] = useState<Record<string, number>>({});
  const [cards, setCards] = useState<FuelCard[]>([]);
  const [fuel, setFuel] = useState<FuelRaw[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Formularz kosztu
  const [costCategory, setCostCategory] = useState<VehicleCostCategory>("repair");
  const [costAmount, setCostAmount] = useState("");
  const [costDate, setCostDate] = useState("");
  const [costDesc, setCostDesc] = useState("");
  const [costMsg, setCostMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const sb = getBrowserSupabase();
      const m = await getCachedMembership(sb);
      if (!m) return;
      setCompanyId(m.companyId);
      setCanManage(m.role === "owner" || m.role === "dispatcher");
      const [vs, st, od, cd, f, ord, vc] = await Promise.all([
        listVehicles(sb, m.companyId),
        listServiceTasks(sb, m.companyId),
        latestOdometers(sb, m.companyId),
        listFuelCardsByVehicle(sb, id),
        listFuelLogs(sb, { vehicleId: id, limit: 2000 }),
        listOrders(sb, m.companyId),
        listVehicleCosts(sb, m.companyId, { vehicleId: id }),
      ]);
      setVehicle((vs as DbVehicle[]).find((v) => v.id === id) ?? null);
      setTasks(st.filter((t) => t.vehicle_id === id));
      setOdo(od);
      setCards(cd as FuelCard[]);
      setFuel(f as FuelRaw[]);
      setOrders((ord as Order[]).filter((o) => o.vehicle_id === id));
      setCosts(vc);
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

  // Wydatek na paliwo per miesiąc — ostatnie 6 mies. (wykres na karcie).
  const fuelMonths = useMemo(() => {
    const months = monthsEndingAt(new Date().toISOString().slice(0, 7), 6);
    return fuelByMonth(
      fuel.map((r) => ({
        date: r.created_at.slice(0, 10),
        liters: Number(r.liters),
        spend: Number(r.price_total ?? 0),
      })),
      months,
    );
  }, [fuel]);

  const orderStats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "delivered" || o.status === "invoiced");
    const revenueEur = round2(
      delivered.filter((o) => o.currency === "EUR").reduce((a, o) => a + (o.price ?? 0), 0),
    );
    return { total: orders.length, delivered: delivered.length, revenueEur };
  }, [orders]);

  // Koszty inne niż paliwo (tylko EUR liczone w sumie i podziale na kategorie).
  const costSummary = useMemo(() => {
    const eur = costs.filter((c) => c.currency === "EUR");
    const totalEur = round2(eur.reduce((a, c) => a + Number(c.amount), 0));
    const byCategory = sumCostsByCategory(
      eur.map((c) => ({
        vehicleId: c.vehicle_id,
        category: c.category,
        amountEur: Number(c.amount),
      })),
    );
    return { totalEur, byCategory };
  }, [costs]);

  // Koszty (EUR, bez paliwa) per miesiąc — ostatnie 6 mies. (wykres na karcie).
  const costMonths = useMemo(() => {
    const months = monthsEndingAt(new Date().toISOString().slice(0, 7), 6);
    return fuelByMonth(
      costs
        .filter((c) => c.currency === "EUR")
        .map((c) => ({ date: c.cost_date, liters: 0, spend: Number(c.amount) })),
      months,
    );
  }, [costs]);

  // Mini P&L pojazdu: przychód − paliwo − koszty (EUR).
  const pnl = useMemo(
    () =>
      vehiclePnl({
        revenueEur: orderStats.revenueEur,
        fuelEur: fuelStats.spend,
        costsEur: costSummary.totalEur,
      }),
    [orderStats.revenueEur, fuelStats.spend, costSummary.totalEur],
  );

  async function saveCost() {
    setCostMsg(null);
    const parsed = vehicleCostSchema.safeParse({
      vehicleId: id,
      category: costCategory,
      amount: costAmount ? Number(costAmount) : Number.NaN,
      currency: "EUR",
      costDate: costDate || today,
      description: costDesc.trim() || undefined,
    });
    if (!parsed.success) {
      setCostMsg("Podaj kwotę i datę kosztu.");
      return;
    }
    if (!companyId) {
      setCostMsg("Brak firmy.");
      return;
    }
    try {
      await insertVehicleCost(getBrowserSupabase(), parsed.data, companyId);
      setCostAmount("");
      setCostDesc("");
      setCostMsg("✅ Koszt dodany.");
      await load();
    } catch (e) {
      setCostMsg(e instanceof Error ? e.message : "Błąd zapisu kosztu.");
    }
  }

  async function removeCost(c: VehicleCost) {
    if (!(await confirm("Usunąć ten koszt?"))) return;
    try {
      await deleteVehicleCost(getBrowserSupabase(), c.id);
      await load();
    } catch (e) {
      setCostMsg(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }

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

          {/* Mini P&L pojazdu */}
          <h2 style={styles.h2}>
            💰 Zysk pojazdu (P&L){" "}
            <span style={styles.dim}>· zlecenia dostarczone/zafakturowane, EUR</span>
          </h2>
          <div style={styles.statsRow}>
            <Stat label="Przychód" value={`${pnl.revenue} €`} accent="#22c55e" />
            <Stat label="− Paliwo" value={`${pnl.fuel} €`} />
            <Stat label="− Koszty" value={`${pnl.costs} €`} />
            <Stat
              label="Zysk"
              value={`${pnl.net} €`}
              accent={pnl.net >= 0 ? "#22c55e" : palette.red}
            />
            <Stat
              label="Marża"
              value={pnl.marginPct != null ? `${pnl.marginPct}%` : "—"}
              accent={pnl.net >= 0 ? "#22c55e" : palette.red}
            />
          </div>

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
                  {c.valid_until ? ` · do ${formatCardExpiry(c.valid_until)}` : ""}
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
          {fuelMonths.some((p) => p.spend > 0) && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...styles.dim, marginBottom: 6 }}>
                Wydatek na paliwo — ostatnie 6 mies.
              </div>
              <BarChart
                data={fuelMonths.map((p) => ({
                  label: `${p.month.slice(5)}.${p.month.slice(2, 4)}`,
                  value: p.spend,
                }))}
                unit=" €"
              />
            </div>
          )}

          {/* Koszty (inne niż paliwo) */}
          <h2 style={styles.h2}>Koszty (naprawy, leasing, ubezpieczenie…)</h2>
          <div style={styles.statsRow}>
            <Stat
              label="Koszty razem (EUR)"
              value={`${costSummary.totalEur} €`}
              accent={palette.red}
            />
            {costSummary.byCategory.slice(0, 4).map((c) => (
              <Stat key={c.category} label={c.label} value={`${c.amountEur} €`} />
            ))}
          </div>
          {costMonths.some((p) => p.spend > 0) && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...styles.dim, marginBottom: 6 }}>
                Koszty (EUR, bez paliwa) — ostatnie 6 mies.
              </div>
              <BarChart
                data={costMonths.map((p) => ({
                  label: `${p.month.slice(5)}.${p.month.slice(2, 4)}`,
                  value: p.spend,
                }))}
                unit=" €"
              />
            </div>
          )}

          {canManage && (
            <div style={styles.costForm}>
              <select
                style={styles.costInput}
                value={costCategory}
                onChange={(e) => setCostCategory(e.target.value as VehicleCostCategory)}
              >
                {VEHICLE_COST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {VEHICLE_COST_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <input
                style={{ ...styles.costInput, maxWidth: 120 }}
                type="number"
                inputMode="decimal"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="kwota €"
              />
              <input
                style={{ ...styles.costInput, maxWidth: 160 }}
                type="date"
                value={costDate}
                onChange={(e) => setCostDate(e.target.value)}
              />
              <input
                style={styles.costInput}
                value={costDesc}
                onChange={(e) => setCostDesc(e.target.value)}
                placeholder="opis (opcjonalnie)"
              />
              <Button onClick={saveCost}>Dodaj</Button>
            </div>
          )}
          {costMsg && <p style={styles.dim}>{costMsg}</p>}

          {costs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {costs.slice(0, 30).map((c) => (
                <div key={c.id} style={styles.lineRow}>
                  <strong style={{ minWidth: 130 }}>
                    {VEHICLE_COST_CATEGORY_LABELS[c.category as VehicleCostCategory] ?? c.category}
                  </strong>
                  <span style={{ minWidth: 90, fontWeight: 700 }}>
                    {round2(Number(c.amount))} {c.currency}
                  </span>
                  <span style={styles.dim}>{c.cost_date}</span>
                  {c.description && <span style={styles.dim}>· {c.description}</span>}
                  <span style={{ flex: 1 }} />
                  {canManage && (
                    <Button variant="danger" onClick={() => removeCost(c)}>
                      🗑️
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

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
                  <Badge color={palette.smoke}>{orderStatusLabel(t, o.status)}</Badge>
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
  costForm: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 },
  costInput: {
    flex: 1,
    minWidth: 120,
    background: palette.black,
    border: `1px solid ${palette.graphite}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: palette.offWhite,
  },
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
