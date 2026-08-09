/**
 * [#373] Dociąganie kursów walut z Europejskiego Banku Centralnego.
 *
 * Źródło: publiczny kanał XML EBC — bez klucza, bez limitu, bez umowy.
 * EBC publikuje kursy w formacie „ile jednostek waluty za 1 EUR", czyli
 * DOKŁADNIE tak, jak trzyma je kolumna `units_per_eur`. Brak inwersji przy
 * imporcie jest celowy: odwrócony kurs to błąd, którego nikt nie zauważy,
 * dopóki ktoś nie policzy zwrotu VAT.
 *
 * EBC nie publikuje w weekendy i święta — wtedy kanał zwraca ostatni dzień
 * roboczy i `upsert` po prostu nic nie zmienia. To poprawne zachowanie,
 * a `pickFxRate` w `packages/core/src/fx.ts` sięga po ostatni znany kurs.
 *
 * Harmonogram (apps/web/vercel.json): 06:00 UTC. EBC publikuje ok. 16:00 CET,
 * więc o tej porze mamy komplet notowań z poprzedniego dnia roboczego, zanim
 * ktokolwiek zacznie pracę.
 */
import { createSupabaseAdminClient } from "@e-logistic/api/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
/** Kursy zmieniają się raz dziennie — nic tu nie ma do cache'owania. */
export const dynamic = "force-dynamic";

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

/**
 * Wyciąga notowania z XML EBC bez parsera DOM (Node nie ma wbudowanego).
 * Format jest stabilny od lat i płaski:
 *   <Cube time="2026-08-07">
 *     <Cube currency="USD" rate="1.0901"/>
 */
export function parseEcbXml(xml: string): { asOf: string; rates: Record<string, number> } | null {
  const day = xml.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/);
  if (!day?.[1]) return null;
  const rates: Record<string, number> = {};
  const re = /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;
  let m = re.exec(xml);
  while (m) {
    const code = m[1];
    const value = Number(m[2]);
    // Kurs ≤ 0 jest bez sensu i wysadziłby dzielenie w `toEur`.
    if (code && Number.isFinite(value) && value > 0) rates[code] = value;
    m = re.exec(xml);
  }
  return Object.keys(rates).length > 0 ? { asOf: day[1], rates } : null;
}

export async function GET(req: Request) {
  // Ten sam sekret co pozostałe crony — endpoint zapisuje dane referencyjne
  // dla wszystkich firm, więc nie może być otwarty.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const res = await fetch(ECB_URL, { headers: { Accept: "application/xml" } });
    if (!res.ok) {
      return NextResponse.json({ error: `ECB ${res.status}` }, { status: 502 });
    }
    const parsed = parseEcbXml(await res.text());
    if (!parsed) {
      return NextResponse.json({ error: "Nie udało się odczytać kanału EBC." }, { status: 502 });
    }

    const rows = Object.entries(parsed.rates).map(([currency, unitsPerEur]) => ({
      as_of: parsed.asOf,
      currency,
      units_per_eur: unitsPerEur,
      source: "ecb",
    }));
    // EUR jako oś — pozwala liczyć bez rozgałęziania „jeśli waluta = EUR".
    rows.push({ as_of: parsed.asOf, currency: "EUR", units_per_eur: 1, source: "ecb" });

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("fx_rates")
      .upsert(rows, { onConflict: "as_of,currency", ignoreDuplicates: false });
    if (error) throw error;

    return NextResponse.json({ asOf: parsed.asOf, saved: rows.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Błąd pobierania kursów." },
      { status: 500 },
    );
  }
}
