import { describe, expect, it } from "vitest";
import { buildKsefFaXml, type KsefInvoice, normalizeNip } from "./ksef";

const BASE: KsefInvoice = {
  number: "FV/2026/07/001",
  issueDate: "2026-07-13",
  currency: "PLN",
  seller: {
    name: "Trans-GH0ST Sp. z o.o.",
    taxId: "PL 526-10-40-828",
    address: "ul. Prosta 1, 00-001 Warszawa",
  },
  buyer: { name: "Klient S.A.", taxId: "1132191233", address: "ul. Krzywa 2, 00-002 Kraków" },
  lines: [
    {
      description: "Usługa transportowa DE→PL",
      quantity: 1,
      unitPriceNet: 1000,
      net: 1000,
      vatRate: 23,
    },
    { description: "Postój płatny", quantity: 2, unitPriceNet: 50, net: 100, vatRate: 23 },
  ],
  net: 1100,
  vatAmount: 253,
  gross: 1353,
  dueDate: "2026-08-12",
};

describe("normalizeNip", () => {
  it("wyłuskuje 10 cyfr z formatów z PL/kreskami/spacjami", () => {
    expect(normalizeNip("PL 526-10-40-828")).toBe("5261040828");
    expect(normalizeNip("1132191233")).toBe("1132191233");
  });
  it("odrzuca braki i złe długości", () => {
    expect(normalizeNip(null)).toBeNull();
    expect(normalizeNip("123")).toBeNull();
  });
});

describe("buildKsefFaXml", () => {
  const xml = buildKsefFaXml(BASE, { generatedAt: new Date("2026-07-13T12:00:00Z") });

  it("ma nagłówek FA(3) i strony z NIP-ami", () => {
    expect(xml).toContain('kodSystemowy="FA (3)"');
    expect(xml).toContain("<WariantFormularza>3</WariantFormularza>");
    expect(xml).toContain("<Podmiot1><DaneIdentyfikacyjne><NIP>5261040828</NIP>");
    expect(xml).toContain("<Podmiot2><DaneIdentyfikacyjne><NIP>1132191233</NIP>");
  });

  it("agreguje netto/VAT per stawka i sumę brutto", () => {
    expect(xml).toContain("<P_13_1>1100.00</P_13_1>");
    expect(xml).toContain("<P_14_1>253.00</P_14_1>");
    expect(xml).toContain("<P_15>1353.00</P_15>");
  });

  it("emituje pozycje FaWiersz z escapowaniem", () => {
    expect(xml).toContain("<P_7>Usługa transportowa DE→PL</P_7>");
    expect(xml).toContain("<NrWierszaFa>2</NrWierszaFa>");
    expect(xml).toContain("<P_12>23</P_12>");
  });

  it("dodaje termin płatności", () => {
    expect(xml).toContain("<Termin>2026-08-12</Termin>");
  });

  it("nabywca bez NIP dostaje BrakID; znaki specjalne są escapowane", () => {
    const x = buildKsefFaXml({
      ...BASE,
      buyer: { name: 'A&B "Spedycja" <international>', taxId: null, address: null },
    });
    expect(x).toContain("<BrakID>1</BrakID>");
    expect(x).toContain("A&amp;B &quot;Spedycja&quot; &lt;international&gt;");
  });

  it("stawka 0% ląduje w P_13_6_1 bez P_14", () => {
    const x = buildKsefFaXml({
      ...BASE,
      lines: [
        {
          description: "Transport międzynarodowy",
          quantity: 1,
          unitPriceNet: 500,
          net: 500,
          vatRate: 0,
        },
      ],
      net: 500,
      vatAmount: 0,
      gross: 500,
    });
    expect(x).toContain("<P_13_6_1>500.00</P_13_6_1>");
    expect(x).not.toContain("<P_14_6_1>");
  });

  it("faktura bez pozycji generuje wiersz z sum i stawkę wyliczoną", () => {
    const x = buildKsefFaXml({ ...BASE, lines: [] });
    expect(x).toContain("<P_11>1100.00</P_11>");
    expect(x).toContain("<P_12>23</P_12>");
    expect(x).toContain("<P_13_1>1100.00</P_13_1>");
  });
});
