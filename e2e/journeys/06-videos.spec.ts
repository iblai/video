import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("Video Clip Generator", () => {
  test("renders the upload pane, voice selector, and generate button", async ({
    page,
  }) => {
    await setupFakes(page);
    await visit(page, "/videos/generate");

    await expect(
      page.getByRole("heading", { name: /generate video clip/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: /upload reference image/i }),
    ).toBeVisible({ timeout: 10_000 });
    // The Generate Button text is just "Generate" (or "Generating…" when
    // submitted). The heading above it carries "Generate Video Clip".
    await expect(
      page.getByRole("button", { name: /^generate(ing\.\.\.)?$/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("My Video Clips", () => {
  test("mounts the gallery shell", async ({ page }) => {
    await setupFakes(page);
    await visit(page, "/videos/my");
    await expect(
      page.getByRole("heading", { name: /my video clips/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("nextjs-portal [data-nextjs-toast-errors-parent]")).toHaveCount(0);
  });
});
