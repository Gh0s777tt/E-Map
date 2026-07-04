import { expect, test } from "@playwright/test";

/**
 * Bramka auth `(app)/layout.tsx`: bez sesji każda trasa aplikacji ma kończyć
 * się na /login (redirect serwerowy). Reprezentatywna próbka tras.
 */
const PROTECTED = ["/dashboard", "/vehicles", "/orders", "/map", "/settings"];

for (const path of PROTECTED) {
  test(`bez sesji ${path} → /login`, async ({ page }) => {
    await page.goto(path);
    await page.waitForURL(/\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
}
