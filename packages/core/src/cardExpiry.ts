/**
 * Ważność karty paliwowej podawana jest na karcie tylko jako **miesiąc/rok**
 * (np. 03/2026), bez dnia. W bazie trzymamy `date`, więc normalizujemy do
 * **ostatniego dnia miesiąca** (karta ważna do końca tego miesiąca).
 * Funkcje czyste, bez zależności.
 */

/** "YYYY-MM" (z `<input type="month">`) → ISO ostatniego dnia miesiąca "YYYY-MM-DD". */
export function monthInputToDate(yyyymm: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyymm.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  // Date.UTC(year, month, 0) = ostatni dzień miesiąca `month` (miesiąc 1-indeksowany tu).
  const last = new Date(Date.UTC(year, month, 0));
  const dd = String(last.getUTCDate()).padStart(2, "0");
  return `${m[1]}-${m[2]}-${dd}`;
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
