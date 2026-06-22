// Aplikuje pojedynczą migrację SQL do żywej bazy (bez Dockera/CLI).
// Użycie: NODE_PATH=.git/tmpdeps/node_modules node scripts/apply-migration.mjs supabase/migrations/00XX.sql
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

const file = process.argv[2];
if (!file) throw new Error("Podaj ścieżkę migracji");
const sql = readFileSync(resolve(ROOT, file), "utf8");

const client = new pg.Client(connConfig());
await client.connect();
try {
  await client.query(sql);
  console.log(`✓ Zastosowano: ${file}`);
} catch (e) {
  console.error(`✗ Błąd: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
