import { describe, expect, it } from "vitest";
import { filterSortOrders, type OrderFilterItem } from "./orderFilter";

const O = (p: Partial<OrderFilterItem>): OrderFilterItem => ({
  status: "new",
  created_at: "2026-01-01",
  ...p,
});

const data: OrderFilterItem[] = [
  O({
    reference_no: "A1",
    shipper: "Alfa",
    origin: "Warszawa",
    destination: "Berlin",
    status: "new",
    price: 1000,
    load_date: "2026-06-10",
  }),
  O({
    reference_no: "B2",
    shipper: "Beta",
    origin: "Gdańsk",
    destination: "Paryż",
    status: "delivered",
    price: 3000,
    load_date: "2026-06-01",
  }),
  O({
    reference_no: "C3",
    shipper: "Alfa Trans",
    origin: "Łódź",
    destination: "Wiedeń",
    status: "delivered",
    price: 500,
    load_date: "2026-06-20",
  }),
];

describe("filterSortOrders — tekst", () => {
  it("szuka po nadawcy/trasie/referencji (bez wielkości liter)", () => {
    expect(filterSortOrders(data, { text: "alfa" }).map((o) => o.reference_no)).toEqual([
      "C3",
      "A1",
    ]);
    expect(filterSortOrders(data, { text: "paryż" }).map((o) => o.reference_no)).toEqual(["B2"]);
    expect(filterSortOrders(data, { text: "b2" }).map((o) => o.reference_no)).toEqual(["B2"]);
  });
});

describe("filterSortOrders — status", () => {
  it("filtruje po statusie; all = wszystkie", () => {
    expect(filterSortOrders(data, { status: "delivered" })).toHaveLength(2);
    expect(filterSortOrders(data, { status: "all" })).toHaveLength(3);
  });
});

describe("filterSortOrders — sort", () => {
  it("domyślnie wg daty malejąco", () => {
    expect(filterSortOrders(data).map((o) => o.reference_no)).toEqual(["C3", "A1", "B2"]);
  });
  it("data rosnąco", () => {
    expect(filterSortOrders(data, { sort: "date_asc" }).map((o) => o.reference_no)).toEqual([
      "B2",
      "A1",
      "C3",
    ]);
  });
  it("stawka malejąco / rosnąco", () => {
    expect(filterSortOrders(data, { sort: "price_desc" }).map((o) => o.reference_no)).toEqual([
      "B2",
      "A1",
      "C3",
    ]);
    expect(filterSortOrders(data, { sort: "price_asc" }).map((o) => o.reference_no)).toEqual([
      "C3",
      "A1",
      "B2",
    ]);
  });
});

describe("filterSortOrders — łączenie", () => {
  it("status + tekst + sort razem", () => {
    const r = filterSortOrders(data, { status: "delivered", text: "a", sort: "price_desc" });
    expect(r.map((o) => o.reference_no)).toEqual(["B2", "C3"]);
  });
});
