import { describe, expect, it } from "vitest";
import { setupMessage } from "./setup";

describe("setupMessage", () => {
  it("zwraca null dla stanu gotowego", () => {
    expect(setupMessage("ok")).toBeNull();
    expect(setupMessage("demo")).toBeNull();
    expect(setupMessage("")).toBeNull();
  });

  it("daje domyślny komunikat dla no-company / no-vehicles", () => {
    expect(setupMessage("no-company")).toContain("firmę");
    expect(setupMessage("no-vehicles")).toContain("pojazd");
  });

  it("pozwala nadpisać teksty per strona", () => {
    expect(setupMessage("no-vehicles", { noVehicles: "Dodaj pojazd, aby zgłosić usterkę." })).toBe(
      "Dodaj pojazd, aby zgłosić usterkę.",
    );
    expect(setupMessage("no-company", { noCompany: "X" })).toBe("X");
  });

  it("nadpisanie jednego stanu nie wpływa na drugi", () => {
    expect(setupMessage("no-company", { noVehicles: "Y" })).toContain("firmę");
  });
});
