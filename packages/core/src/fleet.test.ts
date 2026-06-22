import { describe, expect, it } from "vitest";
import { buildFleetStatus } from "./fleet";

const vehicles = [
  { id: "v1", registration: "DW 1000" },
  { id: "v2", registration: "DW 2000" },
  { id: "v3", registration: "DW 3000" },
];

describe("buildFleetStatus", () => {
  it("klasyfikuje pojazdy: jadący / zaplanowany / wolny i sortuje wg stanu", () => {
    const rows = buildFleetStatus({
      vehicles,
      orders: [
        {
          vehicleId: "v2",
          status: "in_progress",
          referenceNo: "ZL-2",
          origin: "Łódź",
          destination: "Lyon",
          assignedTo: "u2",
          loadDate: "2026-06-20",
          unloadDate: null,
        },
        {
          vehicleId: "v1",
          status: "assigned",
          referenceNo: "ZL-1",
          origin: "Wrocław",
          destination: "Praga",
          assignedTo: "u1",
          loadDate: null,
          unloadDate: null,
        },
      ],
      events: [],
    });
    // v2 (driving) przed v1 (planned) przed v3 (idle)
    expect(rows.map((r) => r.vehicleId)).toEqual(["v2", "v1", "v3"]);
    expect(rows[0]?.state).toBe("driving");
    expect(rows[0]?.order?.destination).toBe("Lyon");
    expect(rows[1]?.state).toBe("planned");
    expect(rows[2]?.state).toBe("idle");
    expect(rows[2]?.order).toBeNull();
  });

  it("in_progress ma pierwszeństwo nad assigned dla tego samego pojazdu", () => {
    const rows = buildFleetStatus({
      vehicles: [{ id: "v1", registration: "DW 1000" }],
      orders: [
        {
          vehicleId: "v1",
          status: "in_progress",
          referenceNo: "A",
          origin: null,
          destination: null,
          assignedTo: null,
          loadDate: null,
          unloadDate: null,
        },
        {
          vehicleId: "v1",
          status: "assigned",
          referenceNo: "B",
          origin: null,
          destination: null,
          assignedTo: null,
          loadDate: null,
          unloadDate: null,
        },
      ],
      events: [],
    });
    expect(rows[0]?.state).toBe("driving");
    expect(rows[0]?.order?.referenceNo).toBe("A");
  });

  it("dołącza najnowsze zdarzenie trasy (wejście od najnowszego)", () => {
    const rows = buildFleetStatus({
      vehicles: [{ id: "v1", registration: "DW 1000" }],
      orders: [],
      events: [
        {
          vehicleId: "v1",
          action: "load",
          location: "Magazyn A",
          country: "PL",
          createdAt: "2026-06-21T10:00:00Z",
        },
        {
          vehicleId: "v1",
          action: "start",
          location: "Baza",
          country: "PL",
          createdAt: "2026-06-20T08:00:00Z",
        },
      ],
    });
    expect(rows[0]?.lastEvent?.action).toBe("load");
    expect(rows[0]?.lastEvent?.location).toBe("Magazyn A");
  });
});
