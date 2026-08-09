/**
 * [#375] Parzystość mapy krajów: TypeScript ↔ SQL.
 *
 * Ta sama logika żyje w dwóch miejscach i musi tak zostać: Zod odrzuca zły kraj
 * przy wprowadzaniu, a trigger w bazie ratuje zapisy ze starych buildów mobile,
 * które nowego schematu nie znają. Dwa źródła prawdy to dwie okazje do rozjazdu,
 * więc pilnuje ich test — dopisanie aliasu tylko po jednej stronie zapala się
 * tutaj, a nie po miesiącu w rozliczeniu VAT.
 *
 * [#378] Test mieszka w `packages/api`, a nie przy samym module: czyta plik
 * migracji z dysku, a `packages/core` jest świadomie bez typów Node — dzieli go
 * z Hermesem (React Native), gdzie `node:fs` nie istnieje.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COUNTRIES, COUNTRY_ALIASES } from "@e-logistic/core";
import { describe, expect, it } from "vitest";

const MIGRATION = join(
  import.meta.dirname,
  "../../../supabase/migrations/0099_country_normalization.sql",
);

const sql = readFileSync(MIGRATION, "utf8");

/** Pary `('NAZWA', 'XX')` z listy VALUES w `normalize_country`. */
function sqlAliases(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of sql.matchAll(/^\s{4}\('([^']+)',\s*'([A-Z]{2})'\),?$/gm)) {
    const [, name, code] = m;
    if (name && code) out[name] = code;
  }
  return out;
}

/** Lista kodów ISO z gałęzi `val in (...)`. */
function sqlCodes(): string[] {
  const m = sql.match(/select val from v where val in \(([^)]+)\)/);
  if (!m) throw new Error("Nie znaleziono listy kodów ISO w migracji 0099");
  return [...(m[1] ?? "").matchAll(/'([A-Z]{2})'/g)].map((x) => x[1] ?? "");
}

describe("normalize_country (SQL) zgodne z countries.ts", () => {
  it("migracja jest czytelna dla testu", () => {
    // Gdyby regexy przestały cokolwiek łapać, reszta testów przeszłaby na pustych
    // zbiorach i milczałaby o rozjeździe. Ten test broni samego mechanizmu.
    expect(Object.keys(sqlAliases()).length).toBeGreaterThan(50);
    expect(sqlCodes().length).toBeGreaterThan(30);
  });

  it("ten sam zestaw kodów ISO", () => {
    expect(sqlCodes().slice().sort()).toEqual(Object.keys(COUNTRIES).sort());
  });

  it("ten sam zestaw aliasów i te same cele", () => {
    // Kody ISO obsługuje w SQL osobna gałąź, więc w liście VALUES ich nie ma —
    // po stronie TS `COUNTRY_ALIASES` zawiera je dla wygody (np. „PL": „PL").
    const ts = Object.fromEntries(
      Object.entries(COUNTRY_ALIASES).filter(([k]) => !(k in COUNTRIES)),
    );
    expect(sqlAliases()).toEqual(ts);
  });

  it("każdy alias celuje w znany kod", () => {
    for (const [name, code] of Object.entries(sqlAliases())) {
      expect(COUNTRIES[code], `alias ${name} → nieznany kod ${code}`).toBeDefined();
    }
  });
});
