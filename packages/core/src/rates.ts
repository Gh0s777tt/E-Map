/**
 * Wybór domyślnej stawki €/km dla pojazdu.
 * Reguła: najpierw najnowsza stawka danego pojazdu, w razie braku — najnowsza
 * domyślna firmowa (`vehicleId === null`). Deterministyczne, czyste (bez I/O).
 */
export interface RateLike {
  vehicleId: string | null;
  ratePerKm: number;
  /** Data w formacie ISO `YYYY-MM-DD` — porównywalna leksykograficznie. */
  validFrom: string;
}

/** Najnowszy wpis (max `validFrom`) z listy, albo `null` gdy pusta. */
function latest<T extends RateLike>(list: readonly T[]): T | null {
  return list.reduce<T | null>(
    (best, r) => (best === null || r.validFrom > best.validFrom ? r : best),
    null,
  );
}

/**
 * Stawka €/km dla pojazdu: stawka pojazdu → domyślna firmowa → `null`.
 * @param rates lista stawek firmy (dowolna kolejność)
 * @param vehicleId pojazd, dla którego liczymy rozliczenie
 */
export function pickRate<T extends RateLike>(
  rates: readonly T[],
  vehicleId: string,
): number | null {
  const forVehicle = latest(rates.filter((r) => r.vehicleId === vehicleId));
  if (forVehicle) return forVehicle.ratePerKm;
  const companyDefault = latest(rates.filter((r) => r.vehicleId === null));
  return companyDefault ? companyDefault.ratePerKm : null;
}
