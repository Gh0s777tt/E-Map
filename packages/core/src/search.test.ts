import { describe, expect, it } from "vitest";
import { type SearchItem, searchEntities } from "./search";

const items: SearchItem[] = [
  {
    type: "Pojazd",
    id: "1",
    title: "WL5145U",
    subtitle: "Volvo FH",
    href: "/v/1",
    keywords: "VIN123",
  },
  {
    type: "Zlecenie",
    id: "2",
    title: "REF-2026-07",
    subtitle: "Warszawa → Berlin",
    href: "/o",
    keywords: "Alfa Trans",
  },
  {
    type: "Kierowca",
    id: "3",
    title: "jan@firma.pl",
    subtitle: "driver",
    href: "/d",
    keywords: "Jan Kowalski",
  },
  {
    type: "Faktura",
    id: "4",
    title: "FV/2026/15",
    subtitle: "Beta Sp. z o.o.",
    href: "/i",
    keywords: "PL999",
  },
];

describe("searchEntities", () => {
  it("ignoruje zbyt krótką frazę", () => {
    expect(searchEntities("a", items)).toEqual([]);
    expect(searchEntities(" ", items)).toEqual([]);
  });
  it("szuka po tytule i słowach kluczowych (bez wielkości liter)", () => {
    expect(searchEntities("volvo", items).map((r) => r.id)).toEqual(["1"]);
    expect(searchEntities("alfa", items).map((r) => r.id)).toEqual(["2"]);
    expect(searchEntities("kowalski", items).map((r) => r.id)).toEqual(["3"]);
  });
  it("ranking: zaczyna się od frazy przed zawiera", () => {
    const r = searchEntities("fv", items);
    expect(r[0]?.id).toBe("4"); // tytuł zaczyna się od FV
  });
  it("wszystkie tokeny muszą wystąpić", () => {
    expect(searchEntities("warszawa berlin", items).map((r) => r.id)).toEqual(["2"]);
    expect(searchEntities("warszawa paryż", items)).toEqual([]);
  });
  it("limit wyników", () => {
    const many: SearchItem[] = Array.from({ length: 20 }, (_, i) => ({
      type: "X",
      id: String(i),
      title: `pozycja ${i}`,
      href: "/x",
    }));
    expect(searchEntities("pozycja", many, 5)).toHaveLength(5);
  });
});
