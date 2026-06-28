// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { type Column, DataTable } from "@/components/DataTable";
import { LocaleProvider } from "@/components/LocaleProvider";

afterEach(cleanup);

type Row = { id: string; name: string; n: number };
const rows: Row[] = [
  { id: "1", name: "Beta", n: 2 },
  { id: "2", name: "Alfa", n: 1 },
  { id: "3", name: "Gamma", n: 3 },
];
const cols: Column<Row>[] = [
  { key: "name", header: "Nazwa", sort: (r) => r.name, cell: (r) => r.name },
  { key: "n", header: "Liczba", sort: (r) => r.n, cell: (r) => String(r.n) },
];

function renderTable(extra: Record<string, unknown> = {}) {
  return render(
    h(LocaleProvider, {
      locale: "pl",
      children: h(DataTable<Row>, {
        rows,
        rowKey: (r: Row) => r.id,
        columns: cols,
        searchText: (r: Row) => r.name,
        ...extra,
      }),
    }),
  );
}

/** Nazwy z pierwszej kolumny każdego wiersza tbody (kolejność renderu). */
function bodyNames(): (string | null)[] {
  const tbody = document.querySelector("tbody");
  return [...(tbody?.querySelectorAll("tr") ?? [])].map(
    (tr) => tr.querySelector("td")?.textContent ?? null,
  );
}

describe("DataTable", () => {
  it("renderuje wiersze w kolejności wejścia (bez sortu)", () => {
    renderTable();
    expect(screen.getByText(/Nazwa/)).toBeTruthy();
    expect(bodyNames()).toEqual(["Beta", "Alfa", "Gamma"]);
  });

  it("sortuje rosnąco po kliknięciu nagłówka i toggluje malejąco", () => {
    renderTable();
    const nameHeader = screen.getByText(/Nazwa/);
    fireEvent.click(nameHeader);
    expect(bodyNames()).toEqual(["Alfa", "Beta", "Gamma"]);
    fireEvent.click(nameHeader);
    expect(bodyNames()).toEqual(["Gamma", "Beta", "Alfa"]);
  });

  it("filtruje wiersze po tekście", () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText("Filtruj…"), { target: { value: "alf" } });
    expect(bodyNames()).toEqual(["Alfa"]);
  });

  it("initialSort ustawia porządek początkowy", () => {
    renderTable({ initialSort: { key: "name", dir: "asc" } });
    expect(bodyNames()).toEqual(["Alfa", "Beta", "Gamma"]);
  });

  it("pokazuje komunikat pustki po filtrze bez trafień", () => {
    renderTable();
    fireEvent.change(screen.getByPlaceholderText("Filtruj…"), { target: { value: "xyz" } });
    expect(screen.getByText("Brak wyników")).toBeTruthy();
  });
});
