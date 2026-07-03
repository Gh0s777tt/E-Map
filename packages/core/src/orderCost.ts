/**
 * Koszt transportu per zlecenie (#246) — funkcje czyste, deterministyczne, testowane.
 *
 * Model: zlecenie powiązane ze zdarzeniami trasy (`order_id`, migracja 0052) ma
 * **załadunek** i **rozładunek**. Dystans transportu = licznik(rozładunek) − licznik(załadunek)
 * dla tego samego pojazdu. Koszt = dystans × koszt/km pojazdu, gdzie koszt/km liczony jest
 * z historii tankowań pojazdu: (Σ paliwo + Σ AdBlue) / dystans z liczników tankowań.
 *
 * To **przybliżenie** (jak reszta metryk kosztowych w aplikacji): koszt/km z całej historii
 * pojazdu, nie z dokładnego okna zlecenia. Bez myta, kierowcy, leasingu — traktuj jako
 * wskaźnik relatywny. Zysk liczony gdy znana stawka zlecenia (ta sama waluta co koszt).
 */
import { round2 } from "./money";

export interface OrderLegEvent {
  orderId: string | null;
  action: string; // load | unload | start | end | service | other
  vehicleId: string | null;
  odometerKm: number | null;
  createdAt: string;
}

export interface OrderCostFuelEntry {
  vehicleId: string | null;
  odometerKm: number;
  liters: number;
  priceTotal?: number | null;
}

export interface OrderRef {
  id: string;
  price: number | null;
  currency: string;
}

export type OrderCostMethod = "perKm" | "none";

export interface OrderTransportCost {
  orderId: string;
  vehicleId: string | null;
  distanceKm: number | null;
  durationDays: number | null;
  costPerKm: number | null;
  cost: number | null;
  method: OrderCostMethod;
  revenue: number | null;
  currency: string;
  profit: number | null;
  marginPercent: number | null;
  loadAt: string | null;
  unloadAt: string | null;
  /** Ma komplet: załadunek + rozładunek (ten sam pojazd) z licznikami oraz policzony koszt. */
  complete: boolean;
}

export interface OrderTransportCostInput {
  orders: OrderRef[];
  /** Zdarzenia trasy powiązane ze zleceniami (`order_id`). */
  events: OrderLegEvent[];
  /** Tankowania paliwa — do wyliczenia kosztu/km pojazdu. */
  fuel: OrderCostFuelEntry[];
  /** Tankowania AdBlue — doliczane do licznika kosztu (opcjonalne). */
  adblue?: OrderCostFuelEntry[];
  /** Nadpisanie kosztu/km per pojazd (pierwszeństwo przed wyliczeniem z paliwa). */
  costPerKmByVehicle?: Record<string, number>;
}

function daysBetween(a: string, b: string): number | null {
  const t1 = Date.parse(a);
  const t2 = Date.parse(b);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return null;
  return Math.max(0, Math.round((t2 - t1) / 86_400_000));
}

/**
 * Koszt paliwa (+AdBlue) na km per pojazd z historii tankowań:
 * (Σ priceTotal paliwa + Σ priceTotal AdBlue) / (max−min licznik z tankowań paliwa).
 * Zwraca `null` dla pojazdu, gdy < 2 tankowań paliwa lub dystans = 0.
 */
export function fuelCostPerKmByVehicle(
  fuel: OrderCostFuelEntry[],
  adblue: OrderCostFuelEntry[] = [],
): Record<string, number> {
  const byVehicle = new Map<string, OrderCostFuelEntry[]>();
  for (const e of fuel) {
    if (!e.vehicleId) continue;
    const arr = byVehicle.get(e.vehicleId) ?? [];
    arr.push(e);
    byVehicle.set(e.vehicleId, arr);
  }
  const adblueSpend = new Map<string, number>();
  for (const e of adblue) {
    if (!e.vehicleId) continue;
    adblueSpend.set(e.vehicleId, (adblueSpend.get(e.vehicleId) ?? 0) + (e.priceTotal ?? 0));
  }

  const out: Record<string, number> = {};
  for (const [vehicleId, entries] of byVehicle) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort((a, b) => a.odometerKm - b.odometerKm);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) continue;
    const distance = last.odometerKm - first.odometerKm;
    if (distance <= 0) continue;
    const fuelSpend = entries.reduce((s, e) => s + (e.priceTotal ?? 0), 0);
    const spend = fuelSpend + (adblueSpend.get(vehicleId) ?? 0);
    if (spend <= 0) continue;
    out[vehicleId] = round2(spend / distance);
  }
  return out;
}

/**
 * Liczy koszt transportu dla każdego zlecenia, które ma powiązane zdarzenia trasy.
 * Zlecenia bez `order_id` w zdarzeniach są pomijane (brak danych). Zwraca posortowane
 * malejąco po dacie rozładunku (najświeższe pierwsze).
 */
export function orderTransportCosts(input: OrderTransportCostInput): OrderTransportCost[] {
  const orderById = new Map(input.orders.map((o) => [o.id, o]));
  const derived = fuelCostPerKmByVehicle(input.fuel, input.adblue ?? []);
  const override = input.costPerKmByVehicle ?? {};

  // Grupuj zdarzenia per zlecenie.
  const byOrder = new Map<string, OrderLegEvent[]>();
  for (const e of input.events) {
    if (!e.orderId || !orderById.has(e.orderId)) continue;
    const arr = byOrder.get(e.orderId) ?? [];
    arr.push(e);
    byOrder.set(e.orderId, arr);
  }

  const result: OrderTransportCost[] = [];
  for (const [orderId, events] of byOrder) {
    const order = orderById.get(orderId);
    if (!order) continue;

    const loads = events
      .filter((e) => e.action === "load")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const unloads = events
      .filter((e) => e.action === "unload")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const load = loads[0] ?? null; // pierwszy załadunek
    const unload = unloads[unloads.length - 1] ?? null; // ostatni rozładunek

    const vehicleId = unload?.vehicleId ?? load?.vehicleId ?? null;

    // Dystans tylko gdy załadunek i rozładunek na TYM SAMYM pojeździe (liczniki porównywalne).
    const sameVehicle =
      load != null &&
      unload != null &&
      load.vehicleId != null &&
      load.vehicleId === unload.vehicleId;
    const distanceKm =
      sameVehicle &&
      load?.odometerKm != null &&
      unload?.odometerKm != null &&
      unload.odometerKm >= load.odometerKm
        ? unload.odometerKm - load.odometerKm
        : null;

    const costPerKm =
      (vehicleId != null ? (override[vehicleId] ?? derived[vehicleId]) : undefined) ?? null;
    const cost = distanceKm != null && costPerKm != null ? round2(distanceKm * costPerKm) : null;
    const method: OrderCostMethod = cost != null ? "perKm" : "none";

    const revenue = order.price ?? null;
    const profit = revenue != null && cost != null ? round2(revenue - cost) : null;
    const marginPercent =
      revenue != null && revenue > 0 && cost != null
        ? round2(((revenue - cost) / revenue) * 100)
        : null;

    const durationDays =
      load?.createdAt && unload?.createdAt ? daysBetween(load.createdAt, unload.createdAt) : null;

    result.push({
      orderId,
      vehicleId,
      distanceKm,
      durationDays,
      costPerKm,
      cost,
      method,
      revenue,
      currency: order.currency,
      profit,
      marginPercent,
      loadAt: load?.createdAt ?? null,
      unloadAt: unload?.createdAt ?? null,
      complete: distanceKm != null && cost != null,
    });
  }

  result.sort((a, b) => (b.unloadAt ?? "").localeCompare(a.unloadAt ?? ""));
  return result;
}
