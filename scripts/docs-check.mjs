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
 *  7) Sekcja „Stack" w CLAUDE.md nie trzyma w kolumnie 🔜 czegoś, co leży już w zależnościach.
 *  8) Linki markdown do ścieżek w repo wskazują istniejące pliki (bez martwych odwołań).
 *
 * Kod wyjścia: 0 = spójne, 1 = wykryto rozjazd. Bez zależności (czysty Node).
 */
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
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

// 6) Ścieżki-duchy nie mogą być reklamowane w dokumentacji, gdy nie istnieją.
//
// Kontrola obejmuje też ścieżki plików CI, a nie tylko katalogi kodu — bo to właśnie tam
// rozjazd był najgroźniejszy: ARCHITECTURE.md przez kilka wydań opisywała `ci.yml`
// i `codeql.yml` w GitHub Actions jako bramki jakości każdego PR-a, choć w repo nie ma
// ani jednego workflow. Czytelnik (albo audytor) wnioskował z tego, że merge bez zielonego
// checka to niepodpięty runner, a nie brak bramki.
//
// `zrodla` jest per-ścieżka, bo zakres nie może być jeden dla wszystkich:
//  · README opisuje katalog workflowów jako nieaktywny — to własność koordynatora, nie bramki;
//  · CHANGELOG (w docs/ jako dowiązanie) i audyty to zapis HISTORYCZNY, w którym wolno
//    wymieniać ścieżki nieistniejące dziś — inaczej bramka karałaby za prawdę o przeszłości.
const ghosts = [
  { sciezka: "packages/config", zrodla: ["README.md", "docs/ARCHITECTURE.md"] },
  { sciezka: ".github/workflows", zrodla: dokumentacjaBiezaca() },
];

/**
 * Pliki `.md` bezpośrednio w `docs/`, z pominięciem dowiązań do plików z korzenia
 * (CHANGELOG/DEPLOY/…) i archiwalnych raportów `AUDIT-*`. Zostaje dokumentacja opisująca
 * stan BIEŻĄCY — czyli dokładnie ta, która ma być zgodna z kodem.
 */
function dokumentacjaBiezaca() {
  const dir = join(root, "docs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("AUDIT"))
    .filter((f) => !lstatSync(join(dir, f)).isSymbolicLink())
    .map((f) => `docs/${f}`);
}

for (const { sciezka, zrodla } of ghosts) {
  if (existsSync(join(root, sciezka))) continue;
  for (const plik of zrodla) {
    if ((read(plik) ?? "").includes(sciezka)) {
      errors.push(`${plik}: wymienia nieistniejącą ścieżkę „${sciezka}".`);
    }
  }
}

// 7) Stack w CLAUDE.md vs realne zależności.
//
// Kontrole 1–3 pilnują NUMERÓW wersji i przepuściłyby listę stacku opisującą inny projekt:
// CLAUDE.md przez kilka wydań trzymał TanStack Query, PowerSync i Sentry w kolumnie „docelowe",
// choć wszystkie trzy były już wpięte i działały. Mapowanie nazwa-z-dokumentu → pakiet npm
// musi być JAWNE, bo nazwa marketingowa („PowerSync") nie jest nazwą pakietu (`@powersync/…`).
const STACK_PACKAGES = [
  { nazwa: "TanStack Query", pakiety: ["@tanstack/react-query"] },
  { nazwa: "Zustand", pakiety: ["zustand"] },
  { nazwa: "PowerSync", pakiety: ["@powersync/"] },
  { nazwa: "Sentry", pakiety: ["@sentry/"] },
  // shadcn/ui NIE jest pakietem — komponenty kopiuje się do repo, więc szukamy podpisu
  // instalacji. Podpisem NR 1 jest plik `components.json`: `shadcn init` tworzy go zawsze
  // i nie tworzy go nic innego (BACKLOG.md powołuje się na jego brak jako dowód, że shadcn
  // w repo nie ma). Zależności są tylko wsparciem, bo `init` dokłada
  // `class-variance-authority` + `clsx` + `tailwind-merge` + `lucide-react`, a NIE dokłada
  // `@radix-ui/react-slot` — ten przychodzi dopiero z konkretnymi komponentami (button, badge).
  // Wymaganie Slota trzymało bramkę na zielono przy realistycznym `init` + `card`/`table`/`input`,
  // czyli dokładnie w scenariuszu, dla którego ją napisano. Para cva + tailwind-merge zostaje
  // z wymogiem KOMPLETU, bo każdy z osobna bywa używany samodzielnie i pojedyncze trafienie
  // oskarżałoby dokumentację o kłamstwo bez powodu.
  {
    nazwa: "shadcn/ui",
    pakiety: ["class-variance-authority", "tailwind-merge"],
    wymagaKompletu: true,
    pliki: ["components.json", "apps/web/components.json", "packages/ui/components.json"],
  },
];
// Świadomie poza tablicą: „Edge Functions/Deno" (nie ma reprezentacji w package.json —
// obecność widać po katalogu supabase/functions/) i pozostałe pozycje bez śladu w zależnościach.

/**
 * Zależności (prod + dev) każdego manifestu w repo — razem z KORZENIEM.
 * Korzeń trzyma narzędzia całego monorepo (biome, turbo, playwright, pg), więc technologia
 * dodana do jego `devDependencies` jest tak samo obecna jak ta w `apps/web` — a przy skanie
 * samych `apps/*` i `packages/*` przechodziła bramkę niezauważona.
 */
function manifestyWorkspace() {
  const wynik = [
    {
      sciezka: "package.json",
      zaleznosci: Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }),
    },
  ];
  for (const grupa of ["apps", "packages"]) {
    const dir = join(root, grupa);
    if (!existsSync(dir)) continue;
    for (const nazwa of readdirSync(dir)) {
      const sciezka = `${grupa}/${nazwa}/package.json`;
      const raw = read(sciezka);
      if (!raw) continue;
      const json = JSON.parse(raw);
      wynik.push({
        sciezka,
        zaleznosci: Object.keys({ ...json.dependencies, ...json.devDependencies }),
      });
    }
  }
  return wynik;
}

/**
 * Znacznik technologii = OSTATNI ✅/🔜 poprzedzający jej nazwę w sekcji Stack. Każdy punkt
 * listy zaczyna się od znacznika, więc „ostatni przed" nigdy nie wychodzi poza swój punkt.
 * Gdy nazwa pada kilka razy (np. fala 1 i fala 2), wystarczy JEDNO ✅, by uznać technologię
 * za zadeklarowaną jako obecną — etapowa adopcja nie może wywalać bramki.
 */
function tylkoPlanowana(sekcja, nazwa) {
  let i = sekcja.indexOf(nazwa);
  if (i < 0) return false; // nie ma jej w stacku — bramka nie ma o co pytać
  let planowana = true;
  while (i >= 0) {
    const przed = sekcja.slice(0, i);
    if (przed.lastIndexOf("✅") > przed.lastIndexOf("🔜")) planowana = false;
    i = sekcja.indexOf(nazwa, i + nazwa.length);
  }
  return planowana;
}

const claudeMd = read("CLAUDE.md") ?? "";
const stackSekcja = claudeMd.match(/\n## Stack\b[^\n]*\n([\s\S]*?)(?=\n## )/)?.[1] ?? "";
if (!stackSekcja) {
  errors.push('CLAUDE.md: brak sekcji „## Stack" — bramka stacku nie ma czego sprawdzić.');
} else {
  const manifesty = manifestyWorkspace();
  for (const { nazwa, pakiety, wymagaKompletu, pliki } of STACK_PACKAGES) {
    if (!tylkoPlanowana(stackSekcja, nazwa)) continue;
    for (const plik of pliki ?? []) {
      if (existsSync(join(root, plik))) {
        errors.push(
          `${nazwa} oznaczony 🔜 w CLAUDE.md, a w repo leży ${plik} — zaktualizuj stack.`,
        );
      }
    }
    for (const { sciezka, zaleznosci } of manifesty) {
      const trafienia = pakiety.filter((p) => zaleznosci.some((d) => d === p || d.startsWith(p)));
      const obecny = wymagaKompletu ? trafienia.length === pakiety.length : trafienia.length > 0;
      if (obecny) {
        errors.push(
          `${nazwa} oznaczony 🔜 w CLAUDE.md, a jest w zależnościach ${sciezka} (${trafienia.join(", ")}) — zaktualizuj stack.`,
        );
      }
    }
  }
}

// 8) Martwe linki: odwołanie do ścieżki w repo musi wskazywać istniejący plik.
//
// Trzy z czterech rozjazdów wykrytych w audycie ARCHITECTURE.md były właśnie tym — dokument
// odsyłał do `.github/workflows/ci.yml`, `codeql.yml` i innych ścieżek, których w repo nie ma.
// Kontrola 6) łapie tylko JAWNIE wypisane ścieżki-duchy; ta jest mechaniczna i nie wymaga listy.
//
// Poza zakresem świadomie:
//  · `http(s)://`, `mailto:`, `tel:` — nie są plikami w repo;
//  · kotwice `#…` — cel jest w tym samym dokumencie, nie w systemie plików;
//  · CHANGELOG i raporty `AUDIT-*` — zapis HISTORYCZNY wolno mu wymieniać pliki dziś nieistniejące
//    (dokładnie ta sama racja, co przy kontroli 6): dziennik zmian ma być prawdą o przeszłości;
//    dotyczy to również archiwum `docs/changelog/` (#407) — skan `docs/` jest PŁASKI
//    (`readdirSync` bez rekurencji), więc archiwum wypada z zakresu samo. Gdyby ktoś kiedyś
//    zmienił ten skan na rekurencyjny, musi jawnie wykluczyć `docs/changelog/`, inaczej
//    bramka zacznie żądać poprawiania linków w zapisie przeszłości.
const LINKI_ZRODLA = ["README.md", "CLAUDE.md", ...dokumentacjaBiezaca()];

/**
 * Martwe linki w plikach, których ta bramka nie może naprawić sama (cudzy zakres edycji),
 * a które są znane i zaraportowane. Wpis MUSI się zdezaktualizować: gdy link przestanie być
 * martwy (albo zniknie z dokumentu), bramka krzyczy o zbędnym wyjątku — inaczej lista
 * takich zwolnień rośnie i cicho zjada sens kontroli.
 */
const ZNANE_MARTWE_LINKI = [
  {
    plik: "docs/BACKLOG.md",
    cel: "../AUDIT_REPORT.md",
    powod:
      "raport z audytu #214 skasowany po wdrożeniu napraw; wpis w BACKLOG-u jest zapisem historycznym — do przepięcia na docs/AUDIT-*.md przy najbliższej edycji tego pliku",
  },
];

/**
 * Cele linków markdown `[…](cel)` — z obsługą ZBALANSOWANYCH nawiasów w ścieżce, bo trasy
 * App Routera wyglądają jak `apps/web/app/(app)/map/page.tsx` i naiwne `[^)]+` ucina je
 * w połowie, produkując fałszywy alarm. Bloki kodu są wycinane wcześniej: mermaid używa
 * nawiasów w składni węzłów i nie zawiera odwołań do plików.
 */
function celeLinkow(tresc) {
  const bezKodu = tresc.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  const cele = [];
  for (let i = bezKodu.indexOf("]("); i >= 0; i = bezKodu.indexOf("](", i + 2)) {
    let glebokosc = 1;
    let j = i + 2;
    for (; j < bezKodu.length && glebokosc > 0; j++) {
      if (bezKodu[j] === "(") glebokosc++;
      else if (bezKodu[j] === ")") glebokosc--;
      else if (bezKodu[j] === "\n") break;
    }
    // Przerwanie na końcu linii jest zgodne z CommonMark (cel linku nie może zawierać
    // złamania wiersza), więc „niedomknięte" nawiasy to po prostu zwykły tekst.
    if (glebokosc !== 0) continue;
    // Tytuł linku `[…](sciezka "opis")` odcinamy — częścią celu jest tylko to przed spacją.
    cele.push(
      bezKodu
        .slice(i + 2, j - 1)
        .trim()
        .split(/\s+/)[0],
    );
  }
  return cele;
}

const uzyteWyjatki = new Set();
for (const plik of LINKI_ZRODLA) {
  const tresc = read(plik);
  if (!tresc) continue;
  for (const cel of celeLinkow(tresc)) {
    if (!cel || /^(https?:|mailto:|tel:|data:|#)/i.test(cel)) continue;
    // `<…>` opakowuje cele ze spacjami; fragment i query nie są częścią ścieżki na dysku.
    const sciezka = decodeURIComponent(cel.replace(/^<|>$/g, "").split("#")[0].split("?")[0]);
    if (!sciezka) continue;
    if (existsSync(join(root, dirname(plik), sciezka))) continue;
    const wyjatek = ZNANE_MARTWE_LINKI.find((w) => w.plik === plik && w.cel === cel);
    if (wyjatek) {
      uzyteWyjatki.add(wyjatek);
      warnings.push(`${plik}: znany martwy link „${cel}" — ${wyjatek.powod}.`);
      continue;
    }
    errors.push(`${plik}: martwy link „${cel}" — plik nie istnieje w repo.`);
  }
}
for (const w of ZNANE_MARTWE_LINKI) {
  if (!uzyteWyjatki.has(w)) {
    errors.push(
      `docs-check: wyjątek na martwy link „${w.cel}" w ${w.plik} jest już zbędny — usuń go z ZNANE_MARTWE_LINKI.`,
    );
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
