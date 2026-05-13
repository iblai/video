import { expect, test as setup } from "@playwright/test";
import path from "path";

const STORAGE_STATE = path.resolve(
  __dirname,
  "playwright",
  ".auth",
  "user.json",
);

setup("authenticate", async ({ page }) => {
  const username = process.env.PLAYWRIGHT_USERNAME;
  const password = process.env.PLAYWRIGHT_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD must be set in e2e/.env.development",
    );
  }

  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30_000 });

  // <AuthProvider> redirects to the SSO SPA when no axd_token is in localStorage.
  await page.waitForURL((u) => u.href.includes("/login"), {
    timeout: 60_000,
  });

  // Some SPA variants start in magic-link mode; click "Continue with password"
  // if it's there, otherwise the password textbox is already on screen.
  const passwordToggle = page.getByRole("button", {
    name: /continue with password/i,
  });
  if (await passwordToggle.isVisible().catch(() => false)) {
    await passwordToggle.click();
  }

  await page.getByRole("textbox", { name: /email/i }).fill(username);

  // The iblai SPA uses accessible-named textboxes (`name="Password"`),
  // not <label for>, so getByLabel(/password/i) misses. Use the role.
  const passwordField = page.getByRole("textbox", { name: /password/i });
  // If the form is two-stage, the password textbox only appears after the
  // first Continue click.
  if (!(await passwordField.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /^continue$/i }).click();
    await passwordField.waitFor({ state: "visible", timeout: 10_000 });
  }
  await passwordField.fill(password);
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Back at the app with tokens in localStorage.
  await page.waitForURL((u) => !u.href.includes("/login"), {
    timeout: 60_000,
  });
  await page.waitForFunction(() => !!localStorage.getItem("axd_token"), {
    timeout: 30_000,
  });

  await expect(page.locator("body")).toBeVisible();

  // Bake the storage-sync escape hatch into the saved state so every
  // subsequent spec inherits it. IblaiProviders reads this at mount and
  // passes `enableStorageSync=false` to the SDK, which prevents the
  // cross-tab refresh from yanking slow assertions off-page.
  await page.evaluate(() => {
    localStorage.setItem("__disable_storage_sync", "1");
  });

  await page.context().storageState({ path: STORAGE_STATE });
});
