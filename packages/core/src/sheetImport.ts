/**
 * [#375] Odczyt wartości z arkusza (CSV / Excel) przygotowanego przez człowieka
 * albo wystawionego przez operatora karty paliwowej.
 *
 * Takie pliki nie trzymają jednego formatu: data bywa `2026-08-02`, `02.08.2026`
 * i `2026-08-02 14:30`, liczba przychodzi jako `1 234,56` (polski Excel),
 * `1,234.56` (angielski) albo `48,3 L`. Zamiast rozsypywać te przypadki po
 * komponentach, trzymamy je tutaj — razem z testami, bo cicha pomyłka w odczycie
 * liczby to nie literówka, tylko zła kwota w rozliczeniu.
 */

/**
 * Data (opcjonalnie z godziną) → ISO `YYYY-MM-DDTHH:MM`. `null`, gdy nie da się
 * odczytać — wywołujący ma odrzucić wiersz, a NIE podstawić dzisiejszej daty.
 *
 * Formaty ze slashem czytamy jako **dzień-miesiąc** (europejsko). To jedyne
 * miejsce, w którym zgadujemy, więc zgadujemy w stronę rynku, na którym ta
 * aplikacja pracuje — a `03/04` i tak jest niejednoznaczne w każdym systemie.
 */
export function parseSheetDate(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;

  // Godzina — opcjonalna, oddzielona spacją albo „T".
  const timeMatch = v.match(/[T ](\d{1,2}):(\d{2})/);
  const hh = (timeMatch?.[1] ?? "0").padStart(2, "0");
  const mm = timeMatch?.[2] ?? "00";
  const datePart = v.split(/[T ]/)[0] ?? "";

  let y: string | undefined;
  let m: string | undefined;
  let d: string | undefined;

  const iso = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const euro = datePart.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (iso) {
    [, y, m, d] = iso;
  } else if (euro) {
    [, d, m, y] = euro;
  } else {
    return null;
  }

  const mo = Number(m);
  const day = Number(d);
  const year = Number(y);
  // Kalendarzowa poprawność, nie samo dopasowanie wzorca: „31.02.2026" pasuje do
  // regexa, a `new Date` przesunąłby to na marzec i wpis wpadłby do złego miesiąca.
  const probe = new Date(Date.UTC(year, mo - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== mo - 1 ||
    probe.getUTCDate() !== day ||
    Number(hh) > 23 ||
    Number(mm) > 59
  ) {
    return null;
  }

  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${year}-${p2(mo)}-${p2(day)}T${hh}:${mm}`;
}

/**
 * Liczba z komórki arkusza. `undefined`, gdy pusto lub nie liczba.
 *
 * Radzi sobie z separatorem tysięcy i z jednostką doklejoną do wartości
 * („48,30 L", „1 234,56 EUR"), bo tak wyglądają zestawienia z kart paliwowych.
 */
export function parseSheetNumber(raw: string | null | undefined): number | undefined {
  let v = (raw ?? "").trim();
  if (!v) return undefined;

  // Litery i symbole walut odcinamy dopiero po sprawdzeniu, że coś w ogóle
  // przypomina liczbę — inaczej „brak danych" zamieniłoby się w `undefined`
  // nieodróżnialne od pustej komórki, a chcemy je odróżniać w komunikacie.
  v = v.replace(/[^\d.,\-+ ]/g, "").trim();
  if (!/\d/.test(v)) return undefined;

  v = v.replace(/\s/g, "");
  const lastComma = v.lastIndexOf(",");
  const lastDot = v.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Ten znak, który stoi bliżej końca, jest separatorem dziesiętnym.
    v = lastComma > lastDot ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // Sam przecinek: dziesiętny, chyba że dzieli grupy po trzy cyfry („1,234").
    v =
      /,\d{3}$/.test(v) && v.replace(/[^\d]/g, "").length > 3
        ? v.replace(/,/g, "")
        : v.replace(",", ".");
  }

  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Wartości, które w arkuszu znaczą „tak". Reszta (w tym pusta komórka) to „nie". */
const TRUTHY = new Set(["tak", "yes", "y", "t", "1", "true", "prawda", "x", "ja", "так"]);

/** Pole typu tak/nie z arkusza. `undefined` dla pustej komórki — brak to nie „nie". */
export function parseSheetBool(raw: string | null | undefined): boolean | undefined {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return undefined;
  return TRUTHY.has(v);
}
