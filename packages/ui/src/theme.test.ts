/**
 * [#387] Kanon kolorów jako test, nie jako komentarz.
 *
 * CLAUDE.md stawia sprawę jednoznacznie: **czerwień `#E50914` na czerni `#0a0a0a`,
 * bez wyjątków w UI i badge'ach**. To jedyna reguła projektu, którą da się złamać
 * jedną literą w jednym pliku, nie psując przy tym niczego, co zauważy kompilator
 * ani przeglądarka — a skutkiem jest marka rozjeżdżająca się po ekranach.
 *
 * `packages/ui` był jedynym pakietem bez ani jednego testu. Zaczynamy od tego,
 * co naprawdę wymaga pilnowania.
 */
import { describe, expect, it } from "vitest";
import { cssPalette, palette } from "./theme";

describe("kanon kolorów (CLAUDE.md)", () => {
  it("czerwień i czerń mają dokładnie te wartości, co w regule projektu", () => {
    expect(palette.red).toBe("#E50914");
    expect(palette.black).toBe("#0a0a0a");
  });

  it("wariant CSS niesie ten sam kolor jako wartość zapasową zmiennej", () => {
    // Motyw da się nadpisać zmienną CSS, ale gdy jej nie ma, musi wrócić kanon —
    // inaczej „bez wyjątków" obowiązuje tylko tam, gdzie ktoś pamiętał o zmiennej.
    expect(cssPalette.red).toContain("#E50914");
    expect(cssPalette.black).toContain("#0a0a0a");
  });

  it("każdy kolor palety to poprawny zapis szesnastkowy", () => {
    for (const [name, value] of Object.entries(palette)) {
      expect(value, `${name} = ${value}`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("paleta CSS pokrywa te same klucze co paleta bazowa", () => {
    // Rozjazd kluczy oznacza kolor dostępny w jednym wariancie i nie w drugim —
    // czyli komponent, który wygląda inaczej zależnie od tego, skąd wzięto kolor.
    expect(Object.keys(cssPalette).sort()).toEqual(Object.keys(palette).sort());
  });
});
