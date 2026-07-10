"use client";

import {
  listFuelCardsSafe,
  listFuelLogs,
  listOrders,
  listTripEvents,
  listVehicleCosts,
  listVehicles,
  type VehicleCost,
} from "@e-logistic/api";
import {
  clientProfitability,
  co2ByClient,
  co2ByVehicle,
  co2PerHundredKm,
  consumptionFullToFull,
  detectFuelAnomalies,
  dieselCo2Kg,
  fleetAlerts,
  fleetPnl,
  fleetPnlByVehicle,
  formatCo2,
  fuelConsumptionSeries,
  orderAnalytics,
  round2,
  sumCostsByCategory,
  summarizeFuel,
} from "@e-logistic/core";
import { cssPalette as palette } from "@e-logistic/ui";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { Badge, PageHeader } from "@/components/ui";
import { getCachedMembership } from "@/lib/membership";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { AlertsBanner } from "./AlertsBanner";
import { EmissionsSection } from "./EmissionsSection";
import { ProfitabilitySection } from "./ProfitabilitySection";
import { entry, FleetStat, type FuelRaw, styles, type TripRaw } from "./shared";
import { type CardOpt, TopUsageSection } from "./TopUsageSection";
import { VehicleDetail } from "./VehicleDetail";

export default function StatsPage() {
  const t = useT();
  const [vehicles, setVehicles] = useState<{ id: string; registration: string }[]>([]);
  const [fuel, setFuel] = useState<FuelRaw[]>([]);
  const [cards, setCards] = useState<CardOpt[]>([]);
  const [adblue, setAdblue] = useState<FuelRaw[]>([]);
  const [trips, setTrips] = useState<TripRaw[]>([]);
  const [orders, setOrders] = useState<
    {
      status: string;
      price: number | null;
      currency: string;
      shipper: string | null;
      origin: string | null;
      destination: string | null;
      vehicle_id: string | null;
      load_date: string | null;
      created_at: string;
    }[]
  >([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const m = await getCachedMembership(sb);
        if (!m) return;
        setCanManage(m.role === "owner" || m.role === "dispatcher");
        // Okno analizy: ostatnie 24 miesiące (pokrywa trend 6 mies., alerty m/m i
        // wykresy) zamiast pobierania całej historii — z limitem bezpieczeństwa.
        const now = new Date();
        const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23, 1))
          .toISOString()
          .slice(0, 10);
        listFuelCardsSafe(sb, m.companyId)
          .then((cs) => setCards(cs as unknown as CardOpt[]))
          .catch(() => {});
        const [f, a, tr, vs, ord, vc] = await Promise.all([
          listFuelLogs(sb, { from, limit: 5000 }),
          listFuelLogs(sb, { table: "adblue_logs", from, limit: 5000 }),
          listTripEvents(sb, { from, limit: 5000 }),
          listVehicles(sb, m.companyId),
          listOrders(sb, m.companyId, { from, limit: 5000 }),
          listVehicleCosts(sb, m.companyId, { from, limit: 5000 }),
        ]);
        setFuel(f as FuelRaw[]);
        setAdblue(a as FuelRaw[]);
        setTrips(tr as TripRaw[]);
        setCosts(vc);
        setOrders(
          ord.map((o) => ({
            status: o.status,
            price: o.price,
            currency: o.currency,
            shipper: o.shipper,
            origin: o.origin,
            destination: o.destination,
            vehicle_id: o.vehicle_id,
            load_date: o.load_date,
            created_at: o.created_at,
          })),
        );
        setVehicles(
          (vs as { id: string; registration: string }[]).map((v) => ({
            id: v.id,
            registration: v.registration,
          })),
        );
      } finally {
        setReady(true);
      }
    })();
  }, []);

  function byV<T extends { vehicle_id: string }>(rows: T[], id: string): T[] {
    return rows.filter((r) => r.vehicle_id === id);
  }

  // Agregaty per pojazd liczone raz na zmianę danych (nie co render — przy wyborze
  // pojazdu nie przeliczamy spalania wszystkich kafelków).
  const tiles = useMemo(
    () =>
      vehicles.map((v) => {
        const fEntries = fuel.filter((r) => r.vehicle_id === v.id).map(entry);
        const s = summarizeFuel(fEntries);
        return {
          id: v.id,
          registration: v.registration,
          count: s.count,
          totalLiters: s.totalLiters,
          spend: s.totalSpend,
          cons: consumptionFullToFull(fEntries),
          tripCount: trips.filter((r) => r.vehicle_id === v.id).length,
          anomalies: detectFuelAnomalies(fuelConsumptionSeries(fEntries)).length,
        };
      }),
    [vehicles, fuel, trips],
  );

  // Pulpit floty — agregaty po wszystkich pojazdach (raz na zmianę danych).
  const fleet = useMemo(() => {
    const consVals = tiles.map((tl) => tl.cons).filter((c): c is number => c != null);
    const ordersRevenueEur = round2(
      orders
        .filter(
          (o) => (o.status === "delivered" || o.status === "invoiced") && o.currency === "EUR",
        )
        .reduce((a, o) => a + (o.price ?? 0), 0),
    );
    return {
      vehicles: tiles.length,
      totalLiters: round2(tiles.reduce((a, tl) => a + tl.totalLiters, 0)),
      totalSpend: round2(tiles.reduce((a, tl) => a + tl.spend, 0)),
      totalTrips: tiles.reduce((a, tl) => a + tl.tripCount, 0),
      anomalies: tiles.reduce((a, tl) => a + tl.anomalies, 0),
      avgCons: consVals.length
        ? round2(consVals.reduce((a, c) => a + c, 0) / consVals.length)
        : null,
      ordersRevenueEur,
    };
  }, [tiles, orders]);

  // Analiza zleceń: top nadawcy, najczęstsze trasy, średnia stawka (raz na zmianę zleceń).
  const analytics = useMemo(() => orderAnalytics(orders, 5), [orders]);

  // Rentowność klientów: koszt paliwa per pojazd → przypisany do zleceń proporcjonalnie
  // do przychodu, zsumowany per nadawca. Tylko zlecenia zrealizowane w EUR.
  const profit = useMemo(() => {
    // Koszt per pojazd = paliwo + koszty pozostałe (EUR) — atrybucja proporcjonalna do przychodu.
    const byVeh = fuel.reduce(
      (m, r) => m.set(r.vehicle_id, (m.get(r.vehicle_id) ?? 0) + Number(r.price_total ?? 0)),
      new Map<string, number>(),
    );
    for (const c of costs) {
      if (c.currency !== "EUR") continue;
      byVeh.set(c.vehicle_id, (byVeh.get(c.vehicle_id) ?? 0) + Number(c.amount));
    }
    const vehicleCosts = [...byVeh].map(([vehicleId, cost]) => ({ vehicleId, cost }));
    return clientProfitability(
      orders.map((o) => ({
        shipper: o.shipper,
        vehicleId: o.vehicle_id,
        price: o.price,
        currency: o.currency,
        status: o.status,
      })),
      vehicleCosts,
    );
  }, [orders, fuel, costs]);

  // Rachunek zysków i strat floty: przychód − paliwo − pozostałe koszty (tylko EUR).
  const pnl = useMemo(() => {
    const fuelEur = fuel.reduce((a, r) => a + Number(r.price_total ?? 0), 0);
    const eurCosts = costs.filter((c) => c.currency === "EUR");
    const otherEur = eurCosts.reduce((a, c) => a + Number(c.amount), 0);
    return {
      result: fleetPnl(fleet.ordersRevenueEur, fuelEur, otherEur),
      byCategory: sumCostsByCategory(
        eurCosts.map((c) => ({
          vehicleId: c.vehicle_id,
          category: c.category,
          amountEur: Number(c.amount),
        })),
      ),
    };
  }, [fuel, costs, fleet.ordersRevenueEur]);

  // Ranking rentowności floty: P&L per pojazd (przychód − paliwo − koszty, EUR).
  const pnlRows = useMemo(() => {
    const fuelByVehicle = tiles.map((tl) => ({ vehicleId: tl.id, eur: tl.spend }));
    const costsByVehicle = costs
      .filter((c) => c.currency === "EUR")
      .map((c) => ({ vehicleId: c.vehicle_id, eur: Number(c.amount) }));
    const regOf = new Map(vehicles.map((v) => [v.id, v.registration]));
    return fleetPnlByVehicle(
      orders.map((o) => ({
        vehicleId: o.vehicle_id,
        price: o.price,
        currency: o.currency,
        status: o.status,
      })),
      fuelByVehicle,
      costsByVehicle,
    ).map((r) => ({ ...r, registration: regOf.get(r.vehicleId) ?? r.vehicleId.slice(0, 8) }));
  }, [orders, tiles, costs, vehicles]);

  // Emisje CO₂ per pojazd (z litrów paliwa) — raport ESG, malejąco.
  const co2Rows = useMemo(
    () =>
      co2ByVehicle(
        tiles.map((t) => ({
          id: t.id,
          registration: t.registration,
          liters: t.totalLiters,
          consumption: t.cons,
        })),
      ),
    [tiles],
  );

  // Emisje CO₂ przypisane do klientów (atrybucja jak rentowność).
  const co2ClientRows = useMemo(
    () =>
      co2ByClient(
        orders.map((o) => ({
          shipper: o.shipper,
          vehicleId: o.vehicle_id,
          price: o.price,
          currency: o.currency,
          status: o.status,
        })),
        tiles.map((t) => ({ vehicleId: t.id, liters: t.totalLiters })),
      ),
    [orders, tiles],
  );

  // Wejście do trendu rentowności: zlecenia i koszty paliwa otagowane miesiącem
  // (zlecenie wg daty załadunku, fallback do utworzenia) + ostatnie 6 miesięcy.
  const trendInput = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - 5 + i, 1).toISOString().slice(0, 7),
    );
    const trendOrders = orders.map((o) => ({
      shipper: o.shipper,
      vehicleId: o.vehicle_id,
      price: o.price,
      currency: o.currency,
      status: o.status,
      month: (o.load_date ?? o.created_at).slice(0, 7),
    }));
    const trendCosts = [
      ...fuel.map((r) => ({
        vehicleId: r.vehicle_id,
        cost: Number(r.price_total ?? 0),
        month: r.created_at.slice(0, 7),
      })),
      ...costs
        .filter((c) => c.currency === "EUR")
        .map((c) => ({
          vehicleId: c.vehicle_id,
          cost: Number(c.amount),
          month: c.cost_date.slice(0, 7),
        })),
    ];
    return { months, orders: trendOrders, costs: trendCosts };
  }, [orders, fuel, costs]);

  // Alerty progowe (ujemna/niska marża, anomalie spalania, skok kosztu paliwa m/m)
  // — liczone z danych już załadowanych na tym ekranie. Tylko zarząd.
  const alerts = useMemo(() => {
    const byMonth = fuel.reduce((m, r) => {
      const k = r.created_at.slice(0, 7);
      return m.set(k, (m.get(k) ?? 0) + Number(r.price_total ?? 0));
    }, new Map<string, number>());
    const fuelCostByMonth = [...byMonth]
      .map(([month, cost]) => ({ month, cost }))
      .sort((a, b) => a.month.localeCompare(b.month));
    return fleetAlerts({
      clients: profit.clients,
      anomalyVehicles: tiles.map((tl) => ({
        registration: tl.registration,
        anomalies: tl.anomalies,
      })),
      fuelCostByMonth,
    });
  }, [profit, tiles, fuel]);

  return (
    <div>
      <PageHeader
        title={t("nav.stats")}
        subtitle={
          'Dane z ostatnich 24 miesięcy. Wybierz pojazd, by zobaczyć jego tankowania i trasy. Spalanie liczone „od pełna do pełna"; tankowania częściowe są wliczane do litrów i kosztów.'
        }
      />

      {ready && vehicles.length === 0 && (
        <p style={{ color: palette.smoke, marginTop: 24 }}>Brak pojazdów / danych.</p>
      )}

      {!selected ? (
        <>
          {canManage && alerts.length > 0 && <AlertsBanner alerts={alerts} />}

          {fleet.vehicles > 0 && (
            <div style={styles.fleet}>
              <FleetStat label="Pojazdy" value={String(fleet.vehicles)} />
              <FleetStat label="Paliwo łącznie" value={`${fleet.totalLiters} L`} />
              <FleetStat label="Wydatek" value={`${fleet.totalSpend} €`} />
              <FleetStat
                label="Śr. spalanie floty"
                value={fleet.avgCons != null ? `${fleet.avgCons} L/100km` : "—"}
              />
              <FleetStat label="Trasy" value={String(fleet.totalTrips)} />
              <FleetStat
                label="Przychód (zlecenia EUR)"
                value={`${fleet.ordersRevenueEur} €`}
                accent="#22c55e"
              />
              <FleetStat
                label="Anomalie spalania"
                value={String(fleet.anomalies)}
                accent={fleet.anomalies > 0 ? palette.red : "#22c55e"}
              />
              <FleetStat
                label="🌱 Ślad węglowy (CO₂)"
                value={formatCo2(dieselCo2Kg(fleet.totalLiters))}
              />
              <FleetStat
                label="CO₂ / 100 km"
                value={fleet.avgCons != null ? `${co2PerHundredKm(fleet.avgCons)} kg` : "—"}
              />
            </div>
          )}

          {canManage && fleet.vehicles > 0 && (
            <div style={styles.pnl}>
              <div style={styles.anHead}>
                💰 Rachunek zysków i strat (P&amp;L){" "}
                <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 12 }}>
                  przychód − paliwo − pozostałe koszty · tylko EUR
                </span>
              </div>
              <div style={styles.fleet}>
                <FleetStat
                  label="Przychód (EUR)"
                  value={`${pnl.result.revenueEur} €`}
                  accent="#22c55e"
                />
                <FleetStat label="Paliwo" value={`${pnl.result.fuelEur} €`} />
                <FleetStat label="Pozostałe koszty" value={`${pnl.result.otherCostEur} €`} />
                <FleetStat label="Koszty razem" value={`${pnl.result.totalCostEur} €`} />
                <FleetStat
                  label="Zysk netto"
                  value={`${pnl.result.profitEur} €`}
                  accent={pnl.result.profitEur >= 0 ? "#22c55e" : palette.red}
                />
                <FleetStat
                  label="Marża"
                  value={pnl.result.marginPct != null ? `${pnl.result.marginPct}%` : "—"}
                  accent={
                    pnl.result.marginPct != null && pnl.result.marginPct >= 0
                      ? "#22c55e"
                      : palette.red
                  }
                />
              </div>
              {pnl.byCategory.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {pnl.byCategory.map((c) => (
                    <span key={c.category} style={styles.pnlTag}>
                      {c.label}: <strong>{c.amountEur} €</strong>
                    </span>
                  ))}
                </div>
              )}
              <p style={{ color: palette.smoke, fontSize: 12, marginTop: 8 }}>
                Pozostałe koszty dodasz na karcie pojazdu (naprawy, leasing, ubezpieczenie…).
                Pozycje w innych walutach są pomijane w sumie.
              </p>
            </div>
          )}

          {canManage && pnlRows.length > 0 && (
            <div style={styles.profitWrap}>
              <div style={styles.anHead}>
                🚚 Ranking rentowności floty (per pojazd){" "}
                <span style={{ color: palette.smoke, fontWeight: 400, fontSize: 12 }}>
                  zysk = przychód − paliwo − koszty · EUR
                </span>
              </div>
              <div style={{ ...styles.profitRow, color: palette.smoke, fontSize: 12 }}>
                <span style={{ flex: 1 }}>Pojazd</span>
                <span style={styles.profitCol}>Przychód</span>
                <span style={styles.profitCol}>Paliwo</span>
                <span style={styles.profitCol}>Koszty</span>
                <span style={styles.profitCol}>Zysk</span>
                <span style={styles.profitCol}>Marża</span>
              </div>
              {pnlRows.map((r) => {
                const color = r.net >= 0 ? "#22c55e" : palette.red;
                return (
                  <div key={r.vehicleId} style={styles.profitRow}>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: 700,
                      }}
                    >
                      {r.registration}
                    </span>
                    <span style={styles.profitCol}>{r.revenue} €</span>
                    <span style={styles.profitCol}>{r.fuel} €</span>
                    <span style={styles.profitCol}>{r.costs} €</span>
                    <span style={{ ...styles.profitCol, color, fontWeight: 700 }}>{r.net} €</span>
                    <span style={{ ...styles.profitCol, color }}>
                      {r.marginPct != null ? `${r.marginPct}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {analytics.count > 0 && (
            <div style={styles.analytics}>
              <div style={styles.anCol}>
                <div style={styles.anHead}>🏆 Top klienci (przychód EUR)</div>
                {analytics.topShippers.map((s) => (
                  <div key={s.name} style={styles.anRow}>
                    <span
                      style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {s.name}
                    </span>
                    <span style={{ color: palette.smoke, fontSize: 12 }}>{s.count} zl.</span>
                    <strong style={{ color: "#22c55e" }}>{s.revenueEur} €</strong>
                  </div>
                ))}
              </div>
              <div style={styles.anCol}>
                <div style={styles.anHead}>📍 Najczęstsze trasy</div>
                {analytics.topRoutes.map((r) => (
                  <div key={r.route} style={styles.anRow}>
                    <span
                      style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {r.route}
                    </span>
                    <strong>{r.count}×</strong>
                  </div>
                ))}
                <div
                  style={{
                    ...styles.anRow,
                    marginTop: 8,
                    borderTop: `1px solid ${palette.graphite}`,
                  }}
                >
                  <span style={{ flex: 1, color: palette.smoke }}>Śr. stawka (EUR)</span>
                  <strong style={{ color: palette.red }}>
                    {analytics.avgRateEur != null ? `${analytics.avgRateEur} €` : "—"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {canManage && profit.clients.length > 0 && (
            <ProfitabilitySection data={profit} trend={trendInput} />
          )}

          {canManage && <TopUsageSection fuel={fuel} cards={cards} />}

          {canManage && co2Rows.length > 0 && (
            <EmissionsSection rows={co2Rows} clientRows={co2ClientRows} />
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 24 }}>
            {tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => setSelected(tile.id)}
                style={styles.tile}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>{tile.registration}</div>
                <div style={{ color: palette.smoke, fontSize: 13, marginTop: 8 }}>
                  ⛽ {tile.count} tank. · {tile.totalLiters} L
                </div>
                <div style={{ color: palette.red, fontWeight: 700, marginTop: 4 }}>
                  {tile.cons != null ? `${tile.cons} L/100km` : "— L/100km"}
                </div>
                <div style={{ color: palette.smoke, fontSize: 12, marginTop: 4 }}>
                  🚚 {tile.tripCount} zdarzeń trasy
                </div>
                {tile.anomalies > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Badge color={palette.red}>⚠️ {tile.anomalies} anomalii spalania</Badge>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      ) : (
        <VehicleDetail
          reg={vehicles.find((v) => v.id === selected)?.registration ?? "?"}
          fuel={byV(fuel, selected)}
          adblue={byV(adblue, selected)}
          trips={byV(trips, selected)}
          onBack={() => setSelected(null)}
        />
      )}
    </div>
  );
}
