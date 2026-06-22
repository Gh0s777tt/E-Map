import { describe, expect, it } from "vitest";
import { clientProfitability, clientProfitTrend, type ProfitOrderEntry } from "./profitability";

const o = (p: Partial<ProfitOrderEntry>): ProfitOrderEntry => ({
  shipper: "A",
  vehicleId: "v1",
  price: 1000,
  currency: "EUR",
  status: "delivered",
  ...p,
});

describe("clientProfitability", () => {
  it("przypisuje koszt pojazdu proporcjonalnie do przychodu zleceń", () => {
    // v1: koszt 300; dwa zlecenia EUR 1000 (A) i 500 (B) → udział 2:1.
    const r = clientProfitability(
      [o({ shipper: "A", price: 1000 }), o({ shipper: "B", price: 500 })],
      [{ vehicleId: "v1", cost: 300 }],
    );
    const a = r.clients.find((c) => c.client === "A");
    const b = r.clients.find((c) => c.client === "B");
    expect(a?.costEur).toBe(200); // 300 * 1000/1500
    expect(b?.costEur).toBe(100); // 300 * 500/1500
    expect(a?.profitEur).toBe(800);
    expect(b?.profitEur).toBe(400);
    expect(r.totalRevenueEur).toBe(1500);
    expect(r.totalAttributedCostEur).toBe(300);
    expect(r.totalProfitEur).toBe(1200);
    expect(r.unattributedCostEur).toBe(0);
  });

  it("liczy marżę procentową", () => {
    const r = clientProfitability([o({ price: 1000 })], [{ vehicleId: "v1", cost: 250 }]);
    expect(r.clients[0]?.marginPct).toBe(75); // (1000-250)/1000*100
  });

  it("sortuje malejąco po zysku", () => {
    const r = clientProfitability(
      [o({ shipper: "Maly", price: 200 }), o({ shipper: "Duzy", price: 5000 })],
      [],
    );
    expect(r.clients[0]?.client).toBe("Duzy");
  });

  it("pomija zlecenia niezrealizowane i nie-EUR", () => {
    const r = clientProfitability(
      [
        o({ status: "new" }),
        o({ status: "cancelled" }),
        o({ currency: "PLN" }),
        o({ price: 800, status: "invoiced" }),
      ],
      [],
    );
    expect(r.totalRevenueEur).toBe(800);
    expect(r.clients).toHaveLength(1);
    expect(r.clients[0]?.orders).toBe(1);
  });

  it("koszt pojazdu bez przychodu EUR → unattributed (nie wlicza w marżę)", () => {
    const r = clientProfitability(
      [o({ vehicleId: "v1", price: 1000 })],
      [
        { vehicleId: "v1", cost: 200 },
        { vehicleId: "v2", cost: 500 }, // brak zleceń na v2
      ],
    );
    expect(r.clients[0]?.costEur).toBe(200);
    expect(r.unattributedCostEur).toBe(500);
  });

  it("zlecenie bez pojazdu → koszt 0 i ślad w noVehicleRevenueEur", () => {
    const r = clientProfitability(
      [o({ vehicleId: null, price: 1200 })],
      [{ vehicleId: "v1", cost: 400 }],
    );
    expect(r.clients[0]?.costEur).toBe(0);
    expect(r.noVehicleRevenueEur).toBe(1200);
    expect(r.unattributedCostEur).toBe(400); // v1 nie obsłużył żadnego zlecenia
  });

  it("pusty nadawca grupuje się jako (bez nadawcy), totale spójne", () => {
    const r = clientProfitability(
      [o({ shipper: "", price: 300 }), o({ shipper: null, price: 100 })],
      [],
    );
    expect(r.clients[0]?.client).toBe("(bez nadawcy)");
    expect(r.clients[0]?.revenueEur).toBe(400);
    expect(r.totalRevenueEur).toBe(400);
  });

  it("brak danych → zera i pusta lista", () => {
    const r = clientProfitability([], []);
    expect(r.clients).toHaveLength(0);
    expect(r.totalRevenueEur).toBe(0);
    expect(r.totalProfitEur).toBe(0);
  });
});

describe("clientProfitTrend", () => {
  const om = (m: string, p: Partial<ProfitOrderEntry>) => ({ ...o(p), month: m });

  it("liczy punkt per miesiąc dla wskazanego klienta", () => {
    const orders = [
      om("2026-01", { shipper: "A", price: 1000 }),
      om("2026-02", { shipper: "A", price: 2000 }),
    ];
    const costs = [
      { vehicleId: "v1", cost: 200, month: "2026-01" },
      { vehicleId: "v1", cost: 400, month: "2026-02" },
    ];
    const trend = clientProfitTrend("A", orders, costs, ["2026-01", "2026-02"]);
    expect(trend).toHaveLength(2);
    expect(trend[0]).toMatchObject({
      month: "2026-01",
      revenueEur: 1000,
      costEur: 200,
      profitEur: 800,
    });
    expect(trend[1]).toMatchObject({
      month: "2026-02",
      revenueEur: 2000,
      costEur: 400,
      profitEur: 1600,
    });
  });

  it("miesiąc bez aktywności klienta → punkt zerowy (bez dziur)", () => {
    const orders = [om("2026-02", { shipper: "A", price: 500 })];
    const trend = clientProfitTrend("A", orders, [], ["2026-01", "2026-02", "2026-03"]);
    expect(trend.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(trend[0]).toMatchObject({ revenueEur: 0, profitEur: 0, marginPct: null });
    expect(trend[1]?.revenueEur).toBe(500);
    expect(trend[2]?.revenueEur).toBe(0);
  });

  it("izoluje wybranego klienta (nie miesza z innymi)", () => {
    const orders = [
      om("2026-01", { shipper: "A", price: 1000 }),
      om("2026-01", { shipper: "B", price: 9000 }),
    ];
    const trend = clientProfitTrend("A", orders, [], ["2026-01"]);
    expect(trend[0]?.revenueEur).toBe(1000);
  });
});
