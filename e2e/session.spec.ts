import { test, expect, type Page } from "@playwright/test";

// Needs a real account: set E2E_USER / E2E_PASS. Skipped if unset.
const USER = process.env.E2E_USER;
const PASS = process.env.E2E_PASS;

// Mirrors the login helper in attendance.spec.ts, plus the remember toggle.
async function login(page: Page, remember: boolean) {
  await page.goto("/login");
  await page.locator("#username").fill(USER!);
  await page.locator("#password").fill(PASS!);
  const rememberBox = page.locator("#remember");
  await expect(rememberBox).toBeChecked(); // default ON is part of the contract
  if (!remember) await rememberBox.uncheck();
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  const token = (await page.context().cookies()).find((c) => c.name === "token");
  expect(token).toBeDefined();
  return token!;
}

test.describe("session persistence", () => {
  test.skip(!USER || !PASS, "E2E_USER / E2E_PASS not set");

  test("remembered login sets a persistent cookie", async ({ page }) => {
    const token = await login(page, true);
    // Playwright reports -1 for session cookies; anything else is a real expiry.
    expect(token.expires).toBeGreaterThan(Date.now() / 1000);
    // ~30 days out, allowing a day of slop.
    expect(token.expires).toBeLessThan(Date.now() / 1000 + 31 * 24 * 3600);
    expect(token.httpOnly).toBe(true);
    expect(token.path).toBe("/");
  });

  test("unremembered login sets a session cookie", async ({ page }) => {
    const token = await login(page, false);
    expect(token.expires).toBe(-1);
  });
});
