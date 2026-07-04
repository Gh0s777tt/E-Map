import { expect, test } from "@playwright/test";

/**
 * Przepływy z ZALOGOWANĄ sesją (#262) — domyka białą plamę z TEST_REPORT.
 * Wymaga konta testowego: env `E2E_EMAIL` + `E2E_PASSWORD` (użytkownik z firmą,
 * np. „E2E Test Company") oraz PRAWDZIWYCH `NEXT_PUBLIC_SUPABASE_*` dla
 * dev-serwera. Bez kompletu — testy są pomijane (przepływy publiczne zostają).
 * Testy tylko czytają dane — brak mutacji, więc są idempotentne.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const CONFIGURED = Boolean(EMAIL && PASSWORD);

test.describe("z sesją", () => {
  test.skip(!CONFIGURED, "Brak E2E_EMAIL/E2E_PASSWORD — pomijam przepływy z sesją.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(EMAIL as string);
    await page.locator('input[type="password"]').fill(PASSWORD as string);
    await page.getByRole("button", { name: "Zaloguj się", exact: true }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  });

  test("login → pulpit renderuje nawigację aplikacji", async ({ page }) => {
    await expect(page.locator("nav, aside")).not.toHaveCount(0);
    await expect(page.locator("body")).toContainText(/pulpit|dashboard/i);
  });

  test("zlecenia: lista renderuje się dla świeżej firmy (pusty stan)", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).toContainText(/zlecen|brak|dodaj/i);
  });

  test("ustawienia: sekcja firmy widoczna (rola owner)", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).toContainText("E2E Test Company");
  });
});
