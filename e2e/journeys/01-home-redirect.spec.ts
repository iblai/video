import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("Home redirect", () => {
  test("authenticated user is redirected from / to /ai-avatar/generate", async ({
    page,
  }) => {
    await setupFakes(page);
    await visit(page, "/");
    await page.waitForURL("**/ai-avatar/generate", { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /generate ai avatar/i }),
    ).toBeVisible();
  });
});
