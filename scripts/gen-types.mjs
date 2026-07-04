// Generator typu `Database` (format supabase-js) z introspekcji żywej bazy.
//
// Dlaczego nie `supabase gen types`? CLI wymaga Dockera (uruchamia introspekcję
// w kontenerze). Ten skrypt łączy się bezpośrednio przez `pg` i emituje ten sam
// kształt typu (Tables Row/Insert/Update + Enums + Functions), bez Dockera.
//
// Użycie:
//   SUPABASE_DB_URL="postgresql://user:pass@host:5432/postgres" pnpm gen:types
// albo (fallback) z apps/web/.env.local: SUPABASE_DB_PASSWORD + stały pooler,
// albo BEZ hasła do bazy: SUPABASE_MGMT_TOKEN="sbp_…" pnpm gen:types
// (zapytania idą wtedy przez Supabase Management API; ref z SUPABASE_PROJECT_REF).
//
// Wyjście: packages/api/src/database.types.ts
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function connConfig() {
  if (process.env.SUPABASE_DB_URL) return { connectionString: process.env.SUPABASE_DB_URL };
  // Fallback: hasło z apps/web/.env.local + pooler (ref projektu jawny, hasło NIE w repo).
  const env = readFileSync(resolve(ROOT, "apps/web/.env.local"), "utf8");
  const pwMatch = env.match(/SUPABASE_DB_PASSWORD\s*=\s*"?([^"\r\n]+)"?/);
  const refMatch = env.match(/SUPABASE_DB_REF\s*=\s*"?([^"\r\n]+)"?/);
  if (!pwMatch)
    throw new Error("Ustaw SUPABASE_DB_URL albo SUPABASE_DB_PASSWORD w apps/web/.env.local");
  return {
    host: process.env.SUPABASE_DB_HOST ?? "aws-1-eu-central-1.pooler.supabase.com",
    port: 5432,
    user: `postgres.${refMatch?.[1] ?? "jcmqbqvsvtjtxvmopcxp"}`,
    password: pwMatch[1],
    database: "postgres",
  };
}

const SCALAR = {
  uuid: "string",
  text: "string",
  varchar: "string",
  bpchar: "string",
  citext: "string",
  name: "string",
  int2: "number",
  int4: "number",
  int8: "number",
  numeric: "number",
  float4: "number",
  float8: "number",
  bool: "boolean",
  timestamptz: "string",
  timestamp: "string",
  date: "string",
  time: "string",
  timetz: "string",
  json: "Json",
  jsonb: "Json",
  bytea: "string",
  geography: "unknown",
  geometry: "unknown",
};

// Tryb Management API (#260): bez hasła do bazy — token sbp_… wystarcza.
const MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN;
const MGMT_REF = process.env.SUPABASE_PROJECT_REF ?? "jcmqbqvsvtjtxvmopcxp";

let client = null;

async function runQuery(sql) {
  if (MGMT_TOKEN) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${MGMT_REF}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MGMT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    });
    if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
    return { rows: await res.json() };
  }
  if (!client) {
    client = new pg.Client({ ...connConfig(), ssl: { rejectUnauthorized: false } });
    await client.connect();
  }
  return client.query(sql);
}

const enumsRes = await runQuery(`
  select t.typname, e.enumlabel
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  order by t.typname, e.enumsortorder;
`);

const enums = {};
for (const r of enumsRes.rows) {
  enums[r.typname] = enums[r.typname] ?? [];
  enums[r.typname].push(r.enumlabel);
}

const colsRes = await runQuery(`
  select c.table_name, c.column_name, c.is_nullable, c.column_default,
         c.udt_name, c.is_identity, c.is_generated
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
    and c.table_name <> 'spatial_ref_sys'
  order by c.table_name, c.ordinal_position;
`);

const tables = {};
for (const r of colsRes.rows) {
  tables[r.table_name] = tables[r.table_name] ?? [];
  tables[r.table_name].push(r);
}

// Pełne sygnatury funkcji (#260): argumenty wejściowe (opcjonalne wg DEFAULT)
// + typ zwrotu (TABLE → wiersze[], skalar/enum → typ, json/jsonb → Json).
const fnRes = await runQuery(`
  select p.proname,
         p.proretset,
         p.prorettype::regtype::text as rettype,
         p.pronargdefaults,
         to_jsonb(p.proargmodes) as argmodes,
         to_jsonb(p.proargnames) as argnames,
         (select coalesce(jsonb_agg(u.x::regtype::text order by u.ord), '[]'::jsonb)
            from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[]))
                 with ordinality u(x, ord)) as argtypes
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and p.prorettype <> 'pg_catalog.trigger'::regtype
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  order by p.proname;
`);

/** regtype (np. "uuid", "role[]", "timestamp with time zone") → typ TS. */
const REGTYPE = {
  uuid: "string",
  text: "string",
  "character varying": "string",
  character: "string",
  name: "string",
  boolean: "boolean",
  smallint: "number",
  integer: "number",
  bigint: "number",
  numeric: "number",
  real: "number",
  "double precision": "number",
  json: "Json",
  jsonb: "Json",
  date: "string",
  "time without time zone": "string",
  "time with time zone": "string",
  "timestamp without time zone": "string",
  "timestamp with time zone": "string",
  bytea: "string",
  void: "undefined",
};

const regToTs = (reg) => {
  const arr = reg.endsWith("[]");
  const base = arr ? reg.slice(0, -2) : reg;
  const ts = enums[base] ? `Database["public"]["Enums"]["${base}"]` : (REGTYPE[base] ?? "unknown");
  return arr ? `${ts}[]` : ts;
};

const fns = fnRes.rows.map((r) => {
  const modes = r.argmodes; // null ⇒ wszystkie argumenty wejściowe
  const names = r.argnames ?? [];
  const types = r.argtypes ?? [];
  const all = types.map((t, i) => ({ type: t, name: names[i] ?? null, mode: modes?.[i] ?? "i" }));
  const inputs = all.filter((a) => a.mode === "i" || a.mode === "b" || a.mode === "v");
  const cols = all.filter((a) => a.mode === "t" || a.mode === "o");

  let args = "Record<PropertyKey, never>";
  if (inputs.length > 0) {
    if (inputs.some((a) => !a.name)) {
      args = "Record<string, unknown>"; // argumenty bez nazw — nie zbudujemy obiektu
    } else {
      const firstOptional = inputs.length - (r.pronargdefaults ?? 0);
      // Każdy argument SQL przyjmuje NULL — emitujemy `| null`, żeby wywołania
      // przekazujące jawnie null (np. `p_vat_rate: vatRate ?? null`) typowały się wprost.
      const fields = inputs.map(
        (a, i) => `${a.name}${i >= firstOptional ? "?" : ""}: ${regToTs(a.type)} | null`,
      );
      args = `{ ${fields.join("; ")} }`;
    }
  }

  let returns;
  if (cols.length > 0 && cols.every((c) => c.name)) {
    returns = `{ ${cols.map((c) => `${c.name}: ${regToTs(c.type)}`).join("; ")} }[]`;
  } else {
    const base = regToTs(r.rettype);
    returns = r.proretset ? `${base}[]` : base;
  }
  return { name: r.proname, args, returns };
});

const tsType = (col) => {
  let udt = col.udt_name;
  let arr = false;
  if (udt.startsWith("_")) {
    arr = true;
    udt = udt.slice(1);
  }
  const base = enums[udt] ? `Database["public"]["Enums"]["${udt}"]` : (SCALAR[udt] ?? "unknown");
  return arr ? `${base}[]` : base;
};

const out = [];
out.push("// AUTOGENEROWANE z żywej bazy (introspekcja). Nie edytować ręcznie.");
out.push("// Regeneracja: pnpm gen:types (patrz scripts/gen-types.mjs).");
out.push("");
out.push("export type Json =");
out.push("  | string");
out.push("  | number");
out.push("  | boolean");
out.push("  | null");
out.push("  | { [key: string]: Json | undefined }");
out.push("  | Json[];");
out.push("");
out.push("export interface Database {");
out.push("  public: {");
out.push("    Tables: {");
for (const tname of Object.keys(tables).sort()) {
  const cols = tables[tname];
  out.push(`      ${tname}: {`);
  out.push("        Row: {");
  for (const c of cols)
    out.push(
      `          ${c.column_name}: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""};`,
    );
  out.push("        };");
  out.push("        Insert: {");
  for (const c of cols) {
    const nul = c.is_nullable === "YES";
    const def = c.column_default !== null || c.is_identity === "YES" || c.is_generated === "ALWAYS";
    out.push(
      `          ${c.column_name}${nul || def ? "?" : ""}: ${tsType(c)}${nul ? " | null" : ""};`,
    );
  }
  out.push("        };");
  out.push("        Update: {");
  for (const c of cols)
    out.push(
      `          ${c.column_name}?: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""};`,
    );
  out.push("        };");
  out.push("        Relationships: [];");
  out.push("      };");
}
out.push("    };");
out.push("    Views: { [_ in never]: never };");
if (fns.length === 0) {
  out.push("    Functions: { [_ in never]: never };");
} else {
  out.push("    Functions: {");
  for (const fn of fns) out.push(`      ${fn.name}: { Args: ${fn.args}; Returns: ${fn.returns} };`);
  out.push("    };");
}
out.push("    Enums: {");
for (const ename of Object.keys(enums).sort()) {
  out.push(`      ${ename}: ${enums[ename].map((v) => `"${v}"`).join(" | ")};`);
}
out.push("    };");
out.push("    CompositeTypes: { [_ in never]: never };");
out.push("  };");
out.push("}");
out.push("");

const OUT_FILE = resolve(ROOT, "packages/api/src/database.types.ts");
writeFileSync(OUT_FILE, out.join("\n"));
// Format zgodny z bramką lint — regeneracja nigdy nie psuje `biome check`.
execSync(`pnpm exec biome format --write "${OUT_FILE}"`, { cwd: ROOT, stdio: "ignore" });
console.log(
  `✓ database.types.ts: ${Object.keys(tables).length} tabel, ${Object.keys(enums).length} enumów, ${fns.length} funkcji`,
);
if (client) await client.end();
