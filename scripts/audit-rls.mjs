// ════════════════════════════════════════════════════════════════════
//  E-LOGISTIC · Audyt RLS (bramka bezpieczeństwa, tylko odczyt)
//  Weryfikuje żywą bazę pod kątem izolacji multi-tenant po wielu
//  migracjach aplikowanych bezpośrednio na prod (ryzyko rozjazdu z plikami).
//
//  Sprawdza:
//   1. RLS włączone na wszystkich tabelach `public` (tabela bez RLS = wyciek).
//   2. Każda tabela z RLS ma ≥1 policy (RLS bez policy = ciche deny-all = bug).
//   3. Brak policy z `USING (true)` na SELECT/ALL — poza jawnie dozwolonymi
//      tabelami wspólnotowymi (bez company_id; patrz GLOBAL_READ_OK).
//   4. Tabele wspólnotowe mają zapisy ograniczone do autora/roli (nie `true`).
//   5. Funkcje SECURITY DEFINER mają przypięty `search_path` (ochrona przed hijackiem).
//   6. Helpery multi-tenant (is_member_of / has_role) istnieją i są SECURITY DEFINER.
//
//  Obiekty należące do rozszerzeń (PostGIS itd.) są pomijane automatycznie
//  (pg_depend deptype='e') — nimi zarządza Supabase, nie nasze migracje.
//
//  Użycie:
//    NODE_PATH=.git/tmpdeps/node_modules node scripts/audit-rls.mjs
//  Wyjście: 0 = czysto, 1 = znaleziono problemy (nadaje się do CI).
// ════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function connConfig() {
  if (process.env.SUPABASE_DB_URL) return { connectionString: process.env.SUPABASE_DB_URL };
  const env = readFileSync(resolve(ROOT, "apps/web/.env.local"), "utf8");
  const pwMatch = env.match(/SUPABASE_DB_PASSWORD\s*=\s*"?([^"\r\n]+)"?/);
  const refMatch = env.match(/SUPABASE_DB_REF\s*=\s*"?([^"\r\n]+)"?/);
  if (!pwMatch) throw new Error("Ustaw SUPABASE_DB_URL albo SUPABASE_DB_PASSWORD");
  return {
    host: process.env.SUPABASE_DB_HOST ?? "aws-1-eu-central-1.pooler.supabase.com",
    port: 5432,
    user: `postgres.${refMatch?.[1] ?? "jcmqbqvsvtjtxvmopcxp"}`,
    password: pwMatch[1],
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

// Tabele wspólnotowe (rynkowe) — bez `company_id`, czytane globalnie z założenia
// (ceny paliw, zgłoszenia na mapie, POI i ich opinie). Odczyt USING(true) jest
// poprawny; integralność opiera się na ograniczeniu ZAPISÓW do autora/roli,
// co audyt egzekwuje osobno (krok 4). Każdy wpis = świadoma decyzja projektowa.
const GLOBAL_READ_OK = new Set(["fuel_prices", "map_reports", "pois", "poi_reviews"]);

const isBroad = (expr) => expr === null || expr.trim() === "true";

const client = new pg.Client(connConfig());
const errors = [];
const warnings = [];
const ok = [];

await client.connect();
try {
  // Obiekty należące do rozszerzeń → pomijamy (nie nasze, nie do ALTER-owania).
  const extTables = new Set(
    (
      await client.query(`
        select c.relname from pg_depend d
        join pg_class c on c.oid = d.objid
        join pg_namespace n on n.oid = c.relnamespace
        where d.deptype = 'e' and n.nspname = 'public' and c.relkind = 'r'
      `)
    ).rows.map((r) => r.relname),
  );
  const extFns = new Set(
    (
      await client.query(`
        select p.proname from pg_depend d
        join pg_proc p on p.oid = d.objid
        join pg_namespace n on n.oid = p.pronamespace
        where d.deptype = 'e' and n.nspname = 'public'
      `)
    ).rows.map((r) => r.proname),
  );

  // ── 1+2. RLS + policy coverage ────────────────────────────────────
  const tables = (
    await client.query(`
      select c.relname as table, c.relrowsecurity as rls,
             coalesce(p.cnt, 0)::int as policies
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join (select polrelid, count(*) cnt from pg_policy group by polrelid) p
        on p.polrelid = c.oid
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    `)
  ).rows;

  for (const t of tables) {
    if (extTables.has(t.table)) continue;
    if (!t.rls) {
      errors.push(`RLS WYŁĄCZONE na public.${t.table} — dowolny zalogowany czyta cudze dane.`);
    } else if (t.policies === 0) {
      warnings.push(`public.${t.table}: RLS włączone, ale 0 policy (ciche deny-all).`);
    } else {
      const tag = GLOBAL_READ_OK.has(t.table) ? " [wspólnotowa]" : "";
      ok.push(`public.${t.table}: RLS + ${t.policies} policy${tag}`);
    }
  }

  // ── 3+4. Policy: szeroki odczyt i niezabezpieczone zapisy ─────────
  const policies = (
    await client.query(`
      select c.relname as table, pol.polname as name,
             case pol.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
               when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end as cmd,
             pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
             pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expr
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
      order by c.relname, pol.polname
    `)
  ).rows;

  for (const p of policies) {
    if (extTables.has(p.table)) continue;
    const global = GLOBAL_READ_OK.has(p.table);

    // (3) Szeroki ODCZYT (SELECT/ALL z USING true) — dozwolony tylko wspólnotowo.
    if ((p.cmd === "SELECT" || p.cmd === "ALL") && isBroad(p.using_expr) && !global) {
      errors.push(
        `public.${p.table} · "${p.name}" (${p.cmd}): USING = ${p.using_expr ?? "∅"} — brak filtra firmy.`,
      );
    }

    // (4) ZAPIS bez ograniczenia: INSERT→CHECK, UPDATE/DELETE→USING, ALL→oba.
    if (p.cmd === "INSERT" && isBroad(p.check_expr)) {
      errors.push(`public.${p.table} · "${p.name}" (INSERT): brak WITH CHECK — każdy może wpisać.`);
    }
    if ((p.cmd === "UPDATE" || p.cmd === "DELETE") && isBroad(p.using_expr)) {
      errors.push(
        `public.${p.table} · "${p.name}" (${p.cmd}): USING = ${p.using_expr ?? "∅"} — każdy może zmienić.`,
      );
    }
    if (p.cmd === "ALL" && global && (isBroad(p.using_expr) || isBroad(p.check_expr))) {
      errors.push(
        `public.${p.table} · "${p.name}" (ALL): zapis na tabeli wspólnotowej bez ograniczenia.`,
      );
    }
  }

  // ── 5. SECURITY DEFINER bez przypiętego search_path (poza rozszerzeniami) ──
  const definers = (
    await client.query(`
      select p.proname as name, array(select unnest(p.proconfig)) as config
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef = true
      order by p.proname
    `)
  ).rows;

  const seenDef = new Set();
  for (const f of definers) {
    if (extFns.has(f.name) || seenDef.has(f.name)) continue;
    seenDef.add(f.name);
    const hasPath = (f.config ?? []).some((c) => c.startsWith("search_path="));
    if (!hasPath)
      errors.push(`SECURITY DEFINER public.${f.name}() bez search_path — ryzyko hijacku.`);
  }

  // ── 6. Helpery multi-tenant istnieją i są SECURITY DEFINER ────────
  const helpers = (
    await client.query(`
      select p.proname as name, p.prosecdef as secdef
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in ('is_member_of', 'has_role', 'is_developer')
    `)
  ).rows;
  for (const need of ["is_member_of", "has_role"]) {
    const h = helpers.find((x) => x.name === need);
    if (!h) errors.push(`Brak helpera RLS public.${need}().`);
    else if (!h.secdef) errors.push(`Helper public.${need}() nie jest SECURITY DEFINER.`);
  }

  // ── Raport ────────────────────────────────────────────────────────
  console.log("═══ AUDYT RLS · E-LOGISTIC ═══");
  console.log(
    `Tabele public: ${tables.length} (rozszerzeń: ${extTables.size}) · policy: ${policies.length} · SECDEF fn: ${seenDef.size}\n`,
  );
  if (ok.length) {
    console.log(`✓ Pokrycie RLS (${ok.length}):`);
    for (const line of ok) console.log(`  · ${line}`);
    console.log("");
  }
  if (warnings.length) {
    console.log(`⚠ Ostrzeżenia (${warnings.length}):`);
    for (const w of warnings) console.log(`  · ${w}`);
    console.log("");
  }
  if (errors.length) {
    console.log(`✗ BŁĘDY (${errors.length}):`);
    for (const e of errors) console.log(`  · ${e}`);
    console.log("\nWYNIK: ✗ wykryto problemy izolacji multi-tenant.");
    process.exitCode = 1;
  } else {
    console.log("WYNIK: ✓ izolacja multi-tenant spójna (brak błędów).");
  }
} catch (e) {
  console.error(`✗ Audyt nieudany: ${e.message}`);
  process.exitCode = 2;
} finally {
  await client.end();
}
