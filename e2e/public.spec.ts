import { expect, test } from "@playwright/test";

/** Strony publiczne — renderują się bez sesji i bez żywej bazy. */

test("landing: strona główna renderuje markę E-Logistic", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/E-?Logistic/i);
  await expect(page.locator("body")).toContainText(/E.?Logistic/i);
});

test("login: formularz ma pola e-mail i hasło", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("reset: strona odzyskiwania hasła renderuje formularz", async ({ page }) => {
  await page.goto("/reset");
  await expect(page.locator("form, input")).not.toHaveCount(0);
});

test("privacy: polityka prywatności jest publiczna (wymóg sklepów)", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page).toHaveTitle(/prywatności/i);
  await expect(page.locator("body")).toContainText("Administrator danych");
  await expect(page.locator("body")).toContainText("Privacy policy");
});
