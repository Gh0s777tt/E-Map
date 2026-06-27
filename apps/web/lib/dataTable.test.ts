import { describe, expect, it } from "vitest";
import { filterRows, sortRows } from "./dataTable";

type Row = { name: string; n: number | null };
const rows: Row[] = [
  { name: "Beta", n: 2 },
  { name: "alfa", n: null },
  { name: "Gamma", n: 1 },
];

describe("filterRows", () => {
  it("zwraca wszystkie przy pustym query", () => {
    expect(filterRows(rows, "  ", (r) => r.name)).toHaveLength(3);
  });
  it("filtruje case-insensitive po podłańcuchu", () => {
    expect(filterRows(rows, "AM", (r) => r.name).map((r) => r.name)).toEqual(["Gamma"]);
  });
});

describe("sortRows", () => {
  it("sortuje teksty wg locale PL, rosnąco", () => {
    expect(sortRows(rows, (r) => r.name, "asc").map((r) => r.name)).toEqual([
      "alfa",
      "Beta",
      "Gamma",
    ]);
  });
  it("malejąco odwraca kolejność niepustych", () => {
    expect(sortRows(rows, (r) => r.name, "desc").map((r) => r.name)).toEqual([
      "Gamma",
      "Beta",
      "alfa",
    ]);
  });
  it("null zawsze na końcu, niezależnie od kierunku", () => {
    expect(sortRows(rows, (r) => r.n, "asc").map((r) => r.n)).toEqual([1, 2, null]);
    expect(sortRows(rows, (r) => r.n, "desc").map((r) => r.n)).toEqual([2, 1, null]);
  });
  it("nie mutuje wejścia", () => {
    const before = rows.map((r) => r.name);
    sortRows(rows, (r) => r.name, "asc");
    expect(rows.map((r) => r.name)).toEqual(before);
  });
});
