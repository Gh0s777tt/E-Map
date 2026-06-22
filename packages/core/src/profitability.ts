/**
 * Rentowność klientów (nadawców) — przychód minus *przybliżone* koszty paliwa.
 * Funkcje czyste. Model atrybucji jest świadomym przybliżeniem (patrz niżej).
 */
import { round2 } from "./money";

export interface ProfitOrderEntry {
  shipper: string | null;
  vehicleId: string | null;
  price: number | null;
  currency: string;
  status: string;
}

export interface VehicleCostEntry {
  vehicleId: string;
  /** Koszt paliwa (€) zsumowany dla pojazdu w analizowanym okresie. */
  cost: number;
}

export interface ClientProfit {
  client: string;
  orders: number;
  revenueEur: number;
  /** Koszt przypisany (€) — patrz model atrybucji. */
  costEur: number;
  profitEur: number;
  /** Marża = zysk / przychód × 100. null gdy przychód = 0. */
  marginPct: number | null;
}

export interface ClientProfitability {
  clients: ClientProfit[];
  totalRevenueEur: number;
  totalAttributedCostEur: number;
  totalProfitEur: number;
  /** Koszt paliwa pojazdów bez zrealizowanego przychodu EUR — nie da się przypisać. */
  unattributedCostEur: number;
  /** Przychód ze zleceń bez pojazdu — koszt nieprzypisywalny (margines zawyżony). */
  noVehicleRevenueEur: number;
}

const REALIZED = new Set(["delivered", "invoiced"]);
const NO_CLIENT = "(bez nadawcy)";

/**
 * Rentowność per nadawca. **Model atrybucji (przybliżenie):** liczymy tylko
 * zrealizowany przychód EUR (zlecenia `delivered`/`invoiced`, waluta EUR). Koszt
 * paliwa każdego pojazdu rozdzielamy na jego zlecenia *proporcjonalnie do
 * przychodu*, po czym sumujemy per nadawca. Pomija: puste przebiegi, myto, pensje,
 * AdBlue, leasing oraz zlecenia w innych walutach. Koszt pojazdów bez przychodu
 * EUR trafia do `unattributedCostEur` (nie zniekształca marży klientów).
 */
export function clientProfitability(
  orders: ProfitOrderEntry[],
  vehicleCosts: VehicleCostEntry[],
): ClientProfitability {
  const costByVehicle = new Map<string, number>();
  for (const v of vehicleCosts) {
    costByVehicle.set(v.vehicleId, (costByVehicle.get(v.vehicleId) ?? 0) + v.cost);
  }

  const realized = orders.filter(
    (o) => REALIZED.has(o.status) && o.currency === "EUR" && o.price != null && o.price > 0,
  );

  // Przychód EUR per pojazd (baza proporcji atrybucji kosztu).
  const vehRevenue = new Map<string, number>();
  for (const o of realized) {
    if (o.vehicleId)
      vehRevenue.set(o.vehicleId, (vehRevenue.get(o.vehicleId) ?? 0) + (o.price ?? 0));
  }

  const acc = new Map<string, { orders: number; revenue: number; cost: number }>();
  let noVehicleRevenue = 0;
  for (const o of realized) {
    const revenue = o.price ?? 0;
    const name = (o.shipper ?? "").trim() || NO_CLIENT;
    const vehRev = o.vehicleId ? (vehRevenue.get(o.vehicleId) ?? 0) : 0;
    const vehCost = o.vehicleId ? (costByVehicle.get(o.vehicleId) ?? 0) : 0;
    const cost = vehRev > 0 ? (vehCost * revenue) / vehRev : 0;
    if (!o.vehicleId) noVehicleRevenue += revenue;

    const a = acc.get(name) ?? { orders: 0, revenue: 0, cost: 0 };
    a.orders += 1;
    a.revenue += revenue;
    a.cost += cost;
    acc.set(name, a);
  }

  const clients: ClientProfit[] = [...acc.entries()]
    .map(([client, a]) => {
      const revenueEur = round2(a.revenue);
      const costEur = round2(a.cost);
      const profitEur = round2(revenueEur - costEur);
      return {
        client,
        orders: a.orders,
        revenueEur,
        costEur,
        profitEur,
        marginPct: revenueEur > 0 ? round2((profitEur / revenueEur) * 100) : null,
      };
    })
    .sort((x, y) => y.profitEur - x.profitEur || y.revenueEur - x.revenueEur);

  // Koszt pojazdów, których nie objął żaden zrealizowany przychód EUR.
  let unattributed = 0;
  for (const [vehicleId, cost] of costByVehicle) {
    if ((vehRevenue.get(vehicleId) ?? 0) === 0) unattributed += cost;
  }

  const totalRevenueEur = round2(clients.reduce((s, c) => s + c.revenueEur, 0));
  const totalAttributedCostEur = round2(clients.reduce((s, c) => s + c.costEur, 0));
  return {
    clients,
    totalRevenueEur,
    totalAttributedCostEur,
    totalProfitEur: round2(totalRevenueEur - totalAttributedCostEur),
    unattributedCostEur: round2(unattributed),
    noVehicleRevenueEur: round2(noVehicleRevenue),
  };
}

export interface ClientTrendPoint {
  /** Miesiąc w formacie `YYYY-MM`. */
  month: string;
  revenueEur: number;
  costEur: number;
  profitEur: number;
  marginPct: number | null;
}

/**
 * Trend rentowności jednego nadawcy w czasie. Dla każdego miesiąca z `months`
 * uruchamia [clientProfitability] na danych z TEGO miesiąca (zlecenia i koszty
 * paliwa otagowane polem `month`) i wyciąga wiersz wskazanego klienta. Miesiące
 * bez aktywności klienta dają punkt zerowy — żeby seria nie miała dziur.
 */
export function clientProfitTrend(
  client: string,
  orders: (ProfitOrderEntry & { month: string })[],
  vehicleCosts: (VehicleCostEntry & { month: string })[],
  months: string[],
): ClientTrendPoint[] {
  return months.map((month) => {
    const res = clientProfitability(
      orders.filter((o) => o.month === month),
      vehicleCosts.filter((v) => v.month === month),
    );
    const c = res.clients.find((x) => x.client === client);
    return {
      month,
      revenueEur: c?.revenueEur ?? 0,
      costEur: c?.costEur ?? 0,
      profitEur: c?.profitEur ?? 0,
      marginPct: c?.marginPct ?? null,
    };
  });
}
