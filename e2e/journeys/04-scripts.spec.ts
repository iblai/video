import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("Create Script", () => {
  test("renders editor, AI Script panel, and tabs without crashing", async ({
    page,
  }) => {
    await setupFakes(page);
    await visit(page, "/scripts/add");
    await expect(
      page.getByRole("heading", { name: /create script/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /ai script/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /ai help/i })).toBeVisible();
  });

  test("switches between Text, Audio, and Files tabs", async ({ page }) => {
    await setupFakes(page);
    await visit(page, "/scripts/add");
    await expect(
      page.getByRole("heading", { name: /create script/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^audio$/i }).click();
    await expect(
      page.getByText(/transcribed to your script/i),
    ).toBeVisible();

    await page.getByRole("button", { name: /^files$/i }).click();
    await expect(page.getByText(/lesson or presentation/i)).toBeVisible();

    await page.getByRole("button", { name: /^text$/i }).click();
    await expect(
      page.getByText(/3,875 Characters/i).first(),
    ).toBeVisible();
  });
});
