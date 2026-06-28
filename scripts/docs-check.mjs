#!/usr/bin/env node
/**
 * docs-check.mjs — bramka spójności dokumentacji z kodem (CLAUDE.md: „na bieżąco, bez rozjazdów").
 *
 * Sprawdza deterministycznie:
 *  1) Badge wersji w README == package.json `version`.
 *  2) Nagłówek `<!-- SYNC: vX.Y.Z … -->` (README + BACKLOG) == wersja.
 *  3) CHANGELOG ma wpis `## [X.Y.Z]` dla bieżącej wersji.
 *  4) (ostrzeżenie) Nagłówki „stan … vX.Y.Z" w docs/ ≈ bieżąca wersja (nie blokuje CI).
 *  5) Wymagane katalogi (packages/*, apps/*, supabase/migrations) istnieją.
 *  6) Dokumentacja nie wymienia nieistniejących katalogów-duchów (np. packages/config).
 *
 * Kod wyjścia: 0 = spójne, 1 = wykryto rozjazd. Bez zależności (czysty Node).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), "utf8") : null);
const errors = [];
const warnings = [];

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;

// 1) README: badge wersji
const readme = read("README.md") ?? "";
if (!readme.includes(`wersja-${version}`)) {
  errors.push(`README: badge wersji nie zawiera „wersja-${version}" (package.json = ${version}).`);
}

// 2) Nagłówki SYNC (README + BACKLOG)
for (const f of ["README.md", "docs/BACKLOG.md"]) {
  const c = read(f);
  if (!c) continue;
  const m = c.match(/SYNC:\s*(?:po\s+)?v(\d+\.\d+\.\d+)/);
  if (!m) errors.push(`${f}: brak nagłówka <!-- SYNC: vX.Y.Z … -->.`);
  else if (m[1] !== version) errors.push(`${f}: SYNC v${m[1]} ≠ package.json ${version}.`);
}

// 3) CHANGELOG: wpis bieżącej wersji
const changelog = read("CHANGELOG.md") ?? "";
if (!changelog.includes(`## [${version}]`)) {
  errors.push(`CHANGELOG.md: brak wpisu „## [${version}]".`);
}

// 3b) Wersja głównej aplikacji web == root (audyt #214: koniec rozjazdu wersji).
const webPkg = read("apps/web/package.json");
if (webPkg) {
  const webVer = JSON.parse(webPkg).version;
  if (webVer !== version) errors.push(`apps/web/package.json: wersja ${webVer} ≠ root ${version}.`);
}

// 4) Nagłówki wersji w docs (pierwsze ~800 znaków = nagłówek statusu)
for (const f of [
  "docs/ARCHITECTURE.md",
  "docs/DATA-MODEL.md",
  "docs/ROADMAP.md",
  "docs/MOBILE-PLAN.md",
]) {
  const c = read(f);
  if (!c) continue;
  // Nagłówek (sekcja statusu) musi wspominać bieżącą wersję projektu. Inne wersje
  // (np. v1.26.0 apki mobilnej, SDK) są dozwolone — sprawdzamy obecność, nie wyłączność.
  const head = c.slice(0, 800);
  const found = [...head.matchAll(/\bv(\d+\.\d+\.\d+)/g)].map((x) => x[1]);
  if (found.length > 0 && !found.includes(version)) {
    // Ostrzeżenie, nie błąd: nagłówek docs śledzi wersję OSTATNIEJ zmiany treści danego
    // dokumentu, niekoniecznie każdy bump kodu (np. patch bez zmian schematu/architektury).
    warnings.push(
      `${f}: nagłówek deklaruje v${found.join("/")}, kod jest na v${version} — rozważ aktualizację przy wydaniu.`,
    );
  }
}

// 5) Wymagane katalogi istnieją
for (const d of [
  "packages/core",
  "packages/api",
  "packages/ui",
  "packages/maps",
  "packages/i18n",
  "apps/web",
  "apps/mobile",
  "supabase/migrations",
]) {
  if (!existsSync(join(root, d))) errors.push(`Brak wymaganego katalogu: ${d}/.`);
}

// 6) Katalogi-duchy nie mogą być reklamowane w dokumentacji, gdy nie istnieją
const ghosts = ["packages/config"];
const docBlob = [readme, read("docs/ARCHITECTURE.md") ?? ""].join("\n");
for (const g of ghosts) {
  if (!existsSync(join(root, g)) && docBlob.includes(g)) {
    errors.push(`Dokumentacja wymienia nieistniejący katalog „${g}".`);
  }
}

// Info: liczba migracji + kontrola unikalności numerów (audyt #214).
const migDir = join(root, "supabase/migrations");
const migFiles = existsSync(migDir) ? readdirSync(migDir).filter((f) => f.endsWith(".sql")) : [];
const migCount = migFiles.length;

// Numery migracji muszą być unikalne (duplikat = niejednoznaczna kolejność stosowania).
// Historyczne 0017/0018 są już zastosowane na prod — dozwolone (nie wolno renumerować).
const KNOWN_DUP_MIGRATIONS = new Set(["0017", "0018"]);
const migNums = migFiles.map((f) => f.slice(0, 4));
const dupNums = [...new Set(migNums.filter((n, i) => migNums.indexOf(n) !== i))].filter(
  (n) => !KNOWN_DUP_MIGRATIONS.has(n),
);
if (dupNums.length > 0) {
  errors.push(`supabase/migrations: zdublowane numery migracji: ${dupNums.join(", ")}.`);
}

if (warnings.length > 0) {
  console.warn("⚠️  docs-check — ostrzeżenia (nie blokują):");
  for (const w of warnings) console.warn(`  - ${w}`);
}

if (errors.length > 0) {
  console.error(`\n❌ docs-check: rozjazd dokumentacji z kodem (wersja ${version}):`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(1);
}

console.log(
  `✅ docs-check: dokumentacja spójna z kodem (v${version}, ${migCount} plików migracji).`,
);
