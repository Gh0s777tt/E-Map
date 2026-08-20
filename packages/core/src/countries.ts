/**
 * [#375] Kraje jako kody ISO 3166-1 alpha-2.
 *
 * Dotychczasowa walidacja pola „Kraj" to było `z.string().min(2).max(56)`, więc
 * przechodziło przez nią wszystko — łącznie z „10115 Berlin", które wstawiał tam
 * zepsuty geokoder (#372). Skutki sięgały dalej niż brzydki wpis: stawka VAT
 * i zwrot podatku są kluczowane po kraju tankowania, a „10115 Berlin" nie
 * dopasuje się do żadnej stawki i kwota wypadnie z rozliczenia bez słowa.
 *
 * Lista obejmuje Europę (UE + kraje tranzytowe) — to zasięg, w którym realnie
 * jeżdżą floty korzystające z tej aplikacji. Kraj spoza listy nie jest błędem
 * twardym; `normalizeCountry` po prostu nie potrafi go rozwinąć.
 */

/** Kod ISO → polska nazwa kraju. */
export const COUNTRIES: Record<string, string> = {
  AL: "Albania",
  AD: "Andora",
  AT: "Austria",
  BY: "Białoruś",
  BE: "Belgia",
  BA: "Bośnia i Hercegowina",
  BG: "Bułgaria",
  HR: "Chorwacja",
  CY: "Cypr",
  CZ: "Czechy",
  DK: "Dania",
  EE: "Estonia",
  FI: "Finlandia",
  FR: "Francja",
  GR: "Grecja",
  ES: "Hiszpania",
  NL: "Holandia",
  IE: "Irlandia",
  IS: "Islandia",
  LT: "Litwa",
  LU: "Luksemburg",
  LV: "Łotwa",
  MK: "Macedonia Północna",
  MT: "Malta",
  MD: "Mołdawia",
  DE: "Niemcy",
  NO: "Norwegia",
  PL: "Polska",
  PT: "Portugalia",
  RU: "Rosja",
  RO: "Rumunia",
  RS: "Serbia",
  SK: "Słowacja",
  SI: "Słowenia",
  CH: "Szwajcaria",
  SE: "Szwecja",
  TR: "Turcja",
  UA: "Ukraina",
  HU: "Węgry",
  GB: "Wielka Brytania",
  IT: "Włochy",
  ME: "Czarnogóra",
  XK: "Kosowo",
};

/**
 * Nazwy alternatywne → kod ISO. Ludzie wpisują różnie, a my mamy zrozumieć.
 *
 * Eksportowane, bo ta sama mapa istnieje po stronie bazy (`public.normalize_country`,
 * migracja 0099) — stare buildy mobile ze sklepu nie mają nowej walidacji Zod, więc
 * ostatnią bramką jest trigger. `countries.sql.test.ts` pilnuje, żeby obie listy
 * się nie rozjechały.
 */
export const COUNTRY_ALIASES: Record<string, string> = {
  POLSKA: "PL",
  POLAND: "PL",
  PL: "PL",
  POL: "PL",
  NIEMCY: "DE",
  GERMANY: "DE",
  DEUTSCHLAND: "DE",
  GER: "DE",
  DEU: "DE",
  CZECHY: "CZ",
  CZECHIA: "CZ",
  CZE: "CZ",
  SLOWACJA: "SK",
  SŁOWACJA: "SK",
  SLOVAKIA: "SK",
  SVK: "SK",
  FRANCJA: "FR",
  FRANCE: "FR",
  FRA: "FR",
  WLOCHY: "IT",
  WŁOCHY: "IT",
  ITALY: "IT",
  ITALIA: "IT",
  ITA: "IT",
  HISZPANIA: "ES",
  SPAIN: "ES",
  ESP: "ES",
  HOLANDIA: "NL",
  NETHERLANDS: "NL",
  NLD: "NL",
  BELGIA: "BE",
  BELGIUM: "BE",
  BEL: "BE",
  AUSTRIA: "AT",
  AUT: "AT",
  WEGRY: "HU",
  WĘGRY: "HU",
  HUNGARY: "HU",
  HUN: "HU",
  // Wielka Brytania bywa wpisywana na kilka sposobów; „UK" to kod nieoficjalny,
  // ale w praktyce najczęstszy — mapujemy go na ISO `GB`.
  UK: "GB",
  GBR: "GB",
  ANGLIA: "GB",
  ENGLAND: "GB",
  "GREAT BRITAIN": "GB",
  "UNITED KINGDOM": "GB",
  DANIA: "DK",
  DENMARK: "DK",
  DNK: "DK",
  SZWECJA: "SE",
  SWEDEN: "SE",
  SWE: "SE",
  NORWEGIA: "NO",
  NORWAY: "NO",
  NOR: "NO",
  LITWA: "LT",
  LITHUANIA: "LT",
  LTU: "LT",
  LOTWA: "LV",
  ŁOTWA: "LV",
  LATVIA: "LV",
  LVA: "LV",
  UKRAINA: "UA",
  UKRAINE: "UA",
  UKR: "UA",
  RUMUNIA: "RO",
  ROMANIA: "RO",
  ROU: "RO",
  BULGARIA: "BG",
  BUŁGARIA: "BG",
  BGR: "BG",
  SZWAJCARIA: "CH",
  SWITZERLAND: "CH",
  CHE: "CH",
  SLOWENIA: "SI",
  SŁOWENIA: "SI",
  SLOVENIA: "SI",
  SVN: "SI",
  CHORWACJA: "HR",
  CROATIA: "HR",
  HRV: "HR",
  PORTUGALIA: "PT",
  PORTUGAL: "PT",
  PRT: "PT",
  FINLANDIA: "FI",
  FINLAND: "FI",
  FIN: "FI",
  ESTONIA: "EE",
  EST: "EE",
  IRLANDIA: "IE",
  IRELAND: "IE",
  IRL: "IE",
  LUKSEMBURG: "LU",
  LUXEMBOURG: "LU",
  LUX: "LU",
  GRECJA: "GR",
  GREECE: "GR",
  GRC: "GR",
  TURCJA: "TR",
  TURKEY: "TR",
  TUR: "TR",
};

/**
 * Sprowadza wpis użytkownika do kodu ISO 3166-1 alpha-2.
 *
 * `null`, gdy nie da się rozpoznać — wywołujący ma to pokazać jako błąd pola,
 * a NIE zapisać przypadkowego tekstu. Wpis „10115 Berlin" ma zostać odrzucony
 * przy wprowadzaniu, a nie ujawnić się dopiero przy liczeniu zwrotu VAT.
 */
export function normalizeCountry(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!v) return null;
  if (COUNTRIES[v]) return v;
  const alias = COUNTRY_ALIASES[v];
  if (alias) return alias;
  return null;
}

/** Czy wpis da się sprowadzić do znanego kodu kraju. */
export function isKnownCountry(raw: string | null | undefined): boolean {
  return normalizeCountry(raw) !== null;
}

/** Nazwa kraju dla kodu ISO; sam kod, gdy nieznany. */
export function countryName(code: string | null | undefined): string {
  const c = (code ?? "").trim().toUpperCase();
  return COUNTRIES[c] ?? c;
}

/** Lista do pól wyboru: kod + nazwa, alfabetycznie po nazwie. */
export function countryOptions(): { code: string; name: string }[] {
  return Object.entries(COUNTRIES)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));
}
