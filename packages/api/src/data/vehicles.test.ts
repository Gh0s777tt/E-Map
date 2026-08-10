/**
 * [#389] Testy zapisu kartoteki pojazdu — pilnują mechanizmu, nie jednego ekranu.
 *
 * Historia tego błędu: `updateVehicle` wysyłał do bazy KOMPLET kolumn zbudowany
 * z `?? null`, więc formularz mający część pól kasował resztę. Na webie
 * naprawiono to w [#386] dokładając brakujące pola do formularza — ale to
 * naprawa jednego wywołującego. Aplikacja mobilna (9 pól z 26) kasowała dalej,
 * w tym gabaryty i kod tunelowy ADR, czyli dane, z których liczona jest trasa.
 *
 * Dlatego testy sprawdzają `vehicleToPatch`, a nie zachowanie konkretnej strony:
 * następny ekran edycji ma dziedziczyć poprawność, a nie odkrywać ją ponownie.
 */
import { vehicleSchema } from "@e-logistic/core";
import { describe, expect, it } from "vitest";
import { vehicleToPatch, vehicleToRow } from "./vehicles";

/** Minimum, które `vehicleSchema` uznaje za poprawny pojazd. */
const MINIMUM = {
  registration: "WL5145U",
  model: "Actros",
  year: 2021,
  vehicleType: "truck" as const,
};

describe("vehicleToPatch — aktualizacja nie kasuje pól, których formularz nie ma", () => {
  it("pomija kolumny, których wywołujący w ogóle nie podał", () => {
    // Dokładnie kształt z aplikacji mobilnej: dziewięć pól, reszta nieobecna.
    const patch = vehicleToPatch(
      vehicleSchema.parse({ ...MINIMUM, inspectionExpiry: "2027-03-01" }),
    );
    expect(patch).toHaveProperty("registration", "WL5145U");
    expect(patch).toHaveProperty("inspection_expiry", "2027-03-01");
    // Te kolumny NIE mogą się pojawić w zapytaniu — inaczej pójdą jako null.
    for (const kolumna of [
      "height_cm",
      "width_cm",
      "length_cm",
      "axle_count",
      "adr_tunnel_code",
      "emission_class",
      "curb_weight_kg",
      "max_payload_kg",
      "vin",
      "forwarder",
      "comment",
    ]) {
      expect(Object.hasOwn(patch, kolumna), `kolumna ${kolumna} nie powinna być w patchu`).toBe(
        false,
      );
    }
  });

  it("czyszczenie pola nadal działa: klucz obecny z undefined → null", () => {
    // Web wysyła `pole.trim() || undefined`, czyli klucz JEST w obiekcie.
    // Gdyby patch pomijał też ten przypadek, użytkownik nie mógłby nic skasować.
    const patch = vehicleToPatch(vehicleSchema.parse({ ...MINIMUM, insurer: undefined }));
    expect(Object.hasOwn(patch, "insurer")).toBe(true);
    expect(patch.insurer).toBeNull();
  });

  it("rozróżnia oba przypadki w jednym zapisie", () => {
    const wyczyszczone = vehicleToPatch(
      vehicleSchema.parse({ ...MINIMUM, insurer: undefined, heightCm: 400 }),
    );
    expect(wyczyszczone.insurer).toBeNull(); // wyczyszczone
    expect(wyczyszczone.height_cm).toBe(400); // ustawione
    expect(Object.hasOwn(wyczyszczone, "vin")).toBe(false); // nietknięte
  });

  it("nigdy nie zmienia przynależności pojazdu do firmy", () => {
    // `company_id` nie jest polem kartoteki i nie ma prawa wejść do aktualizacji:
    // edycja pojazdu nie może go przenieść do innej firmy.
    const patch = vehicleToPatch({ ...MINIMUM, registration: "WP5652R" });
    expect(Object.hasOwn(patch, "company_id")).toBe(false);
  });

  it("pusty input nie generuje żadnej kolumny", () => {
    expect(Object.keys(vehicleToPatch({}))).toHaveLength(0);
  });

  it("przenosi komplet pól routingu, gdy formularz je ma", () => {
    const patch = vehicleToPatch(
      vehicleSchema.parse({
        ...MINIMUM,
        heightCm: 400,
        widthCm: 255,
        lengthCm: 1650,
        axleCount: 5,
        adrTunnelCode: "C",
        emissionClass: "euro6",
      }),
    );
    expect(patch).toMatchObject({
      height_cm: 400,
      width_cm: 255,
      length_cm: 1650,
      axle_count: 5,
      adr_tunnel_code: "C",
      emission_class: "euro6",
    });
  });
});

describe("warunek poprawności mechanizmu", () => {
  it("vehicleSchema nie ma pola z .default() — inaczej patch nadpisywałby nietknięte kolumny", () => {
    /*
     * `.default()` w Zodzie wstawia klucz TAKŻE wtedy, gdy wywołujący go nie
     * podał. Rozpoznawanie po obecności klucza przestałoby wtedy odróżniać
     * „nie ruszaj" od „ustaw domyślne", a kolumna pominięta w formularzu
     * dostawałaby wartość domyślną zamiast zostać nietknięta.
     *
     * Test jest tu po to, żeby dopisanie `.default()` do kartoteki pojazdu
     * zapaliło się na czerwono razem z wyjaśnieniem, a nie po cichu przywróciło
     * kasowanie danych.
     */
    const zParsowane = vehicleSchema.parse(MINIMUM);
    expect(Object.keys(zParsowane).sort()).toEqual(Object.keys(MINIMUM).sort());
  });
});

describe("vehicleToRow — wstawianie nowego pojazdu bez zmian", () => {
  it("nadal buduje komplet kolumn wraz z firmą", () => {
    const row = vehicleToRow(vehicleSchema.parse(MINIMUM), "11111111-1111-4111-8111-111111111111");
    expect(row.company_id).toBe("11111111-1111-4111-8111-111111111111");
    // Przy INSERT brak danych ma być zapisany wprost jako null — nowy wiersz
    // nie ma poprzedniej wartości, którą można by zachować.
    expect(row.height_cm).toBeNull();
    expect(row.adr_tunnel_code).toBeNull();
  });
});
