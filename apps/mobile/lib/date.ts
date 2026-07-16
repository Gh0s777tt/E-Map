/**
 * #audyt N6: wspólne helpery dat aplikacji kierowcy — wcześniej `monthStartIso`
 * i `fmtDT` były kopiowane bajt-w-bajt po kilku plikach (useGamification/
 * useDriverCard oraz TachoJournal/tacho), co groziło rozjazdem przy zmianie.
 */

/** Początek bieżącego miesiąca (UTC) jako ISO — okno filtrów „ten miesiąc". */
export function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Krótka data-godzina `DD.MM HH:MM` z ISO, znacznika ms lub `Date`. */
export function fmtDT(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
