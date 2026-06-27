/**
 * Komunikat onboardingu dla widoków zależnych od floty. `source` pochodzi z
 * `useFleet`/membership ("ok" | "demo" | "no-company" | "no-vehicles" | …).
 *
 * Czysta funkcja — używana przez komponent `SetupNotice` (render) ORAZ przez
 * strony, które potrzebują wartości do logiki (np. blokada przycisku „Zapisz").
 * Wcześniej ta sama kaskada warunków była kopiowana inline w kilku miejscach.
 */
export function setupMessage(
  source: string,
  opts?: { noCompany?: string; noVehicles?: string },
): string | null {
  if (source === "no-company") {
    return opts?.noCompany ?? "Najpierw utwórz firmę na Pulpicie.";
  }
  if (source === "no-vehicles") {
    return opts?.noVehicles ?? "Dodaj pojazd w zakładce Pojazdy, aby kontynuować.";
  }
  return null;
}
