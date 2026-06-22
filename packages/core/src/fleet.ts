/**
 * Status floty „na żywo" — agregacja stanu pojazdów na podstawie zleceń i zdarzeń trasy.
 * Funkcje czyste (bez I/O). Kolejność wejściowych zleceń/zdarzeń: od najnowszego.
 */

export type FleetVehicleState = "driving" | "planned" | "idle";

export interface FleetStatusOrderInput {
  vehicleId: string | null;
  status: string;
  referenceNo: string | null;
  origin: string | null;
  destination: string | null;
  assignedTo: string | null;
  loadDate: string | null;
  unloadDate: string | null;
}

export interface FleetStatusEventInput {
  vehicleId: string;
  action: string;
  location: string | null;
  country: string | null;
  createdAt: string;
}

export interface FleetStatusOrder {
  referenceNo: string | null;
  origin: string | null;
  destination: string | null;
  assignedTo: string | null;
  loadDate: string | null;
  unloadDate: string | null;
}

export interface FleetStatusEvent {
  action: string;
  location: string | null;
  country: string | null;
  createdAt: string;
}

export interface FleetStatusRow {
  vehicleId: string;
  registration: string;
  state: FleetVehicleState;
  /** Zlecenie nadające stan: „driving" → w trakcie, „planned" → przypisane. */
  order: FleetStatusOrder | null;
  /** Ostatnie zdarzenie trasy pojazdu (najnowsze). */
  lastEvent: FleetStatusEvent | null;
}

const STATE_RANK: Record<FleetVehicleState, number> = { driving: 0, planned: 1, idle: 2 };

function pick(o: FleetStatusOrderInput): FleetStatusOrder {
  return {
    referenceNo: o.referenceNo,
    origin: o.origin,
    destination: o.destination,
    assignedTo: o.assignedTo,
    loadDate: o.loadDate,
    unloadDate: o.unloadDate,
  };
}

/**
 * Buduje status każdego pojazdu:
 * - `driving` gdy ma zlecenie `in_progress` (pokazuje to zlecenie),
 * - `planned` gdy ma zlecenie `assigned` (pokazuje to zlecenie),
 * - `idle` w przeciwnym razie.
 * Dołącza ostatnie (najnowsze) zdarzenie trasy. Zlecenia/zdarzenia zakładane od najnowszego.
 * Wynik posortowany: jadące → zaplanowane → wolne, potem alfabetycznie po rejestracji.
 */
export function buildFleetStatus(input: {
  vehicles: { id: string; registration: string }[];
  orders: FleetStatusOrderInput[];
  events: FleetStatusEventInput[];
}): FleetStatusRow[] {
  // Najnowsze zdarzenie per pojazd (wejście od najnowszego → pierwszy wygrywa).
  const lastEventByVehicle = new Map<string, FleetStatusEvent>();
  for (const e of input.events) {
    if (!lastEventByVehicle.has(e.vehicleId)) {
      lastEventByVehicle.set(e.vehicleId, {
        action: e.action,
        location: e.location,
        country: e.country,
        createdAt: e.createdAt,
      });
    }
  }

  const rows: FleetStatusRow[] = input.vehicles.map((v) => {
    const mine = input.orders.filter((o) => o.vehicleId === v.id);
    const driving = mine.find((o) => o.status === "in_progress");
    const planned = driving ? undefined : mine.find((o) => o.status === "assigned");
    const state: FleetVehicleState = driving ? "driving" : planned ? "planned" : "idle";
    return {
      vehicleId: v.id,
      registration: v.registration,
      state,
      order: driving ? pick(driving) : planned ? pick(planned) : null,
      lastEvent: lastEventByVehicle.get(v.id) ?? null,
    };
  });

  rows.sort(
    (a, b) =>
      STATE_RANK[a.state] - STATE_RANK[b.state] || a.registration.localeCompare(b.registration),
  );
  return rows;
}
