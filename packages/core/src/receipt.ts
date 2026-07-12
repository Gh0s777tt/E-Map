/**
 * #298: Parser tekstu paragonu (wynik OCR) — heurystyki odczytu kwoty i waluty.
 * Czysty TS (bez zależności), współdzielony web↔mobile; OCR robi klient
 * (ML Kit na urządzeniu), tu tylko interpretacja tekstu.
 */

export interface ReceiptParse {
  /** Kwota do zapłaty (zaokrąglona do groszy) lub null, gdy nie znaleziono. */
  amount: number | null;
  /** Waluta ISO (PLN/EUR/GBP/CZK/…) lub null. */
  currency: string | null;
  /** #299: zatankowane litry (z paragonu stacji) lub null. */
  liters: number | null;
}

/** Słowa-klucze sumy na paragonach PL/EN/DE/CZ/FR — linia z nimi ma pierwszeństwo. */
const TOTAL_KEYWORDS = [
  "suma",
  "razem",
  "do zapłaty",
  "do zaplaty",
  "kwota",
  "total",
  "amount due",
  "gesamt",
  "summe",
  "zu zahlen",
  "celkem",
  "k úhradě",
  "k uhrade",
  "montant",
];

/** Symbole/kody walut → ISO. Kolejność bez znaczenia (dopasowanie po tokenach). */
const CURRENCY_TOKENS: Record<string, string> = {
  pln: "PLN",
  zł: "PLN",
  zl: "PLN",
  eur: "EUR",
  "€": "EUR",
  gbp: "GBP",
  "£": "GBP",
  czk: "CZK",
  kč: "CZK",
  kc: "CZK",
  chf: "CHF",
  nok: "NOK",
  sek: "SEK",
  dkk: "DKK",
  huf: "HUF",
  ron: "RON",
  uah: "UAH",
};

/** Liczby w formatach paragonowych: 12,34 · 12.34 · 1 234,56 · 1.234,56 (2 miejsca). */
const NUMBER_RE = /(\d{1,3}(?:[ . ]\d{3})*|\d+)[,.](\d{2})(?!\d)/g;

function toAmount(whole: string, cents: string): number {
  const w = Number(whole.replace(/[ . ]/g, ""));
  return Math.round(w * 100 + Number(cents)) / 100;
}

function amountsInLine(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(NUMBER_RE)) {
    const whole = m[1];
    const cents = m[2];
    if (whole !== undefined && cents !== undefined) out.push(toAmount(whole, cents));
  }
  return out;
}

/** Waluta z całego tekstu — pierwszy rozpoznany token (poza numerami NIP itd.). */
export function detectCurrency(text: string): string | null {
  const tokens = text.toLowerCase().split(/[\s:;()"']+/);
  for (const t of tokens) {
    const iso = CURRENCY_TOKENS[t.replace(/[.,]$/, "")];
    if (iso) return iso;
  }
  return null;
}

/**
 * Kwota „do zapłaty":
 * 1) największa liczba w liniach ze słowem-kluczem sumy (SUMA/TOTAL/GESAMT…),
 * 2) w braku — największa liczba groszowa w całym tekście (suma ≥ pozycji).
 */
export function detectAmount(text: string): number | null {
  const lines = text.split(/\r?\n/);
  const keyworded: number[] = [];
  const all: number[] = [];
  for (const line of lines) {
    const nums = amountsInLine(line);
    all.push(...nums);
    const low = line.toLowerCase();
    if (TOTAL_KEYWORDS.some((k) => low.includes(k))) keyworded.push(...nums);
  }
  const pool = keyworded.length > 0 ? keyworded : all;
  if (pool.length === 0) return null;
  return Math.max(...pool);
}

/** #299: litry z paragonu — liczba z przecinkiem/kropką tuż przed jednostką
 *  `l` / `L` / `ltr` / `litr…` (np. „ON B7 64,71 l", „Diesel 82,40 L").
 *  „zł"/„PLN" nie łapią się (jednostka musi zaczynać się od litery l). */
const LITERS_RE = /(\d{1,4})[,.](\d{1,3})\s?(?:l|L)(?:tr|itr\w*)?\b/g;

export function detectLiters(text: string): number | null {
  const found: number[] = [];
  for (const m of text.matchAll(LITERS_RE)) {
    const whole = m[1];
    const frac = m[2];
    if (whole === undefined || frac === undefined) continue;
    const v = Number(`${whole}.${frac}`);
    // sensowny zakres tankowania TIR: 1–2000 l (odsiewa ceny jednostkowe typu 1,689)
    if (v >= 1 && v <= 2000) found.push(v);
  }
  if (found.length === 0) return null;
  return Math.max(...found);
}

/** Pełny parse tekstu z OCR paragonu. */
export function parseReceiptText(text: string): ReceiptParse {
  if (!text.trim()) return { amount: null, currency: null, liters: null };
  return {
    amount: detectAmount(text),
    currency: detectCurrency(text),
    liters: detectLiters(text),
  };
}
