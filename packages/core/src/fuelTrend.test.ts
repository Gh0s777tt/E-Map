import { describe, expect, it } from "vitest";
import { type FuelMonthInput, fuelByMonth } from "./fuelTrend";

const data: FuelMonthInput[] = [
  { date: "2026-05-04", liters: 300, spend: 1500 },
  { date: "2026-05-20", liters: 200, spend: 1000 },
  { date: "2026-06-02", liters: 400, spend: 2200 },
];

describe("fuelByMonth", () => {
  it("sumuje litry i wydatek per miesiąc, w kolejności miesięcy", () => {
    const r = fuelByMonth(data, ["2026-04", "2026-05", "2026-06"]);
    expect(r).toEqual([
      { month: "2026-04", liters: 0, spend: 0 },
      { month: "2026-05", liters: 500, spend: 2500 },
      { month: "2026-06", liters: 400, spend: 2200 },
    ]);
  });

  it("ujemne wartości jak zero; pomija miesiące spoza listy", () => {
    const r = fuelByMonth(
      [
        { date: "2026-06-01", liters: -50, spend: -10 },
        { date: "2026-07-01", liters: 100, spend: 500 },
      ],
      ["2026-06"],
    );
    expect(r).toEqual([{ month: "2026-06", liters: 0, spend: 0 }]);
  });

  it("pusta lista miesięcy → pusto", () => {
    expect(fuelByMonth(data, [])).toEqual([]);
  });
});
