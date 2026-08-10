// @vitest-environment jsdom
/**
 * [#379] Warstwa widoku zestawienia zwrotu VAT.
 *
 * Silnik (`vatRefundByCountry`) ma własne testy — tutaj sprawdzamy to, czego one
 * nie widzą: czy ekran w ogóle się renderuje i czy trzy stany, których NIE WOLNO
 * zlewać, wyglądają na nim inaczej:
 *   • kwota do odzyskania   — znamy stawkę, kraj zwraca;
 *   • „kraj nie zwraca"     — twierdzenie prawdziwe (GB, CH, NO), nie brak danych;
 *   • „nie znamy stawki"    — brak danych, kraj poza sumą.
 * Jeśli dwa z nich wyglądają tak samo, przewoźnik nie odróżni braku danych od
 * informacji i albo zaniży wniosek, albo będzie czekał na pieniądze, których nie ma.
 *
 * Wszystkie liczby w asercjach są policzone ręcznie w komentarzach — test ma
 * pilnować KONKRETNEJ kwoty, nie tego, że „coś się wyświetliło".
 */
import type { FxRate, VatRate } from "@e-logistic/core";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import type { FuelRaw } from "./shared";
import { VatRefundSection } from "./VatRefundSection";

afterEach(cleanup);

/** Kursy: ile jednostek waluty za 1 EUR (format EBC). */
const RATES: FxRate[] = [
  { asOf: "2026-07-01", currency: "PLN", unitsPerEur: 4 },
  { asOf: "2026-07-01", currency: "GBP", unitsPerEur: 0.85 },
];

/** Stawki VAT. GB celowo z `fuelRefundable: false` — kraj nie zwraca VAT od paliwa. */
const VAT_RATES: VatRate[] = [
  { countryCode: "DE", validFrom: "2020-01-01", rate: 19, fuelRefundable: true },
  { countryCode: "PL", validFrom: "2020-01-01", rate: 23, fuelRefundable: true },
  { countryCode: "GB", validFrom: "2020-01-01", rate: 20, fuelRefundable: false },
  // UA świadomie BEZ stawki — to nasz przypadek „nie znamy stawki".
];

const row = (over: Partial<FuelRaw> = {}): FuelRaw => ({
  id: "r1",
  vehicle_id: "v1",
  odometer_km: 100_000,
  liters: 100,
  price_total: 119,
  currency: "EUR",
  price_net: null,
  vat_rate: null,
  fuel_card_id: null,
  station_country: "DE",
  created_at: "2026-07-16T00:00:00Z",
  occurred_at: "2026-07-15T10:00:00Z",
  ...over,
});

/**
 * Realistyczny zestaw czterech krajów pokrywający wszystkie trzy stany:
 *
 *  DE 2 × 119 EUR @ 19%  → brutto 238 €; VAT = 119 − 119/1,19 = 19 € za sztukę → 38 €
 *  PL 1 × 492 PLN @ 23%  → VAT liczony w PLN: 492 − 492/1,23 = 92 PLN → 92/4 = 23 €
 *                          brutto: 492/4 = 123 €
 *  GB 1 × 100 GBP @ 20%  → kraj NIE zwraca → 0, ale brutto 100/0,85 = 117,65 €
 *  UA 1 ×  50 EUR        → brak stawki → „nie znamy stawki", poza sumą
 *
 *  Razem do odzyskania: 38 + 23 = 61 €
 */
const FUEL: FuelRaw[] = [
  row({ id: "de1" }),
  row({ id: "de2" }),
  row({ id: "pl1", station_country: "PL", currency: "PLN", price_total: 492, liters: 120 }),
  row({ id: "gb1", station_country: "GB", currency: "GBP", price_total: 100, liters: 80 }),
  row({ id: "ua1", station_country: "UA", currency: "EUR", price_total: 50, liters: 40 }),
];

function renderSection(fuel: FuelRaw[] = FUEL, rates: FxRate[] = RATES) {
  return render(
    h(LocaleProvider, {
      locale: "pl",
      // biome-ignore lint/correctness/noChildrenProp: createElement w teście — children w props (wymóg tsc)
      children: h(VatRefundSection, { fuel, vatRates: VAT_RATES, rates }),
    }),
  );
}

/** Komórki wiersza danego kraju (pierwsza kolumna zaczyna się od kodu ISO). */
function cellsOf(country: string): string[] {
  const tr = [...document.querySelectorAll("tbody tr")].find((el) =>
    el.querySelector("td")?.textContent?.startsWith(country),
  );
  if (!tr) throw new Error(`Brak wiersza dla kraju ${country}`);
  return [...tr.querySelectorAll("td")].map((td) => td.textContent ?? "");
}

/** Ostatnia kolumna („Do odzyskania") wiersza danego kraju — element, nie tylko tekst. */
function refundCell(country: string): HTMLElement {
  const tr = [...document.querySelectorAll("tbody tr")].find((el) =>
    el.querySelector("td")?.textContent?.startsWith(country),
  );
  const tds = [...(tr?.querySelectorAll("td") ?? [])];
  const last = tds.at(-1);
  if (!last) throw new Error(`Brak komórki zwrotu dla kraju ${country}`);
  return last as HTMLElement;
}

describe("VatRefundSection — render i liczby", () => {
  it("renderuje się na realistycznych danych i pokazuje wszystkie kraje", () => {
    renderSection();
    expect(screen.getByText(/Zwrot VAT za paliwo/)).toBeTruthy();
    // Cztery kraje tankowania = cztery wiersze.
    expect(document.querySelectorAll("tbody tr")).toHaveLength(4);
    // Kod ISO i nazwa kraju obok siebie — użytkownik nie musi znać skrótów.
    expect(cellsOf("DE")[0]).toContain("Niemcy");
    expect(cellsOf("UA")[0]).toContain("Ukraina");
  });

  it("suma w nagłówku obejmuje wyłącznie to, co realnie do odzyskania (38 + 23 = 61 €)", () => {
    renderSection();
    // Ani GB (kraj nie zwraca), ani UA (nie znamy stawki) nie podbijają sumy.
    expect(screen.getByText(/Razem do odzyskania/).textContent).toContain("61 €");
  });

  it("kraj ze stawką: brutto, stawka i kwota do odzyskania zgadzają się co do grosza", () => {
    renderSection();
    const [kraj, tankowan, litry, brutto, stawka, zwrot] = cellsOf("DE");
    expect(kraj).toContain("DE");
    expect(tankowan).toBe("2");
    expect(litry).toBe("200 L");
    expect(brutto).toBe("238 €"); // 2 × 119 EUR
    expect(stawka).toBe("19%");
    expect(zwrot).toBe("38 €"); // 2 × (119 − 119/1,19)
  });

  it("waluta obca: VAT liczony w walucie paragonu, dopiero potem na euro", () => {
    renderSection();
    const [, , , brutto, stawka, zwrot] = cellsOf("PL");
    expect(brutto).toBe("123 €"); // 492 PLN / 4
    expect(stawka).toBe("23%");
    expect(zwrot).toBe("23 €"); // (492 − 492/1,23) PLN = 92 PLN → 92/4
  });
});

describe("VatRefundSection — trzy stany zwrotu", () => {
  // [#382] Nazwa testu mieszała polski cudzysłów otwierający z prostym `"`,
  // przez co prosty znak zamykał string w połowie zdania i CAŁY plik nie
  // parsował się — `tsc` sypał trzynastoma błędami składni, które nie miały
  // nic wspólnego z testowaną logiką. Domknięcie polskim `”` przywraca bramkę.
  it("„kraj nie zwraca” to twierdzenie, a nie zero ani brak danych", () => {
    renderSection();
    const zwrot = refundCell("GB").textContent ?? "";
    expect(zwrot).toBe("kraj nie zwraca");
    // Kluczowe: NIE pokazujemy „0 €", bo liczba sugeruje wyliczenie, a nie zasadę.
    expect(zwrot).not.toContain("€");
    // Brutto mimo wszystko widoczne — tankowanie było, tylko VAT nie wraca.
    expect(cellsOf("GB")[3]).toBe("117.65 €"); // 100 GBP / 0,85
  });

  it("brak stawki to brak danych: osobny komunikat i kraj poza sumą", () => {
    renderSection();
    const zwrot = refundCell("UA").textContent ?? "";
    expect(zwrot).toBe("nie znamy stawki");
    expect(cellsOf("UA")[4]).toBe("—"); // stawki nie znamy, więc nie zmyślamy jej
    // 50 € brutto jest w tabeli, ale nie ma go w sumie do odzyskania.
    expect(cellsOf("UA")[3]).toBe("50 €");
    expect(screen.getByText(/Razem do odzyskania/).textContent).toContain("61 €");
  });

  it("trzy stany różnią się na ekranie — i tekstem, i kolorem", () => {
    renderSection();
    const kwota = refundCell("DE");
    const nieZwraca = refundCell("GB");
    const nieWiemy = refundCell("UA");
    const teksty = [kwota, nieZwraca, nieWiemy].map((el) => el.textContent);
    // Gdyby dwa stany zlały się w jeden napis, użytkownik nie miałby jak ich odróżnić.
    expect(new Set(teksty).size).toBe(3);
    // Kolor też rozróżnia — „nie znamy stawki" jest ostrzeżeniem, nie szarą notką.
    const kolor = (el: HTMLElement) =>
      (el.firstElementChild as HTMLElement | null)?.style.color ?? "";
    expect(new Set([kolor(kwota), kolor(nieZwraca), kolor(nieWiemy)]).size).toBe(3);
  });

  it("ostrzeżenie o krajach bez stawki wymienia je z nazwy", () => {
    renderSection();
    const nota = screen.getByText(/Kraje bez znanej stawki/);
    expect(nota.textContent).toContain("(UA)");
  });
});

describe("VatRefundSection — stany brzegowe", () => {
  it("pusty stan zamiast pustej ramki, gdy nie ma tankowań", () => {
    renderSection([]);
    expect(screen.getByText("Brak tankowań z kwotą w wybranym okresie.")).toBeTruthy();
    expect(document.querySelector("table")).toBeNull();
  });

  it("pusty stan także wtedy, gdy tankowania są, ale bez kwot", () => {
    renderSection([row({ price_total: null }), row({ station_country: "PL", price_total: null })]);
    expect(screen.getByText("Brak tankowań z kwotą w wybranym okresie.")).toBeTruthy();
  });

  it("liczy pozycje bez notowania waluty osobno — to nie to samo co brak kwoty", () => {
    // Tankowanie w PLN z 2026-06-10, a najstarszy kurs PLN mamy od 2026-07-01 →
    // kwoty nie da się przeliczyć na euro. To brak notowania, nie brak kwoty.
    renderSection([
      ...FUEL,
      row({
        id: "pl0",
        station_country: "PL",
        currency: "PLN",
        price_total: 400,
        occurred_at: "2026-06-10T08:00:00Z",
      }),
    ]);
    expect(screen.getByText(/pozycji bez notowania waluty/).textContent).toContain("1 pozycji");
    // Kwota bez kursu nie wchodzi do brutto ani do zwrotu — PL zostaje jak było.
    expect(cellsOf("PL")[3]).toBe("123 €");
    expect(refundCell("PL").textContent).toBe("23 €");
  });

  it("gdy ŻADNEJ kwoty nie da się przeliczyć, ekran mówi o braku kursu, nie o braku tankowań", () => {
    // Regresja: pusty stan („brak tankowań z kwotą") jest tu nieprawdą — kwoty są,
    // brakuje notowania. Bez licznika użytkownik nie ma jak dojść, czemu jest pusto.
    renderSection(
      [
        row({ station_country: "PL", currency: "PLN", price_total: 1200 }),
        row({ id: "pl2", station_country: "PL", currency: "PLN", price_total: 800 }),
      ],
      [],
    );
    expect(screen.getByText(/pozycji bez notowania waluty/).textContent).toContain("2 pozycji");
  });
});
