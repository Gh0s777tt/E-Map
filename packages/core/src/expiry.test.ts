import { describe, expect, it } from "vitest";
import { expiryStatus } from "./expiry";

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
