import { describe, expect, it } from "vitest";
import {
  BASE_CURRENCY,
  CURRENCIES,
  convert,
  currencyForCountry,
  type FxRate,
  fromEur,
  isSupportedCurrency,
  pickFxRate,
  rowAmountEur,
  sumInCurrency,
  toEur,
} from "./fx";

const RATES: FxRate[] = [
  { asOf: "2026-06-01", currency: "PLN", unitsPerEur: 4.3 },
  { asOf: "2026-06-15", currency: "PLN", unitsPerEur: 4.5 },
  { asOf: "2026-06-10", currency: "GBP", unitsPerEur: 0.85 },
];

describe("pickFxRate", () => {
  it("bierze najświeższy kurs nie nowszy niż podany dzień", () => {
    expect(pickFxRate(RATES, "PLN", "2026-06-20")?.unitsPerEur).toBe(4.5);
    expect(pickFxRate(RATES, "PLN", "2026-06-14")?.unitsPerEur).toBe(4.3);
  });

  it("NIE używa kursu z przyszłości", () => {
    // Przeliczenie tankowania sprzed pół roku dzisiejszym kursem dałoby liczbę,
    // która nie zgadza się z żadnym dokumentem księgowym.
    expect(pickFxRate(RATES, "PLN", "2026-05-31")).toBeNull();
  });

  it("sięga po ostatni znany kurs w weekend (EBC nie publikuje)", () => {
    expect(pickFxRate(RATES, "PLN", "2026-06-17")?.asOf).toBe("2026-06-15");
  });

  it("nie myli walut i ignoruje wielkość liter", () => {
    expect(pickFxRate(RATES, "pln", "2026-06-20")?.currency).toBe("PLN");
    expect(pickFxRate(RATES, "CZK", "2026-06-20")).toBeNull();
  });
});

describe("toEur", () => {
  it("dzieli przez kurs — kierunek zgodny z formatem EBC", () => {
    // 430 PLN przy 4.30 PLN za 1 EUR = 100 EUR. Odwrócony kurs dałby 1849 EUR,
    // czyli błąd o rząd wielkości — dlatego kierunek jest testowany wprost.
    expect(toEur(430, "PLN", RATES, "2026-06-05")).toBe(100);
  });

  it("EUR zwraca bez zmian i bez potrzeby kursu", () => {
    expect(toEur(99.99, "EUR", [], "2026-06-05")).toBe(99.99);
  });

  it("brak kursu daje null, NIGDY zera", () => {
    // Zero oznaczałoby „nic nie kosztowało" — dokładnie ta klasa błędu,
    // przez którą zestawienie miesięczne pokazywało 0 €.
    expect(toEur(500, "CZK", RATES, "2026-06-05")).toBeNull();
    expect(toEur(500, "PLN", RATES, "2026-01-01")).toBeNull();
  });
});

describe("fromEur i convert", () => {
  it("fromEur mnoży przez kurs", () => {
    expect(fromEur(100, "PLN", RATES, "2026-06-20")).toBe(450);
  });

  it("konwersja tam i z powrotem wraca do punktu wyjścia", () => {
    const pln = fromEur(100, "PLN", RATES, "2026-06-20");
    expect(toEur(pln as number, "PLN", RATES, "2026-06-20")).toBe(100);
  });

  it("konwersja między dwiema walutami obcymi idzie przez EUR", () => {
    // 430 PLN → 100 EUR → 85 GBP
    expect(convert(430, "PLN", "GBP", RATES, "2026-06-12")).toBe(85);
  });

  it("ta sama waluta nie wymaga kursu w ogóle", () => {
    expect(convert(12.34, "CZK", "CZK", [], "2026-06-12")).toBe(12.34);
  });

  it("brak któregokolwiek kursu przerywa łańcuch", () => {
    expect(convert(430, "PLN", "CZK", RATES, "2026-06-20")).toBeNull();
  });
});

describe("sumInCurrency", () => {
  it("sumuje mieszane waluty i RAPORTUJE pominięte", () => {
    const r = sumInCurrency(
      [
        { amount: 100, currency: "EUR", date: "2026-06-20" },
        { amount: 430, currency: "PLN", date: "2026-06-05" }, // → 100 EUR
        { amount: 999, currency: "CZK", date: "2026-06-20" }, // brak kursu
      ],
      "EUR",
      RATES,
    );
    expect(r.total).toBe(200);
    // Suma bez tej informacji wyglądałaby na kompletną, a nie jest.
    expect(r.skipped).toEqual([{ amount: 999, currency: "CZK", date: "2026-06-20" }]);
  });

  it("pominięta pozycja nie jest liczona jako zero ani po kursie 1:1", () => {
    const r = sumInCurrency([{ amount: 500, currency: "CZK", date: "2026-06-20" }], "EUR", RATES);
    expect(r.total).toBe(0);
    expect(r.skipped).toHaveLength(1); // zero w sumie, ale z jawnym powodem
  });

  it("każda pozycja używa kursu ze SWOJEJ daty", () => {
    const r = sumInCurrency(
      [
        { amount: 430, currency: "PLN", date: "2026-06-05" }, // kurs 4.30 → 100
        { amount: 450, currency: "PLN", date: "2026-06-20" }, // kurs 4.50 → 100
      ],
      "EUR",
      RATES,
    );
    expect(r.total).toBe(200);
    expect(r.skipped).toHaveLength(0);
  });
});

describe("currencyForCountry", () => {
  it("podpowiada walutę lokalną tam, gdzie nie ma euro", () => {
    expect(currencyForCountry("PL")).toBe("PLN");
    expect(currencyForCountry("CZ")).toBe("CZK");
    expect(currencyForCountry("GB")).toBe("GBP");
  });

  it("strefa euro i kraje nieznane dostają EUR", () => {
    expect(currencyForCountry("DE")).toBe("EUR");
    expect(currencyForCountry("XX")).toBe("EUR");
    expect(currencyForCountry(null)).toBe("EUR");
  });

  it("ignoruje wielkość liter i spacje", () => {
    expect(currencyForCountry(" pl ")).toBe("PLN");
  });
});

describe("rowAmountEur — punkt wejścia dla ekranów", () => {
  it("przelicza kwotę w obcej walucie po kursie z dnia zdarzenia", () => {
    // 430 PLN przy 4.30 = 100 EUR. Bez tego wiersz wchodziłby do sumy jako 430 €.
    expect(rowAmountEur(430, "PLN", "2026-06-05T12:00:00Z", RATES)).toBe(100);
  });

  it("EUR przechodzi bez kursu", () => {
    expect(rowAmountEur(99.5, "EUR", "2026-06-05T12:00:00Z", [])).toBe(99.5);
  });

  it("brak waluty traktujemy jak EUR — tak zachowywały się dane sprzed #373", () => {
    expect(rowAmountEur(50, null, "2026-06-05T12:00:00Z", [])).toBe(50);
  });

  it("brak kwoty i brak kursu dają null — NIE zero", () => {
    // Zero to twierdzenie („nic nie kosztowało"), a my po prostu nie wiemy.
    expect(rowAmountEur(null, "PLN", "2026-06-05T12:00:00Z", RATES)).toBeNull();
    expect(rowAmountEur(100, "CZK", "2026-06-05T12:00:00Z", RATES)).toBeNull();
  });

  it("przyjmuje pełny znacznik czasu, nie tylko datę", () => {
    expect(rowAmountEur(430, "PLN", "2026-06-05T23:59:59.999Z", RATES)).toBe(100);
  });
});

describe("CURRENCIES — lista walut formularzy", () => {
  it("zawiera walutę bazową", () => {
    // Bez EUR na liście formularz nie pozwoliłby wpisać kwoty w walucie,
    // do której wszystko jest przeliczane.
    expect(CURRENCIES).toContain(BASE_CURRENCY);
  });

  it("same trzyliterowe kody ISO, bez powtórzeń", () => {
    for (const c of CURRENCIES) expect(c).toMatch(/^[A-Z]{3}$/);
    expect(new Set(CURRENCIES).size).toBe(CURRENCIES.length);
  });

  it("każdy kod z listy przechodzi walidację", () => {
    for (const c of CURRENCIES) expect(isSupportedCurrency(c)).toBe(true);
  });

  it("odrzuca literówkę, która wcześniej przechodziła jako wolny tekst", () => {
    // To jest sedno [#388]: `PL` zamiast `PLN` zapisywało się poprawnie
    // i tworzyło koszt, którego żaden kurs nie umiał przeliczyć.
    expect(isSupportedCurrency("PL")).toBe(false);
    expect(isSupportedCurrency("PLNN")).toBe(false);
    expect(isSupportedCurrency("")).toBe(false);
    expect(isSupportedCurrency(null)).toBe(false);
    expect(isSupportedCurrency(undefined)).toBe(false);
  });

  it("wybacza wielkość liter i spacje, bo tyle wpisuje człowiek", () => {
    expect(isSupportedCurrency(" pln ")).toBe(true);
    expect(isSupportedCurrency("Eur")).toBe(true);
  });

  it("waluta spoza listy jest odrzucana, nawet gdy istnieje naprawdę", () => {
    // `currencyForCountry` zna UAH (Ukraina) i MDL (Mołdawia), ale EBC ich nie
    // notuje — kwota w nich zapisana nigdy nie weszłaby do sumy w euro.
    // Dlatego podpowiedź z kraju musi przejść przez tę bramkę.
    expect(currencyForCountry("UA")).toBe("UAH");
    expect(isSupportedCurrency("UAH")).toBe(false);
    expect(isSupportedCurrency(currencyForCountry("MD"))).toBe(false);
    // Kraj obsługiwany przechodzi bez przeszkód.
    expect(isSupportedCurrency(currencyForCountry("CZ"))).toBe(true);
  });
});
