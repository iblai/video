import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("Video watch", () => {
  test("renders the player shell for a shared video id", async ({ page }) => {
    await setupFakes(page);
    await visit(page, "/video/watch/sample-id");
    await expect(
      page.getByText(/shared video/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
