import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

/**
 * When the tenant has no HeyGen integration credential configured,
 * HeygenGuard replaces the app shell with a "HeyGen integration
 * required" message + Contact CTA. Logout / tenant-switching is
 * available via the profile dropdown in the navbar above.
 */
test.describe("HeyGen integration gate", () => {
  test("blocks the app when the credential lookup returns an empty list", async ({
    page,
  }) => {
    await setupFakes(page);
    // Override the default credential mock with an empty list.
    await page.route("**/integration-credential/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    });

    await visit(page, "/ai-avatar/generate");

    await expect(
      page.getByRole("heading", { name: /heygen integration required/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("424")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /contact ibl\.ai/i }),
    ).toHaveAttribute("href", "https://ibl.ai/contact");
    await expect(
      page.getByRole("heading", { name: /generate ai avatar/i }),
    ).toHaveCount(0);
  });

  test("blocks when the heygen entry has an empty key", async ({ page }) => {
    await setupFakes(page);
    await page.route("**/integration-credential/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ name: "heygen", value: { key: "" } }]),
      });
    });

    await visit(page, "/ai-avatar/generate");

    await expect(
      page.getByRole("heading", { name: /heygen integration required/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
