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
