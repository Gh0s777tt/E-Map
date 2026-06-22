import { describe, expect, it } from "vitest";
import {
  FREIGHT_EXPORT_HEADERS,
  freightExportRows,
  freightRowCells,
  toFreightRow,
} from "./freightExport";

describe("toFreightRow", () => {
  it("mapuje pola i przelicza wagę kg → t", () => {
    const r = toFreightRow({
      referenceNo: "REF-1",
      origin: "Warszawa",
      destination: "Berlin",
      loadDate: "2026-07-01",
      unloadDate: "2026-07-02",
      cargo: "Palety",
      weightKg: 21500,
      price: 1200,
      currency: "EUR",
      notes: "ADR",
    });
    expect(r).toEqual({
      reference: "REF-1",
      loadingPlace: "Warszawa",
      loadingDate: "2026-07-01",
      unloadingPlace: "Berlin",
      unloadingDate: "2026-07-02",
      cargo: "Palety",
      weightT: 21.5,
      price: 1200,
      currency: "EUR",
      notes: "ADR",
    });
  });
  it("braki → puste pola, waga/stawka puste gdy null", () => {
    const r = toFreightRow({ origin: "Łódź" });
    expect(r.weightT).toBe("");
    expect(r.price).toBe("");
    expect(r.reference).toBe("");
    expect(r.loadingPlace).toBe("Łódź");
  });
});

describe("freightRowCells", () => {
  it("zwraca wartości w kolejności nagłówków", () => {
    const cells = freightRowCells(toFreightRow({ origin: "A", destination: "B", weightKg: 1000 }));
    expect(cells).toHaveLength(FREIGHT_EXPORT_HEADERS.length);
    expect(cells[1]).toBe("A");
    expect(cells[3]).toBe("B");
    expect(cells[6]).toBe(1); // 1000 kg → 1 t
  });
});

describe("freightExportRows", () => {
  it("pomija zlecenia bez trasy (brak załadunku i rozładunku)", () => {
    const rows = freightExportRows([
      { origin: "Gdańsk", destination: "Paryż" },
      { cargo: "bez trasy" },
      { destination: "Wiedeń" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.loadingPlace).toBe("Gdańsk");
    expect(rows[1]?.unloadingPlace).toBe("Wiedeń");
  });
});
