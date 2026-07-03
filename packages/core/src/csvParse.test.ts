import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { detectCsvSeparator, parseCsv } from "./csvParse";

describe("detectCsvSeparator", () => {
  it("domyślnie `;` (Excel PL)", () => {
    expect(detectCsvSeparator("a;b;c")).toBe(";");
  });
  it("`,` gdy przecinków więcej", () => {
    expect(detectCsvSeparator("a,b,c")).toBe(",");
  });
  it("ignoruje separatory w cudzysłowach", () => {
    expect(detectCsvSeparator('"a,b,c";d')).toBe(";");
  });
});

describe("parseCsv", () => {
  it("prosty dokument (`;`, CRLF)", () => {
    expect(parseCsv("a;b;c\r\n1;2;3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("auto-wykrywa separator `,`", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("pole w cudzysłowach z separatorem w środku", () => {
    expect(parseCsv('"a;b";c')).toEqual([["a;b", "c"]]);
  });

  it('escapowany cudzysłów (`""`)', () => {
    expect(parseCsv('"a""b";c')).toEqual([['a"b', "c"]]);
  });

  it("pole z nową linią w cudzysłowach", () => {
    expect(parseCsv('"linia1\nlinia2";c')).toEqual([["linia1\nlinia2", "c"]]);
  });

  it("usuwa BOM UTF-8 z początku", () => {
    expect(parseCsv("﻿a;b\r\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("nie tworzy pustego wiersza na końcu (trailing newline)", () => {
    expect(parseCsv("a;b\r\n1;2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("pomija puste linie w środku", () => {
    expect(parseCsv("a;b\r\n\r\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("zachowuje puste komórki końcowe", () => {
    expect(parseCsv("a;b;c\r\n1;;")).toEqual([
      ["a", "b", "c"],
      ["1", "", ""],
    ]);
  });

  it("pusty wkład → pusta tablica", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("round-trip z toCsv (polskie znaki, separatory, cudzysłowy)", () => {
    const headers = ["Nazwa", "NIP", "Adres"];
    const rows = [
      ["Świętokrzyska Sp. z o.o.", "1234567890", 'ul. Główna 1; "A"'],
      ["Żabka", "", "Łódź\nPolska"],
    ];
    const csv = toCsv(headers, rows);
    expect(parseCsv(csv)).toEqual([headers, ...rows]);
  });
});
