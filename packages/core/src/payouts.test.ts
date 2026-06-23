import { describe, expect, it } from "vitest";
import { type PayoutEntry, settleDriverPayouts } from "./payouts";

const data: PayoutEntry[] = [
  { kind: "due", amount: 5000, currency: "PLN" },
  { kind: "advance", amount: 1500, currency: "PLN" },
  { kind: "deduction", amount: 200, currency: "PLN" },
  { kind: "payout", amount: 1000, currency: "PLN" },
  { kind: "due", amount: 800, currency: "EUR" },
  { kind: "advance", amount: 300, currency: "EUR" },
];

describe("settleDriverPayouts", () => {
  it("liczy saldo do wypłaty per waluta", () => {
    const r = settleDriverPayouts(data);
    const pln = r.find((x) => x.currency === "PLN");
    const eur = r.find((x) => x.currency === "EUR");
    // 5000 − 1500 − 200 − 1000 = 2300
    expect(pln).toMatchObject({
      due: 5000,
      advance: 1500,
      deduction: 200,
      payout: 1000,
      balance: 2300,
    });
    // 800 − 300 = 500
    expect(eur).toMatchObject({ due: 800, advance: 300, balance: 500 });
  });

  it("sortuje malejąco wg salda", () => {
    expect(settleDriverPayouts(data).map((x) => x.currency)).toEqual(["PLN", "EUR"]);
  });

  it("saldo ujemne gdy zaliczki/potrącenia > należność", () => {
    const r = settleDriverPayouts([
      { kind: "due", amount: 1000, currency: "PLN" },
      { kind: "advance", amount: 1500, currency: "PLN" },
    ]);
    expect(r[0]?.balance).toBe(-500);
  });

  it("ujemne kwoty traktowane jak zero; pusto → pusto", () => {
    expect(settleDriverPayouts([{ kind: "due", amount: -100, currency: "PLN" }])[0]).toMatchObject({
      due: 0,
      balance: 0,
    });
    expect(settleDriverPayouts([])).toEqual([]);
  });
});
