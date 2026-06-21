import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Średnie krajowe ceny diesla (Europa), przeliczone na €/L.
 * Źródło: OpenVan.camp (otwarte API, bez klucza, CC BY 4.0). Cache 6 h (TTL źródła)
 * przez `next.revalidate` → OpenVAN odpytywane rzadko, niezależnie od liczby userów.
 */

const EU = new Set([
  "PL",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "BE",
  "LU",
  "CZ",
  "SK",
  "AT",
  "HU",
  "RO",
  "BG",
  "SI",
  "HR",
  "PT",
  "LT",
  "LV",
  "EE",
  "FI",
  "SE",
  "DK",
  "IE",
  "GR",
  "CH",
  "NO",
  "GB",
  "UA",
]);

const SRC = "https://openvan.camp/api";
const REVALIDATE = 21600; // 6 h

type Country = {
  cc: string;
  name: string;
  dieselEur: number;
  dieselLocal: number;
  currency: string;
};

export async function GET(request: Request) {
  if (!(await rateLimit(request, "fuel-eu")).ok) {
    return NextResponse.json({ error: "Za dużo żądań — spróbuj za chwilę." }, { status: 429 });
  }
  try {
    const [fRes, cRes] = await Promise.all([
      fetch(`${SRC}/fuel/prices`, { next: { revalidate: REVALIDATE } }),
      fetch(`${SRC}/currency/rates`, { next: { revalidate: REVALIDATE } }),
    ]);
    if (!fRes.ok || !cRes.ok) throw new Error("Źródło danych niedostępne.");

    const fuel = (await fRes.json()) as {
      data?: Record<
        string,
        {
          country_name?: string;
          currency?: string;
          prices?: { diesel?: number };
          fetched_at?: string;
        }
      >;
    };
    const cur = (await cRes.json()) as { rates?: Record<string, number> };
    const rates = cur.rates ?? {};
    const data = fuel.data ?? {};

    const countries: Country[] = [];
    let updated: string | null = null;
    for (const cc of Object.keys(data)) {
      if (!EU.has(cc)) continue;
      const e = data[cc];
      if (!e) continue;
      const diesel = e.prices?.diesel;
      if (typeof diesel !== "number" || diesel <= 0) continue;
      const ccy = e.currency ?? "EUR";
      const rate = ccy === "EUR" ? 1 : rates[ccy];
      if (typeof rate !== "number" || rate <= 0) continue;
      countries.push({
        cc,
        name: e.country_name ?? cc,
        dieselEur: Math.round((diesel / rate) * 1000) / 1000,
        dieselLocal: Math.round(diesel * 1000) / 1000,
        currency: ccy,
      });
      if (!updated && e.fetched_at) updated = e.fetched_at;
    }
    countries.sort((a, b) => a.dieselEur - b.dieselEur);

    return NextResponse.json({
      updated,
      countries,
      attribution: "Dane: OpenVan.camp (CC BY 4.0)",
    });
  } catch (e) {
    return NextResponse.json(
      { countries: [], error: e instanceof Error ? e.message : "Błąd pobierania cen." },
      { status: 502 },
    );
  }
}
