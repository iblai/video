import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
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
});
