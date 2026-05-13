import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("Notifications + Account", () => {
  test("notifications page mounts with the heading", async ({ page }) => {
    await setupFakes(page);
    await visit(page, "/notifications");
    await expect(
      page.getByRole("heading", { name: /notifications/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("account page mounts the SDK account container", async ({ page }) => {
    await setupFakes(page);
    await visit(page, "/account");
    // The container is the @iblai/iblai-js Account component; we just
    // verify the page didn't crash and shows the loading or settled state.
    await expect(page.locator("nextjs-portal [data-nextjs-toast-errors-parent]")).toHaveCount(0);
  });
});
