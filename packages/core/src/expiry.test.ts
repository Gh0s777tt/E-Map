import { describe, expect, it } from "vitest";
import { expiryStatus, serviceStatus } from "./expiry";

describe("expiryStatus", () => {
  const today = "2026-06-20";

  it("wykrywa termin po dacie (expired)", () => {
    const s = expiryStatus("2026-06-10", today);
    expect(s.level).toBe("expired");
    expect(s.daysLeft).toBeLessThan(0);
  });

  it("wykrywa zbliżający się termin (soon, ≤30 dni)", () => {
    expect(expiryStatus("2026-07-10", today).level).toBe("soon");
  });

  it("odległy termin to ok", () => {
    expect(expiryStatus("2026-12-31", today).level).toBe("ok");
  });

  it("liczy dni do terminu", () => {
    expect(expiryStatus("2026-06-30", today).daysLeft).toBe(10);
  });
});

describe("serviceStatus", () => {
  it("po przebiegu, gdy stan ≥ cel", () => {
    const s = serviceStatus(62000, 0, 60000);
    expect(s.dueKm).toBe(60000);
    expect(s.kmLeft).toBe(-2000);
    expect(s.level).toBe("expired");
  });
  it("zbliża się w buforze warnKm", () => {
    expect(serviceStatus(59000, 0, 60000).level).toBe("soon");
  });
  it("ok daleko od celu", () => {
    expect(serviceStatus(10000, 0, 60000).level).toBe("ok");
  });
  it("brak danych → ok/null", () => {
    expect(serviceStatus(null, null, null)).toMatchObject({ kmLeft: null, level: "ok" });
  });
});
