import { expect, test } from "@playwright/test";
import { seedPaywallTenant, setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("App header", () => {
  test("renders the header strip with at least one action button", async ({
    page,
  }) => {
    await setupFakes(page);
    await visit(page, "/ai-avatar/generate");
    const header = page.locator("header");
    await expect(header).toBeVisible({ timeout: 15_000 });
    // The header always renders the SDK profile + bell; assert at least
    // one interactive element lives inside it.
    await expect(header.locator("button, a").first()).toBeVisible();
  });

  test("mounts the credit balance trigger when the tenant has paywall + admin", async ({
    page,
  }) => {
    await setupFakes(page);
    await seedPaywallTenant(page);
    await visit(page, "/ai-avatar/generate");
    const header = page.locator("header");
    await expect(header).toBeVisible({ timeout: 15_000 });
    // SDK CreditBalance exposes its trigger via a stable test id.
    await expect(
      header.locator("[data-testid='credit-balance-trigger']"),
    ).toBeVisible({ timeout: 15_000 });
  });
});
