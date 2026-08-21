import { describe, expect, it } from "vitest";
import { expiryStatus, serviceDueDate, serviceStatus, serviceUrgency } from "./expiry";

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

  // Granice progów: dzień wygaśnięcia, dzień po, dokładnie warnDays. Flip `<`/`<=` je psuje.
  it("dzień wygaśnięcia (0 dni) to jeszcze soon, nie expired", () => {
    expect(expiryStatus(today, today)).toMatchObject({ daysLeft: 0, level: "soon" });
  });
  it("dzień po terminie (-1) to expired", () => {
    expect(expiryStatus("2026-06-19", today)).toMatchObject({ daysLeft: -1, level: "expired" });
  });
  it("dokładnie warnDays (30 dni) → soon (próg inclusive)", () => {
    expect(expiryStatus("2026-07-20", today)).toMatchObject({ daysLeft: 30, level: "soon" });
  });
  it("warnDays + 1 (31 dni) → ok", () => {
    expect(expiryStatus("2026-07-21", today)).toMatchObject({ daysLeft: 31, level: "ok" });
  });
  it("respektuje własny warnDays na granicy", () => {
    expect(expiryStatus("2026-06-27", today, 7).level).toBe("soon"); // 7 dni == warnDays
    expect(expiryStatus("2026-06-28", today, 7).level).toBe("ok"); // 8 dni > warnDays
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
  it("dokładnie na progu warnKm → soon (inclusive); +1 km → ok", () => {
    expect(serviceStatus(58000, 0, 60000, 2000)).toMatchObject({ kmLeft: 2000, level: "soon" });
    expect(serviceStatus(57999, 0, 60000, 2000)).toMatchObject({ kmLeft: 2001, level: "ok" });
  });
  it("dokładnie na celu (kmLeft 0) → soon, nie expired", () => {
    expect(serviceStatus(60000, 0, 60000)).toMatchObject({ kmLeft: 0, level: "soon" });
  });
});

describe("serviceDueDate", () => {
  it("dodaje interwał miesięczny do daty ostatniego serwisu", () => {
    expect(serviceDueDate("2026-01-15", 12)).toBe("2027-01-15");
  });
  it("brak daty albo interwału (także 0) → null", () => {
    expect(serviceDueDate(null, 12)).toBeNull();
    expect(serviceDueDate("2026-01-15", null)).toBeNull();
    // 0 przechodzi przez formularz mobilny (`optInt("0")`), a „co zero miesięcy"
    // nie jest terminem — bez tego warunku każdy taki wpis byłby wiecznie po terminie.
    expect(serviceDueDate("2026-01-15", 0)).toBeNull();
  });
  it("data nie do sparsowania → null, a nie „Invalid Date”", () => {
    expect(serviceDueDate("kiedyś", 6)).toBeNull();
  });
});

describe("serviceUrgency (gorszy z dwóch wymiarów)", () => {
  const km = { interval_km: 30000, last_done_km: 100000 };
  const kalendarz = { interval_months: 12, last_done_date: "2025-06-01" };

  it("bierze przebieg, gdy to on jest gorszy", () => {
    // 131 000 km przy celu 130 000 = po terminie; kalendarz jeszcze daleko.
    const task = { ...km, interval_months: 12, last_done_date: "2026-06-01" };
    expect(serviceUrgency(task, 131_000, "2026-06-20")).toBe("expired");
  });

  it("bierze kalendarz, gdy to on jest gorszy", () => {
    // Przebieg w normie (zapas 20 000 km), ale przegląd roczny minął dwa tygodnie temu.
    const task = { ...km, ...kalendarz };
    expect(serviceUrgency(task, 110_000, "2026-06-20")).toBe("expired");
  });

  it("pozycja czysto kalendarzowa nie ginie przez brak interwału km", () => {
    /*
     * Tacho, gaśnica i przegląd nie mają interwału przebiegowego, więc sam
     * `serviceStatus` odpowiada na nie „ok" — czyli tak samo jak na auto w normie.
     * To po tej odpowiedzi wypadały z sortowania pilności i z okna renderowania.
     */
    const task = { interval_km: null, last_done_km: null, ...kalendarz };
    expect(serviceUrgency(task, null, "2026-06-20")).toBe("expired");
  });

  it("bez żadnego z interwałów → ok", () => {
    const task = {
      interval_km: null,
      last_done_km: null,
      interval_months: null,
      last_done_date: null,
    };
    expect(serviceUrgency(task, 500_000, "2026-06-20")).toBe("ok");
  });
});
