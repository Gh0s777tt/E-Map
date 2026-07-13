/**
 * #326: KSeF (Krajowy System e-Faktur) — generator XML e-faktury w strukturze
 * FA(3) (obowiązkowej w KSeF 2.0 od 2026 r.). Fala 1: czysty builder XML
 * z danych faktury — plik do ręcznej wysyłki/importu (KSeF, systemy księgowe).
 * Fala 2 (backlog): wysyłka online przez API KSeF (token/certyfikat firmy).
 *
 * Uwaga: struktura wg wzoru FA(3); przed produkcyjną wysyłką zweryfikować
 * plik walidatorem KSeF (schema XSD publikowana przez MF na crd.gov.pl).
 */

/** Namespace wzoru FA(3) (publikacja MF, KSeF 2.0). */
const FA3_NS = "http://crd.gov.pl/wzor/2025/06/25/13775/";

export interface KsefParty {
  name: string;
  /** NIP (dowolny format — cyfry zostaną wyłuskane) lub null/inny identyfikator. */
  taxId: string | null;
  address: string | null;
}

export interface KsefLine {
  description: string;
  quantity: number;
  /** Cena jednostkowa netto. */
  unitPriceNet: number;
  net: number;
  /** Stawka VAT w %, np. 23, 8, 5, 0. */
  vatRate: number;
}

export interface KsefInvoice {
  number: string;
  /** Data wystawienia YYYY-MM-DD. */
  issueDate: string;
  currency: string;
  seller: KsefParty;
  buyer: KsefParty;
  lines: KsefLine[];
  net: number;
  vatAmount: number;
  gross: number;
  /** Termin płatności YYYY-MM-DD (opcjonalny). */
  dueDate?: string | null;
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const amount = (n: number): string => n.toFixed(2);

/** Wyłuskuje 10-cyfrowy NIP (usuwa PL, kreski, spacje); null gdy niepoprawny. */
export function normalizeNip(taxId: string | null | undefined): string | null {
  const digits = (taxId ?? "").replace(/\D/g, "");
  return digits.length === 10 ? digits : null;
}

/**
 * Koszyk stawki VAT wg pól P_13_x/P_14_x wzoru FA:
 * 22–23% → 1 · 7–8% → 2 · 5% → 3 · 0% → 6_1 (krajowe) · inne → null (pomijane
 * w agregatach; kwota i tak jest w P_15 oraz wierszach).
 */
function rateBucket(rate: number): string | null {
  if (rate >= 22) return "1";
  if (rate >= 7) return "2";
  if (rate === 5) return "3";
  if (rate === 0) return "6_1";
  return null;
}

function partyXml(tag: "Podmiot1" | "Podmiot2", p: KsefParty): string {
  const nip = normalizeNip(p.taxId);
  const id = nip
    ? `<NIP>${nip}</NIP><Nazwa>${esc(p.name)}</Nazwa>`
    : `${tag === "Podmiot2" ? "<BrakID>1</BrakID>" : ""}<Nazwa>${esc(p.name)}</Nazwa>`;
  const address = p.address?.trim()
    ? `<Adres><KodKraju>PL</KodKraju><AdresL1>${esc(p.address.trim())}</AdresL1></Adres>`
    : "";
  return `<${tag}><DaneIdentyfikacyjne>${id}</DaneIdentyfikacyjne>${address}</${tag}>`;
}

/**
 * Buduje XML faktury w strukturze FA(3). Agreguje netto/VAT per stawka
 * (P_13_x/P_14_x), sumę brutto w P_15 i pozycje w FaWiersz.
 */
export function buildKsefFaXml(
  inv: KsefInvoice,
  opts: { systemInfo?: string; generatedAt?: Date } = {},
): string {
  const generated = (opts.generatedAt ?? new Date()).toISOString();

  // Agregaty per koszyk stawki (netto + VAT).
  const buckets = new Map<string, { net: number; vat: number }>();
  for (const line of inv.lines) {
    const b = rateBucket(line.vatRate);
    if (!b) continue;
    const cur = buckets.get(b) ?? { net: 0, vat: 0 };
    cur.net += line.net;
    cur.vat += line.net * (line.vatRate / 100);
    buckets.set(b, cur);
  }
  // Bez pozycji (faktura opisowa) — całość wg stawki wyliczonej z sum.
  if (inv.lines.length === 0) {
    const rate = inv.net > 0 ? Math.round((inv.vatAmount / inv.net) * 100) : 23;
    const b = rateBucket(rate) ?? "1";
    buckets.set(b, { net: inv.net, vat: inv.vatAmount });
  }

  const sums = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([b, v]) => {
      const vat = b === "6_1" ? "" : `<P_14_${b}>${amount(v.vat)}</P_14_${b}>`;
      return `<P_13_${b}>${amount(v.net)}</P_13_${b}>${vat}`;
    })
    .join("");

  const rows =
    inv.lines.length > 0
      ? inv.lines
          .map(
            (line, i) =>
              `<FaWiersz><NrWierszaFa>${i + 1}</NrWierszaFa><P_7>${esc(line.description)}</P_7>` +
              `<P_8B>${line.quantity}</P_8B><P_9A>${amount(line.unitPriceNet)}</P_9A>` +
              `<P_11>${amount(line.net)}</P_11><P_12>${line.vatRate}</P_12></FaWiersz>`,
          )
          .join("")
      : `<FaWiersz><NrWierszaFa>1</NrWierszaFa><P_7>${esc(inv.number)}</P_7>` +
        `<P_8B>1</P_8B><P_9A>${amount(inv.net)}</P_9A><P_11>${amount(inv.net)}</P_11>` +
        `<P_12>${inv.net > 0 ? Math.round((inv.vatAmount / inv.net) * 100) : 23}</P_12></FaWiersz>`;

  const payment = inv.dueDate
    ? `<Platnosc><TerminPlatnosci><Termin>${inv.dueDate}</Termin></TerminPlatnosci>` +
      `<FormaPlatnosci>6</FormaPlatnosci></Platnosc>`
    : "";

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Faktura xmlns="${FA3_NS}">` +
    `<Naglowek>` +
    `<KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>` +
    `<WariantFormularza>3</WariantFormularza>` +
    `<DataWytworzeniaFa>${generated}</DataWytworzeniaFa>` +
    `<SystemInfo>${esc(opts.systemInfo ?? "E-Logistic")}</SystemInfo>` +
    `</Naglowek>` +
    partyXml("Podmiot1", inv.seller) +
    partyXml("Podmiot2", inv.buyer) +
    `<Fa>` +
    `<KodWaluty>${esc(inv.currency || "PLN")}</KodWaluty>` +
    `<P_1>${inv.issueDate}</P_1>` +
    `<P_2>${esc(inv.number)}</P_2>` +
    sums +
    `<P_15>${amount(inv.gross)}</P_15>` +
    `<Adnotacje><P_16>2</P_16><P_17>2</P_17><P_18>2</P_18><P_18A>2</P_18A>` +
    `<Zwolnienie><P_19N>1</P_19N></Zwolnienie>` +
    `<NoweSrodkiTransportu><P_22N>1</P_22N></NoweSrodkiTransportu>` +
    `<P_23>2</P_23><PMarzy><P_PMarzyN>1</P_PMarzyN></PMarzy></Adnotacje>` +
    `<RodzajFaktury>VAT</RodzajFaktury>` +
    rows +
    payment +
    `</Fa>` +
    `</Faktura>`
  );
}
