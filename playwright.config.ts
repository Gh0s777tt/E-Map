import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (Playwright) — przepływy publiczne bez sesji: landing, logowanie, reset,
 * bramka auth na trasach `(app)`. Testy z sesją (logowanie na konto testowe) —
 * osobny etap (patrz docs/BACKLOG.md → P1 „białe plamy").
 *
 * Port dedykowany (3103), by nie kolidować z dev-serwerem (3000).
 * Supabase dostaje placeholdery — trasy publiczne nie potrzebują żywej bazy,
 * a bramka auth przy błędzie klienta i tak przekierowuje na /login.
 */
const PORT = 3103;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm --filter @e-logistic/web exec next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
    },
  },
});
