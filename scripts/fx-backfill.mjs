// [#378] Jednorazowy import historii kursów EBC do tabeli `fx_rates`.
//
// Po co osobny skrypt, skoro jest już cron `/api/cron/fx`?
// Cron pobiera `eurofxref-daily.xml` — jeden dzień. Świeże wdrożenie startuje
// więc z pustą historią, a statystyki liczą po kursie z DNIA ZDARZENIA: bez
// notowań wstecz każda kwota w innej walucie niż euro po prostu wypada z sumy.
// Pliku historycznego EBC (~8 MB) nie da się przerobić w funkcji serverless
// w limicie czasu, dlatego to skrypt operatora — jak `gen-types.mjs`.
//
// Użycie:
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/fx-backfill.mjs
//   … --from 2023-01-01     (domyślnie 3 lata wstecz)
//   … --all                 (wszystkie waluty EBC zamiast zestawu europejskiego)
//
// Uruchomienie jest idempotentne: `upsert` z `ignoreDuplicates`, więc powtórka
// niczego nie zdubluje i nie nadpisze notowań pobranych przez cron.

import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HIST_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml";

/**
 * Waluty realnie spotykane na trasach europejskiej floty.
 *
 * EBC NIE publikuje RSD (Serbia), UAH (Ukraina), BAM (Bośnia) ani MKD
 * (Macedonia Północna) — tankowania w tych krajach nie przeliczą się z żadnego
 * źródła i trzeba to powiedzieć wprost, zamiast pokazywać zaniżoną sumę.
 */
const EUROPE = ["PLN", "CZK", "GBP", "HUF", "RON", "SEK", "NOK", "DKK", "CHF", "BGN", "TRY", "ISK"];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function threeYearsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().slice(0, 10);
}

/**
 * Rozbija plik historyczny EBC na notowania.
 *
 * Format jest płaski i stabilny od lat — ten sam kształt, który czyta
 * `parseEcbXml` w cronie, tylko powtórzony dla każdego dnia:
 *   <Cube time="2026-08-07"><Cube currency="USD" rate="1.0901"/>…</Cube>
 */
export function parseEcbHistory(xml, { from, currencies }) {
  const out = [];
  const days = xml.split(/<Cube\s+time=/).slice(1);
  for (const chunk of days) {
    const day = chunk.match(/^['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
    if (!day || day < from) continue;
    for (const m of chunk.matchAll(
      /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g,
    )) {
      const currency = m[1];
      const value = Number(m[2]);
      if (currencies && !currencies.includes(currency)) continue;
      // Kurs ≤ 0 wysadziłby dzielenie w `toEur` — odrzucamy przy wejściu.
      if (!Number.isFinite(value) || value <= 0) continue;
      out.push({ as_of: day, currency, units_per_eur: value, source: "ecb-hist" });
    }
  }
  return out;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Ustaw SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w środowisku.");
    process.exit(1);
  }

  const from = arg("from", threeYearsAgo());
  const currencies = process.argv.includes("--all") ? null : EUROPE;

  console.log(`Pobieram historię EBC od ${from}…`);
  const res = await fetch(HIST_URL, { headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`EBC ${res.status}`);
  const rows = parseEcbHistory(await res.text(), { from, currencies });
  if (rows.length === 0) {
    console.log("Brak notowań w zadanym zakresie — nic do zapisania.");
    return;
  }

  const days = new Set(rows.map((r) => r.as_of));
  console.log(
    `Notowań: ${rows.length} · dni: ${days.size} · walut: ${new Set(rows.map((r) => r.currency)).size}`,
  );

  const admin = createClient(url, key, { auth: { persistSession: false } });
  // Porcjami — jeden upsert na 20 tys. wierszy potrafi przekroczyć limit zapytania.
  const CHUNK = 2000;
  let saved = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK);
    const { error } = await admin
      .from("fx_rates")
      // `ignoreDuplicates`, a nie nadpisywanie: notowania pobrane przez cron
      // pochodzą z tego samego źródła i nie ma powodu ich ruszać.
      .upsert(part, { onConflict: "as_of,currency", ignoreDuplicates: true });
    if (error) throw error;
    saved += part.length;
    process.stdout.write(`\r  zapisano ${saved}/${rows.length}`);
  }
  console.log(`\nGotowe. Zakres: ${[...days].sort()[0]} … ${[...days].sort().at(-1)}`);
}

// Tylko przy uruchomieniu wprost. Bez tego `import { parseEcbHistory }` w teście
// odpalałby import z sieci i zapis do bazy — a parser to jedyna część tego
// skryptu, w której da się popełnić cichy błąd, więc musi być testowalna.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
