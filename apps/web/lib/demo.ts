/** Dane zastępcze do czasu wpięcia listVehicles/fuel_cards z Supabase (#005). */

export const DEMO_VEHICLES = [
  { id: "11111111-1111-4111-8111-111111111111", registration: "WL5145U" },
  { id: "22222222-2222-4222-8222-222222222222", registration: "WP5652R" },
];

export const DEMO_CARDS = [
  { id: "33333333-3333-4333-8333-333333333333", provider: "dkv" as const, label: "DKV ****1234" },
  {
    id: "44444444-4444-4444-8444-444444444444",
    provider: "shell" as const,
    label: "Shell ****9876",
  },
];

/** Czytelna etykieta pojazdu (rejestracja) na podstawie id. */
export function vehicleLabel(id: string): string {
  return DEMO_VEHICLES.find((v) => v.id === id)?.registration ?? id.slice(0, 8);
}
