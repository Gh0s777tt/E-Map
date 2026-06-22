/**
 * Pomocnik zaokrąglania kwot do 2 miejsc po przecinku.
 *
 * UWAGA (do produkcji): operujemy na `number` (IEEE-754) — dla rozliczeń
 * o wysokiej stawce rozważyć przejście na liczby całkowite (grosze)
 * lub bibliotekę decimal. Na obecnym etapie `round2` jest świadomym,
 * udokumentowanym kompromisem i jest punktem zaczepienia do zmiany.
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Formatuje kwotę po polsku: 2 miejsca po przecinku, spacja jako separator
 * tysięcy, przecinek dziesiętny (np. `1 234,50`). Z `currency` dokleja walutę
 * (np. `1 234,50 EUR`). Deterministyczne — do dokumentów (faktura/CMR).
 */
export function formatMoney(value: number, currency?: string): string {
  const n = round2(value);
  const [int, frac] = Math.abs(n).toFixed(2).split(".");
  const grouped = (int as string).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const s = `${n < 0 ? "-" : ""}${grouped},${frac}`;
  return currency ? `${s} ${currency}` : s;
}
