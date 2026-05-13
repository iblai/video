import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("AI Avatars", () => {
  test("Generate page renders the upload + naming UI", async ({ page }) => {
    await setupFakes(page);
    await visit(page, "/ai-avatar/generate");
    await expect(
      page.getByRole("heading", { name: /generate ai avatar/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("My AI Avatars mounts the gallery shell", async ({ page }) => {
    await setupFakes(page);
    await visit(page, "/ai-avatar/my");
    await expect(
      page.getByRole("heading", { name: /my ai avatars/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
  });
});
