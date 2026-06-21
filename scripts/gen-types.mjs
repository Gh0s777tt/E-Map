// Generator typu `Database` (format supabase-js) z introspekcji żywej bazy.
//
// Dlaczego nie `supabase gen types`? CLI wymaga Dockera (uruchamia introspekcję
// w kontenerze). Ten skrypt łączy się bezpośrednio przez `pg` i emituje ten sam
// kształt typu (Tables Row/Insert/Update + Enums + Functions), bez Dockera.
//
// Użycie:
//   SUPABASE_DB_URL="postgresql://user:pass@host:5432/postgres" pnpm gen:types
// albo (fallback) z apps/web/.env.local: SUPABASE_DB_PASSWORD + stały pooler.
//
// Wyjście: packages/api/src/database.types.ts
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

const client = new pg.Client({ ...connConfig(), ssl: { rejectUnauthorized: false } });

const enumsRes = await runQuery(`
  select t.typname, e.enumlabel
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  order by t.typname, e.enumsortorder;
`);

async function runQuery(sql) {
  if (!runQuery.connected) {
    await client.connect();
    runQuery.connected = true;
  }
  return client.query(sql);
}

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

const fnRes = await runQuery(`
  select distinct p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and p.prorettype <> 'pg_catalog.trigger'::regtype
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  order by p.proname;
`);
const fns = fnRes.rows.map((r) => r.proname);

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
  for (const fn of fns) out.push(`      ${fn}: { Args: Record<string, unknown>; Returns: Json };`);
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

writeFileSync(resolve(ROOT, "packages/api/src/database.types.ts"), out.join("\n"));
console.log(
  `✓ database.types.ts: ${Object.keys(tables).length} tabel, ${Object.keys(enums).length} enumów, ${fns.length} funkcji`,
);
await client.end();
