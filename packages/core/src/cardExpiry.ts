/**
 * Ważność karty paliwowej podawana jest na karcie tylko jako **miesiąc/rok**
 * (np. 03/2026), bez dnia. W bazie trzymamy `date`, więc normalizujemy do
 * **ostatniego dnia miesiąca** (karta ważna do końca tego miesiąca).
 * Funkcje czyste, bez zależności.
 */

/**
 * "YYYY-MM" (z `<input type="month">`) **lub** "MM/YYYY" / "MM.YYYY" (wpis ręczny,
 * np. Safari renderuje type="month" jako zwykły tekst — #316) → ISO ostatniego
 * dnia miesiąca "YYYY-MM-DD".
 */
export function monthInputToDate(value: string): string | null {
  const v = value.trim();
  let year: number;
  let month: number;
  const iso = /^(\d{4})-(\d{1,2})$/.exec(v);
  const eu = /^(\d{1,2})[/.](\d{4})$/.exec(v);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
  } else if (eu) {
    month = Number(eu[1]);
    year = Number(eu[2]);
  } else {
    return null;
  }
  if (month < 1 || month > 12 || year < 1990 || year > 2100) return null;
  // Date.UTC(year, month, 0) = ostatni dzień miesiąca `month` (miesiąc 1-indeksowany tu).
  const last = new Date(Date.UTC(year, month, 0));
  const dd = String(last.getUTCDate()).padStart(2, "0");
  return `${year}-${String(month).padStart(2, "0")}-${dd}`;
}

/** ISO "YYYY-MM-DD" → "YYYY-MM" (wartość dla `<input type="month">`). */
export function dateToMonthInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${m[1]}-${m[2]}` : "";
}

/** ISO "YYYY-MM-DD" → wyświetlane "MM/YYYY" (jak na karcie). Pusto → "—". */
export function formatCardExpiry(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[1]}` : iso;
}
