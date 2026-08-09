import { describe, expect, it } from "vitest";
import { buildFuelImportRow, fuelImportDupKey, normalizeRegistration } from "./fuelImport";

const VEHICLE = "11111111-1111-4111-8111-111111111111";
const CARD = "22222222-2222-4222-8222-222222222222";

const opts = (over: Partial<Parameters<typeof buildFuelImportRow>[1]> = {}) => ({
  resolveVehicle: (reg: string) => (normalizeRegistration(reg) === "WX1234" ? VEHICLE : undefined),
  cardId: CARD,
  existing: new Set<string>(),
  messages: { vehicleUnknown: "nie znam pojazdu {reg}", pickCard: "wskaż kartę" },
  ...over,
});

const row = (over: Record<string, string> = {}) => ({
  vehicle: "WX 1234",
  date: "02.08.2026 14:30",
  country: "Deutschland",
  city: "Berlin",
  odometer: "812 345 km",
  liters: "620,50 L",
  gross: "1 234,56",
  currency: "eur",
  ...over,
});

describe("buildFuelImportRow", () => {
  it("wczytuje realny wiersz z niemieckiego zestawienia", () => {
    const r = buildFuelImportRow(row(), opts());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.input.vehicleId).toBe(VEHICLE);
    // Kraj sprowadzony do kodu ISO — to samo, co ratuje zwrot VAT (#372).
    expect(r.value.input.station.country).toBe("DE");
    expect(r.value.input.odometerKm).toBe(812345);
    expect(r.value.input.liters).toBe(620.5);
    expect(r.value.input.priceTotal).toBe(1234.56);
    expect(r.value.input.currency).toBe("EUR");
    expect(r.value.input.occurredAt).toBe("2026-08-02T14:30");
    expect(r.value.input.fuelCardId).toBe(CARD);
  });

  it("bez wskazanej karty odrzuca wiersz płacony kartą", () => {
    // Regresja: pierwsza wersja importu ustawiała kartę jako metodę płatności
    // i nie podawała `fuelCardId`, więc schemat odrzucał KAŻDY wiersz — a błąd
    // był widoczny dopiero po wgraniu pliku w przeglądarce.
    const r = buildFuelImportRow(row(), opts({ cardId: "" }));
    expect(r).toEqual({ ok: false, error: "wskaż kartę" });
  });

  it("wiersz opłacony gotówką przechodzi bez karty", () => {
    const r = buildFuelImportRow(row({ payment: "Gotówka" }), opts({ cardId: "" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.input.paymentMethod).toBe("cash");
    expect(r.value.input.fuelCardId).toBeUndefined();
  });

  it("nieznany pojazd → komunikat z rejestracją z pliku", () => {
    const r = buildFuelImportRow(row({ vehicle: "ZZ 9999" }), opts());
    expect(r).toEqual({ ok: false, error: "nie znam pojazdu ZZ 9999" });
  });

  it("rejestracja dopasowana mimo innego zapisu", () => {
    for (const v of ["wx1234", "WX-1234", " WX 1234 "]) {
      expect(buildFuelImportRow(row({ vehicle: v }), opts()).ok).toBe(true);
    }
  });

  it("brak licznika odrzuca wiersz zamiast wstawiać zero", () => {
    // Zero zafałszowałoby spalanie każdego kolejnego tankowania tego auta.
    const r = buildFuelImportRow(row({ odometer: "" }), opts());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("licznika");
  });

  it("nieczytelna data odrzuca wiersz zamiast podstawiać dzisiaj", () => {
    const r = buildFuelImportRow(row({ date: "brak" }), opts());
    expect(r.ok).toBe(false);
  });

  it("kraj nie do rozpoznania zatrzymuje się na podglądzie", () => {
    const r = buildFuelImportRow(row({ country: "10115 Berlin" }), opts());
    expect(r.ok).toBe(false);
  });

  it("duplikat rozpoznany po pojeździe, momencie i litrach", () => {
    const existing = new Set([fuelImportDupKey(VEHICLE, "2026-08-02T14:30", 620.5)]);
    const r = buildFuelImportRow(row(), opts({ existing }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("już zaimportowane");
  });

  it("to samo tankowanie w innej walucie to nadal duplikat", () => {
    // Klucz celowo pomija kwotę: zestawienie potrafi pokazać tę samą transakcję
    // raz w walucie stacji, a raz przeliczoną.
    const existing = new Set([fuelImportDupKey(VEHICLE, "2026-08-02T14:30", 620.5)]);
    const r = buildFuelImportRow(row({ gross: "5 300,00", currency: "PLN" }), opts({ existing }));
    expect(r.ok).toBe(false);
  });
});
