/** Warstwa danych: pojazdy. */
import type { VehicleInput } from "@e-logistic/core";
import type { TypedSupabaseClient as SupabaseClient } from "../client";

export async function listVehicles(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("vehicles")
    // select("*") zamiast listy kolumn: schema-safe udostępnia nowe kolumny (naczepa #250) —
    // przed migracją 0055 ich brak nie wywala zapytania, po niej dochodzą automatycznie.
    .select("*")
    .eq("company_id", companyId)
    .order("registration");
  if (error) throw error;
  return data ?? [];
}

/** Pojazdy z datami ważności (przegląd/OC/leasing) — do przypomnień. */
export async function listVehiclesExpiry(client: SupabaseClient, companyId: string) {
  const { data, error } = await client
    .from("vehicles")
    .select("id, registration, inspection_expiry, insurance_expiry, leasing_end, license_expiry")
    .eq("company_id", companyId)
    .order("registration");
  if (error) throw error;
  return data ?? [];
}

/**
 * [#389] Nazwa kolumny dla każdego pola kartoteki — jedno miejsce, dwa zastosowania.
 *
 * Wcześniej odwzorowanie pole→kolumna istniało wyłącznie wewnątrz `vehicleToRow`
 * jako literał obiektu, więc nie dało się go użyć do niczego innego niż zapis
 * CAŁEGO wiersza. To właśnie ten zapis kasował dane przy edycji z formularza,
 * który nie miał kompletu pól.
 */
const VEHICLE_COLUMNS = {
  registration: "registration",
  make: "make",
  model: "model",
  vin: "vin",
  insurer: "insurer",
  year: "year",
  firstRegistrationDate: "first_registration_date",
  inspectionExpiry: "inspection_expiry",
  insuranceExpiry: "insurance_expiry",
  licenseExpiry: "license_expiry",
  licenseNumber: "license_number",
  leasingEnd: "leasing_end",
  curbWeightKg: "curb_weight_kg",
  maxPayloadKg: "max_payload_kg",
  fuelTankL: "fuel_tank_l",
  adblueTankL: "adblue_tank_l",
  heightCm: "height_cm",
  widthCm: "width_cm",
  lengthCm: "length_cm",
  axleCount: "axle_count",
  adrTunnelCode: "adr_tunnel_code",
  emissionClass: "emission_class",
  vehicleType: "vehicle_type",
  forwarder: "forwarder",
  comment: "comment",
  trailerRegistration: "trailer_registration",
  trailerType: "trailer_type",
} as const satisfies Record<keyof VehicleInput, string>;

/**
 * [#389] Wiersz do AKTUALIZACJI — wyłącznie pola, które formularz naprawdę oddał.
 *
 * Problem, który to rozwiązuje: `vehicleToRow` buduje komplet kolumn z `?? null`,
 * a `updateVehicle` wysyłał ten komplet do bazy. Formularz mający 9 pól z 26
 * kasował więc przy każdym zapisie pozostałe 17 — w tym gabaryty, liczbę osi
 * i kod tunelowy ADR, czyli dane, z których mapa liczy trasę ciężarówki.
 * Na webie naprawiono to w [#386] przez dołożenie brakujących pól do formularza,
 * ale to naprawa jednego wywołującego, nie mechanizmu: aplikacja mobilna
 * (`manage-vehicles.tsx`, 9 pól) kasowała dalej, a każdy nowy ekran edycji
 * zaczynałby od tej samej pułapki.
 *
 * Rozróżnienie opiera się na OBECNOŚCI KLUCZA, nie na jego wartości — i to jest
 * sedno, bo `undefined` znaczy tu dwie różne rzeczy:
 *
 *   `{ insurer: undefined }`  → użytkownik WYCZYŚCIŁ pole  → zapisujemy `null`
 *   klucz w ogóle nieobecny   → formularz tego pola NIE MA → nie ruszamy kolumny
 *
 * Zod zachowuje tę różnicę: przy polu `.optional()` klucz pominięty na wejściu
 * jest nieobecny również na wyjściu, a klucz podany jako `undefined` zostaje.
 * Web wysyła `pole.trim() || undefined`, czyli klucz OBECNY — więc czyszczenie
 * pola nadal działa dokładnie jak dotąd.
 *
 * Warunek poprawności: `vehicleSchema` nie może dostać `.default()` na żadnym
 * polu — `.default()` wstawia klucz nawet wtedy, gdy wywołujący go nie podał,
 * co zamieniłoby „nie ruszaj" w „nadpisz wartością domyślną". Pilnuje tego test
 * w `vehicles.test.ts`.
 */
export function vehicleToPatch(input: Partial<VehicleInput>) {
  const row: Record<string, unknown> = {};
  for (const [pole, kolumna] of Object.entries(VEHICLE_COLUMNS)) {
    if (!Object.hasOwn(input, pole)) continue;
    row[kolumna] = input[pole as keyof VehicleInput] ?? null;
  }
  return row;
}

/** Mapuje zwalidowany input pojazdu na wiersz tabeli (snake_case). */
export function vehicleToRow(input: VehicleInput, companyId: string) {
  const base = {
    company_id: companyId,
    registration: input.registration,
    make: input.make ?? null,
    model: input.model,
    vin: input.vin ?? null,
    insurer: input.insurer ?? null,
    year: input.year,
    first_registration_date: input.firstRegistrationDate ?? null,
    inspection_expiry: input.inspectionExpiry ?? null,
    insurance_expiry: input.insuranceExpiry ?? null,
    license_expiry: input.licenseExpiry ?? null,
    license_number: input.licenseNumber ?? null,
    leasing_end: input.leasingEnd ?? null,
    curb_weight_kg: input.curbWeightKg ?? null,
    max_payload_kg: input.maxPayloadKg ?? null,
    fuel_tank_l: input.fuelTankL ?? null,
    adblue_tank_l: input.adblueTankL ?? null,
    height_cm: input.heightCm ?? null,
    width_cm: input.widthCm ?? null,
    length_cm: input.lengthCm ?? null,
    // [#385] Trzy pola routingu. `null` jest znaczące i ma zostać `null`:
    // ekran planowania trasy pokazuje brak wprost, zamiast podstawiać domyślne.
    axle_count: input.axleCount ?? null,
    adr_tunnel_code: input.adrTunnelCode ?? null,
    emission_class: input.emissionClass ?? null,
    vehicle_type: input.vehicleType,
    forwarder: input.forwarder ?? null,
    comment: input.comment ?? null,
  };
  // #250: naczepa dołączana do wiersza TYLKO gdy podana. Rzut do `typeof base` ukrywa kolumny
  // naczepy przed typem Insert (RejectExcessProperties odrzuca nieznane kolumny) — dojdą runtime,
  // a typ dogoni po migracji 0055 + gen:types. Bez migracji zapis bez naczepy działa bez zmian.
  const row = {
    ...base,
    ...(input.trailerRegistration ? { trailer_registration: input.trailerRegistration } : {}),
    ...(input.trailerType ? { trailer_type: input.trailerType } : {}),
  };
  return row as typeof base;
}

export async function insertVehicle(
  client: SupabaseClient,
  input: VehicleInput,
  companyId: string,
) {
  const { data, error } = await client
    .from("vehicles")
    .insert(vehicleToRow(input, companyId))
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Edytuje pojazd. RLS: owner/dispatcher. */
export async function updateVehicle(
  client: SupabaseClient,
  vehicleId: string,
  input: Partial<VehicleInput>,
  // Zostaje w sygnaturze dla zgodności wywołań; do samej aktualizacji nie jest
  // potrzebny — `company_id` i tak nigdy nie wchodzi do wiersza (pojazdu nie
  // wolno przepiąć do innej firmy edycją), a wiersz chroni RLS.
  _companyId?: string,
) {
  // [#389] Patch zamiast całego wiersza — patrz komentarz przy `vehicleToPatch`.
  // Wysłanie kompletu kolumn kasowało wszystko, czego formularz nie miał.
  const row = vehicleToPatch(input);
  if (Object.keys(row).length === 0) return;
  const { error } = await client
    .from("vehicles")
    // Kształt patcha jest dynamiczny (tylko obecne klucze), więc typ Update
    // tabeli nie da się tu wyrazić statycznie — rzut jest zawężony do tego
    // jednego wywołania i osłonięty testami w `vehicles.test.ts`.
    .update(row as never)
    .eq("id", vehicleId);
  if (error) throw error;
}

/** Usuwa pojazd (kaskadowo: powiązane wpisy paliwa/AdBlue/trip). RLS: owner/dispatcher. */
export async function deleteVehicle(client: SupabaseClient, vehicleId: string) {
  const { error } = await client.from("vehicles").delete().eq("id", vehicleId);
  if (error) throw error;
}
