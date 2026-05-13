import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("Interactive avatars", () => {
  test("list page renders the heading + search input", async ({ page }) => {
    await setupFakes(page);
    await visit(page, "/ai-avatar/interactive");
    await expect(page.getByPlaceholder(/search/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
